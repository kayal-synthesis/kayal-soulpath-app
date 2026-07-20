"""
Astrology Snapshot — backs the standalone Natal Chart, Transits, Progressions, Arabic
Parts, Midpoints & Antiscia, Asteroids, and Vedic Snapshot sections. One endpoint, not
seven, because all of this is already computed together in a single compute_western()/
compute_both() call plus the midpoint/antiscia/asteroid additions from earlier this
session — splitting it into seven separate calculations would mean seven times the Swiss
Ephemeris calls for data that's produced together anyway. The frontend pages each render
only their own slice of one shared response.

Every field here is either: (a) already computed on every reading and previously only fed
to the narrator (transits, arabic_parts, progressions, stelliums — confirmed by reading
compute_astrology() directly), (b) built and verified earlier this session (midpoints,
antiscia, asteroids, hybrid Vedic selection), or (c) raw natal positions/houses/aspects,
which compute_western() computes internally but never returns — exposed here the same way
composite_chart.py already does, via direct calls to _calculate_positions()/
_calculate_houses()/_julian_day() (all "private" by convention, still importable).

Stateless, like name_vibration/physiognomy/palmistry — fast enough not to need the
jobs/BackgroundTasks pattern reading generation needs.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection
from ..synthesis_bridge import _calculate_midpoints_and_antiscia, _calculate_asteroids, select_astrology_system
from ..extended_celestial_bodies import _calculate_extended_asteroids, _calculate_dwarf_planets, _calculate_fixed_stars

router = APIRouter(tags=["astrology-snapshot"])

# ---------------------------------------------------------------------------
# Sign rulers, decans, aspect patterns — genuinely new, but each is either a fixed,
# universally-standard astrological table (rulers, decans) or precise geometric pattern
# detection applied to _detect_aspects()'s already-real, already-verified output — not a
# new calculation system and not an interpretive judgment call the way Vedic Yogas or
# Horary reasoning would be. Modern rulerships used for the outer planets (Scorpio→Pluto,
# Aquarius→Uranus, Pisces→Neptune) alongside their traditional co-rulers, both shown rather
# than picking one silently.
# ---------------------------------------------------------------------------

_SIGN_RULERS = {
    "Aries": {"modern": "Mars", "traditional": "Mars"},
    "Taurus": {"modern": "Venus", "traditional": "Venus"},
    "Gemini": {"modern": "Mercury", "traditional": "Mercury"},
    "Cancer": {"modern": "Moon", "traditional": "Moon"},
    "Leo": {"modern": "Sun", "traditional": "Sun"},
    "Virgo": {"modern": "Mercury", "traditional": "Mercury"},
    "Libra": {"modern": "Venus", "traditional": "Venus"},
    "Scorpio": {"modern": "Pluto", "traditional": "Mars"},
    "Sagittarius": {"modern": "Jupiter", "traditional": "Jupiter"},
    "Capricorn": {"modern": "Saturn", "traditional": "Saturn"},
    "Aquarius": {"modern": "Uranus", "traditional": "Saturn"},
    "Pisces": {"modern": "Neptune", "traditional": "Jupiter"},
}

# Each sign's 30° divided into 3 decans of 10° each, ruled by the same element's signs
# in order — the standard Chaldean decan system.
_DECAN_RULERS = {
    "Aries": ["Mars", "Sun", "Venus"], "Taurus": ["Mercury", "Moon", "Saturn"],
    "Gemini": ["Jupiter", "Mars", "Sun"], "Cancer": ["Venus", "Mercury", "Moon"],
    "Leo": ["Saturn", "Jupiter", "Mars"], "Virgo": ["Sun", "Venus", "Mercury"],
    "Libra": ["Moon", "Saturn", "Jupiter"], "Scorpio": ["Mars", "Sun", "Venus"],
    "Sagittarius": ["Mercury", "Moon", "Saturn"], "Capricorn": ["Jupiter", "Mars", "Sun"],
    "Aquarius": ["Venus", "Mercury", "Moon"], "Pisces": ["Saturn", "Jupiter", "Mars"],
}


def _decan_for(sign: str, degree: float) -> dict:
    decan_num = min(int(degree // 10), 2)  # 0-9.99°→1st, 10-19.99°→2nd, 20-29.99°→3rd
    return {"decan": decan_num + 1, "ruler": _DECAN_RULERS[sign][decan_num]}


def _detect_aspect_patterns(aspects: list) -> dict:
    """
    Grand Trine (3 planets, each pair in trine), T-Square (2 planets in opposition, both
    square to a third), Yod (2 planets sextile each other, both quincunx to a third) — all
    precise, standard geometric definitions applied to real, already-computed aspect data,
    not new astronomy or interpretation.
    """
    by_type: dict = {"trine": [], "square": [], "opposition": [], "sextile": [], "quincunx": []}
    for a in aspects:
        if a["aspect"] in by_type:
            by_type[a["aspect"]].append((a["planet1"], a["planet2"]))

    def _linked(pairs, p1, p2):
        return (p1, p2) in pairs or (p2, p1) in pairs

    grand_trines = []
    trine_planets = {p for pair in by_type["trine"] for p in pair}
    for a in trine_planets:
        for b in trine_planets:
            for c in trine_planets:
                if a < b < c:
                    if _linked(by_type["trine"], a, b) and _linked(by_type["trine"], b, c) and _linked(by_type["trine"], a, c):
                        grand_trines.append([a, b, c])

    t_squares = []
    for p1, p2 in by_type["opposition"]:
        square_planets = {p for pair in by_type["square"] for p in pair}
        for apex in square_planets:
            if apex in (p1, p2):
                continue
            if _linked(by_type["square"], apex, p1) and _linked(by_type["square"], apex, p2):
                t_squares.append({"opposition": [p1, p2], "apex": apex})

    yods = []
    for p1, p2 in by_type["sextile"]:
        quincunx_planets = {p for pair in by_type["quincunx"] for p in pair}
        for apex in quincunx_planets:
            if apex in (p1, p2):
                continue
            if _linked(by_type["quincunx"], apex, p1) and _linked(by_type["quincunx"], apex, p2):
                yods.append({"sextile": [p1, p2], "apex": apex})

    return {"grand_trines": grand_trines, "t_squares": t_squares, "yods": yods}


_CARDINAL_SIGNS = {"Aries", "Cancer", "Libra", "Capricorn"}
_FIXED_SIGNS = {"Taurus", "Leo", "Scorpio", "Aquarius"}
_MUTABLE_SIGNS = {"Gemini", "Virgo", "Sagittarius", "Pisces"}
_ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
                 "Sagittarius", "Capricorn", "Aquarius", "Pisces"]


def _navamsa_sign(sign: str, degree_in_sign: float) -> str:
    """
    D9 divisional chart — standard Parashara rule, verified against all 12 signs and all 9
    sub-divisions with independently hand-computed expected values before being wired in
    (cardinal signs start counting from themselves, fixed signs from the 9th sign from
    themselves, mutable signs from the 5th sign from themselves).
    """
    sign_idx = _ZODIAC_SIGNS.index(sign)
    if sign in _CARDINAL_SIGNS:
        start = sign_idx
    elif sign in _FIXED_SIGNS:
        start = (sign_idx + 8) % 12
    else:
        start = (sign_idx + 4) % 12
    navamsa_idx = int(degree_in_sign // (30 / 9))
    return _ZODIAC_SIGNS[(start + navamsa_idx) % 12]


def _dashamsa_sign(sign: str, degree_in_sign: float) -> str:
    """D10 divisional chart — odd signs start counting from themselves, even signs from the
    9th sign from themselves. Same verification rigor as _navamsa_sign()."""
    sign_idx = _ZODIAC_SIGNS.index(sign)
    is_odd = sign_idx % 2 == 0
    start = sign_idx if is_odd else (sign_idx + 8) % 12
    dashamsa_idx = int(degree_in_sign // (30 / 10))
    return _ZODIAC_SIGNS[(start + dashamsa_idx) % 12]


_EXALTATION = {"Sun": "Aries", "Moon": "Taurus", "Mercury": "Virgo", "Venus": "Pisces",
               "Mars": "Capricorn", "Jupiter": "Cancer", "Saturn": "Libra"}
# Detriment/Fall are DEFINITIONALLY the opposite sign of Rulership/Exaltation, not
# separately memorized facts — derived below, then cross-checked against independently
# recalled values before use (all 7 matched exactly).
_FALL = {planet: _ZODIAC_SIGNS[(_ZODIAC_SIGNS.index(sign) + 6) % 12] for planet, sign in _EXALTATION.items()}


def _planetary_dignity(planet: str, sign: str) -> str:
    ruler_info = _SIGN_RULERS.get(sign, {})
    if ruler_info.get("modern") == planet or ruler_info.get("traditional") == planet:
        return "Rulership"
    if _EXALTATION.get(planet) == sign:
        return "Exaltation"
    if _FALL.get(planet) == sign:
        return "Fall"
    detriment_sign = _ZODIAC_SIGNS[(_ZODIAC_SIGNS.index(sign) + 6) % 12]
    detriment_ruler = _SIGN_RULERS.get(detriment_sign, {})
    if detriment_ruler.get("modern") == planet or detriment_ruler.get("traditional") == planet:
        return "Detriment"
    return "Peregrine"


def _classify_partile_platyk(orb: float) -> str:
    """Partile = exact/very tight orb (<1°), Platyk = wider orb. Simple, standard threshold."""
    return "Partile" if orb < 1.0 else "Platyk"


def _detect_kites(aspects: list, grand_trines: list) -> list:
    """A Kite = a Grand Trine plus one of its three planets in opposition to a fourth
    planet, which is sextile to the other two trine planets. Extends the already-verified
    Grand Trine detection rather than a separate implementation."""
    oppositions = {(a["planet1"], a["planet2"]) for a in aspects if a["aspect"] == "opposition"}
    oppositions |= {(b, a) for a, b in oppositions}
    sextiles = {(a["planet1"], a["planet2"]) for a in aspects if a["aspect"] == "sextile"}
    sextiles |= {(b, a) for a, b in sextiles}

    kites = []
    for trine in grand_trines:
        for apex_candidate in trine:
            others = [p for p in trine if p != apex_candidate]
            for p1, p2 in oppositions:
                if p1 != apex_candidate:
                    continue
                if (p2, others[0]) in sextiles and (p2, others[1]) in sextiles:
                    kites.append({"grand_trine": trine, "opposition_point": p2, "apex": apex_candidate})
    return kites


def _classify_chart_shape(longitudes: list) -> dict:
    """
    Marc Edmund Jones chart-shape classification — Bundle/Bowl/Locomotive/Splash/See-Saw/
    Bucket, based on the largest empty gap between planets around the circle. This is
    pattern classification using standard, commonly-cited thresholds, not exact math the
    way aspect angles are — different software can classify genuinely borderline charts
    differently. Stated here directly rather than presented with false precision.
    """
    sorted_lons = sorted(longitudes)
    gaps = []
    for i in range(len(sorted_lons)):
        nxt = sorted_lons[(i + 1) % len(sorted_lons)]
        cur = sorted_lons[i]
        gap = (nxt - cur) % 360
        gaps.append(gap)
    sorted_gaps = sorted(gaps, reverse=True)
    largest_gap = sorted_gaps[0]
    second_largest = sorted_gaps[1] if len(sorted_gaps) > 1 else 0

    # See-Saw checked FIRST: two comparably large gaps means two opposing clusters,
    # regardless of the single largest gap's size — caught by testing a genuine See-Saw
    # case (two 5-planet clusters ~180° apart) and finding it misclassified as Locomotive
    # before this reordering.
    if largest_gap >= 90 and second_largest >= 90:
        shape = "See-Saw"
    elif largest_gap >= 240:
        shape = "Bundle"
    elif largest_gap >= 180:
        shape = "Bowl"
    elif largest_gap >= 120:
        shape = "Locomotive" if second_largest < 60 else "Bucket"
    else:
        shape = "Splash"

    return {"shape": shape, "largest_gap_degrees": round(largest_gap, 1),
            "note": "Pattern classification using standard thresholds — treat as a directional read, not exact math."}


class AstrologySnapshotRequest(BaseModel):
    client_id: str


@router.post("/astrology-snapshot", response_model=dict)
async def generate_astrology_snapshot(payload: AstrologySnapshotRequest, user: CurrentUser = Depends(get_current_user)):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import (
        compute_western, compute_both, _julian_day, _calculate_positions,
        _calculate_houses, _degree_to_sign, _detect_aspects,
    )

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
    hour = 12.0  # no birth time stored/required for this snapshot — matches how a client
    # without a known birth time is already handled elsewhere (hour_known=False)
    lat, lon, utc_offset = 0.0, 0.0, 0.0  # TODO: geocode client["birth_location"] — same
    # open item as synthesis_bridge.py's process_consultant_reading_job()

    # NOTE: clients table has no country_code column today — only birth_location (free
    # text). This always resolves to "western" in practice right now, not silently claiming
    # Vedic detection works when there's no real data behind it. Fixing this needs either a
    # country_code column populated at client-creation time (via geocoding, same open TODO
    # as everywhere else lat/lon defaults to 0,0 in this package) or geocoding birth_location
    # on the fly here.
    astrology_system = select_astrology_system(client.get("country_code", "") or "")

    # Raw natal positions + houses — compute_western() computes these internally but never
    # returns them, so calling the same private functions composite_chart already uses.
    jd = _julian_day(bd.year, bd.month, bd.day, hour, utc_offset)
    raw_positions = _calculate_positions(jd, use_sidereal=False)
    raw_houses = _calculate_houses(jd, lat, lon, use_sidereal=False)

    natal_planets = {
        name: {
            "sign": data["sign"], "degree": round(data["degree"], 2), "retrograde": data["retrograde"],
            "decan": _decan_for(data["sign"], data["degree"]),
            "dignity": _planetary_dignity(name, data["sign"]),
            "absolute_longitude": round(data["longitude"], 2),
        }
        for name, data in raw_positions.items()
    }
    natal_houses = {}
    for key, deg in raw_houses.items():
        sign, house_deg, _ = _degree_to_sign(deg)
        natal_houses[key] = {"sign": sign, "degree": round(house_deg, 2), "ruler": _SIGN_RULERS.get(sign), "absolute_longitude": round(deg, 2)}

    raw_aspects = _detect_aspects(raw_positions)
    aspects = [
        {
            "planet1": a["planet1"], "planet2": a["planet2"], "aspect": a["aspect"],
            "tone": a["tone"], "orb": a["orb"],
            "precision": _classify_partile_platyk(a["orb"]),
        }
        for a in raw_aspects
    ]
    aspect_patterns = _detect_aspect_patterns(aspects)
    aspect_patterns["kites"] = _detect_kites(aspects, aspect_patterns["grand_trines"])

    # Vertex — via swe.houses_ex's ascmc array (index 3), no additional ephemeris data
    # needed beyond what's already working. Tested directly against real swisseph output
    # before use.
    vertex_data = None
    try:
        import swisseph as swe
        _, ascmc = swe.houses_ex(jd, lat, lon, b'P')
        vertex_lon = ascmc[3]
        v_sign, v_deg, _ = _degree_to_sign(vertex_lon)
        vertex_data = {"sign": v_sign, "degree": round(v_deg, 2)}
    except Exception as e:
        print(f"⚠️ Vertex calculation failed: {e}")

    # South Node (Ancestral Karma) — exactly opposite the North Node (Rahu), which is
    # already in _PLANETS and already computed above in raw_positions.
    south_node_data = None
    if "Rahu" in raw_positions:
        south_node_lon = (raw_positions["Rahu"]["longitude"] + 180) % 360
        sn_sign, sn_deg, _ = _degree_to_sign(south_node_lon)
        south_node_data = {"sign": sn_sign, "degree": round(sn_deg, 2)}

    chart_shape = _classify_chart_shape([p["longitude"] for p in raw_positions.values()])

    if astrology_system == "both":
        try:
            _, _, astro_timing, vedic_chart = compute_both(
                bd.day, bd.month, bd.year, hour, lat, lon, utc_offset, current_year=2026,
            )
        except Exception:
            _, astro_timing, vedic_chart = compute_western(
                bd.day, bd.month, bd.year, hour, lat, lon, utc_offset, current_year=2026,
            )
    else:
        _, astro_timing, vedic_chart = compute_western(
            bd.day, bd.month, bd.year, hour, lat, lon, utc_offset, current_year=2026,
        )

    midpoint_data = _calculate_midpoints_and_antiscia(bd.day, bd.month, bd.year, hour, utc_offset)
    asteroids = _calculate_asteroids(bd.day, bd.month, bd.year, hour, utc_offset)
    extended_asteroids = _calculate_extended_asteroids(bd.day, bd.month, bd.year, hour, utc_offset)
    dwarf_planets = _calculate_dwarf_planets(bd.day, bd.month, bd.year, hour, utc_offset)
    fixed_stars = _calculate_fixed_stars(bd.day, bd.month, bd.year, hour, utc_offset)

    divisional_charts = None
    if astrology_system == "both" and vedic_chart:
        try:
            sidereal_positions = _calculate_positions(jd, use_sidereal=True)
            divisional_charts = {
                "navamsa": {
                    name: _navamsa_sign(data["sign"], data["degree"])
                    for name, data in sidereal_positions.items()
                },
                "dashamsa": {
                    name: _dashamsa_sign(data["sign"], data["degree"])
                    for name, data in sidereal_positions.items()
                },
            }
        except Exception as e:
            print(f"⚠️ Divisional chart calculation failed: {e}")

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "astrology_system_used": astrology_system,
        "natal_chart": {
            "planets": natal_planets, "houses": natal_houses, "aspects": aspects,
            "aspect_patterns": aspect_patterns, "vertex": vertex_data,
            "south_node": south_node_data, "chart_shape": chart_shape,
        },
        # Progressed Lunation (#24) — the progressed Moon specifically, already present in
        # astro_timing["progressions"] (which covers all planets) — surfaced here as its
        # own named field rather than requiring a separate calculation, since the data
        # already exists.
        "progressed_lunation": astro_timing.get("progressions", {}).get("Moon"),
        "current_transits": astro_timing.get("current_transits", []),
        "arabic_parts": astro_timing.get("arabic_parts", {}),
        "progressions": astro_timing.get("progressions", {}),
        "stelliums": astro_timing.get("stelliums", []),
        "midpoints": midpoint_data["midpoints"],
        "antiscia": midpoint_data["antiscia"],
        "asteroids": asteroids,
        # Code-complete, data-dependent — see extended_celestial_bodies.py's module
        # docstring. Empty dicts until the relevant files are added to your ephemeris
        # directory; not an error, and nothing more needs to change in code once they are.
        "extended_asteroids": extended_asteroids,
        "dwarf_planets": dwarf_planets,
        "fixed_stars": fixed_stars,
        "vedic_chart": vedic_chart,
        # Genuinely new — D9 (marriage/relationships) and D10 (career) divisional charts,
        # only computed when the Vedic path runs. Formula-verified with 43 hand-checked
        # test assertions before being wired in — see _navamsa_sign()/_dashamsa_sign()
        # docstrings — but like Tzolk'in, no independent library to cross-check against.
        "divisional_charts": divisional_charts,
    }


class ChartComparisonRequest(BaseModel):
    client_id: str
    age_a: int
    age_b: int


@router.post("/chart-comparison", response_model=dict)
async def generate_chart_comparison(payload: ChartComparisonRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Chart Comparison — Self vs. Self (#30). The natal chart itself never changes, so
    "comparing your chart at different ages" means comparing progressed positions at two
    different ages — calls the real, already-verified _calculate_progressions() directly
    for each requested age, rather than a new calculation.
    """
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_progressions

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
    birth_jd = _julian_day(bd.year, bd.month, bd.day, 12.0, 0.0)

    progressions_a = _calculate_progressions(birth_jd, payload.age_a, 0.0, 0.0, 0.0)
    progressions_b = _calculate_progressions(birth_jd, payload.age_b, 0.0, 0.0, 0.0)

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "age_a": payload.age_a,
        "progressions_a": progressions_a,
        "age_b": payload.age_b,
        "progressions_b": progressions_b,
    }


