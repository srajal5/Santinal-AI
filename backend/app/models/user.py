from enum import Enum

from pydantic import BaseModel, EmailStr


class Role(str, Enum):
    """Allowed roles for role-based access control."""

    ADMIN = "admin"
    POLICE = "police"
    AUTHORITY = "authority"


# All valid roles as set for fast lookup
ALLOWED_ROLES = {r.value for r in Role}


class UserLogin(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    password: str


class UserInDB(BaseModel):
    """Schema for user as stored in the database. Never expose in API responses."""

    id: str
    email: EmailStr
    hashed_password: str
    role: str = Role.ADMIN.value
    permissions: list[str] = ["VIEW", "RESPOND", "DISPATCH"]
    is_active: bool = True
