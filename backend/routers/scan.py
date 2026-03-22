from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import base64, httpx
from services.ai_service import scan_food_text, scan_combination, analyze_label_image
from services.yolo_service import detect_food
from services.overconsumption_service import check_overconsumption
from app.db.database import get_db
from models.models import ScanRecord, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_optional_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Returns the authenticated User if a valid Bearer token is present,
    or None if no token. Scan endpoints stay functional for anonymous users.
    """
    if not creds:
        return None
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        result  = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


async def get_required_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> User:
    """Returns the authenticated User or raises 401."""
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        result  = await db.execute(select(User).where(User.id == user_id))
        user    = result.scalar_one_or_none()
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ── Schemas ───────────────────────────────────────────────────────────────────

class TextScanRequest(BaseModel):
    food_name:      str
    lang:           str            = "en"
    member_profile: Optional[dict] = None
    city:           Optional[str]  = None

class CombinationRequest(BaseModel):
    foods:          list[str]
    lang:           str            = "en"
    member_profile: Optional[dict] = None

class FeedbackRequest(BaseModel):
    feedback: str            # "accurate" | "inaccurate"
    note:     Optional[str]  = None


# ── ML helpers ────────────────────────────────────────────────────────────────

def _attach_seasonal_risk(result: dict, food_name: str):
    try:
        from risk_scorer import predict_seasonal_risk
        result["seasonalRisk"] = predict_seasonal_risk(food_name)
    except Exception:
        result["seasonalRisk"] = None


def _attach_personalized_score(result: dict, food_name: str, member_profile: dict, city: str):
    try:
        from personalized_scorer import predict_personal_risk, calculate_weekly_exposure
        if member_profile:
            condition = (
                member_profile.get("conditions", ["none"])[0]
                if member_profile.get("conditions") else "none"
            )
            personal = predict_personal_risk(
                age=member_profile.get("age", 30),
                condition=condition,
                city=city or member_profile.get("city", "Pune"),
                food=food_name,
                month=datetime.now().month,
                safety_score=result.get("safetyScore", 50),
            )
            weekly = calculate_weekly_exposure(
                scan_history=[{"food_name": food_name, "risk_level": result.get("riskLevel", "LOW")}],
                condition=condition,
            )
            result["personalizedScore"] = {
                "cumulative_score":         weekly["weekly_exposure_score"],
                "exposure_level":           weekly["risk_level"],
                "recommendation":           weekly["recommendation"],
                "top_toxins":               weekly["top_toxins"],
                "adulteration_probability": personal["adulteration_probability"],
                "source":                   personal["source"],
            }
        else:
            result["personalizedScore"] = None
    except Exception:
        result["personalizedScore"] = None


# ── Overconsumption helper ────────────────────────────────────────────────────

async def _attach_overconsumption(
    result:    dict,
    food_name: str,
    user:      User,
    db:        AsyncSession,
) -> None:
    """
    Fetch last 7 days of the user's scans, run overconsumption check,
    and attach the result to `result["overconsumptionWarnings"]`.
    Fails silently — never blocks the scan response.
    """
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)
        rows = await db.execute(
            select(ScanRecord.food_name, ScanRecord.created_at)
            .where(ScanRecord.user_id == user.id)
            .where(ScanRecord.created_at >= cutoff)
            .order_by(ScanRecord.created_at.desc())
            .limit(200)
        )
        recent_scans = [
            {"food_name": r.food_name, "created_at": r.created_at}
            for r in rows.all()
        ]
        result["overconsumptionWarnings"] = check_overconsumption(
            food_name, result, recent_scans
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Overconsumption check failed: %s", e)
        result["overconsumptionWarnings"] = None


# ── Text scan (optional auth) ─────────────────────────────────────────────────
@router.post("/text")
async def scan_text(
    req:  TextScanRequest,
    db:   AsyncSession   = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")

    result = scan_food_text(req.food_name, req.member_profile, req.lang)
    _attach_seasonal_risk(result, req.food_name)
    _attach_personalized_score(result, req.food_name, req.member_profile, req.city)

    if user:
        record = ScanRecord(
            user_id      = user.id,
            food_name    = req.food_name,
            risk_level   = result.get("riskLevel"),
            safety_score = result.get("safetyScore"),
            result_json  = result,
            scan_type    = "text",
            city         = req.city or user.city,
        )
        db.add(record)
        await db.flush()
        await db.commit()
        result["scanId"] = record.id

        # Overconsumption check — only for authenticated users (needs scan history)
        await _attach_overconsumption(result, req.food_name, user, db)
    else:
        result["overconsumptionWarnings"] = None

    return result


# ── Image scan (public) ───────────────────────────────────────────────────────
@router.post("/image")
async def scan_image(
    file: UploadFile = File(...),
    lang: str        = Form("en"),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Image must be JPEG, PNG, or WebP")

    data = await file.read()
    b64  = base64.b64encode(data).decode()
    yolo = detect_food(data)

    if yolo["detected"] and yolo["confidence"] >= 0.5:
        food_name = yolo["food_name"]
        result    = scan_food_text(food_name, None, lang)
        result["detectionSource"] = "yolov8"
        result["yoloDetection"]   = {
            "food":       yolo["food_name"],
            "confidence": yolo["confidence"],
            "all":        yolo["all_detections"],
        }
    else:
        result = analyze_label_image(b64, file.content_type)
        result["detectionSource"] = "groq_vision"
        if yolo["detected"]:
            result["yoloDetection"] = {
                "food":       yolo["food_name"],
                "confidence": yolo["confidence"],
                "note":       "Low confidence — Groq Vision used instead",
            }

    food_name = (
        result.get("foodName") or result.get("food_name") or
        result.get("name")     or result.get("productName") or
        (yolo["food_name"] if yolo["detected"] else "")
    )
    if food_name:
        _attach_seasonal_risk(result, food_name)
    else:
        result["seasonalRisk"] = None

    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None   # image scans are anonymous
    result["scanType"]                = "image"
    return result


# ── Barcode scan (public) ─────────────────────────────────────────────────────
@router.get("/barcode/{barcode}")
async def scan_barcode(barcode: str, lang: str = "en"):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
    data = r.json()
    if data.get("status") != 1:
        raise HTTPException(404, "Product not found in Open Food Facts database")

    product   = data["product"]
    food_name = product.get("product_name", "") or product.get("product_name_en", "")
    if not food_name:
        raise HTTPException(404, "Could not identify product name from barcode")

    result = scan_food_text(food_name, None, lang)
    _attach_seasonal_risk(result, food_name)
    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None   # barcode scans are anonymous
    result["barcodeData"] = {
        "name":        food_name,
        "brand":       product.get("brands", ""),
        "ingredients": product.get("ingredients_text", ""),
        "nutriscore":  product.get("nutriscore_grade", ""),
        "image_url":   product.get("image_url", ""),
    }
    result["scanType"] = "barcode"
    return result


# ── Combination scan (public) ─────────────────────────────────────────────────
@router.post("/combination")
async def combination_scan(req: CombinationRequest):
    if len(req.foods) < 2:
        raise HTTPException(400, "At least 2 foods required for combination scan")
    return scan_combination(req.foods, req.member_profile)


# ── Feedback (requires auth) ──────────────────────────────────────────────────
@router.post("/{scan_id}/feedback")
async def submit_feedback(
    scan_id: str,
    req:     FeedbackRequest,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_required_user),
):
    """Only the scan owner can submit feedback."""
    if req.feedback not in ("accurate", "inaccurate"):
        raise HTTPException(400, "feedback must be 'accurate' or 'inaccurate'")

    result = await db.execute(select(ScanRecord).where(ScanRecord.id == scan_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Scan record not found")
    if record.user_id and record.user_id != user.id:
        raise HTTPException(403, "Not your scan record")

    record.feedback      = req.feedback
    record.feedback_note = req.note
    await db.commit()
    return {"success": True, "scan_id": scan_id, "feedback": req.feedback}