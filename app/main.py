import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models
from app.database import Base, engine
from app.router import targets
from app.scheduler import scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="ApiPulse",
    description="API Monitoring and Automated Testing Platform",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)

app.include_router(targets.router)


@app.get("/")
def home():
    return {"message": "Welcome to ApiPulse!", "status": "running"}


@app.get("/health", tags=["health"])
def health_check():
    """Render readiness probe; report the active SQLAlchemy backend as well."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:
        raise HTTPException(status_code=503, detail="Database connection failed") from error
    return {
        "status": "healthy",
        "database": "connected",
        "database_type": engine.url.get_backend_name(),
    }
