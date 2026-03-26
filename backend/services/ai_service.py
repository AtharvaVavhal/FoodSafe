"""
services/ai_service.py

AI analysis layer for FoodSafe.

Changes from v2:
  - FIXED: Vision model updated from deprecated `llava-v1.5-7b-4096-preview`
    to `meta-llama/llama-4-scout-17b-16e-instruct` (Groq's current vision model).
    Fallback: `meta-llama/llama-4-maverick-17b-128e-instruct`.
  - FIXED: Vision message content order — text prompt now comes BEFORE the
    image_url block (LLaMA vision requirement).
  - FIXED: `image_url` key uses `url` subkey correctly per Groq spec.
  - FIXED: Added `detail: "auto"` hint to image_url block for better accuracy.
  - FIXED: 400 status code now also triggers model fallback (deprecated models
    return 400, not 404).
  - scan_food_text() retrieves verified FSSAI records via RAG before calling
    the LLM. Result includes `fssaiCitations`.
  - All other functions (scan_combination, analyze_symptoms,
    analyze_label_image, extract_fssai_violation) are unchanged in contract.
"""

import json
import logging
import time

import httpx

from app.core.config import settings
from services.rag_service import rag

logger = logging.getLogger(__name__)

# ── Groq configuration ────────────────────────────────────────────────────────
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY = settings.GROQ_API_KEY
GROQ_MODEL = "llama-3.1-8b-instant"

# FIX: Updated from deprecated llama-3.2-11b/90b-vision-preview
# Primary: Llama 4 Scout (best vision on Groq as of 2025)
# Fallback: Llama 4 Maverick
GROQ_VISION_MODEL_PRIMARY  = "meta-llama/llama-4-scout-17b-16e-instruct"
GROQ_VISION_MODEL_FALLBACK = "meta-llama/llama-4-maverick-17b-128e-instruct"


# ── Groq helpers ───────────────────────────────────────────────────────────────

def _call_groq(system: str, user: str, max_tokens: int = 1500, _retries: int = 2) -> dict:
    """Call Groq LLM with retry + exponential backoff."""
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    last_err = None
    for attempt in range(1, _retries + 1):
        try:
            t0 = time.time()
            resp = httpx.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    "temperature": 0.3,
                    "max_tokens": max_tokens,
                },
                timeout=30,
            )
            resp.raise_for_status()
            elapsed = int((time.time() - t0) * 1000)
            data = resp.json()
            usage = data.get("usage", {})
            logger.info(
                "Groq: %dms, %d tokens in / %d tokens out",
                elapsed,
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
            )
            text = data["choices"][0]["message"]["content"]
            return _parse(text)
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
            last_err = e
            if attempt < _retries:
                wait = 2 ** attempt
                logger.warning(
                    "Groq attempt %d/%d failed (%s), retrying in %ds...",
                    attempt, _retries, e, wait,
                )
                time.sleep(wait)
            else:
                logger.error("Groq failed after %d attempts: %s", _retries, e)
                raise
    raise last_err


