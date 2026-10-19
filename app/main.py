import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Base, engine
from app.router import targets
from app.scheduler import scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="ApiPulse",
    description="API Monitoring and Automated Testing Platform",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(targets.router)


@app.get("/")
def home():
    return {"message": "Welcome to ApiPulse!", "status": "running"}
