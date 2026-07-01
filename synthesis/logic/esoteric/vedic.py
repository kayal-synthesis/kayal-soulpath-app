"""
Esoteric — Vedic Synthesis
============================
Jyotish (Vedic astrology) and Ayurvedic synthesis layer.

This module does NOT perform full chart calculation —
that is handled by astrology_engine.py using Swiss Ephemeris
with sidereal zodiac (Lahiri ayanamsa).

This module takes the computed Vedic chart data and applies:
    1. Navagraha (nine planet) domain mappings
    2. Nakshatra (lunar mansion) character synthesis
    3. Dosha (Ayurvedic constitution) health readings
    4. Karmic indicators from planetary placements
    5. Dharma (life purpose) synthesis from Atmakaraka

Navagraha — Nine Planets of Jyotish:
    Surya   (Sun)      — Soul, father, authority, vitality
    Chandra (Moon)     — Mind, mother, emotions, cycles
    Mangala (Mars)     — Energy, siblings, property, courage
    Budha   (Mercury)  — Intellect, communication, commerce
    Guru    (Jupiter)  — Wisdom, expansion, children, dharma
    Shukra  (Venus)    — Love, beauty, vehicles, desires
    Shani   (Saturn)   — Karma, service, discipline, longevity
    Rahu    (N. Node)  — Obsession, ambition, foreign, unconventional
    Ketu    (S. Node)  — Liberation, past life, spirituality, detachment

The 27 Nakshatras (lunar mansions) each have a ruling planet,
deity, quality, and symbolic animal — together they describe
the quality of the Moon's position at birth and the fundamental
temperament of the mind.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from ..models import (
    VedicSynthesis,
    AyurvedicDosha,
    BirthData,
    Domain,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 27 Nakshatras — name, ruling planet, primary domain signal, dosha tendency
# ---------------------------------------------------------------------------

_NAKSHATRAS: List[Dict] = [
    # Each: name, lord, domain_signal, dosha, character_theme
    {"name": "Ashwini",     "lord": "Ketu",    "domain": Domain.HEALTH,    "dosha": "vata",        "theme": "healing, swift action, pioneering energy"},
    {"name": "Bharani",     "lord": "Shukra",  "domain": Domain.LOVE,      "dosha": "pitta",       "theme": "bearing, transformation, Venusian depth"},
    {"name": "Krittika",    "lord": "Surya",   "domain": Domain.CAREER,    "dosha": "kapha",       "theme": "cutting through, purification, solar authority"},
    {"name": "Rohini",      "lord": "Chandra", "domain": Domain.WEALTH,    "dosha": "kapha",       "theme": "growth, beauty, material abundance"},
    {"name": "Mrigashira",  "lord": "Mangala", "domain": Domain.CHARACTER, "dosha": "pitta_vata",  "theme": "searching, curiosity, gentle exploration"},
    {"name": "Ardra",       "lord": "Rahu",    "domain": Domain.SPIRITUAL, "dosha": "vata",        "theme": "storm, intensity, destruction leading to renewal"},
    {"name": "Punarvasu",   "lord": "Guru",    "domain": Domain.SPIRITUAL, "dosha": "vata_pitta",  "theme": "return to light, renewal, benevolent expansion"},
    {"name": "Pushya",      "lord": "Shani",   "domain": Domain.WEALTH,    "dosha": "pitta",       "theme": "nourishment, abundance, protective energy"},
    {"name": "Ashlesha",    "lord": "Budha",   "domain": Domain.CHARACTER, "dosha": "kapha",       "theme": "entwining, serpent wisdom, penetrating insight"},
    {"name": "Magha",       "lord": "Ketu",    "domain": Domain.CAREER,    "dosha": "kapha",       "theme": "throne, ancestors, royal authority"},
    {"name": "Purva Phalguni","lord": "Shukra","domain": Domain.LOVE,      "dosha": "pitta",       "theme": "pleasure, creativity, Venusian beauty"},
    {"name": "Uttara Phalguni","lord": "Surya","domain": Domain.CAREER,    "dosha": "vata",        "theme": "patronage, agreements, solar generosity"},
    {"name": "Hasta",       "lord": "Chandra", "domain": Domain.CAREER,    "dosha": "vata_pitta",  "theme": "skill in hands, craftsmanship, healing touch"},
    {"name": "Chitra",      "lord": "Mangala", "domain": Domain.CHARACTER, "dosha": "pitta",       "theme": "brilliance, artistry, Martian creativity"},
    {"name": "Swati",       "lord": "Rahu",    "domain": Domain.FINANCE,   "dosha": "vata",        "theme": "independence, flexibility, commercial acumen"},
    {"name": "Vishakha",    "lord": "Guru",    "domain": Domain.CAREER,    "dosha": "pitta_kapha", "theme": "purposeful achievement, forked path, determination"},
    {"name": "Anuradha",    "lord": "Shani",   "domain": Domain.LOVE,      "dosha": "pitta",       "theme": "devoted friendship, loyalty, Saturn's discipline in love"},
    {"name": "Jyeshtha",    "lord": "Budha",   "domain": Domain.CAREER,    "dosha": "vata_kapha",  "theme": "elder, chief, Mercury's authority"},
    {"name": "Mula",        "lord": "Ketu",    "domain": Domain.SPIRITUAL, "dosha": "vata",        "theme": "root, dissolution, Ketu's liberation"},
    {"name": "Purva Ashadha","lord": "Shukra", "domain": Domain.CHARACTER, "dosha": "pitta",       "theme": "invincibility, water purification, Venusian strength"},
    {"name": "Uttara Ashadha","lord": "Surya", "domain": Domain.CHARACTER, "dosha": "kapha",       "theme": "universal victory, elephant's strength, solar persistence"},
    {"name": "Shravana",    "lord": "Chandra", "domain": Domain.SPIRITUAL, "dosha": "kapha",       "theme": "listening, learning, lunar receptivity"},
    {"name": "Dhanishtha",  "lord": "Mangala", "domain": Domain.WEALTH,    "dosha": "pitta",       "theme": "wealth, symphony, Martian abundance"},
    {"name": "Shatabhisha", "lord": "Rahu",    "domain": Domain.HEALTH,    "dosha": "vata",        "theme": "healing, Rahu's medicine, the 100 healers"},
    {"name": "Purva Bhadrapada","lord":"Guru", "domain": Domain.SPIRITUAL, "dosha": "vata_pitta",  "theme": "fire of transformation, Jupiter's intensity"},
    {"name": "Uttara Bhadrapada","lord":"Shani","domain": Domain.SPIRITUAL,"dosha": "pitta_kapha", "theme": "depth, Saturn's wisdom, the serpent of the deep"},
    {"name": "Revati",      "lord": "Budha",   "domain": Domain.LOVE,      "dosha": "kapha",       "theme": "completion, Mercury's abundance, the final journey"},
]


# ---------------------------------------------------------------------------
# Navagraha domain authority
# Which planet speaks most strongly to which domain
# ---------------------------------------------------------------------------

_PLANET_DOMAIN_SIGNALS: Dict[str, Dict[str, str]] = {
    "Surya": {
        Domain.CAREER.value:    "Sun in chart indicates soul-level vocation — what the person was born to do and be recognised for.",
        Domain.CHARACTER.value: "Strong Surya indicates natural authority, identity clarity, and vital self-expression.",
        Domain.HEALTH.value:    "Sun governs vitality and the heart — its condition indicates constitutional life force.",
    },
    "Chandra": {
        Domain.LOVE.value:      "Moon indicates the emotional nature in relationships — how one gives and receives nurturance.",
        Domain.HEALTH.value:    "Moon governs the mind and fluids — its condition indicates emotional and hormonal balance.",
        Domain.CHARACTER.value: "Strong Chandra indicates emotional intelligence, receptivity, and deep feeling.",
    },
    "Mangala": {
        Domain.CAREER.value:    "Mars indicates drive, competitive edge, and the courage to initiate in career.",
        Domain.HEALTH.value:    "Mars governs physical energy and the blood — its condition indicates vitality and inflammation tendency.",
        Domain.CHARACTER.value: "Strong Mangala indicates courage, directness, and the will to act.",
    },
    "Budha": {
        Domain.CAREER.value:    "Mercury indicates communication, commerce, and analytical capacity in career.",
        Domain.FINANCE.value:   "Mercury governs commercial intelligence and the ability to identify opportunity.",
        Domain.CHARACTER.value: "Strong Budha indicates sharp intellect, adaptability, and communicative skill.",
    },
    "Guru": {
        Domain.SPIRITUAL.value: "Jupiter indicates the quality of wisdom, dharma, and spiritual growth in this lifetime.",
        Domain.WEALTH.value:    "Jupiter governs expansion and abundance — its condition indicates prosperity potential.",
        Domain.CAREER.value:    "Strong Guru indicates natural teaching authority and philosophical leadership.",
    },
    "Shukra": {
        Domain.LOVE.value:      "Venus indicates the quality of romantic and aesthetic life — desires, pleasures, and partnerships.",
        Domain.FINANCE.value:   "Venus governs assets, beauty industries, and relationship-driven wealth.",
        Domain.CHARACTER.value: "Strong Shukra indicates refinement, charm, and appreciation of beauty.",
    },
    "Shani": {
        Domain.CAREER.value:    "Saturn indicates the karma of work, discipline, and the long arc of professional achievement.",
        Domain.HEALTH.value:    "Saturn governs bones, teeth, and chronic conditions — patience and prevention are key.",
        Domain.SPIRITUAL.value: "Strong Shani indicates deep karmic work and the spiritual lessons of limitation and service.",
    },
    "Rahu": {
        Domain.CAREER.value:    "North Node indicates the soul's current-life ambition and unconventional path to achievement.",
        Domain.CHARACTER.value: "Rahu indicates obsessive drives, foreign influence, and the innovative edge.",
        Domain.SPIRITUAL.value: "Rahu shows where the soul is reaching beyond its comfort — the frontier of growth.",
    },
    "Ketu": {
        Domain.SPIRITUAL.value: "South Node indicates past-life mastery and the soul's deepest reservoir of wisdom.",
        Domain.CHARACTER.value: "Ketu indicates natural gifts carried from previous incarnations.",
        Domain.HEALTH.value:    "Ketu can indicate mysterious or difficult-to-diagnose health patterns — a karmic health signal.",
    },
}


# ---------------------------------------------------------------------------
# Dosha constitution profiles
# ---------------------------------------------------------------------------

_DOSHA_PROFILES: Dict[str, Dict[str, str]] = {
    AyurvedicDosha.VATA.value: {
        Domain.HEALTH.value:    "Vata constitution: creative, quick, and mobile. Prone to anxiety, dryness, and irregular digestion. Benefits from warm, grounding routine.",
        Domain.CHARACTER.value: "Naturally quick-minded, creative, and enthusiastic. Can become scattered or anxious under stress.",
        Domain.LOVE.value:      "Spontaneous and romantic in love. Needs grounding and consistency from partner.",
    },
    AyurvedicDosha.PITTA.value: {
        Domain.HEALTH.value:    "Pitta constitution: sharp, intense, and focused. Prone to inflammation, overheating, and perfectionism. Benefits from cooling and moderation.",
        Domain.CHARACTER.value: "Naturally sharp-minded, determined, and passionate. Can become critical or intense under stress.",
        Domain.CAREER.value:    "Natural leader and achiever. Drive and focus are primary career assets.",
    },
    AyurvedicDosha.KAPHA.value: {
        Domain.HEALTH.value:    "Kapha constitution: stable, grounded, and enduring. Prone to sluggishness, weight gain, and resistance to change. Benefits from stimulation and movement.",
        Domain.CHARACTER.value: "Naturally steady, nurturing, and compassionate. Can become stubborn or lethargic under stress.",
        Domain.LOVE.value:      "Deeply loyal and nurturing in love. The most stable and enduring relationship partner.",
    },
    AyurvedicDosha.VATA_PITTA.value: {
        Domain.HEALTH.value:    "Vata-Pitta constitution: creative intensity. Prone to burnout and inflammation. Benefits from structured rest and cooling practices.",
        Domain.CHARACTER.value: "Quick, sharp, and creative. The most mentally active constitution.",
        Domain.CAREER.value:    "Excellent in fast-moving, intellectually demanding environments.",
    },
    AyurvedicDosha.PITTA_KAPHA.value: {
        Domain.HEALTH.value:    "Pitta-Kapha constitution: intense stability. Strong constitution with good endurance. Benefits from regular exercise and avoiding excess.",
        Domain.CHARACTER.value: "Determined and enduring — combines Pitta's drive with Kapha's steadiness.",
        Domain.WEALTH.value:    "One of the strongest wealth constitutions — driven to accumulate and disciplined to maintain.",
    },
    AyurvedicDosha.VATA_KAPHA.value: {
        Domain.HEALTH.value:    "Vata-Kapha constitution: creative steadiness. Interesting combination of lightness and stability. Benefits from warming practices.",
        Domain.CHARACTER.value: "Creative, imaginative, and grounded — unusual combination that produces distinctive personalities.",
    },
    AyurvedicDosha.TRIDOSHIC.value: {
        Domain.HEALTH.value:    "Tridoshic constitution: all three doshas relatively balanced. Adaptable and resilient. Responds well to seasonal adjustments.",
        Domain.CHARACTER.value: "Versatile, adaptable, and well-rounded. Rare and considered auspicious in Ayurveda.",
    },
}


# ---------------------------------------------------------------------------
# Nakshatra to birth data mapping
# Uses Moon's approximate sign from birth month/year as proxy
# (full calculation requires Swiss Ephemeris in astrology_engine.py)
# ---------------------------------------------------------------------------

def _approximate_nakshatra_index(
    year: int,
    month: int,
    day: int,
) -> int:
    """
    Approximate nakshatra index from birth date.
    This is a simplified calculation — the astrology_engine.py
    provides the precise calculation using Swiss Ephemeris.
    Returns 0–26 index into _NAKSHATRAS.
    """
    # Days since epoch, modulo 27-nakshatra cycle (~27.32 days)
    # Reference: Jan 1, 2000 ≈ Uttara Phalguni (index 11)
    days_in_year  = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    day_of_year   = days_in_year[month - 1] + day
    years_since_2k= year - 2000
    total_days    = years_since_2k * 365 + day_of_year
    nakshatra_idx = int(abs(total_days) / 0.9144) % 27   # 27/27.32 ≈ 0.9890
    return nakshatra_idx


def _derive_dosha(nakshatra_idx: int) -> AyurvedicDosha:
    """Derive primary dosha from nakshatra."""
    dosha_str = _NAKSHATRAS[nakshatra_idx % 27].get("dosha", "vata")
    dosha_map = {
        "vata":        AyurvedicDosha.VATA,
        "pitta":       AyurvedicDosha.PITTA,
        "kapha":       AyurvedicDosha.KAPHA,
        "vata_pitta":  AyurvedicDosha.VATA_PITTA,
        "pitta_vata":  AyurvedicDosha.VATA_PITTA,
        "pitta_kapha": AyurvedicDosha.PITTA_KAPHA,
        "kapha_pitta": AyurvedicDosha.PITTA_KAPHA,
        "vata_kapha":  AyurvedicDosha.VATA_KAPHA,
        "kapha_vata":  AyurvedicDosha.VATA_KAPHA,
    }
    return dosha_map.get(dosha_str, AyurvedicDosha.TRIDOSHIC)


# ---------------------------------------------------------------------------
# Dasha system (simplified)
# Full Vimshottari dasha requires Moon's precise nakshatra degree
# This provides the approximate dasha lord for timing
# ---------------------------------------------------------------------------

_DASHA_SEQUENCE = [
    ("Ketu",   7),
    ("Shukra", 20),
    ("Surya",  6),
    ("Chandra",10),
    ("Mangala", 7),
    ("Rahu",   18),
    ("Guru",   16),
    ("Shani",  19),
    ("Budha",  17),
]

_TOTAL_DASHA_YEARS = sum(d[1] for d in _DASHA_SEQUENCE)  # = 120

def _approximate_current_dasha(
    birth_data: BirthData,
    current_year: int = 2026,
) -> Tuple[str, str]:
    """
    Approximate current Vimshottari dasha lord.
    Returns (planet_name, theme).
    Full calculation in astrology_engine.py.
    """
    from datetime import date

    age = current_year - birth_data.year
    # Position in 120-year cycle (approximate)
    cycle_pos = age % _TOTAL_DASHA_YEARS

    accumulated = 0
    for planet, years in _DASHA_SEQUENCE:
        accumulated += years
        if cycle_pos < accumulated:
            # This is the current dasha lord
            themes = {
                "Ketu":    "spiritual awakening, release of what no longer serves, karmic completion",
                "Shukra":  "love, beauty, pleasure, artistic expression, and material comfort",
                "Surya":   "authority, vitality, career advancement, and soul-level clarity",
                "Chandra": "emotional deepening, family focus, intuition, and cyclical change",
                "Mangala": "initiative, courage, property, and competitive drive",
                "Rahu":    "ambition, innovation, foreign connection, and unconventional growth",
                "Guru":    "expansion, wisdom, teaching, children, and spiritual development",
                "Shani":   "discipline, karmic reckoning, slow and lasting achievement",
                "Budha":   "communication, commerce, learning, and intellectual refinement",
            }
            return planet, themes.get(planet, "a significant period of change")

    return "Budha", "intellectual refinement and communication"


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def synthesise_vedic(
    birth_data:    BirthData,
    vedic_chart:   Optional[Dict] = None,
    current_year:  int = 2026,
) -> VedicSynthesis:
    """
    Perform Vedic synthesis.

    Args:
        birth_data:   BirthData
        vedic_chart:  Optional pre-computed chart from astrology_engine.py
                      If provided, uses precise values.
                      If None, uses approximation.
        current_year: Current year for dasha calculation

    Returns:
        VedicSynthesis
    """
    # Use pre-computed chart values if available, else approximate
    if vedic_chart:
        rashi       = vedic_chart.get("moon_sign", "unknown")
        nakshatra   = vedic_chart.get("nakshatra", "unknown")
        pada        = int(vedic_chart.get("nakshatra_pada", 1))
        lagna       = vedic_chart.get("lagna", "unknown")
        atmakaraka  = vedic_chart.get("atmakaraka", "unknown")
        nakshatra_idx = vedic_chart.get("nakshatra_idx", 0)
    else:
        # Approximate from birth data
        nakshatra_idx = _approximate_nakshatra_index(
            birth_data.year, birth_data.month, birth_data.day
        )
        nak_data    = _NAKSHATRAS[nakshatra_idx % 27]
        nakshatra   = nak_data["name"]
        pada        = ((birth_data.day % 4) + 1)   # approximate
        rashi       = _approximate_rashi(nakshatra_idx)
        lagna       = rashi + " Lagna (solar — birth time unknown)" if not birth_data.hour_known else rashi
        atmakaraka  = nak_data["lord"]

    dosha = _derive_dosha(nakshatra_idx)

    # Dosha notes
    dosha_profile = _DOSHA_PROFILES.get(dosha.value, {})
    dosha_notes   = dosha_profile.get(
        Domain.HEALTH.value,
        f"{dosha.value.replace('_', '-').title()} constitution — Ayurvedic health profile."
    )

    # Karmic indicators from nakshatra
    nak_data   = _NAKSHATRAS[nakshatra_idx % 27]
    karma_lord = nak_data.get("lord", "unknown")
    karma_indicators = _karma_from_lord(karma_lord)

    # Dharma indicator from atmakaraka
    dharma = _dharma_from_atmakaraka(atmakaraka)

    # Current dasha
    dasha_planet, dasha_theme = _approximate_current_dasha(birth_data, current_year)

    logger.info(
        "VedicSynthesis completed",
        extra={
            "nakshatra":    nakshatra,
            "pada":         pada,
            "rashi":        rashi,
            "dosha":        dosha.value,
            "atmakaraka":   atmakaraka,
            "dasha":        dasha_planet,
        },
    )

    return VedicSynthesis(
        rashi             = rashi,
        nakshatra         = nakshatra,
        nakshatra_pada    = pada,
        lagna             = lagna,
        atmakaraka        = atmakaraka,
        dosha             = dosha,
        dosha_notes       = dosha_notes,
        karma_indicators  = karma_indicators,
        dharma_indicator  = dharma,
    )


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _approximate_rashi(nakshatra_idx: int) -> str:
    """Approximate Moon sign (rashi) from nakshatra index."""
    rashis = [
        "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)",
        "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
        "Tula (Libra)", "Vrishchika (Scorpio)", "Dhanu (Sagittarius)",
        "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
    ]
    # Each rashi covers 2.25 nakshatras
    rashi_idx = int(nakshatra_idx / 2.25) % 12
    return rashis[rashi_idx]


def _karma_from_lord(lord: str) -> List[str]:
    """Generate karmic indicators from nakshatra lord."""
    karma_map = {
        "Ketu":    ["past-life spiritual mastery", "karmic completion", "gift of natural intuition"],
        "Shukra":  ["karma around love and beauty", "Venusian life themes", "relationship as growth path"],
        "Surya":   ["karma around authority and recognition", "solar dharma", "leadership lessons"],
        "Chandra": ["karma around nurturing and emotional patterns", "lunar cycles", "family karma"],
        "Mangala": ["karma around courage and conflict", "Martian action lessons", "property and siblings"],
        "Rahu":    ["karma around ambition and innovation", "foreign or unconventional path", "obsessive patterns"],
        "Guru":    ["karma around wisdom and expansion", "dharmic teaching", "children and blessings"],
        "Shani":   ["karma around discipline and service", "Saturn's long lessons", "karmic work in this life"],
        "Budha":   ["karma around communication and commerce", "Mercury's learning", "intellectual development"],
    }
    return karma_map.get(lord, ["general karmic development in this lifetime"])


def _dharma_from_atmakaraka(atmakaraka: str) -> str:
    """Generate dharma indicator from Atmakaraka planet."""
    dharma_map = {
        "Surya":   "Your soul's deepest purpose is to express authentic authority and illuminate others. Leadership through integrity is the dharmic calling.",
        "Chandra": "Your soul's purpose is to nurture, receive, and reflect. Emotional wisdom and compassionate care are the dharmic gifts.",
        "Mangala": "Your soul's purpose is to act courageously and protect. Taking purposeful initiative for the greater good is the dharmic path.",
        "Budha":   "Your soul's purpose is to communicate, teach, and connect. The dharma is served through the intelligent exchange of knowledge.",
        "Guru":    "Your soul's purpose is to expand, teach wisdom, and bless others. The dharma is philosophical, educational, and spiritually oriented.",
        "Shukra":  "Your soul's purpose is to create beauty, harmony, and love. The dharmic gift is aesthetic and relational.",
        "Shani":   "Your soul's purpose is to serve, discipline, and endure. The dharma involves karmic service and patient mastery.",
        "Rahu":    "Your soul's purpose involves innovation, expansion beyond convention, and pioneering into new territory.",
        "Ketu":    "Your soul's purpose is oriented toward liberation and spiritual depth. Past-life mastery creates natural gifts in this life.",
    }
    return dharma_map.get(
        atmakaraka,
        "Your soul carries a unique dharmic path that unfolds through lived experience."
    )


def get_dosha_domain_reading(
    dosha: AyurvedicDosha,
    domain: Domain,
) -> Optional[str]:
    """
    Get the Ayurvedic dosha reading for a specific domain.
    Used by synthesiser for health and character domains.
    """
    return _DOSHA_PROFILES.get(dosha.value, {}).get(domain.value)


def get_planet_domain_signal(
    planet: str,
    domain: Domain,
) -> Optional[str]:
    """
    Get the Navagraha planet's signal for a specific domain.
    Used by synthesiser to add Vedic layer to domain synthesis.
    """
    return _PLANET_DOMAIN_SIGNALS.get(planet, {}).get(domain.value)
