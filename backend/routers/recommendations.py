from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from models.models import ScanRecord

router = APIRouter()

@router.get("/similar-users/{food_name}")
async def similar_user_flags(
    food_name: str,
    city: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Collaborative filtering:
    'Users like you in Nagpur flagged this brand X% of the time'
    """
    # Total scans for this food
    q_total = select(func.count()).where(
        ScanRecord.food_name.ilike(f"%{food_name}%")
    )
    if city:
        q_total = q_total.where(ScanRecord.city == city)
    total = (await db.execute(q_total)).scalar() or 0

    # High risk scans for this food
    q_risk = select(func.count()).where(
        ScanRecord.food_name.ilike(f"%{food_name}%"),
        ScanRecord.risk_level.in_(["HIGH", "CRITICAL"])
    )
    if city:
        q_risk = q_risk.where(ScanRecord.city == city)
    risky = (await db.execute(q_risk)).scalar() or 0

    flag_rate = round((risky / total) * 100) if total > 0 else 0

    # Top cities flagging this food
    q_cities = select(ScanRecord.city, func.count().label("cnt")).where(
        ScanRecord.food_name.ilike(f"%{food_name}%"),
        ScanRecord.risk_level.in_(["HIGH", "CRITICAL"]),
        ScanRecord.city != None
    ).group_by(ScanRecord.city).order_by(func.count().desc()).limit(3)
    city_rows = (await db.execute(q_cities)).fetchall()
    top_cities = [{"city": r.city, "count": r.cnt} for r in city_rows]

    # What else do users who flagged this food also flag?
    q_also = select(ScanRecord.food_name, func.count().label("cnt")).where(
        ScanRecord.user_id.in_(
            select(ScanRecord.user_id).where(
                ScanRecord.food_name.ilike(f"%{food_name}%"),
                ScanRecord.risk_level.in_(["HIGH", "CRITICAL"])
            )
        ),
        ~ScanRecord.food_name.ilike(f"%{food_name}%"),
        ScanRecord.risk_level.in_(["HIGH", "CRITICAL"])
    ).group_by(ScanRecord.food_name).order_by(func.count().desc()).limit(5)
    also_rows = (await db.execute(q_also)).fetchall()
    also_flagged = [r.food_name for r in also_rows]

    return {
        "food_name": food_name,
        "city": city,
        "total_scans": total,
        "flagged_count": risky,
        "flag_rate_percent": flag_rate,
        "message": f"{flag_rate}% of users" + (f" in {city}" if city else "") + f" flagged {food_name} as high risk",
        "top_cities": top_cities,
        "also_flagged": also_flagged
    }


@router.get("/trending-risks")
async def trending_risks(city: str = None, db: AsyncSession = Depends(get_db)):
    """Top 5 most flagged foods in the last 30 days"""
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=30)

    q = select(
        ScanRecord.food_name,
        func.count().label("cnt")
    ).where(
        ScanRecord.risk_level.in_(["HIGH", "CRITICAL"]),
        ScanRecord.created_at >= cutoff
    )
    if city:
        q = q.where(ScanRecord.city == city)

    q = q.group_by(ScanRecord.food_name).order_by(func.count().desc()).limit(5)
    rows = (await db.execute(q)).fetchall()

    return {
        "city": city or "all",
        "trending": [{"food": r.food_name, "flag_count": r.cnt} for r in rows]
    }
