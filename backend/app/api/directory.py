from fastapi import APIRouter, Depends

from app.core.deps import require_roles
from app.schemas.directory import DirectoryResponse
from app.services import directory_service

router = APIRouter(prefix="/directory", tags=["directory"])


@router.get("", response_model=list[DirectoryResponse])
async def list_directory(
    user: dict = Depends(require_roles("admin", "police")),
):
    return await directory_service.get_all_entries()
