"""
backend/services/indicbert_service.py

Loads MuRIL (google/muril-base-cased) once at startup.
Provides:
  1. classify_intent(text) → "food_scan" | "symptom_report" | "brand_query" | "general"
  2. normalize_food_name(text) → English food name (resolves Hindi/Marathi input)

The LogisticRegression classifier was trained on 768-dim MuRIL CLS embeddings.
Classes: 0=food_scan, 1=symptom_report, 2=general_question
"""

import os, json, logging
import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
_BASE      = os.path.join(os.path.dirname(__file__), "..", "..", "ml")
_CLF_PATH  = os.path.join(_BASE, "models", "indicbert_classifier.joblib")
_MAP_PATH  = os.path.join(_BASE, "food_name_mapping.json")

# Intent labels (matches training: classes [0, 1, 2])
_INTENT_LABELS = {0: "food_scan", 1: "symptom_report", 2: "general"}

# ── Lazy globals (loaded once on first call) ───────────────────────────────────
_tokenizer  = None
_muril      = None
_classifier = None
_food_map   = {}
_loaded     = False


def _load():
    """Load MuRIL + classifier once. Thread-safe via module-level flag."""
    global _tokenizer, _muril, _classifier, _food_map, _loaded
    if _loaded:
        return

    # Food name mapping (Hindi/Marathi → English) — always load, it's tiny
    try:
        with open(_MAP_PATH, encoding="utf-8") as f:
            _food_map = json.load(f)
        logger.info(f"✅ IndicBERT: loaded {len(_food_map)} food name mappings")
    except FileNotFoundError:
        logger.warning("⚠ food_name_mapping.json not found — Hindi/Marathi resolution disabled")

    # MuRIL tokenizer + model
    try:
        from transformers import AutoTokenizer, AutoModel
        import torch

        MODEL_NAME = "google/muril-base-cased"
        logger.info("⏳ Loading MuRIL tokenizer…")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        logger.info("⏳ Loading MuRIL model (~500 MB first run, cached after)…")
        _muril = AutoModel.from_pretrained(MODEL_NAME)
        _muril.eval()
        logger.info("✅ MuRIL model loaded")
    except Exception as e:
        logger.warning(f"⚠ MuRIL not available: {e} — intent classification disabled")
        _muril = None

    # Sklearn LogisticRegression trained on MuRIL CLS embeddings
    try:
        import joblib
        _classifier = joblib.load(_CLF_PATH)
        logger.info(f"✅ IndicBERT classifier loaded (n_features={_classifier.n_features_in_})")
    except Exception as e:
        logger.warning(f"⚠ IndicBERT classifier not loaded: {e}")
        _classifier = None

    _loaded = True


def _get_embedding(text: str) -> np.ndarray | None:
    """Extract 768-dim CLS embedding from MuRIL for a given text."""
    if _muril is None or _tokenizer is None:
        return None
    try:
        import torch
        inputs = _tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True,
        )
        with torch.no_grad():
            outputs = _muril(**inputs)
        # CLS token = first token of last hidden state
        cls_embedding = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
        return cls_embedding  # shape (768,)
    except Exception as e:
        logger.warning(f"MuRIL embedding failed: {e}")
        return None


# ── Public API ─────────────────────────────────────────────────────────────────

def classify_intent(text: str) -> str:
    """
    Classify user intent using MuRIL embeddings + trained LogisticRegression.

    Returns one of: "food_scan" | "symptom_report" | "general"
    Falls back to keyword rules if model not loaded.
    """
    _load()

    # Try ML path
    if _classifier is not None:
        embedding = _get_embedding(text)
        if embedding is not None:
            try:
                pred = int(_classifier.predict([embedding])[0])
                intent = _INTENT_LABELS.get(pred, "general")
                prob   = float(_classifier.predict_proba([embedding])[0].max())
                logger.debug(f"IndicBERT intent: {intent} (conf={prob:.2f}) for: {text[:40]}")
                # Only trust if confidence is reasonable
                if prob >= 0.45:
                    return intent
            except Exception as e:
                logger.warning(f"Intent classification failed: {e}")

    # Fallback: keyword rules (Hindi + Marathi + English)
    t = text.lower().strip()

    symptom_keywords = [
        "symptom", "pain", "sick", "diarrhea", "vomit", "nausea", "headache",
        "दर्द", "उल्टी", "दस्त", "बीमार", "लक्षण", "पेट दर्द",
        "दुखणे", "उलटी", "जुलाब", "आजार", "लक्षणे",
    ]
    brand_keywords = [
        "brand", "safe", "buy", "recommend", "which", "best", "certified",
        "ब्रांड", "सुरक्षित", "कौन", "कौनसा", "खरीदें",
        "ब्रँड", "सुरक्षित", "कोणता",
    ]

    if any(kw in t for kw in symptom_keywords):
        return "symptom_report"
    if any(kw in t for kw in brand_keywords):
        return "brand_query"
    return "food_scan"


def normalize_food_name(text: str) -> str:
    """
    Resolve Hindi/Marathi food names to English using food_name_mapping.json.
    Falls back to the original text if no mapping found.

    Examples:
        "हल्दी"        → "turmeric"
        "तूप"          → "ghee"
        "mustard oil"  → "mustard oil"  (unchanged)
    """
    _load()

    text_stripped = text.strip()

    # Direct lookup
    if text_stripped in _food_map:
        return _food_map[text_stripped]

    # Case-insensitive lookup (for English input)
    text_lower = text_stripped.lower()
    for k, v in _food_map.items():
        if k.lower() == text_lower:
            return v

    # Partial match — e.g. "हल्दी पाउडर मिलावट" should match "हल्दी"
    for k, v in _food_map.items():
        if k in text_stripped:
            return v

    return text_stripped  # already English or unknown


def get_food_adulteration_risk(food_name: str) -> str:
    """
    Quick lookup of known adulteration risk level from food_categories.json.
    Used to add context to scan results.
    """
    _load()
    try:
        cat_path = os.path.join(_BASE, "food_categories.json")
        with open(cat_path) as f:
            cats = json.load(f)
        risk_map = cats.get("adulteration_risk", {})
        key = food_name.lower().replace(" ", "_")
        return risk_map.get(key, risk_map.get(food_name.lower(), "MEDIUM"))
    except Exception:
        return "MEDIUM"
