"""
services/ai_service.py  — v4

Key changes from v3:
  - _GROQ_SEMAPHORE is now lazily initialised on first use via _get_semaphore().
    Creating asyncio.Semaphore() at module level (before uvicorn's event loop
    exists) caused a CancelledError during lifespan startup in Python 3.10+.
  - All other behaviour identical to v3.
"""

import asyncio
import json
import logging
import random
import time

import httpx

from app.core.config import settings
from services.rag_service import rag

logger = logging.getLogger(__name__)

# ── Groq configuration ────────────────────────────────────────────────────────
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY   = settings.GROQ_API_KEY
GROQ_MODEL = "llama-3.1-8b-instant"

GROQ_VISION_MODEL_PRIMARY  = "meta-llama/llama-4-scout-17b-16e-instruct"
GROQ_VISION_MODEL_FALLBACK = "meta-llama/llama-4-maverick-17b-128e-instruct"

MAX_RETRIES = 5
BASE_WAIT   = 1.0
MAX_WAIT    = 30.0

# ── Lazy semaphore ────────────────────────────────────────────────────────────
# DO NOT create asyncio.Semaphore at module level — it binds to the event loop
# that exists at import time, which is None before uvicorn starts.
# _get_semaphore() creates it once inside the running loop on first async call.

_GROQ_SEMAPHORE: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _GROQ_SEMAPHORE
    if _GROQ_SEMAPHORE is None:
        _GROQ_SEMAPHORE = asyncio.Semaphore(2)
    return _GROQ_SEMAPHORE


# ── Groq helpers ──────────────────────────────────────────────────────────────

def _jitter(base: float) -> float:
    return random.uniform(0, base)


async def _call_groq(
    system: str,
    user: str,
    max_tokens: int = 1500,
) -> dict:
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json",
    }

    async with _get_semaphore():
        async with httpx.AsyncClient(timeout=30) as client:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    t0   = time.monotonic()
                    resp = await client.post(GROQ_URL, headers=headers, json=payload)

                    if resp.status_code == 429 or resp.status_code >= 500:
                        wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                        logger.warning("Groq %d attempt %d/%d — retry %.1fs",
                                       resp.status_code, attempt, MAX_RETRIES, wait)
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(wait)
                            continue
                        resp.raise_for_status()

                    resp.raise_for_status()
                    elapsed = int((time.monotonic() - t0) * 1000)
                    data    = resp.json()
                    usage   = data.get("usage", {})
                    logger.info("Groq OK: %dms, %d in / %d out tokens",
                                elapsed,
                                usage.get("prompt_tokens", 0),
                                usage.get("completion_tokens", 0))
                    return _parse(data["choices"][0]["message"]["content"])

                except httpx.TimeoutException:
                    wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                    logger.warning("Groq timeout attempt %d/%d, retry %.1fs",
                                   attempt, MAX_RETRIES, wait)
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(wait)
                    else:
                        raise

    raise RuntimeError("Groq _call_groq: exhausted retries")


async def _call_groq_vision(
    system: str,
    user: str,
    image_b64: str,
    media_type: str,
    max_tokens: int = 1800,
) -> dict:
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    img_data_url = (
        image_b64
        if image_b64.startswith("data:")
        else f"data:{media_type};base64,{image_b64}"
    )
    user_content = [
        {"type": "text", "text": user},
        {"type": "image_url", "image_url": {"url": img_data_url, "detail": "auto"}},
    ]
    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json",
    }

    async with _get_semaphore():
        async with httpx.AsyncClient(timeout=60) as client:
            for model in [GROQ_VISION_MODEL_PRIMARY, GROQ_VISION_MODEL_FALLBACK]:
                for attempt in range(1, MAX_RETRIES + 1):
                    try:
                        resp = await client.post(
                            GROQ_URL,
                            headers=headers,
                            json={
                                "model": model,
                                "messages": [
                                    {"role": "system", "content": system},
                                    {"role": "user",   "content": user_content},
                                ],
                                "temperature": 0.2,
                                "max_tokens": max_tokens,
                            },
                        )

                        if resp.status_code in (400, 404):
                            err_msg = resp.json().get("error", {}).get("message", "")
                            logger.warning("Vision model %s returned %d (%s) — trying fallback",
                                           model, resp.status_code, err_msg)
                            break  # try next model

                        if resp.status_code == 429 or resp.status_code >= 500:
                            wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                            logger.warning("Vision %d attempt %d/%d — retry %.1fs",
                                           resp.status_code, attempt, MAX_RETRIES, wait)
                            if attempt < MAX_RETRIES:
                                await asyncio.sleep(wait)
                                continue
                            resp.raise_for_status()

                        resp.raise_for_status()
                        text = resp.json()["choices"][0]["message"]["content"]
                        return _parse(text)

                    except httpx.TimeoutException:
                        wait = _jitter(min(MAX_WAIT, BASE_WAIT * (2 ** (attempt - 1))))
                        logger.warning("Vision timeout attempt %d/%d, retry %.1fs",
                                       attempt, MAX_RETRIES, wait)
                        if attempt < MAX_RETRIES:
                            await asyncio.sleep(wait)
                        else:
                            raise

    raise RuntimeError("All Groq vision models failed after retries")