def _call_groq_vision(
    system: str,
    user: str,
    image_b64: str,
    media_type: str,
    max_tokens: int = 1800,
    _retries: int = 2,
) -> dict:
    """
    Call Groq vision model.

    FIX 1: Use the current Groq vision model (Llama 4 Scout), falling back to
            Llama 4 Maverick if the primary returns 400/404.
    FIX 2: Content order is text THEN image_url — LLaMA vision models require
            the text prompt to appear before the image block.
    FIX 3: image_url value is a dict with a `url` key (Groq/OpenAI spec).
    FIX 4: Both 400 and 404 trigger fallback — deprecated models return 400.
    """
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    img_data_url = (
        image_b64
        if image_b64.startswith("data:")
        else f"data:{media_type};base64,{image_b64}"
    )

    # FIX 2: text block FIRST, image_url block SECOND
    user_content = [
        {"type": "text", "text": user},
        {
            "type": "image_url",
            # FIX 3: correct dict shape expected by Groq
            "image_url": {
                "url": img_data_url,
                "detail": "auto",   # FIX: hint for resolution selection
            },
        },
    ]

    models_to_try = [GROQ_VISION_MODEL_PRIMARY, GROQ_VISION_MODEL_FALLBACK]

    for model in models_to_try:
        last_err = None
        for attempt in range(1, _retries + 1):
            try:
                t0 = time.time()
                resp = httpx.post(
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {GROQ_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user",   "content": user_content},
                        ],
                        "temperature": 0.2,
                        "max_tokens": max_tokens,
                    },
                    timeout=60,
                )

                # FIX 4: treat both 400 and 404 as "model unavailable" → try next model
                if resp.status_code in (400, 404):
                    err_body = resp.json().get("error", {})
                    logger.warning(
                        "Vision model %s returned %d (%s), trying fallback...",
                        model,
                        resp.status_code,
                        err_body.get("message", "no message"),
                    )
                    break   # break attempt loop → try next model

                resp.raise_for_status()
                elapsed = int((time.time() - t0) * 1000)
                logger.info("Groq vision (%s): %dms", model, elapsed)
                text = resp.json()["choices"][0]["message"]["content"]
                return _parse(text)

            except httpx.TimeoutException as e:
                last_err = e
                if attempt < _retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "Vision attempt %d/%d timed out, retry in %ds", attempt, _retries, wait
                    )
                    time.sleep(wait)
                else:
                    logger.error("Vision timed out after %d attempts with model %s", _retries, model)
            except httpx.HTTPStatusError as e:
                last_err = e
                logger.error("Vision HTTP error with model %s: %s", model, e)
                break  # non-timeout HTTP error → try next model

    # All models failed
    raise RuntimeError(
        f"All Groq vision models failed. Last error: {last_err}"
    )


