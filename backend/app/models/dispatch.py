"""
Dispatch model for Emergency Coordination.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ServiceType(str, Enum):
    HOSPITAL = "Hospital"
    FIRE = "Fire"
    POLICE = "Police"


class DispatchStatus(str, Enum):
    DISPATCHED = "Dispatched"
    EN_ROUTE = "En Route"
    ARRIVED = "Arrived"


class Dispatch(BaseModel):
    dispatch_id: str
    incident_id: str
    service_type: ServiceType
    unit_name: str
    status: DispatchStatus = DispatchStatus.DISPATCHED
    eta_minutes: int
    created_at: datetime
