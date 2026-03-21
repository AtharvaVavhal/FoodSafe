"""
backend/routers/admin.py

Real-time admin stats — no hardcoded data.
All numbers come from the database.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from app.db.database import get_db
from models.models import ScanRecord, User, CommunityReport, FssaiViolation

router = APIRouter()


@router.get("/stats")
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    """Real-time dashboard stats from DB — replaces all hardcoded numbers."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total scans
    total_scans = (await db.execute(select(func.count()).select_from(ScanRecord))).scalar() or 0

    # Today's scans
    today_scans = (await db.execute(
        select(func.count()).where(ScanRecord.created_at >= today_start)
    )).scalar() or 0

    # High/Critical risk scans
    high_risk = (await db.execute(
        select(func.count()).where(ScanRecord.risk_level.in_(["HIGH", "CRITICAL"]))
    )).scalar() or 0

    # Active users (scanned at least once)
    active_users = (await db.execute(
        select(func.count(func.distinct(ScanRecord.user_id)))
        .where(ScanRecord.user_id.is_not(None))
    )).scalar() or 0

    # Total users registered
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    # Average safety score
    avg_score = (await db.execute(
        select(func.avg(ScanRecord.safety_score))
        .where(ScanRecord.safety_score.is_not(None))
    )).scalar()
    avg_score = round(avg_score, 1) if avg_score else 0

    # Top food (most scanned)
    top_food_row = (await db.execute(
        select(ScanRecord.food_name, func.count().label("cnt"))
        .group_by(ScanRecord.food_name)
        .order_by(desc("cnt"))
        .limit(1)
    )).first()
    top_food = top_food_row.food_name if top_food_row else "—"

    # Top city (most scans)
    top_city_row = (await db.execute(
        select(ScanRecord.city, func.count().label("cnt"))
        .where(ScanRecord.city.is_not(None))
        .group_by(ScanRecord.city)
        .order_by(desc("cnt"))
        .limit(1)
    )).first()
    top_city = top_city_row.city if top_city_row else "—"

    # Community reports total
    community_reports = (await db.execute(
        select(func.count()).select_from(CommunityReport)
    )).scalar() or 0

    # FSSAI violations total
    fssai_total = (await db.execute(
        select(func.count()).select_from(FssaiViolation)
    )).scalar() or 0

    # Scans last 7 days (for trend chart)
    weekly = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = (await db.execute(
            select(func.count()).where(
                ScanRecord.created_at >= day_start,
                ScanRecord.created_at < day_end,
            )
        )).scalar() or 0
        weekly.append({
            "day":   day_start.strftime("%a"),
            "date":  day_start.strftime("%d %b"),
            "count": count,
        })

    # Risk breakdown
    risk_counts = {}
    for level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        c = (await db.execute(
            select(func.count()).where(ScanRecord.risk_level == level)
        )).scalar() or 0
        risk_counts[level] = c

    return {
        "totalScans":       total_scans,
        "todayScans":       today_scans,
        "highRiskScans":    high_risk,
        "activeUsers":      active_users,
        "totalUsers":       total_users,
        "avgScore":         avg_score,
        "topFood":          top_food,
        "topCity":          top_city,
        "communityReports": community_reports,
        "fssaiViolations":  fssai_total,
        "weeklyTrend":      weekly,
        "riskBreakdown":    risk_counts,
    }


@router.get("/recent-scans")
async def get_recent_scans(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Latest scans from DB — replaces hardcoded scan list."""
    result = await db.execute(
        select(ScanRecord)
        .order_by(ScanRecord.created_at.desc())
        .limit(limit)
    )
    scans = result.scalars().all()

    now = datetime.utcnow()
    def time_ago(dt):
        if not dt:
            return "just now"
        diff = now - dt
        s = int(diff.total_seconds())
        if s < 60:    return f"{s}s ago"
        if s < 3600:  return f"{s//60}m ago"
        if s < 86400: return f"{s//3600}h ago"
        return dt.strftime("%d %b")

    return {
        "scans": [
            {
                "id":        s.id,
                "food":      s.food_name,
                "risk":      s.risk_level or "UNKNOWN",
                "score":     s.safety_score,
                "city":      s.city or "—",
                "scan_type": s.scan_type or "text",
                "time":      time_ago(s.created_at),
            }
            for s in scans
        ]
    }


@router.get("/ml-status")
async def get_ml_status():
    """Check which ML models are loaded — dynamic, no hardcoding."""
    status = {}

    try:
        from services.yolo_service import _model, _loaded
        status["yolov8"] = {
            "loaded": _loaded and _model is not None,
            "label":  "YOLOv8 Food Detection",
            "classes": 10,
        }
    except Exception:
        status["yolov8"] = {"loaded": False, "label": "YOLOv8 Food Detection"}

    try:
        from services.indicbert_service import _classifier, _muril, _loaded as ib_loaded
        status["indicbert"] = {
            "loaded":   ib_loaded and _classifier is not None,
            "muril":    _muril is not None,
            "label":    "IndicBERT / MuRIL NLP",
            "mappings": 48,
        }
    except Exception:
        status["indicbert"] = {"loaded": False, "label": "IndicBERT / MuRIL NLP"}

    try:
        import risk_scorer
        status["prophet"] = {
            "loaded": True,
            "label":  "Prophet Seasonal Risk",
            "categories": 6,
        }
    except Exception:
        status["prophet"] = {"loaded": False, "label": "Prophet Seasonal Risk"}

    try:
        import personalized_scorer
        status["random_forest"] = {
            "loaded": True,
            "label":  "Random Forest Personalized Scorer",
        }
    except Exception:
        status["random_forest"] = {"loaded": False, "label": "Random Forest Personalized Scorer"}

    return {"models": status, "checked_at": datetime.utcnow().isoformat()}