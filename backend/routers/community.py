from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ReportCreate(BaseModel):
    food_name: str
    city: str
    description: str
    brand: Optional[str] = None
    state: Optional[str] = "Maharashtra"

@router.get("/reports")
async def get_reports(city: str = ""):
    return {"reports": [], "city": city}

@router.post("/report")
async def submit_report(req: ReportCreate):
    return {"success": True, "message": "Report submitted"}