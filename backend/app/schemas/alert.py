from datetime import datetime

from pydantic import BaseModel

from app.models.alert import AlertStatus


class AlertResponse(BaseModel):
    alert_id: str
    incident_id: str
    type: str
    severity: str
    priority: int
    status: str
    created_at: datetime
    acknowledged_by: str | None
    acknowledged_at: datetime | None
