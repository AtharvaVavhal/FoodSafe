from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import init_db

from routers import (
    scan, symptoms, community, brands, fssai,
    users, whatsapp, recommendations, festival,
    meal_planner, push, admin, diary, news, chat,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🌿 FoodSafe API starting...")

    try:
        await init_db()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"⚠ DB init skipped: {e}")

    yield
    print("🌿 FoodSafe API shutting down...")

app = FastAPI(
    title="FoodSafe API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api/scan")
app.include_router(symptoms.router, prefix="/api/symptoms")
app.include_router(community.router, prefix="/api/community")
app.include_router(brands.router, prefix="/api/brands")
app.include_router(fssai.router, prefix="/api/fssai")
app.include_router(users.router, prefix="/api/users")
app.include_router(whatsapp.router, prefix="/api/whatsapp")
app.include_router(recommendations.router, prefix="/api/recommendations")
app.include_router(meal_planner.router, prefix="/api/meal-planner")
app.include_router(festival.router, prefix="/api/festival")
app.include_router(push.router, prefix="/api/push")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(diary.router, prefix="/api/diary")
app.include_router(news.router, prefix="/api/news")
app.include_router(chat.router, prefix="/api/chat")

@app.get("/")
async def root():
    return {"message": "FoodSafe API is running"}