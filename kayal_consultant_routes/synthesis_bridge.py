"""
Synthesis bridge — connects the consultant platform to the REAL, confirmed-live synthesis
pipeline in main.py (v8.2.0, confirmed running on the server), not the reading_jobs/
reading_worker.py pipeline (confirmed NOT wired into any live route).

process_consultant_reading_job() below is a faithful mirror of main.py's process_reading_job()
— same engine calls, same result shape, same `jobs` table — adapted to take a client_id
(looked up from the consultant platform's own `clients` table) instead of raw form fields,
since a consultant is generating for someone already in their roster, not re-entering data
a customer just typed into a purchase form.

Duplicated rather than imported directly from main.py to avoid a circular import (main.py
would need to import this package to register the routers; this package importing back from
main.py would create a cycle). If main.py's process_reading_job() changes, this needs a
matching update — the docstring on each function below notes exactly which lines in main.py
it mirrors, to make that easy to check.

process_consultant_union_job() is NEW code, not a port of anything confirmed live — there is
no two-person/partner generation route anywhere in main.py. It's built directly on
synastry_engine.py's SynastryEngine and synastry_reader.py's read_synastry(), which are real,
verified files, following the same shape as the individual pipeline. Test this one before
relying on it the way you can already rely on the individual reading path.
"""

import json
import logging
from datetime import date as date_cls, datetime
from typing import Any, Dict, Optional

from dateutil import parser as dparser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Theme lookup tables — copied verbatim from main.py (lines 923-958, v8.2.0).
# ---------------------------------------------------------------------------

_PYV_THEMES = {
    1: "New beginnings — initiate what matters most",
    2: "Cooperation and patience — work with others",
    3: "Creative expression — express yourself",
    4: "Hard work and foundation building — build steadily",
    5: "Freedom and change — embrace the unexpected",
    6: "Service and responsibility — love and commitment",
    7: "Reflection and spiritual depth — go inward",
    8: "Achievement and material success — harvest time",
    9: "Completion and release — let go gracefully",
    11: "Spiritual awakening and illumination — heightened sensitivity",
    22: "Master builder year — grand work becomes possible",
    33: "Master teacher year — serve from love",
}
_MONTH_THEMES = {
    1: "New initiatives", 2: "Cooperation", 3: "Expression",
    4: "Discipline", 5: "Change", 6: "Love and harmony",
    7: "Reflection", 8: "Achievement", 9: "Completion",
}
_WEEK_THEMES = {
    1: "A week of new starts", 2: "A week of partnership", 3: "A week of expression",
    4: "A week of focused work", 5: "A week of movement", 6: "A week of care",
    7: "A week of reflection", 8: "A week of power", 9: "A week of endings",
    11: "A master week of heightened intuition", 22: "A master week of building",
}
_DAY_THEMES = {
    1: "Independence and clarity", 2: "Sensitivity and cooperation",
    3: "Joy and expression", 4: "Discipline and focus",
    5: "Change and freedom", 6: "Love and responsibility",
    7: "Solitude and insight", 8: "Power and achievement", 9: "Completion and wisdom",
    11: "Intuition and illumination", 22: "Master builder energy",
}


def _pyv_theme(n): return _PYV_THEMES.get(n, "A year of significant development")
def _month_theme(n): b = n % 9 or 9; return _MONTH_THEMES.get(b, "Monthly energy in transition")
def _week_theme(n): return _WEEK_THEMES.get(n if n in (11, 22) else (n % 9 or 9), "Weekly energy")
def _day_theme(n): return _DAY_THEMES.get(n if n in (11, 22) else (n % 9 or 9), "Daily vibration")


