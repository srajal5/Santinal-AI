from fastapi import APIRouter, Depends

from app.core.clerk_auth import get_current_user_clerk
from app.core.config import CLERK_IS_ENABLED
from app.models.user import UserLogin
from app.services.auth_service import login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login_endpoint(body: UserLogin):
    """
    Login endpoint.
    
    When Clerk is configured, this endpoint is deprecated as authentication
    is handled by Clerk on the frontend.
    
    For backward compatibility, falls back to the original login logic.
    """
    result = await login(body.email, body.password)
    return result


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user_clerk)):
    """
    Get current authenticated user.
    
    When Clerk is configured, returns user info from Clerk token.
    """
    if CLERK_IS_ENABLED:
        # Return Clerk user info
        return {
            "email": user.get("email", ""),
            "role": user.get("role", "admin"),
            "sub": user.get("sub", ""),
        }
    
    # Fallback for demo mode
    return {"email": user.get("email", ""), "role": user.get("role", "")}


@router.get("/status")
async def auth_status():
    """
    Check authentication configuration status.
    """
    return {
        "clerk_enabled": CLERK_IS_ENABLED,
        "auth_type": "clerk" if CLERK_IS_ENABLED else "demo",
    }
