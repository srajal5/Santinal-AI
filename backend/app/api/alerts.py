from fastapi import APIRouter, Depends

from app.core.deps import require_roles
from app.schemas.alert import AlertResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    user: dict = Depends(require_roles("admin", "police")),
):
    return await alert_service.get_all_alerts()


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    user: dict = Depends(require_roles("admin", "police")),
):
    user_id = user.get("email") or user.get("role") or user.get("sub", "")
    return await alert_service.acknowledge_alert(alert_id, user_id)
