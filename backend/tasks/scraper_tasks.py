"""
tasks/scraper_tasks.py

Celery task: scrape all food safety sources, parse with LLM,
save to DB, and re-index into ChromaDB RAG store.

Runs automatically every Monday at 6am IST via Celery beat.
"""
from tasks import celery_app


@celery_app.task(name="tasks.scraper_tasks.run_fssai_scraper", bind=True, max_retries=2)
def run_fssai_scraper(self):
    """
    Full pipeline:
      1. Scrape FSSAI + news sources
      2. LLM-parse each raw article into structured violation
      3. Dedup against existing DB records
      4. Save new records to DB
      5. Re-index entire collection into ChromaDB
    """
    import asyncio
    import logging
    import uuid
    from datetime import datetime

    from scrapers.fssai_scraper import scrape_all_sources
    from services.ai_service import extract_fssai_violation
    from services.rag_service import rag
    from app.db.database import AsyncSessionLocal
    from models.models import FssaiViolation
    from sqlalchemy import select

    logger = logging.getLogger(__name__)

    async def _run() -> str:
        # ── 1. Scrape all sources ─────────────────────────────────────────────
        logger.info("Starting scraper run...")
        raw_items = await scrape_all_sources()
        logger.info("Scraped %d raw items", len(raw_items))

        if not raw_items:
            return "No items scraped — check source availability"

        # ── 2. Load existing dedup keys from DB ───────────────────────────────
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(FssaiViolation.raw_text))
            existing_texts = {row[0] for row in result.all() if row[0]}

        # ── 3. Parse + save new records ───────────────────────────────────────
        added = 0
        skipped_dupe = 0
        skipped_parse = 0

        async with AsyncSessionLocal() as db:
            for item in raw_items:
                raw = item.get("raw_text", "").strip()
                if not raw or len(raw) < 30:
                    skipped_parse += 1
                    continue

                # Dedup by raw text similarity
                if raw in existing_texts:
                    skipped_dupe += 1
                    continue

                # ── LLM parsing ───────────────────────────────────────────────
                try:
                    parsed = extract_fssai_violation(raw)
                except Exception as e:
                    logger.warning("LLM parse failed: %s", e)
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
                        record_date = datetime.utcnow()
                else:
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

            await db.commit()
            logger.info("Saved %d new records (skipped: %d dupes, %d parse fails)",
                        added, skipped_dupe, skipped_parse)

            # ── 4. Re-index everything into ChromaDB ──────────────────────────
            result = await db.execute(select(FssaiViolation))
            all_violations = result.scalars().all()

        indexed = 0
        for v in all_violations:
            try:
                doc = f"{v.product} {v.brand or ''} {v.violation or ''} {v.state or ''} {v.raw_text or ''}"
                meta = {
                    "brand":      v.brand or "",
                    "product":    v.product or "",
                    "violation":  (v.violation or "")[:500],
                    "state":      v.state or "",
                    "date":       str(v.date.date()) if v.date else "",
                    "source_url": v.source_url or "",
                }
                rag.index_violation(v.id, doc.strip(), meta)
                indexed += 1
            except Exception as e:
                logger.warning("RAG index failed for %s: %s", v.id, e)

        summary = (
            f"Scraped {len(raw_items)} items | "
            f"Added {added} new records | "
            f"RAG index: {indexed} total"
        )
        logger.info(summary)
        return summary

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error("Scraper task failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)  # retry in 5 min
