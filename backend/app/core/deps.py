"""
FastAPI dependencies for authentication and authorization.
"""
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token_or_raise
from app.models.user import ALLOWED_ROLES

# When True, list endpoints and detect-from-video accept requests without JWT (demo user).
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"

# Bearer token scheme for Authorization header
security = HTTPBearer(auto_error=False)

DEMO_USER = {
    "sub": "demo",
    "email": "demo@sentinel.local",
    "role": "admin",
    "permissions": ["VIEW", "RESPOND", "DISPATCH"],
}


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """
    Extract and validate JWT if present. Returns None if missing or invalid.
    Does not raise 401; used for optional auth in mock mode.
    """
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
    In MOCK_NO_DB mode: return optional_user if valid, else demo user (no 401).
    Otherwise: require valid token (raise 401 if missing/invalid).
    """
    if MOCK_NO_DB:
        return optional_user if optional_user else DEMO_USER
    if optional_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token.",
        )
    return optional_user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Extract and validate JWT from Authorization: Bearer <token>.
    Raises HTTPException 401 if missing, expired, or invalid.
    Returns token payload with user_id (sub), role, permissions.
    """
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


def require_roles(*allowed_roles: str):
    """
    Dependency factory: protect route to only allow specified roles.
    Use after get_current_user. Example:
        @router.get("/admin-only", dependencies=[Depends(require_roles("admin"))])
        async def admin_route(user: dict = Depends(get_current_user)):
            ...
    """

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
