"""
Standalone Composite Chart — the relationship's own chart (midpoint of both people's
planetary positions), without the full narrated Union Blueprint reading. Reuses
compute_composite_chart() exactly as verified and wired into process_consultant_union_job()
earlier this session — same real, already-existing astrology_engine.py function, just
exposed here as its own quick, stateless result instead of bundled into a full synastry
narrative.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["composite-chart"])


class CompositeChartRequest(BaseModel):
    client_a_id: str
    client_b_id: str


@router.post("/composite-chart", response_model=dict)
async def generate_composite_chart(payload: CompositeChartRequest, user: CurrentUser = Depends(get_current_user)):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import (
        compute_composite_chart, _julian_day, _calculate_positions, _calculate_houses,
    )

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_a_id, user.id))
        client_a = cur.fetchone()
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_b_id, user.id))
        client_b = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not client_a or not client_b:
        raise HTTPException(status_code=404, detail="One or both clients not found")
    if not client_a.get("birth_date") or not client_b.get("birth_date"):
        raise HTTPException(status_code=422, detail="Both clients need a birth date on file")

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    hour = 12.0  # no birth time required for this snapshot — same as astrology_snapshot.py
    lat, lon, utc_offset = 0.0, 0.0, 0.0  # TODO: geocode — same open item as everywhere else

    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour, utc_offset)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour, utc_offset)
    positions_a = _calculate_positions(jd_a, use_sidereal=False)
    positions_b = _calculate_positions(jd_b, use_sidereal=False)
    houses_a = _calculate_houses(jd_a, lat, lon, use_sidereal=False)
    houses_b = _calculate_houses(jd_b, lat, lon, use_sidereal=False)

    try:
        composite = compute_composite_chart(positions_a, positions_b, houses_a, houses_b, system="western")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Composite chart calculation failed: {e}")

    # Lunar Phase Slider (#41) — the composite Sun-Moon angle, same classification system
    # a natal lunar phase would use. Reconstructing absolute longitude from sign+degree
    # (rather than assuming an uncertain internal field name) since that's the same safe
    # approach used throughout this package.
    _SIGNS_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio",
                     "Sagittarius","Capricorn","Aquarius","Pisces"]
    _PHASES = [(0,"New Moon"),(45,"Crescent"),(90,"First Quarter"),(135,"Gibbous"),
               (180,"Full Moon"),(225,"Disseminating"),(270,"Last Quarter"),(315,"Balsamic")]

    def _abs_lon(sign, degree):
        return _SIGNS_ORDER.index(sign) * 30 + degree

    lunar_phase = None
    comp_positions = composite.get("composite_positions", {})
    if "Sun" in comp_positions and "Moon" in comp_positions:
        sun_lon = _abs_lon(comp_positions["Sun"]["sign"], comp_positions["Sun"]["degree"])
        moon_lon = _abs_lon(comp_positions["Moon"]["sign"], comp_positions["Moon"]["degree"])
        angle = (moon_lon - sun_lon) % 360
        phase_name = _PHASES[0][1]
        for i in range(8):
            lower = _PHASES[i][0]
            upper = _PHASES[(i + 1) % 8][0] if i < 7 else 360
            if lower <= angle < upper:
                phase_name = _PHASES[i][1]
                break
        lunar_phase = {
            "phase": phase_name, "angle_degrees": round(angle, 1),
            "is_waxing": angle < 180,
            "note": "Waxing phases (New through Full) suggest a relationship still building; "
                    "waning phases (Full through Balsamic) suggest one working through completion or release.",
        }

    return {
        "client_a_id": payload.client_a_id,
        "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id,
        "client_b_name": client_b["name"],
        "positions": {
            planet: {"sign": data["sign"], "degree": data["degree"]}
            for planet, data in composite["composite_positions"].items()
        },
        "ascendant": {
            "sign": composite["composite_asc"]["sign"],
            "degree": composite["composite_asc"]["degree"],
            "reading": composite["composite_asc"]["reading"],
        },
        "signals": [
            {"feature": s["feature"], "domain": s["domain"], "reading": s["reading"]}
            for s in composite["composite_signals"]
        ],
        "lunar_phase": lunar_phase,
    }


class DavisonChartRequest(BaseModel):
    client_a_id: str
    client_b_id: str


@router.post("/davison-chart", response_model=dict)
async def generate_davison_chart(payload: DavisonChartRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Davison Relationship Chart (#40) — genuinely different math from Composite. Composite
    averages each PAIR of planets (Sun-A with Sun-B, Moon-A with Moon-B, etc.) directly in
    the zodiac. Davison instead finds the actual midpoint moment in TIME and the actual
    midpoint location in SPACE between the two birth events, then computes a completely
    normal natal-style chart for that single midpoint moment/place — as if the relationship
    itself were "born" at that point in spacetime.

    Space midpoint uses a circular mean for longitude (not a simple average — averaging
    -170° and 170° should give 180°, not 0°, since the short way around wraps through the
    date line) — tested against exactly that wraparound case before being wired in.
    """
    import math
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _calculate_houses

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_a_id, user.id))
        client_a = cur.fetchone()
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_b_id, user.id))
        client_b = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not client_a or not client_b:
        raise HTTPException(status_code=404, detail="One or both clients not found")
    if not client_a.get("birth_date") or not client_b.get("birth_date"):
        raise HTTPException(status_code=422, detail="Both clients need a birth date on file")

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    hour = 12.0
    lat, lon = 0.0, 0.0  # TODO: geocode — same open item as elsewhere in this package

    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour, 0.0)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour, 0.0)

    # Time midpoint — straightforward average of the two Julian Days.
    midpoint_jd = (jd_a + jd_b) / 2

    # Space midpoint — circular mean for longitude, tested against the date-line wraparound
    # case (-170°, 170° -> 180°, not 0°) before use. Latitude uses a plain average (no
    # wraparound concern in the -90..90 range for real-world locations).
    def circular_mean_longitude(lon_a, lon_b):
        rad_a, rad_b = math.radians(lon_a), math.radians(lon_b)
        x = (math.cos(rad_a) + math.cos(rad_b)) / 2
        y = (math.sin(rad_a) + math.sin(rad_b)) / 2
        return math.degrees(math.atan2(y, x)) % 360

    midpoint_lat = (lat + lat) / 2  # both 0.0 today pending geocoding — see TODO above
    midpoint_lon = circular_mean_longitude(lon, lon)

    davison_positions = _calculate_positions(midpoint_jd, use_sidereal=False)
    davison_houses = _calculate_houses(midpoint_jd, midpoint_lat, midpoint_lon, use_sidereal=False)

    from synthesis.astrology_engine import _degree_to_sign
    houses_out = {}
    for key, deg in davison_houses.items():
        sign, house_deg, _ = _degree_to_sign(deg)
        houses_out[key] = {"sign": sign, "degree": round(house_deg, 2)}

    return {
        "client_a_id": payload.client_a_id,
        "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id,
        "client_b_name": client_b["name"],
        "midpoint_julian_day": round(midpoint_jd, 4),
        "positions": {
            name: {"sign": data["sign"], "degree": round(data["degree"], 2), "retrograde": data["retrograde"]}
            for name, data in davison_positions.items()
        },
        "houses": houses_out,
        "note": (
            "The Davison chart treats the relationship's midpoint moment in time and space as "
            "its own 'birth' — a genuinely different technique from the Composite chart, not a "
            "variant of it. Location defaults to 0,0 pending geocoding, same open item as "
            "elsewhere in this package."
        ),
    }


