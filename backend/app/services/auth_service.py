import os

from fastapi import HTTPException

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import create_access_token, verify_password
from app.db.mongodb import get_database
from app.models.user import ALLOWED_ROLES


# When True we skip MongoDB and use a hard-coded demo user for login.
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"


async def login(email: str, password: str) -> dict:
    """
    Authenticate user with email and password.

    In MOCK_NO_DB mode (default), this accepts any non-empty email/password and returns
    an admin token without touching MongoDB. This is useful for local demos when
    MongoDB is not running.
    """
    if MOCK_NO_DB:
        if not email or not password:
            raise HTTPException(status_code=401, detail="Email and password are required.")

        # Single demo admin user
        user_id = "demo-admin"
        role = "admin"
        permissions = ["VIEW", "RESPOND", "DISPATCH"]
        token_data = {
            "sub": user_id,
            "user_id": user_id,
            "email": email,
            "role": role,
            "permissions": permissions,
        }
        access_token = create_access_token(token_data, ACCESS_TOKEN_EXPIRE_MINUTES)
        return {"access_token": access_token, "token_type": "bearer"}

    # Real DB-backed login (requires MongoDB running)
    db = get_database()
    user_doc = await db.users.find_one({"email": email})

    if not user_doc:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    hashed_password = user_doc.get("hashed_password")
    if not hashed_password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )
    if not verify_password(password, hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=401,
            detail="Account has been disabled. Contact an administrator.",
        )

    # Validate role is one of: admin, police, authority
    role_raw = user_doc.get("role", "admin")
    role = role_raw.lower() if isinstance(role_raw, str) else str(role_raw).lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Invalid role '{role_raw}'. Allowed roles: admin, police, authority.",
        )

    user_id = str(user_doc["_id"])
    email = user_doc.get("email", "")
    permissions = user_doc.get("permissions", ["VIEW", "RESPOND", "DISPATCH"])

    # Access token must include user_id (sub), role, email for /auth/me
    token_data = {
        "sub": user_id,
        "user_id": user_id,
        "email": email,
        "role": role,
        "permissions": permissions,
    }
    access_token = create_access_token(token_data, ACCESS_TOKEN_EXPIRE_MINUTES)

    return {"access_token": access_token, "token_type": "bearer"}
