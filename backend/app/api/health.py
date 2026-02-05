"""
Health check API.
"""
from fastapi import APIRouter

from app.core.database import database

router = APIRouter()


@router.get("/health")
async def health():
    db_status = "disconnected"
    if database is not None:
        try:
            await database.command("ping")
            db_status = "connected"
        except Exception:
            pass

    return {
        "status": "ok",
        "database": db_status,
    }
