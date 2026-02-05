"""
FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token_or_raise
from app.models.user import ALLOWED_ROLES

# Bearer token scheme for Authorization header
security = HTTPBearer(auto_error=False)


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
