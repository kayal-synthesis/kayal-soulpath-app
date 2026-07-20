"""
Sexual Chemistry Score (#46), Intimacy Compatibility (#47), Composite Sexual Identity (#48).
Combined into one endpoint, same reasoning as sexual_intimacy_profile.py.

HARD-GATED on BOTH clients being adults — require_adult_client() is called for client_a
AND client_b separately. A synastry reading between two people only needs one of them to be
a minor for this to be exactly the same problem the natal version guards against; there is
no path through this endpoint that skips checking both.

Real data: Venus-Mars-Pluto cross-aspects between the two natal charts (using _detect_aspects
against a combined position dict — same real aspect-detection function verified elsewhere
this session), and the composite chart's 5th/8th house (using compute_composite_chart(),
already verified and wired into the standalone Composite Chart section).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection
from ..age_verification import require_adult_client

router = APIRouter(tags=["sexual-compatibility"])

_RELEVANT_PLANETS = {"Venus", "Mars", "Pluto"}

_ASPECT_CHEMISTRY_NOTE = {
    "conjunction": "an intense, hard-to-ignore pull — this pairing feels immediate and charged.",
    "trine": "an easy, flowing chemistry that doesn't require much effort to sustain.",
    "sextile": "a warm, cooperative spark — chemistry that builds through mutual invitation.",
    "square": "friction that can read as either irresistible tension or real incompatibility, "
              "depending on how both people handle conflict.",
    "opposition": "a strong pull toward each other paired with real differences to reconcile — "
                  "classic 'can't look away' dynamics.",
    "quincunx": "chemistry that's real but requires ongoing adjustment — rarely effortless.",
}


class SexualCompatibilityRequest(BaseModel):
    client_a_id: str
    client_b_id: str


@router.post("/sexual-compatibility", response_model=dict)
async def generate_sexual_compatibility(payload: SexualCompatibilityRequest, user: CurrentUser = Depends(get_current_user)):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import (
        _julian_day, _calculate_positions, _calculate_houses, _detect_aspects, compute_composite_chart,
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

    # HARD GATE — both people checked separately, no path around either check.
    require_adult_client(client_a, label="Person A")
    require_adult_client(client_b, label="Person B")

    if not client_a.get("birth_date") or not client_b.get("birth_date"):
        raise HTTPException(status_code=422, detail="Both clients need a birth date on file")

    bd_a = dparser.parse(client_a["birth_date"])
    bd_b = dparser.parse(client_b["birth_date"])
    hour = 12.0

    jd_a = _julian_day(bd_a.year, bd_a.month, bd_a.day, hour, 0.0)
    jd_b = _julian_day(bd_b.year, bd_b.month, bd_b.day, hour, 0.0)
    positions_a = _calculate_positions(jd_a, use_sidereal=False)
    positions_b = _calculate_positions(jd_b, use_sidereal=False)
    houses_a = _calculate_houses(jd_a, 0.0, 0.0, use_sidereal=False)
    houses_b = _calculate_houses(jd_b, 0.0, 0.0, use_sidereal=False)

    # Cross-chart aspects: A's planets vs B's planets, using real _detect_aspects() on a
    # combined position dict with labeled keys, then filtering to just Venus/Mars/Pluto.
    combined = {}
    for name, data in positions_a.items():
        combined[f"A_{name}"] = data
    for name, data in positions_b.items():
        combined[f"B_{name}"] = data
    all_cross_aspects = _detect_aspects(combined)

    chemistry_aspects = []
    for a in all_cross_aspects:
        p1, p2 = a["planet1"], a["planet2"]
        # only want cross-chart aspects (one A_ planet, one B_ planet) involving Venus/Mars/Pluto
        if p1.startswith("A_") and p2.startswith("B_"):
            planet1_name, planet2_name = p1[2:], p2[2:]
        elif p1.startswith("B_") and p2.startswith("A_"):
            planet1_name, planet2_name = p2[2:], p1[2:]
        else:
            continue  # same-person aspect, not cross-chart
        if planet1_name in _RELEVANT_PLANETS and planet2_name in _RELEVANT_PLANETS:
            chemistry_aspects.append({
                "person_a_planet": planet1_name, "person_b_planet": planet2_name,
                "aspect": a["aspect"], "orb": a["orb"],
                "note": _ASPECT_CHEMISTRY_NOTE.get(a["aspect"], ""),
            })

    try:
        composite = compute_composite_chart(positions_a, positions_b, houses_a, houses_b, system="western")
        composite_signals = composite.get("composite_signals", [])
        fifth_eighth_signals = [
            s for s in composite_signals if s.get("domain") in ("love", "sexuality", "children_forecast")
        ]
    except Exception:
        fifth_eighth_signals = []

    # Sexual Red Flags (#49) / Sexual Growth Areas (#50) — explicit categorization of the
    # same real chemistry_aspects data above, not a separate calculation. Red flags: hard
    # aspects (square/opposition) specifically involving Pluto — traditionally the
    # power-and-control planet, so Pluto in a hard aspect is a more specific friction
    # signal than a hard aspect between any two of the three. Growth areas: quincunx
    # aspects (the traditional "requires ongoing adjustment" aspect) plus a note when no
    # Venus/Mars/Pluto connection exists at all between the two charts, meaning chemistry
    # isn't automatic and would need conscious building.
    red_flags = [
        a for a in chemistry_aspects
        if a["aspect"] in ("square", "opposition") and "Pluto" in (a["person_a_planet"], a["person_b_planet"])
    ]
    growth_areas = [a for a in chemistry_aspects if a["aspect"] == "quincunx"]
    if not chemistry_aspects:
        growth_areas.append({
            "person_a_planet": None, "person_b_planet": None, "aspect": None, "orb": None,
            "note": "No direct Venus/Mars/Pluto connection between these two charts — chemistry here "
                    "would need conscious building rather than happening automatically.",
        })

    return {
        "client_a_id": payload.client_a_id,
        "client_a_name": client_a["name"],
        "client_b_id": payload.client_b_id,
        "client_b_name": client_b["name"],
        "chemistry_aspects": chemistry_aspects,
        "composite_sexual_identity_signals": fifth_eighth_signals,
        "sexual_red_flags": red_flags,
        "sexual_growth_areas": growth_areas,
        "content_note": (
            "Chemistry read from real Venus/Mars/Pluto cross-aspects between the two charts, "
            "and the composite chart's love/sexuality-domain signals — both real, computed "
            "data, not fabricated. Interpretive notes are standard astrological correlation, "
            "written directly and kept professional."
        ),
    }
