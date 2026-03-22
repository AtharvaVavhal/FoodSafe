from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.db.database import get_db
from models.models import User, ScanRecord
from services.ai_service import _call_groq
from services.overconsumption_service import build_weekly_digest

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Auth helper ───────────────────────────────────────────────────────────────

async def get_required_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> User:
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


# ── Schemas ────────────────────────────────────────────────────────────────────

class DiaryInsightRequest(BaseModel):
    scan_history: list           # [{ food, risk, score }]
    lang:         str            = "en"
    condition:    Optional[str]  = None


# ── Insights (requires auth) ──────────────────────────────────────────────────
@router.post("/insights")
async def get_diary_insights(
    req:  DiaryInsightRequest,
    user: User = Depends(get_required_user),
):
    """
    Analyze the user's scan history and return personalized food safety insights.
    Requires authentication — diary data is personal.
    """
    if len(req.scan_history) < 2:
        return {
            "main":        "Scan at least 2 foods to get personalized insights.",
            "warning":     None,
            "tip":         None,
            "riskPattern": None,
        }

    lang_note = (
        "Respond in Hindi."   if req.lang == "hi" else
        "Respond in Marathi." if req.lang == "mr" else ""
    )
    condition_ctx = f"\nUser health condition: {req.condition}" if req.condition else ""

    system = (
        f"You are a food safety advisor for Indian families. "
        f"Respond ONLY with valid JSON, no markdown. {lang_note}"
    )
    user_prompt = f"""Analyze this user's recent food scan history and give personalized safety advice.{condition_ctx}

Scan history (last {len(req.scan_history)} scans):
{req.scan_history}

Return ONLY this JSON:
{{
  "main":        "2-sentence personalized insight based on their specific scan pattern",
  "warning":     null or "specific warning if they repeatedly scan high-risk foods",
  "tip":         "one actionable buying tip based on their most scanned food",
  "riskPattern": null or "name of concerning pattern if any e.g. eating high-risk spices daily",
  "safeSwap":    null or "suggest a safer alternative if they have risky items"
}}"""

    try:
        return _call_groq(system, user_prompt, max_tokens=500)
    except Exception as e:
        return {
            "main":        "Could not generate insights. Try again later.",
            "warning":     None,
            "tip":         None,
            "riskPattern": None,
            "error":       str(e),
        }


# ── Overconsumption digest (requires auth) ────────────────────────────────────
@router.get("/overconsumption")
async def get_overconsumption_digest(
    days: int         = 7,
    user: User        = Depends(get_required_user),
    db:   AsyncSession = Depends(get_db),
):
    """
    Returns a weekly overconsumption digest for the authenticated user.

    Query param:
        days — how many days to look back (default 7, max 30)
    """
    days = min(max(days, 1), 30)
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = await db.execute(
        select(ScanRecord.food_name, ScanRecord.created_at)
        .where(ScanRecord.user_id == user.id)
        .where(ScanRecord.created_at >= cutoff)
        .order_by(ScanRecord.created_at.desc())
        .limit(500)
    )
    scan_records = [
        {"food_name": r.food_name, "created_at": r.created_at}
        for r in rows.all()
    ]

    digest = build_weekly_digest(scan_records)
    digest["userId"]   = user.id
    digest["lookback"] = days
    return digest