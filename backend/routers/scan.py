from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from pydantic import BaseModel
from typing import Optional
import base64, httpx
from services.ai_service import scan_food_text, scan_combination, analyze_label_image
from services.yolo_service import detect_food
from app.db.database import get_db
from models.models import ScanRecord
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

router = APIRouter()

class TextScanRequest(BaseModel):
    food_name: str
    lang: str = "en"
    member_profile: Optional[dict] = None
    user_id: Optional[str] = None
    city: Optional[str] = None

class CombinationRequest(BaseModel):
    foods: list[str]
    lang: str = "en"
    member_profile: Optional[dict] = None


# ── Helpers ───────────────────────────────────────────────

def _attach_seasonal_risk(result: dict, food_name: str):
    """Attach Prophet seasonal risk to any result dict."""
    try:
        from risk_scorer import predict_seasonal_risk
        result["seasonalRisk"] = predict_seasonal_risk(food_name)
    except Exception:
        result["seasonalRisk"] = None

def _attach_personalized_score(result: dict, food_name: str, member_profile: dict, city: str):
    """Attach RF personalized score to any result dict."""
    try:
        from personalized_scorer import predict_personal_risk, calculate_weekly_exposure
        if member_profile:
            condition = (
                member_profile.get("conditions", ["none"])[0]
                if member_profile.get("conditions")
                else "none"
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
                "cumulative_score": weekly["weekly_exposure_score"],
                "exposure_level": weekly["risk_level"],
                "recommendation": weekly["recommendation"],
                "top_toxins": weekly["top_toxins"],
                "adulteration_probability": personal["adulteration_probability"],
                "source": personal["source"],
            }
        else:
            result["personalizedScore"] = None
    except Exception:
        result["personalizedScore"] = None


# ── Text scan ────────────────────────────────────────────
@router.post("/text")
async def scan_text(req: TextScanRequest, db: AsyncSession = Depends(get_db)):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")

    # 1. Groq AI scan
    result = scan_food_text(req.food_name, req.member_profile, req.lang)

    # 2. Prophet seasonal risk ML
    _attach_seasonal_risk(result, req.food_name)

    # 3. RF personalized scorer ML
    _attach_personalized_score(result, req.food_name, req.member_profile, req.city)

    # 4. Save to DB
    if req.user_id:
        db.add(ScanRecord(
            user_id=req.user_id, food_name=req.food_name,
            risk_level=result.get("riskLevel"), safety_score=result.get("safetyScore"),
            result_json=result, scan_type="text", city=req.city
        ))

    return result


# ── Image scan ────────────────────────────────────────────
@router.post("/image")
async def scan_image(
    file: UploadFile = File(...),
    lang: str = Form("en"),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Image must be JPEG, PNG, or WebP")

    data = await file.read()
    b64  = base64.b64encode(data).decode()

    # 1. ── YOLOv8: detect food class from image ──────────────────────────────
    yolo = detect_food(data)

    if yolo["detected"] and yolo["confidence"] >= 0.5:
        # YOLOv8 identified the food confidently →
        # run the full text-scan pipeline (Groq + Prophet + RF)
        food_name = yolo["food_name"]
        result = scan_food_text(food_name, None, lang)
        result["detectionSource"] = "yolov8"
        result["yoloDetection"]   = {
            "food":       yolo["food_name"],
            "confidence": yolo["confidence"],
            "all":        yolo["all_detections"],
        }
    else:
        # 2. ── Fallback: Groq Vision analyzes the label/image ─────────────────
        result = analyze_label_image(b64, file.content_type)
        result["detectionSource"] = "groq_vision"
        if yolo["detected"]:
            # YOLO found something but low confidence — attach as a hint
            result["yoloDetection"] = {
                "food":       yolo["food_name"],
                "confidence": yolo["confidence"],
                "note":       "Low confidence — Groq Vision used instead",
            }

    # 3. Extract food name for ML layers
    food_name = (
        result.get("foodName")
        or result.get("food_name")
        or result.get("name")
        or result.get("productName")
        or (yolo["food_name"] if yolo["detected"] else "")
    )

    # 4. Prophet seasonal risk
    if food_name:
        _attach_seasonal_risk(result, food_name)
    else:
        result["seasonalRisk"] = None

    # 5. Personalized score skipped (no member profile on image scan)
    result["personalizedScore"] = None

    # 6. Tag scan type
    result["scanType"] = "image"

    return result


# ── Barcode scan ──────────────────────────────────────────
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

    # 1. Groq text scan
    result = scan_food_text(food_name, None, lang)

    # 2. Prophet seasonal risk
    _attach_seasonal_risk(result, food_name)

    # 3. No member profile for barcode scan
    result["personalizedScore"] = None

    result["barcodeData"] = {
        "name":        food_name,
        "brand":       product.get("brands", ""),
        "ingredients": product.get("ingredients_text", ""),
        "nutriscore":  product.get("nutriscore_grade", ""),
        "image_url":   product.get("image_url", ""),
    }
    result["scanType"] = "barcode"
    return result


# ── Combination scan ──────────────────────────────────────
@router.post("/combination")
async def combination_scan(req: CombinationRequest):
    if len(req.foods) < 2:
        raise HTTPException(400, "At least 2 foods required for combination scan")
    return scan_combination(req.foods, req.member_profile)