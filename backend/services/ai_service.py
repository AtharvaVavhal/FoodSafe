"""
services/ai_service.py

AI analysis layer for FoodSafe.

Changes from v1:
  - scan_food_text() now retrieves verified FSSAI records via RAG before
    calling the LLM. The model sees real violation evidence, not just its
    training data, so adulterant lists, severities, and home tests are
    grounded in citable sources.
  - Result includes a `fssaiCitations` list so the frontend can show
    source cards beneath the analysis.
  - All other functions (scan_combination, analyze_symptoms,
    analyze_label_image, extract_fssai_violation) are unchanged.

Using Ollama for local LLM inference (privacy-focused, no API costs).
"""

import json
import logging
import time

import httpx

from app.core.config import settings
from services.rag_service import rag

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
OLLAMA_MODEL = settings.OLLAMA_MODEL
OLLAMA_VISION_MODEL = settings.OLLAMA_VISION_MODEL

# Fallback to Groq if Ollama is unavailable
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY = settings.GROQ_API_KEY
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


# ── Ollama helpers ──────────────────────────────────────────────────────────────

def _call_ollama(system: str, user: str, max_tokens: int = 1500, _retries: int = 2, use_vision: bool = False, image_b64: str = None, media_type: str = None) -> dict:
    """Call Ollama LLM with retry + exponential backoff."""
    model = OLLAMA_VISION_MODEL if use_vision else OLLAMA_MODEL

    last_err = None
    for attempt in range(1, _retries + 1):
        try:
            t0 = time.time()

            # Build messages for Ollama
            messages = [{"role": "system", "content": system}]

            if use_vision and image_b64:
                # Ollama vision models expect images in a specific format
                user_content = {
                    "role": "user",
                    "content": user,
                    "images": [image_b64]  # Ollama expects raw base64 without prefix
                }
            else:
                user_content = {"role": "user", "content": user}

            messages.append(user_content)

            response = httpx.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                headers={"Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": max_tokens,
                    },
                },
                timeout=60,  # Ollama can be slower than Groq
            )
            response.raise_for_status()
            elapsed = int((time.time() - t0) * 1000)
            data = response.json()

            logger.info(
                "Ollama call (%s): %dms",
                model,
                elapsed,
            )

            text = data.get("message", {}).get("content", "")
            return _parse(text)
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.ConnectError) as e:
            last_err = e
            logger.warning(
                "Ollama attempt %d/%d failed (%s)",
                attempt, _retries, e,
            )
            # Don't retry Ollama - fall back to Groq instead
            break

    # Fall back to Groq if Ollama fails
    logger.info("Falling back to Groq...")
    if use_vision:
        return _call_groq_vision(system, user, image_b64, media_type, max_tokens)
    return _call_groq(system, user, max_tokens)


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


# ── Groq helpers (fallback) ──────────────────────────────────────────────────────────────

def _call_groq(system: str, user: str, max_tokens: int = 1500, _retries: int = 2) -> dict:
    """Call Groq LLM with retry + exponential backoff (fallback when Ollama unavailable)."""
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    last_err = None
    for attempt in range(1, _retries + 1):
        try:
            t0 = time.time()
            response = httpx.post(
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
            response.raise_for_status()
            elapsed = int((time.time() - t0) * 1000)
            data = response.json()
            usage = data.get("usage", {})
            logger.info(
                "Groq fallback: %dms, %d tokens in / %d tokens out",
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
                    "Groq fallback attempt %d/%d failed (%s), retrying in %ds...",
                    attempt, _retries, e, wait,
                )
                time.sleep(wait)
            else:
                logger.error("Groq fallback failed after %d attempts: %s", _retries, e)
                raise
    raise last_err


def _call_groq_vision(system: str, user: str, image_b64: str, media_type: str, max_tokens: int = 1800, _retries: int = 2) -> dict:
    """Call Groq Vision model (fallback when Ollama vision fails)."""
    if not GROQ_KEY:
        raise RuntimeError("Groq API key not configured")

    last_err = None
    for attempt in range(1, _retries + 1):
        try:
            t0 = time.time()
            response = httpx.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_VISION_MODEL,
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
                    "max_tokens": max_tokens,
                },
                timeout=45,
            )
            response.raise_for_status()
            elapsed = int((time.time() - t0) * 1000)
            logger.info("Groq vision fallback: %dms", elapsed)
            text = response.json()["choices"][0]["message"]["content"]
            return _parse(text)
        except Exception as e:
            last_err = e
            logger.warning("Groq vision fallback attempt %d/%d failed: %s", attempt, _retries, e)
            if attempt < _retries:
                time.sleep(2 ** attempt)
            else:
                raise
    raise last_err


# ── Market adulteration rate data (FSSAI + ICMR surveys) ─────────────────────
# Used as a static fallback when the RAG index has no records for a food.
# These rates calibrate the fake_probability score.
# TODO: move these into the DB and update them from the scraper quarterly.
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
    """Return market adulteration rate for a food item."""
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
    """
    Analyse adulteration risk for a food item by name.

    Flow:
      1. Retrieve top-5 FSSAI violation records from ChromaDB (semantic search)
      2. Format them as a grounding block in the prompt
      3. Call Groq LLaMA with the grounded prompt
      4. Attach citations + market rate to the result dict
    """
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

    # ── 2. Prompt construction ────────────────────────────────────────────────
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

    # ── 3. LLM call ───────────────────────────────────────────────────────────
    result = _call_ollama(system, user, max_tokens=1600)

    # ── 4. Attach citations and market rate ───────────────────────────────────
    result["fssaiCitations"] = rag.format_citations(fssai_records)
    result["ragGrounded"] = has_evidence
    result["marketFakeRate"] = _get_market_rate(food_name)

    # Ensure adulterants is always a list
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
    return _call_ollama(system, user, max_tokens=1000)


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
    return _call_ollama(system, user, max_tokens=1000)


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
        # Try Ollama vision model first
        result = _call_ollama(system, user, max_tokens=1800, use_vision=True, image_b64=image_b64, media_type=media_type)

        # Ensure all list fields are always lists
        for key in [
            "homeTests", "adulterants", "visual_red_flags",
            "authenticity_indicators", "buyingTips",
            "flaggedIngredients", "eNumbers",
        ]:
            if not isinstance(result.get(key), list):
                result[key] = []

        # ── Attach market fake rate + compute boosted fake_probability ────────
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

        # Formula: fake_prob = (AI_raw × 0.65) + (market_rate × 0.35)
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
    return _call_ollama(system, user, max_tokens=500)
