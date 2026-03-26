"""
backend/services/yolo_service.py

Async Groq Vision food detection.
Uses the shared _GROQ_SEMAPHORE + correct LLaMA 4 Scout model from ai_service
so all Groq calls go through one throttle point.

Public API: await detect_food(image_bytes) → dict
"""

import json
import logging
import re

from services.ai_service import (
    _get_semaphore,
    _jitter,
    GROQ_KEY,
    GROQ_VISION_MODEL_PRIMARY,
    GROQ_VISION_MODEL_FALLBACK,
    GROQ_URL,
    BASE_WAIT,
    MAX_WAIT,
    MAX_RETRIES,
)

import asyncio
import base64
import httpx

logger = logging.getLogger(__name__)


async def detect_food(image_bytes: bytes) -> dict:
    """
    Detect the primary food item in an image using Groq Vision.

    Returns:
    {
        "detected":       True | False,
        "food_name":      "turmeric" | None,
        "yolo_class":     None,
        "confidence":     0.87 | None,
        "all_detections": [{"food": "turmeric", "confidence": 0.87}],
        "source":         "groq_vision"
    }
    """
    base_result = {
        "detected":       False,
        "food_name":      None,
        "yolo_class":     None,
        "confidence":     None,
        "all_detections": [],
        "source":         "groq_vision",
    }

    if not GROQ_KEY:
        logger.warning("Groq API key not configured — skipping food detection")
        return base_result

    # Detect media type from magic bytes
    if image_bytes[:4] == b"\x89PNG":
        media_type = "image/png"
    elif image_bytes[:3] == b"\xff\xd8\xff":
        media_type = "image/jpeg"
    elif image_bytes[:4] == b"RIFF":
        media_type = "image/webp"
    else:
        media_type = "image/jpeg"

    img_b64      = base64.b64encode(image_bytes).decode("utf-8")
    img_data_url = f"data:{media_type};base64,{img_b64}"

    system = (
        "You are a food detection assistant. "
        "Look at the image and identify all visible food items. "
        "Focus on Indian foods commonly checked for adulteration: "
        "turmeric, chilli powder, milk, mustard oil, dal, rice, "
        "honey, ghee, paneer, wheat flour, spices. "
        'Reply ONLY with a JSON object: {"foods": [{"name": "food name in English", "confidence": 0.0-1.0}]}\n'
        "List up to 3 foods, ordered by confidence. "
        'If no food is visible, return {"foods": []}.'
    )

    user_content = [
        {"type": "text", "text": "What food items are in this image?"},
        {
            "type": "image_url",
            "image_url": {"url": img_data_url, "detail": "auto"},
        },
    ]

    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type":  "application/json",
    }

    # BUG FIX 1: Runs inside _GROQ_SEMAPHORE — same throttle as ai_service
    # BUG FIX 2: Uses async httpx — never blocks the event loop
    # BUG FIX 3: Correct models (Scout → Maverick fallback), no deprecated preview model
    async with _get_semaphore():
        async with httpx.AsyncClient(timeout=30) as client:
            for model in [GROQ_VISION_MODEL_PRIMARY, GROQ_VISION_MODEL_FALLBACK]:
                for attempt in range(1, MAX_RETRIES + 1):
                    try:
                        resp = await client.post(
                            GROQ_URL,
                            headers=headers,
                            json={
                                "model": model,
                                "messages": [
                                    {"role": "system", "content": system},
                                    {"role": "user",   "content": user_content},
                                ],
                                "temperature": 0.1,
                                "max_tokens":  150,
                            },
                        )

                        # Model gone / bad request → try fallback model
                        if resp.status_code in (400, 404):
                            logger.warning(
                                "detect_food: model %s returned %d — trying fallback",
                                model, resp.status_code,
                            )
                            break  # next model

                        # Rate limit / server error → backoff + retry same model
                        if resp.status_code == 429 or resp.status_code >= 500:
                            wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                            logger.warning(
                                "detect_food: %d on attempt %d/%d — retry in %.1fs",
                                resp.status_code, attempt, MAX_RETRIES, wait,
                            )
                            if attempt < MAX_RETRIES:
                                await asyncio.sleep(wait)
                                continue
                            resp.raise_for_status()

                        resp.raise_for_status()
                        raw = resp.json()["choices"][0]["message"]["content"].strip()

                        match = re.search(r"\{.*\}", raw, re.S)
                        if not match:
                            return base_result

                        foods = json.loads(match.group()).get("foods", [])
                        if not foods:
                            return base_result

                        all_detections = [
                            {
                                "food":       f["name"].lower(),
                                "confidence": round(float(f.get("confidence", 0.5)), 3),
                            }
                            for f in foods if f.get("name")
                        ]
                        if not all_detections:
                            return base_result

                        top = all_detections[0]
                        return {
                            "detected":       True,
                            "food_name":      top["food"],
                            "yolo_class":     None,
                            "confidence":     top["confidence"],
                            "all_detections": all_detections,
                            "source":         "groq_vision",
                        }

                    except httpx.TimeoutException:
                        wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                        logger.warning(
                            "detect_food timeout attempt %d/%d, retry in %.1fs",
                            attempt, MAX_RETRIES, wait,
                        )
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(wait)
                        else:
                            base_result["error"] = "timeout"
                            return base_result

    logger.warning("detect_food: all models exhausted")
    base_result["error"] = "all_models_failed"
    return base_result