from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional
import base64, httpx
from services.ai_service import scan_food_text, scan_combination, analyze_label_image
from app.db.database import get_db
from models.models import ScanRecord
from sqlalchemy.ext.asyncio import AsyncSession

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

# ── Text scan ────────────────────────────────────────────
@router.post("/text")
async def scan_text(req: TextScanRequest, db: AsyncSession = Depends(get_db)):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")
    result = scan_food_text(req.food_name, req.member_profile, req.lang)
    if req.user_id:
        db.add(ScanRecord(
            user_id=req.user_id, food_name=req.food_name,
            risk_level=result.get("riskLevel"), safety_score=result.get("safetyScore"),
            result_json=result, scan_type="text", city=req.city
        ))
    return result

# ── Image scan ────────────────────────────────────────────
@router.post("/image")
async def scan_image(file: UploadFile = File(...), lang: str = "en"):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Image must be JPEG, PNG, or WebP")
    data = await file.read()
    b64  = base64.b64encode(data).decode()
    result = analyze_label_image(b64, file.content_type)
    return result

# ── Barcode scan via Open Food Facts ─────────────────────
@router.get("/barcode/{barcode}")
async def scan_barcode(barcode: str, lang: str = "en"):
    async with httpx.AsyncClient() as client:
        r = await client.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json")
    data = r.json()
    if data.get("status") != 1:
        raise HTTPException(404, "Product not found in Open Food Facts database")
    product = data["product"]
    food_name = product.get("product_name", "") or product.get("product_name_en", "")
    if not food_name:
        raise HTTPException(404, "Could not identify product name from barcode")
    result = scan_food_text(food_name, None, lang)
    result["barcodeData"] = {
        "name": food_name,
        "brand": product.get("brands", ""),
        "ingredients": product.get("ingredients_text", ""),
        "nutriscore": product.get("nutriscore_grade", ""),
        "image_url": product.get("image_url", ""),
    }
    return result

# ── Combination scan ──────────────────────────────────────
@router.post("/combination")
async def combination_scan(req: CombinationRequest):
    if len(req.foods) < 2:
        raise HTTPException(400, "At least 2 foods required for combination scan")
    return scan_combination(req.foods, req.member_profile)
