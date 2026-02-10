"""
FastAPI dependencies for authentication and authorization.

This module supports both:
1. Legacy JWT authentication (when Clerk is not configured)
2. Clerk JWT authentication (when CLERK_SECRET_KEY is set)
"""
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import CLERK_IS_ENABLED
from app.core.security import decode_access_token_or_raise
from app.core.clerk_auth import (
    get_current_user_clerk,
    get_optional_user_clerk,
    require_roles_clerk,
)
from app.models.user import ALLOWED_ROLES

# Legacy support - these are used when Clerk is not configured
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"

# Bearer token scheme for Authorization header
security = HTTPBearer(auto_error=False)

DEMO_USER = {
    "sub": "demo",
    "email": "demo@sentinel.local",
    "role": "admin",
    "permissions": ["VIEW", "RESPOND", "DISPATCH"],
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Get the current authenticated user.
    
    When Clerk is configured (CLERK_SECRET_KEY set), uses Clerk authentication.
    Otherwise, falls back to legacy JWT or demo mode.
    """
    if CLERK_IS_ENABLED:
        return await get_current_user_clerk(credentials)
    
    # Legacy: Use original JWT-based authentication
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token.",
        )
    payload = decode_access_token_or_raise(credentials.credentials)
    # Ensure role is normalized for downstream use
    role = payload.get("role", "").lower() if payload.get("role") else ""
    if role and role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role is no longer valid. Please log in again.",
        )
    payload["role"] = role
    return payload


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """
    Extract and validate JWT if present. Returns None if missing or invalid.
    
    When Clerk is configured, uses Clerk authentication.
    Otherwise, falls back to legacy JWT or demo mode.
    """
    if CLERK_IS_ENABLED:
        return await get_optional_user_clerk(credentials)
    
    # Legacy: Use original optional user logic
    if not credentials:
        return None
    try:
        payload = decode_access_token_or_raise(credentials.credentials)
        role = (payload.get("role") or "").lower()
        if role not in ALLOWED_ROLES:
            return None
        payload["role"] = role
        return payload
    except Exception:
        return None


async def get_user_or_demo(
    optional_user: dict | None = Depends(get_optional_user),
) -> dict:
    """
    Return optional_user if valid, else demo user (no 401).
    When Clerk is configured, always requires authentication.
    """
    if CLERK_IS_ENABLED:
        if optional_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated. Provide a valid Bearer token.",
            )
        return optional_user
    
    # Legacy: Return demo user in mock mode
    if MOCK_NO_DB:
        return optional_user if optional_user else DEMO_USER
    if optional_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token.",
        )
    return optional_user


def require_roles(*allowed_roles: str):
    """
    Dependency factory: protect route to only allow specified roles.
    
    When Clerk is configured, uses Clerk-based role checking.
    Otherwise, uses legacy role checking.
    
    Example:
        @router.get("/admin-only", dependencies=[Depends(require_roles("admin"))])
        async def admin_route(user: dict = Depends(get_current_user)):
            ...
    """
    if CLERK_IS_ENABLED:
        return require_roles_clerk(*allowed_roles)
    
    # Legacy: Use original role checker
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role", "").lower()
        allowed = {r.lower() for r in allowed_roles}
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role(s): {', '.join(sorted(allowed))}.",
            )
        return user

    return role_checker
