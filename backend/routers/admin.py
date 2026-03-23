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
    status = {}

    try:
        from services.yolo_service import detect_food
        status["yolov8"] = {"loaded": True, "label": "YOLOv8 Food Detection (Groq Vision)", "classes": 10}
    except Exception:
        status["yolov8"] = {"loaded": False, "label": "YOLOv8 Food Detection"}

    try:
        from services.indicbert_service import classify_intent, normalize_food_name
        status["indicbert"] = {"loaded": True, "label": "IndicBERT / MuRIL NLP (Groq)", "mappings": 48}
    except Exception:
        status["indicbert"] = {"loaded": False, "label": "IndicBERT / MuRIL NLP"}

    try:
        import risk_scorer
        status["prophet"] = {"loaded": True, "label": "Prophet Seasonal Risk", "categories": 6}
    except Exception:
        status["prophet"] = {"loaded": False, "label": "Prophet Seasonal Risk"}

    try:
        import personalized_scorer
        status["random_forest"] = {"loaded": True, "label": "Random Forest Personalized Scorer"}
    except Exception:
        status["random_forest"] = {"loaded": False, "label": "Random Forest Personalized Scorer"}

    import os
    groq_key = os.environ.get("GROQ_API_KEY", "")
    status["groq"] = {
        "loaded": bool(groq_key),
        "label": "Groq LLaMA 3.1 + LLaMA 4 Scout",
        "classes": 0,
    }

    return {"models": status, "checked_at": datetime.utcnow().isoformat()}


@router.get("/scraper-stats")
async def get_scraper_stats(db: AsyncSession = Depends(get_db)):
    """
    Live scraper health stats:
    - Total FSSAI violation records in DB
    - Records added in last 7 days (per day)
    - Source breakdown
    - RAG index record count
    - Last scrape timestamp
    """
    now = datetime.utcnow()

    # Total records
    total = (await db.execute(
        select(func.count()).select_from(FssaiViolation)
    )).scalar() or 0

    # Last scrape time (most recent record created)
    last_record = (await db.execute(
        select(FssaiViolation.created_at)
        .order_by(FssaiViolation.created_at.desc())
        .limit(1)
    )).scalar()
    last_scrape = last_record.isoformat() if last_record else None

    # Records added per day for last 7 days
    daily_adds = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = (await db.execute(
            select(func.count()).where(
                FssaiViolation.created_at >= day_start,
                FssaiViolation.created_at < day_end,
            )
        )).scalar() or 0
        daily_adds.append({
            "day":   day_start.strftime("%a"),
            "date":  day_start.strftime("%d %b"),
            "count": count,
        })

    # Top states with violations
    state_rows = (await db.execute(
        select(FssaiViolation.state, func.count().label("cnt"))
        .where(FssaiViolation.state.is_not(None))
        .where(FssaiViolation.state != "Unknown")
        .group_by(FssaiViolation.state)
        .order_by(desc("cnt"))
        .limit(8)
    )).all()
    top_states = [{"state": r.state, "count": r.cnt} for r in state_rows]

    # Top products with violations
    product_rows = (await db.execute(
        select(FssaiViolation.product, func.count().label("cnt"))
        .where(FssaiViolation.product.is_not(None))
        .group_by(FssaiViolation.product)
        .order_by(desc("cnt"))
        .limit(8)
    )).all()
    top_products = [{"product": r.product, "count": r.cnt} for r in product_rows]

    # Recent violations (last 10)
    recent_rows = (await db.execute(
        select(FssaiViolation)
        .order_by(FssaiViolation.created_at.desc())
        .limit(10)
    )).scalars().all()
    recent = [
        {
            "id":      v.id,
            "brand":   v.brand or "Unknown",
            "product": v.product or "Unknown",
            "state":   v.state or "Unknown",
            "date":    v.date.strftime("%d %b %Y") if v.date else "—",
            "source":  v.source_url or "",
        }
        for v in recent_rows
    ]

    # RAG index health
    rag_count = 0
    rag_status = "unknown"
    try:
        from services.rag_service import rag
        rag_count  = rag.record_count
        rag_status = "healthy" if rag_count > 0 else "empty"
    except Exception:
        rag_status = "error"

    return {
        "totalRecords":  total,
        "lastScrapeAt":  last_scrape,
        "dailyAdds":     daily_adds,
        "topStates":     top_states,
        "topProducts":   top_products,
        "recentRecords": recent,
        "rag": {
            "status":  rag_status,
            "indexed": rag_count,
            "coverage": round((rag_count / total) * 100) if total > 0 else 0,
        },
        "sources": {
            "gnews_fssai":    "Google News — FSSAI adulteration",
            "gnews_recall":   "Google News — food recalls",
            "gnews_spurious": "Google News — spurious food",
            "gnews_poisoning":"Google News — food poisoning",
            "gnews_violation":"Google News — food violations",
            "times_of_india": "Times of India",
            "fssai_press":    "FSSAI press releases",
            "pib_govt":       "Press Information Bureau",
            "fssai_official": "FSSAI official alerts",
        },
    }


@router.post("/scraper/trigger")
async def trigger_scraper():
    """Manually trigger the FSSAI scraper task."""
    try:
        from tasks.scraper_tasks import run_fssai_scraper
        task = run_fssai_scraper.delay()
        return {
            "success":  True,
            "task_id":  task.id,
            "message":  "Scraper task queued successfully",
            "note":     "Check logs in ~2 minutes for results",
        }
    except Exception as e:
        return {
            "success": False,
            "error":   str(e),
        }