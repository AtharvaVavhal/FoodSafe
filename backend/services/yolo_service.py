"""
backend/services/yolo_service.py

Loads the trained YOLOv8 model once at startup.
Provides detect_food(image_bytes) → dict with detected food name + confidence.

The model was trained on 10 Indian food classes:
  turmeric_powder, chilli_powder, milk, mustard_oil, dal,
  rice, honey, ghee, paneer, wheat_flour

Output food name is normalized to match scan pipeline expectations.
"""

import os, io, logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Path ───────────────────────────────────────────────────────────────────────
_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "ml", "models", "foodsafe_yolov8_best.pt"
)

# ── Name normalisation: YOLO class name → scan pipeline food name ──────────────
_YOLO_TO_SCAN = {
    "turmeric_powder":  "turmeric",
    "chilli_powder":    "chilli powder",
    "milk":             "milk",
    "mustard_oil":      "mustard oil",
    "dal":              "dal",
    "dal_lentils":      "dal",
    "rice":             "rice",
    "honey":            "honey",
    "honey_jar":        "honey",
    "ghee":             "ghee",
    "ghee_container":   "ghee",
    "paneer":           "paneer",
    "wheat_flour":      "wheat flour",
    "milk_packet":      "milk",
    "spice_packet":     "spices",
    "loose_spice":      "spices",
    "coriander_powder": "coriander powder",
    "cumin":            "cumin",
    "coconut_oil":      "coconut oil",
}

# Minimum confidence to trust a detection
_CONF_THRESHOLD = 0.45

# ── Lazy global ────────────────────────────────────────────────────────────────
_model  = None
_loaded = False


def _load():
    global _model, _loaded
    if _loaded:
        return
    try:
        from ultralytics import YOLO
        if not os.path.exists(_MODEL_PATH):
            logger.warning(f"⚠ YOLOv8 model not found at {_MODEL_PATH}")
            _loaded = True
            return
        _model = YOLO(_MODEL_PATH)
        logger.info("✅ YOLOv8 food detection model loaded")
    except ImportError:
        logger.warning("⚠ ultralytics not installed — pip install ultralytics")
    except Exception as e:
        logger.warning(f"⚠ YOLOv8 load failed: {e}")
    _loaded = True


def detect_food(image_bytes: bytes) -> dict:
    """
    Run YOLOv8 on raw image bytes.

    Returns:
    {
        "detected":    True | False,
        "food_name":   "turmeric" | None,       # normalised for scan pipeline
        "yolo_class":  "turmeric_powder" | None, # raw YOLO class name
        "confidence":  0.87 | None,
        "all_detections": [                       # all boxes above threshold
            {"food": "turmeric", "confidence": 0.87, "bbox": [x1,y1,x2,y2]}
        ],
        "source": "yolov8"
    }
    """
    _load()

    result_base = {
        "detected": False,
        "food_name": None,
        "yolo_class": None,
        "confidence": None,
        "all_detections": [],
        "source": "yolov8",
    }

    if _model is None:
        result_base["source"] = "yolov8_unavailable"
        return result_base

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        results = _model.predict(
            source=img,
            conf=_CONF_THRESHOLD,
            verbose=False,
            imgsz=640,
        )

        if not results or len(results) == 0:
            return result_base

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return result_base

        all_detections = []
        for box in boxes:
            cls_id    = int(box.cls.item())
            cls_name  = results[0].names[cls_id]
            conf      = float(box.conf.item())
            bbox      = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            food_name = _YOLO_TO_SCAN.get(cls_name, cls_name.replace("_", " "))
            all_detections.append({
                "food":       food_name,
                "yolo_class": cls_name,
                "confidence": round(conf, 3),
                "bbox":       [round(v) for v in bbox],
            })

        if not all_detections:
            return result_base

        # Sort by confidence, take top detection
        all_detections.sort(key=lambda x: x["confidence"], reverse=True)
        top = all_detections[0]

        return {
            "detected":       True,
            "food_name":      top["food"],
            "yolo_class":     top["yolo_class"],
            "confidence":     top["confidence"],
            "all_detections": all_detections,
            "source":         "yolov8",
        }

    except Exception as e:
        logger.warning(f"YOLOv8 detection failed: {e}")
        result_base["error"] = str(e)
        return result_base
