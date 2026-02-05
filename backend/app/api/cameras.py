from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.deps import require_roles
from app.schemas.camera import CameraCreate, CameraResponse, CameraStatusUpdate
from app.services import camera_service

router = APIRouter(prefix="/cameras", tags=["cameras"])


def _is_safe_stream_url(url: str) -> bool:
    """Allow http/https, block file:, javascript:, etc."""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


@router.get("/stream-proxy")
async def stream_proxy(url: str = Query(..., description="IP camera stream URL")):
    """
    Proxy IP camera MJPEG/HTTP stream. Bypasses CORS.
    Supports: http://IP:port/video, /videofeed, /mjpg, etc.
    """
    if not _is_safe_stream_url(url):
        raise HTTPException(status_code=400, detail="Invalid stream URL")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Stream returned {response.status_code}",
                    )
                content_type = response.headers.get(
                    "content-type", "multipart/x-mixed-replace"
                )
                return StreamingResponse(
                    response.aiter_bytes(),
                    media_type=content_type,
                    headers={
                        "Cache-Control": "no-cache, no-store",
                        "Pragma": "no-cache",
                    },
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot connect to stream: {str(e)}",
        )


@router.get("/stream-check")
async def stream_check(url: str = Query(..., description="IP camera stream URL")):
    """Check if an IP camera URL is reachable and returns a valid stream."""
    if not _is_safe_stream_url(url):
        return {"ok": False, "error": "Invalid URL"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            async with client.stream("GET", url) as response:
                ct = response.headers.get("content-type", "")
                return {"ok": response.status_code == 200, "stream_type": ct}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("", response_model=CameraResponse)
async def create_camera(
    body: CameraCreate,
    user: dict = Depends(require_roles("admin")),
):
    return await camera_service.create_camera(
        name=body.name,
        type=body.type,
        stream_url=body.stream_url,
        latitude=body.latitude,
        longitude=body.longitude,
    )


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    user: dict = Depends(require_roles("admin", "police")),
):
    return await camera_service.get_all_cameras()


@router.patch("/{camera_id}/status", response_model=CameraResponse)
async def update_camera_status(
    camera_id: str,
    body: CameraStatusUpdate,
    user: dict = Depends(require_roles("admin")),
):
    return await camera_service.update_camera_status(camera_id, body.status)
