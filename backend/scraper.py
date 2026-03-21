"""
FSSAI Live Scraper — uses Google News RSS for real-time FSSAI alerts
Run manually: python scraper.py
"""
import httpx
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal, init_db
from models.models import FssaiViolation

STATIC_VIOLATIONS = [
    {"brand": "MDH", "product": "Mixed Masala / Curry Powder", "violation": "Pesticide residue (ethylene oxide) found above permissible limits", "state": "Multiple states", "date": "2024-04-15"},
    {"brand": "Everest", "product": "Fish Curry Masala", "violation": "Ethylene oxide pesticide residue detected", "state": "Multiple states", "date": "2024-04-18"},
    {"brand": "Local/Unbranded", "product": "Turmeric Powder (loose)", "violation": "Lead chromate adulteration detected in random sampling", "state": "Maharashtra", "date": "2024-03-10"},
    {"brand": "Multiple Brands", "product": "Honey", "violation": "High Fructose Corn Syrup (HFCS) adulteration — NMR test failed", "state": "Pan India", "date": "2024-02-20"},
    {"brand": "Local Dairies", "product": "Paneer", "violation": "83% samples failed quality — starch and skimmed milk powder adulteration", "state": "Uttar Pradesh", "date": "2024-02-05"},
    {"brand": "Unbranded", "product": "Mustard Oil", "violation": "Argemone oil adulteration detected — causes epidemic dropsy", "state": "Rajasthan", "date": "2024-01-15"},
    {"brand": "Local Sweet Shops", "product": "Mawa/Khoya", "violation": "Synthetic milk and starch adulteration ahead of Diwali", "state": "Maharashtra", "date": "2023-10-20"},
    {"brand": "Unbranded", "product": "Chilli Powder", "violation": "Sudan Red dye (carcinogenic) found in random samples", "state": "Tamil Nadu", "date": "2024-01-08"},
]

GOOGLE_NEWS_FEEDS = [
    "https://news.google.com/rss/search?q=FSSAI+food+adulteration+India&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=FSSAI+food+recall+India&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=food+adulteration+India+2024&hl=en-IN&gl=IN&ceid=IN:en",
]

async def scrape_google_news() -> list[dict]:
    results = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (compatible; FoodSafeBot/1.0)"
    }) as client:
        for feed_url in GOOGLE_NEWS_FEEDS:
            try:
                resp = await client.get(feed_url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item")
                for item in items[:10]:
                    title = item.find("title")
                    pub_date = item.find("pubDate")
                    link = item.find("link")
                    if title:
                        results.append({
                            "title": title.get_text(strip=True),
                            "date": pub_date.get_text(strip=True) if pub_date else None,
                            "url": link.get_text(strip=True) if link else "",
                        })
            except Exception as e:
                print(f"⚠ Feed error: {e}")
    return results

def parse_news_to_violation(item: dict) -> dict | None:
    title = item["title"].lower()
    keywords = ["adulterat", "recall", "unsafe", "fssai", "contaminat", "pesticide", "banned", "seized", "fake"]
    if not any(kw in title for kw in keywords):
        return None

    # Detect state
    states = ["maharashtra", "delhi", "punjab", "rajasthan", "gujarat", "up", "uttar pradesh",
              "tamil nadu", "karnataka", "kerala", "bengal", "bihar", "hyderabad"]
    detected_state = "India"
    for s in states:
        if s in title:
            detected_state = s.title()
            break

    # Detect brand
    known_brands = ["mdh", "everest", "amul", "nestle", "maggi", "haldiram", "patanjali", "britannia"]
    detected_brand = "Unbranded"
    for b in known_brands:
        if b in title:
            detected_brand = b.title()
            break

    # Parse date
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(item["date"]) if item.get("date") else datetime.utcnow()
        date_obj = dt.replace(tzinfo=None)
    except:
        date_obj = datetime.utcnow()

    return {
        "brand": detected_brand,
        "product": item["title"][:80],
        "violation": item["title"],
        "state": detected_state,
        "date": date_obj,
        "source_url": item.get("url", "https://news.google.com"),
        "raw_text": item["title"],
    }

async def seed_static_data(db: AsyncSession):
    for v in STATIC_VIOLATIONS:
        violation = FssaiViolation(
            brand=v["brand"], product=v["product"],
            violation=v["violation"], state=v["state"],
            date=datetime.strptime(v["date"], "%Y-%m-%d"),
            source_url="https://fssai.gov.in",
            raw_text=v["violation"],
        )
        db.add(violation)
    await db.commit()
    print(f"✅ Seeded {len(STATIC_VIOLATIONS)} static violations")

async def scrape_and_store():
    await init_db()
    async with AsyncSessionLocal() as db:
        print("🔍 Scraping Google News for FSSAI alerts...")
        news_items = await scrape_google_news()

        if news_items:
            added = 0
            for item in news_items:
                v = parse_news_to_violation(item)
                if v:
                    db.add(FssaiViolation(**v))
                    added += 1
            await db.commit()
            print(f"✅ Added {added} live news alerts from Google News")
        else:
            print("⚠ No live data — seeding static violations...")
            await seed_static_data(db)

if __name__ == "__main__":
    asyncio.run(scrape_and_store())
