from pydantic import BaseModel

from app.models.directory import DirectoryType


class DirectoryResponse(BaseModel):
    name: str
    type: DirectoryType
    phone: str | None
    address: str | None
    latitude: float | None
    longitude: float | None
