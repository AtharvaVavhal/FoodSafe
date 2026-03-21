from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.core.config import settings
from app.db.database import get_db
from models.models import User, ScanRecord

router  = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)

# ── Schemas ───────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str
    city:     Optional[str] = ""
    lang:     str = "en"

class LoginRequest(BaseModel):
    email:    str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    name:         str

# ── JWT helpers ───────────────────────────────────────────
def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

# ── Auth dependency ───────────────────────────────────────
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db:    AsyncSession = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    user_id = decode_token(creds.credentials)
    result  = await db.execute(select(User).where(User.id == user_id))
    user    = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")
    return user

# ── Register ──────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(
        name      = req.name,
        email     = req.email,
        hashed_pw = pwd_ctx.hash(req.password),
        city      = req.city,
        lang      = req.lang,
    )
    db.add(user)
    await db.flush()
    return TokenResponse(
        access_token = create_token(user.id),
        user_id      = user.id,
        name         = user.name,
    )

# ── Login ─────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user   = result.scalar_one_or_none()
    if not user or not pwd_ctx.verify(req.password, user.hashed_pw or ""):
        raise HTTPException(401, "Invalid email or password")
    return TokenResponse(
        access_token = create_token(user.id),
        user_id      = user.id,
        name         = user.name,
    )

# ── Me ────────────────────────────────────────────────────
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "city":       user.city,
        "lang":       user.lang,
        "created_at": user.created_at,
    }

# ── Stats ─────────────────────────────────────────────────
@router.get("/{user_id}/stats")
async def get_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScanRecord).where(ScanRecord.user_id == user_id)
    )
    scans = result.scalars().all()
    total = len(scans)
    high  = sum(1 for s in scans if s.risk_level in ["HIGH", "CRITICAL"])
    avg   = round(sum(s.safety_score or 0 for s in scans) / total) if total else 0
    return {
        "user_id":          user_id,
        "total_scans":      total,
        "high_risk_scans":  high,
        "avg_safety_score": avg,
    }

# ── Update profile ────────────────────────────────────────
@router.patch("/me")
async def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    allowed = {"name", "city", "lang"}
    for key, val in data.items():
        if key in allowed:
            setattr(user, key, val)
    return {"success": True}