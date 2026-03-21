import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ml'))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.database import init_db
from routers import scan, symptoms, community, brands, fssai, users, whatsapp, recommendations
from routers import festival, meal_planner
from routers import festival, meal_planner, push
from routers import admin, diary


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🌿 FoodSafe API starting...")
    await init_db()
    print("✅ Database tables ready")
    try:
        import risk_scorer
        print("✅ Seasonal risk scorer loaded")
    except Exception as e:
        print(f"⚠ Seasonal risk scorer not loaded: {e}")
    try:
        import personalized_scorer
        print("✅ Personalized risk scorer loaded")
    except Exception as e:
        print(f"⚠ Personalized risk scorer not loaded: {e}")
    yield
    print("🌿 FoodSafe API shutting down...")

app = FastAPI(
    title="FoodSafe API",
    description="AI-powered food adulteration detection backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router,             prefix="/api/scan",            tags=["Scan"])
app.include_router(symptoms.router,         prefix="/api/symptoms",        tags=["Symptoms"])
app.include_router(community.router,        prefix="/api/community",       tags=["Community"])
app.include_router(brands.router,           prefix="/api/brands",          tags=["Brands"])
app.include_router(fssai.router,            prefix="/api/fssai",           tags=["FSSAI"])
app.include_router(users.router,            prefix="/api/users",           tags=["Users"])
app.include_router(whatsapp.router,         prefix="/api/whatsapp",        tags=["WhatsApp Bot"])
app.include_router(recommendations.router,  prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(meal_planner.router,     prefix="/api/meal-planner",    tags=["Meal Planner"])
app.include_router(meal_planner.router,     prefix="/api/meal-planner",    tags=["Meal Planner"])
app.include_router(festival.router,         prefix="/api/festival")
app.include_router(push.router, prefix="/api/push", tags=["Push Notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(diary.router, prefix="/api/diary", tags=["Diary"])

@app.get("/")
async def root():
    return {"message": "FoodSafe API is running", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}