from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.ai_service import _call_groq

router = APIRouter()

class MealPlanRequest(BaseModel):
    plan_type: str = "single"
    member_profile: Optional[dict] = None
    high_risk_foods: list[str] = []

@router.post("/generate")
async def generate_meal_plan(req: MealPlanRequest):
    avoid = ", ".join(req.high_risk_foods[:8]) if req.high_risk_foods else "none"
    profile_ctx = f"Health profile: {req.member_profile}" if req.member_profile else "General healthy adult"

    system = "You are a Maharashtra-based nutritionist and food safety expert. Respond ONLY with valid JSON, no markdown."

    if req.plan_type == "weekly":
        user = f"""Create a safe 7-day Maharashtra meal plan.
{profile_ctx}
Foods to AVOID (high adulteration risk): {avoid}

Return ONLY this JSON:
{{
  "plan_type": "weekly",
  "member": "{req.member_profile.get("name", "You") if req.member_profile else "You"}",
  "days": [
    {{
      "day": "Monday",
      "breakfast": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "lunch": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "dinner": {{"name": "meal name", "items": ["item1", "item2"], "safety_note": "why safe"}},
      "snack": "healthy snack suggestion"
    }}
  ],
  "safety_tips": ["tip1", "tip2", "tip3"],
  "avoided_foods": "{avoid}"
}}
Include all 7 days. Use Maharashtra dishes: poha, misal, varan bhaat, bhakri, solkadhi, thalipeeth, etc."""
    else:
        user = f"""Create a safe single-day Maharashtra meal plan.
{profile_ctx}
Foods to AVOID (high adulteration risk): {avoid}

Return ONLY this JSON:
{{
  "plan_type": "single",
  "member": "{req.member_profile.get("name", "You") if req.member_profile else "You"}",
  "date": "Today",
  "breakfast": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "morning_snack": {{"name": "snack", "items": ["item1"], "safety_note": "why safe"}},
  "lunch": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "evening_snack": {{"name": "snack", "items": ["item1"], "safety_note": "why safe"}},
  "dinner": {{"name": "meal name", "items": ["item1", "item2", "item3"], "safety_note": "why safe", "prep_time": "X mins"}},
  "nutrition_summary": "brief nutritional balance note",
  "safety_tips": ["tip1", "tip2"],
  "avoided_foods": "{avoid}"
}}
Use Maharashtra dishes: poha, misal, varan bhaat, bhakri, solkadhi, thalipeeth, etc."""

    try:
        result = _call_groq(system, user, max_tokens=2000)
        return result
    except Exception as e:
        return {"error": str(e), "plan_type": req.plan_type}
