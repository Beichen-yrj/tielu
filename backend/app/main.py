from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import models  # noqa: F401
from .auth import ensure_default_admin
from .auth import router as auth_router
from .ai import router as ai_router
from .assessments import router as assessments_router
from .feedback import router as feedback_router
from .hazard_assessments import router as hazard_assessments_router
from .config import get_settings
from .database import Base, engine, get_db
from .schemas import HealthResponse


def ensure_schema_compatibility() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "users" in tables and "avatar_data" not in {column["name"] for column in inspector.get_columns("users")}:
        column_type = "LONGTEXT" if engine.dialect.name == "mysql" else "TEXT"
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE users ADD COLUMN avatar_data {column_type} NULL"))
    if "hazard_assessments" in tables and "bureau" not in {column["name"] for column in inspector.get_columns("hazard_assessments")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE hazard_assessments ADD COLUMN bureau VARCHAR(80) NOT NULL DEFAULT ''"))
    if "hazard_assessments" in tables:
        columns = {column["name"] for column in inspector.get_columns("hazard_assessments")}
        additions = {
            "rectification_photo_name": "VARCHAR(180) NOT NULL DEFAULT ''",
            "rectification_photo_data": "LONGTEXT NULL" if engine.dialect.name == "mysql" else "TEXT NULL",
            "review_result": "VARCHAR(20) NOT NULL DEFAULT ''",
            "review_measured_value": "VARCHAR(100) NOT NULL DEFAULT ''",
            "review_standard_value": "VARCHAR(160) NOT NULL DEFAULT ''",
            "rectification_log": "JSON NULL" if engine.dialect.name == "mysql" else "TEXT NULL",
            "workflow_version": "INTEGER NOT NULL DEFAULT 0",
        }
        missing = {name: definition for name, definition in additions.items() if name not in columns}
        if missing:
            with engine.begin() as connection:
                for name, definition in missing.items():
                    connection.execute(text(f"ALTER TABLE hazard_assessments ADD COLUMN {name} {definition}"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()
    ensure_default_admin()
    yield


settings = get_settings()
app = FastAPI(
    title="铁路危险货物运输双重预防机制平台 API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(feedback_router)
app.include_router(assessments_router)
app.include_router(hazard_assessments_router)
app.include_router(ai_router)


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health(db: Session = Depends(get_db)) -> HealthResponse:
    db.execute(text("SELECT 1"))
    return HealthResponse(status="ok", database="connected")
