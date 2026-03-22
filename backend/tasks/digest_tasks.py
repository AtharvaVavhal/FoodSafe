"""
tasks/digest_tasks.py

Weekly overconsumption digest task.
Runs every Sunday at 9am IST (scheduled in tasks/__init__.py).

For each user who has scanned food in the past 7 days:
  1. Build their overconsumption digest
  2. Send a WhatsApp summary via Twilio (if phone is available)
     — extend here to send push notification or email instead

Add to celery_app.conf.beat_schedule in tasks/__init__.py:
    "weekly-overconsumption-digest": {
        "task": "tasks.digest_tasks.send_weekly_digest",
        "schedule": crontab(hour=9, minute=0, day_of_week=0),   # Sunday 9am IST
    },
"""

import logging
from datetime import datetime, timedelta

from tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.digest_tasks.send_weekly_digest", bind=True, max_retries=1)
def send_weekly_digest(self):
    """
    Fetch all active users, build their 7-day overconsumption digest,
    and send a WhatsApp message for each user who has warnings.
    """
    import asyncio

    async def _run() -> str:
        from app.db.database import AsyncSessionLocal
        from models.models import User, ScanRecord
        from services.overconsumption_service import build_weekly_digest
        from sqlalchemy import select, distinct

        cutoff = datetime.utcnow() - timedelta(days=7)
        sent = 0
        skipped = 0

        async with AsyncSessionLocal() as db:
            # Find users who have scanned in the last 7 days
            result = await db.execute(
                select(distinct(ScanRecord.user_id))
                .where(ScanRecord.created_at >= cutoff)
                .where(ScanRecord.user_id.isnot(None))
            )
            user_ids = [row[0] for row in result.all()]
            logger.info("Digest: found %d active users", len(user_ids))

            for user_id in user_ids:
                try:
                    # Fetch user info
                    user_result = await db.execute(
                        select(User).where(User.id == user_id)
                    )
                    user = user_result.scalar_one_or_none()
                    if not user:
                        skipped += 1
                        continue

                    # Fetch their scans
                    scans_result = await db.execute(
                        select(ScanRecord.food_name, ScanRecord.created_at)
                        .where(ScanRecord.user_id == user_id)
                        .where(ScanRecord.created_at >= cutoff)
                        .order_by(ScanRecord.created_at.desc())
                        .limit(500)
                    )
                    scan_records = [
                        {"food_name": r.food_name, "created_at": r.created_at}
                        for r in scans_result.all()
                    ]

                    digest = build_weekly_digest(scan_records)

                    # Skip users with no warnings
                    if digest["safe"]:
                        skipped += 1
                        continue

                    # Build message
                    message = _format_whatsapp_message(user.name, digest)

                    # Send via Twilio WhatsApp (optional — skip if no phone)
                    phone = getattr(user, "phone", None)
                    if phone:
                        _send_whatsapp(phone, message)
                        sent += 1
                    else:
                        # Log the digest for now — extend to push/email here
                        logger.info(
                            "Digest for %s (no phone): %d warnings",
                            user.name,
                            len(digest["topWarnings"]),
                        )
                        sent += 1

                except Exception as e:
                    logger.warning("Digest failed for user %s: %s", user_id, e)
                    skipped += 1

        summary = f"Weekly digest: {sent} sent, {skipped} skipped"
        logger.info(summary)
        return summary

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error("Digest task failed: %s", exc)
        raise self.retry(exc=exc, countdown=600)


def _format_whatsapp_message(name: str, digest: dict) -> str:
    """Format the digest dict into a WhatsApp-friendly message."""
    lines = [
        f"👋 Hi {name}! Here's your FoodSafe weekly health digest ({digest['period']}).",
        f"You scanned {digest['totalScans']} food items this week.\n",
    ]

    if digest["topWarnings"]:
        lines.append("⚠️ *Overconsumption warnings:*")
        for w in digest["topWarnings"]:
            lines.append(f"  {w['icon']} {w['label']}: {w['count']} servings (limit: {w['limit']}/week)")
        lines.append("")

    approaching = [
        v for v in digest["categories"].values()
        if v["status"] == "approaching"
    ]
    if approaching:
        lines.append("📊 *Approaching limits:*")
        for v in approaching:
            lines.append(f"  {v['icon']} {v['label']}: {v['pct']}% of weekly limit")
        lines.append("")

    lines.append("💡 Tip: Variety in your diet reduces overexposure to any single risk category.")
    lines.append("\nStay safe 🛡️ — Team FoodSafe")
    return "\n".join(lines)


def _send_whatsapp(phone: str, message: str) -> None:
    """Send a WhatsApp message via Twilio. Fails silently."""
    try:
        from twilio.rest import Client
        from app.core.config import settings

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:{phone}",
            body=message,
        )
        logger.info("WhatsApp digest sent to %s", phone)
    except Exception as e:
        logger.warning("WhatsApp send failed for %s: %s", phone, e)