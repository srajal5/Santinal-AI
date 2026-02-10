"""
Incident API routes. All require JWT authentication.
"""
import logging
import base64
from pathlib import Path
from uuid import uuid4
import asyncio
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
from PIL import Image
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile

from app.core.deps import get_current_user, get_user_or_demo, require_roles
from app.core import yolo_inference
from app.models.incident import IncidentSeverity, IncidentStatus, IncidentType
from app.schemas.incident import IncidentCreate, IncidentResponse, IncidentStatusUpdate
from app.services import incident_service, camera_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["incidents"])

# Default coordinates (can be changed as needed)
DEFAULT_LATITUDE = 0.0
DEFAULT_LONGITUDE = 0.0


class FrameDetectionRequest(BaseModel):
    """Request model for frame detection."""
    frame_data: str  # Base64 encoded image
    conf: float = 0.5  # Confidence threshold


class FrameDetectionResponse(BaseModel):
    """Response model for frame detection."""
    detections: list
    count: int
    has_violence: bool
    has_accident: bool


@router.post("/report", response_model=IncidentResponse)
async def report_incident(
    body: IncidentCreate,
    user: dict = Depends(get_current_user),
):
    """
    Report a new incident. Requires JWT. Defaults status to open.
    Manual reports do NOT create alerts - only detection-based incidents create alerts.
    """
    reported_by = user.get("email") or user.get("role") or user.get("sub", "")
    return await incident_service.create_incident(
        type=body.type,
        latitude=body.latitude,
        longitude=body.longitude,
        severity=body.severity,
        reported_by=reported_by,
        create_alert_flag=False,  # Manual reports don't create alerts
    )


@router.post("/detect-from-video")
async def detect_incidents_from_video(
    file: UploadFile = File(...),
    camera_id: str = Form(...),
    user: dict = Depends(get_user_or_demo),
):
    """
    Run YOLOv8 on an uploaded video and create incidents + alerts.

    - Ties location to the selected camera's latitude/longitude (if available).
    - Uses default coordinates (0.0, 0.0) if camera lookup fails.
    - Uses the authenticated user's identity as reported_by.
    """
    # Persist uploaded video to disk
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads" / "videos"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix or ".mp4"
    video_path = uploads_dir / f"{uuid4().hex}{suffix}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty video file")
    video_path.write_bytes(content)

    logger.info(f"Video saved to {video_path}")

    # Try to look up camera for coordinates (optional - don't fail if not found)
    latitude = DEFAULT_LATITUDE
    longitude = DEFAULT_LONGITUDE
    camera_found = False
    
    try:
        camera = await camera_service.get_camera_by_id(camera_id)
        if camera:
            latitude = camera["latitude"]
            longitude = camera["longitude"]
            camera_found = True
            logger.info(f"Camera found: {camera_id} at ({latitude}, {longitude})")
        else:
            logger.warning(f"Camera not found: {camera_id}, using default coordinates")
    except Exception as e:
        logger.warning(f"Camera lookup failed (MongoDB may be unavailable): {e}, using default coordinates")

    # Run YOLOv8 detection in a background thread to avoid blocking the event loop
    try:
        detections = await asyncio.to_thread(
            yolo_inference.run_video_detection,
            video_path,
        )
        logger.info(f"Detection completed: {len(detections)} events found")
    except Exception as e:
        logger.error(f"YOLO detection failed: {e}")
        # Clean up temp file
        try:
            video_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

    # Optionally, clean up the temp file
    try:
        video_path.unlink(missing_ok=True)
    except Exception:
        pass

    if not detections:
        # No violence/accident found -> return empty list
        return {"incidents": [], "message": "No violence or accident detected in this video.", "detections": []}

    # Try to create incidents in database (optional - don't fail if DB is unavailable)
    reported_by = user.get("email") or user.get("role") or user.get("sub", "")
    incidents = []
    
    try:
        incidents = await incident_service.create_incidents_from_detections(
            detections=detections,
            latitude=latitude,
            longitude=longitude,
            reported_by=reported_by,
        )
        logger.info(f"Created {len(incidents)} incidents in database")
    except Exception as e:
        logger.warning(f"Failed to create incidents in database (MongoDB may be unavailable): {e}")
        # Return detections even without database storage

    return {
        "incidents": incidents,
        "message": f"Detected {len(detections)} incident{'s' if len(detections) > 1 else ''}. {'Saved to database.' if incidents else 'Database unavailable - results not saved.'}",
        "detections": detections,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "camera_found": camera_found,
    }


