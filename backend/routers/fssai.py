from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from models.models import FssaiViolation
from services.ai_service import _call_groq

router = APIRouter()


async def _ai_fssai_alerts() -> list:
    """
    Generate current FSSAI-style alerts via Groq asynchronously.
    FIXED: Changed to 'async def' and added 'await' for the Groq call.
    """
    system = "You are an Indian food safety expert. Respond ONLY with valid JSON, no markdown."
    user = """List the 6 most recent and significant food adulteration alerts in India.
Base on real FSSAI violation patterns for the current season.

Return ONLY this JSON:
{
  "alerts": [
    {
      "title": "concise alert title",
      "date": "Month Year",
      "severity": "HIGH|MEDIUM|LOW",
      "state": "state name",
      "brand": "brand name or null",
      "product": "product name"
    }
  ]
}"""
    try:
        # FIXED: Added 'await' to resolve the coroutine
        result = await _call_groq(system, user, max_tokens=800)
        return result.get("alerts", [])
    except Exception:
        return []


@router.get("/alerts")
async def get_alerts(db: AsyncSession = Depends(get_db)):
    """
    Fetch alerts from database or generate them via AI if the DB is empty.
    """
    result = await db.execute(
        select(FssaiViolation).order_by(FssaiViolation.created_at.desc()).limit(50)
    )
    violations = result.scalars().all()

    if violations:
        alerts = [
            {
                "title":    v.violation[:100] if v.violation else v.product[:100],
                "date":     v.date.strftime("%b %Y") if v.date else "Recent",
                "severity": "HIGH" if any(
                    w in (v.violation or "").lower()
                    for w in ["lead", "pesticide", "carcinogen", "unsafe", "sudan", "argemone"]
                ) else "MEDIUM",
                "state":   v.state,
                "brand":   v.brand,
                "product": v.product,
            }
            for v in violations
        ]
    else:
        # FIXED: Added 'await' because _ai_fssai_alerts is now async
        alerts = await _ai_fssai_alerts()

    return {"alerts": alerts}


# ── Violations (with SQL-side filtering + pagination) ─────────────────────────
@router.get("/violations")
async def get_violations(
    state:  str = "",
    product: str = "",
    limit:  int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(FssaiViolation).order_by(FssaiViolation.date.desc())
    if state:
        query = query.where(FssaiViolation.state.ilike(f"%{state}%"))
    if product:
        query = query.where(FssaiViolation.product.ilike(f"%{product}%"))
    query = query.limit(min(limit, 200)).offset(offset)

    result = await db.execute(query)
    violations = result.scalars().all()
    data = [
        {
            "id":         v.id,
            "brand":      v.brand,
            "product":    v.product,
            "violation":  v.violation,
            "state":      v.state,
            "date":       v.date.isoformat() if v.date else None,
            "source_url": v.source_url,
        }
        for v in violations
    ]
    return {"violations": data, "count": len(data), "offset": offset}