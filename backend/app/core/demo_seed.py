"""
Demo seed: realistic sample data for cameras, incidents, alerts, directory.
Runs on startup if collections are empty. Also exposed as POST /demo/seed.
"""
import os
from datetime import datetime, timezone

from app.db.mongodb import get_database
from app.models.camera import CameraType
from app.models.directory import DirectoryType
from app.models.incident import IncidentSeverity, IncidentType
from app.services import alert_service, camera_service, incident_service

# Shared demo data - consistent across modules
DEMO_CAMERAS = [
    {"name": "Main St Intersection", "type": CameraType.CCTV, "stream_url": "https://example.com/stream1", "lat": 40.7128, "lng": -74.0060},
    {"name": "Highway 101 North", "type": CameraType.CCTV, "stream_url": "https://example.com/stream2", "lat": 40.7580, "lng": -73.9855},
    {"name": "Central Park East", "type": CameraType.IP, "stream_url": "https://example.com/stream3", "lat": 40.7829, "lng": -73.9654},
    {"name": "Drone Unit 1", "type": CameraType.Drone, "stream_url": "https://example.com/drone1", "lat": 40.7484, "lng": -73.9857},
]

DEMO_INCIDENTS = [
    {"type": IncidentType.ACCIDENT, "lat": 40.7128, "lng": -74.0060, "severity": IncidentSeverity.HIGH},
    {"type": IncidentType.FIRE, "lat": 40.7580, "lng": -73.9855, "severity": IncidentSeverity.CRITICAL},
    {"type": IncidentType.CRIME, "lat": 40.7829, "lng": -73.9654, "severity": IncidentSeverity.MEDIUM},
    {"type": IncidentType.ACCIDENT, "lat": 40.7484, "lng": -73.9857, "severity": IncidentSeverity.LOW},
    {"type": IncidentType.FIRE, "lat": 40.7350, "lng": -74.0020, "severity": IncidentSeverity.HIGH},
]

DEMO_DIRECTORY = [
    {"name": "City General Hospital", "type": DirectoryType.Hospital, "phone": "+1-555-0100", "address": "123 Medical Center Dr"},
    {"name": "Central Police Station", "type": DirectoryType.Police, "phone": "+1-555-0199", "address": "456 Justice Ave"},
    {"name": "Fire Station 7", "type": DirectoryType.Fire, "phone": "+1-555-0117", "address": "789 Emergency Way"},
    {"name": "Metro Ambulance", "type": DirectoryType.Hospital, "phone": "+1-555-0120", "address": "321 First Response Rd"},
]


async def _seed_cameras() -> int:
    db = get_database()
    count = await db.cameras.count_documents({})
    if count > 0:
        return 0
    added = 0
    for c in DEMO_CAMERAS:
        await camera_service.create_camera(
            name=c["name"],
            type=c["type"],
            stream_url=c["stream_url"],
            latitude=c["lat"],
            longitude=c["lng"],
        )
        added += 1
    return added


async def _seed_incidents_and_alerts() -> int:
    db = get_database()
    count = await db.incidents.count_documents({})
    if count > 0:
        return 0
    added = 0
    for inc in DEMO_INCIDENTS:
        await incident_service.create_incident(
            type=inc["type"],
            latitude=inc["lat"],
            longitude=inc["lng"],
            severity=inc["severity"],
            reported_by="demo@sentinel.com",
        )
        added += 1
    return added


async def _seed_directory() -> int:
    db = get_database()
    count = await db.directory.count_documents({})
    if count > 0:
        return 0
    for d in DEMO_DIRECTORY:
        await db.directory.insert_one({
            "name": d["name"],
            "type": d["type"].value,
            "phone": d["phone"],
            "address": d["address"],
            "latitude": None,
            "longitude": None,
        })
    return len(DEMO_DIRECTORY)


async def seed_demo_data() -> dict:
    """Seed demo data if collections are empty. Returns counts added."""
    if os.getenv("SANTINEL_MOCK_NO_DB", "1") == "1":
        # No-DB mode: in-memory data is used; skip MongoDB. Frontend can still call this.
        return {"cameras": 0, "incidents": 0, "directory": 0}
    cameras = await _seed_cameras()
    incidents = await _seed_incidents_and_alerts()
    directory = await _seed_directory()
    return {"cameras": cameras, "incidents": incidents, "directory": directory}
