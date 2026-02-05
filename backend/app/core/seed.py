import os

from dotenv import load_dotenv

from app.core.security import hash_password
from app.db.mongodb import get_database

load_dotenv()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@sentinel.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


async def seed_admin_user(force: bool = False) -> None:
    try:
        db = get_database()
        existing = await db.users.find_one({"email": ADMIN_EMAIL})
        if existing and not force:
            print("Admin user already exists")
            return
        hashed = hash_password(ADMIN_PASSWORD)
        doc = {
            "email": ADMIN_EMAIL,
            "hashed_password": hashed,
            "role": "admin",
            "is_active": True,
        }
        if existing and force:
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"hashed_password": hashed, "role": "admin", "is_active": True}},
            )
            print("Admin user password reset successfully")
        else:
            await db.users.insert_one(doc)
            print("Admin user created successfully")
    except Exception as e:
        print(f"Seed skipped: {e}")
