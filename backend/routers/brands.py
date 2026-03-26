"""
routers/brands.py  — v2

Key changes from v1:
  - enrich_brands_with_groq / generate_brands_for_food / get_indian_food_categories
    are now async — they call the async _call_groq directly instead of being
    wrapped in asyncio.to_thread().
  - TTL cache on GET /brands/all:
      • categories list cached for 1 hour (rarely changes)
      • per-food brand lists cached for 30 minutes
    This prevents the repeated polling from the frontend hammering Groq on
    every page load.
  - asyncio.gather still used for parallel OFF fetch + Groq brand generation
    on search queries, but now both coroutines are truly async.
"""

import asyncio

import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from services.ai_service import _call_groq, _cache_get, _cache_set

router = APIRouter()

# Cache TTLs (seconds)
_TTL_CATEGORIES = 3600   # 1 hour
_TTL_BRANDS     = 1800   # 30 minutes


# ── Open Food Facts lookup ────────────────────────────────────────────────────

async def fetch_off_brands(food_query: str) -> list:
    """Fetch real brand data from Open Food Facts API for Indian market."""
    try:
        url = "https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            "search_terms": food_query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 30,
            "countries_tags": "india",
            "fields": "product_name,brands,nutriscore_grade,labels_tags,categories_tags,quantity,stores",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params=params)
            data = r.json()

        brands_seen = set()
        results = []
        for p in data.get("products", []):
            brand = (p.get("brands") or "").split(",")[0].strip()
            name  = p.get("product_name", "").strip()
            if not brand or brand in brands_seen or len(brand) > 60:
                continue
            brands_seen.add(brand)
            nutri  = p.get("nutriscore_grade", "")
            labels = p.get("labels_tags", [])
            fssai  = any("fssai" in l.lower() for l in labels)
            results.append({
                "food":   food_query.title(),
                "brand":  brand,
                "name":   name,
                "nutri":  nutri.upper() if nutri else "N/A",
                "fssai":  fssai,
                "source": "openfoodfacts",
            })
            if len(results) >= 10:
                break
        return results
    except Exception:
        return []


# ── Groq: enrich brand list with safety scores ────────────────────────────────

async def enrich_brands_with_groq(food: str, brand_names: list) -> list:
    """Ask Groq to score and explain each brand for Indian food safety context."""
    if not brand_names:
        return []

    cache_key = f"enrich:{food.lower()}:{','.join(sorted(brand_names)).lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    brands_str = ", ".join(brand_names)
    system = (
        "You are an Indian food safety expert with deep knowledge of FSSAI regulations, "
        "CSE lab studies, adulteration patterns, and documented brand quality issues in India. "
        "Respond ONLY with valid JSON. No markdown, no extra text."
    )
    user = f"""For the food category "{food}", evaluate these brands available in India: {brands_str}

For EACH brand return real, documented safety data. Use actual FSSAI reports, CSE studies, lab findings.
If a brand has known issues (e.g. CSE 2020 honey study, EU export recalls, Maharashtra FSSAI surveys), mention them.
For unbranded/local options, reflect the actual adulteration risk documented in government surveys.

Return ONLY this JSON:
{{
  "brands": [
    {{
      "food": "{food}",
      "brand": "exact brand name",
      "score": <integer 20-95 based on actual safety record>,
      "price": "<realistic Indian market price range e.g. ₹80-120/100g>",
      "fssai": <true if FSSAI licensed, false otherwise>,
      "why": "<2 sentences: cite specific lab findings, FSSAI history, or adulteration reports for this exact brand>"
    }}
  ]
}}

Rules:
- Scores must differ realistically — a brand with documented issues scores lower
- Price must be current Indian retail price in ₹
- If you have no specific data for a brand, give a conservative score (60-70) and say so
- Do not invent data — only use documented facts
- Local/unbranded always scores lower due to documented adulteration risk"""

    try:
        result = await _call_groq(system, user, max_tokens=2000)
        brands = result.get("brands", [])
        _cache_set(cache_key, brands, _TTL_BRANDS)
        return brands
    except Exception:
        return []


# ── Groq: generate full brand list for a food category ───────────────────────

async def generate_brands_for_food(food: str) -> list:
    """Ask Groq to list real Indian brands for a food category with safety data."""
    cache_key = f"brands:{food.lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    system = (
        "You are an Indian food safety expert. "
        "Respond ONLY with valid JSON. No markdown, no preamble."
    )
    user = f"""List all major Indian brands and products for "{food}" sold in India.
Include: top national brands, cooperative brands, regional brands, and a local/unbranded option.

Use REAL documented safety data from FSSAI reports, CSE lab studies, and government surveys.

Return ONLY this JSON:
{{
  "brands": [
    {{
      "food": "{food}",
      "brand": "<real brand name sold in India>",
      "score": <integer 20-95 based on actual documented safety record>,
      "price": "<current Indian retail price e.g. ₹80-120/100g>",
      "fssai": <true or false>,
      "why": "<2 sentences citing specific real lab findings, FSSAI history, or adulteration data for this brand>"
    }}
  ]
}}

Include 5-8 brands. Be honest — if a brand has documented issues (pesticide residues, adulteration, recalls), reflect that in the score and why.
Local/unbranded options should reflect actual documented adulteration risk from government surveys."""

    try:
        result = await _call_groq(system, user, max_tokens=2000)
        brands = result.get("brands", [])
        _cache_set(cache_key, brands, _TTL_BRANDS)
        return brands
    except Exception:
        return []


