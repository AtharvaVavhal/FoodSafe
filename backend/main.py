from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.database import init_db
from routers import scan, symptoms, community, brands, fssai, users, whatsapp

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🌿 FoodSafe API starting...")
    await init_db()
    print("✅ Database tables ready")
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

app.include_router(scan.router,       prefix="/api/scan",      tags=["Scan"])
app.include_router(symptoms.router,   prefix="/api/symptoms",  tags=["Symptoms"])
app.include_router(community.router,  prefix="/api/community", tags=["Community"])
app.include_router(brands.router,     prefix="/api/brands",    tags=["Brands"])
app.include_router(fssai.router,      prefix="/api/fssai",     tags=["FSSAI"])
app.include_router(users.router,      prefix="/api/users",     tags=["Users"])
app.include_router(whatsapp.router,   prefix="/api/whatsapp",  tags=["WhatsApp Bot"])

@app.get("/")
async def root():
    return {"message": "FoodSafe API is running", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}