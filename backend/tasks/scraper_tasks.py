from tasks import celery_app

@celery_app.task(name="tasks.scraper_tasks.run_fssai_scraper")
def run_fssai_scraper():
    """Weekly FSSAI violation scraper task."""
    import asyncio
    from scrapers.fssai_scraper import scrape_fssai_alerts
    from services.ai_service import extract_fssai_violation
    from app.db.database import AsyncSessionLocal
    from models.models import FssaiViolation
    from datetime import datetime
    import uuid

    async def _run():
        alerts = await scrape_fssai_alerts()
        async with AsyncSessionLocal() as db:
            for alert in alerts:
                parsed = extract_fssai_violation(alert.get("raw_text", ""))
                db.add(FssaiViolation(
                    id=str(uuid.uuid4()),
                    brand=parsed.get("brand"),
                    product=parsed.get("product"),
                    violation=parsed.get("violation_type"),
                    state=parsed.get("state"),
                    date=datetime.utcnow(),
                    source_url=alert.get("source_url"),
                    raw_text=alert.get("raw_text"),
                ))
            await db.commit()
        return f"Scraped {len(alerts)} FSSAI alerts"

    return asyncio.run(_run())
