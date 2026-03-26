"""
routers/scan.py  (image route section)

Drop this into your existing scan router. The key fix is converting the
uploaded file bytes to base64 BEFORE passing to analyze_label_image.
The old code likely passed the raw bytes or a file path, which caused
the vision call to fail silently.
"""

import base64
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from services.ai_service import (
    analyze_label_image,
    scan_combination,
    scan_food_text,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scan", tags=["scan"])

# ── Allowed image types ───────────────────────────────────────────────────────
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024   # 5 MB


# ── POST /scan/image ──────────────────────────────────────────────────────────
@router.post("/image")
async def scan_image(
    file: UploadFile = File(...),
    lang: str = Form(default="en"),
):
    """
    Accept a food product image, convert to base64, call Groq vision,
    return structured adulteration analysis.
    """
    # ── Validate MIME type ────────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Use JPEG, PNG, or WebP.",
        )

    # ── Read and size-check ───────────────────────────────────────────────────
    raw: bytes = await file.read()
    if len(raw) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 5 MB limit.",
        )
    if len(raw) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── Convert to base64 ─────────────────────────────────────────────────────
    # FIX: This is the step that was missing — raw bytes must become a base64
    # string before being embedded in the Groq vision request as a data URL.
    image_b64 = base64.b64encode(raw).decode("utf-8")

    logger.info(
        "Image scan: filename=%s mime=%s size=%dKB lang=%s",
        file.filename, content_type, len(raw) // 1024, lang,
    )

    # ── Call vision AI ────────────────────────────────────────────────────────
    try:
        result = analyze_label_image(image_b64=image_b64, media_type=content_type)
    except Exception as exc:
        logger.exception("analyze_label_image raised: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Vision analysis failed. Try again or type the food name instead.",
        ) from exc

    return JSONResponse(content=result)


# ── POST /scan/text ───────────────────────────────────────────────────────────
@router.post("/text")
async def scan_text(payload: dict):
    """
    Analyse adulteration risk for a food item by name (RAG-enhanced).
    Expected body: { food_name, member_profile?, lang? }
    """
    food_name = (payload.get("food_name") or "").strip()
    if not food_name:
        raise HTTPException(status_code=400, detail="food_name is required")

    result = scan_food_text(
        food_name=food_name,
        member_profile=payload.get("member_profile"),
        lang=payload.get("lang", "en"),
    )
    return JSONResponse(content=result)


# ── POST /scan/combination ────────────────────────────────────────────────────
@router.post("/combination")
async def scan_combination_route(payload: dict):
    """
    Analyse combined adulteration risk for a list of foods.
    Expected body: { foods: [...], member_profile?, lang? }
    """
    foods = payload.get("foods") or []
    if not foods or len(foods) < 2:
        raise HTTPException(status_code=400, detail="At least 2 foods required for combination scan")

    result = scan_combination(
        foods=foods,
        member_profile=payload.get("member_profile"),
        lang=payload.get("lang", "en"),
    )
    return JSONResponse(content=result)