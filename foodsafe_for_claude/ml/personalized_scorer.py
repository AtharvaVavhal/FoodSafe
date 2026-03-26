"""
ml/personalized_scorer.py
Loads the trained Random Forest model and computes personalized
cumulative toxin exposure scores for users.
"""
import json
import os
import joblib
import numpy as np
from datetime import datetime

_BASE = os.path.dirname(__file__)

# ── Load models ───────────────────────────────────────────
_rf_model  = None
_encoders  = None
_toxin_data = None

try:
    _rf_model = joblib.load(os.path.join(_BASE, 'risk_scorer_rf.joblib'))
    _encoders = joblib.load(os.path.join(_BASE, 'risk_scorer_encoders.joblib'))
    print("✅ Loaded personalized risk scorer RF model")
except FileNotFoundError:
    print("⚠ RF model not found — using rule-based fallback scorer")

try:
    with open(os.path.join(_BASE, 'toxin_weights.json')) as f:
        _toxin_data = json.load(f)
    print("✅ Loaded toxin weights")
except FileNotFoundError:
    print("⚠ toxin_weights.json not found — using built-in weights")

# ── Fallback toxin weights ────────────────────────────────
_DEFAULT_TOXIN_WEIGHTS = {
    'lead_chromate': 10.0, 'sudan_red': 8.0, 'argemone_oil': 9.0,
    'urea': 3.0, 'detergent': 5.0, 'synthetic_milk': 4.0,
    'hfcs': 2.0, 'vanaspati': 3.0, 'starch': 1.5,
    'brick_powder': 6.0, 'kesari_dal': 7.0, 'synthetic_color': 4.0,
    'animal_fat': 2.5, 'chalk_powder': 3.0, 'plastic_rice': 5.0,
    'skimmed_powder': 1.0, 'sugar_syrup': 2.0, 'talc': 4.0,
}

_DEFAULT_FOODS = {
    'turmeric':      ['lead_chromate', 'synthetic_color'],
    'milk':          ['urea', 'detergent', 'synthetic_milk'],
    'honey':         ['hfcs', 'sugar_syrup'],
    'ghee':          ['vanaspati', 'animal_fat'],
    'mustard_oil':   ['argemone_oil'],
    'mustard oil':   ['argemone_oil'],
    'paneer':        ['starch', 'skimmed_powder'],
    'chilli_powder': ['sudan_red', 'brick_powder'],
    'chilli powder': ['sudan_red', 'brick_powder'],
    'rice':          ['plastic_rice'],
    'dal':           ['kesari_dal', 'color'],
    'wheat_flour':   ['chalk_powder', 'talc'],
}

_CONDITION_MULTIPLIERS = {
    'none': 1.0, 'diabetic': 1.3, 'hypertensive': 1.4,
    'kidney_disease': 1.8, 'pregnant': 1.6, 'child': 1.5, 'elderly': 1.3,
    'kidney disease': 1.8,
}

def get_toxin_weights():
    if _toxin_data:
        return _toxin_data.get('toxin_weights', _DEFAULT_TOXIN_WEIGHTS)
    return _DEFAULT_TOXIN_WEIGHTS

def get_food_toxins():
    if _toxin_data:
        foods = _toxin_data.get('foods', {})
        return {k: v.get('toxins', []) for k, v in foods.items()}
    return _DEFAULT_FOODS

