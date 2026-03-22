"""
services/overconsumption_service.py

Detects dangerous overconsumption patterns from a user's scan history.

Two detection layers:
  1. Category frequency  — how many high-risk foods in a category the user
                           scanned today / this week vs. WHO/ICMR limits.
  2. Additive detection  — flags specific dangerous additives that appear in
                           the scan result's adulterants list.

No gram-level nutrition data is needed; classification is keyword-based
on food names + adulterant names returned by the AI scan.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)


# ── Category classifier ───────────────────────────────────────────────────────
# Maps food-name keywords → nutrient category.
# Checked in order; first match wins.

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "sugar": [
        "cola", "soda", "pepsi", "coke", "sprite", "fanta", "7up",
        "juice", "squash", "chocolate", "candy", "sweet", "mithai",
        "cake", "biscuit", "cookie", "ice cream", "kulfi", "halwa",
        "ladoo", "barfi", "gulab jamun", "jalebi", "rabri", "kheer",
        "soft drink", "energy drink", "sport drink", "jam", "jelly",
        "syrup", "condensed milk", "flavoured milk", "milkshake",
    ],
    "sodium": [
        "chips", "namkeen", "papad", "pickle", "achar", "sauce",
        "ketchup", "soy sauce", "instant noodles", "maggi", "ramen",
        "processed cheese", "cheese spread", "salted butter", "salted nuts",
        "popcorn", "pretzels", "crackers", "wafers", "salted biscuit",
        "canned", "tinned", "frozen meal", "ready to eat", "packaged",
    ],
    "saturated_fat": [
        "ghee", "butter", "cream", "full fat", "paneer", "coconut oil",
        "palm oil", "vanaspati", "dalda", "fried", "deep fried", "samosa",
        "kachori", "puri", "bhatura", "paratha", "processed meat",
        "sausage", "kebab", "mutton", "pork", "lard",
    ],
    "caffeine": [
        "coffee", "espresso", "latte", "cappuccino", "tea", "chai",
        "green tea", "black tea", "energy drink", "redbull", "monster",
        "cola", "cocoa", "dark chocolate", "pre workout", "guarana",
    ],
    "allergen_nuts": [
        "peanut", "groundnut", "cashew", "almond", "walnut", "pistachio",
        "hazelnut", "pecan", "pine nut", "mixed nuts", "nut butter",
        "praline", "marzipan", "satay",
    ],
    "allergen_gluten": [
        "wheat", "bread", "roti", "chapati", "naan", "pasta", "macaroni",
        "noodles", "semolina", "suji", "rava", "barley", "oats", "rye",
        "flour", "maida", "cookie", "cake", "biscuit", "cracker",
    ],
    "allergen_dairy": [
        "milk", "curd", "yogurt", "dahi", "paneer", "cheese", "butter",
        "ghee", "cream", "ice cream", "kheer", "rabri", "lassi",
        "whey", "lactose", "dairy",
    ],
}

# ── Daily safe limits (WHO + ICMR guidelines) ─────────────────────────────────
# Expressed as max number of "servings" (individual scan events) per day.
# These are intentionally conservative for a food-safety warning context.

DAILY_LIMITS: dict[str, dict] = {
    "sugar": {
        "label":       "Sugar / high-sugar foods",
        "daily_limit": 2,
        "unit":        "servings",
        "why":         "WHO recommends <25g free sugar/day. High-sugar Indian snacks often exceed this per serving.",
        "icon":        "🍬",
    },
    "sodium": {
        "label":       "High-sodium foods",
        "daily_limit": 2,
        "unit":        "servings",
        "why":         "ICMR limit is 2g sodium/day. Packaged snacks + pickles together can exceed this easily.",
        "icon":        "🧂",
    },
    "saturated_fat": {
        "label":       "Saturated / trans fat foods",
        "daily_limit": 2,
        "unit":        "servings",
        "why":         "WHO recommends <10% daily calories from saturated fat. Ghee, vanaspati, and fried foods stack up quickly.",
        "icon":        "🫙",
    },
    "caffeine": {
        "label":       "Caffeinated foods / drinks",
        "daily_limit": 3,
        "unit":        "servings",
        "why":         "Safe caffeine limit is 400mg/day for adults, 100mg for teens. 3+ cups of chai/coffee approaches this.",
        "icon":        "☕",
    },
    "allergen_nuts": {
        "label":       "Nut-containing foods",
        "daily_limit": 4,
        "unit":        "servings",
        "why":         "Nut allergy reactions can be severe. Flag for users with known sensitivities.",
        "icon":        "🥜",
    },
    "allergen_gluten": {
        "label":       "Gluten-containing foods",
        "daily_limit": 5,
        "unit":        "servings",
        "why":         "Celiac and gluten-sensitive users should monitor intake carefully.",
        "icon":        "🌾",
    },
    "allergen_dairy": {
        "label":       "Dairy-containing foods",
        "daily_limit": 4,
        "unit":        "servings",
        "why":         "Lactose intolerant users risk digestive distress with frequent dairy consumption.",
        "icon":        "🥛",
    },
}

# ── Dangerous additives ───────────────────────────────────────────────────────
# Additive names to watch for in the scan result's adulterants list.
# Matched as case-insensitive substrings.

DANGEROUS_ADDITIVES: dict[str, dict] = {
    "tartrazine": {
        "label":  "Tartrazine (Yellow 5 / E102)",
        "risk":   "Linked to hyperactivity in children and allergic reactions.",
        "severity": "HIGH",
    },
    "sunset yellow": {
        "label":  "Sunset Yellow (E110)",
        "risk":   "May cause hypersensitivity; banned in some countries.",
        "severity": "MEDIUM",
    },
    "rhodamine": {
        "label":  "Rhodamine B",
        "risk":   "Industrial dye, carcinogenic. Commonly found in adulterated chilli powder.",
        "severity": "CRITICAL",
    },
    "lead chromate": {
        "label":  "Lead chromate",
        "risk":   "Heavy metal. Causes neurological damage. Found in adulterated turmeric.",
        "severity": "CRITICAL",
    },
    "metanil yellow": {
        "label":  "Metanil Yellow",
        "risk":   "Non-permitted food dye. Neurotoxic with chronic exposure.",
        "severity": "CRITICAL",
    },
    "msg": {
        "label":  "MSG (Monosodium glutamate)",
        "risk":   "Can cause headaches and flushing in sensitive individuals at high doses.",
        "severity": "LOW",
    },
    "sodium benzoate": {
        "label":  "Sodium Benzoate (E211)",
        "risk":   "Reacts with Vitamin C to form benzene (carcinogen). Common in soft drinks.",
        "severity": "HIGH",
    },
    "potassium bromate": {
        "label":  "Potassium Bromate",
        "risk":   "Probable carcinogen. Illegal in India but still found in some bread.",
        "severity": "CRITICAL",
    },
    "aspartame": {
        "label":  "Aspartame",
        "risk":   "IARC classified as 'possibly carcinogenic' in 2023. Limit to <40mg/kg/day.",
        "severity": "MEDIUM",
    },
    "trans fat": {
        "label":  "Trans fats / partially hydrogenated oil",
        "risk":   "WHO recommends zero trans fat. Strong link to heart disease.",
        "severity": "HIGH",
    },
    "vanaspati": {
        "label":  "Vanaspati / Dalda",
        "risk":   "High trans fat content. Increases LDL cholesterol significantly.",
        "severity": "HIGH",
    },
    "saccharin": {
        "label":  "Saccharin",
        "risk":   "Artificial sweetener; some studies suggest bladder irritation at high doses.",
        "severity": "LOW",
    },
}

# ── Weekly safe threshold (for digest) ────────────────────────────────────────
WEEKLY_LIMITS: dict[str, int] = {
    "sugar":          10,
    "sodium":         12,
    "saturated_fat":  10,
    "caffeine":       18,
    "allergen_nuts":  20,
    "allergen_gluten": 25,
    "allergen_dairy": 20,
}


# ── Core helpers ──────────────────────────────────────────────────────────────

def _classify_food(food_name: str) -> list[str]:
    """Return all matching category keys for a food name."""
    name = food_name.lower().strip()
    matches = []
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            matches.append(category)
    return matches


def _detect_additives(result_json: dict) -> list[dict]:
    """
    Scan result_json.adulterants for dangerous additives.
    Returns a list of additive warning dicts.
    """
    found = []
    adulterants = result_json.get("adulterants", []) or []
    for adulterant in adulterants:
        name_lower = (adulterant.get("name") or "").lower()
        desc_lower = (adulterant.get("description") or "").lower()
        combined = f"{name_lower} {desc_lower}"
        for key, info in DANGEROUS_ADDITIVES.items():
            if key in combined:
                found.append({
                    "additive":     info["label"],
                    "risk":         info["risk"],
                    "severity":     info["severity"],
                    "detected_in":  adulterant.get("name", ""),
                })
                break  # avoid double-flagging the same adulterant
    return found


def _count_today_by_category(
    recent_scans: list[dict],
    today: datetime,
) -> dict[str, int]:
    """
    Count how many scans per category happened today (UTC).
    recent_scans: list of dicts with keys `food_name` and `created_at` (datetime).
    """
    counts: dict[str, int] = defaultdict(int)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    for scan in recent_scans:
        ts = scan.get("created_at")
        if ts and ts >= today_start:
            for cat in _classify_food(scan.get("food_name", "")):
                counts[cat] += 1
    return dict(counts)


# ── Public API ────────────────────────────────────────────────────────────────

def check_overconsumption(
    food_name: str,
    result_json: dict,
    recent_scans: list[dict],
) -> dict:
    """
    Called after every scan.

    Args:
        food_name:    The food the user just scanned.
        result_json:  The full AI scan result (contains adulterants list).
        recent_scans: List of the user's recent ScanRecord dicts
                      [{"food_name": ..., "created_at": datetime}, ...]

    Returns:
        {
          "hasWarnings":    bool,
          "categoryFlags":  [ { category, label, icon, today_count, limit, why } ],
          "additiveFlags":  [ { additive, risk, severity, detected_in } ],
          "overallSeverity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        }
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Category frequency check (today's scans + current scan)
    today_counts = _count_today_by_category(recent_scans, now)
    current_categories = _classify_food(food_name)
    for cat in current_categories:
        today_counts[cat] = today_counts.get(cat, 0) + 1

    category_flags = []
    for cat, count in today_counts.items():
        limit_info = DAILY_LIMITS.get(cat)
        if not limit_info:
            continue
        if count > limit_info["daily_limit"]:
            category_flags.append({
                "category":    cat,
                "label":       limit_info["label"],
                "icon":        limit_info["icon"],
                "today_count": count,
                "limit":       limit_info["daily_limit"],
                "why":         limit_info["why"],
            })

    # 2. Additive detection
    additive_flags = _detect_additives(result_json)

    # 3. Overall severity
    severity = "NONE"
    if additive_flags:
        severities = [f["severity"] for f in additive_flags]
        if "CRITICAL" in severities:
            severity = "CRITICAL"
        elif "HIGH" in severities:
            severity = "HIGH"
        elif "MEDIUM" in severities:
            severity = "MEDIUM"
        else:
            severity = "LOW"
    elif category_flags:
        severity = "MEDIUM"

    return {
        "hasWarnings":     bool(category_flags or additive_flags),
        "categoryFlags":   category_flags,
        "additiveFlags":   additive_flags,
        "overallSeverity": severity,
    }


def build_weekly_digest(scan_records: list[dict]) -> dict:
    """
    Builds a weekly overconsumption digest from 7 days of scans.

    Args:
        scan_records: List of dicts with keys `food_name` and `created_at`.

    Returns:
        {
          "period":      "YYYY-MM-DD to YYYY-MM-DD",
          "totalScans":  int,
          "categories":  { category: { label, icon, count, limit, status, pct } },
          "topWarnings": [ { label, icon, count, limit } ],    # categories over limit
          "safe":        bool,
        }
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    week_start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)

    weekly_counts: dict[str, int] = defaultdict(int)
    for scan in scan_records:
        ts = scan.get("created_at")
        if ts and ts >= week_start:
            for cat in _classify_food(scan.get("food_name", "")):
                weekly_counts[cat] += 1

    categories = {}
    for cat, limit_info in DAILY_LIMITS.items():
        count = weekly_counts.get(cat, 0)
        weekly_limit = WEEKLY_LIMITS.get(cat, limit_info["daily_limit"] * 7)
        pct = round((count / weekly_limit) * 100) if weekly_limit else 0
        if pct > 100:
            status = "over"
        elif pct >= 80:
            status = "approaching"
        else:
            status = "safe"
        categories[cat] = {
            "label":        limit_info["label"],
            "icon":         limit_info["icon"],
            "count":        count,
            "weekly_limit": weekly_limit,
            "status":       status,
            "pct":          min(pct, 100),
            "why":          limit_info["why"],
        }

    top_warnings = [
        {"label": v["label"], "icon": v["icon"], "count": v["count"], "limit": v["weekly_limit"]}
        for v in categories.values()
        if v["status"] == "over"
    ]

    return {
        "period":      f"{week_start.date()} to {now.date()}",
        "totalScans":  len(scan_records),
        "categories":  categories,
        "topWarnings": top_warnings,
        "safe":        len(top_warnings) == 0,
    }