from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "foodsafe",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.ml_tasks", "tasks.scraper_tasks"],
)

celery_app.conf.beat_schedule = {
    # Scrape FSSAI every Monday at 6am
    "scrape-fssai-weekly": {
        "task": "tasks.scraper_tasks.run_fssai_scraper",
        "schedule": crontab(hour=6, minute=0, day_of_week=1),
    },
    # Retrain risk model every Sunday midnight
    "retrain-risk-model": {
        "task": "tasks.ml_tasks.retrain_risk_model",
        "schedule": crontab(hour=0, minute=0, day_of_week=0),
    },
}
celery_app.conf.timezone = "Asia/Kolkata"
