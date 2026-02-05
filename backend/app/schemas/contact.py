from datetime import datetime

from pydantic import BaseModel


class ContactCreate(BaseModel):
    incident_id: str
    service_type: str
    service_name: str


class ContactResponse(BaseModel):
    contact_id: str
    incident_id: str
    service_type: str
    service_name: str
    created_at: datetime
