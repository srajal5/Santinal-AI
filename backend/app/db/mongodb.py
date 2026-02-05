from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import DATABASE_NAME, MONGODB_URI

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_database() -> AsyncIOMotorDatabase:
    """
    Return the MongoDB database instance. Creates the connection on first call (singleton).
    Async-safe: Motor client is thread-safe and designed for async use.
    """
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
        _db = _client[DATABASE_NAME]
    return _db
