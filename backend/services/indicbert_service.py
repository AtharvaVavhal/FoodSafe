"""
services/indicbert_service.py

IndicBERT / MuRIL removed — no trained model available.
Intent classification and food name mapping handled by simple keyword fallback.
Stub keeps the same API so any callers work unchanged.
"""

import logging

logger = logging.getLogger(__name__)

# Keep these so admin.py ml-status check doesn't crash
_classifier = None
_muril      = None
_loaded     = False  # correctly shows as not loaded in admin

logger.info("⚠ IndicBERT/MuRIL removed — using keyword fallback")

# Simple Hindi/Marathi → English food name map
_FOOD_MAP = {
    "दूध": "milk", "पनीर": "paneer", "हल्दी": "turmeric",
    "चावल": "rice", "दाल": "dal", "घी": "ghee",
    "शहद": "honey", "मिर्च": "chilli", "आटा": "wheat flour",
    "दही": "curd", "मक्खन": "butter", "तेल": "oil",
    "dudh": "milk", "chawal": "rice", "dal": "dal",
    "haldi": "turmeric", "mirchi": "chilli", "ghee": "ghee",
    "shahad": "honey", "paneer": "paneer", "dahi": "curd",
}


def classify_intent(text: str) -> str:
    """
    Simple keyword-based intent classifier.
    Returns: 'food_scan' | 'symptom_report' | 'brand_query' | 'general'
    """
    text_lower = text.lower()
    symptom_keywords = ["pain", "sick", "ill", "fever", "vomit", "diarrhea", "stomach", "headache", "nausea", "allergy"]
    brand_keywords   = ["brand", "company", "manufacturer", "which", "safe brand", "trusted"]

    if any(k in text_lower for k in symptom_keywords):
        return "symptom_report"
    if any(k in text_lower for k in brand_keywords):
        return "brand_query"
    return "food_scan"


def normalize_food_name(text: str) -> str:
    """
    Resolve Hindi/Marathi food names to English using keyword map.
    Falls back to the original text if no mapping found.
    """
    text_stripped = text.strip()
    # Direct lookup
    if text_stripped in _FOOD_MAP:
        return _FOOD_MAP[text_stripped]
    # Partial match
    text_lower = text_stripped.lower()
    for k, v in _FOOD_MAP.items():
        if k in text_lower:
            return v
    return text_stripped