def calculate_weekly_exposure(scan_history: list, condition: str = 'none') -> dict:
    """
    Calculate cumulative weekly toxin exposure from scan history.
    scan_history: list of {food_name, risk_level}
    condition: user health condition
    """
    toxin_weights = get_toxin_weights()
    food_toxins   = get_food_toxins()
    multiplier    = _CONDITION_MULTIPLIERS.get(condition.lower(), 1.0)

    total_exposure  = 0
    toxin_breakdown = {}

    for scan in scan_history:
        food = scan.get('food_name', '').lower().replace(' ', '_')
        risk_level = scan.get('risk_level', 'LOW')
        risk_mult  = {'CRITICAL': 1.0, 'HIGH': 0.7, 'MEDIUM': 0.4, 'LOW': 0.1}.get(risk_level, 0.1)

        # Try both underscore and space versions
        toxins = food_toxins.get(food, food_toxins.get(food.replace('_', ' '), []))
        for toxin in toxins:
            weight   = toxin_weights.get(toxin, 2.0)
            exposure = weight * risk_mult * multiplier
            total_exposure += exposure
            toxin_breakdown[toxin] = toxin_breakdown.get(toxin, 0) + exposure

    max_possible   = sum(toxin_weights.values()) * 1.5
    exposure_score = min(100, round((total_exposure / max_possible) * 100))

    top_toxins = sorted(toxin_breakdown.items(), key=lambda x: x[1], reverse=True)[:3]

    risk_level = (
        'CRITICAL' if exposure_score >= 70 else
        'HIGH'     if exposure_score >= 50 else
        'MEDIUM'   if exposure_score >= 30 else 'LOW'
    )

    recommendations = {
        'CRITICAL': 'Immediate dietary change needed — dangerous toxin accumulation this week. Avoid high-risk foods and consult a doctor.',
        'HIGH':     'Reduce consumption of flagged foods this week. Buy only FSSAI-certified brands.',
        'MEDIUM':   'Moderate exposure detected. Prefer certified sources and perform home tests.',
        'LOW':      'Your food choices this week look safe. Keep buying from trusted sources.',
    }

    return {
        'weekly_exposure_score': exposure_score,
        'risk_level':            risk_level,
        'scans_analyzed':        len(scan_history),
        'top_toxins':            [{'toxin': t.replace('_', ' ').title(), 'exposure': round(e, 1)} for t, e in top_toxins],
        'recommendation':        recommendations[risk_level],
        'condition_multiplier':  multiplier,
    }

def predict_personal_risk(
    age: int,
    condition: str,
    city: str,
    food: str,
    month: int = None,
    safety_score: int = 50,
    scans_per_week: int = 3,
) -> dict:
    """
    Predict adulteration risk for a specific user + food combination.
    Returns probability and risk level.
    """
    if month is None:
        month = datetime.now().month

    # Rule-based fallback (always works)
    base_risk = {
        'turmeric': 0.7, 'milk': 0.6, 'honey': 0.5,
        'ghee': 0.4, 'mustard_oil': 0.6, 'paneer': 0.7,
        'chilli_powder': 0.8, 'rice': 0.3, 'dal': 0.4,
        'wheat_flour': 0.3,
    }.get(food.lower().replace(' ', '_'), 0.5)

    cond_mult  = _CONDITION_MULTIPLIERS.get(condition.lower(), 1.0)
    city_mult  = {'Nagpur': 1.2, 'Pune': 1.1, 'Mumbai': 1.15, 'Aurangabad': 1.05, 'Nashik': 1.0}.get(city, 1.0)
    season_mult = 1.3 if month in [3, 4, 10, 11] else 1.0

    rule_prob  = min(0.95, base_risk * cond_mult * city_mult * season_mult)
    risk_score = max(5, min(95, int(100 - rule_prob * 100)))
    risk_level = 'CRITICAL' if risk_score < 30 else 'HIGH' if risk_score < 50 else 'MEDIUM' if risk_score < 70 else 'LOW'

    # Try ML model if available
    source = 'rule_based'
    if _rf_model and _encoders:
        try:
            cond_enc = _encoders['condition'].transform([condition])[0] if condition in _encoders['condition'].classes_ else 0
            city_enc = _encoders['city'].transform([city])[0] if city in _encoders['city'].classes_ else 0
            food_enc = _encoders['food'].transform([food.lower().replace(' ', '_')])[0] if food.lower().replace(' ', '_') in _encoders['food'].classes_ else 0

            features = np.array([[
                age, cond_enc, city_enc, food_enc,
                month,
                1 if month in [3, 4, 10, 11] else 0,
                1 if condition in ['kidney_disease', 'pregnant', 'child'] else 0,
                scans_per_week,
                safety_score,
            ]])
            ml_prob = _rf_model.predict_proba(features)[0][1]
            rule_prob = ml_prob
            risk_score = max(5, min(95, int(100 - ml_prob * 100)))
            risk_level = 'CRITICAL' if risk_score < 30 else 'HIGH' if risk_score < 50 else 'MEDIUM' if risk_score < 70 else 'LOW'
            source = 'random_forest'
        except Exception as e:
            pass  # Fall through to rule-based

    return {
        'food':             food,
        'adulteration_probability': round(rule_prob, 3),
        'risk_score':       risk_score,
        'risk_level':       risk_level,
        'source':           source,
        'personalized_for': condition,
    }
