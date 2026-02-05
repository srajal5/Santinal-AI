"""
MongoDB connection using Motor. Safe import - no crash if env vars missing.
"""
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "sentinel_new")

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None

try:
    client = AsyncIOMotorClient(MONGODB_URI)
    database = client[DATABASE_NAME]
except Exception:
    client = None
    database = None
