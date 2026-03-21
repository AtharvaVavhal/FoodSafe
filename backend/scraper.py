"""
FSSAI Scraper — pulls violation/recall data from public FSSAI sources
Run manually: python scraper.py
Run weekly via cron or Celery beat
"""
import httpx
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal, init_db
from models.models import FssaiViolation
from services.ai_service import extract_fssai_violation

# ── FSSAI public URLs ─────────────────────────────────────
SOURCES = [
    {
        "name": "FSSAI Recall Orders",
        "url": "https://fssai.gov.in/cms/recall-orders.php",
    },
    {
        "name": "FSSAI Food Safety Alerts",
        "url": "https://fssai.gov.in/cms/food-safety-alerts.php",
    },
]

# ── Fallback static data (when scraping is blocked) ───────
STATIC_VIOLATIONS = [
    {
        "brand": "MDH",
        "product": "Mixed Masala / Curry Powder",
        "violation": "Pesticide residue (ethylene oxide) found above permissible limits",
        "state": "Multiple states",
        "date": "2024-04-15",
        "source_url": "https://fssai.gov.in",
        "raw_text": "MDH spices recalled due to ethylene oxide contamination above FSSAI limits",
    },
    {
        "brand": "Everest",
        "product": "Fish Curry Masala",
        "violation": "Ethylene oxide pesticide residue detected",
        "state": "Multiple states",
        "date": "2024-04-18",
        "source_url": "https://fssai.gov.in",
        "raw_text": "Everest Fish Curry Masala recalled - ethylene oxide contamination",
    },
    {
        "brand": "Local/Unbranded",
        "product": "Turmeric Powder (loose)",
        "violation": "Lead chromate adulteration detected in random sampling",
        "state": "Maharashtra",
        "date": "2024-03-10",
        "source_url": "https://fssai.gov.in",
        "raw_text": "Maharashtra food safety dept found lead chromate in loose turmeric samples",
    },
    {
        "brand": "Multiple Brands",
        "product": "Honey",
        "violation": "High Fructose Corn Syrup (HFCS) adulteration — NMR test failed",
        "state": "Pan India",
        "date": "2024-02-20",
        "source_url": "https://fssai.gov.in",
        "raw_text": "FSSAI NMR testing found HFCS adulteration in multiple honey brands",
    },
    {
        "brand": "Local Dairies",
        "product": "Paneer",
        "violation": "83% samples failed quality — starch and skimmed milk powder adulteration",
        "state": "Uttar Pradesh",
        "date": "2024-02-05",
        "source_url": "https://fssai.gov.in",
        "raw_text": "UP food safety survey - paneer adulteration with starch widespread",
    },
    {
        "brand": "Unbranded",
        "product": "Mustard Oil",
        "violation": "Argemone oil adulteration detected — causes epidemic dropsy",
        "state": "Rajasthan",
        "date": "2024-01-15",
        "source_url": "https://fssai.gov.in",
        "raw_text": "Argemone oil mixed in mustard oil seized in Jaipur market",
    },
    {
        "brand": "Local Sweet Shops",
        "product": "Mawa/Khoya",
        "violation": "Synthetic milk and starch adulteration ahead of Diwali",
        "state": "Maharashtra",
        "date": "2023-10-20",
        "source_url": "https://fssai.gov.in",
        "raw_text": "Pre-Diwali crackdown - synthetic khoya seized in Pune and Mumbai",
    },
    {
        "brand": "Unbranded",
        "product": "Chilli Powder",
        "violation": "Sudan Red dye (carcinogenic) found in random samples",
        "state": "Tamil Nadu",
        "date": "2024-01-08",
        "source_url": "https://fssai.gov.in",
        "raw_text": "Sudan Red artificial dye detected in loose chilli powder samples",
    },
]

async def scrape_fssai_live() -> list[dict]:
    """Try to scrape live FSSAI data. Returns list of raw violation dicts."""
    results = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for source in SOURCES:
            try:
                resp = await client.get(source["url"])
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                # Extract all paragraph and list item text
                items = soup.find_all(["p", "li", "td"])
                for item in items[:50]:  # limit to first 50 items
                    text = item.get_text(strip=True)
                    if len(text) > 30 and any(
                        kw in text.lower() for kw in
                        ["adulterat", "recall", "unsafe", "violat", "misbranding", "contaminat"]
                    ):
                        results.append({
                            "raw_text": text[:500],
                            "source_url": source["url"],
                        })
            except Exception as e:
                print(f"⚠ Could not scrape {source['name']}: {e}")
    return results

async def seed_static_data(db: AsyncSession):
    """Insert static violation data into DB."""
    for v in STATIC_VIOLATIONS:
        violation = FssaiViolation(
            brand      = v["brand"],
            product    = v["product"],
            violation  = v["violation"],
            state      = v["state"],
            date       = datetime.strptime(v["date"], "%Y-%m-%d") if v.get("date") else None,
            source_url = v["source_url"],
            raw_text   = v["raw_text"],
        )
        db.add(violation)
    await db.commit()
    print(f"✅ Seeded {len(STATIC_VIOLATIONS)} static FSSAI violations")

async def scrape_and_store():
    """Main scraper — tries live scrape first, falls back to static data."""
    await init_db()
    async with AsyncSessionLocal() as db:
        # Try live scrape
        print("🔍 Attempting live FSSAI scrape...")
        live_data = await scrape_fssai_live()

        if live_data:
            print(f"✅ Found {len(live_data)} live items — extracting with AI...")
            for item in live_data[:20]:  # limit to 20 to save API calls
                try:
                    extracted = extract_fssai_violation(item["raw_text"])
                    if extracted.get("product"):
                        violation = FssaiViolation(
                            brand      = extracted.get("brand"),
                            product    = extracted.get("product", "Unknown"),
                            violation  = extracted.get("violation_type", ""),
                            state      = extracted.get("state", ""),
                            date       = datetime.strptime(extracted["date"], "%Y-%m-%d")
                                         if extracted.get("date") else None,
                            source_url = item["source_url"],
                            raw_text   = item["raw_text"],
                        )
                        db.add(violation)
                except Exception as e:
                    print(f"⚠ AI extraction failed: {e}")
            await db.commit()
            print("✅ Live FSSAI data stored")
        else:
            print("⚠ Live scrape failed — seeding static data...")
            await seed_static_data(db)

if __name__ == "__main__":
    asyncio.run(scrape_and_store())