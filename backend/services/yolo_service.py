"""
backend/services/yolo_service.py

Groq Vision replacement for YOLOv8 food detection.
Same public API: detect_food(image_bytes) → dict
No ultralytics or torch required.
"""

import base64
import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
VISION_MODEL = "llama-3.2-90b-vision-preview"


def _groq_key() -> str:
    from app.core.config import settings
    return settings.GROQ_API_KEY


def detect_food(image_bytes: bytes) -> dict:
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

    try:
        img_b64 = base64.b64encode(image_bytes).decode("utf-8")

        if image_bytes[:4] == b"\x89PNG":
            media_type = "image/png"
        elif image_bytes[:3] == b"\xff\xd8\xff":
            media_type = "image/jpeg"
        elif image_bytes[:4] == b"RIFF":
            media_type = "image/webp"
        else:
            media_type = "image/jpeg"

        system = (
            "You are a food detection assistant. "
            "Look at the image and identify all visible food items. "
            "Focus on Indian foods commonly checked for adulteration: "
            "turmeric, chilli powder, milk, mustard oil, dal, rice, "
            "honey, ghee, paneer, wheat flour, spices. "
            "Reply ONLY with a JSON object:\n"
            '{"foods": [{"name": "food name in English", "confidence": 0.0-1.0}]}\n'
            "List up to 3 foods, ordered by confidence. "
            'If no food is visible, return {"foods": []}.'
        )

        resp = httpx.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {_groq_key()}",
                "Content-Type": "application/json",
            },
            json={
                "model": VISION_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{img_b64}"
                                },
                            },
                            {"type": "text", "text": "What food items are in this image?"},
                        ],
                    },
                ],
                "temperature": 0.1,
                "max_tokens": 150,
            },
            timeout=20,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()

        match = re.search(r"\{.*\}", raw, re.S)
        if not match:
            return base_result

        data  = json.loads(match.group())
        foods = data.get("foods", [])

        if not foods:
            return base_result

        all_detections = [
            {"food": f["name"].lower(), "confidence": round(float(f.get("confidence", 0.5)), 3)}
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

    except Exception as e:
        logger.warning("Groq Vision food detection failed: %s", e)
        base_result["error"] = str(e)
        return base_result