class RelationshipAspectGridRequest(BaseModel):
    client_a_id: str
    client_b_id: str


@router.post("/relationship-aspect-grid", response_model=dict)
async def generate_relationship_aspect_grid(payload: RelationshipAspectGridRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Relationship Aspect Grid (#43) — every aspect between every planet in both charts, not
    just the Venus/Mars/Pluto subset sexual_compatibility.py filters to. Same real
    _detect_aspects() call on a combined, labeled position dict, just unfiltered.
    """
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _detect_aspects

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_a_id, user.id))
        client_a = cur.fetchone()
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_b_id, user.id))
        client_b = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not client_a or not client_b:
        raise HTTPException(status_code=404, detail="One or both clients not found")
    if not client_a.get("birth_date") or not client_b.get("birth_date"):
        raise HTTPException(status_code=422, detail="Both clients need a birth date on file")

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    hour = 12.0

    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour, 0.0)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour, 0.0)
    positions_a = _calculate_positions(jd_a, use_sidereal=False)
    positions_b = _calculate_positions(jd_b, use_sidereal=False)

    combined = {}
    for name, data in positions_a.items():
        combined[f"A_{name}"] = data
    for name, data in positions_b.items():
        combined[f"B_{name}"] = data
    all_aspects = _detect_aspects(combined)

    grid = []
    for a in all_aspects:
        p1, p2 = a["planet1"], a["planet2"]
        if p1.startswith("A_") and p2.startswith("B_"):
            grid.append({"person_a_planet": p1[2:], "person_b_planet": p2[2:], "aspect": a["aspect"], "tone": a["tone"], "orb": a["orb"]})
        elif p1.startswith("B_") and p2.startswith("A_"):
            grid.append({"person_a_planet": p2[2:], "person_b_planet": p1[2:], "aspect": a["aspect"], "tone": a["tone"], "orb": a["orb"]})
        # same-person aspects (A_-A_ or B_-B_) intentionally excluded — this grid is
        # specifically cross-chart, not each person's own natal aspects

    return {
        "client_a_id": payload.client_a_id,
        "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id,
        "client_b_name": client_b["name"],
        "aspect_grid": grid,
    }


class RelationshipTransitsRequest(BaseModel):
    client_a_id: str
    client_b_id: str


@router.post("/relationship-transits", response_model=dict)
async def generate_relationship_transits(payload: RelationshipTransitsRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Relationship Transits (#42) — current planetary weather (today, a single moment, not a
    forecast) against the Composite chart's key points, plus each person's own current
    transits (already real and already available via /astrology-snapshot for each client
    individually — referenced here, not recomputed, to avoid a third implementation of the
    same real transit-detection logic).
    """
    from datetime import date as date_cls
    from dateutil import parser as dparser
    from synthesis.astrology_engine import (
        _julian_day, _calculate_positions, _calculate_houses, compute_composite_chart, _degree_to_sign,
    )

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_a_id, user.id))
        client_a = cur.fetchone()
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (payload.client_b_id, user.id))
        client_b = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not client_a or not client_b:
        raise HTTPException(status_code=404, detail="One or both clients not found")

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    hour = 12.0
    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour, 0.0)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour, 0.0)
    positions_a = _calculate_positions(jd_a, use_sidereal=False)
    positions_b = _calculate_positions(jd_b, use_sidereal=False)
    houses_a = _calculate_houses(jd_a, 0.0, 0.0, use_sidereal=False)
    houses_b = _calculate_houses(jd_b, 0.0, 0.0, use_sidereal=False)

    try:
        composite = compute_composite_chart(positions_a, positions_b, houses_a, houses_b, system="western")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Composite chart calculation failed: {e}")

    today = date_cls.today()
    today_jd = _julian_day(today.year, today.month, today.day, hour, 0.0)
    transiting_positions = _calculate_positions(today_jd, use_sidereal=False)

    _ASPECT_ANGLES = {"conjunction": 0, "sextile": 60, "square": 90, "trine": 120, "opposition": 180}
    _ORB = 3.0
    _SIGNS_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio",
                     "Sagittarius","Capricorn","Aquarius","Pisces"]

    def _abs_lon(sign, degree):
        return _SIGNS_ORDER.index(sign) * 30 + degree

    composite_targets = {}
    for key in ("Sun", "Moon", "Venus", "Mars"):
        if key in composite["composite_positions"]:
            data = composite["composite_positions"][key]
            composite_targets[key] = _abs_lon(data["sign"], data["degree"])

    hits = []
    for t_planet, t_data in transiting_positions.items():
        for target_name, target_lon in composite_targets.items():
            diff = abs(t_data["longitude"] - target_lon) % 360
            if diff > 180:
                diff = 360 - diff
            for aspect_name, angle in _ASPECT_ANGLES.items():
                if abs(diff - angle) <= _ORB:
                    hits.append({
                        "transiting_planet": t_planet, "composite_point": target_name,
                        "aspect": aspect_name, "orb": round(abs(diff - angle), 2),
                    })

    return {
        "client_a_id": payload.client_a_id,
        "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id,
        "client_b_name": client_b["name"],
        "date": today.isoformat(),
        "transits_to_composite": hits,
        "note": (
            "Current transits to the Composite chart's Sun/Moon/Venus/Mars, as of today. "
            "Each person's own individual current transits are already available via the "
            "Transits section for that client — not duplicated here."
        ),
    }