# ── Groq: get food categories popular in India ────────────────────────────────

async def get_indian_food_categories() -> list:
    """Ask Groq for commonly adulterated/consumed food categories in India."""
    cache_key = "categories:india"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    system = "You are an Indian food safety expert. Respond ONLY with valid JSON."
    user = """List the 15 most commonly purchased and frequently adulterated food categories 
in Indian households, based on FSSAI annual reports and CSE studies.

Return ONLY:
{
  "categories": ["category1", "category2", ...]
}

Use simple, common names (e.g. "Turmeric", "Milk", "Honey", "Ghee", "Mustard Oil").
Order by frequency of adulteration reports in India."""

    try:
        result = await _call_groq(system, user, max_tokens=500)
        cats = result.get("categories", [])
        _cache_set(cache_key, cats, _TTL_CATEGORIES)
        return cats
    except Exception:
        return []


# ── GET /brands/all ───────────────────────────────────────────────────────────

@router.get("/all")
async def get_all_brands(search: str = ""):
    search = search.strip()

    if search:
        # 1. Fetch OFF data and Groq-generated brands in parallel
        off_data, groq_generated = await asyncio.gather(
            fetch_off_brands(search),
            generate_brands_for_food(search),
        )
        off_brand_names = [b["brand"] for b in off_data]

        # 2. Enrich OFF brands (skipped if OFF returned nothing)
        groq_enriched = (
            await enrich_brands_with_groq(search, off_brand_names)
            if off_brand_names else []
        )

        # 3. Merge — Groq-enriched OFF data wins over generated
        merged = {}
        for b in (groq_generated or []):
            if b.get("brand"):
                merged[b["brand"].lower()] = b
        for b in (groq_enriched or []):
            if b.get("brand"):
                merged[b["brand"].lower()] = b

        brands = list(merged.values())
        if not brands:
            return {
                "brands": [], "categories": [], "total": 0,
                "source": "error",
                "message": "Could not fetch brand data. Please try again.",
            }

        cats = sorted({b["food"] for b in brands})
        return {
            "brands": brands, "categories": cats,
            "total": len(brands), "source": "groq+openfoodfacts",
        }

    # No search — load categories (cached), then first category's brands (cached)
    categories = await get_indian_food_categories()
    if not categories:
        return {"brands": [], "categories": [], "total": 0, "source": "error"}

    first_cat_brands = await generate_brands_for_food(categories[0])
    return {
        "brands":     first_cat_brands or [],
        "categories": categories,
        "total":      len(first_cat_brands or []),
        "source":     "groq",
    }


# ── POST /brands/compare ──────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    brands:        List[str]
    food_category: str = ""


@router.post("/compare")
async def compare_brands(req: CompareRequest):
    brand_list = ", ".join(req.brands)
    category   = req.food_category or "food"

    cache_key = f"compare:{category.lower()}:{','.join(sorted(req.brands)).lower()}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "source": "cache"}

    system = (
        "You are an Indian food safety expert with access to FSSAI lab reports, "
        "CSE studies, government adulteration surveys, and documented brand quality data. "
        "Respond ONLY with valid JSON. No markdown, no extra text."
    )
    user = f"""Compare these {category} brands sold in India for food safety: {brand_list}

Use REAL documented data only:
- FSSAI annual surveillance reports
- CSE (Centre for Science and Environment) lab studies  
- EU/USFDA export rejection data
- State food safety authority surveys
- Published adulteration studies

Return ONLY this JSON:
{{
  "comparison": [
    {{
      "brand": "<exact brand name as given>",
      "score": <integer 20-95 based on actual documented safety record>,
      "price": "<current Indian retail price in ₹>",
      "fssai": <true or false>,
      "why": "<2 sentences: cite specific real lab findings, FSSAI history, or adulteration data>",
      "adulterants": ["<most common real adulterant in {category} 1>", "<adulterant 2>", "<adulterant 3>"],
      "home_test": "<one specific DIY test to detect the most common adulterant in {category}>",
      "pros": ["<specific documented pro 1>", "<specific pro 2>"],
      "cons": ["<specific documented con 1>"]
    }}
  ],
  "winner": "<safest brand name based on evidence>",
  "category_risk": "<LOW or MEDIUM or HIGH based on documented adulteration frequency in India>",
  "tip": "<one actionable, evidence-based buying tip for {category} in India>"
}}"""

    try:
        result = await _call_groq(system, user, max_tokens=2500)
        if result.get("comparison"):
            _cache_set(cache_key, result, _TTL_BRANDS)
            return {"data": result, "source": "groq"}
    except Exception:
        pass

    return {"data": None, "source": "error", "message": "Comparison failed. Please try again."}


# ── GET /brands/safe ──────────────────────────────────────────────────────────

@router.get("/safe")
async def get_safe_brands(food: str = ""):
    return await get_all_brands(search=food)


# ── GET /brands/categories ────────────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    categories = await get_indian_food_categories()
    return {"categories": categories}