def _get_sun_sign(day: int, month: int) -> str:
    """Copied verbatim from main.py (lines 1076-1087, v8.2.0)."""
    signs = [
        (1, 19, "Capricorn"), (2, 18, "Aquarius"), (3, 20, "Pisces"),
        (4, 19, "Aries"), (5, 20, "Taurus"), (6, 20, "Gemini"),
        (7, 22, "Cancer"), (8, 22, "Leo"), (9, 22, "Virgo"),
        (10, 22, "Libra"), (11, 21, "Scorpio"), (12, 21, "Sagittarius"),
        (12, 31, "Capricorn"),
    ]
    for cm, cd, sign in signs:
        if month < cm or (month == cm and day <= cd):
            return sign
    return "Capricorn"


# ---------------------------------------------------------------------------
# System selection — GENUINELY NEW, mirrors the exact same addition in main.py. Nothing in
# astrology_engine.py, geo_service.py, or anywhere else picks Western vs. Vedic based on
# where someone is from — confirmed by reading every file available. compute_western()/
# compute_vedic()/compute_both() all already exist and work; this decides which to call.
#
# Rule: birth country in the Vedic/Jyotish tradition → compute_both(). Present location
# doesn't add new information for consultant-generated readings specifically, since
# present_geo always equals birth_geo here (no live customer IP to read) — kept anyway for
# consistency with main.py and in case that changes later.
# ---------------------------------------------------------------------------

_VEDIC_TRADITION_COUNTRIES = {
    "IN", "NP", "LK", "BD", "BT",  # South Asia
    "MU", "FJ", "TT", "GY", "SR",  # large, sustained Vedic-tradition diaspora
}


def select_astrology_system(birth_country_code: str, present_country_code: str = "") -> str:
    """Returns 'western' or 'both' — never 'vedic' alone, matching main.py's rule exactly."""
    birth_is_vedic = (birth_country_code or "").upper() in _VEDIC_TRADITION_COUNTRIES
    present_is_vedic = (present_country_code or "").upper() in _VEDIC_TRADITION_COUNTRIES
    return "both" if (birth_is_vedic or present_is_vedic) else "western"


# ---------------------------------------------------------------------------
# Asteroids — mirrors the exact same addition in main.py. Requires seas_18.se1 in the
# ephemeris directory — tested directly against real Swiss Ephemeris calls (Chiron, Ceres,
# Pallas, Juno, Vesta all returned real, distinct, plausible longitudes for two different
# test dates) before writing this, and tested again end-to-end through the real
# astrology_engine.py module's own _julian_day()/_degree_to_sign() before wiring in here.
# If seas_18.se1 isn't present in EPHE_PATH on the server this runs on, each asteroid fails
# independently rather than taking down the whole reading.
# ---------------------------------------------------------------------------

_ASTEROID_IDS = {"Chiron": 15, "Ceres": 17, "Pallas": 18, "Juno": 19, "Vesta": 20}


