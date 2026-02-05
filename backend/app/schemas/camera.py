from datetime import datetime

from pydantic import BaseModel, Field

from app.models.camera import CameraStatus, CameraType


class CameraCreate(BaseModel):
    name: str
    type: CameraType
    stream_url: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class CameraStatusUpdate(BaseModel):
    status: CameraStatus


class CameraResponse(BaseModel):
    camera_id: str
    name: str
    type: CameraType
    stream_url: str
    latitude: float
    longitude: float
    status: CameraStatus
    created_at: datetime
