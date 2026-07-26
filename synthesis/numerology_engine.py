"""
Numerology Engine — KAYAL Synthesis Platform
=============================================
Implements all KAYAL custom numerology formulas exactly
as specified in the KAYAL Personalized Formulas document.

Formulas implemented:
    1.  Universal Year
    2.  Personal Year Vibration (PYV) — KAYAL custom formula
    3.  Monthly Vibration
    4.  Weekly Vibration
    5.  Daily Vibration
    6.  Life Path Number
    7.  Personality Number (consonants)
    8.  Pinnacle Numbers (P1–P4)
    9.  Pinnacle Timing
    10. Pinnacle Challenges (C1–C4)
    11. Birthday System (Gift and Challenge)
    12. Destiny Number (all letters)
    13. Soul Urge Number (vowels) — added per confirmation
    14. Karmic Numbers — birth date + Destiny pre-reduction + Life Path pre-reduction
    15. Chaldean secondary system — for Middle Eastern users

Reduction rules (KAYAL specification):
    Master numbers 11, 22, 33 → never reduced
    All other numbers > 9 → sum digits until single digit
    Numbers 1–9 → keep as is

v2.0.0 additions:
    16. get_week_theme() / get_day_theme()     — theme helpers for main.py
    17. compute_partner_numerology()           — partner profile from PartnerBirthData
    18. life_path_compatibility()              — LP harmony between two people
    19. compute_compatibility_score()          — full numerical compatibility 0.0–1.0
    20. compatibility_verdict()               — CompatibilityLevel from score
    21. karmic_debt_cross_analysis()          — how two people's debts interact
    22. name_correction_analysis()            — current vs birth name rating
    23. address_vibration()                   — house/address number
    24. business_name_vibration()             — business name compatibility
    25. children_timing_forecast_num()        — children windows from numerology cycles
    26. infidelity_indicators_numerology()    — fidelity indicators from numbers
    27. health_indicators_numerology()        — health vulnerabilities from numbers
    28. spirit_indicators_numerology()        — karmic/spirit indicators from numbers
    29. death_transition_indicators_num()     — longevity indicators from numbers
    30. compute_numerological_remedy()        — NumerologicalRemedy from profile
    31. parent_inheritance_numerology()       — what inherited from parent numbers
    32. union_destiny_numerology()            — combined destiny of two people

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Set, Tuple

# FIXED IMPORT: models is in synthesis/logic/
from .logic.models import (
    BirthData,
    NumerologyProfile,
    NumerologySystem,
    KarmicDebt,
    KarmicDebtType,
    Pinnacle,
    Domain,
    # v2.0.0 new imports
    PartnerBirthData,
    CompatibilityLevel,
    NumerologicalRemedy,
    InfidelityRisk,
    RemedyUrgency,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pythagorean alphabet — KAYAL specification
# A,J,S=1  B,K,T=2  C,L,U=3  D,M,V=4  E,N,W=5
# F,O,X=6  G,P,Y=7  H,Q,Z=8  I,R=9
# ---------------------------------------------------------------------------

_PYTHAGOREAN: Dict[str, int] = {
    'A': 1, 'J': 1, 'S': 1,
    'B': 2, 'K': 2, 'T': 2,
    'C': 3, 'L': 3, 'U': 3,
    'D': 4, 'M': 4, 'V': 4,
    'E': 5, 'N': 5, 'W': 5,
    'F': 6, 'O': 6, 'X': 6,
    'G': 7, 'P': 7, 'Y': 7,
    'H': 8, 'Q': 8, 'Z': 8,
    'I': 9, 'R': 9,
}

# Consonant personality alphabet from KAYAL specification
_CONSONANT_VALUES: Dict[str, int] = {
    'B': 2, 'C': 3, 'D': 4, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5,
    'P': 7, 'Q': 8, 'R': 9, 'S': 1, 'T': 2,
    'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
}

_VOWELS: Set[str] = {'A', 'E', 'I', 'O', 'U'}

# ---------------------------------------------------------------------------
# Chaldean alphabet — for Middle Eastern users
# ---------------------------------------------------------------------------

_CHALDEAN: Dict[str, int] = {
    'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
    'B': 2, 'K': 2, 'R': 2,
    'C': 3, 'G': 3, 'L': 3, 'S': 3,
    'D': 4, 'M': 4, 'T': 4,
    'E': 5, 'H': 5, 'N': 5, 'X': 5,
    'U': 6, 'V': 6, 'W': 6,
    'O': 7, 'Z': 7,
    'F': 8, 'P': 8,
}
# Note: Chaldean has no 9 assignment for any letter


# ---------------------------------------------------------------------------
# Core reduction function  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def reduce(n: int) -> int:
    """
    Reduce a number to single digit (1–9) or master number (11, 22, 33).
    KAYAL specification: master numbers 11, 22, 33 are never reduced.
    """
    if n in (11, 22, 33):
        return n
    while n > 9:
        n = sum(int(d) for d in str(n))
        if n in (11, 22, 33):
            return n
    return n


def is_master(n: int) -> bool:
    return n in (11, 22, 33)


def sum_digits(n: int) -> int:
    """Sum all digits of a number (no reduction)."""
    return sum(int(d) for d in str(abs(n)))


# ---------------------------------------------------------------------------
# Formula 1: Universal Year  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def universal_year(year: int) -> int:
    """
    Formula: Sum digits of current year → reduce
    Example: 2026 = 2+0+2+6 = 10 → 1+0 = 1
    """
    return reduce(sum_digits(year))


# ---------------------------------------------------------------------------
# Formula 2: Personal Year Vibration (KAYAL custom)  (v1.0.0 — preserved)
# ---------------------------------------------------------------------------

def personal_year_vibration(
    birth_day: int,
    birth_month: int,
    current_year: int,
) -> int:
    """
    KAYAL Formula: Birth Day + Birth Month + Universal Year → reduce
    Example: born 15/06 in 2026 → 15 + 6 + 1 = 22
    Note: Master numbers preserved (22 is NOT reduced to 4)
    """
    uy = universal_year(current_year)
    return reduce(birth_day + birth_month + uy)


# ---------------------------------------------------------------------------
# Formula 3: Monthly Vibration  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def monthly_vibration(pvv: int, current_month: int) -> int:
    """
    Formula: PYV + Current Month → reduce
    Example: January (1) with PYV 22 → 22 + 1 = 23 → 2+3 = 5
    """
    return reduce(pvv + current_month)


# ---------------------------------------------------------------------------
# Formula 4: Weekly Vibration  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def weekly_vibration(pvv: int, current_month: int, week_of_month: int) -> int:
    """
    Formula: PYV + Current Month + Week of Month → reduce
    Week of Month: 1–5 (which week within the month)
    Example: Week 5 → 22 + 1 + 5 = 28 → 2+8 = 10 → 1+0 = 1
    """
    return reduce(pvv + current_month + week_of_month)


# ---------------------------------------------------------------------------
# Formula 5: Daily Vibration  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def daily_vibration(
    pvv: int,
    current_month: int,
    week_of_month: int,
    day_of_week: int,
) -> int:
    """
    Formula: PYV + Current Month + Week of Month + Day of Week → reduce
    Day of Week: Sunday=1, Monday=2, ..., Saturday=7
    Example: Friday (6) → 22 + 1 + 5 + 6 = 34 → 3+4 = 7
    """
    return reduce(pvv + current_month + week_of_month + day_of_week)


def week_of_month(day: int) -> int:
    """Calculate week of month (1–5) from day of month."""
    return ((day - 1) // 7) + 1


def day_of_week_kayal(d: date) -> int:
    """
    KAYAL convention: Sunday=1, Monday=2, ..., Saturday=7
    Python weekday(): Monday=0 ... Sunday=6
    """
    python_dow = d.weekday()  # 0=Monday ... 6=Sunday
    kayal_dow = (python_dow + 2) % 7
    return kayal_dow if kayal_dow > 0 else 7


# ---------------------------------------------------------------------------
# Missing Numbers — digits 1–9 absent from the birth date
# NEW: previously had no calculation anywhere despite being a shipped tool
# (missing-numbers-reading) with real front-end copy already written.
# ---------------------------------------------------------------------------

def missing_numbers(day: int, month: int, year: int) -> List[int]:
    """
    KAYAL Formula: Identify which digits 1–9 never appear in the birth date.
    Uses the full DD/MM/YYYY digit string. 0 carries no numerological value
    in this system and is excluded from both the "present" and "missing" sets.

    Example: 15/06/1982 -> digits used: 1,5,0,6,1,9,8,2
             present (excluding 0): {1,2,5,6,8,9}
             missing: [3, 4, 7]
    """
    all_digits = f"{day:02d}{month:02d}{year:04d}"
    present = {int(d) for d in all_digits if d != '0'}
    return [n for n in range(1, 10) if n not in present]


_MISSING_NUMBER_THEMES: Dict[int, str] = {
    1: "Independence and self-initiation were not naturally reinforced — leadership and standing alone are learned skills here, not instincts.",
    2: "Cooperation and sensitivity to others were not automatically present — partnership and patience take conscious practice.",
    3: "Self-expression and creative confidence were not a given — communicating freely is built deliberately, not innate.",
    4: "Discipline and structure were not naturally reinforced — order and follow-through are chosen, not automatic.",
    5: "Adaptability and comfort with change were not a given — flexibility is a practiced skill here, not a reflex.",
    6: "Responsibility toward others and domestic care were not automatically present — nurturing is a conscious choice, not instinct.",
    7: "Introspection and trust in the unseen were not naturally reinforced — depth and reflection are built, not inherited.",
    8: "Comfort with authority, power, and material ambition was not a given — claiming this territory takes deliberate practice.",
    9: "Compassion at scale and letting go were not automatically present — releasing and giving are learned rather than instinctive.",
}


def get_missing_number_theme(n: int) -> str:
    return _MISSING_NUMBER_THEMES.get(
        n, "A capacity built through deliberate practice rather than natural instinct."
    )


# ---------------------------------------------------------------------------
# Formula 6: Life Path Number  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def life_path(day: int, month: int, year: int) -> Tuple[int, int]:
    """
    Formula: Sum all digits of birth date (DD/MM/YYYY) → reduce
    Master numbers 11, 22, 33 not reduced.
    Example: 15/06/1982 = 1+5+0+6+1+9+8+2 = 32 → 3+2 = 5

    Returns (life_path_number, pre_reduction_value)
    """
    date_str = f"{day:02d}{month:02d}{year:04d}"
    total = sum(int(d) for d in date_str)
    pre_reduction = total
    return reduce(total), pre_reduction


# ---------------------------------------------------------------------------
# Formula 7: Personality Number  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def personality_number(full_name: str) -> int:
    """
    Formula: Sum only consonants in full birth name → reduce
    Uses KAYAL consonant alphabet.
    """
    total = 0
    for char in full_name.upper():
        if char in _CONSONANT_VALUES:
            total += _CONSONANT_VALUES[char]
    return reduce(total)


# ---------------------------------------------------------------------------
# Soul Urge  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def soul_urge_number(full_name: str) -> int:
    """
    Formula: Sum vowels only in full birth name → reduce
    Vowels: A, E, I, O, U
    """
    total = 0
    for char in full_name.upper():
        if char in _VOWELS and char in _PYTHAGOREAN:
            total += _PYTHAGOREAN[char]
    return reduce(total)


# ---------------------------------------------------------------------------
# Formula 12: Destiny Number  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def destiny_number(full_name: str) -> Tuple[int, int]:
    """
    Formula: Sum all letters in full birth name → reduce
    Returns (destiny_number, pre_reduction_value)
    """
    total = 0
    for char in full_name.upper():
        if char in _PYTHAGOREAN:
            total += _PYTHAGOREAN[char]
    pre_reduction = total
    return reduce(total), pre_reduction


# ---------------------------------------------------------------------------
# Chaldean calculations  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def chaldean_destiny(full_name: str) -> int:
    """Destiny number using Chaldean alphabet."""
    total = sum(
        _CHALDEAN.get(c, 0)
        for c in full_name.upper()
        if c.isalpha()
    )
    return reduce(total)


def chaldean_life_path(day: int, month: int, year: int) -> int:
    """Life path using Chaldean digit values."""
    return life_path(day, month, year)[0]


# ---------------------------------------------------------------------------
# Formula 8 & 9: Pinnacle Numbers and Timing  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def _component_M(month: int) -> int:
    return reduce(month)


def _component_D(day: int) -> int:
    return reduce(day)


def _component_Y(year: int) -> int:
    return reduce(sum_digits(year))


def pinnacle_numbers(day: int, month: int, year: int) -> Tuple[int, int, int, int]:
    """
    P1 = reduce(M + D)
    P2 = reduce(D + Y)
    P3 = reduce(P1 + P2)
    P4 = reduce(M + Y)
    """
    M = _component_M(month)
    D = _component_D(day)
    Y = _component_Y(year)
    p1 = reduce(M + D)
    p2 = reduce(D + Y)
    p3 = reduce(p1 + p2)
    p4 = reduce(M + Y)
    return p1, p2, p3, p4


def pinnacle_timing(lp: int) -> Tuple[int, List[Tuple[int, Optional[int]]]]:
    """
    First Pinnacle End = 36 - Life Path Number
    Each subsequent pinnacle lasts 9 years.
    """
    first_end = 36 - lp
    p1_start, p1_end = 0, first_end
    p2_start, p2_end = first_end + 1, first_end + 9
    p3_start, p3_end = first_end + 10, first_end + 18
    p4_start          = first_end + 19
    return first_end, [
        (p1_start, p1_end),
        (p2_start, p2_end),
        (p3_start, p3_end),
        (p4_start, None),
    ]


# ---------------------------------------------------------------------------
# Formula 10: Pinnacle Challenges  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def pinnacle_challenges(day: int, month: int, year: int) -> Tuple[int, int, int, int]:
    """
    C1 = |D - M|
    C2 = |D - Y|
    C3 = |C1 - C2|
    C4 = |M - Y|
    """
    M = _component_M(month)
    D = _component_D(day)
    Y = _component_Y(year)
    c1 = abs(D - M)
    c2 = abs(D - Y)
    c3 = abs(c1 - c2)
    c4 = abs(M - Y)
    return c1, c2, c3, c4


# ---------------------------------------------------------------------------
# Formula 11: Birthday System  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def birthday_gift_challenge(birth_day: int) -> Tuple[int, int]:
    """
    Rules:
    1. If birth day ≤ 9: Challenge = birth day
    2. If birth day > 9 and not master number: Challenge = |first digit - second digit|
    3. If birth day is master number: Challenge = 0
    Gift = |Challenge - 9|
    """
    if birth_day <= 9:
        challenge = birth_day
    elif birth_day in (11, 22, 33):
        challenge = 0
    else:
        digits = [int(d) for d in str(birth_day)]
        challenge = abs(digits[0] - digits[1])
    gift = abs(challenge - 9)
    return gift, challenge


# ---------------------------------------------------------------------------
# Formula 13: Karmic Numbers  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_KARMIC_DEBT_LESSONS: Dict[int, Tuple[str, List[str]]] = {
    13: (
        "Karmic Debt 13 — laziness or lack of effort in a past life. "
        "This lifetime requires diligent, consistent work. "
        "Shortcuts will not hold. Build brick by brick.",
        [Domain.CAREER.value, Domain.WEALTH.value, Domain.CHARACTER.value]
    ),
    14: (
        "Karmic Debt 14 — misuse of freedom in a past life. "
        "This lifetime requires building discipline, order, and boundaries. "
        "Freedom is earned through structure.",
        [Domain.CHARACTER.value, Domain.HEALTH.value, Domain.SPIRITUAL.value]
    ),
    16: (
        "Karmic Debt 16 — ego, pride, or betrayal of love in a past life. "
        "This lifetime calls for humility and service. "
        "The ego's constructions will be broken down — surrender accelerates healing.",
        [Domain.LOVE.value, Domain.SPIRITUAL.value, Domain.CHARACTER.value]
    ),
    19: (
        "Karmic Debt 19 — misuse of power or refusal of responsibility in past life. "
        "This lifetime requires claiming full responsibility for your choices "
        "and developing true independence — not isolation, but self-reliance.",
        [Domain.CAREER.value, Domain.CHARACTER.value, Domain.FINANCE.value]
    ),
}

_KARMIC_DEBT_TYPES: Dict[int, KarmicDebtType] = {
    13: KarmicDebtType.DEBT_13,
    14: KarmicDebtType.DEBT_14,
    16: KarmicDebtType.DEBT_16,
    19: KarmicDebtType.DEBT_19,
}


def detect_karmic_numbers(
    day:           int,
    month:         int,
    year:          int,
    destiny_pre:   int,
    life_path_pre: int,
) -> List[KarmicDebt]:
    """
    Check for karmic numbers in birth date, destiny pre-reduction,
    and life path pre-reduction.
    Karmic numbers: 13, 14, 16, 19
    """
    found: List[KarmicDebt] = []
    seen:  Set[Tuple[int, str]] = set()
    karmic_set = {13, 14, 16, 19}

    date_str = f"{day:02d}{month:02d}{year:04d}"
    for i in range(len(date_str) - 1):
        pair = int(date_str[i:i+2])
        if pair in karmic_set:
            key = (pair, "birth_date")
            if key not in seen:
                seen.add(key)
                lesson, domains = _KARMIC_DEBT_LESSONS[pair]
                found.append(KarmicDebt(
                    debt_type    = _KARMIC_DEBT_TYPES[pair],
                    source       = "birth_date",
                    value        = pair,
                    lesson       = lesson,
                    domain_impact= domains,
                ))

    if destiny_pre in karmic_set:
        key = (destiny_pre, "destiny")
        if key not in seen:
            seen.add(key)
            lesson, domains = _KARMIC_DEBT_LESSONS[destiny_pre]
            found.append(KarmicDebt(
                debt_type    = _KARMIC_DEBT_TYPES[destiny_pre],
                source       = "destiny",
                value        = destiny_pre,
                lesson       = lesson,
                domain_impact= domains,
            ))

    if life_path_pre in karmic_set:
        key = (life_path_pre, "life_path")
        if key not in seen:
            seen.add(key)
            lesson, domains = _KARMIC_DEBT_LESSONS[life_path_pre]
            found.append(KarmicDebt(
                debt_type    = _KARMIC_DEBT_TYPES[life_path_pre],
                source       = "life_path",
                value        = life_path_pre,
                lesson       = lesson,
                domain_impact= domains,
            ))

    return found


# ---------------------------------------------------------------------------
# Current Pinnacle detection  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def current_pinnacle_index(
    birth_year:   int,
    current_year: int,
    lp:           int,
) -> int:
    """Returns the index (0–3) of the current pinnacle."""
    age = current_year - birth_year
    _, timing = pinnacle_timing(lp)
    for i, (start, end) in enumerate(timing):
        if end is None:
            return i
        if start <= age <= end:
            return i
    return 3


# ---------------------------------------------------------------------------
# Pinnacle and timing theme libraries  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_PINNACLE_THEMES: Dict[int, str] = {
    1:  "Independence, leadership, and new beginnings. A period of self-reliance and pioneering.",
    2:  "Cooperation, sensitivity, and patience. Relationships and partnerships are the focus.",
    3:  "Creative expression, communication, and joy. Self-expression reaches its peak.",
    4:  "Building, discipline, and order. Foundation work that will support everything ahead.",
    5:  "Freedom, change, and adventure. Life opens up in unexpected and exciting ways.",
    6:  "Service, responsibility, and family. Relationships of deep commitment and care.",
    7:  "Reflection, study, and inner development. Spiritual and intellectual depth increases.",
    8:  "Achievement, authority, and material success. The harvest of previous effort.",
    9:  "Completion, humanitarian service, and wisdom. A cycle ends and legacy is established.",
    11: "Spiritual illumination and inspiration. A master number cycle of heightened awareness.",
    22: "Master builder cycle. Grand visions can be made physical if foundation is strong.",
    33: "Master teacher cycle. Service to humanity through love and wisdom.",
}

_CHALLENGE_THEMES: Dict[int, str] = {
    0: "No specific challenge — freedom of choice is the test",
    1: "Overcoming fear of standing alone and expressing individuality",
    2: "Developing patience, sensitivity, and cooperative nature",
    3: "Moving beyond self-doubt to genuine creative expression",
    4: "Building discipline and willingness to do the necessary work",
    5: "Finding freedom within responsibility rather than escaping from it",
    6: "Releasing perfectionism and accepting imperfection in relationships",
    7: "Trusting and opening up rather than withdrawing into isolation",
    8: "Developing healthy relationship with authority and material power",
}

_PYV_THEMES: Dict[int, str] = {
    1:  "New beginnings, independence, fresh starts — initiate what matters",
    2:  "Cooperation, patience, relationships — work with others",
    3:  "Creative expression, communication, joy — express yourself",
    4:  "Hard work, foundation building, discipline — build steadily",
    5:  "Freedom, change, adventure — embrace the unexpected",
    6:  "Service, family, responsibility — love and commitment",
    7:  "Reflection, study, spiritual depth — go inward",
    8:  "Achievement, authority, material success — harvest time",
    9:  "Completion, release, wisdom — let go gracefully",
    11: "Spiritual awakening, intuition, illumination — heightened sensitivity",
    22: "Master builder year — grand work becomes possible",
    33: "Master teacher year — serve from love",
}

_MONTH_THEMES: Dict[int, str] = {
    1: "New initiatives and fresh energy",
    2: "Cooperation and emotional depth",
    3: "Expression and creative flow",
    4: "Focus, discipline, and practical work",
    5: "Change, freedom, and unexpected movement",
    6: "Love, responsibility, and harmony",
    7: "Reflection, solitude, and inner knowing",
    8: "Achievement, power, and material focus",
    9: "Completion, release, and preparation for new cycle",
}

# v2.0.0: Week and day themes (referenced in main.py but were missing)
_WEEK_THEMES: Dict[int, str] = {
    1:  "A week of new starts and independent action",
    2:  "A week of partnership and careful listening",
    3:  "A week of expression and creative energy",
    4:  "A week of focused, disciplined work",
    5:  "A week of movement, change, and opportunity",
    6:  "A week of care, harmony, and responsibility",
    7:  "A week of reflection and inner knowing",
    8:  "A week of power, achievement, and results",
    9:  "A week of endings and graceful release",
    11: "A master week of heightened intuition and inspiration",
    22: "A master week of building and manifesting",
    33: "A master week of teaching and compassionate service",
}

_DAY_THEMES: Dict[int, str] = {
    1:  "Independence and clarity — act on your own instincts",
    2:  "Sensitivity and cooperation — listen more than you speak",
    3:  "Joy and expression — create, connect, celebrate",
    4:  "Discipline and focus — do the necessary work",
    5:  "Change and freedom — expect the unexpected",
    6:  "Love and responsibility — show up for others",
    7:  "Solitude and insight — go inward for answers",
    8:  "Power and achievement — lead and decide",
    9:  "Completion and wisdom — release what is done",
    11: "Intuition and illumination — trust what you feel",
    22: "Master builder energy — think big and act precisely",
    33: "Compassion and service — give from your wholeness",
}


# ---------------------------------------------------------------------------
# Main engine function  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def compute_numerology_profile(
    birth_data:    BirthData,
    current_date:  Optional[date] = None,
    use_chaldean:  bool = False,
) -> NumerologyProfile:
    """
    Compute complete numerology profile using KAYAL formulas.
    """
    if current_date is None:
        current_date = date.today()

    day   = birth_data.day
    month = birth_data.month
    year  = birth_data.year
    name  = birth_data.full_name.strip().upper()
    cy    = current_date.year
    cm    = current_date.month
    cd    = current_date.day

    lp, lp_pre      = life_path(day, month, year)
    dest, dest_pre   = destiny_number(name)
    soul             = soul_urge_number(name)
    pers             = personality_number(name)
    gift, challenge  = birthday_gift_challenge(day)

    karmic = detect_karmic_numbers(day, month, year, dest_pre, lp_pre)

    # NEW: computed but not yet attached to the returned NumerologyProfile —
    # see the note above compute_numerology_profile's return statement for
    # exactly what needs to change in synthesis/logic/models.py to wire this
    # all the way through.
    missing_nums = missing_numbers(day, month, year)

    p1_num, p2_num, p3_num, p4_num = pinnacle_numbers(day, month, year)
    c1, c2, c3, c4                  = pinnacle_challenges(day, month, year)
    first_end, timing_ranges        = pinnacle_timing(lp)
    curr_idx                        = current_pinnacle_index(year, cy, lp)

    pinn_numbers = [p1_num, p2_num, p3_num, p4_num]
    challenges   = [c1, c2, c3, c4]

    pinnacles: List[Pinnacle] = []
    for i, (start, end) in enumerate(timing_ranges):
        pnum = pinn_numbers[i]
        pinnacles.append(Pinnacle(
            number     = pnum,
            start_age  = start,
            end_age    = end,
            theme      = _PINNACLE_THEMES.get(pnum, "A significant life cycle"),
            challenge  = challenges[i],
            is_current = (i == curr_idx),
        ))

    current_pinnacle = pinnacles[curr_idx]

    uy  = universal_year(cy)
    pyv = personal_year_vibration(day, month, cy)
    mv  = monthly_vibration(pyv, cm)
    wom = week_of_month(cd)
    dow = day_of_week_kayal(current_date)
    wv  = weekly_vibration(pyv, cm, wom)
    dv  = daily_vibration(pyv, cm, wom, dow)

    chal_lp   = None
    chal_dest = None
    chal_note = None
    if use_chaldean:
        chal_lp   = chaldean_life_path(day, month, year)
        chal_dest = chaldean_destiny(name)
        if chal_lp != lp or chal_dest != dest:
            chal_note = (
                f"Chaldean system (secondary): Life Path {chal_lp}, "
                f"Destiny {chal_dest}. "
                "Where Pythagorean and Chaldean agree, the reading carries elevated confidence."
            )
        else:
            chal_note = "Chaldean and Pythagorean systems agree — highest confidence reading."

    logger.info(
        "NumerologyEngine.compute completed",
        extra={
            "life_path":        lp,
            "destiny":          dest,
            "soul_urge":        soul,
            "personality":      pers,
            "personal_year":    pyv,
            "current_pinnacle": current_pinnacle.number,
            "karmic_debts":     [d.value for d in karmic],
            "missing_numbers":  missing_nums,
        },
    )

    # missing_numbers: List[int] = field(default_factory=list) was added to
    # NumerologyProfile in synthesis/logic/models.py, closing the gap this
    # comment used to document. Now actually wired through below.
    return NumerologyProfile(
        life_path              = lp,
        destiny                = dest,
        soul_urge               = soul,
        personality             = pers,
        birthday_gift           = gift,
        birthday_challenge      = challenge,
        is_life_path_master     = is_master(lp),
        is_destiny_master       = is_master(dest),
        is_soul_urge_master     = is_master(soul),
        karmic_debts            = karmic,
        pinnacles                = pinnacles,
        current_pinnacle         = current_pinnacle,
        universal_year           = uy,
        personal_year            = pyv,
        personal_month           = mv,
        personal_week            = wv,
        personal_day             = dv,
        chaldean_life_path       = chal_lp,
        chaldean_destiny         = chal_dest,
        chaldean_note            = chal_note,
        missing_numbers          = missing_nums,
    )


# ---------------------------------------------------------------------------
# Theme helpers  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def get_pyv_theme(pyv: int) -> str:
    return _PYV_THEMES.get(pyv, "A year of significant development")


def get_month_theme(mv: int) -> str:
    base = mv % 9 or 9
    return _MONTH_THEMES.get(base, "Monthly energy in transition")


def get_pinnacle_theme(number: int) -> str:
    return _PINNACLE_THEMES.get(number, "A significant life cycle")


def get_challenge_theme(number: int) -> str:
    return _CHALLENGE_THEMES.get(number, "A unique personal challenge")


# ---------------------------------------------------------------------------
# Theme helpers  (v2.0.0 — new additions, referenced in main.py)
# ---------------------------------------------------------------------------

def get_week_theme(wv: int) -> str:
    """Weekly vibration theme. Handles master numbers directly."""
    if wv in _WEEK_THEMES:
        return _WEEK_THEMES[wv]
    base = wv % 9 or 9
    return _WEEK_THEMES.get(base, "A week of energetic transition")


def get_day_theme(dv: int) -> str:
    """Daily vibration theme. Handles master numbers directly."""
    if dv in _DAY_THEMES:
        return _DAY_THEMES[dv]
    base = dv % 9 or 9
    return _DAY_THEMES.get(base, "A day of personal significance")


# ===========================================================================
# v2.0.0 — NEW ADDITIONS BELOW
# All existing functions above are untouched.
# ===========================================================================


# ---------------------------------------------------------------------------
# Life Path compatibility table
# ---------------------------------------------------------------------------

# Harmony score 0.0–1.0 between any two Life Path numbers.
# Based on traditional numerological harmony principles.
_LP_HARMONY: Dict[Tuple[int, int], float] = {
    # Same numbers — strong resonance
    (1, 1): 0.75, (2, 2): 0.70, (3, 3): 0.80, (4, 4): 0.65,
    (5, 5): 0.70, (6, 6): 0.75, (7, 7): 0.65, (8, 8): 0.70,
    (9, 9): 0.80, (11,11): 0.85,(22,22): 0.80,(33,33): 0.85,
    # Classic high harmony pairs
    (1, 5): 0.90, (1, 3): 0.85, (1, 9): 0.80, (2, 6): 0.90,
    (2, 4): 0.85, (2, 8): 0.80, (3, 9): 0.85, (3, 6): 0.80,
    (4, 8): 0.85, (4, 22):0.80, (5, 1): 0.90, (5, 7): 0.85,
    (6, 2): 0.90, (6, 9): 0.85, (6, 3): 0.80, (7, 5): 0.85,
    (8, 4): 0.85, (8, 2): 0.80, (9, 3): 0.85, (9, 6): 0.85,
    (11, 2):0.90, (11, 6):0.85, (22, 4):0.85, (33, 6):0.90,
    # Moderate pairs
    (1, 2): 0.60, (1, 6): 0.65, (1, 7): 0.65, (1, 8): 0.70,
    (2, 3): 0.65, (2, 7): 0.60, (3, 5): 0.70, (3, 7): 0.60,
    (4, 6): 0.65, (4, 7): 0.60, (5, 6): 0.65, (5, 9): 0.65,
    (6, 7): 0.60, (6, 8): 0.65, (7, 9): 0.65, (8, 9): 0.60,
    # Challenging pairs
    (1, 4): 0.45, (2, 5): 0.50, (3, 4): 0.50, (4, 5): 0.45,
    (5, 8): 0.50, (6, 1): 0.65, (7, 1): 0.65, (7, 4): 0.40,
    (7, 8): 0.45, (8, 1): 0.70, (9, 1): 0.80, (1, 11):0.70,
}


def life_path_compatibility(lp_a: int, lp_b: int) -> float:
    """
    Return harmony score (0.0–1.0) between two Life Path numbers.
    Looks up both orderings and defaults to 0.60 for unspecified pairs.
    """
    score = _LP_HARMONY.get((lp_a, lp_b)) or _LP_HARMONY.get((lp_b, lp_a))
    return score if score is not None else 0.60


# ---------------------------------------------------------------------------
# Full numerical compatibility scoring
# ---------------------------------------------------------------------------

def compute_compatibility_score(
    profile_a: NumerologyProfile,
    profile_b: NumerologyProfile,
) -> Dict[str, float]:
    """
    Compute full numerical compatibility between two people.

    Returns a dict with individual dimension scores and overall_score.
    All scores 0.0–1.0.
    """
    # Life Path harmony (most important — weighted 30%)
    lp_score = life_path_compatibility(profile_a.life_path, profile_b.life_path)

    # Destiny alignment (20%)
    dest_diff  = abs(profile_a.destiny - profile_b.destiny)
    dest_score = max(0.0, 1.0 - (dest_diff / 9.0) * 0.8)
    if profile_a.destiny == profile_b.destiny:
        dest_score = 0.85  # Same destiny — strong shared purpose
    elif dest_diff in (0, 9):
        dest_score = min(dest_score + 0.1, 1.0)

    # Soul Urge alignment (emotional compatibility — 20%)
    soul_diff  = abs(profile_a.soul_urge - profile_b.soul_urge)
    soul_score = max(0.0, 1.0 - (soul_diff / 9.0) * 0.7)
    if profile_a.soul_urge == profile_b.soul_urge:
        soul_score = 0.90

    # Personal Year synchronisation (timing — 15%)
    # Same PY = very aligned; complementary (3 apart) = good
    py_diff = abs(profile_a.personal_year - profile_b.personal_year)
    if py_diff == 0:
        py_score = 0.90
    elif py_diff in (3, 6):
        py_score = 0.80   # Complementary cycles
    elif py_diff in (1, 8):
        py_score = 0.65
    else:
        py_score = max(0.40, 0.75 - py_diff * 0.05)

    # Karmic debt interaction (15%) — shared debts intensify the union
    shared_debts = {d.value for d in profile_a.karmic_debts} & \
                   {d.value for d in profile_b.karmic_debts}
    if len(shared_debts) == 0:
        karmic_score = 0.75   # Clean — no shared karmic weight
    elif len(shared_debts) == 1:
        karmic_score = 0.60   # One shared debt — manageable
    else:
        karmic_score = 0.40   # Multiple shared debts — heavy karmic union

    # Overall weighted score
    overall = (
        lp_score   * 0.30 +
        dest_score * 0.20 +
        soul_score * 0.20 +
        py_score   * 0.15 +
        karmic_score * 0.15
    )

    return {
        "overall_score":      round(overall, 3),
        "life_path_score":    round(lp_score, 3),
        "destiny_score":      round(dest_score, 3),
        "soul_urge_score":    round(soul_score, 3),
        "personal_year_score":round(py_score, 3),
        "karmic_score":       round(karmic_score, 3),
        "shared_karmic_debts":list(shared_debts),
    }


def compatibility_verdict(overall_score: float) -> CompatibilityLevel:
    """Map overall_score to CompatibilityLevel enum."""
    if overall_score >= 0.90:
        return CompatibilityLevel.EXCEPTIONAL
    if overall_score >= 0.75:
        return CompatibilityLevel.HIGH
    if overall_score >= 0.55:
        return CompatibilityLevel.MODERATE
    if overall_score >= 0.35:
        return CompatibilityLevel.LOW
    return CompatibilityLevel.CHALLENGING


# ---------------------------------------------------------------------------
# Karmic debt cross-analysis
# ---------------------------------------------------------------------------

_KARMIC_INTERACTION_NOTES: Dict[Tuple[int, int], str] = {
    (13, 14): "One partner's work ethic and the other's freedom struggle create friction — "
              "one will feel the other is either lazy or reckless.",
    (13, 16): "One builds slowly while the other's ego periodically dismantles what was built. "
              "Patience and humility are demanded from both.",
    (13, 19): "A pattern of one person working hard while the other struggles with "
              "responsibility. Resentment is the primary risk.",
    (14, 16): "Freedom misuse and ego — a potent combination. Both must learn "
              "that authentic love requires surrender of both.",
    (14, 19): "Both carry independence karmas — either they support each other's "
              "growth or compete for freedom.",
    (16, 19): "The most intense pairing — ego dismantling meets power lessons. "
              "This union will transform both, often painfully.",
    (13, 13): "Shared karmic work ethic test — together they either build something "
              "great or enable each other's avoidance.",
    (16, 16): "Mirror debt — both facing ego dissolution together. Accelerated "
              "spiritual growth but very high intensity.",
    (19, 19): "Both learning self-reliance — the risk is isolation within the union.",
}


def karmic_debt_cross_analysis(
    profile_a: NumerologyProfile,
    profile_b: NumerologyProfile,
) -> Dict:
    """
    Analyse how two people's karmic debts interact.
    Returns description of the combined karmic field.
    """
    debts_a = {d.value for d in profile_a.karmic_debts}
    debts_b = {d.value for d in profile_b.karmic_debts}
    shared  = debts_a & debts_b
    only_a  = debts_a - debts_b
    only_b  = debts_b - debts_a

    interactions = []
    all_debts = sorted(debts_a | debts_b)
    for i, d1 in enumerate(all_debts):
        for d2 in all_debts[i:]:
            note = (_KARMIC_INTERACTION_NOTES.get((d1, d2)) or
                    _KARMIC_INTERACTION_NOTES.get((d2, d1)))
            if note and d1 != d2:
                interactions.append(note)
            elif d1 == d2 and d1 in shared:
                note = _KARMIC_INTERACTION_NOTES.get((d1, d1))
                if note:
                    interactions.append(note)

    total_debt_count = len(debts_a) + len(debts_b)
    if total_debt_count == 0:
        intensity = "light"
        summary   = ("Neither person carries active karmic debt numbers. "
                     "The union is relatively free of heavy karmic obligation.")
    elif total_debt_count <= 2:
        intensity = "moderate"
        summary   = ("One or both partners carry karmic debt. "
                     "The union will provide opportunities to work through these lessons.")
    else:
        intensity = "heavy"
        summary   = ("Both partners carry multiple karmic debts. "
                     "This is a union of profound karmic purpose — "
                     "significant growth is possible, but the path will be demanding.")

    return {
        "shared_debts":       sorted(shared),
        "person_a_only":      sorted(only_a),
        "person_b_only":      sorted(only_b),
        "interactions":       interactions,
        "intensity":          intensity,
        "karmic_summary":     summary,
    }


# ---------------------------------------------------------------------------
# Name correction analysis
# ---------------------------------------------------------------------------

def name_correction_analysis(
    birth_name:   str,
    current_name: Optional[str],
    life_path:    int,
) -> Dict:
    """
    Analyse whether a person's current name is numerologically aligned
    with their life path.

    Returns rating and recommendation.
    """
    birth_name = birth_name.strip().upper()
    birth_dest, _ = destiny_number(birth_name)

    result: Dict = {
        "birth_name":        birth_name,
        "birth_destiny":     birth_dest,
        "current_name":      None,
        "current_destiny":   None,
        "current_name_rating": "aligned",
        "name_correction_note": None,
        "lucky_name_vibrations": [],
    }

    # Numbers that harmonise with each Life Path
    _LP_HARMONIOUS_DEST: Dict[int, List[int]] = {
        1: [1, 9, 5],    2: [2, 6, 8],    3: [3, 9, 6],
        4: [4, 8, 2],    5: [5, 1, 3],    6: [6, 2, 9],
        7: [7, 5, 11],   8: [8, 4, 2],    9: [9, 3, 6],
        11: [11, 2, 9], 22: [22, 4, 8],  33: [33, 6, 3],
    }

    lp_base = life_path % 9 or 9
    harmonious = _LP_HARMONIOUS_DEST.get(life_path) or _LP_HARMONIOUS_DEST.get(lp_base, [])
    result["lucky_name_vibrations"] = harmonious

    if not current_name or current_name.strip().upper() == birth_name:
        result["current_name"]   = birth_name
        result["current_destiny"]= birth_dest
        if birth_dest in harmonious:
            result["current_name_rating"]   = "aligned"
            result["name_correction_note"]  = (
                f"Your birth name carries Destiny {birth_dest}, "
                f"which harmonises with your Life Path {life_path}. No correction needed."
            )
        elif birth_dest in [n for n in range(1, 10) if n not in harmonious]:
            result["current_name_rating"]  = "neutral"
            result["name_correction_note"] = (
                f"Your birth name carries Destiny {birth_dest}. "
                f"While not weakening, a name vibrating to "
                f"{harmonious[0]} or {harmonious[1]} would align more powerfully "
                f"with your Life Path {life_path}."
            )
        return result

    current = current_name.strip().upper()
    curr_dest, _ = destiny_number(current)
    result["current_name"]    = current
    result["current_destiny"] = curr_dest

    if curr_dest in harmonious:
        result["current_name_rating"]  = "aligned"
        result["name_correction_note"] = (
            f"Your current name '{current_name}' carries Destiny {curr_dest}, "
            f"which aligns well with your Life Path {life_path}."
        )
    elif curr_dest == birth_dest:
        result["current_name_rating"]  = "neutral"
        result["name_correction_note"] = (
            f"Your current name vibrates identically to your birth name (Destiny {curr_dest}). "
            f"Consider a name or spelling that vibrates to {harmonious[0]}."
        )
    else:
        # Check if current is worse than birth
        birth_aligned = birth_dest in harmonious
        curr_aligned  = curr_dest in harmonious
        if birth_aligned and not curr_aligned:
            result["current_name_rating"]  = "weakening"
            result["name_correction_note"] = (
                f"Your current name '{current_name}' (Destiny {curr_dest}) is "
                f"weaker than your birth name (Destiny {birth_dest}) for your "
                f"Life Path {life_path}. Reverting to birth name or adopting a "
                f"Destiny {harmonious[0]} name is recommended."
            )
        else:
            result["current_name_rating"]  = "neutral"
            result["name_correction_note"] = (
                f"Your current name carries Destiny {curr_dest}. "
                f"A name vibrating to {harmonious[0]} would strengthen your Life Path {life_path}."
            )

    return result


# ---------------------------------------------------------------------------
# Address and business name vibration
# ---------------------------------------------------------------------------

def address_vibration(address: str) -> Dict:
    """
    Calculate the numerological vibration of a home or business address.
    Only digits in the street number are used (not the street name).
    """
    digits = [int(c) for c in address if c.isdigit()]
    if not digits:
        return {"vibration": None, "note": "No digits found in address."}

    total     = sum(digits)
    vibration = reduce(total)

    _ADDRESS_THEMES = {
        1: "Leadership and independence — good for solo living or business ownership.",
        2: "Partnership and harmony — ideal for couples or collaborative teams.",
        3: "Creativity and social energy — excellent for artists and entertainers.",
        4: "Stability and hard work — good for long-term building and family.",
        5: "Change and movement — expect frequent shifts; not ideal for permanence.",
        6: "Nurturing and family — ideal for raising children or caregiving.",
        7: "Solitude and reflection — good for study, meditation, or spiritual practice.",
        8: "Ambition and wealth — excellent for business; can feel pressured.",
        9: "Completion and service — humanitarian energy; good for transition periods.",
        11:"Intuition and inspiration — high spiritual vibration; can feel intense.",
        22:"Master building — rare; supports grand projects and lasting legacy.",
        33:"Teaching and compassion — deeply nurturing; best for service-oriented living.",
    }

    return {
        "address":         address,
        "digit_sum":       total,
        "vibration":       vibration,
        "is_master":       is_master(vibration),
        "theme":           _ADDRESS_THEMES.get(vibration, "A neutral vibration."),
    }


def business_name_vibration(
    business_name: str,
    owner_life_path: int,
) -> Dict:
    """
    Calculate business name vibration and its compatibility with the owner's Life Path.
    """
    dest, _    = destiny_number(business_name)
    lp_compat  = life_path_compatibility(owner_life_path, dest)
    is_aligned = lp_compat >= 0.70

    return {
        "business_name":       business_name,
        "destiny_number":      dest,
        "is_master":           is_master(dest),
        "owner_life_path":     owner_life_path,
        "compatibility_score": round(lp_compat, 3),
        "is_aligned":          is_aligned,
        "recommendation": (
            f"'{business_name}' carries Destiny {dest}. "
            + (f"This aligns well with your Life Path {owner_life_path}."
               if is_aligned else
               f"Consider a business name that reduces to a number harmonious with Life Path {owner_life_path}.")
        ),
    }


# ---------------------------------------------------------------------------
# Children timing forecast (numerology)
# ---------------------------------------------------------------------------

def children_timing_forecast_num(
    birth_day:   int,
    birth_month: int,
    birth_year:  int,
    look_ahead:  int = 10,
) -> Dict:
    """
    Identify numerologically favourable years for conception and birth.
    Personal Years 2, 6, 9 are traditionally most associated with children.
    Personal Year 4 indicates a foundational year — sometimes pregnancy.
    Master year 22 can bring life-changing creation including children.

    Returns list of favourable years with context.
    """
    current_year = date.today().year
    favourable   = []
    challenging  = []

    _CHILD_YEARS = {
        2:  "Personal Year 2 — partnership and new life energy. High fertility indicator.",
        4:  "Personal Year 4 — foundation building. Pregnancy possible; birth likely.",
        6:  "Personal Year 6 — the most powerful year for family creation and birth.",
        9:  "Personal Year 9 — completion and new beginnings. Can mark birth of new life.",
        22: "Personal Year 22 — master builder year. Significant life creation possible.",
    }
    _DIFFICULT_YEARS = {
        1: "Personal Year 1 — new individual beginnings; energy focuses on self.",
        5: "Personal Year 5 — change and instability; not ideal for new family additions.",
        7: "Personal Year 7 — inner reflection; fertility energy low.",
    }

    for offset in range(look_ahead):
        yr  = current_year + offset
        pyv = personal_year_vibration(birth_day, birth_month, yr)
        if pyv in _CHILD_YEARS:
            favourable.append({
                "year":          yr,
                "personal_year": pyv,
                "note":          _CHILD_YEARS[pyv],
            })
        elif pyv in _DIFFICULT_YEARS:
            challenging.append({
                "year":          yr,
                "personal_year": pyv,
                "note":          _DIFFICULT_YEARS[pyv],
            })

    return {
        "favourable_years":  favourable,
        "challenging_years": challenging,
        "most_favourable":   favourable[0] if favourable else None,
        "summary": (
            f"The most numerologically favourable year for a child is "
            f"{favourable[0]['year']} (Personal Year {favourable[0]['personal_year']})."
            if favourable else
            "No strongly favourable child year found in the next "
            f"{look_ahead} years based on numerology alone."
        ),
    }


# ---------------------------------------------------------------------------
# Infidelity indicators from numerology
# ---------------------------------------------------------------------------

def infidelity_indicators_numerology(profile: NumerologyProfile) -> Dict:
    """
    Identify numerological indicators of fidelity or infidelity risk.
    Based on Life Path, Destiny, Soul Urge, and karmic debt patterns.
    """
    risk_factors   = []
    stable_factors = []

    # Life Path risk indicators
    _LP_FIDELITY = {
        1: ("moderate", "Independent nature — needs significant personal space in relationships."),
        2: ("low",      "Deep loyalty and commitment — fidelity is natural for this number."),
        3: ("moderate", "Flirtatious and socially magnetic — boundaries require conscious effort."),
        4: ("low",      "Steadfast and reliable — commitment is a core value."),
        5: ("high",     "Freedom-seeking by nature — monogamy requires conscious daily choice."),
        6: ("low",      "Most faithful Life Path — family and loyalty are the deepest values."),
        7: ("low",      "Private and selective — once committed, rarely strays."),
        8: ("moderate", "Power-oriented — may seek validation outside the relationship."),
        9: ("moderate", "Universally loving — sometimes loses boundary between love types."),
        11:("low",      "Deeply idealistic about love — holds the relationship to high standards."),
        22:("low",      "Disciplined builder — commitment is part of the grand plan."),
        33:("low",      "Devoted caretaker — the relationship is a sacred responsibility."),
    }

    lp_risk, lp_note = _LP_FIDELITY.get(
        profile.life_path,
        ("moderate", "Mixed fidelity indicators from Life Path.")
    )
    if lp_risk in ("high", "moderate"):
        risk_factors.append(lp_note)
    else:
        stable_factors.append(lp_note)

    # Karmic debt 14 — misuse of freedom — infidelity risk
    for debt in profile.karmic_debts:
        if debt.value == 14:
            risk_factors.append(
                "Karmic Debt 14 present — freedom was misused in a past life. "
                "Temptation to stray is a recurring karmic test."
            )
        if debt.value == 16:
            risk_factors.append(
                "Karmic Debt 16 present — past-life betrayal of love. "
                "This debt may manifest as receiving or causing infidelity."
            )

    # Soul Urge 5 — freedom as deepest desire
    if profile.soul_urge == 5:
        risk_factors.append(
            "Soul Urge 5 — the deepest desire is freedom. "
            "Without conscious commitment, this energy seeks variety."
        )

    # Destiny 5 adds to the picture
    if profile.destiny == 5:
        risk_factors.append(
            "Destiny 5 — life path through change and experience. "
            "Fidelity requires intentional cultivation."
        )

    # Assess overall risk
    risk_count = len(risk_factors)
    if risk_count == 0:
        risk_level = InfidelityRisk.LOW
        summary    = "Numerological profile shows strong fidelity indicators."
    elif risk_count == 1:
        risk_level = InfidelityRisk.MODERATE
        summary    = "One fidelity challenge indicated — manageable with awareness."
    elif risk_count == 2:
        risk_level = InfidelityRisk.HIGH
        summary    = "Multiple fidelity challenges indicated — commitment requires conscious effort."
    else:
        risk_level = InfidelityRisk.VERY_HIGH
        summary    = "Strong infidelity indicators — this is a core karmic test for this person."

    return {
        "risk_level":      risk_level.value,
        "risk_factors":    risk_factors,
        "stable_factors":  stable_factors,
        "summary":         summary,
    }


# ---------------------------------------------------------------------------
# Health indicators from numerology
# ---------------------------------------------------------------------------

def health_indicators_numerology(profile: NumerologyProfile) -> Dict:
    """
    Identify numerological health vulnerabilities.
    Based on Life Path, karmic debts, and current pinnacle.
    """
    vulnerabilities = []
    strengths       = []

    _LP_HEALTH = {
        1: ("head, eyes, blood pressure",
            "Stress-related conditions from overwork and self-imposed pressure."),
        2: ("nervous system, stomach, digestion",
            "Sensitive constitution — emotional state directly affects physical health."),
        3: ("throat, skin, nervous system",
            "Overthinking and scattered energy depletes vitality."),
        4: ("skeletal system, joints, liver",
            "Rigid patterns and overwork stress the structural systems."),
        5: ("nervous system, addictions",
            "Excess — overindulgence in food, substances, or stimulation."),
        6: ("heart, lungs, back",
            "Carrying others' burdens — emotional weight manifests physically."),
        7: ("immune system, intestines",
            "Isolation and suppressed emotions compromise immunity."),
        8: ("cardiovascular system, stress",
            "High-pressure lifestyle creates heart and adrenal stress."),
        9: ("immune system, psychosomatic conditions",
            "Unresolved grief and global empathy create physical depletion."),
        11:("nervous system, anxiety",
            "Hypersensitivity to energy — the nervous system bears the load."),
        22:("stress, cardiovascular",
            "Enormous ambition — the heart must keep pace with the vision."),
        33:("burnout, adrenals",
            "Giving to others without replenishment depletes the system."),
    }

    lp_organs, lp_note = _LP_HEALTH.get(
        profile.life_path,
        ("general vitality", "Mixed health indicators.")
    )
    vulnerabilities.append({
        "source":   f"Life Path {profile.life_path}",
        "organs":   lp_organs,
        "pattern":  lp_note,
    })

    # Karmic debt 13 — associated with muscular and skeletal strain
    for debt in profile.karmic_debts:
        if debt.value == 13:
            vulnerabilities.append({
                "source":  "Karmic Debt 13",
                "organs":  "muscles, bones, chronic fatigue",
                "pattern": "Overwork karma — the body signals when the work exceeds capacity.",
            })
        if debt.value == 14:
            vulnerabilities.append({
                "source":  "Karmic Debt 14",
                "organs":  "nervous system, addictive tendencies",
                "pattern": "Freedom karma — substance or behavioural addiction risk is elevated.",
            })
        if debt.value == 16:
            vulnerabilities.append({
                "source":  "Karmic Debt 16",
                "organs":  "heart, circulatory system",
                "pattern": "Ego dissolution karma — heart conditions may signal necessary surrender.",
            })

    # Personal Year influence
    if profile.personal_year == 7:
        strengths.append(
            "Personal Year 7 — a year for deep healing, rest, and restoration."
        )
    elif profile.personal_year == 4:
        vulnerabilities.append({
            "source":  "Personal Year 4",
            "organs":  "structural systems",
            "pattern": "Overwork risk in a 4 year — foundation-building demands physical cost.",
        })

    return {
        "vulnerabilities":    vulnerabilities,
        "strengths":          strengths,
        "primary_risk_area":  lp_organs,
        "health_summary": (
            f"Life Path {profile.life_path} carries natural vulnerability in {lp_organs}. "
            + (f" Karmic debts add further pressure."
               if profile.karmic_debts else "")
        ),
    }


# ---------------------------------------------------------------------------
# Spirit world indicators from numerology
# ---------------------------------------------------------------------------

def spirit_indicators_numerology(profile: NumerologyProfile) -> Dict:
    """
    Identify spirit world, ancestral, and karmic indicators from numerology.
    Based on Life Path, Soul Urge, karmic debts, and pinnacle.
    """
    indicators = []

    # Life Path 7, 11, 33 — naturally spiritually open
    if profile.life_path in (7, 11, 33):
        indicators.append(
            f"Life Path {profile.life_path} — naturally thin veil between the physical "
            "and spirit world. Psychic sensitivity is inherent."
        )
    elif profile.life_path in (9, 22):
        indicators.append(
            f"Life Path {profile.life_path} — humanitarian and universal awareness "
            "creates heightened sensitivity to collective spiritual energies."
        )

    # Soul Urge 7 or 11 — deepest desire is spiritual connection
    if profile.soul_urge in (7, 11):
        indicators.append(
            f"Soul Urge {profile.soul_urge} — the soul's deepest desire is for "
            "spiritual truth and connection. Spirit communication is natural."
        )

    # Karmic debt 16 — past ego collapse often leaves spirit attachment residue
    for debt in profile.karmic_debts:
        if debt.value == 16:
            indicators.append(
                "Karmic Debt 16 — ego dissolution karma. Past life trauma may have "
                "left a spiritual wound that requires ancestral healing."
            )
        if debt.value == 19:
            indicators.append(
                "Karmic Debt 19 — power karma. Ancestral patterns of "
                "misused authority may be active in the bloodline."
            )

    # Pinnacle 7 or 11 — current life chapter is spiritually charged
    if profile.current_pinnacle.number in (7, 11):
        indicators.append(
            f"Current Pinnacle {profile.current_pinnacle.number} — this life chapter "
            "is deeply spiritual. Ancestral healing and spiritual awakening are primary themes."
        )

    # Destiny 9 — completion karma; often carries ancestral weight
    if profile.destiny == 9:
        indicators.append(
            "Destiny 9 — this is a lifetime of completion. Old family patterns, "
            "generational wounds, and past-life contracts are here to be fully resolved."
        )

    protection_level = "strong" if not profile.karmic_debts else \
                       "moderate" if len(profile.karmic_debts) == 1 else "requires attention"

    return {
        "spirit_indicators":   indicators,
        "psychic_sensitivity": "high" if profile.life_path in (7, 11, 33) else
                               "moderate" if profile.life_path in (2, 6, 9) else "average",
        "protection_level":    protection_level,
        "ancestral_note": (
            "Strong ancestral healing work is indicated by the karmic debt configuration."
            if any(d.value in (16, 19) for d in profile.karmic_debts) else
            "No acute ancestral debt indicators — standard lineage patterns apply."
        ),
        "spirit_summary": (
            f"Numerological spirit indicators: {len(indicators)} patterns identified."
        ),
    }


# ---------------------------------------------------------------------------
# Death and transition indicators from numerology
# ---------------------------------------------------------------------------

def death_transition_indicators_num(profile: NumerologyProfile) -> Dict:
    """
    Identify numerological longevity and transition indicators.
    These are tendencies, not predictions — always frame with care.
    """
    longevity_factors = []
    caution_factors   = []

    # Life Path longevity tendencies
    _LP_LONGEVITY = {
        2:  ("long",    "Cooperative nature reduces stress — longevity indicator."),
        4:  ("long",    "Disciplined lifestyle and steady habits support long life."),
        6:  ("long",    "Service and family orientation creates meaning that sustains life."),
        7:  ("long",    "Reflective and cautious — avoids recklessness."),
        11: ("long",    "Spiritual orientation creates resilience and purpose."),
        1:  ("average", "Driven nature can lead to overwork — balance is needed."),
        3:  ("average", "Joyful but scattered energy requires grounding."),
        8:  ("average", "High-pressure orientation creates cardiovascular risk."),
        9:  ("average", "Universal empathy can lead to depletion without boundaries."),
        5:  ("shorter", "High-risk nature, indulgence tendencies, and restlessness."),
        22: ("long",    "Master builder discipline and purpose support long life."),
        33: ("long",    "Service orientation and emotional depth sustain vitality."),
    }

    lp_tend, lp_note = _LP_LONGEVITY.get(
        profile.life_path,
        ("average", "Standard longevity indicators.")
    )
    if lp_tend == "long":
        longevity_factors.append(lp_note)
    elif lp_tend == "shorter":
        caution_factors.append(lp_note)
    else:
        longevity_factors.append(lp_note)

    # Karmic debts — debt 13 and 5-heavy charts add caution
    for debt in profile.karmic_debts:
        if debt.value == 14:
            caution_factors.append(
                "Karmic Debt 14 — freedom misuse karma includes risk-taking behaviour "
                "that can shorten life if not consciously redirected."
            )

    # Personal Year 9 — cycle completion; sometimes transition occurs
    if profile.personal_year == 9:
        caution_factors.append(
            "Personal Year 9 — a completion year. Not a death indicator but a "
            "year when major life chapters close, occasionally including physical life."
        )

    # 4th Pinnacle entry — often marks late-life reflection
    if (profile.current_pinnacle.end_age is None and
            profile.current_pinnacle.start_age > 50):
        longevity_factors.append(
            f"4th Pinnacle entered at age {profile.current_pinnacle.start_age} — "
            "the final life chapter is active. Purpose and legacy become primary concerns."
        )

    longevity = "long" if len(longevity_factors) > len(caution_factors) else \
                "average" if len(longevity_factors) == len(caution_factors) else "shortened"

    return {
        "longevity_tendency":  longevity,
        "longevity_factors":   longevity_factors,
        "caution_factors":     caution_factors,
        "transition_note": (
            "Numerology indicates a natural long life with focus on completing karmic work."
            if longevity == "long" else
            "Standard longevity indicators — lifestyle choices will be the determining factor."
            if longevity == "average" else
            "Numerological caution indicators present — conscious attention to health and safety is recommended."
        ),
    }


# ---------------------------------------------------------------------------
# Numerological remedy builder
# ---------------------------------------------------------------------------

def compute_numerological_remedy(
    profile:       NumerologyProfile,
    current_name:  Optional[str] = None,
    address:       Optional[str] = None,
    business_name: Optional[str] = None,
) -> NumerologicalRemedy:
    """
    Build a complete NumerologicalRemedy from a person's profile.
    """
    name_analysis = name_correction_analysis(
        birth_name   = "",   # Will be populated when BirthData is available
        current_name = current_name,
        life_path    = profile.life_path,
    )

    # Lucky numbers based on Life Path, Destiny, Soul Urge
    lucky_set = {profile.life_path, profile.destiny, profile.soul_urge}
    if is_master(profile.life_path):
        lucky_set.add(profile.life_path % 9 or 9)
    lucky_numbers = sorted(lucky_set - {0})

    # Unlucky — numbers that clash with Life Path
    _LP_CLASHING: Dict[int, List[int]] = {
        1: [4, 8],   2: [1, 5],   3: [4, 8],   4: [1, 3, 5],
        5: [2, 4],   6: [1, 5],   7: [2, 4, 8], 8: [3, 5, 7],
        9: [2, 4],   11:[4, 8],   22:[5, 7],    33:[1, 5],
    }
    unlucky_numbers = _LP_CLASHING.get(profile.life_path, [])

    # Power dates in current month — days whose vibration matches Life Path
    today      = date.today()
    power_dates: List[str] = []
    for day_num in range(1, 32):
        try:
            d      = date(today.year, today.month, day_num)
            day_v  = reduce(day_num)
            if day_v == profile.life_path or day_v in lucky_numbers[:2]:
                power_dates.append(d.strftime("%d %b %Y"))
        except ValueError:
            break

    address_note = None
    if address:
        av = address_vibration(address)
        address_note = (
            f"Address vibrates to {av['vibration']} — {av['theme']}"
        )

    biz_note = None
    if business_name:
        bv = business_name_vibration(business_name, profile.life_path)
        biz_note = bv["recommendation"]

    return NumerologicalRemedy(
        current_name_rating   = name_analysis.get("current_name_rating", "neutral"),
        name_correction_note  = name_analysis.get("name_correction_note"),
        lucky_numbers         = lucky_numbers,
        unlucky_numbers       = unlucky_numbers,
        power_dates           = power_dates[:5],
        address_vibration     = address_note,
        business_name_note    = biz_note,
    )


# ---------------------------------------------------------------------------
# Parent inheritance analysis from numerology
# ---------------------------------------------------------------------------

def parent_inheritance_numerology(
    profile:       NumerologyProfile,
    father_name:   Optional[str] = None,
    mother_name:   Optional[str] = None,
) -> Dict:
    """
    Identify what numerological patterns were inherited from each parent.
    Uses Life Path (birth date — reflects family karma) and name destiny
    (if parent names are available).
    """
    result: Dict = {
        "father_inheritance": [],
        "mother_inheritance": [],
        "pattern_to_break":   [],
        "pattern_to_honour":  [],
    }

    # Life Path inheritance patterns
    _LP_FATHER_INHERITANCE = {
        1: "Father modelled independence and ambition — you inherited drive but may struggle with vulnerability.",
        2: "Father modelled sensitivity and cooperation — you inherited emotional intelligence.",
        4: "Father modelled discipline and hard work — you inherited work ethic but possibly rigidity.",
        8: "Father modelled authority and material focus — you inherited ambition but possibly controlling tendencies.",
        5: "Father modelled freedom and adventure — you inherited adaptability but possibly restlessness.",
        22:"Father modelled grand vision and building — you inherited capacity for large-scale achievement.",
    }
    _LP_MOTHER_INHERITANCE = {
        2: "Mother modelled nurturing and emotional depth — you inherited empathy.",
        6: "Mother modelled service and family — you inherited care but possibly self-sacrifice.",
        9: "Mother modelled compassion and wisdom — you inherited humanitarian awareness.",
        3: "Mother modelled expression and joy — you inherited creativity.",
        11:"Mother modelled spiritual sensitivity — you inherited intuition and psychic awareness.",
        33:"Mother modelled unconditional love — you inherited capacity for deep devotion.",
    }

    lp = profile.life_path
    father_note = _LP_FATHER_INHERITANCE.get(lp)
    mother_note = _LP_MOTHER_INHERITANCE.get(lp)

    if father_note:
        result["father_inheritance"].append(father_note)
    if mother_note:
        result["mother_inheritance"].append(mother_note)

    # Karmic debts often trace to parental patterns
    for debt in profile.karmic_debts:
        if debt.value == 13:
            result["pattern_to_break"].append(
                "Avoidance of hard work may have been modelled in the family of origin."
            )
        elif debt.value == 16:
            result["pattern_to_break"].append(
                "Pride and ego patterns from the family lineage require conscious dissolution."
            )
        elif debt.value == 19:
            result["pattern_to_break"].append(
                "Power imbalance patterns — possibly from the father figure — must be consciously broken."
            )

    # Honour patterns — what the parents did right
    if profile.is_life_path_master:
        result["pattern_to_honour"].append(
            f"Your Master Number {lp} Life Path suggests unusually elevated potential "
            "inherited from both lineages."
        )

    # If parent names provided, compute their destiny and compare
    if father_name:
        fd, _   = destiny_number(father_name.upper())
        f_compat = life_path_compatibility(lp, fd)
        result["father_destiny"]      = fd
        result["father_compatibility"] = round(f_compat, 3)
        result["father_inheritance"].append(
            f"Father's name Destiny {fd} and your Life Path {lp}: "
            + ("good alignment — his patterns serve you." if f_compat >= 0.70 else
               "tension — his patterns require conscious reprocessing.")
        )

    if mother_name:
        md, _   = destiny_number(mother_name.upper())
        m_compat = life_path_compatibility(lp, md)
        result["mother_destiny"]      = md
        result["mother_compatibility"] = round(m_compat, 3)
        result["mother_inheritance"].append(
            f"Mother's name Destiny {md} and your Life Path {lp}: "
            + ("good alignment — her patterns support you." if m_compat >= 0.70 else
               "tension — her patterns require conscious integration.")
        )

    return result


# ---------------------------------------------------------------------------
# Union destiny analysis
# ---------------------------------------------------------------------------

def union_destiny_numerology(
    profile_a: NumerologyProfile,
    profile_b: NumerologyProfile,
) -> Dict:
    """
    Compute the combined numerological destiny of a union.
    Union number = reduce(Life Path A + Life Path B)
    """
    union_num = reduce(profile_a.life_path + profile_b.life_path)

    _UNION_THEMES = {
        1: "A union of independence and leadership. Together they pioneer new ground.",
        2: "A union of deep sensitivity and partnership. Togetherness is the core lesson.",
        3: "A union of creative expression and joy. Their life together is vibrant and expressive.",
        4: "A union of building and stability. Together they construct something lasting.",
        5: "A union of freedom and change. Expansion and adventure define their shared path.",
        6: "A union of service and family. Together they nurture and protect.",
        7: "A union of wisdom and depth. Their shared life is one of spiritual seeking.",
        8: "A union of achievement and authority. Together they build material and social legacy.",
        9: "A union of completion and wisdom. They are together to resolve old cycles.",
        11:"A master union — unusually high spiritual purpose. Intensely significant.",
        22:"A master builder union — together they create something of lasting social value.",
        33:"A master teacher union — their love is a vehicle for collective healing.",
    }

    # Combined Personal Year — are their cycles synchronised?
    py_diff = abs(profile_a.personal_year - profile_b.personal_year)
    if py_diff == 0:
        cycle_note = "Both in the same Personal Year — their timing is completely synchronised."
    elif py_diff == 1:
        cycle_note = "Adjacent Personal Years — one leads, the other integrates."
    elif py_diff == 3:
        cycle_note = "Complementary cycles — their energies create a complete picture together."
    else:
        cycle_note = f"Different Personal Years ({profile_a.personal_year} and {profile_b.personal_year}) — independent rhythms that must be consciously coordinated."

    # Marriage timing — Personal Year 6 or 2 for either person
    marriage_years = []
    current_year = date.today().year
    for offset in range(8):
        yr    = current_year + offset
        py_a  = personal_year_vibration(profile_a.personal_year, 1, yr)
        py_b  = personal_year_vibration(profile_b.personal_year, 1, yr)
        if py_a in (2, 6) or py_b in (2, 6):
            marriage_years.append({
                "year":    yr,
                "person_a_py": py_a,
                "person_b_py": py_b,
                "note": (
                    f"Person A in Personal Year {py_a}, Person B in Personal Year {py_b} — "
                    f"{'excellent' if (py_a == 6 or py_b == 6) else 'good'} year for marriage."
                )
            })

    return {
        "union_number":      union_num,
        "union_is_master":   is_master(union_num),
        "union_theme":       _UNION_THEMES.get(union_num, "A union of unique combined purpose."),
        "cycle_note":        cycle_note,
        "marriage_windows":  marriage_years[:3],
        "compatibility":     compute_compatibility_score(profile_a, profile_b),
        "karmic_cross":      karmic_debt_cross_analysis(profile_a, profile_b),
    }


# ---------------------------------------------------------------------------
# Partner numerology computation
# ---------------------------------------------------------------------------

def compute_partner_numerology(
    partner:      PartnerBirthData,
    current_date: Optional[date] = None,
) -> NumerologyProfile:
    """
    Compute NumerologyProfile for the partner in a synastry reading.
    Adapts PartnerBirthData to the same computation pipeline.
    """
    if current_date is None:
        current_date = date.today()

    # Build a minimal BirthData-compatible structure
    class _PartnerAdapter:
        def __init__(self, p: PartnerBirthData):
            self.day        = p.day
            self.month      = p.month
            self.year       = p.year
            self.hour       = p.hour
            self.minute     = p.minute
            self.hour_known = p.hour_known
            self.full_name  = p.full_name

    adapter  = _PartnerAdapter(partner)

    day   = adapter.day
    month = adapter.month
    year  = adapter.year
    name  = adapter.full_name.strip().upper()
    cy    = current_date.year
    cm    = current_date.month
    cd    = current_date.day

    lp, lp_pre      = life_path(day, month, year)
    dest, dest_pre   = destiny_number(name)
    soul             = soul_urge_number(name)
    pers             = personality_number(name)
    gift, challenge  = birthday_gift_challenge(day)
    karmic           = detect_karmic_numbers(day, month, year, dest_pre, lp_pre)

    p1_num, p2_num, p3_num, p4_num = pinnacle_numbers(day, month, year)
    c1, c2, c3, c4                  = pinnacle_challenges(day, month, year)
    first_end, timing_ranges        = pinnacle_timing(lp)
    curr_idx                        = current_pinnacle_index(year, cy, lp)

    pinn_numbers = [p1_num, p2_num, p3_num, p4_num]
    challenges   = [c1, c2, c3, c4]

    pinnacles_list: List[Pinnacle] = []
    for i, (start, end) in enumerate(timing_ranges):
        pnum = pinn_numbers[i]
        pinnacles_list.append(Pinnacle(
            number     = pnum,
            start_age  = start,
            end_age    = end,
            theme      = _PINNACLE_THEMES.get(pnum, "A significant life cycle"),
            challenge  = challenges[i],
            is_current = (i == curr_idx),
        ))

    current_pinnacle = pinnacles_list[curr_idx]
    uy  = universal_year(cy)
    pyv = personal_year_vibration(day, month, cy)
    mv  = monthly_vibration(pyv, cm)
    wom = week_of_month(cd)
    dow = day_of_week_kayal(current_date)
    wv  = weekly_vibration(pyv, cm, wom)
    dv  = daily_vibration(pyv, cm, wom, dow)
    partner_missing_nums = missing_numbers(day, month, year)

    return NumerologyProfile(
        life_path              = lp,
        destiny                = dest,
        soul_urge              = soul,
        personality            = pers,
        birthday_gift          = gift,
        birthday_challenge     = challenge,
        is_life_path_master    = is_master(lp),
        is_destiny_master      = is_master(dest),
        is_soul_urge_master    = is_master(soul),
        karmic_debts           = karmic,
        pinnacles              = pinnacles_list,
        current_pinnacle       = current_pinnacle,
        universal_year         = uy,
        personal_year          = pyv,
        personal_month         = mv,
        personal_week          = wv,
        personal_day           = dv,
        chaldean_life_path     = None,
        chaldean_destiny       = None,
        chaldean_note          = None,
        missing_numbers        = partner_missing_nums,
    )
