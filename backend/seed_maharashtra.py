import asyncio, os, sys, json, random
from datetime import datetime, timedelta

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("GROQ_API_KEY not found"); sys.exit(1)

async def groq_json(client, prompt, label):
    resp = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=6000,
    )
    raw = resp.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"): raw = raw[4:]
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON error [{label}]: {e}")
        print(f"Raw: {raw[:400]}")
        return None

async def seed():
    from groq import AsyncGroq
    client = AsyncGroq(api_key=GROQ_API_KEY)
    print("Step 1: Asking Groq for Maharashtra adulteration hotspot plan...\n")
    plan = await groq_json(client, """You are a food safety expert for Maharashtra India with knowledge of FSSAI reports and documented adulteration cases. Return a JSON array of 8 real Maharashtra cities with documented food adulteration issues. For each city pick the most commonly adulterated food item actually reported there. Respond ONLY with a valid JSON array. No markdown no backticks no explanation. Each object must have exactly: "city": string, "food": string, "lat": number (real latitude), "lng": number (real longitude), "count": number (between 5 and 35), "adulteration_type": string. Return exactly 8 cities.""", "plan")
    if not plan:
        print("Failed to generate plan"); sys.exit(1)
    print(f"Got plan for {len(plan)} cities:\n")
    for p in plan:
        print(f"  {p['city']:15} -> {p['food']:20} ({p['count']} reports)")
    print()
    sys.path.insert(0, os.path.dirname(__file__))
    from app.db.database import engine
    from models.models import CommunityReport, Base
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as db:
        existing = (await db.execute(select(CommunityReport))).scalars().all()
        print(f"Existing reports in DB: {len(existing)}\n")
        total_added = 0
        now = datetime.utcnow()
        for target in plan:
            city = target["city"]; food = target["food"]; count = int(target["count"])
            lat = float(target["lat"]); lng = float(target["lng"])
            adtype = target.get("adulteration_type", "adulteration")
            print(f"Generating {count} reports for {food} in {city} ({adtype})")
            reports = await groq_json(client, f"""You are generating realistic community food adulteration reports for a safety app in India. City: {city} Maharashtra. Food: {food}. Adulteration method: {adtype}. Generate exactly {count} unique realistic reports real citizens might submit. Respond ONLY with a valid JSON array. No markdown no backticks no explanation. Each object must have exactly: "description": string (1-2 sentences realistic citizen report), "brand": string (realistic Indian brand or Unbranded or Local vendor). Generate exactly {count} objects.""", f"{city}/{food}")
            if not reports:
                print(f"  Skipping {city}/{food}\n"); continue
            for item in reports[:count]:
                db.add(CommunityReport(
                    food_name=food, brand=item.get("brand", "Unbranded"),
                    city=city, state="Maharashtra",
                    description=item.get("description", "Adulteration suspected."),
                    lat=lat + random.uniform(-0.06, 0.06),
                    lng=lng + random.uniform(-0.06, 0.06),
                    upvotes=random.randint(0, 12), verified=False,
                    created_at=now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59)),
                ))
                total_added += 1
            print(f"  Added {min(len(reports), count)} reports\n")
        await db.commit()
        print(f"Done! Inserted {total_added} total reports.")

if __name__ == "__main__":
    asyncio.run(seed())
