import json
import httpx
from app.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY = settings.GROQ_API_KEY
MODEL = "llama-3.1-8b-instant"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def _call_groq(system: str, user: str, max_tokens: int = 1500) -> dict:
    response = httpx.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    response.raise_for_status()
    text = response.json()["choices"][0]["message"]["content"]
    return _parse(text)


def _parse(text: str) -> dict:
    clean = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(clean)
    except Exception:
        return {"error": "parse_failed", "raw": text}


# ── Market adulteration rate data (FSSAI + ICMR surveys) ─────────────────────
# Higher rate = more adulteration in market = higher fake probability boost
_MARKET_FAKE_RATES = {
    "turmeric":        {"rate": 68, "source": "FSSAI 2023 survey — 1538 samples", "trend": "rising"},
    "turmeric powder": {"rate": 68, "source": "FSSAI 2023 survey — 1538 samples", "trend": "rising"},
    "chilli powder":   {"rate": 54, "source": "FSSAI random sampling report 2023", "trend": "stable"},
    "chilli":          {"rate": 54, "source": "FSSAI random sampling report 2023", "trend": "stable"},
    "milk":            {"rate": 38, "source": "FSSAI national milk survey 2022",   "trend": "falling"},
    "honey":           {"rate": 77, "source": "CSE NMR test study 2021 — 13 brands", "trend": "rising"},
    "ghee":            {"rate": 41, "source": "FSSAI dairy survey 2023",           "trend": "stable"},
    "mustard oil":     {"rate": 62, "source": "ICMR cooking oil study 2022",       "trend": "rising"},
    "paneer":          {"rate": 48, "source": "FSSAI dairy panel 2023",            "trend": "stable"},
    "dal":             {"rate": 31, "source": "FSSAI pulse survey 2022",           "trend": "stable"},
    "rice":            {"rate": 22, "source": "FSSAI grain survey 2022",           "trend": "stable"},
    "wheat flour":     {"rate": 36, "source": "FSSAI flour survey 2023",           "trend": "stable"},
    "spices":          {"rate": 55, "source": "FSSAI spice report 2023",           "trend": "rising"},
    "edible oil":      {"rate": 47, "source": "ICMR oil survey 2022",             "trend": "stable"},
}

def _get_market_rate(food_name: str) -> dict:
    """Return market adulteration rate for a food item."""
    key = food_name.lower().strip().replace("-", " ").replace("_", " ")
    if key in _MARKET_FAKE_RATES:
        return _MARKET_FAKE_RATES[key]
    for k, v in _MARKET_FAKE_RATES.items():
        if k in key or key in k:
            return v
    return {"rate": 35, "source": "FSSAI general food safety survey", "trend": "unknown"}


# ── Text scan ────────────────────────────────────────────
def scan_food_text(food_name: str, member_profile: dict | None, lang: str = "en") -> dict:
    lang_note = "Respond with values in Hindi." if lang == "hi" else "Respond with values in Marathi." if lang == "mr" else ""
    profile_ctx = f"\nUser health profile: {json.dumps(member_profile)}" if member_profile else ""
    system = f"You are a food safety expert specializing in Indian food adulteration. Respond ONLY with valid JSON, no markdown. {lang_note}"
    user = f"""{profile_ctx}
Analyze adulteration risk for: "{food_name}"

Return ONLY this JSON structure:
{{
  "foodName": "cleaned name",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "summary": "2 sentence overview",
  "cookingWarning": null or "heating risk if applicable",
  "personalizedWarning": null or "warning for health profile",
  "adulterants": [
    {{
      "name": "adulterant name",
      "description": "what it is, why added",
      "healthRisk": "specific impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "isPersonalRisk": true or false
    }}
  ],
  "homeTests": [
    {{
      "name": "test name",
      "steps": "step by step instructions",
      "result": "positive/negative interpretation",
      "difficulty": "Easy|Medium|Hard"
    }}
  ],
  "buyingTips": ["tip1", "tip2", "tip3"],
  "verdict": "one punchy verdict sentence"
}}"""
    return _call_groq(system, user, max_tokens=1500)


# ── Combination risk ──────────────────────────────────────
def scan_combination(foods: list[str], member_profile: dict | None) -> dict:
    system = "You are a food safety and toxicology expert. Respond ONLY with valid JSON, no markdown."
    user = f"""Analyze combined adulteration + toxin exposure for: {', '.join(foods)}
{f"Health profile: {json.dumps(member_profile)}" if member_profile else ""}

Return ONLY this JSON:
{{
  "combinedRiskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "combinedScore": 0-100,
  "interactions": [{{"foods": ["f1","f2"], "interaction": "...", "severity": "..."}}],
  "dailyExposureWarning": "cumulative toxin note",
  "recommendation": "actionable advice"
}}"""
    return _call_groq(system, user, max_tokens=1000)


# ── Symptom reverse lookup ────────────────────────────────
def analyze_symptoms(symptoms: str, recent_foods: list[str]) -> dict:
    system = "You are a food safety and public health expert. Respond ONLY with valid JSON, no markdown."
    user = f"""Symptoms: "{symptoms}"
Recent foods: {', '.join(recent_foods) if recent_foods else 'unknown'}

Could these be food adulteration related? Return ONLY this JSON:
{{
  "possibleCauses": [
    {{"adulterant": "name", "food": "likely source", "confidence": "HIGH|MEDIUM|LOW", "explanation": "why"}}
  ],
  "urgency": "MONITOR|CONSULT_DOCTOR|EMERGENCY",
  "recommendation": "what to do now",
  "disclaimer": "always seek professional medical advice"
}}"""
    return _call_groq(system, user, max_tokens=1000)


