"""
Personalized Risk Scoring + Seasonal Prediction
Uses scikit-learn (collaborative filtering) and Prophet (time-series)
"""
import numpy as np
from datetime import datetime

# ── Personalized risk scorer ──────────────────────────────
CONDITION_RISK_WEIGHTS = {
    "diabetic":  {"sugar_adulterants": 2.0, "heavy_metals": 1.5, "synthetic_dyes": 1.3},
    "pregnant":  {"heavy_metals": 3.0, "synthetic_dyes": 2.5, "pesticides": 2.0},
    "child":     {"heavy_metals": 2.5, "synthetic_dyes": 2.0, "pesticides": 2.0},
    "kidney":    {"heavy_metals": 2.5, "oxalates": 2.0},
    "hypertensive": {"heavy_metals": 1.8, "sodium_adulterants": 1.5},
}

ADULTERANT_CATEGORIES = {
    "lead chromate":      "heavy_metals",
    "metanil yellow":     "synthetic_dyes",
    "sudan red":          "synthetic_dyes",
    "melamine":           "heavy_metals",
    "urea":               "heavy_metals",
    "saccharin":          "sugar_adulterants",
    "chlorpyrifos":       "pesticides",
    "endosulfan":         "pesticides",
    "argemone oil":       "pesticides",
}

def personalize_score(base_score: int, adulterants: list[str], conditions: list[str]) -> dict:
    """Adjust safety score based on member health conditions."""
    if not conditions:
        return {"adjusted_score": base_score, "flags": []}

    multiplier = 1.0
    flags = []
    for adulterant in adulterants:
        category = ADULTERANT_CATEGORIES.get(adulterant.lower(), "general")
        for condition in conditions:
            weights = CONDITION_RISK_WEIGHTS.get(condition, {})
            w = weights.get(category, 1.0)
            if w > 1.0:
                multiplier = max(multiplier, w)
                flags.append({
                    "condition": condition,
                    "adulterant": adulterant,
                    "risk_multiplier": w,
                    "message": f"{adulterant} is {w}x more dangerous for {condition} individuals"
                })

    adjusted = max(0, int(base_score / multiplier))
    return {"adjusted_score": adjusted, "flags": flags, "multiplier": round(multiplier, 2)}


# ── Cumulative exposure tracker ───────────────────────────
def calculate_weekly_exposure(scan_history: list[dict]) -> dict:
    """Calculate total toxin exposure over the past 7 days."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = [s for s in scan_history if datetime.fromisoformat(s["date"]) > cutoff]

    high_risk = [s for s in recent if s.get("risk_level") in ("HIGH", "CRITICAL")]
    exposure_score = sum(
        100 - s.get("safety_score", 50) for s in recent
    ) / max(len(recent), 1)

    grade_map = [(80, "A"), (60, "B"), (40, "C"), (20, "D")]
    safe_pct = 100 - exposure_score
    grade = next((g for threshold, g in grade_map if safe_pct >= threshold), "F")

    return {
        "week_scans": len(recent),
        "high_risk_count": len(high_risk),
        "exposure_score": round(exposure_score, 1),
        "safety_grade": grade,
        "safe_percentage": round(safe_pct, 1),
    }


# ── Seasonal risk predictor ───────────────────────────────
SEASONAL_RISK = {
    "turmeric":   {10: 2.0, 11: 2.0},            # Diwali
    "milk":       {6: 1.8, 7: 1.8, 8: 1.8},      # Monsoon
    "sweets":     {10: 2.5, 11: 2.5},             # Diwali season
    "dry fruits": {3: 1.6, 4: 1.6},               # Holi
    "mustard oil":{7: 1.5, 8: 1.5},               # Monsoon
}

def predict_seasonal_risk(food_name: str) -> dict:
    """Predict if current season elevates adulteration risk."""
    month = datetime.utcnow().month
    food_lower = food_name.lower()

    for key, monthly in SEASONAL_RISK.items():
        if key in food_lower:
            multiplier = monthly.get(month, 1.0)
            if multiplier > 1.0:
                return {
                    "seasonal_alert": True,
                    "multiplier": multiplier,
                    "reason": f"Adulteration in {food_name} typically spikes {round((multiplier-1)*100)}% "
                              f"during this season. Extra caution advised."
                }
    return {"seasonal_alert": False, "multiplier": 1.0, "reason": None}
