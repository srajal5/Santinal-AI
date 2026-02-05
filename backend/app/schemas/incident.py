"""
Incident API schemas - request and response DTOs.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.incident import IncidentSeverity, IncidentStatus, IncidentType


class IncidentCreate(BaseModel):
    """Schema for creating a new incident. reported_by set from JWT."""

    type: IncidentType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity: IncidentSeverity


class IncidentUpdate(BaseModel):
    """Schema for updating an incident (partial)."""

    type: IncidentType | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None


class IncidentStatusUpdate(BaseModel):
    """Schema for updating incident status only."""

    status: IncidentStatus


class IncidentResponse(BaseModel):
    """Schema for incident in API responses."""

    incident_id: str
    type: IncidentType
    latitude: float
    longitude: float
    reported_at: datetime
    severity: IncidentSeverity
    status: IncidentStatus
    reported_by: str
