from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CameraType(str, Enum):
    CCTV = "CCTV"
    IP = "IP"
    Drone = "Drone"
    Mobile = "Mobile"


class CameraStatus(str, Enum):
    ACTIVE = "active"
    OFFLINE = "offline"


class Camera(BaseModel):
    camera_id: str
    name: str
    type: CameraType
    stream_url: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    status: CameraStatus = CameraStatus.ACTIVE
    created_at: datetime
