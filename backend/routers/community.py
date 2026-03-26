from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.core.config import settings
from models.models import CommunityReport, User

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def get_required_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> User:
    """Returns the authenticated User or raises 401."""
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        from routers.users import decode_token
        user_id = decode_token(creds.credentials)
        result  = await db.execute(select(User).where(User.id == user_id))
        user    = result.scalar_one_or_none()
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    food_name:   str
    city:        str
    description: str
    brand:       Optional[str]   = None
    state:       Optional[str]   = "Maharashtra"
    lat:         Optional[float] = None
    lng:         Optional[float] = None

class UpvoteRequest(BaseModel):
    report_id: str


def _risk_from_count(count: int) -> str:
    if count >= 30: return "CRITICAL"
    if count >= 20: return "HIGH"
    if count >= 10: return "MEDIUM"
    return "LOW"


# ── Get reports (public) ──────────────────────────────────────────────────────
@router.get("/reports")
async def get_reports(
    city:  str = "",
    state: str = "",
    food:  str = "",
    limit: int = 50,
    db:    AsyncSession = Depends(get_db),
):
    query = select(CommunityReport).order_by(CommunityReport.created_at.desc())
    if city:
        query = query.where(CommunityReport.city.ilike(f"%{city}%"))
    if state:
        query = query.where(CommunityReport.state.ilike(f"%{state}%"))
    if food:
        query = query.where(CommunityReport.food_name.ilike(f"%{food}%"))
    query = query.limit(min(limit, 200))

    result = await db.execute(query)
    reports = result.scalars().all()

    data = [
        {
            "id":          r.id,
            "food_name":   r.food_name,
            "brand":       r.brand,
            "city":        r.city,
            "state":       r.state,
            "description": r.description,
            "verified":    r.verified,
            "upvotes":     r.upvotes,
            "lat":         r.lat,
            "lng":         r.lng,
            "created_at":  r.created_at.isoformat(),
        }
        for r in reports
    ]
    return {"reports": data, "total": len(data)}


# ── Submit report (requires auth) ─────────────────────────────────────────────
@router.post("/report")
async def submit_report(
    req:  ReportCreate,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")
    if not req.city.strip():
        raise HTTPException(400, "city is required")

    report = CommunityReport(
        food_name   = req.food_name.strip(),
        brand       = req.brand,
        city        = req.city.strip(),
        state       = req.state or "Maharashtra",
        description = req.description.strip(),
        lat         = req.lat,
        lng         = req.lng,
    )
    db.add(report)
    await db.flush()
    await db.commit()

    # ── Auto-alert: push notification when food hits 10+ reports in a city ────
    try:
        count_result = await db.execute(
            select(func.count(CommunityReport.id))
            .where(CommunityReport.food_name == req.food_name.strip())
            .where(CommunityReport.city == req.city.strip())
        )
        report_count = count_result.scalar() or 0

        if report_count >= 10 and report_count % 5 == 0:
            from routers.push import _subscriptions
            if _subscriptions:
                try:
                    from pywebpush import webpush
                    import json as _json
                    payload = _json.dumps({
                        "title": f"⚠️ {req.food_name} Alert — {req.city}",
                        "body":  f"{report_count} adulteration reports for {req.food_name} in {req.city}. Be cautious!",
                        "url":   "/map",
                        "icon":  "/pwa-192.png",
                    })
                    private_key = settings.VAPID_PRIVATE_KEY if hasattr(settings, 'VAPID_PRIVATE_KEY') else None
                    vapid_email = getattr(settings, 'VAPID_EMAIL', 'mailto:admin@foodsafe.app')
                    if private_key:
                        for sub in _subscriptions[:]:
                            try:
                                webpush(
                                    subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                                    data=payload,
                                    vapid_private_key=private_key,
                                    vapid_claims={"sub": vapid_email},
                                )
                            except Exception:
                                pass
                except Exception:
                    pass
    except Exception:
        pass

    return {"success": True, "id": report.id, "message": "Report submitted successfully"}


# ── Upvote report (requires auth) ─────────────────────────────────────────────
@router.post("/upvote")
async def upvote_report(
    req:  UpvoteRequest,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    result = await db.execute(
        select(CommunityReport).where(CommunityReport.id == req.report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.upvotes = (report.upvotes or 0) + 1
    await db.commit()
    return {"success": True, "upvotes": report.upvotes}


# ── City risk summary (public) ────────────────────────────────────────────────
@router.get("/city-risk")
async def city_risk(db: AsyncSession = Depends(get_db)):

    # ── Aggregate report count + avg coordinates per city ────────────────────
    count_result = await db.execute(
        select(
            CommunityReport.city,
            func.count(CommunityReport.id).label("reports"),
            func.avg(CommunityReport.lat).label("lat"),
            func.avg(CommunityReport.lng).label("lng"),
        )
        .group_by(CommunityReport.city)
        .order_by(func.count(CommunityReport.id).desc())
    )
    city_data = {
        r.city: {"reports": r.reports, "lat": r.lat, "lng": r.lng}
        for r in count_result.all()
    }

    # ── Top food per city ─────────────────────────────────────────────────────
    top_food_result = await db.execute(
        select(
            CommunityReport.city,
            CommunityReport.food_name,
            func.count(CommunityReport.id).label("food_count"),
        )
        .group_by(CommunityReport.city, CommunityReport.food_name)
        .order_by(CommunityReport.city, func.count(CommunityReport.id).desc())
    )
    top_food = {}
    for row in top_food_result.all():
        if row.city not in top_food:
            top_food[row.city] = row.food_name

    cities = [
        {
            "city":    city,
            "reports": d["reports"],
            "lat":     d["lat"],
            "lng":     d["lng"],
            "risk":    _risk_from_count(d["reports"]),
            "topFood": top_food.get(city, "Various"),
        }
        for city, d in city_data.items()
        if city
    ]

    return {"cities": cities, "total": len(cities)}


# ── Seed sample reports (dev only) ────────────────────────────────────────────
@router.post("/seed")
async def seed_reports(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_required_user),
):
    if settings.APP_ENV != "development":
        raise HTTPException(403, "Seed endpoint is disabled in production")

    samples = [
        {"food_name": "Turmeric Powder", "brand": "Local brand", "city": "Nagpur",
         "state": "Maharashtra", "description": "Found yellow synthetic color, tasted bitter.",
         "lat": 21.1458, "lng": 79.0882},
        {"food_name": "Buffalo Milk",    "brand": "Unbranded",   "city": "Pune",
         "state": "Maharashtra", "description": "Milk appeared watery, detergent smell noticed.",
         "lat": 18.5204, "lng": 73.8567},
        {"food_name": "Honey",           "brand": "Local honey", "city": "Mumbai",
         "state": "Maharashtra", "description": "Crystallized very quickly, tastes like sugar syrup.",
         "lat": 19.0760, "lng": 72.8777},
        {"food_name": "Paneer",          "brand": "Local dairy", "city": "Aurangabad",
         "state": "Maharashtra", "description": "Rubbery texture, did not melt on heating.",
         "lat": 19.8762, "lng": 75.3433},
        {"food_name": "Mustard Oil",     "brand": "Unbranded",   "city": "Nashik",
         "state": "Maharashtra", "description": "Unusual bitter taste, stomach cramps after use.",
         "lat": 19.9975, "lng": 73.7898},
    ]
    for s in samples:
        db.add(CommunityReport(**s))
    await db.flush()
    await db.commit()
    return {"success": True, "seeded": len(samples)}