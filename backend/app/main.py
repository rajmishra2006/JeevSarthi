from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.api import api_router
from app.services.seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed demo data if database is fresh
    db = SessionLocal()
    try:
        seed_database(db, reset=False)
    finally:
        db.close()
    yield

app = FastAPI(
    title=f"{settings.PROJECT_NAME} - Emergency Management API",
    description=f"{settings.TAGLINE} Complete end-to-end hackathon demo platform.",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "tagline": settings.TAGLINE,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }
