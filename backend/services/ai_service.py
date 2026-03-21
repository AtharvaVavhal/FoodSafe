import anthropic
import json
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
MODEL  = "claude-sonnet-4-20250514"

def _parse(text: str) -> dict:
    clean = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(clean)
    except Exception:
        return {"error": "parse_failed", "raw": text}

# ── Text scan ────────────────────────────────────────────
def scan_food_text(food_name: str, member_profile: dict | None, lang: str = "en") -> dict:
    profile_ctx = f"\nUser health profile: {json.dumps(member_profile)}" if member_profile else ""
    msg = client.messages.create(
        model=MODEL, max_tokens=1500,
        system=f"You are a food safety expert specializing in Indian food adulteration. "
               f"Respond ONLY with valid JSON, no markdown. Output language: {lang}.{profile_ctx}",
        messages=[{"role": "user", "content": f"""Analyze adulteration risk for: "{food_name}"

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
      "isPersonalRisk": true/false
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
}}"""}]
    )
    return _parse(msg.content[0].text)

# ── Combination risk ──────────────────────────────────────
def scan_combination(foods: list[str], member_profile: dict | None) -> dict:
    msg = client.messages.create(
        model=MODEL, max_tokens=1000,
        system="You are a food safety and toxicology expert. Respond ONLY with valid JSON.",
        messages=[{"role": "user", "content": f"""Analyze combined adulteration + toxin exposure for: {', '.join(foods)}
{f"Health profile: {json.dumps(member_profile)}" if member_profile else ""}

Return JSON:
{{
  "combinedRiskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "combinedScore": 0-100,
  "interactions": [{{"foods": ["f1","f2"], "interaction": "...", "severity": "..."}}],
  "dailyExposureWarning": "cumulative toxin note",
  "recommendation": "actionable advice"
}}"""}]
    )
    return _parse(msg.content[0].text)

# ── Symptom reverse lookup ────────────────────────────────
def analyze_symptoms(symptoms: str, recent_foods: list[str]) -> dict:
    msg = client.messages.create(
        model=MODEL, max_tokens=1000,
        system="You are a food safety and public health expert. Respond ONLY with valid JSON.",
        messages=[{"role": "user", "content": f"""Symptoms: "{symptoms}"
Recent foods: {', '.join(recent_foods) if recent_foods else 'unknown'}

Could these be food adulteration related? Return JSON:
{{
  "possibleCauses": [
    {{"adulterant": "name", "food": "likely source", "confidence": "HIGH|MEDIUM|LOW", "explanation": "why"}}
  ],
  "urgency": "MONITOR|CONSULT_DOCTOR|EMERGENCY",
  "recommendation": "what to do now",
  "disclaimer": "always seek professional medical advice"
}}"""}]
    )
    return _parse(msg.content[0].text)

# ── Label image analysis ──────────────────────────────────
def analyze_label_image(image_b64: str, media_type: str = "image/jpeg") -> dict:
    msg = client.messages.create(
        model=MODEL, max_tokens=1500,
        system="You are a food label and ingredient safety expert. Respond ONLY with valid JSON.",
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
            {"type": "text", "text": """Analyze this food label for safety issues. Return JSON:
{
  "productName": "detected name",
  "flaggedIngredients": [{"ingredient":"...","concern":"...","severity":"LOW|MEDIUM|HIGH"}],
  "eNumbers": [{"code":"E-xxx","name":"full name","risk":"LOW|MEDIUM|HIGH","note":"..."}],
  "overallRisk": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "assessment"
}"""}
        ]}]
    )
    return _parse(msg.content[0].text)

# ── FSSAI report NLP ──────────────────────────────────────
def extract_fssai_violation(raw_text: str) -> dict:
    msg = client.messages.create(
        model=MODEL, max_tokens=500,
        system="Extract structured food safety violation data. Respond ONLY with valid JSON.",
        messages=[{"role": "user", "content": f"""Extract from this FSSAI report text:
"{raw_text[:2000]}"

Return JSON:
{{
  "brand": "brand name or null",
  "product": "product name",
  "violation_type": "adulteration|misbranding|substandard|unsafe",
  "adulterant": "specific substance if mentioned",
  "state": "state name",
  "date": "YYYY-MM-DD or null"
}}"""}]
    )
    return _parse(msg.content[0].text)