def _parse(text: str) -> dict:
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


# ── Simple TTL cache ──────────────────────────────────────────────────────────
_cache: dict[str, tuple] = {}

def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    return None

def _cache_set(key: str, value, ttl_seconds: int):
    _cache[key] = (value, time.monotonic() + ttl_seconds)


# ── Text scan (RAG-enhanced) ──────────────────────────────────────────────────

async def scan_food_text(
    food_name: str,
    member_profile: dict | None,
    lang: str = "en",
) -> dict:
    fssai_records = rag.retrieve(food_name, n_results=5)
    fssai_context = rag.format_context(fssai_records)
    has_evidence  = bool(fssai_records)

    evidence_note = (
        "You have been given verified FSSAI violation records above. "
        "Base your adulterant list and severity ratings on this evidence. "
        "If a specific adulterant appears in the records, include it and "
        "mention its documented frequency or state. "
        "Do NOT invent adulterants not supported by the records or well-established food science."
        if has_evidence else
        "No specific FSSAI records were found for this food. "
        "Use established food science and general FSSAI survey knowledge. "
        "Be conservative with severity ratings when citing general knowledge."
    )

    lang_note = (
        "Respond with summary, verdict, and description values in Hindi."   if lang == "hi" else
        "Respond with summary, verdict, and description values in Marathi." if lang == "mr" else ""
    )
    profile_ctx = (
        f"\nUser health profile: {json.dumps(member_profile)}" if member_profile else ""
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

    result = await _call_groq(system, user)
    result["fssaiCitations"] = rag.format_citations(fssai_records)
    result["ragGrounded"]    = has_evidence
    result["marketFakeRate"] = _get_market_rate(food_name)

    if not isinstance(result.get("adulterants"), list):
        result["adulterants"] = []

    return result


# ── Combination risk ──────────────────────────────────────────────────────────

async def scan_combination(
    foods: list[str],
    member_profile: dict | None,
    lang: str = "en",
) -> dict:
    lang_note = (
        "Respond with all text values in Hindi."   if lang == "hi" else
        "Respond with all text values in Marathi." if lang == "mr" else ""
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
    return await _call_groq(system, user, max_tokens=1000)


# ── Symptom reverse lookup ────────────────────────────────────────────────────

async def analyze_symptoms(
    symptoms: str,
    recent_foods: list[str],
    lang: str = "en",
) -> dict:
    lang_note = (
        "Respond with all text values in Hindi."   if lang == "hi" else
        "Respond with all text values in Marathi." if lang == "mr" else ""
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
    return await _call_groq(system, user, max_tokens=1000)


# ── Label image analysis ──────────────────────────────────────────────────────

async def analyze_label_image(
    image_b64: str,
    media_type: str = "image/jpeg",
) -> dict:
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
    {"flag": "specific thing observed", "severity": "HIGH|MEDIUM|LOW", "explanation": "why this is suspicious"}
  ],
  "authenticity_indicators": ["positive sign 1 that suggests genuine product"],
  "summary": "2 sentence safety overview",
  "flaggedIngredients": ["ingredient1"],
  "eNumbers": [{"code": "E102", "name": "Tartrazine", "risk": "MEDIUM", "note": "why risky"}],
  "adulterants": [
    {"name": "adulterant name", "description": "what it is", "healthRisk": "specific impact",
     "severity": "LOW|MEDIUM|HIGH|CRITICAL", "isPersonalRisk": false}
  ],
  "homeTests": [
    {"name": "test name", "steps": "clear step by step instructions",
     "result": "how to interpret result", "difficulty": "Easy|Medium|Hard"}
  ],
  "buyingTips": ["tip1", "tip2"],
  "verdict": "one punchy verdict sentence",
  "cookingWarning": null,
  "personalizedWarning": null
}"""

    try:
        result = await _call_groq_vision(system, user, image_b64, media_type, max_tokens=1800)

        for key in ["homeTests", "adulterants", "visual_red_flags",
                    "authenticity_indicators", "buyingTips", "flaggedIngredients", "eNumbers"]:
            if not isinstance(result.get(key), list):
                result[key] = []

        food_name = (
            result.get("foodName") or result.get("productName") or result.get("brand") or ""
        )
        market_data = (
            _get_market_rate(food_name) if food_name
            else {"rate": 35, "source": "FSSAI general food safety survey", "trend": "unknown"}
        )
        result["marketFakeRate"] = market_data

        ai_raw       = result.get("fake_probability") or (100 - result.get("safetyScore", 50))
        market_boost = round(market_data["rate"] * 0.35)
        boosted_fake = min(95, round(ai_raw * 0.65 + market_boost))

        result["fake_probability"]   = boosted_fake
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


# ── FSSAI report NLP ──────────────────────────────────────────────────────────

async def extract_fssai_violation(raw_text: str) -> dict:
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
    return await _call_groq(system, user, max_tokens=500)