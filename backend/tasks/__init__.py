import sys
import os

# Ensure /app is on the path so scrapers, services, models are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "foodsafe",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.ml_tasks", "tasks.scraper_tasks", "tasks.digest_tasks"],
)

celery_app.conf.beat_schedule = {
    # Scrape FSSAI every Monday at 6am IST
    "scrape-fssai-weekly": {
        "task": "tasks.scraper_tasks.run_fssai_scraper",
        "schedule": crontab(hour=6, minute=0, day_of_week=1),
    },
    # Retrain risk model every Sunday midnight IST
    "retrain-risk-model": {
        "task": "tasks.ml_tasks.retrain_risk_model",
        "schedule": crontab(hour=0, minute=0, day_of_week=0),
    },
    # Send weekly overconsumption digest every Sunday at 9am IST
    "weekly-overconsumption-digest": {
        "task": "tasks.digest_tasks.send_weekly_digest",
        "schedule": crontab(hour=9, minute=0, day_of_week=0),
    },
}

celery_app.conf.timezone = "Asia/Kolkata"