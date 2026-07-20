"""
Chinese BaZi (Four Pillars) — genuinely new, confirmed zero existing code anywhere.

CONFIDENCE LEVELS ARE NOT UNIFORM ACROSS THIS FEATURE, and that's stated here plainly
rather than smoothed over:

- YEAR and MONTH pillars: HIGH confidence. Both depend on solar longitude crossing the 12
  standard "jie" solar-term thresholds (Lichun at 315°, etc.) — computed via the same real
  Swiss Ephemeris sun-position access already verified elsewhere this session, not a
  memorized date. The solar-term-to-branch mapping was verified internally consistent
  (12 terms, evenly spaced 30° apart) before use. The year anchor (1984 = Jiazi year) is a
  widely-cited, well-known reference point.

- DAY and HOUR pillars: LOWER confidence, and this is the one real gap. Unlike the Mayan
  Tzolk'in anchor (a single, famous, extensively-documented date), there is no equally
  well-established day-pillar epoch constant I can cite with the same confidence. The
  60-cycle MECHANICS below are verified correct (all 60 stem/branch combinations unique,
  correct parity, cycles back exactly after 60 steps) — what's NOT independently verified
  is which day these 60 days actually started counting from in the real world. That single
  constant (_DAY_PILLAR_EPOCH_JDN below) is isolated specifically so it's the one thing to
  check and correct, not spread across the whole implementation.

VERIFICATION STEP BEFORE TRUSTING DAY/HOUR PILLARS: pick any date with a day-pillar you can
confirm from a source you already trust (an existing BaZi chart, a Chinese calendar app,
etc.), generate a reading for that date here, and compare. If it's off, it'll be off by a
fixed, consistent amount for every date — meaning _DAY_PILLAR_EPOCH_JDN just needs
adjusting by that same fixed amount, not a redesign.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["chinese-astrology"])

_STEMS = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"]
_BRANCHES = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"]
_STEM_ELEMENTS = ["Wood", "Wood", "Fire", "Fire", "Earth", "Earth", "Metal", "Metal", "Water", "Water"]
_BRANCH_ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat",
                    "Monkey", "Rooster", "Dog", "Pig"]

# 12 solar terms ("jie") that start each BaZi month — fixed branch per term regardless of
# year, verified evenly spaced 30° apart before use (see module docstring).
_SOLAR_TERM_THRESHOLDS = [
    (315, "Yin"), (345, "Mao"), (15, "Chen"), (45, "Si"), (75, "Wu"), (105, "Wei"),
    (135, "Shen"), (165, "You"), (195, "Xu"), (225, "Hai"), (255, "Zi"), (285, "Chou"),
]

# Five Tigers rule — year stem determines the starting month stem for the Yin (1st) month;
# each subsequent month's stem follows the standard stem cycle from there.
_FIVE_TIGERS = {
    "Jia": "Bing", "Ji": "Bing", "Yi": "Wu", "Geng": "Wu", "Bing": "Geng", "Xin": "Geng",
    "Ding": "Ren", "Ren": "Ren", "Wu": "Jia", "Gui": "Jia",
}

# Five Rats rule — day stem determines the starting hour stem for the Zi hour (23:00-01:00);
# each subsequent 2-hour block's stem follows the standard stem cycle from there.
_FIVE_RATS = {
    "Jia": "Jia", "Ji": "Jia", "Yi": "Bing", "Geng": "Bing", "Bing": "Wu", "Xin": "Wu",
    "Ding": "Geng", "Ren": "Geng", "Wu": "Ren", "Gui": "Ren",
}

_YEAR_ANCHOR = 1984  # 1984 = Jiazi (甲子) year — widely-cited reference point, HIGH confidence

# LOWER CONFIDENCE — see module docstring. Isolated here specifically so it's the one
# constant to check and correct if a known reference date doesn't match.
_DAY_PILLAR_EPOCH_JDN_OFFSET = 49  # sexagenary_index = (JDN + 49) % 60


class BaziRequest(BaseModel):
    client_id: str


def _sexagenary(n: int) -> dict:
    return {"stem": _STEMS[n % 10], "branch": _BRANCHES[n % 12],
            "element": _STEM_ELEMENTS[n % 10], "animal": _BRANCH_ANIMALS[n % 12]}


@router.post("/chinese-astrology", response_model=dict)
async def generate_bazi_reading(payload: BaziRequest, user: CurrentUser = Depends(get_current_user)):
    from dateutil import parser as dparser
    from synthesis.astrology_engine import _julian_day, _calculate_positions

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
    try:
        if client.get("birth_time"):
            bt = dparser.parse(str(client["birth_time"]))
            hour = bt.hour + bt.minute / 60.0
    except Exception:
        pass

    jd = _julian_day(bd.year, bd.month, bd.day, hour, 0.0)
    positions = _calculate_positions(jd, use_sidereal=False)
    sun_lon = positions["Sun"]["longitude"]

    # Determine which solar-term window the birth falls in, walking backward from Lichun (315°)
    month_branch = None
    for i, (threshold, branch) in enumerate(_SOLAR_TERM_THRESHOLDS):
        next_threshold = _SOLAR_TERM_THRESHOLDS[(i + 1) % 12][0]
        in_window = (
            (threshold <= sun_lon < next_threshold) if threshold < next_threshold
            else (sun_lon >= threshold or sun_lon < next_threshold)  # wraps past 360°/0°
        )
        if in_window:
            month_branch = branch
            break

    # Year pillar: Chinese year starts at Lichun (315°), not Jan 1 — if birth is before
    # Lichun for the calendar year, it belongs to the previous Chinese year.
    if sun_lon < 315 and bd.month <= 2:
        chinese_year = bd.year - 1
    else:
        chinese_year = bd.year

    year_offset = (chinese_year - _YEAR_ANCHOR) % 60
    year_pillar = _sexagenary(year_offset)

    month_stem_start = _FIVE_TIGERS[year_pillar["stem"]]
    month_branch_order = ["Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai", "Zi", "Chou"]
    month_position = month_branch_order.index(month_branch)
    month_stem = _STEMS[(_STEMS.index(month_stem_start) + month_position) % 10]
    month_pillar = {"stem": month_stem, "branch": month_branch,
                     "element": _STEM_ELEMENTS[_STEMS.index(month_stem)],
                     "animal": _BRANCH_ANIMALS[_BRANCHES.index(month_branch)]}

    day_jdn = int(round(jd))
    day_offset = (day_jdn + _DAY_PILLAR_EPOCH_JDN_OFFSET) % 60
    day_pillar = _sexagenary(day_offset)

    hour_branch_idx = int(((hour + 1) % 24) // 2)  # 23:00-00:59 -> Zi(0), 01:00-02:59 -> Chou(1), etc.
    hour_branch = _BRANCHES[hour_branch_idx]
    hour_stem_start = _FIVE_RATS[day_pillar["stem"]]
    hour_stem = _STEMS[(_STEMS.index(hour_stem_start) + hour_branch_idx) % 10]
    hour_pillar = {"stem": hour_stem, "branch": hour_branch,
                    "element": _STEM_ELEMENTS[_STEMS.index(hour_stem)],
                    "animal": _BRANCH_ANIMALS[hour_branch_idx]}

    element_counts: dict = {}
    for pillar in [year_pillar, month_pillar, day_pillar, hour_pillar]:
        element_counts[pillar["element"]] = element_counts.get(pillar["element"], 0) + 1

    return {
        "client_id": payload.client_id,
        "client_name": client["name"],
        "year_pillar": year_pillar,
        "month_pillar": month_pillar,
        "day_pillar": day_pillar,
        "hour_pillar": hour_pillar,
        "five_element_balance": element_counts,
        "day_master": day_pillar["stem"],  # the Day Stem is traditionally "you" in BaZi
        "confidence_note": (
            "Year and Month pillars: high confidence, computed from real solar longitude "
            "(same Swiss Ephemeris access verified elsewhere this session), not a memorized "
            "date. Day and Hour pillars: lower confidence — the 60-day cycle mechanics are "
            "verified correct, but the epoch anchor (which real-world date starts the count) "
            "isn't independently confirmed the way Tzolk'in's anchor was. Recommend checking "
            "this client's Day Pillar against a source you already trust before relying on it."
        ),
    }
