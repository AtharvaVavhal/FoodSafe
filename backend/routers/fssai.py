from fastapi import APIRouter

router = APIRouter()

ALERTS = [
    {"title": "MDH spices flagged for pesticide residue", "date": "Apr 2024", "severity": "HIGH"},
    {"title": "Loose turmeric samples fail lead chromate tests in Maharashtra", "date": "Mar 2024", "severity": "HIGH"},
    {"title": "83% paneer samples fail quality in UP cities", "date": "Feb 2024", "severity": "MEDIUM"},
    {"title": "Honey adulteration with HFCS — NMR tests recommended", "date": "Jan 2024", "severity": "MEDIUM"},
]

@router.get("/alerts")
async def get_alerts():
    return {"alerts": ALERTS}