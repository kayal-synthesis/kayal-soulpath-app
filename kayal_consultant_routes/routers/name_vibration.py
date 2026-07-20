"""
Name Vibration — a genuinely new feature, not a port of anything, but built entirely on
real, already-verified functions from synthesis/numerology_engine.py (destiny_number,
soul_urge_number, personality_number) — the same functions synthesis_bridge.py already
uses for reading generation. No new engine dependency, no fabricated scoring.

Stateless by design: this is a fast, pure-math calculation (no LLM narration involved),
so it returns results directly rather than going through the jobs/BackgroundTasks
pattern reading generation needs. Nothing is persisted — each check is a fresh calculation.
"""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["name-vibration"])

NameType = Literal["personal", "business", "baby", "stage", "product"]

# Only "personal" compares against a client's Life Path — everything else is standalone,
# per what was actually decided rather than assumed.
REQUIRES_CLIENT: set[NameType] = {"personal"}


class NameVibrationRequest(BaseModel):
    name_type: NameType
    name: str
    client_id: Optional[str] = None


class NameVibrationResult(BaseModel):
    name: str
    name_type: NameType
    destiny_number: int
    soul_urge_number: int
    personality_number: int
    life_path: Optional[int] = None
    aligned: Optional[bool] = None  # destiny_number == life_path, exact match only —
    # no fabricated percentage score here; there's no verified formula for one in the
    # real engine, so this stays an honest yes/no rather than invented precision.


@router.post("/name-vibration", response_model=NameVibrationResult)
def calculate_name_vibration(payload: NameVibrationRequest, user: CurrentUser = Depends(get_current_user)):
    from synthesis.numerology_engine import destiny_number, soul_urge_number, personality_number

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    if payload.name_type in REQUIRES_CLIENT and not payload.client_id:
        raise HTTPException(status_code=422, detail="Personal names need a client selected for Life Path comparison")

    destiny, _ = destiny_number(name)
    soul_urge = soul_urge_number(name)
    personality = personality_number(name)

    life_path = None
    aligned = None

    if payload.client_id:
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT life_path FROM clients WHERE id = %s AND consultant_id = %s",
                (payload.client_id, user.id),
            )
            client = cur.fetchone()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            life_path = client["life_path"]
            if life_path is not None:
                aligned = destiny == life_path
        finally:
            cur.close()
            conn.close()

    return {
        "name": name,
        "name_type": payload.name_type,
        "destiny_number": destiny,
        "soul_urge_number": soul_urge,
        "personality_number": personality,
        "life_path": life_path,
        "aligned": aligned,
    }
