from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import UserLogin
from app.services.auth_service import login

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login_endpoint(body: UserLogin):
    result = await login(body.email, body.password)
    return result


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"email": user.get("email", ""), "role": user.get("role", "")}
