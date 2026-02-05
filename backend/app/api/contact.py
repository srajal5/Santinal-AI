from fastapi import APIRouter, Depends

from app.core.deps import require_roles
from app.schemas.contact import ContactCreate, ContactResponse
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", response_model=ContactResponse)
async def create_contact(body: ContactCreate, user: dict = Depends(require_roles("admin", "police"))):
    return await contact_service.create_contact(
        incident_id=body.incident_id,
        service_type=body.service_type,
        service_name=body.service_name,
    )


@router.get("/{incident_id}", response_model=list[ContactResponse])
async def list_contacts(incident_id: str, user: dict = Depends(require_roles("admin", "police"))):
    return await contact_service.get_contacts_by_incident(incident_id)
