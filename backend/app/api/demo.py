"""Demo endpoints - no auth for seeding."""
from fastapi import APIRouter

from app.core.demo_seed import seed_demo_data

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
async def demo_seed():
    """Seed demo data if collections are empty. Public endpoint."""
    return await seed_demo_data()
