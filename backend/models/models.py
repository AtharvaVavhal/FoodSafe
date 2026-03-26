from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.db.database import Base

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=gen_id)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True)
    hashed_pw     = Column(String)
    city          = Column(String, default="")
    state         = Column(String, default="Maharashtra")
    lang          = Column(String, default="en")
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    scans         = relationship("ScanRecord", back_populates="user")
    members       = relationship("FamilyMember", back_populates="user")
    push_subs     = relationship("PushSubscriptionRecord", back_populates="user")

class FamilyMember(Base):
    __tablename__ = "family_members"
    id            = Column(String, primary_key=True, default=gen_id)
    user_id       = Column(String, ForeignKey("users.id"))
    name          = Column(String, nullable=False)
    age           = Column(Integer)
    conditions    = Column(JSON, default=list)
    avatar_color  = Column(String, default="green")
    user          = relationship("User", back_populates="members")

class ScanRecord(Base):
    __tablename__ = "scan_records"
    id            = Column(String, primary_key=True, default=gen_id)
    user_id       = Column(String, ForeignKey("users.id"))
    member_id     = Column(String, nullable=True)
    food_name     = Column(String, nullable=False)
    risk_level    = Column(String)
    safety_score  = Column(Integer)
    result_json   = Column(JSON)
    scan_type     = Column(String, default="text")
    city          = Column(String)
    feedback      = Column(String, nullable=True)
    feedback_note = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user          = relationship("User", back_populates="scans")

class CommunityReport(Base):
    __tablename__ = "community_reports"
    id            = Column(String, primary_key=True, default=gen_id)
    food_name     = Column(String, nullable=False)
    brand         = Column(String)
    city          = Column(String, nullable=False)
    state         = Column(String)
    description   = Column(Text)
    verified      = Column(Boolean, default=False)
    upvotes       = Column(Integer, default=0)
    lat           = Column(Float)
    lng           = Column(Float)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FssaiViolation(Base):
    __tablename__ = "fssai_violations"
    id            = Column(String, primary_key=True, default=gen_id)
    brand         = Column(String)
    product       = Column(String)
    violation     = Column(Text)
    state         = Column(String)
    date          = Column(DateTime)
    source_url    = Column(String)
    raw_text      = Column(Text)
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SafeBrand(Base):
    __tablename__ = "safe_brands"
    id            = Column(String, primary_key=True, default=gen_id)
    food_category = Column(String, index=True)
    brand_name    = Column(String)
    safety_score  = Column(Integer)
    fssai_license = Column(String)
    verified      = Column(Boolean, default=False)
    price_range   = Column(String)
    notes         = Column(Text)

class PushSubscriptionRecord(Base):
    __tablename__ = "push_subscriptions"
    id         = Column(String, primary_key=True, default=gen_id)
    user_id    = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    endpoint   = Column(Text, unique=True, nullable=False)
    keys       = Column(JSON, nullable=False)   # {"p256dh": "...", "auth": "..."}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user       = relationship("User", back_populates="push_subs")