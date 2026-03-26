from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import base64, re, httpx, logging
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
logger = logging.getLogger(__name__)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_optional_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> Optional[User]:
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
    feedback: str
    note:     Optional[str] = None


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


async def _attach_overconsumption(
    result:    dict,
    food_name: str,
    user:      User,
    db:        AsyncSession,
) -> None:
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
        logger.warning("Overconsumption check failed: %s", e)
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

    result = await scan_food_text(req.food_name, req.member_profile, req.lang)

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
        result["scanId"] = record.id

        await _attach_overconsumption(result, req.food_name, user, db)
        await db.commit()
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

    MAX_SIZE = 5 * 1024 * 1024
    data = await file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image too large (max 5MB)")

    b64  = base64.b64encode(data).decode()

    # ── YOLO: pure local model only, no Groq call inside detect_food ──────────
    # BUG FIX: detect_food was internally calling Groq vision (bypassing
    # _GROQ_SEMAPHORE), causing 400 / 429 storms. We now isolate it in a
    # try/except so any failure in the YOLO service never crashes the route.
    # All Groq vision work is handled exclusively by analyze_label_image, which
    # uses the semaphore + exponential backoff defined in ai_service.py.
    yolo: dict = {"detected": False, "confidence": 0, "food_name": "", "all_detections": []}
    try:
        yolo = await detect_food(data)
    except Exception as e:
        logger.warning("YOLO detect_food failed, skipping: %s", e)

    # Only trust YOLO if it's confident enough — never call Groq twice.
    if yolo.get("detected") and yolo.get("confidence", 0) >= 0.5:
        food_name = yolo["food_name"]
        result    = await scan_food_text(food_name, None, lang)
        result["detectionSource"] = "yolov8"
        result["yoloDetection"]   = {
            "food":       yolo["food_name"],
            "confidence": yolo["confidence"],
            "all":        yolo.get("all_detections", []),
        }
    else:
        # analyze_label_image owns all Groq vision calls; it has its own
        # Scout → Maverick fallback + semaphore + retry in ai_service.py.
        result = await analyze_label_image(b64, file.content_type)

        # BUG FIX: guard against parse_failed / empty result from vision
        if result.get("error") == "parse_failed" or not result.get("foodName"):
            logger.warning("analyze_label_image returned no food name: %s", result.get("error"))

        result["detectionSource"] = "groq_vision"
        if yolo.get("detected"):
            result["yoloDetection"] = {
                "food":       yolo["food_name"],
                "confidence": yolo["confidence"],
                "note":       "Low confidence — Groq Vision used instead",
            }

    # BUG FIX: check all possible name fields before giving up on seasonal risk
    food_name = (
        result.get("foodName")
        or result.get("food_name")
        or result.get("name")
        or result.get("productName")
        or (yolo.get("food_name") if yolo.get("detected") else "")
    )
    if food_name:
        _attach_seasonal_risk(result, food_name)
    else:
        result["seasonalRisk"] = None

    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None
    result["scanType"]                = "image"
    return result


# ── Barcode scan (public) ─────────────────────────────────────────────────────

@router.get("/barcode/{barcode}")
async def scan_barcode(barcode: str, lang: str = "en"):
    if not re.match(r'^\d{8,14}$', barcode):
        raise HTTPException(400, "Invalid barcode format")

    async with httpx.AsyncClient() as client:
        r = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
    data = r.json()
    if data.get("status") != 1:
        raise HTTPException(404, "Product not found")

    product   = data["product"]
    food_name = product.get("product_name", "") or product.get("product_name_en", "")
    if not food_name:
        raise HTTPException(404, "Could not identify product name")

    result = await scan_food_text(food_name, None, lang)
    _attach_seasonal_risk(result, food_name)
    result["personalizedScore"]       = None
    result["overconsumptionWarnings"] = None
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
        raise HTTPException(400, "At least 2 foods required")
    return await scan_combination(req.foods, req.member_profile, req.lang)


# ── Feedback (requires auth) ──────────────────────────────────────────────────

@router.post("/{scan_id}/feedback")
async def submit_feedback(
    scan_id: str,
    req:     FeedbackRequest,
    db:      AsyncSession = Depends(get_db),
    user:    User         = Depends(get_required_user),
):
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