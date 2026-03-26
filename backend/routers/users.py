from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import hashlib, hmac, secrets, logging
from jose import JWTError, jwt

from core.config import settings
from db.database import get_db
from models.models import User, ScanRecord

logger = logging.getLogger(__name__)

router  = APIRouter()

# PBKDF2-based password hashing (no C extensions needed, OWASP recommended)
_PW_ITERATIONS = 260_000

def _hash_pw(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), _PW_ITERATIONS)
    return f"{salt}${h.hex()}"

def _verify_pw(password: str, hashed: str) -> bool:
    if not hashed or '$' not in hashed:
        return False
    salt, h = hashed.split('$', 1)
    computed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), _PW_ITERATIONS)
    return hmac.compare_digest(computed.hex(), h)

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

class SyncScanRequest(BaseModel):
    food_name:    str
    risk_level:   Optional[str] = None
    safety_score: Optional[int] = None
    scanned_at:   Optional[str] = None

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
    if not req.email or not req.email.strip():
        raise HTTPException(400, "Email is required")
    if not req.password or len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not req.name or not req.name.strip():
        raise HTTPException(400, "Name is required")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(
        name      = req.name.strip(),
        email     = req.email.strip().lower(),
        hashed_pw = _hash_pw(req.password),
        city      = req.city,
        lang      = req.lang,
    )
    db.add(user)
    await db.flush()
    await db.commit()
    logger.info("User registered: %s (%s)", user.email, user.id)
    return TokenResponse(
        access_token = create_token(user.id),
        user_id      = user.id,
        name         = user.name,
    )

# ── Login ─────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.strip().lower()))
    user   = result.scalar_one_or_none()
    if not user or not _verify_pw(req.password, user.hashed_pw or ""):
        logger.warning("Failed login attempt for: %s", req.email)
        raise HTTPException(401, "Invalid email or password")
    logger.info("User logged in: %s (%s)", user.email, user.id)
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

# ── Sync scan to DB ───────────────────────────────────────
@router.post("/sync-scan")
async def sync_scan(
    req:  SyncScanRequest,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    if not req.food_name.strip():
        raise HTTPException(400, "food_name is required")

    # 1. Parse and clean the date for duplicate checking
    # We use utcnow() to keep it naive
    record_date = datetime.utcnow()
    
    if req.scanned_at:
        try:
            # Parse the ISO string (e.g., from JavaScript's .toISOString())
            dt = datetime.fromisoformat(req.scanned_at.replace("Z", "+00:00"))
            # FIX: Convert from 'Aware' to 'Naive' to match Postgres column
            record_date = dt.replace(tzinfo=None)
        except (ValueError, TypeError):
            record_date = datetime.utcnow()

    scanned_date_str = record_date.date().isoformat()

    # 2. Avoid duplicate: same user + same food + same day
    existing = await db.execute(
        select(ScanRecord).where(
            ScanRecord.user_id   == user.id,
            ScanRecord.food_name == req.food_name.strip(),
        )
    )
    records = existing.scalars().all()
    for r in records:
        if r.created_at and r.created_at.date().isoformat() == scanned_date_str:
            return {"success": True, "skipped": True, "reason": "duplicate"}

    # 3. Save the new record
    db.add(ScanRecord(
        user_id      = user.id,
        food_name    = req.food_name.strip(),
        risk_level   = req.risk_level,
        safety_score = req.safety_score,
        scan_type    = "text",
        created_at   = record_date  # This is now a clean 'Naive' datetime
    ))
    
    await db.flush()
    await db.commit()
    return {"success": True, "skipped": False}

# ── Get scan history from DB ──────────────────────────────
@router.get("/scan-history")
async def get_scan_history(
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScanRecord)
        .where(ScanRecord.user_id == user.id)
        .order_by(ScanRecord.created_at.desc())
        .limit(100)
    )
    scans = result.scalars().all()
    return {
        "scans": [
            {
                "id":           s.id,
                "food_name":    s.food_name,
                "risk_level":   s.risk_level,
                "safety_score": s.safety_score,
                "date":         s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans
        ],
        "total": len(scans),
    }

# ── Stats (requires auth — only own stats) ───────────────
@router.get("/{user_id}/stats")
async def get_stats(
    user_id: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    if user.id != user_id:
        raise HTTPException(403, "Cannot access another user's stats")
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
    await db.commit()
    return {"success": True}