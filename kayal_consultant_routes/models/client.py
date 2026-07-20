from datetime import date, time, datetime
from typing import Literal, Optional
from pydantic import BaseModel

ClientStatus = Literal["active", "inactive", "onboarding", "completed", "archived"]


class Client(BaseModel):
    id: str
    consultant_id: str
    name: str
    email: str
    phone: Optional[str] = None
    birth_date: date
    birth_time: Optional[time] = None
    birth_location: Optional[str] = None

    life_path: int
    destiny: int
    soul_urge: int
    personality: int
    birthday_gift: int
    birthday_challenge: int

    sun_sign: str
    moon_sign: str
    ascendant: str
    venus_sign: str
    mars_sign: str
    mercury_sign: str
    jupiter_sign: str
    saturn_sign: str
    uranus_sign: str
    neptune_sign: str
    pluto_sign: str

    current_personal_year: int
    current_personal_month: int
    current_pinnacle: int
    pinnacle_period: str

    status: ClientStatus
    tags: list[str] = []
    onboarding_completed: bool = False
    notes: str = ""

    created_at: datetime
    updated_at: datetime


class ClientFormData(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    birth_date: date
    birth_time: Optional[time] = None
    birth_location: Optional[str] = None
    tags: list[str] = []


class ClientUpdate(BaseModel):
    """All fields optional — partial update."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[ClientStatus] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class ClientNote(BaseModel):
    id: str
    client_id: str
    content: str
    created_at: datetime
    updated_at: datetime


class ClientNoteCreate(BaseModel):
    content: str
