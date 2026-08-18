"""
Esoteric — Chinese Synthesis
==============================
Five-element (Wu Xing) analysis, Ba Zi (Four Pillars) synthesis,
and I Ching timing signals.

Wu Xing — The Five Elements:
    Wood  (木 Mù)   — Growth, expansion, creativity, upward movement
    Fire  (火 Huǒ)  — Transformation, passion, intelligence, outward expression
    Earth (土 Tǔ)   — Stability, nourishment, mediation, consolidation
    Metal (金 Jīn)  — Precision, contraction, clarity, righteous action
    Water (水 Shuǐ) — Wisdom, fluidity, storage, inward reflection

Ba Zi — Four Pillars of Destiny:
    Year Pillar  — Social self, relationship with society and ancestors
    Month Pillar — Career and parental relationship, talents
    Day Pillar   — True self and spouse palace (most important)
    Hour Pillar  — Children, inner thoughts, later life (optional)

The Day Master (日主 Rì Zhǔ) is the Day Pillar Heavenly Stem —
it is the core identity element, the primary self in Ba Zi.

I Ching — The Book of Changes:
    Used for the TIMING domain specifically.
    The hexagram derived from birth data indicates the nature
    of the current life chapter.

v1.0.1 — Real bug fix, confirmed against a live production traceback:
    get_element_domain_reading() called domain.value unconditionally,
    with no protection at all, while its only caller, _chinese_enrichment()
    in synthesiser.py, already converts domain to a plain string before
    ever calling this function. Every v3.0.0 domain added in the
    synthesiser (spirit_world, sexuality, children_forecast, and others)
    is a plain string, never a real Domain enum member, confirmed
    directly against models.py, so this crashed every reading that
    touched one of those domains with AttributeError: 'str' object has
    no attribute 'value'. Original domains like "career" happened to
    also be valid Domain enum members elsewhere, masking the bug for
    them specifically. Now accepts either a real Domain enum or a plain
    string, the same defensive pattern already used successfully
    throughout synthesiser.py.

Author: KAYAL Engineering
Version: 1.0.1
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Dict, List, Optional, Tuple

from ..models import (
    ChineseSynthesis,
    ChineseElement,
    BirthData,
    Domain,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Heavenly Stems (天干 Tiān Gān) — 10 stems, 5 elements × 2 polarity
# ---------------------------------------------------------------------------
_HEAVENLY_STEMS = [
    ("Jiǎ",  ChineseElement.WOOD,  "yang"),   # 甲
    ("Yǐ",   ChineseElement.WOOD,  "yin"),    # 乙
    ("Bǐng", ChineseElement.FIRE,  "yang"),   # 丙
    ("Dīng", ChineseElement.FIRE,  "yin"),    # 丁
    ("Wù",   ChineseElement.EARTH, "yang"),   # 戊
    ("Jǐ",   ChineseElement.EARTH, "yin"),    # 己
    ("Gēng", ChineseElement.METAL, "yang"),   # 庚
    ("Xīn",  ChineseElement.METAL, "yin"),    # 辛
    ("Rén",  ChineseElement.WATER, "yang"),   # 壬
    ("Guǐ",  ChineseElement.WATER, "yin"),    # 癸
]

# Earthly Branches (地支 Dì Zhī) — 12 branches
_EARTHLY_BRANCHES = [
    ("Zǐ",   ChineseElement.WATER),   # 子 — Rat
    ("Chǒu", ChineseElement.EARTH),   # 丑 — Ox
    ("Yín",  ChineseElement.WOOD),    # 寅 — Tiger
    ("Mǎo",  ChineseElement.WOOD),    # 卯 — Rabbit
    ("Chén", ChineseElement.EARTH),   # 辰 — Dragon
    ("Sì",   ChineseElement.FIRE),    # 巳 — Snake
    ("Wǔ",   ChineseElement.FIRE),    # 午 — Horse
    ("Wèi",  ChineseElement.EARTH),   # 未 — Goat
    ("Shēn", ChineseElement.METAL),   # 申 — Monkey
    ("Yǒu",  ChineseElement.METAL),   # 酉 — Rooster
    ("Xū",   ChineseElement.EARTH),   # 戌 — Dog
    ("Hài",  ChineseElement.WATER),   # 亥 — Pig
]

# Month branch mapping (approximate — solar terms define exact boundaries)
_MONTH_BRANCHES = {
    1:  2,   # January  → Chǒu (Ox) / Earth
    2:  3,   # February → Yín (Tiger) / Wood  [after Lìchūn ~Feb 4]
    3:  4,   # March    → Mǎo (Rabbit) / Wood
    4:  5,   # April    → Chén (Dragon) / Earth
    5:  6,   # May      → Sì (Snake) / Fire
    6:  7,   # June     → Wǔ (Horse) / Fire
    7:  8,   # July     → Wèi (Goat) / Earth
    8:  9,   # August   → Shēn (Monkey) / Metal
    9:  10,  # September→ Yǒu (Rooster) / Metal
    10: 11,  # October  → Xū (Dog) / Earth
    11: 12,  # November → Hài (Pig) / Water
    12: 1,   # December → Zǐ (Rat) / Water
}

# Hour branch mapping (2-hour segments)
_HOUR_BRANCHES = {
    (23, 1):  0,   # Zǐ (Rat) / Water
    (1, 3):   1,   # Chǒu (Ox) / Earth
    (3, 5):   2,   # Yín (Tiger) / Wood
    (5, 7):   3,   # Mǎo (Rabbit) / Wood
    (7, 9):   4,   # Chén (Dragon) / Earth
    (9, 11):  5,   # Sì (Snake) / Fire
    (11, 13): 6,   # Wǔ (Horse) / Fire
    (13, 15): 7,   # Wèi (Goat) / Earth
    (15, 17): 8,   # Shēn (Monkey) / Metal
    (17, 19): 9,   # Yǒu (Rooster) / Metal
    (19, 21): 10,  # Xū (Dog) / Earth
    (21, 23): 11,  # Hài (Pig) / Water
}

# ---------------------------------------------------------------------------
# Ba Zi calculation
# ---------------------------------------------------------------------------
def _year_stem_branch(year: int) -> Tuple[int, int]:
    """Return (stem_idx, branch_idx) for a given year."""
    # Year 4 CE = Jiǎ Zǐ (stem 0, branch 0)
    offset = (year - 4) % 60
    stem_idx   = offset % 10
    branch_idx = offset % 12
    return stem_idx, branch_idx

def _month_stem_branch(year: int, month: int) -> Tuple[int, int]:
    """Return (stem_idx, branch_idx) for a given year and month."""
    branch_idx = _MONTH_BRANCHES.get(month, 1) - 1   # 0-indexed
    # Month stem depends on year stem (5-cycle rule)
    year_stem_idx, _ = _year_stem_branch(year)
    # Month stem cycle: based on year stem group (0-4) × 12 months
    base_stem = (year_stem_idx % 5) * 2
    month_offset = (month - 1) % 12
    stem_idx = (base_stem + month_offset) % 10
    return stem_idx, branch_idx

def _day_stem_branch(year: int, month: int, day: int) -> Tuple[int, int]:
    """
    Return (stem_idx, branch_idx) for the day master.
    Uses Julian Day Number method for accuracy.
    """
    # Convert to Julian Day Number
    a = (14 - month) // 12
    y = year - a
    m = month + 12 * a - 3
    jdn = (day + (153 * m + 2) // 5 + 365 * y +
           y // 4 - y // 100 + y // 400 + 32045)

    # Ba Zi day cycle: Jan 1, 1900 = Jiǎ Xū (stem 0 adj, branch 10)
    # Reference: JDN of Jan 1 1900 = 2415021
    ref_jdn  = 2415021
    ref_stem = 0    # Jiǎ
    ref_branch = 10 # Xū

    diff       = jdn - ref_jdn
    stem_idx   = (ref_stem   + diff) % 10
    branch_idx = (ref_branch + diff) % 12
    return stem_idx, branch_idx

def _hour_stem_branch(hour: int, day_stem_idx: int) -> Tuple[int, int]:
    """Return (stem_idx, branch_idx) for the hour pillar."""
    branch_idx = 0
    for (h_start, h_end), b_idx in _HOUR_BRANCHES.items():
        h = hour % 24
        if h_start > h_end:  # wrap (23–1)
            if h >= h_start or h < h_end:
                branch_idx = b_idx
                break
        else:
            if h_start <= h < h_end:
                branch_idx = b_idx
                break

    # Hour stem based on day stem (5-cycle rule)
    base_stem = (day_stem_idx % 5) * 2
    stem_idx  = (base_stem + branch_idx // 2) % 10
    return stem_idx, branch_idx

def _element_from_stem(stem_idx: int) -> ChineseElement:
    return _HEAVENLY_STEMS[stem_idx % 10][1]

def _element_from_branch(branch_idx: int) -> ChineseElement:
    return _EARTHLY_BRANCHES[branch_idx % 12][1]

# ---------------------------------------------------------------------------
# Five element balance
# ---------------------------------------------------------------------------
def _count_elements(elements: List[ChineseElement]) -> Dict[str, int]:
    counts = {e.value: 0 for e in ChineseElement}
    for e in elements:
        counts[e.value] += 1
    return counts

def _dominant_element(counts: Dict[str, int]) -> ChineseElement:
    return ChineseElement(max(counts, key=counts.get))

def _lacking_element(
    counts: Dict[str, int],
    dominant: ChineseElement,
) -> Optional[ChineseElement]:
    zeros = [k for k, v in counts.items() if v == 0]
    if zeros:
        return ChineseElement(zeros[0])
    # If no zeros, find the least present (excluding dominant)
    non_dominant = {k: v for k, v in counts.items() if k != dominant.value}
    if non_dominant:
        return ChineseElement(min(non_dominant, key=non_dominant.get))
    return None

# ---------------------------------------------------------------------------
# Five element domain profiles
# ---------------------------------------------------------------------------
_ELEMENT_DOMAIN_PROFILES: Dict[str, Dict[str, str]] = {
    ChineseElement.WOOD.value: {
        Domain.CAREER.value:    "Growth-oriented career. Excels in creative, educational, and planning roles. Natural leader who builds teams.",
        Domain.HEALTH.value:    "Liver and gallbladder as key organs. Prone to tension in neck and shoulders. Benefits from flexibility practices.",
        Domain.LOVE.value:      "Seeks growth and expansion in relationships. Can become rigid when stressed. Needs a partner who allows personal development.",
        Domain.WEALTH.value:    "Wealth through growth industries, education, and creative fields. Slow and steady accumulation.",
        Domain.CHARACTER.value: "Visionary, principled, and growth-oriented. The shadow is inflexibility and over-extension.",
        Domain.SPIRITUAL.value: "Spring energy — new beginnings, renewal, and the spiritual practice of growth.",
    },
    ChineseElement.FIRE.value: {
        Domain.CAREER.value:    "Charismatic leadership, sales, entertainment, and inspirational roles. Peak performance in dynamic environments.",
        Domain.HEALTH.value:    "Heart and small intestine as key organs. Prone to anxiety and overheating. Needs cooling and grounding practices.",
        Domain.LOVE.value:      "Passionate, expressive, and intensely romantic. Relationships run hot — needs balance to sustain.",
        Domain.WEALTH.value:    "Wealth through charisma, network, and bold action. High earn-and-spend cycles.",
        Domain.CHARACTER.value: "Brilliant, passionate, and inspiring. The shadow is instability and burning out relationships.",
        Domain.SPIRITUAL.value: "Summer energy — full expression, consciousness, and the spiritual practice of presence.",
    },
    ChineseElement.EARTH.value: {
        Domain.CAREER.value:    "Management, agriculture, real estate, and stability-building roles. The reliable foundation of any organisation.",
        Domain.HEALTH.value:    "Stomach and spleen as key organs. Prone to overthinking and digestive issues. Benefits from grounding routines.",
        Domain.LOVE.value:      "Steady, nurturing, and deeply loyal. Expresses love through care and provision. Slow to trust, lasting when committed.",
        Domain.WEALTH.value:    "Property, stable assets, and long-term investment. Conservative accumulation over decades.",
        Domain.CHARACTER.value: "Grounded, patient, and mediating. The shadow is worry, over-analysis, and difficulty with change.",
        Domain.SPIRITUAL.value: "Late summer energy — harvest, abundance, and the spiritual practice of gratitude.",
    },
    ChineseElement.METAL.value: {
        Domain.CAREER.value:    "Precision, justice, finance, medicine, and engineering. Excels where standards and integrity matter.",
        Domain.HEALTH.value:    "Lungs and large intestine as key organs. Prone to grief and respiratory sensitivity. Benefits from breathwork.",
        Domain.LOVE.value:      "Selective, refined, and principled in love. High standards — needs a partner who matches their quality.",
        Domain.WEALTH.value:    "Wealth through precision, expertise, and disciplined accumulation. Strong in precious resources.",
        Domain.CHARACTER.value: "Principled, discerning, and refined. The shadow is perfectionism and difficulty accepting imperfection.",
        Domain.SPIRITUAL.value: "Autumn energy — harvest completion, letting go, and the spiritual practice of discernment.",
    },
    ChineseElement.WATER.value: {
        Domain.CAREER.value:    "Philosophy, research, healing, and creative depth. Operates well in fluid, non-hierarchical environments.",
        Domain.HEALTH.value:    "Kidneys and bladder as key organs. Prone to fear, cold sensitivity, and depletion. Needs deep rest.",
        Domain.LOVE.value:      "Deep, wise, and soul-connected in love. Can be emotionally complex. Seeks profound understanding.",
        Domain.WEALTH.value:    "Wealth through wisdom, depth, and long-term strategy. Conservation and depth over rapid growth.",
        Domain.CHARACTER.value: "Wise, deep, and adaptable. The shadow is fear, isolation, and difficulty with boundary-setting.",
        Domain.SPIRITUAL.value: "Winter energy — stillness, depth, and the spiritual practice of inner wisdom.",
    },
}

# ---------------------------------------------------------------------------
# Ba Zi profile language
# ---------------------------------------------------------------------------
def _ba_zi_profile(
    day_master: ChineseElement,
    dominant:   ChineseElement,
    lacking:    Optional[ChineseElement],
    counts:     Dict[str, int],
    hour_uncertain: bool,
) -> str:
    """Generate plain language Ba Zi profile summary."""
    profile = (
        f"Day Master element: {day_master.value.title()} — "
        f"this is the core elemental identity. "
    )

    if dominant == day_master:
        profile += (
            f"The chart is strongly rooted in {day_master.value} energy — "
            "expressed confidently and consistently. "
        )
    else:
        profile += (
            f"The {dominant.value.title()} element dominates the chart, "
            f"modifying the {day_master.value.title()} Day Master. "
        )

    if lacking:
        profile += (
            f"The {lacking.value.title()} element is absent or minimal — "
            "this represents an area for conscious cultivation and balance."
        )

    if hour_uncertain:
        profile += (
            " Note: birth hour is unknown. "
            "The hour pillar (inner world and later life) has been estimated "
            "and carries reduced weight in this analysis."
        )

    return profile

# ---------------------------------------------------------------------------
# I Ching timing signal
# ---------------------------------------------------------------------------
def _derive_iching_hexagram(birth_data: BirthData) -> Tuple[int, str]:
    """
    Derive an I Ching hexagram from birth data for timing domain.
    Uses a simplified but consistent mapping from birth numerics.
    Returns (hexagram_number 1–64, plain_language_meaning).
    """
    # Sum of reduced birth numerics → hexagram
    day   = birth_data.day
    month = birth_data.month
    year  = birth_data.year

    # Reduce year to single digit
    y = sum(int(d) for d in str(year))
    while y > 9:
        y = sum(int(d) for d in str(y))

    total = (day + month + y) % 64
    hexagram = total if total > 0 else 64

    # Plain language meanings for all 64 hexagrams (abbreviated)
    meanings = {
        1:  "Creative power — initiating force, the time for bold new beginnings",
        2:  "Receptive yielding — open to guidance, allow rather than force",
        3:  "Difficulty at the start — persist through initial challenges",
        4:  "Youthful inexperience — seek wisdom, remain humble and teachable",
        5:  "Waiting — trust the timing, preparation before action",
        6:  "Conflict — seek resolution and clear communication",
        7:  "The army — disciplined collective effort toward shared goal",
        8:  "Union — coming together with aligned others",
        9:  "Small taming — patient accumulation of small gains",
        10: "Treading carefully — proceed with mindfulness and respect",
        11: "Peace — harmony between inner and outer, abundance flows",
        12: "Standstill — a period of stagnation before renewal",
        13: "Fellowship — collaboration and community",
        14: "Great possession — prosperity through integrity and sharing",
        15: "Modesty — genuine humility attracts lasting success",
        16: "Enthusiasm — inspired action with joyful energy",
        17: "Following — alignment with natural flow and timing",
        18: "Work on what is spoiled — healing and restoration",
        19: "Approach — opportunity is coming, prepare to receive",
        20: "Contemplation — observe before acting, gain perspective",
        21: "Biting through — decisive action to resolve long-standing issues",
        22: "Grace — beauty and authenticity in expression",
        23: "Splitting apart — letting go of what no longer serves",
        24: "Return — renewal after rest, new cycle beginning",
        25: "Innocence — act from genuine motivation, not strategy",
        26: "Great taming — patient mastery of powerful forces",
        27: "Nourishment — cultivate what sustains, release what depletes",
        28: "Great exceeding — extraordinary times call for bold response",
        29: "The abysmal — move through difficulty with flexible persistence",
        30: "The clinging — clarity and illumination, attach to what is true",
        31: "Influence — genuine attraction, heart-felt connection",
        32: "Duration — sustain what works, build lasting foundation",
        33: "Retreat — strategic withdrawal to gather strength",
        34: "Great power — strength used with wisdom and restraint",
        35: "Progress — rapid advance in favourable conditions",
        36: "Darkening of the light — preserve inner clarity in difficult times",
        37: "The family — harmony in close relationships and community",
        38: "Opposition — find unity within difference",
        39: "Obstruction — redirect around obstacles rather than force through",
        40: "Deliverance — release from tension, forgiveness and renewal",
        41: "Decrease — voluntary simplification brings unexpected gain",
        42: "Increase — a time of growth and benefiting from goodwill",
        43: "Breakthrough — decisive resolve overcomes long-standing limitation",
        44: "Coming to meet — be discerning about what you allow to enter",
        45: "Gathering together — convene aligned community and resources",
        46: "Pushing upward — steady ascent through consistent effort",
        47: "Oppression — inner richness sustains through outer constraint",
        48: "The well — inexhaustible inner resource available to all",
        49: "Revolution — fundamental transformation whose time has come",
        50: "The cauldron — transformation of raw material into refined value",
        51: "The arousing — shock leads to awakening and new clarity",
        52: "Keeping still — rest, stillness, and meditative withdrawal",
        53: "Development — gradual and organic growth, proceed in stages",
        54: "The marrying maiden — understand your position within larger patterns",
        55: "Abundance — peak flourishing, radiate outward",
        56: "The wanderer — flexibility and adaptability in uncertain terrain",
        57: "The gentle — persistent gentle influence achieves lasting change",
        58: "The joyous — authentic joy as a generative force",
        59: "Dispersion — dissolving rigidity to restore flow",
        60: "Limitation — work creatively within necessary boundaries",
        61: "Inner truth — sincere communication reaches even difficult hearts",
        62: "Small exceeding — attend to small matters with great care",
        63: "After completion — maintain vigilance at the point of success",
        64: "Before completion — transformation is near but not yet finalised",
    }

    meaning = meanings.get(hexagram, "A unique moment of transition and opportunity")
    return hexagram, meaning

# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------
def synthesise_chinese(birth_data: BirthData) -> ChineseSynthesis:
    """
    Perform complete Chinese cosmological synthesis.

    Args:
        birth_data: BirthData with full birth information

    Returns:
        ChineseSynthesis for Logic Engine consumption
    """
    year  = birth_data.year
    month = birth_data.month
    day   = birth_data.day
    hour  = birth_data.hour if birth_data.hour_known and birth_data.hour is not None else 12
    hour_uncertain = not birth_data.hour_known

    # Calculate four pillars
    year_stem_idx,  year_branch_idx  = _year_stem_branch(year)
    month_stem_idx, month_branch_idx = _month_stem_branch(year, month)
    day_stem_idx,   day_branch_idx   = _day_stem_branch(year, month, day)
    hour_stem_idx,  hour_branch_idx  = _hour_stem_branch(hour, day_stem_idx)

    # Extract elements for all stems and branches
    year_element   = _element_from_stem(year_stem_idx)
    month_element  = _element_from_stem(month_stem_idx)
    day_element    = _element_from_stem(day_stem_idx)    # Day Master
    hour_element   = _element_from_stem(hour_stem_idx)

    # Also include branch elements
    year_branch_el  = _element_from_branch(year_branch_idx)
    month_branch_el = _element_from_branch(month_branch_idx)
    day_branch_el   = _element_from_branch(day_branch_idx)
    hour_branch_el  = _element_from_branch(hour_branch_idx)

    all_elements = [
        year_element, year_branch_el,
        month_element, month_branch_el,
        day_element, day_branch_el,
    ]

    if not hour_uncertain:
        all_elements.extend([hour_element, hour_branch_el])
    else:
        # Add at reduced weight — still include for element balance
        all_elements.extend([hour_element])  # stem only, reduced

    counts    = _count_elements(all_elements)
    dominant  = _dominant_element(counts)
    lacking   = _lacking_element(counts, dominant)

    # Ba Zi profile
    profile = _ba_zi_profile(
        day_element, dominant, lacking, counts, hour_uncertain
    )

    # I Ching hexagram
    hexagram_num, hexagram_meaning = _derive_iching_hexagram(birth_data)

    logger.info(
        "ChineseSynthesis completed",
        extra={
            "day_master":   day_element.value,
            "year_element": year_element.value,
            "dominant":     dominant.value,
            "lacking":      lacking.value if lacking else "none",
            "hexagram":     hexagram_num,
        },
    )

    return ChineseSynthesis(
        day_master_element  = day_element,
        year_element        = year_element,
        month_element       = month_element,
        hour_element        = None if hour_uncertain else hour_element,
        dominant_element    = dominant,
        lacking_element     = lacking,
        element_balance     = counts,
        ba_zi_profile       = profile,
        hour_uncertain      = hour_uncertain,
        iching_hexagram     = hexagram_num,
        iching_meaning      = hexagram_meaning,
    )

def get_element_domain_reading(
    element: ChineseElement,
    domain,
) -> Optional[str]:
    """
    Get the Chinese element's reading for a specific domain.
    Used by synthesiser to add Chinese layer to domain synthesis.

    domain may be a real Domain enum member, for the original domains
    that were always part of the enum, or a plain string, for the
    v3.0.0 domain keys (spirit_world, sexuality, children_forecast, and
    others) that were never added to the Domain enum itself. The only
    caller, _chinese_enrichment() in synthesiser.py, already converts
    domain to a plain string before calling this function, so this
    always received a plain string in practice, calling .value on it
    unconditionally, with no protection, crashed every reading that
    touched one of those newer domains, confirmed against a real
    production traceback.
    """
    domain_key = domain.value if hasattr(domain, "value") else domain
    element_profile = _ELEMENT_DOMAIN_PROFILES.get(element.value, {})
    return element_profile.get(domain_key)
