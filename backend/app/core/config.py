"""
Application configuration. All sensitive values MUST be loaded from .env.
Required env vars: MONGODB_URI, DATABASE_NAME, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
Optional env vars: CLERK_SECRET_KEY (for Clerk authentication)
"""
import os

from dotenv import load_dotenv

load_dotenv()


def _get_required(key: str) -> str:
    """Get required env var. Raises if missing."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


def _get_required_int(key: str) -> int:
    """Get required env var as int. Raises if missing or invalid."""
    value = _get_required(key)
    try:
        return int(value)
    except ValueError:
        raise RuntimeError(f"Environment variable {key} must be a valid integer")


# MongoDB - loaded strictly from .env
MONGODB_URI = _get_required("MONGODB_URI")
DATABASE_NAME = _get_required("DATABASE_NAME")

# JWT - loaded from .env
SECRET_KEY = _get_required("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _get_required_int("ACCESS_TOKEN_EXPIRE_MINUTES")

# Clerk Authentication - optional (for Clerk-based auth)
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_IS_ENABLED = CLERK_SECRET_KEY is not None and CLERK_SECRET_KEY.startswith("sk_")
