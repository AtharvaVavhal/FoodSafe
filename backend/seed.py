"""
Seed database with initial safe brands + FSSAI violation data.
Run once after migrations: python seed.py
"""
import asyncio
from datetime import datetime
from app.db.database import AsyncSessionLocal, init_db
from models.models import SafeBrand, FssaiViolation
import uuid

SAFE_BRANDS = [
    ("Turmeric",     "Everest Turmeric",     88, "10016011002695", "₹80–120/100g"),
    ("Turmeric",     "MDH Turmeric",          82, "10014048000107", "₹70–100/100g"),
    ("Turmeric",     "Catch Turmeric",        79, "10016022001182", "₹60–90/100g"),
    ("Mustard Oil",  "Fortune Mustard Oil",   85, "10014022000365", "₹120–160/L"),
    ("Mustard Oil",  "Dhara Mustard Oil",     83, "10015022000042", "₹110–150/L"),
    ("Milk",         "Amul Milk",             91, "10015022000038", "₹56–72/L"),
    ("Milk",         "Mother Dairy Milk",     89, "10015022000039", "₹54–70/L"),
    ("Honey",        "Dabur Honey",           78, "10016054001834", "₹180–250/500g"),
    ("Honey",        "Patanjali Honey",       74, "10505060000048", "₹150–200/500g"),
    ("Ghee",         "Amul Ghee",             88, "10015022000038", "₹550–650/500g"),
    ("Chilli Powder","Everest Chilli Powder", 85, "10016011002695", "₹60–90/100g"),
    ("Paneer",       "Amul Paneer",           87, "10015022000038", "₹85–110/200g"),
]

FSSAI_VIOLATIONS = [
    ("MDH Spices",        "Curry Powder",   "Pesticide residue (ethylene oxide) exceeding limits", "Multiple States", "2024-04-18"),
    ("Loose vendors",     "Turmeric Powder","Lead chromate detected — artificial colour", "Maharashtra",      "2024-03-10"),
    ("Local dairy",       "Buffalo Milk",   "Detergent and urea adulteration",            "Uttar Pradesh",    "2024-02-22"),
    ("Unnamed vendor",    "Paneer",         "Non-dairy fat, synthetic starch added",      "Delhi",            "2024-01-15"),
    ("Multiple vendors",  "Honey",          "High fructose corn syrup — fails NMR test",  "Haryana",          "2023-12-05"),
    ("Street vendors",    "Mustard Oil",    "Argemone oil mixed — toxic alkaloids",       "Rajasthan",        "2023-11-20"),
    ("Local mills",       "Chilli Powder",  "Sudan Red dye detected — carcinogenic",      "Andhra Pradesh",   "2023-10-08"),
    ("Festival vendors",  "Khoya/Mawa",     "Synthetic solid fat, starch — Diwali season","Maharashtra",      "2023-10-25"),
]

async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        for cat, name, score, fssai, price in SAFE_BRANDS:
            db.add(SafeBrand(
                id=str(uuid.uuid4()), food_category=cat, brand_name=name,
                safety_score=score, fssai_license=fssai, verified=True, price_range=price
            ))
        for brand, product, violation, state, date_str in FSSAI_VIOLATIONS:
            db.add(FssaiViolation(
                id=str(uuid.uuid4()), brand=brand, product=product,
                violation=violation, state=state,
                date=datetime.strptime(date_str, "%Y-%m-%d"),
                source_url="https://fssai.gov.in"
            ))
        await db.commit()
    print(f"✅ Seeded {len(SAFE_BRANDS)} brands + {len(FSSAI_VIOLATIONS)} violations")

if __name__ == "__main__":
    asyncio.run(seed())
