"""
scripts/run_scraper.py

Run the full scraper pipeline manually (no Celery needed).
Use this to test, backfill, or trigger on-demand.

Run from inside backend/:
    python scripts/run_scraper.py

What it does:
  1. Scrapes FSSAI alerts + 4 food safety news sources
  2. Parses each article with LLM → structured violation record
  3. Deduplicates against existing DB
  4. Saves new records to DB
  5. Re-indexes everything into ChromaDB RAG store

After running, your RAG index will be up to date.
"""
import asyncio
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


async def main():
    from scrapers.fssai_scraper import scrape_all_sources
    from services.ai_service import extract_fssai_violation
    from services.rag_service import rag
    from app.db.database import AsyncSessionLocal, init_db
    from models.models import FssaiViolation
    from sqlalchemy import select

    print("\n🌿 FoodSafe FSSAI Scraper")
    print("=" * 50)

    await init_db()

    # ── Step 1: Scrape ────────────────────────────────────────────────────────
    print("\n📡 Scraping sources...")
    print("   • FSSAI official alerts")
    print("   • FSSAI recall notices")
    print("   • NDTV Food")
    print("   • Times of India")
    print("   • Down To Earth")
    print("   • CSE India")

    raw_items = await scrape_all_sources()
    print(f"\n   Found {len(raw_items)} raw items across all sources")

    if not raw_items:
        print("\n⚠  No items scraped.")
        print("   Possible reasons:")
        print("   - No internet connection")
        print("   - Source websites changed their HTML structure")
        print("   - All items already exist in DB")
        return

    # ── Step 2: Load existing records for dedup ───────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(FssaiViolation))
        existing = result.scalars().all()
        existing_texts = {v.raw_text for v in existing if v.raw_text}
        print(f"\n📦 Existing DB records: {len(existing)}")

    # ── Step 3: Parse each item with LLM ─────────────────────────────────────
    print(f"\n🤖 Parsing {len(raw_items)} items with LLM...")
    print("   (Each item costs one Groq API call)\n")

    added = 0
    skipped_dupe = 0
    skipped_parse = 0
    skipped_short = 0

    async with AsyncSessionLocal() as db:
        for i, item in enumerate(raw_items, 1):
            raw = item.get("raw_text", "").strip()
            source = item.get("source", "unknown")

            # Skip too-short items
            if len(raw) < 40:
                skipped_short += 1
                continue

            # Skip duplicates
            if raw in existing_texts:
                skipped_dupe += 1
                continue

            # Small delay to avoid Groq rate limits (free tier: ~30 req/min)
            await asyncio.sleep(1.5)

            # Parse with LLM
            try:
                parsed = extract_fssai_violation(raw)
            except Exception as e:
                logger.debug("LLM parse error: %s", e)
                skipped_parse += 1
                continue

            # LLM sometimes returns a list or non-dict — skip those
            if not isinstance(parsed, dict):
                skipped_parse += 1
                continue

            if parsed.get("error") or not parsed.get("product"):
                skipped_parse += 1
                continue

            # Parse date
            date_str = parsed.get("date")
            record_date = None
            if date_str:
                try:
                    record_date = datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    pass
            if not record_date:
                record_date = datetime.utcnow()

            record = FssaiViolation(
                id         = str(uuid.uuid4()),
                brand      = parsed.get("brand") or "Unknown",
                product    = parsed.get("product"),
                violation  = parsed.get("adulterant") or parsed.get("violation_type") or raw[:300],
                state      = parsed.get("state") or "Unknown",
                date       = record_date,
                source_url = item.get("source_url", ""),
                raw_text   = raw,
            )
            db.add(record)
            existing_texts.add(raw)
            added += 1

            # Progress
            product_name = (parsed.get("product") or "?")[:30]
            state_name   = (parsed.get("state")   or "?")[:15]
            print(f"   [{i:03d}] ✅ {product_name:<32} {state_name:<18} [{source}]")

        await db.commit()

    # ── Step 4: Re-index into ChromaDB ───────────────────────────────────────
    print(f"\n🔍 Re-indexing RAG store...")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(FssaiViolation))
        all_violations = result.scalars().all()

    indexed = 0
    for v in all_violations:
        doc = f"{v.product} {v.brand or ''} {v.violation or ''} {v.state or ''} {v.raw_text or ''}"
        meta = {
            "brand":      v.brand or "",
            "product":    v.product or "",
            "violation":  (v.violation or "")[:500],
            "state":      v.state or "",
            "date":       str(v.date.date()) if v.date else "",
            "source_url": v.source_url or "",
        }
        try:
            rag.index_violation(v.id, doc.strip(), meta)
            indexed += 1
        except Exception as e:
            logger.warning("RAG index failed for %s: %s", v.id, e)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'=' * 50}")
    print(f"✅ Scraper run complete\n")
    print(f"   Raw items scraped   : {len(raw_items)}")
    print(f"   New records added   : {added}")
    print(f"   Skipped (duplicate) : {skipped_dupe}")
    print(f"   Skipped (too short) : {skipped_short}")
    print(f"   Skipped (parse fail): {skipped_parse}")
    print(f"   Total in DB         : {len(all_violations)}")
    print(f"   Total in RAG index  : {indexed}")
    print(f"\n   Run again weekly to keep the dataset fresh.")
    print(f"   Or let Celery beat handle it automatically (Monday 6am IST).\n")


if __name__ == "__main__":
    asyncio.run(main())