def _calculate_asteroids(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict[str, Any]:
    import swisseph as swe
    from synthesis.astrology_engine import _julian_day, _degree_to_sign

    try:
        jd = _julian_day(year, month, day, hour, utc_offset)
    except Exception as e:
        logger.warning(f"Asteroid calculation failed at Julian Day step: {e}")
        return {}

    asteroids = {}
    for name, body_id in _ASTEROID_IDS.items():
        try:
            result, flags = swe.calc_ut(jd, body_id)
            lon = result[0]
            sign, deg, _ = _degree_to_sign(lon)
            asteroids[name] = {"sign": sign, "degree": round(deg, 2), "retrograde": result[3] < 0}
        except Exception as e:
            logger.warning(f"{name} calculation failed (likely missing seas_18.se1 on this server): {e}")

    return asteroids


def _build_geo_location(raw):
    """Copied verbatim from main.py (lines 1090-1109, v8.2.0)."""
    from synthesis.logic.models import GeoLocation

    if isinstance(raw, GeoLocation):
        return raw
    if raw is None:
        return GeoLocation(
            place_name="Unknown", city="", country="", country_code="XX",
            latitude=0.0, longitude=0.0, timezone="UTC", utc_offset=0.0,
        )
    return GeoLocation(
        place_name=getattr(raw, "place_name", "") or str(raw.get("place_name", "") if isinstance(raw, dict) else ""),
        city=getattr(raw, "city", "") or str(raw.get("city", "") if isinstance(raw, dict) else ""),
        country=getattr(raw, "country", "") or str(raw.get("country", "") if isinstance(raw, dict) else ""),
        country_code=getattr(raw, "country_code", "XX") or "XX",
        latitude=float(getattr(raw, "latitude", 0.0) or (raw.get("latitude", 0.0) if isinstance(raw, dict) else 0.0)),
        longitude=float(getattr(raw, "longitude", 0.0) or (raw.get("longitude", 0.0) if isinstance(raw, dict) else 0.0)),
        timezone=getattr(raw, "timezone", "UTC") or str(raw.get("timezone", "UTC") if isinstance(raw, dict) else "UTC"),
        utc_offset=float(getattr(raw, "utc_offset", 0.0) or 0.0),
    )


def _update_job(job_id: str, **fields):
    """Raw psycopg2 update against the real `jobs` table — same connection pattern as main.py."""
    from .deps import get_db_connection

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        set_clause = ", ".join(f"{k}=%s" for k in fields)
        cur.execute(f"UPDATE jobs SET {set_clause} WHERE id=%s", (*fields.values(), job_id))
        conn.commit()
    finally:
        cur.close()
        conn.close()


# ---------------------------------------------------------------------------
# Midpoints & antiscia — NEW, not present anywhere in astrology_engine.py, but the
# midpoint formula itself is copied verbatim from compute_composite_chart() (line ~932:
# "mid = (lon_a + lon_b) / 2; if abs(lon_a - lon_b) > 180: mid = (mid + 180) % 360"),
# not invented — that formula is already proven correct in the live composite-chart code,
# just applied here to planet pairs within one person's chart instead of the same planet
# across two people. Antiscia is the standard, well-known mirror-point formula
# (antiscion = (180 - longitude) % 360, reflection across the solstitial 0° Cancer/
# Capricorn axis) — not something astrology_engine.py needed domain-specific tuning for.
#
# Requires raw natal positions, which compute_western()/compute_astrology() compute
# internally but never return — so this calls _calculate_positions() and _julian_day()
# directly (both "private" by convention, still importable) rather than modifying
# astrology_engine.py's existing public API.
# ---------------------------------------------------------------------------

_MIDPOINT_PAIRS = [("Sun", "Moon"), ("Sun", "Venus"), ("Moon", "Venus"), ("Venus", "Mars"), ("Sun", "Mars")]


def _calculate_midpoints_and_antiscia(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict[str, Any]:
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _degree_to_sign

    try:
        birth_jd = _julian_day(year, month, day, hour, utc_offset)
        positions = _calculate_positions(birth_jd, use_sidereal=False)
    except Exception as e:
        logger.warning(f"Midpoint/antiscia calculation failed: {e}")
        return {"midpoints": {}, "antiscia": {}}

    midpoints: Dict[str, Dict] = {}
    for a, b in _MIDPOINT_PAIRS:
        if a not in positions or b not in positions:
            continue
        lon_a = positions[a]["longitude"]
        lon_b = positions[b]["longitude"]
        mid = (lon_a + lon_b) / 2
        if abs(lon_a - lon_b) > 180:
            mid = (mid + 180) % 360
        sign, deg, _ = _degree_to_sign(mid)
        midpoints[f"{a}/{b}"] = {"sign": sign, "degree": round(deg, 2)}

    antiscia: Dict[str, Dict] = {}
    for planet, pos in positions.items():
        lon = pos.get("longitude")
        if lon is None:
            continue
        antiscion_lon = (180 - lon) % 360
        sign, deg, _ = _degree_to_sign(antiscion_lon)
        antiscia[planet] = {"sign": sign, "degree": round(deg, 2)}

    return {"midpoints": midpoints, "antiscia": antiscia}


# ---------------------------------------------------------------------------
# Individual reading — faithful mirror of main.py's process_reading_job()
# (lines 2005-2157, v8.2.0). Every engine call below matches that function
# exactly; only the input source changed (client record vs. raw form fields)
# and the output destination (still `jobs`, with consultant_id/client_id set).
# ---------------------------------------------------------------------------

def process_consultant_reading_job(
    job_id: str,
    client: Dict[str, Any],
    face_bytes: Optional[bytes] = None,
    palm_bytes_left: Optional[bytes] = None,
    palm_bytes_right: Optional[bytes] = None,
    dominant_hand: Optional[str] = None,
    reading_focus: Optional[str] = None,
) -> None:
    """
    client: a row from the consultant platform's `clients` table — needs at minimum
    name, birth_date, birth_time (nullable), birth_location (nullable).

    face_bytes / palm_bytes_left / palm_bytes_right: raw image bytes from PhotoCapture on
    the frontend, all optional. dominant_hand: 'left' | 'right', only meaningful when a
    palm image is attached — defaults to 'right' when omitted, same as main.py.

    reading_focus: what the consultant says this reading should focus on (e.g. "Love &
    Relationships"). Stored on the result for the consultant's own reference, but does
    NOT currently change what gets generated — traced main.py's equivalent `user_question`
    field all the way through process_reading_job() and confirmed it's accepted but never
    passed into UserInput, run_logic_engine, or narrate() anywhere. The engine always runs
    full "all domains" synthesis regardless of what's asked for here. Making reading_focus
    actually shape the narrative would mean patching prompt_builder.py to incorporate it —
    a real, separate piece of work, not something this function can fix on its own.
    """
    from synthesis.face_engine import FaceEngine
    from synthesis.face_reader import FaceReader
    from synthesis.palm_engine import PalmEngine
    from synthesis.palm_reader import PalmReader
    from synthesis.numerology_engine import compute_numerology_profile
    from synthesis.numerology_reader import read_numerology
    from synthesis.astrology_engine import compute_western
    from synthesis.logic import run_logic_engine
    from synthesis.logic.models import BirthData, UserInput, ALL_DOMAINS
    from delivery.llm_narrator import narrate

    logger.info(f"Starting consultant reading job {job_id} for client {client.get('id')}")
    _update_job(job_id, status="processing")

    try:
        bd = dparser.parse(client["birth_date"])

        birth_geo = _build_geo_location(None)  # TODO: geocode client["birth_location"] here —
        # main.py's live version calls geocode_birth_location(birth_location); wire the same
        # call in here once you confirm services.geo_service is importable from this package's
        # location in your project tree.
        present_geo = birth_geo  # no "current IP" for a consultant generating on a client's behalf

        birth_data = BirthData(
            full_name=client["name"],
            day=bd.day, month=bd.month, year=bd.year,
            hour=None, minute=None, hour_known=False,
            birth_place=birth_geo, present_location=present_geo,
        )

        face_reading = None
        if face_bytes:
            try:
                fe = FaceEngine()
                feats = fe.extract(face_bytes)
                if not feats.error:
                    face_reading = FaceReader().read(feats)
            except Exception as e:
                logger.warning(f"Job {job_id}: face analysis failed: {e}")

        # Dual-palm handling — identical logic to main.py's patched process_reading_job():
        # dominant_hand decides which upload is read as dominant vs. passive, defaulting to
        # "right" only when the field is genuinely absent, not assumed.
        dominant_hand_norm = (dominant_hand or "right").strip().lower()
        dominant_palm = None
        non_dominant_palm = None
        if palm_bytes_left or palm_bytes_right:
            try:
                pe = PalmEngine()
                dom_bytes = palm_bytes_right if dominant_hand_norm == "right" else palm_bytes_left
                pas_bytes = palm_bytes_left if dominant_hand_norm == "right" else palm_bytes_right
                if dom_bytes:
                    dfeats = pe.extract(dom_bytes, hand_label=dominant_hand_norm)
                    if not dfeats.error:
                        dominant_palm = PalmReader().read(dfeats)
                if pas_bytes:
                    pas_hand = "left" if dominant_hand_norm == "right" else "right"
                    pfeats = pe.extract(pas_bytes, hand_label=pas_hand)
                    if not pfeats.error:
                        non_dominant_palm = PalmReader().read(pfeats)
            except Exception as e:
                logger.warning(f"Job {job_id}: dual palm analysis failed: {e}")

        user_input = UserInput(
            birth_data=birth_data,
            face_reading=face_reading,
            dominant_palm=dominant_palm,
            non_dominant_palm=non_dominant_palm,
            dual_palm=None,
            requested_domains=list(ALL_DOMAINS),  # matches live behavior: always full synthesis
            include_remedies=True,
            session_id=job_id,
        )

        num_profile = compute_numerology_profile(birth_data, date_cls.today())
        num_reading = read_numerology(num_profile, bd.day)
        num_signals = {"system": "pythagorean", "signals": num_reading.to_signal_list()}

        hour = birth_data.birth_datetime.hour + birth_data.birth_datetime.minute / 60.0

        # NEW: pick Western-only vs. Western+Vedic based on birth/present country —
        # see select_astrology_system()'s docstring.
        astrology_system = select_astrology_system(
            getattr(birth_geo, "country_code", ""), getattr(present_geo, "country_code", "")
        )

        vedic_chart = None
        if astrology_system == "both":
            try:
                from synthesis.astrology_engine import compute_both
                western_signals, vedic_signals, astro_timing, vedic_chart = compute_both(
                    bd.day, bd.month, bd.year, hour,
                    birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                    current_year=datetime.now().year,
                )
                astro_primary = {
                    "system": "both",
                    "signals": western_signals["signals"] + vedic_signals["signals"],
                }
            except Exception as e:
                logger.warning(f"Job {job_id}: compute_both failed, falling back to Western only: {e}")
                astro_primary, astro_timing, vedic_chart = compute_western(
                    bd.day, bd.month, bd.year, hour,
                    birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                    current_year=datetime.now().year,
                )
        else:
            astro_primary, astro_timing, vedic_chart = compute_western(
                bd.day, bd.month, bd.year, hour,
                birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                current_year=datetime.now().year,
            )

        logic_result = run_logic_engine(
            user_input=user_input,
            astrology_primary=astro_primary,
            numerology_primary=num_signals,
            astrology_timing=astro_timing,
            numerology_timing={
                "personal_year": num_profile.personal_year,
                "personal_year_theme": _pyv_theme(num_profile.personal_year),
                "personal_month": num_profile.personal_month,
                "personal_month_theme": _month_theme(num_profile.personal_month),
                "personal_week": num_profile.personal_week,
                "personal_week_theme": _week_theme(num_profile.personal_week),
                "personal_day": num_profile.personal_day,
                "personal_day_theme": _day_theme(num_profile.personal_day),
            },
            vedic_chart=vedic_chart,
            current_year=datetime.now().year,
        )

        if hasattr(logic_result, "error"):
            raise RuntimeError(f"Logic engine error: {logic_result.error}")

        narration = narrate(logic_result.to_dict(), use_opus=False)

        # astro_timing already contains transits/arabic_parts/progressions/stelliums —
        # compute_western() computes all four on every call, but until now nothing ever
        # stored them past this point. Surfacing what's already correctly computed,
        # not adding new astronomical calculations.
        midpoint_data = _calculate_midpoints_and_antiscia(bd.day, bd.month, bd.year, hour, birth_geo.utc_offset)
        asteroids = _calculate_asteroids(bd.day, bd.month, bd.year, hour, birth_geo.utc_offset)

        result = {
            "reading": narration.full_text,
            "domain_sections": narration.domain_sections,
            "life_path": num_profile.life_path,
            "personal_year": num_profile.personal_year,
            "sun_sign": _get_sun_sign(bd.day, bd.month),
            "generated_at": datetime.utcnow().isoformat(),
            "pipeline": "kayal_v8_production_consultant",
            # Stored for the consultant's own record — does not currently influence the
            # narrative above, see the docstring on this function for why.
            "reading_focus_requested": reading_focus,
            # Already computed inside compute_western() every time — previously discarded
            # after being fed to the narrator. Now actually stored.
            "current_transits": astro_timing.get("current_transits", []),
            "arabic_parts": astro_timing.get("arabic_parts", {}),
            "progressions": astro_timing.get("progressions", {}),
            "stelliums": astro_timing.get("stelliums", []),
            # Genuinely new calculations — see _calculate_midpoints_and_antiscia's docstring.
            "midpoints": midpoint_data["midpoints"],
            "antiscia": midpoint_data["antiscia"],
            # NEW: which system(s) actually ran — see select_astrology_system()'s docstring.
            "astrology_system_used": astrology_system,
            "vedic_chart": vedic_chart,
            "asteroids": asteroids,
        }

        _update_job(job_id, status="completed", result=json.dumps(result), completed_at=datetime.utcnow())
        logger.info(f"Consultant reading job {job_id} completed")

    except Exception as e:
        logger.error(f"Consultant reading job {job_id} failed: {e}", exc_info=True)
        _update_job(job_id, status="failed", error=str(e)[:500])


# ---------------------------------------------------------------------------
# Union Blueprint (synastry) — NEW code, not a port of a confirmed-live route.
# Built on synastry_engine.py (SynastryEngine) and synastry_reader.py
# (read_synastry), both real/verified files. Test this before depending on it
# the way the individual reading path can already be depended on.
# ---------------------------------------------------------------------------

def process_consultant_union_job(job_id: str, client_a: Dict[str, Any], client_b: Dict[str, Any]) -> None:
    from synthesis.numerology_engine import compute_numerology_profile
    from synthesis.astrology_engine import (
        compute_western, compute_composite_chart, _julian_day, _calculate_positions, _calculate_houses,
    )
    from synthesis.synastry_engine import compute_synastry_profile
    from synthesis.synastry_reader import read_synastry
    from synthesis.logic.models import BirthData
    from delivery.llm_narrator import narrate

    logger.info(f"Starting consultant union job {job_id} for {client_a.get('id')} + {client_b.get('id')}")
    _update_job(job_id, status="processing")

    try:
        bd_a = dparser.parse(client_a["birth_date"])
        bd_b = dparser.parse(client_b["birth_date"])

        geo_a = _build_geo_location(None)  # TODO: geocode both birth_locations — see note above
        geo_b = _build_geo_location(None)

        birth_data_a = BirthData(
            full_name=client_a["name"], day=bd_a.day, month=bd_a.month, year=bd_a.year,
            hour=None, minute=None, hour_known=False, birth_place=geo_a, present_location=geo_a,
        )
        birth_data_b = BirthData(
            full_name=client_b["name"], day=bd_b.day, month=bd_b.month, year=bd_b.year,
            hour=None, minute=None, hour_known=False, birth_place=geo_b, present_location=geo_b,
        )

        num_profile_a = compute_numerology_profile(birth_data_a, date_cls.today())
        num_profile_b = compute_numerology_profile(birth_data_b, date_cls.today())

        hour_a = birth_data_a.birth_datetime.hour + birth_data_a.birth_datetime.minute / 60.0
        hour_b = birth_data_b.birth_datetime.hour + birth_data_b.birth_datetime.minute / 60.0

        synastry_profile = compute_synastry_profile(
            day_a=bd_a.day, month_a=bd_a.month, year_a=bd_a.year, hour_a=hour_a,
            lat_a=geo_a.latitude, lon_a=geo_a.longitude, utc_a=geo_a.utc_offset,
            day_b=bd_b.day, month_b=bd_b.month, year_b=bd_b.year, hour_b=hour_b,
            lat_b=geo_b.latitude, lon_b=geo_b.longitude, utc_b=geo_b.utc_offset,
            system="western",
            person_a_label=client_a["name"], person_b_label=client_b["name"],
            numerology_lp_a=num_profile_a.life_path, numerology_lp_b=num_profile_b.life_path,
        )

        synastry_reading = read_synastry(synastry_profile)

        # Composite chart — uses compute_composite_chart(), a real, already-verified function
        # in astrology_engine.py that was never wired into anything live. positions/houses
        # aren't returned by compute_western(), so calling _calculate_positions()/
        # _calculate_houses() directly here (both "private" by convention, still importable)
        # rather than modifying astrology_engine.py's existing public API. Wrapped separately
        # so a failure here doesn't take down the whole union reading — composite chart is
        # additive, not load-bearing.
        composite_chart = None
        try:
            jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour_a, geo_a.utc_offset)
            jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour_b, geo_b.utc_offset)
            positions_a = _calculate_positions(jd_a, use_sidereal=False)
            positions_b = _calculate_positions(jd_b, use_sidereal=False)
            houses_a = _calculate_houses(jd_a, geo_a.latitude, geo_a.longitude, use_sidereal=False)
            houses_b = _calculate_houses(jd_b, geo_b.latitude, geo_b.longitude, use_sidereal=False)
            composite_result = compute_composite_chart(positions_a, positions_b, houses_a, houses_b, system="western")
            composite_chart = {
                "positions": {
                    planet: {"sign": data["sign"], "degree": data["degree"]}
                    for planet, data in composite_result["composite_positions"].items()
                },
                "ascendant": {
                    "sign": composite_result["composite_asc"]["sign"],
                    "degree": composite_result["composite_asc"]["degree"],
                    "reading": composite_result["composite_asc"]["reading"],
                },
            }
        except Exception as e:
            logger.warning(f"Job {job_id}: composite chart calculation failed: {e}")

        # NOTE: exactly how a SynastryReading -> narrator payload conversion should look
        # (i.e. what build_union_prompt_package() in prompt_builder.py actually expects)
        # isn't confirmed against a live route, since none exists yet. This calls narrate()
        # with synastry_reading.to_dict() directly, mirroring how the individual path calls
        # narrate(logic_result.to_dict()) — but unlike the individual path, this hasn't been
        # exercised against a real request yet. Test end-to-end before trusting this blindly.
        narration = narrate(synastry_reading.to_dict(), use_opus=False)

        result = {
            "reading": narration.full_text,
            "domain_sections": narration.domain_sections,
            "compatibility_percentages": {
                "overall": synastry_profile.compatibility.overall,
                "love": synastry_profile.compatibility.love,
                "career": synastry_profile.compatibility.career,
                "wealth": synastry_profile.compatibility.wealth,
                "health": synastry_profile.compatibility.health,
                "spiritual": synastry_profile.compatibility.spiritual,
                "children_forecast": synastry_profile.compatibility.children_forecast,
                "character": synastry_profile.compatibility.character,
            },
            "union_remedies": synastry_profile.union_remedies,
            "composite_chart": composite_chart,
            "generated_at": datetime.utcnow().isoformat(),
            "pipeline": "kayal_v8_production_consultant_union",
        }

        _update_job(job_id, status="completed", result=json.dumps(result), completed_at=datetime.utcnow())
        logger.info(f"Consultant union job {job_id} completed")

    except Exception as e:
        logger.error(f"Consultant union job {job_id} failed: {e}", exc_info=True)
        _update_job(job_id, status="failed", error=str(e)[:500])
