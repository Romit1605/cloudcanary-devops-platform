"""
FastAPI application entrypoint.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.routes import health, projects, deployments, webhooks

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cloudcanary")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("CloudCanary starting up...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")
    yield
    logger.info("CloudCanary shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Lightweight self-healing deployment platform",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, tags=["Health"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(deployments.router, prefix="/api/deployments", tags=["Deployments"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