@router.post("/detect-frame", response_model=FrameDetectionResponse)
async def detect_frame(request: FrameDetectionRequest):
    """
    Run YOLOv8 detection on a single frame.
    
    Accepts base64-encoded image (data URL or pure base64) and returns detection results.
    Designed for real-time webcam and IP camera detection.
    """
    try:
        # Handle data URL format (data:image/jpeg;base64,...) or pure base64
        frame_data = request.frame_data
        if frame_data.startswith('data:'):
            # Extract base64 part from data URL
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(frame_data)
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to numpy array (RGB format for PIL)
        frame = np.array(image)
        
        # Convert RGB to BGR for YOLO
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        
        # Run detection
        detections = yolo_inference.run_frame_detection(frame_bgr, conf=request.conf)
        
        return {
            "detections": detections,
            "count": len(detections),
            "has_violence": any(d["type"] == "violence" for d in detections),
            "has_accident": any(d["type"] == "accident" for d in detections),
        }
    except Exception as e:
        logger.error(f"Frame detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Frame detection failed: {str(e)}")


class RealtimeDetectionRequest(BaseModel):
    """Request model for creating incident from real-time detection."""
    type: str  # "violence" or "accident"
    confidence: float
    latitude: float = 0.0
    longitude: float = 0.0
    camera_id: str | None = None


@router.post("/create-from-detection", response_model=IncidentResponse)
async def create_incident_from_detection(
    request: RealtimeDetectionRequest,
    user: dict = Depends(get_user_or_demo),
):
    """
    Create an incident and alert from a real-time detection.
    Only creates alerts when actual detections occur (not manual reports).
    """
    reported_by = user.get("email") or user.get("role") or user.get("sub", "")
    
    # Map detection type to incident type
    if request.type == "violence":
        incident_type = IncidentType.CRIME
        # Determine severity based on confidence
        severity = IncidentSeverity.HIGH if request.confidence >= 0.7 else IncidentSeverity.MEDIUM
    elif request.type == "accident":
        incident_type = IncidentType.ACCIDENT
        # Determine severity based on confidence
        severity = IncidentSeverity.CRITICAL if request.confidence >= 0.7 else IncidentSeverity.HIGH
    else:
        raise HTTPException(status_code=400, detail=f"Invalid detection type: {request.type}")
    
    # Try to get camera location if camera_id provided
    latitude = request.latitude
    longitude = request.longitude
    if request.camera_id:
        try:
            camera = await camera_service.get_camera_by_id(request.camera_id)
            if camera:
                latitude = camera.get("latitude", latitude)
                longitude = camera.get("longitude", longitude)
        except Exception as e:
            logger.warning(f"Could not fetch camera {request.camera_id}: {e}")
    
    # Create incident with alert flag set to True (from detection)
    incident = await incident_service.create_incident(
        type=incident_type,
        latitude=latitude,
        longitude=longitude,
        severity=severity,
        reported_by=reported_by,
        create_alert_flag=True,  # Create alert for detection-based incidents
    )
    
    return incident


@router.get("/all", response_model=list[IncidentResponse])
async def get_all_incidents(
    user: dict = Depends(get_user_or_demo),
):
    """Fetch all incidents. In mock mode works without JWT; otherwise requires valid token."""
    return await incident_service.get_all_incidents()


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def update_incident_status(
    incident_id: str,
    body: IncidentStatusUpdate,
    user: dict = Depends(require_roles("admin")),
):
    """Update incident status. Admin only. Validates status transitions."""
    return await incident_service.update_incident_status(incident_id, body.status)
