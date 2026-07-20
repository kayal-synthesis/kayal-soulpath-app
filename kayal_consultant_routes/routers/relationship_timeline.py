"""
Relationship Timeline (#45) and Relationship Sexual Timeline (#51) — the two features
deferred from the first Section 2 pass specifically because they need forward-time
scanning (checking many future dates for when a transit forms), a genuinely different kind
of calculation from everything else in this package, which all computes a single moment.

Built now rather than continuing to defer: samples the composite chart's future window
every 3 days for 90 days (30 samples), computing real transiting positions at each sample
via the same _calculate_positions() used everywhere else, and checking for tight aspects
(3° orb) to the composite chart's key points. Sexual Timeline uses the same scan but
targets the composite 5th/8th house cusps specifically instead of Sun/Moon/Venus/Mars.

Performance note: 30 samples x 10 transiting planets x a handful of target points x 5
aspect types is a few thousand comparisons — trivial computationally, tested to complete
well within a normal request timeout.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["relationship-timeline"])

_ASPECT_ANGLES = {"conjunction": 0, "sextile": 60, "square": 90, "trine": 120, "opposition": 180}
_ORB = 3.0
_SIGNS_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
                "Sagittarius", "Capricorn", "Aquarius", "Pisces"]


def _abs_lon(sign: str, degree: float) -> float:
    return _SIGNS_ORDER.index(sign) * 30 + degree


def _scan_forward(composite_targets: dict, jd_calculator, days_ahead: int = 90, step_days: int = 3):
    """Shared forward-scan: samples every step_days over days_ahead, checking real
    transiting positions against the given {name: absolute_longitude} targets."""
    from synthesis.astrology_engine import _julian_day, _calculate_positions

    hits = []
    today = date.today()
    for offset in range(0, days_ahead, step_days):
        sample_date = today + timedelta(days=offset)
        jd = _julian_day(sample_date.year, sample_date.month, sample_date.day, 12.0, 0.0)
        transiting_positions = _calculate_positions(jd, use_sidereal=False)

        for t_planet, t_data in transiting_positions.items():
            for target_name, target_lon in composite_targets.items():
                diff = abs(t_data["longitude"] - target_lon) % 360
                if diff > 180:
                    diff = 360 - diff
                for aspect_name, angle in _ASPECT_ANGLES.items():
                    if abs(diff - angle) <= _ORB:
                        hits.append({
                            "date": sample_date.isoformat(),
                            "transiting_planet": t_planet, "target": target_name,
                            "aspect": aspect_name, "orb": round(abs(diff - angle), 2),
                        })
    return hits


def _get_composite(client_a, client_b):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _calculate_houses, compute_composite_chart

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, 12.0, 0.0)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, 12.0, 0.0)
    positions_a = _calculate_positions(jd_a, use_sidereal=False)
    positions_b = _calculate_positions(jd_b, use_sidereal=False)
    houses_a = _calculate_houses(jd_a, 0.0, 0.0, use_sidereal=False)
    houses_b = _calculate_houses(jd_b, 0.0, 0.0, use_sidereal=False)
    return compute_composite_chart(positions_a, positions_b, houses_a, houses_b, system="western")


class RelationshipTimelineRequest(BaseModel):
    client_a_id: str
    client_b_id: str
    days_ahead: int = 90


async def _load_clients(client_a_id: str, client_b_id: str, user_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (client_a_id, user_id))
        client_a = cur.fetchone()
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (client_b_id, user_id))
        client_b = cur.fetchone()
    finally:
        cur.close()
        conn.close()
    if not client_a or not client_b:
        raise HTTPException(status_code=404, detail="One or both clients not found")
    return client_a, client_b


@router.post("/relationship-timeline", response_model=dict)
async def generate_relationship_timeline(payload: RelationshipTimelineRequest, user: CurrentUser = Depends(get_current_user)):
    client_a, client_b = await _load_clients(payload.client_a_id, payload.client_b_id, user.id)

    try:
        composite = _get_composite(client_a, client_b)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Composite chart calculation failed: {e}")

    targets = {}
    for key in ("Sun", "Moon", "Venus", "Mars", "Jupiter", "Saturn"):
        if key in composite["composite_positions"]:
            data = composite["composite_positions"][key]
            targets[key] = _abs_lon(data["sign"], data["degree"])

    hits = _scan_forward(targets, None, days_ahead=payload.days_ahead)

    return {
        "client_a_id": payload.client_a_id, "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id, "client_b_name": client_b["name"],
        "days_ahead": payload.days_ahead,
        "events": sorted(hits, key=lambda h: h["date"]),
        "note": (
            f"Scanned every 3 days over the next {payload.days_ahead} days for transits forming "
            "tight aspects (3° orb) to the Composite chart's Sun/Moon/Venus/Mars/Jupiter/Saturn. "
            "3-day sampling means an exact date may be off by up to 3 days from when an aspect is "
            "truly tightest — treat these as significant weeks, not to-the-day predictions."
        ),
    }


@router.post("/relationship-sexual-timeline", response_model=dict)
async def generate_relationship_sexual_timeline(payload: RelationshipTimelineRequest, user: CurrentUser = Depends(get_current_user)):
    client_a, client_b = await _load_clients(payload.client_a_id, payload.client_b_id, user.id)

    try:
        composite = _get_composite(client_a, client_b)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Composite chart calculation failed: {e}")

    # compute_composite_chart() only returns composite_positions/composite_signals/
    # composite_asc — confirmed by reading the real function, no composite house system is
    # computed at all. Deriving 5th/8th house cusps via whole-sign houses (a real, simple,
    # well-established house system: each house = one full sign, counted from whichever
    # sign contains the Ascendant) from the real composite_asc, rather than assuming a
    # field that doesn't exist.
    asc_sign = composite["composite_asc"]["sign"]
    asc_sign_idx = _SIGNS_ORDER.index(asc_sign)
    targets = {
        "House 5 cusp (whole-sign)": ((asc_sign_idx + 4) % 12) * 30,
        "House 8 cusp (whole-sign)": ((asc_sign_idx + 7) % 12) * 30,
    }

    hits = _scan_forward(targets, None, days_ahead=payload.days_ahead)

    return {
        "client_a_id": payload.client_a_id, "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id, "client_b_name": client_b["name"],
        "days_ahead": payload.days_ahead,
        "events": sorted(hits, key=lambda h: h["date"]),
        "note": (
            f"Scanned every 3 days over the next {payload.days_ahead} days for transits forming "
            "tight aspects to the Composite chart's 5th (romance/play) and 8th (intimacy/power) "
            "house cusps, using whole-sign houses derived from the composite Ascendant — the real "
            "compute_composite_chart() function doesn't compute a composite house system at all "
            "(confirmed by reading it directly), so this uses the simplest well-established house "
            "system rather than assuming data that doesn't exist. 3-day sampling — treat as "
            "significant weeks, not exact-day predictions."
        ),
    }
