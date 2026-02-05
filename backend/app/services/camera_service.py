from datetime import datetime, timezone
import os
from typing import List

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from app.db.mongodb import get_database
from app.models.camera import CameraStatus, CameraType

COLLECTION = "cameras"

# When True, use in-memory cameras instead of MongoDB (no-DB demo mode).
MOCK_NO_DB = os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1"
_CAMERAS: List[dict] = []


def _doc_to_response(doc: dict) -> dict:
    return {
        "camera_id": str(doc.get("camera_id", doc.get("_id", ""))),
        "name": doc["name"],
        "type": doc["type"],
        "stream_url": doc["stream_url"],
        "latitude": doc["latitude"],
        "longitude": doc["longitude"],
        "status": doc["status"],
        "created_at": doc["created_at"],
    }


async def create_camera(
    name: str,
    type: CameraType,
    stream_url: str,
    latitude: float,
    longitude: float,
) -> dict:
    now = datetime.now(timezone.utc)

    if MOCK_NO_DB:
        camera_id = f"cam-{len(_CAMERAS) + 1}"
        doc = {
            "camera_id": camera_id,
            "name": name,
            "type": type.value,
            "stream_url": stream_url,
            "latitude": latitude,
            "longitude": longitude,
            "status": CameraStatus.ACTIVE.value,
            "created_at": now,
        }
        _CAMERAS.append(doc)
        return _doc_to_response(doc)

    db = get_database()
    doc = {
        "name": name,
        "type": type.value,
        "stream_url": stream_url,
        "latitude": latitude,
        "longitude": longitude,
        "status": CameraStatus.ACTIVE.value,
        "created_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_all_cameras() -> list[dict]:
    if MOCK_NO_DB:
        # If no cameras defined yet, create a couple of demo cameras with fixed locations
        if not _CAMERAS:
            now = datetime.now(timezone.utc)
            _CAMERAS.extend(
                [
                    {
                        "camera_id": "cam-1",
                        "name": "Intersection CCTV #3",
                        "type": CameraType.CCTV.value,
                        "stream_url": "",
                        "latitude": 40.7128,
                        "longitude": -74.0060,
                        "status": CameraStatus.ACTIVE.value,
                        "created_at": now,
                    },
                    {
                        "camera_id": "cam-2",
                        "name": "Warehouse Cam 2",
                        "type": CameraType.IP.value,
                        "stream_url": "",
                        "latitude": 40.7580,
                        "longitude": -73.9855,
                        "status": CameraStatus.ACTIVE.value,
                        "created_at": now,
                    },
                ]
            )
        return [_doc_to_response(c) for c in _CAMERAS]

    db = get_database()
    cursor = db[COLLECTION].find().sort("created_at", -1)
    return [_doc_to_response(doc) async for doc in cursor]


async def update_camera_status(camera_id: str, status: CameraStatus) -> dict:
    if MOCK_NO_DB:
        for c in _CAMERAS:
            if c.get("camera_id") == camera_id:
                c["status"] = status.value
                return _doc_to_response(c)
        raise HTTPException(status_code=404, detail="Camera not found")

    db = get_database()
    try:
        oid = ObjectId(camera_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Camera not found")

    result = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": {"status": status.value}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Camera not found")
    return _doc_to_response(result)


async def get_camera_by_id(camera_id: str) -> dict:
    """
    Fetch a single camera by id or raise 404.

    Used by video detection endpoint to tie incidents to camera location.
    """
    if MOCK_NO_DB:
        for c in _CAMERAS:
            if c.get("camera_id") == camera_id:
                return _doc_to_response(c)
        raise HTTPException(status_code=404, detail="Camera not found")

    db = get_database()
    try:
        oid = ObjectId(camera_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Camera not found")

    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Camera not found")
    return _doc_to_response(doc)

