from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from models.models import CommunityReport

router = APIRouter()

class ReportCreate(BaseModel):
    food_name:   str
    city:        str
    description: str
    brand:       Optional[str] = None
    state:       Optional[str] = "Maharashtra"
    lat:         Optional[float] = None
    lng:         Optional[float] = None

class UpvoteRequest(BaseModel):
    report_id: str

def _risk_from_count(count: int) -> str:
    if count >= 30: return "CRITICAL"
    if count >= 20: return "HIGH"
    if count >= 10: return "MEDIUM"
    return "LOW"

# ── Get reports ───────────────────────────────────────────
@router.get("/reports")
async def get_reports(
    city:  str = "",
    state: str = "",
    food:  str = "",
    limit: int = 50,
    db:    AsyncSession = Depends(get_db),
):
    query = select(CommunityReport).order_by(CommunityReport.created_at.desc()).limit(limit)
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
        if (not city  or (r.city      and city.lower()  in r.city.lower()))
        and (not state or (r.state     and state.lower() in r.state.lower()))
        and (not food  or (r.food_name and food.lower()  in r.food_name.lower()))
    ]
    return {"reports": data, "total": len(data)}

# ── Submit report ─────────────────────────────────────────
@router.post("/report")
async def submit_report(req: ReportCreate, db: AsyncSession = Depends(get_db)):
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
    return {"success": True, "id": report.id, "message": "Report submitted successfully"}

# ── Upvote report ─────────────────────────────────────────
@router.post("/upvote")
async def upvote_report(req: UpvoteRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CommunityReport).where(CommunityReport.id == req.report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.upvotes = (report.upvotes or 0) + 1
    return {"success": True, "upvotes": report.upvotes}

# ── City risk summary ─────────────────────────────────────
@router.get("/city-risk")
async def city_risk(db: AsyncSession = Depends(get_db)):
    # Report count per city
    count_result = await db.execute(
        select(CommunityReport.city, func.count(CommunityReport.id).label("reports"))
        .group_by(CommunityReport.city)
        .order_by(func.count(CommunityReport.id).desc())
    )
    city_counts = {r.city: r.reports for r in count_result.all()}

    # Top food per city (most reported food_name per city)
    top_food_result = await db.execute(
        select(
            CommunityReport.city,
            CommunityReport.food_name,
            func.count(CommunityReport.id).label("food_count"),
        )
        .group_by(CommunityReport.city, CommunityReport.food_name)
        .order_by(CommunityReport.city, func.count(CommunityReport.id).desc())
    )
    # Keep only top food per city
    top_food = {}
    for row in top_food_result.all():
        if row.city not in top_food:
            top_food[row.city] = row.food_name

    cities = [
        {
            "city":     city,
            "reports":  count,
            "risk":     _risk_from_count(count),
            "topFood":  top_food.get(city, "Various"),
        }
        for city, count in city_counts.items()
        if city  # skip null cities
    ]

    return {"cities": cities, "total": len(cities)}

# ── Seed sample reports (dev only) ───────────────────────
@router.post("/seed")
async def seed_reports(db: AsyncSession = Depends(get_db)):
    samples = [
        {"food_name": "Turmeric Powder", "brand": "Local brand", "city": "Nagpur",
         "state": "Maharashtra", "description": "Found yellow synthetic color, tasted bitter. Bought from local market."},
        {"food_name": "Buffalo Milk",    "brand": "Unbranded",   "city": "Pune",
         "state": "Maharashtra", "description": "Milk appeared watery, detergent smell noticed. Tested positive for urea."},
        {"food_name": "Honey",           "brand": "Local honey",  "city": "Mumbai",
         "state": "Maharashtra", "description": "Crystallized very quickly, tastes like sugar syrup. Likely HFCS adulteration."},
        {"food_name": "Paneer",          "brand": "Local dairy",  "city": "Aurangabad",
         "state": "Maharashtra", "description": "Rubbery texture, did not melt on heating. Starch adulteration suspected."},
        {"food_name": "Mustard Oil",     "brand": "Unbranded",    "city": "Nashik",
         "state": "Maharashtra", "description": "Unusual bitter taste, stomach cramps after use. Possible argemone oil mixing."},
    ]
    for s in samples:
        db.add(CommunityReport(**s))
    await db.flush()
    return {"success": True, "seeded": len(samples)}