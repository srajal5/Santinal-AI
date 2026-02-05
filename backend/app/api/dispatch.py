from fastapi import APIRouter, HTTPException

from app.schemas.dispatch import DispatchCreate, DispatchResponse
from app.services import dispatch_service

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


@router.get("", response_model=list[DispatchResponse])
async def list_dispatches():
    return await dispatch_service.get_all_dispatches()


@router.post("", response_model=DispatchResponse)
async def create_dispatch(body: DispatchCreate):
    return await dispatch_service.create_dispatch(
        incident_id=body.incident_id,
        service_type=body.service_type,
        unit_name=body.unit_name,
        eta_minutes=body.eta_minutes,
    )


@router.get("/{incident_id}", response_model=DispatchResponse)
async def get_dispatch(incident_id: str):
    result = await dispatch_service.get_dispatch_by_incident(incident_id)
    if not result:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return result