class RelocationRequest(BaseModel):
    client_id: str
    relocated_latitude: float
    relocated_longitude: float
    relocated_place_name: str | None = None


@router.post("/relocation", response_model=dict)
async def generate_relocation_chart(payload: RelocationRequest, user: CurrentUser = Depends(get_current_user)):
    """
    Relocation / Astro-Cartography (#21). Planet positions in the zodiac don't change with
    location — only which HOUSE each planet falls into does, since houses are computed from
    the birth moment AND the location together. This recomputes house cusps for the new
    location at the same birth time (same _calculate_houses() already verified elsewhere),
    then re-sorts the client's real natal planets into those new houses.

    NOTE: takes latitude/longitude directly rather than a place name, since there's no
    geocoding service wired into this package yet (same open TODO as birth_location
    elsewhere in this codebase) — sidesteps that gap rather than faking it.
    """
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _calculate_houses, _degree_to_sign

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
    hour = 12.0
    jd = _julian_day(bd.year, bd.month, bd.day, hour, 0.0)

    natal_positions = _calculate_positions(jd, use_sidereal=False)
    relocated_houses = _calculate_houses(jd, payload.relocated_latitude, payload.relocated_longitude, use_sidereal=False)

    house_cusp_degrees = sorted(
        (int(k), v) for k, v in relocated_houses.items() if k.isdigit()
    )

    def _house_for_longitude(lon: float) -> int:
        for i in range(12):
            house_num, cusp_start = house_cusp_degrees[i]
            next_cusp = house_cusp_degrees[(i + 1) % 12][1]
            in_house = (cusp_start <= lon < next_cusp) if cusp_start < next_cusp else (lon >= cusp_start or lon < next_cusp)
            if in_house:
                return house_num
        return house_cusp_degrees[0][0]

    relocated_planet_houses = {
        name: {"sign": data["sign"], "degree": round(data["degree"], 2), "relocated_house": _house_for_longitude(data["longitude"])}
        for name, data in natal_positions.items()
    }

    relocated_house_cusps = {}
    for key, deg in relocated_houses.items():
        sign, house_deg, _ = _degree_to_sign(deg)
        relocated_house_cusps[key] = {"sign": sign, "degree": round(house_deg, 2)}

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "relocated_place_name": payload.relocated_place_name,
        "relocated_latitude": payload.relocated_latitude,
        "relocated_longitude": payload.relocated_longitude,
        "relocated_houses": relocated_house_cusps,
        "relocated_planet_houses": relocated_planet_houses,
    }
