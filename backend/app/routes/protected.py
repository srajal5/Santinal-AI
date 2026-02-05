"""
Test protected routes for RBAC validation.
"""
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/protected", tags=["protected"])


@router.get("/admin")
async def admin_only(user: dict = Depends(require_roles("admin"))):
    """Only accessible with admin role."""
    return {"success": True, "message": "Admin access granted"}


@router.get("/police")
async def police_only(user: dict = Depends(require_roles("police"))):
    """Only accessible with police role."""
    return {"success": True, "message": "Police access granted"}
