from fastapi import APIRouter

router = APIRouter()

BRANDS_DB = {
    "turmeric":    [{"brand": "Everest", "score": 88}, {"brand": "MDH", "score": 82}],
    "milk":        [{"brand": "Amul", "score": 91}, {"brand": "Mother Dairy", "score": 89}],
    "honey":       [{"brand": "Dabur", "score": 78}, {"brand": "Patanjali", "score": 74}],
    "ghee":        [{"brand": "Amul", "score": 88}],
    "mustard oil": [{"brand": "Fortune", "score": 85}, {"brand": "Dhara", "score": 83}],
}

@router.get("/safe")
async def get_safe_brands(food: str = ""):
    key = food.lower().strip()
    brands = BRANDS_DB.get(key, [])
    return {"food": food, "brands": brands}