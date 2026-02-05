from datetime import datetime

from pydantic import BaseModel

from app.models.dispatch import ServiceType


class DispatchCreate(BaseModel):
    incident_id: str
    service_type: ServiceType
    unit_name: str
    eta_minutes: int


class DispatchResponse(BaseModel):
    dispatch_id: str
    incident_id: str
    service_type: str
    unit_name: str
    status: str
    eta_minutes: int
    created_at: datetime
