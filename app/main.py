import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app import models
from app.database import Base, engine
from app.models import User
from app.router import targets
from app.router.auth import router as auth_router
from app.scheduler import scheduler, start_scheduler


def ensure_target_owner_column() -> None:
    """Add ownership to existing target tables without deleting existing records."""
    inspector = inspect(engine)
    if "targets" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("targets")}
    if "user_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE targets ADD COLUMN user_id INTEGER REFERENCES users(id)"
            ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine, tables=[User.__table__])
    ensure_target_owner_column()
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="ApiPulse",
    description="API Monitoring and Observability Dashboard with authenticated workspaces",
    version="2.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "Authorization"],
)
app.include_router(auth_router)
app.include_router(targets.router)


@app.get("/")
def home():
    return {"message": "Welcome to ApiPulse!", "status": "running"}


@app.get("/health", tags=["health"])
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:
        raise HTTPException(status_code=503, detail="Database connection failed") from error
    return {"status": "healthy", "database": "connected", "database_type": engine.url.get_backend_name()}
