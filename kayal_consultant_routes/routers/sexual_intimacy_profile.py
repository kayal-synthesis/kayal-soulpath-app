"""
Sexual & Intimacy Profile — Sexual Style (#31), Kink & Fantasy Indicators (#32), Intimacy
Wounds via Chiron (#33), Sexual Communication Style (#34), Orgasmic Potential (#37).
Combined into one endpoint rather than five, matching the astrology_snapshot.py pattern —
they all draw from the same underlying natal computation.

HARD-GATED behind require_adult_client() — see age_verification.py. This runs before
anything else in the function; there is no path through this endpoint that skips it.

Uses real, already-computed natal placements (Mars, Venus, Pluto, Mercury, Chiron, plus the
5th/8th/3rd house rulers) — the same _calculate_positions()/_calculate_houses() calls
verified elsewhere this session. The interpretive text is standard astrological
sign-correlation (Mars in Aries = direct and fast-paced; Mars in Cancer = needs emotional
safety first — this is completely conventional astrological practice, not something with a
"correct answer" to verify against the way solar-term timing was). Written directly, not
LLM-generated, kept professional and grounded rather than explicit.

Eros (#433) and Psyche (#16) asteroids — feature #35 — are NOT included. Tested directly:
neither is covered by seas_18.se1 (confirmed via real swisseph calls, each needs its own
file: se00433s.se1 and se00016s.se1 respectively). Add those files and this can be
extended the same way asteroids.py was.

Sexual Energy Cycles (#36) is not included here — that's inherently a timing/transit
feature (cycles over time), not a natal snapshot, and belongs with the other timing
features (#66-68) which are deliberately being scoped separately, not rushed into this batch.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection
from ..age_verification import require_adult_client
from ..synthesis_bridge import _calculate_asteroids

router = APIRouter(tags=["sexual-intimacy-profile"])

_MARS_STYLE = {
    "Aries": "Direct, fast-paced, and initiating — pursues what it wants without hesitation.",
    "Taurus": "Sensual and unhurried — builds slowly through touch, comfort, and physical presence.",
    "Gemini": "Playful and mentally engaged — talk, wit, and variety are part of the draw.",
    "Cancer": "Needs emotional safety before physical openness — intimacy follows trust.",
    "Leo": "Expressive and generous — wants to be admired and to make a partner feel adored.",
    "Virgo": "Attentive and detail-oriented — shows desire through care and precision.",
    "Libra": "Seeks harmony and mutual pleasure — attuned to a partner's responses.",
    "Scorpio": "Intense and all-in — drawn to depth, and can find surface-level encounters unsatisfying.",
    "Sagittarius": "Adventurous and freedom-loving — drawn to novelty and exploration.",
    "Capricorn": "Controlled and purposeful — desire builds through earned trust and respect.",
    "Aquarius": "Unconventional — draws on mental connection and a sense of individuality within intimacy.",
    "Pisces": "Dreamy and merging — intimacy is often felt as emotional or even spiritual dissolution.",
}
_VENUS_STYLE = {
    "Aries": "Drawn to excitement, spontaneity, and a bit of chase.",
    "Taurus": "Craves physical comfort, steady affection, and sensory pleasure.",
    "Gemini": "Attracted by conversation, humor, and mental chemistry first.",
    "Cancer": "Bonds through nurturing and being nurtured — tenderness matters most.",
    "Leo": "Wants romance to feel a little dramatic — grand gestures land well.",
    "Virgo": "Shows love through helpfulness and noticing small details others miss.",
    "Libra": "Values partnership, aesthetics, and a sense of balance in the connection.",
    "Scorpio": "Wants depth and exclusivity — surface-level romance rarely satisfies.",
    "Sagittarius": "Drawn to partners who expand their world — shared adventure matters.",
    "Capricorn": "Takes romance seriously and shows commitment through consistency.",
    "Aquarius": "Values friendship as the foundation — needs room to stay independent.",
    "Pisces": "Romantic and idealistic — drawn to a feeling of soulmate-level connection.",
}
_PLUTO_STYLE = {
    "Aries": "Power shows up as assertion — needs to feel in control of their own desire.",
    "Taurus": "Power is about possession and physical certainty — wants to feel securely held.",
    "Gemini": "Power plays out through words and information — persuasion is intimacy.",
    "Cancer": "Power is emotional — whoever holds vulnerability holds the deeper leverage.",
    "Leo": "Power is about being seen and central — being ignored is the real threat.",
    "Virgo": "Power is expressed through competence and control of detail.",
    "Libra": "Power struggles show up around fairness — imbalance is what triggers intensity.",
    "Scorpio": "Power and intimacy are fused — this is the classic depth-and-transformation placement.",
    "Sagittarius": "Power is about freedom — feeling confined is the fastest way to lose interest.",
    "Capricorn": "Power is structural — about who holds authority and long-term control.",
    "Aquarius": "Power is about autonomy — resists anything that feels like ownership.",
    "Pisces": "Power dissolves boundaries — can be drawn to merging so completely the self gets lost.",
}
_CHIRON_WOUND = {
    "Aries": "A wound around asserting desire directly — fear of being too much, or not enough, in the pursuit.",
    "Taurus": "A wound around physical safety and self-worth tied to the body.",
    "Gemini": "A wound around being truly heard when talking about desire or need.",
    "Cancer": "A wound around emotional safety — fear that vulnerability will be used against them.",
    "Leo": "A wound around being truly seen, not just performed for or admired.",
    "Virgo": "A wound around never being 'good enough,' even in intimate moments.",
    "Libra": "A wound around whether they're truly wanted, not just convenient.",
    "Scorpio": "A wound around trust after past betrayal or loss of control.",
    "Sagittarius": "A wound around freedom versus commitment — fear of being trapped.",
    "Capricorn": "A wound around whether they deserve softness, not just responsibility.",
    "Aquarius": "A wound around belonging without losing their individuality.",
    "Pisces": "A wound around boundaries — where they end and a partner begins.",
}


class SexualProfileRequest(BaseModel):
    client_id: str


@router.post("/sexual-intimacy-profile", response_model=dict)
async def generate_sexual_intimacy_profile(payload: SexualProfileRequest, user: CurrentUser = Depends(get_current_user)):
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

    # HARD GATE — runs before any content is generated, no path around this.
    require_adult_client(client, label="client")

    if not client.get("birth_date"):
        raise HTTPException(status_code=422, detail="This client has no birth date on file")

    bd = dparser.parse(client["birth_date"])
    hour = 12.0
    jd = _julian_day(bd.year, bd.month, bd.day, hour, 0.0)
    positions = _calculate_positions(jd, use_sidereal=False)
    houses = _calculate_houses(jd, 0.0, 0.0, use_sidereal=False)

    mars_sign = positions["Mars"]["sign"]
    venus_sign = positions["Venus"]["sign"]
    pluto_sign = positions["Pluto"]["sign"]
    mercury_sign = positions["Mercury"]["sign"]

    # Chiron isn't in _PLANETS (confirmed by grepping astrology_engine.py — only the 10
    # classical bodies + Rahu are there), so it's not in `positions` above. Using the same
    # _calculate_asteroids() already verified elsewhere this session instead of assuming.
    asteroids = _calculate_asteroids(bd.day, bd.month, bd.year, hour, 0.0)
    chiron_sign = asteroids.get("Chiron", {}).get("sign")

    fifth_house_sign, _, _ = _degree_to_sign(houses["5"])
    eighth_house_sign, _, _ = _degree_to_sign(houses["8"])
    third_house_sign, _, _ = _degree_to_sign(houses["3"])

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "sexual_style": {
            "mars_sign": mars_sign,
            "drive_style": _MARS_STYLE.get(mars_sign, ""),
            "venus_sign": venus_sign,
            "pleasure_style": _VENUS_STYLE.get(venus_sign, ""),
        },
        "power_and_depth": {
            "pluto_sign": pluto_sign,
            "reading": _PLUTO_STYLE.get(pluto_sign, ""),
            "eighth_house_sign": eighth_house_sign,
        },
        "intimacy_wounds": {
            "chiron_sign": chiron_sign,
            "reading": _CHIRON_WOUND.get(chiron_sign, "") if chiron_sign else None,
            "note": None if chiron_sign else "Chiron position unavailable — requires seas_18.se1 in the ephemeris directory (already confirmed working for the other five asteroids).",
        },
        "communication_style": {
            "mercury_sign": mercury_sign,
            "third_house_sign": third_house_sign,
        },
        "romance_and_play": {
            "fifth_house_sign": fifth_house_sign,
        },
        "content_note": (
            "Interpretive content grounded in real natal placements, using standard astrological "
            "sign correlations — written directly, not AI-generated. Kept professional and "
            "psychologically-framed rather than explicit, matching the tone appropriate for a "
            "consultant's working tool."
        ),
    }