# ── Label image analysis ──────────────────────────────────
def analyze_label_image(image_b64: str, media_type: str = "image/jpeg") -> dict:
    system = "You are a forensic food safety expert specializing in Indian food adulteration and product counterfeiting detection. Respond ONLY with valid JSON, no markdown."
    user = """Analyze this food product image carefully for authenticity and adulteration signs.

Look for:
- Label quality: blurry text, misaligned printing, spelling errors, colour inconsistency
- Packaging: unusual texture, poor seal, inconsistent colour batches
- Visual product cues: unnatural colour intensity, texture anomalies vs genuine product
- Brand verification: correct logo placement, FSSAI number, batch code, MFG/EXP date presence

Return ONLY this JSON:
{
  "foodName": "product name from label",
  "productName": "product name from label",
  "brand": "brand name if visible, else null",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "authenticity_score": 0-100,
  "fake_probability": 0-100,
  "visual_red_flags": [
    {
      "flag": "specific thing observed",
      "severity": "HIGH|MEDIUM|LOW",
      "explanation": "why this is suspicious"
    }
  ],
  "authenticity_indicators": [
    "positive sign 1 that suggests genuine product"
  ],
  "summary": "2 sentence safety overview",
  "flaggedIngredients": ["ingredient1"],
  "eNumbers": [
    {"code": "E102", "name": "Tartrazine", "risk": "MEDIUM", "note": "why risky"}
  ],
  "adulterants": [
    {
      "name": "adulterant name",
      "description": "what it is",
      "healthRisk": "specific impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "isPersonalRisk": false
    }
  ],
  "homeTests": [
    {
      "name": "test name relevant to this product",
      "steps": "clear step by step home test instructions",
      "result": "how to interpret positive vs negative result",
      "difficulty": "Easy|Medium|Hard"
    }
  ],
  "buyingTips": ["tip1", "tip2"],
  "verdict": "one punchy verdict sentence",
  "cookingWarning": null,
  "personalizedWarning": null
}"""

    try:
        response = httpx.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
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
                                    "url": f"data:{media_type};base64,{image_b64}"
                                },
                            },
                            {"type": "text", "text": user},
                        ],
                    },
                ],
                "temperature": 0.2,
                "max_tokens": 1800,
            },
            timeout=45,
        )
        response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"]
        result = _parse(text)

        # Ensure all list fields are always lists
        for key in ["homeTests", "adulterants", "visual_red_flags",
                    "authenticity_indicators", "buyingTips",
                    "flaggedIngredients", "eNumbers"]:
            if not isinstance(result.get(key), list):
                result[key] = []

        # ── Attach market fake rate + compute boosted fake_probability ────────
        food_name = (
            result.get("foodName")
            or result.get("productName")
            or result.get("brand")
            or ""
        )
        market_data = _get_market_rate(food_name) if food_name else \
                      {"rate": 35, "source": "FSSAI general food safety survey", "trend": "unknown"}
        result["marketFakeRate"] = market_data

        # Formula: fake_prob = (AI_raw × 0.65) + (market_rate × 0.35)
        # High market adulteration rate boosts fake probability score
        ai_raw = result.get("fake_probability") or (100 - result.get("safetyScore", 50))
        market_boost = round(market_data["rate"] * 0.35)
        boosted_fake = min(95, round(ai_raw * 0.65 + market_boost))

        result["fake_probability"] = boosted_fake
        result["authenticity_score"] = 100 - boosted_fake
        result["scoreBreakdown"] = {
            "ai_visual_score":    round(100 - ai_raw),
            "market_rate":        market_data["rate"],
            "market_boost":       market_boost,
            "final_fake_prob":    boosted_fake,
        }

        return result

    except Exception as e:
        return {
            "foodName": "Unknown — vision failed",
            "productName": "Unknown",
            "brand": None,
            "riskLevel": "MEDIUM",
            "safetyScore": 50,
            "authenticity_score": 50,
            "fake_probability": 50,
            "visual_red_flags": [],
            "authenticity_indicators": [],
            "marketFakeRate": {"rate": 35, "source": "General estimate", "trend": "unknown"},
            "scoreBreakdown": {"ai_visual_score": 50, "market_rate": 35, "market_boost": 12, "final_fake_prob": 50},
            "summary": "Could not analyze image. Please type the food name manually.",
            "flaggedIngredients": [],
            "eNumbers": [],
            "adulterants": [],
            "homeTests": [],
            "buyingTips": [],
            "verdict": "Manual check recommended.",
            "cookingWarning": None,
            "personalizedWarning": None,
            "error": str(e),
        }


# ── FSSAI report NLP ──────────────────────────────────────
def extract_fssai_violation(raw_text: str) -> dict:
    system = "Extract structured food safety violation data. Respond ONLY with valid JSON, no markdown."
    user = f"""Extract from this FSSAI report text:
"{raw_text[:2000]}"

Return ONLY this JSON:
{{
  "brand": "brand name or null",
  "product": "product name",
  "violation_type": "adulteration|misbranding|substandard|unsafe",
  "adulterant": "specific substance if mentioned",
  "state": "state name",
  "date": "YYYY-MM-DD or null"
}}"""
    return _call_groq(system, user, max_tokens=500)