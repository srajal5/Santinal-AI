from app.db.mongodb import get_database

COLLECTION = "directory"


def _doc_to_response(doc: dict) -> dict:
    return {
        "name": doc.get("name"),
        "type": doc.get("type"),
        "phone": doc.get("phone"),
        "address": doc.get("address"),
        "latitude": doc.get("latitude"),
        "longitude": doc.get("longitude"),
    }


async def get_all_entries() -> list[dict]:
    db = get_database()
    cursor = db[COLLECTION].find().sort("type", 1)
    return [_doc_to_response(doc) async for doc in cursor]
