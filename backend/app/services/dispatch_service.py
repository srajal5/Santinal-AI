from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongodb import get_database
from app.models.dispatch import DispatchStatus, ServiceType

COLLECTION = "dispatches"


def _doc_to_response(doc: dict) -> dict:
    return {
        "dispatch_id": str(doc["_id"]),
        "incident_id": doc["incident_id"],
        "service_type": doc["service_type"],
        "unit_name": doc["unit_name"],
        "status": doc["status"],
        "eta_minutes": doc["eta_minutes"],
        "created_at": doc["created_at"],
    }


async def create_dispatch(
    incident_id: str,
    service_type: ServiceType,
    unit_name: str,
    eta_minutes: int,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "incident_id": incident_id,
        "service_type": service_type.value,
        "unit_name": unit_name,
        "status": DispatchStatus.DISPATCHED.value,
        "eta_minutes": eta_minutes,
        "created_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_all_dispatches() -> list[dict]:
    db = get_database()
    cursor = db[COLLECTION].find().sort("created_at", -1)
    return [_doc_to_response(doc) async for doc in cursor]


async def get_dispatch_by_incident(incident_id: str) -> dict | None:
    db = get_database()
    doc = await db[COLLECTION].find_one(
        {"incident_id": incident_id},
        sort=[("created_at", -1)],
    )
    return _doc_to_response(doc) if doc else None
