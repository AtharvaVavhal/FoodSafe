from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from services.ai_service import analyze_symptoms
from app.db.database import get_db
from models.models import CommunityReport, FssaiViolation, SafeBrand, ScanRecord, User

# ────────────────────────────────────── symptoms
symptoms_router = APIRouter()

class SymptomRequest(BaseModel):
    symptoms: str
    recent_foods: Optional[list[str]] = []
    lang: str = "en"

@symptoms_router.post("/analyze")
async def symptom_analyze(req: SymptomRequest):
    if not req.symptoms.strip():
        raise HTTPException(400, "symptoms required")
    return await analyze_symptoms(req.symptoms, req.recent_foods or [])


# ────────────────────────────────────── community
community_router = APIRouter()

class ReportRequest(BaseModel):
    food_name: str
    brand: Optional[str] = None
    city: str
    state: Optional[str] = "Maharashtra"
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None

@community_router.get("/reports")
async def get_reports(city: str = "", db: AsyncSession = Depends(get_db)):
    q = select(CommunityReport).order_by(CommunityReport.created_at.desc()).limit(50)
    if city:
        q = q.where(CommunityReport.city.ilike(f"%{city}%"))
    result = await db.execute(q)
    reports = result.scalars().all()
    return [{"id": r.id, "food_name": r.food_name, "brand": r.brand,
             "city": r.city, "description": r.description, "upvotes": r.upvotes,
             "verified": r.verified, "lat": r.lat, "lng": r.lng,
             "created_at": str(r.created_at)} for r in reports]

@community_router.post("/report")
async def submit_report(req: ReportRequest, db: AsyncSession = Depends(get_db)):
    report = CommunityReport(**req.model_dump())
    db.add(report)
    return {"message": "Report submitted successfully"}

@community_router.post("/report/{report_id}/upvote")
async def upvote_report(report_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CommunityReport).where(CommunityReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    report.upvotes += 1
    return {"upvotes": report.upvotes}


# ────────────────────────────────────── brands
brands_router = APIRouter()

@brands_router.get("/safe")
async def get_safe_brands(food: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SafeBrand).where(SafeBrand.food_category.ilike(f"%{food}%"))
        .order_by(SafeBrand.safety_score.desc()).limit(5)
    )
    brands = result.scalars().all()
    return [{"id": b.id, "brand_name": b.brand_name, "food_category": b.food_category,
             "safety_score": b.safety_score, "fssai_license": b.fssai_license,
             "verified": b.verified, "price_range": b.price_range} for b in brands]


# ────────────────────────────────────── fssai
fssai_router = APIRouter()

@fssai_router.get("/alerts")
async def get_fssai_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FssaiViolation).order_by(FssaiViolation.date.desc()).limit(10)
    )
    violations = result.scalars().all()
    return [{"id": v.id, "brand": v.brand, "product": v.product,
             "violation": v.violation, "state": v.state,
             "date": str(v.date)} for v in violations]


# ────────────────────────────────────── users
users_router = APIRouter()

@users_router.get("/{user_id}/stats")
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    total = await db.execute(
        select(func.count()).where(ScanRecord.user_id == user_id)
    )
    high_risk = await db.execute(
        select(func.count()).where(ScanRecord.user_id == user_id,
                                   ScanRecord.risk_level.in_(["HIGH","CRITICAL"]))
    )
    avg_score = await db.execute(
        select(func.avg(ScanRecord.safety_score)).where(ScanRecord.user_id == user_id)
    )
    return {
        "total_scans": total.scalar() or 0,
        "high_risk_count": high_risk.scalar() or 0,
        "avg_safety_score": round(avg_score.scalar() or 0, 1),
    }
