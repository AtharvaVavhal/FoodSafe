from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from services.ai_service import _call_groq  # ← fixed: was _call_ollama

router = APIRouter()

# ── Fallback data when AI is unavailable ──
FALLBACK_BRANDS = [
    {"food":"Turmeric","brand":"Everest Turmeric","score":88,"price":"₹80–120/100g","fssai":True,"why":"Third-party heavy metal tested, no lead chromate in lab reports."},
    {"food":"Turmeric","brand":"MDH Turmeric","score":82,"price":"₹70–100/100g","fssai":True,"why":"Good record but flagged for pesticide residue in EU exports."},
    {"food":"Turmeric","brand":"Catch Turmeric","score":79,"price":"₹60–90/100g","fssai":True,"why":"Budget-friendly, passes FSSAI testing."},
    {"food":"Milk","brand":"Amul Milk","score":91,"price":"₹56–72/L","fssai":True,"why":"Largest cooperative, tested for urea & detergent."},
    {"food":"Milk","brand":"Mother Dairy Milk","score":89,"price":"₹54–70/L","fssai":True,"why":"State-monitored quality labs."},
    {"food":"Milk","brand":"Nandini Milk","score":86,"price":"₹52–68/L","fssai":True,"why":"Karnataka cooperative, low adulteration reports."},
    {"food":"Honey","brand":"Dabur Honey","score":78,"price":"₹180–250/500g","fssai":True,"why":"Fails NMR test in some batches."},
    {"food":"Honey","brand":"24 Mantra Organic","score":88,"price":"₹300–400/500g","fssai":True,"why":"Organic certified, NMR tested."},
    {"food":"Ghee","brand":"Amul Ghee","score":88,"price":"₹550–650/500g","fssai":True,"why":"High butyric acid, no vanaspati detected."},
    {"food":"Ghee","brand":"Patanjali Ghee","score":80,"price":"₹400–500/500g","fssai":True,"why":"Lower price, some batches show vegetable fat."},
    {"food":"Mustard Oil","brand":"Fortune Mustard Oil","score":85,"price":"₹120–160/L","fssai":True,"why":"No argemone oil detected in spot checks."},
    {"food":"Mustard Oil","brand":"Dhara Mustard Oil","score":83,"price":"₹110–150/L","fssai":True,"why":"Government-backed cooperative, consistent purity."},
    {"food":"Chilli Powder","brand":"Everest Chilli","score":85,"price":"₹60–90/100g","fssai":True,"why":"No Sudan Red dye in tested batches."},
    {"food":"Paneer","brand":"Amul Paneer","score":87,"price":"₹85–110/200g","fssai":True,"why":"No starch, fat content verified."},
    {"food":"Paneer","brand":"Mother Dairy Paneer","score":84,"price":"₹80–105/200g","fssai":True,"why":"Fresh, passes iodine starch test."},
    {"food":"Rice","brand":"India Gate Basmati","score":90,"price":"₹120–180/kg","fssai":True,"why":"Low pesticide residue, no artificial polishing."},
    {"food":"Rice","brand":"Daawat Basmati","score":87,"price":"₹110–160/kg","fssai":True,"why":"No plastic rice detected, good grain quality."},
]

# ── Get brands list (AI-powered with fallback) ──
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
      "why": "one line why this brand is safe or not"
    }}
  ]
}}

Return 10-16 brands across multiple food categories (turmeric, milk, ghee, honey, mustard oil, chilli powder, paneer, rice, atta, tea). If the query is specific, return 4-6 brands only for that food. Only include real, well-known Indian brands. Vary scores realistically (70-95)."""

    try:
        result = _call_groq(system, user, max_tokens=1500)  # ← fixed
        brands = result.get("brands", [])
        if len(brands) >= 3:
            return {"brands": brands, "total": len(brands), "source": "ai"}
    except Exception:
        pass

    # Fallback to curated data
    if search.strip():
        filtered = [b for b in FALLBACK_BRANDS if search.lower() in b["food"].lower()]
        return {"brands": filtered or FALLBACK_BRANDS, "total": len(filtered or FALLBACK_BRANDS), "source": "fallback"}
    return {"brands": FALLBACK_BRANDS, "total": len(FALLBACK_BRANDS), "source": "fallback"}


# ── Compare brands (AI-powered) ──
class CompareRequest(BaseModel):
    brands: List[str]
    food_category: str = ""

@router.post("/compare")
async def compare_brands(req: CompareRequest):
    brand_list = ", ".join(req.brands)
    category = req.food_category or "food"

    system = "You are an Indian food safety expert. Respond ONLY with valid JSON, no markdown."
    user = f"""Compare these {category} brands: {brand_list}

Return ONLY this JSON:
{{
  "comparison": [
    {{
      "brand": "brand name",
      "score": 70-95,
      "price": "₹price range",
      "fssai": true,
      "why": "2 sentences about safety, quality, and lab test results",
      "adulterants": ["common adulterant 1", "common adulterant 2", "common adulterant 3"],
      "home_test": "brief home test instruction for this food type",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1"]
    }}
  ],
  "winner": "brand name with highest safety",
  "category_risk": "LOW or MEDIUM or HIGH - overall risk for this food category",
  "tip": "one buying tip for this food category"
}}

Only use real data about these actual Indian brands. Be honest about quality issues. Scores must differ between brands."""

    try:
        result = _call_groq(system, user, max_tokens=1500)  # ← fixed
        return {"data": result, "source": "ai"}
    except Exception as e:
        basic = []
        for name in req.brands:
            match = next((b for b in FALLBACK_BRANDS if b["brand"].lower().startswith(name.lower()[:8])), None)
            if match:
                basic.append({**match, "adulterants": [], "home_test": "", "pros": [], "cons": []})
            else:
                basic.append({"brand": name, "score": 80, "price": "N/A", "fssai": True, "why": "Data unavailable", "adulterants": [], "home_test": "", "pros": [], "cons": []})
        return {
            "data": {"comparison": basic, "winner": basic[0]["brand"] if basic else "", "category_risk": "MEDIUM", "tip": "Always check for FSSAI mark on packaging."},
            "source": "fallback",
            "error": str(e)
        }

@router.get("/safe")
async def get_safe_brands(food: str = ""):
    return await get_all_brands(search=food)