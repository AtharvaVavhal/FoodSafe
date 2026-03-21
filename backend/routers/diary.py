"""
backend/routers/diary.py

Dedicated endpoint for AI-powered diary insights.
Replaces the hack of calling /scan/text with "DIARY_ANALYSIS:" prefix.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.ai_service import _call_groq

router = APIRouter()


class DiaryInsightRequest(BaseModel):
    scan_history: list   # [{ food, risk, score }]
    lang: str = "en"
    condition: Optional[str] = None


@router.post("/insights")
async def get_diary_insights(req: DiaryInsightRequest):
    """
    Analyze user's scan history and return personalized food safety insights.
    All data comes from the user's actual scan history — nothing hardcoded.
    """
    if len(req.scan_history) < 2:
        return {
            "main": "Scan at least 2 foods to get personalized insights.",
            "warning": None,
            "tip": None,
            "riskPattern": None,
        }

    lang_note = (
        "Respond in Hindi." if req.lang == "hi" else
        "Respond in Marathi." if req.lang == "mr" else ""
    )
    condition_ctx = f"\nUser health condition: {req.condition}" if req.condition else ""

    system = f"You are a food safety advisor for Indian families. Respond ONLY with valid JSON, no markdown. {lang_note}"
    user = f"""Analyze this user's recent food scan history and give personalized safety advice.{condition_ctx}

Scan history (last {len(req.scan_history)} scans):
{req.scan_history}

Return ONLY this JSON:
{{
  "main": "2-sentence personalized insight based on their specific scan pattern",
  "warning": null or "specific warning if they repeatedly scan high-risk foods",
  "tip": "one actionable buying tip based on their most scanned food",
  "riskPattern": null or "name of concerning pattern if any e.g. eating high-risk spices daily",
  "safeSwap": null or "suggest a safer alternative if they have risky items"
}}"""

    try:
        result = _call_groq(system, user, max_tokens=500)
        return result
    except Exception as e:
        return {
            "main": "Could not generate insights. Try again later.",
            "warning": None,
            "tip": None,
            "riskPattern": None,
            "error": str(e),
        }