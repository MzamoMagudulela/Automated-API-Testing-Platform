from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.init_db import init_database
from app.routers import (
    dashboard,
    execute,
    test_cases,
    test_collections,
    environments,
    history,
    reports,
    settings as settings_router,
    mock_api,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Automated REST API Testing, Monitoring & Assertion Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
def on_startup():
    init_database()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(execute.router, prefix=settings.API_V1_STR)
app.include_router(test_cases.router, prefix=settings.API_V1_STR)
app.include_router(test_collections.router, prefix=settings.API_V1_STR)
app.include_router(environments.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(mock_api.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to API TestLab Backend",
        "docs": "/docs",
        "health": "/health",
    }
