from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    city: Optional[str] = ""
    lang: str = "en"

@router.get("/{user_id}/stats")
async def get_stats(user_id: str):
    return {"user_id": user_id, "total_scans": 0, "high_risk_scans": 0}