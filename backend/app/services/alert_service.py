from datetime import datetime, timezone
import os
from typing import List

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from app.db.mongodb import get_database
from app.models.alert import AlertStatus, SEVERITY_TO_PRIORITY

COLLECTION = "alerts"

# When True, use in-memory alerts instead of MongoDB (no-DB demo mode).
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"
_ALERTS: List[dict] = []


def _doc_to_response(doc: dict) -> dict:
    return {
        "alert_id": str(doc.get("alert_id", doc.get("_id", ""))),
        "incident_id": doc["incident_id"],
        "type": doc["type"],
        "severity": doc["severity"],
        "priority": doc["priority"],
        "status": doc["status"],
        "created_at": doc["created_at"],
        "acknowledged_by": doc.get("acknowledged_by"),
        "acknowledged_at": doc.get("acknowledged_at"),
    }


def _severity_to_priority(severity: str) -> int:
    return SEVERITY_TO_PRIORITY.get(severity.lower(), 1)


async def create_alert(
    incident_id: str,
    type: str,
    severity: str,
) -> dict:
    now = datetime.now(timezone.utc)
    priority = _severity_to_priority(severity)

    if MOCK_NO_DB:
        alert_id = f"alert-{len(_ALERTS) + 1}"
        doc = {
            "alert_id": alert_id,
            "incident_id": incident_id,
            "type": type,
            "severity": severity,
            "priority": priority,
            "status": AlertStatus.NEW.value,
            "created_at": now,
            "acknowledged_by": None,
            "acknowledged_at": None,
        }
        _ALERTS.append(doc)
        return _doc_to_response(doc)

    db = get_database()
    doc = {
        "incident_id": incident_id,
        "type": type,
        "severity": severity,
        "priority": priority,
        "status": AlertStatus.NEW.value,
        "created_at": now,
        "acknowledged_by": None,
        "acknowledged_at": None,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_all_alerts() -> list[dict]:
    if MOCK_NO_DB:
        # Sort by priority desc, then created_at desc
        return sorted(
            (_doc_to_response(a) for a in _ALERTS),
            key=lambda x: (
                _severity_to_priority(x["severity"]),
                x["created_at"],
            ),
            reverse=True,
        )

    db = get_database()
    cursor = (
        db[COLLECTION]
        .find()
        .sort([("priority", -1), ("created_at", -1)])
    )
    return [_doc_to_response(doc) async for doc in cursor]


async def acknowledge_alert(alert_id: str, user_id: str) -> dict:
    if MOCK_NO_DB:
        for a in _ALERTS:
            if a.get("alert_id") == alert_id:
                a["status"] = AlertStatus.ACKNOWLEDGED.value
                a["acknowledged_by"] = user_id
                a["acknowledged_at"] = datetime.now(timezone.utc)
                return _doc_to_response(a)
        raise HTTPException(status_code=404, detail="Alert not found")

    db = get_database()
    try:
        oid = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = datetime.now(timezone.utc)
    result = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {
            "$set": {
                "status": AlertStatus.ACKNOWLEDGED.value,
                "acknowledged_by": user_id,
                "acknowledged_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _doc_to_response(result)
