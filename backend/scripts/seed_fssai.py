"""
scripts/seed_fssai.py

Seeds the FssaiViolation table with known violations and then
re-builds the RAG vector index.

Run from inside backend/:
    python scripts/seed_fssai.py
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.database import AsyncSessionLocal, init_db
from models.models import FssaiViolation
from services.rag_service import rag

VIOLATIONS = [
    # ── Spices ────────────────────────────────────────────────────────────────
    {"brand": "MDH Spices", "product": "Curry Powder",
     "violation": "Pesticide residue exceeding permissible limits — ethylene oxide detected",
     "state": "Multiple States", "date": "2024-04-18",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Various loose spice vendors", "product": "Turmeric Powder",
     "violation": "Lead chromate detected — artificial colour used to enhance yellow appearance. Causes kidney damage and cancer.",
     "state": "Maharashtra", "date": "2024-03-10",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Local market vendors", "product": "Chilli Powder",
     "violation": "Sudan Red dye (carcinogenic) and brick powder added to enhance colour and weight",
     "state": "Rajasthan", "date": "2024-02-14",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unbranded", "product": "Coriander Powder",
     "violation": "Horse dung powder mixed — failed microbial test",
     "state": "Gujarat", "date": "2023-11-20",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unbranded loose", "product": "Cumin Seeds",
     "violation": "Grass seeds coloured to resemble cumin — 40% adulteration by weight",
     "state": "Madhya Pradesh", "date": "2023-10-05",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Multiple brands", "product": "Black Pepper",
     "violation": "Papaya seeds dried and mixed with black pepper — visual and NMR tests confirmed",
     "state": "Karnataka", "date": "2023-09-18",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},

    # ── Dairy ─────────────────────────────────────────────────────────────────
    {"brand": "Local dairy", "product": "Loose Buffalo Milk",
     "violation": "Detergent, urea, and hydrogen peroxide adulteration detected in random sampling",
     "state": "Uttar Pradesh", "date": "2024-02-22",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unnamed vendor", "product": "Paneer",
     "violation": "Non-dairy fat substituted, synthetic starch and detergent powder added",
     "state": "Delhi", "date": "2024-01-15",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Loose ghee vendors", "product": "Ghee",
     "violation": "Vanaspati (partially hydrogenated fat) mixed — Baudouin test positive",
     "state": "Punjab", "date": "2023-11-10",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unbranded", "product": "Khoya / Mawa",
     "violation": "Starch, skimmed milk powder and refined oil mixed — used in festival sweets",
     "state": "Maharashtra", "date": "2023-10-25",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},

    # ── Oils ──────────────────────────────────────────────────────────────────
    {"brand": "Multiple", "product": "Honey",
     "violation": "High fructose corn syrup adulteration — fails NMR purity test. 77% samples failed CSE test.",
     "state": "Haryana", "date": "2023-12-05",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Loose oil vendors", "product": "Mustard Oil",
     "violation": "Argemone oil mixed — causes epidemic dropsy, cardiac failure. FSSAI 2023 survey: 62% samples adulterated.",
     "state": "Bihar", "date": "2024-01-08",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unbranded", "product": "Edible Oil",
     "violation": "Used/recycled cooking oil mixed with fresh oil — elevated peroxide value",
     "state": "Tamil Nadu", "date": "2023-08-30",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Local brands", "product": "Coconut Oil",
     "violation": "Palm oil adulteration — fails cold test (solidification at 20°C)",
     "state": "Kerala", "date": "2023-07-12",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},

    # ── Grains & Pulses ───────────────────────────────────────────────────────
    {"brand": "Unbranded", "product": "Dal / Pulses",
     "violation": "Metanil yellow dye used on arhar dal to enhance colour — carcinogenic",
     "state": "West Bengal", "date": "2023-12-18",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Local vendors", "product": "Rice",
     "violation": "Plastic / synthetic rice mixed — floats uniformly in water, does not break when bitten",
     "state": "Assam", "date": "2023-06-14",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Multiple flour mills", "product": "Wheat Flour / Atta",
     "violation": "Chalk powder and refined flour mixed — falls under substandard category",
     "state": "Haryana", "date": "2024-03-01",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},

    # ── Beverages & Sweet ─────────────────────────────────────────────────────
    {"brand": "Street vendors", "product": "Fruit Juice",
     "violation": "Artificial colour (metanil yellow, rhodamine B) and saccharin used without declaration",
     "state": "Delhi", "date": "2023-09-05",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Halwai / mithai shops", "product": "Sweets / Mithai",
     "violation": "Non-permitted colours and synthetic khoya used during Diwali season sampling",
     "state": "Uttar Pradesh", "date": "2023-10-20",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Unbranded tea vendors", "product": "Tea / Chai",
     "violation": "Used tea leaves dried and repacked — exhausted leaves mixed with fresh",
     "state": "Assam", "date": "2023-05-22",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Multiple", "product": "Coffee Powder",
     "violation": "Chicory, tamarind seeds and date seeds mixed — declared as pure coffee",
     "state": "Karnataka", "date": "2023-04-10",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},

    # ── Fish & Meat ───────────────────────────────────────────────────────────
    {"brand": "Fish markets", "product": "Fish",
     "violation": "Formalin used as preservative — toxic, causes cancer. Kolkata market random sampling.",
     "state": "West Bengal", "date": "2024-01-30",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
    {"brand": "Poultry vendors", "product": "Chicken",
     "violation": "Antibiotic residues above permissible limits — colistin and tetracycline detected",
     "state": "Maharashtra", "date": "2023-11-05",
     "source_url": "https://fssai.gov.in/cms/food-safety-alerts.php"},
]


async def seed():
    print("🔍 Initialising database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check how many already exist
        result = await db.execute(select(FssaiViolation))
        existing = result.scalars().all()
        existing_keys = {(v.brand, v.product, v.state) for v in existing}
        print(f"   Existing records: {len(existing)}")

        added = 0
        for v in VIOLATIONS:
            key = (v["brand"], v["product"], v["state"])
            if key in existing_keys:
                continue
            record = FssaiViolation(
                brand=v["brand"],
                product=v["product"],
                violation=v["violation"],
                state=v["state"],
                date=datetime.strptime(v["date"], "%Y-%m-%d"),
                source_url=v.get("source_url", ""),
                raw_text=f"{v['product']} {v['violation']} {v['state']}",
            )
            db.add(record)
            added += 1

        await db.commit()
        print(f"   Added: {added} new records")

        # Reload all for indexing
        result = await db.execute(select(FssaiViolation))
        all_violations = result.scalars().all()

    print(f"\n📦 Building RAG index over {len(all_violations)} records...")
    for v in all_violations:
        doc = f"{v.product} {v.brand or ''} {v.violation or ''} {v.state or ''} {v.raw_text or ''}"
        meta = {
            "brand": v.brand or "",
            "product": v.product or "",
            "violation": (v.violation or "")[:500],
            "state": v.state or "",
            "date": str(v.date.date()) if v.date else "",
            "source_url": v.source_url or "",
        }
        rag.index_violation(v.id, doc.strip(), meta)

    print(f"\n✅ Done.")
    print(f"   Total in DB       : {len(all_violations)}")
    print(f"   Total in RAG index: {rag.record_count}")


if __name__ == "__main__":
    asyncio.run(seed())
