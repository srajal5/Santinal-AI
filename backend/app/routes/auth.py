from fastapi import APIRouter

from app.schemas.auth import LoginRequest
from app.services.auth_service import login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login_endpoint(body: LoginRequest):
    """
    Authenticate user with email and password.
    Returns JWT access token on success.
    """
    return await login(body.email, body.password)