def _parse(text: str) -> dict:
    """Parse JSON response from LLM, handling markdown code blocks."""
    clean = (
        text.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    try:
        return json.loads(clean)
    except Exception:
        return {"error": "parse_failed", "raw": text}


# ── Market adulteration rate data (FSSAI + ICMR surveys) ─────────────────────
_MARKET_FAKE_RATES: dict[str, dict] = {
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
    key = food_name.lower().strip().replace("-", " ").replace("_", " ")
    if key in _MARKET_FAKE_RATES:
        return _MARKET_FAKE_RATES[key]
    for k, v in _MARKET_FAKE_RATES.items():
        if k in key or key in k:
            return v
    return {"rate": 35, "source": "FSSAI general food safety survey", "trend": "unknown"}


# ── Text scan (RAG-enhanced) ──────────────────────────────────────────────────

def scan_food_text(
    food_name: str,
    member_profile: dict | None,
    lang: str = "en",
) -> dict:
    # ── 1. RAG retrieval ──────────────────────────────────────────────────────
    fssai_records = rag.retrieve(food_name, n_results=5)
    fssai_context = rag.format_context(fssai_records)

    has_evidence = bool(fssai_records)
    evidence_note = (
        "You have been given verified FSSAI violation records above. "
        "Base your adulterant list and severity ratings on this evidence. "
        "If a specific adulterant appears in the records, include it and "
        "mention its documented frequency or state. "
        "Do NOT invent adulterants not supported by the records or well-established food science."
        if has_evidence
        else
        "No specific FSSAI records were found for this food. "
        "Use established food science and general FSSAI survey knowledge. "
        "Be conservative with severity ratings when citing general knowledge."
    )

    lang_note = (
        "Respond with summary, verdict, and description values in Hindi."
        if lang == "hi"
        else "Respond with summary, verdict, and description values in Marathi."
        if lang == "mr"
        else ""
    )
    profile_ctx = (
        f"\nUser health profile: {json.dumps(member_profile)}"
        if member_profile
        else ""
    )

    system = (
        f"You are a food safety expert specialising in Indian food adulteration. "
        f"Respond ONLY with valid JSON, no markdown. {lang_note}"
    )

    user = f"""{fssai_context}
{evidence_note}
{profile_ctx}

Analyse adulteration risk for: "{food_name}"

Return ONLY this JSON structure:
{{
  "foodName": "cleaned name",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "safetyScore": 0-100,
  "summary": "2 sentence overview — reference specific FSSAI evidence if available",
  "cookingWarning": null or "heating risk if applicable",
  "personalizedWarning": null or "warning for health profile",
  "adulterants": [
    {{
      "name": "adulterant name",
      "description": "what it is, why added",
      "healthRisk": "specific impact",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "isPersonalRisk": true or false,
      "evidenceBased": true if from FSSAI records above, false if general knowledge
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

    result = _call_groq(system, user)
    result["fssaiCitations"] = rag.format_citations(fssai_records)
    result["ragGrounded"] = has_evidence
    result["marketFakeRate"] = _get_market_rate(food_name)

    if not isinstance(result.get("adulterants"), list):
        result["adulterants"] = []

    return result


# ── Combination risk ───────────────────────────────────────────────────────────

def scan_combination(foods: list[str], member_profile: dict | None, lang: str = "en") -> dict:
    lang_note = (
        "Respond with all text values in Hindi."
        if lang == "hi"
        else "Respond with all text values in Marathi."
        if lang == "mr"
        else ""
    )
    system = f"You are a food safety and toxicology expert. Respond ONLY with valid JSON, no markdown. {lang_note}"
    user = f"""Analyse combined adulteration + toxin exposure for: {', '.join(foods)}
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


# ── Symptom reverse lookup ─────────────────────────────────────────────────────

def analyze_symptoms(symptoms: str, recent_foods: list[str], lang: str = "en") -> dict:
    lang_note = (
        "Respond with all text values in Hindi."
        if lang == "hi"
        else "Respond with all text values in Marathi."
        if lang == "mr"
        else ""
    )
    system = f"You are a food safety and public health expert. Respond ONLY with valid JSON, no markdown. {lang_note}"
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


# ── Label image analysis ───────────────────────────────────────────────────────

def analyze_label_image(image_b64: str, media_type: str = "image/jpeg") -> dict:
    system = (
        "You are a forensic food safety expert specialising in Indian food adulteration "
        "and product counterfeiting detection. Respond ONLY with valid JSON, no markdown."
    )
    user = """Analyse this food product image carefully for authenticity and adulteration signs.

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
        result = _call_groq_vision(system, user, image_b64, media_type, max_tokens=1800)

        for key in [
            "homeTests", "adulterants", "visual_red_flags",
            "authenticity_indicators", "buyingTips",
            "flaggedIngredients", "eNumbers",
        ]:
            if not isinstance(result.get(key), list):
                result[key] = []

        food_name = (
            result.get("foodName")
            or result.get("productName")
            or result.get("brand")
            or ""
        )
        market_data = (
            _get_market_rate(food_name)
            if food_name
            else {"rate": 35, "source": "FSSAI general food safety survey", "trend": "unknown"}
        )
        result["marketFakeRate"] = market_data

        ai_raw = result.get("fake_probability") or (100 - result.get("safetyScore", 50))
        market_boost = round(market_data["rate"] * 0.35)
        boosted_fake = min(95, round(ai_raw * 0.65 + market_boost))

        result["fake_probability"] = boosted_fake
        result["authenticity_score"] = 100 - boosted_fake
        result["scoreBreakdown"] = {
            "ai_visual_score": round(100 - ai_raw),
            "market_rate":     market_data["rate"],
            "market_boost":    market_boost,
            "final_fake_prob": boosted_fake,
        }

        return result

    except Exception as e:
        logger.exception("Vision analysis failed")
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
            "summary": "Could not analyse image. Please type the food name manually.",
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


# ── FSSAI report NLP ───────────────────────────────────────────────────────────

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