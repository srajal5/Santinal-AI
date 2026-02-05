from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class AlertStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


SEVERITY_TO_PRIORITY = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


class Alert(BaseModel):
    alert_id: str
    incident_id: str
    type: str
    severity: str
    priority: int
    status: AlertStatus = AlertStatus.NEW
    created_at: datetime
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
