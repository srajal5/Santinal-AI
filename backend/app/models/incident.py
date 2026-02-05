"""
Incident data model for Smart Transportation & Public Safety System.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class IncidentType(str, Enum):
    """Type of incident."""

    ACCIDENT = "accident"
    FIRE = "fire"
    CRIME = "crime"


class IncidentSeverity(str, Enum):
    """Severity level of incident."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    """Current status of incident."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


# Valid status transitions: from -> allowed to
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress", "resolved"},
    "in_progress": {"resolved"},
    "resolved": set(),
}


class Incident(BaseModel):
    """Incident entity - base model with all fields."""

    incident_id: str
    type: IncidentType
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")
    reported_at: datetime
    severity: IncidentSeverity
    status: IncidentStatus = IncidentStatus.OPEN
    reported_by: str = Field(..., description="User email or role of reporter")
