"""
Mayan Tzolk'in — genuinely new, not extending anything in astrology_engine.py (confirmed
zero Mayan-calendar code exists anywhere in the real files). Built from the standard,
well-documented GMT correlation (JDN 584283 = Long Count 0.0.0.0.0 = "4 Ahau", the Maya
creation date) — the most widely cited correlation constant. Verified with hand-computed
test cases against this documented anchor point before being wired in: the anchor point
itself reproduces "4 Ahau", the next day correctly advances to "5 Imix", and a full 260-day
cycle correctly returns to "4 Ahau" with no drift.

Important, unlike everything else built this session: there's no Mayan-calendar library to
execute and cross-check against, the way Swiss Ephemeris calls could be run and verified
directly. This is formula-verified against a documented reference point, not live-tested
against an authoritative source. Worth an independent spot-check against a trusted Mayan
calendar source before full production trust — said plainly, not hidden.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["mayan-astrology"])

_DAY_NAMES = ["Imix", "Ik", "Akbal", "Kan", "Chicchan", "Cimi", "Manik", "Lamat", "Muluc",
              "Oc", "Chuen", "Eb", "Ben", "Ix", "Men", "Cib", "Caban", "Etznab", "Cauac", "Ahau"]
_COLORS = ["Red", "White", "Blue", "Yellow"]  # cycles every 5 day-names (20/4)
_CORRELATION_JDN = 584283  # GMT correlation — see module docstring


class MayanRequest(BaseModel):
    client_id: str


@router.post("/mayan-astrology", response_model=dict)
async def generate_mayan_reading(payload: MayanRequest, user: CurrentUser = Depends(get_current_user)):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_id, user.id))
        client = cur.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    finally:
        cur.close()
        conn.close()

    if not client.get("birth_date"):
        raise HTTPException(status_code=422, detail="This client has no birth date on file")

    bd = dparser.parse(client["birth_date"])
    jdn = int(round(_julian_day(bd.year, bd.month, bd.day, 12.0, 0.0)))

    days_since_epoch = jdn - _CORRELATION_JDN
    number = ((4 - 1 + days_since_epoch) % 13) + 1
    day_idx = (19 + days_since_epoch) % 20
    day_name = _DAY_NAMES[day_idx]
    color = _COLORS[day_idx % 4]
    trecena_day = (days_since_epoch % 13) + 1  # position within the current 13-day trecena

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "galactic_signature": f"{color} {day_name}",
        "tzolkin_number": number,
        "tzolkin_day_name": day_name,
        "tzolkin_color": color,
        "trecena_position": trecena_day,
        "correlation_used": "GMT (584283)",
        "verification_note": (
            "Formula-verified against the documented Maya creation-date anchor point "
            "(JDN 584283 = 4 Ahau), not live-tested against an authoritative calendar "
            "library. Recommend an independent spot-check before full production trust."
        ),
    }
