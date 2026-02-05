from enum import Enum

from pydantic import BaseModel, Field


class DirectoryType(str, Enum):
    Hospital = "Hospital"
    Police = "Police"
    Fire = "Fire"
    Animal = "Animal"


class DirectoryEntry(BaseModel):
    name: str
    type: DirectoryType
    phone: str | None = None
    address: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
