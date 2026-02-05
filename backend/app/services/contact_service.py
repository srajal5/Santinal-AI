from datetime import datetime, timezone

from bson import ObjectId

from app.db.mongodb import get_database

COLLECTION = "contacts"


def _doc_to_response(doc: dict) -> dict:
    return {
        "contact_id": str(doc["_id"]),
        "incident_id": doc.get("incident_id"),
        "service_type": doc.get("service_type"),
        "service_name": doc.get("service_name"),
        "created_at": doc.get("created_at"),
    }


async def create_contact(incident_id: str, service_type: str, service_name: str) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "incident_id": incident_id,
        "service_type": service_type,
        "service_name": service_name,
        "created_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_contacts_by_incident(incident_id: str) -> list[dict]:
    db = get_database()
    cursor = db[COLLECTION].find({"incident_id": incident_id}).sort("created_at", -1)
    return [_doc_to_response(doc) async for doc in cursor]
