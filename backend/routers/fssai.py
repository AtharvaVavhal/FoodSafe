from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from models.models import FssaiViolation

router = APIRouter()

STATIC_ALERTS = [
    {"title": "MDH spices flagged for pesticide residue (ethylene oxide)", "date": "Apr 2024", "severity": "HIGH"},
    {"title": "Everest Fish Curry Masala recalled — ethylene oxide contamination", "date": "Apr 2024", "severity": "HIGH"},
    {"title": "Loose turmeric samples fail lead chromate tests in Maharashtra", "date": "Mar 2024", "severity": "HIGH"},
    {"title": "83% paneer samples fail quality in UP cities", "date": "Feb 2024", "severity": "MEDIUM"},
    {"title": "Honey adulteration with HFCS — NMR tests recommended", "date": "Jan 2024", "severity": "MEDIUM"},
    {"title": "Argemone oil in mustard oil detected in Rajasthan", "date": "Jan 2024", "severity": "HIGH"},
]

@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FssaiViolation).order_by(FssaiViolation.created_at.desc()).limit(50)
    )
    violations = result.scalars().all()

    if violations:
        alerts = [
            {
                "title": v.violation[:100] if v.violation else v.product[:100],
                "date":     v.date.strftime("%b %Y") if v.date else "Recent",
                "severity": "HIGH" if any(w in (v.violation or "").lower()
                             for w in ["lead", "pesticide", "carcinogen", "unsafe", "sudan", "argemone"])
                             else "MEDIUM",
                "state":    v.state,
                "brand":    v.brand,
                "product":  v.product,
            }
            for v in violations
        ]
    else:
        alerts = STATIC_ALERTS

    return {"alerts": alerts}

@router.get("/violations")
async def get_violations(state: str = "", product: str = "", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FssaiViolation).order_by(FssaiViolation.created_at.desc())
    )
    violations = result.scalars().all()
    data = [
        {
            "id":        v.id,
            "brand":     v.brand,
            "product":   v.product,
            "violation": v.violation,
            "state":     v.state,
            "date":      v.date.isoformat() if v.date else None,
        }
        for v in violations
        if (not state   or (v.state   and state.lower()   in v.state.lower()))
        and (not product or (v.product and product.lower() in v.product.lower()))
    ]
    return {"violations": data, "total": len(data)}