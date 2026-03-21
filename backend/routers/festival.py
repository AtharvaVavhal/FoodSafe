from fastapi import APIRouter
from datetime import datetime
from services.ai_service import _call_groq

router = APIRouter()

FESTIVAL_CALENDAR = {
    1:  {"name": "Makar Sankranti", "icon": "🌾"},
    3:  {"name": "Holi",            "icon": "🎨"},
    4:  {"name": "Gudi Padwa",      "icon": "🪅"},
    8:  {"name": "Ganesh Chaturthi","icon": "🐘"},
    9:  {"name": "Navratri",        "icon": "🌺"},
    10: {"name": "Diwali Season",   "icon": "🪔"},
    11: {"name": "Diwali Season",   "icon": "🪔"},
}

@router.get("/current")
async def get_current_festival():
    month = datetime.now().month
    festival = FESTIVAL_CALENDAR.get(month, {"name": "General Season", "icon": "🍽"})
    month_name = datetime.now().strftime("%B")

    system = "You are a food safety expert for India. Respond ONLY with valid JSON, no markdown."
    user = f"""It is {month_name} in India. The festival/season is: {festival['name']}.

Return food safety guidance for this season as ONLY this JSON:
{{
  "festival": "{festival['name']}",
  "icon": "{festival['icon']}",
  "month": "{month_name}",
  "risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "headline": "one line describing the main food safety concern this season",
  "riskyFoods": [
    {{"name": "food name", "concern": "specific adulteration concern", "severity": "LOW|MEDIUM|HIGH|CRITICAL"}}
  ],
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3", "tip 4"],
  "allSeasons": [
    {{
      "name": "festival name",
      "months": "month range e.g. Oct-Nov",
      "icon": "emoji",
      "risk": "LOW|MEDIUM|HIGH|CRITICAL",
      "topConcern": "main food concern"
    }}
  ]
}}"""

    try:
        result = _call_groq(system, user, max_tokens=1200)
        return result
    except Exception as e:
        return {
            "festival": festival["name"],
            "icon": festival["icon"],
            "month": month_name,
            "risk": "MEDIUM",
            "headline": "Stay cautious about food quality this season.",
            "riskyFoods": [],
            "tips": ["Buy from FSSAI certified shops", "Check expiry dates", "Prefer sealed packaging"],
            "allSeasons": [],
            "error": str(e),
        }
