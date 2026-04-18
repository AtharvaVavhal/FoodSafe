from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from services.ai_service import analyze_symptoms

router = APIRouter()

class SymptomRequest(BaseModel):
    symptoms: str
    recent_foods: Optional[List[str]] = []
    lang: str = "en"

@router.post("/analyze")
async def analyze(req: SymptomRequest):
    return await analyze_symptoms(req.symptoms, req.recent_foods or [], req.lang)