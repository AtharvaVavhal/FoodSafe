from fastapi import APIRouter
from services.ai_service import _call_groq

router = APIRouter()

@router.get("/all")
async def get_all_brands(search: str = ""):
    food = search.strip() or "common Indian foods"
    system = "You are an Indian food safety expert. Respond ONLY with valid JSON, no markdown."
    user = f"""List safe, FSSAI-verified brands for: "{food}"

Return ONLY this JSON:
{{
  "brands": [
    {{
      "food": "food category name",
      "brand": "brand name",
      "score": 0-100,
      "price": "price range e.g. ₹80-120/100g",
      "fssai": true,
      "why": "one line why this brand is safe"
    }}
  ]
}}

Return 8-12 brands. If the query is generic, cover multiple common Indian food categories (turmeric, milk, ghee, honey, mustard oil, spices, paneer, rice). If the query is specific, return brands only for that food. Only include real, well-known Indian brands."""

    try:
        result = _call_groq(system, user, max_tokens=1200)
        brands = result.get("brands", [])
        return {"brands": brands, "total": len(brands)}
    except Exception as e:
        return {"brands": [], "total": 0, "error": str(e)}

@router.get("/safe")
async def get_safe_brands(food: str = ""):
    return await get_all_brands(search=food)