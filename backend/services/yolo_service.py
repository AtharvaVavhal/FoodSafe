"""
services/yolo_service.py

YOLOv8 model removed — no trained model file available.
Image scans fall back to Groq Vision automatically.
Stub keeps the same API so scan.py works unchanged.
"""

import logging

logger = logging.getLogger(__name__)

# Keep these so admin.py ml-status check doesn't crash
_model  = None
_loaded = True  # pretend loaded so no retry attempts

logger.info("⚠ YOLOv8 removed — image scans use Groq Vision fallback")


def detect_food(image_bytes: bytes) -> dict:
    """
    Stub — always returns not detected.
    scan.py will automatically fall back to Groq Vision.
    """
    return {
        "detected":       False,
        "food_name":      None,
        "yolo_class":     None,
        "confidence":     None,
        "all_detections": [],
        "source":         "yolov8_unavailable",
    }