"""Run manually: python scripts/seed_admin.py (from backend directory)
   Use --force to reset admin password."""
import asyncio
import sys

sys.path.insert(0, ".")
from app.core.seed import seed_admin_user

if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(seed_admin_user(force=force))
