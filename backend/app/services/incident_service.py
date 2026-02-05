"""
Incident business logic.
"""
from datetime import datetime, timezone
import os
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from app.db.mongodb import get_database
from app.models.incident import (
    IncidentSeverity,
    IncidentStatus,
    IncidentType,
    STATUS_TRANSITIONS,
)
from app.services import alert_service

COLLECTION = "incidents"

# When True, use in-memory incidents instead of MongoDB (no-DB demo mode).
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"
_INCIDENTS: List[dict] = []


def _doc_to_response(doc: dict) -> dict:
    """Convert incident document to API response format."""
    reported_at = doc.get("reported_at") or doc.get("timestamp")
    return {
        "incident_id": str(doc.get("incident_id", doc.get("_id", ""))),
        "type": doc["type"],
        "latitude": doc["latitude"],
        "longitude": doc["longitude"],
        "reported_at": reported_at,
        "severity": doc["severity"],
        "status": doc["status"],
        "reported_by": doc["reported_by"],
    }


async def create_incident(
    type: IncidentType,
    latitude: float,
    longitude: float,
    severity: IncidentSeverity,
    reported_by: str,
) -> dict:
    """Create and store a new incident. Defaults status to open."""
    now = datetime.now(timezone.utc)

    if MOCK_NO_DB:
        incident_id = f"inc-{len(_INCIDENTS) + 1}"
        doc = {
            "incident_id": incident_id,
            "type": type.value,
            "latitude": latitude,
            "longitude": longitude,
            "reported_at": now,
            "severity": severity.value,
            "status": IncidentStatus.OPEN.value,
            "reported_by": reported_by,
        }
        _INCIDENTS.append(doc)
        await alert_service.create_alert(
            incident_id=incident_id,
            type=type.value,
            severity=severity.value,
        )
        return _doc_to_response(doc)

    db = get_database()
    doc = {
        "type": type.value,
        "latitude": latitude,
        "longitude": longitude,
        "reported_at": now,
        "severity": severity.value,
        "status": IncidentStatus.OPEN.value,
        "reported_by": reported_by,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    incident_id = str(result.inserted_id)
    await alert_service.create_alert(
        incident_id=incident_id,
        type=type.value,
        severity=severity.value,
    )
    return _doc_to_response(doc)


async def create_incidents_from_detections(
    detections: List[Dict[str, Any]],
    latitude: float,
    longitude: float,
    reported_by: str,
) -> List[dict]:
    """
    Create one or more incidents based on YOLO detection events.

    Each detection dict is expected to contain:
      - type: "violence" or "accident"
      - box_count: int
      - max_conf: float
      - timestamp_sec: float (optional, informational only for now)
    """
    incidents: List[dict] = []

    # Simple aggregation: one incident per type if at least one detection exists.
    has_violence = any(d.get("type") == "violence" for d in detections)
    has_accident = any(d.get("type") == "accident" for d in detections)

    if has_violence:
        max_boxes = max(
            (int(d.get("box_count", 1)) for d in detections if d.get("type") == "violence"),
            default=1,
        )
        severity = IncidentSeverity.HIGH if max_boxes >= 3 else IncidentSeverity.MEDIUM
        incidents.append(
            await create_incident(
                type=IncidentType.CRIME,
                latitude=latitude,
                longitude=longitude,
                severity=severity,
                reported_by=reported_by,
            )
        )

    if has_accident:
        max_boxes = max(
            (int(d.get("box_count", 1)) for d in detections if d.get("type") == "accident"),
            default=1,
        )
        severity = IncidentSeverity.CRITICAL if max_boxes >= 2 else IncidentSeverity.HIGH
        incidents.append(
            await create_incident(
                type=IncidentType.ACCIDENT,
                latitude=latitude,
                longitude=longitude,
                severity=severity,
                reported_by=reported_by,
            )
        )

    return incidents


async def get_all_incidents() -> list[dict]:
    """Fetch all incidents."""
    if MOCK_NO_DB:
        # Sort by reported_at desc
        return sorted(
            (_doc_to_response(i) for i in _INCIDENTS),
            key=lambda x: x["reported_at"],
            reverse=True,
        )

    db = get_database()
    cursor = db[COLLECTION].find().sort(
        [("reported_at", -1), ("timestamp", -1)]
    )
    return [_doc_to_response(doc) async for doc in cursor]


async def update_incident_status(incident_id: str, status: IncidentStatus) -> dict:
    """Update incident status. Validates transitions. Returns updated incident or raises 404/400."""
    if MOCK_NO_DB:
        for inc in _INCIDENTS:
            if inc.get("incident_id") == incident_id:
                current_raw = inc.get("status", "open").lower()
                current = {"reported": "open", "verified": "in_progress"}.get(current_raw, current_raw)
                allowed = STATUS_TRANSITIONS.get(current, set())
                if status.value not in allowed and status.value != current:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid transition: {current} -> {status.value}. Allowed: {allowed or 'none'}",
                    )
                inc["status"] = status.value
                return _doc_to_response(inc)
        raise HTTPException(status_code=404, detail="Incident not found")

    db = get_database()
    try:
        oid = ObjectId(incident_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Incident not found")

    existing = await db[COLLECTION].find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")

    current_raw = existing.get("status", "open").lower()
    current = {"reported": "open", "verified": "in_progress"}.get(current_raw, current_raw)
    allowed = STATUS_TRANSITIONS.get(current, set())
    if status.value not in allowed and status.value != current:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {current} -> {status.value}. Allowed: {allowed or 'none'}",
        )

    result = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": {"status": status.value}},
        return_document=ReturnDocument.AFTER,
    )
    return _doc_to_response(result)

