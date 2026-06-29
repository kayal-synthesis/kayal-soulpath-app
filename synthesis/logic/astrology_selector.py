"""
Logic Engine — Astrology Selector
===================================
Determines which astrology and numerology systems to use
based on cultural origin detected from birth location,
country code, and name pattern analysis.

Selection logic:
    Primary determinant  — Birth country / cultural region
    Secondary refinement — Name script and pattern analysis
    Tertiary signal      — Present location (timing layer only)

Output:
    CulturalProfile    — which systems to use and at what weight
    AstrologyWeighting — precise weights for the collector

v2.0.0 additions:
    - UnionSystemConfig dataclass — Union Blueprint system configuration
    - _SYNASTRY_SYSTEM_RULES — best synastry system per cultural origin pair
    - _select_synastry_system() — picks synastry system for two partners
    - select_union_systems() — Union Blueprint entry point:
        runs select_systems() for each partner independently,
        determines synastry system, sets pct_output_mode=True (% directive),
        enables composite chart, returns UnionSystemConfig
    - select_reading_config() — dispatcher: routes to select_systems() or
        select_union_systems() based on tool_type
    - pct_output_mode: ALWAYS True for Union Blueprint — enforces the
        compatibility % output directive throughout the narrator chain

The user never sees this logic. They receive a reading
calibrated to their cultural context automatically.

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from .models import (
    BirthData,
    CulturalOrigin,
    CulturalProfile,
    AstrologySystem,
    AstrologyWeighting,
    NumerologySystem,
    GeoLocation,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Country → Cultural origin mapping (v1.0.0, preserved intact)
# ISO 3166-1 alpha-2 country codes
# ---------------------------------------------------------------------------

_COUNTRY_TO_ORIGIN: Dict[str, CulturalOrigin] = {
    # South Asia
    "IN": CulturalOrigin.SOUTH_ASIAN, "PK": CulturalOrigin.SOUTH_ASIAN,
    "BD": CulturalOrigin.SOUTH_ASIAN, "LK": CulturalOrigin.SOUTH_ASIAN,
    "NP": CulturalOrigin.SOUTH_ASIAN, "BT": CulturalOrigin.SOUTH_ASIAN,
    "MV": CulturalOrigin.SOUTH_ASIAN,
    # East Asia
    "CN": CulturalOrigin.EAST_ASIAN, "TW": CulturalOrigin.EAST_ASIAN,
    "HK": CulturalOrigin.EAST_ASIAN, "JP": CulturalOrigin.EAST_ASIAN,
    "KR": CulturalOrigin.EAST_ASIAN, "KP": CulturalOrigin.EAST_ASIAN,
    "MN": CulturalOrigin.EAST_ASIAN,
    # Southeast Asia
    "MY": CulturalOrigin.SOUTHEAST_ASIAN, "SG": CulturalOrigin.SOUTHEAST_ASIAN,
    "ID": CulturalOrigin.SOUTHEAST_ASIAN, "PH": CulturalOrigin.SOUTHEAST_ASIAN,
    "TH": CulturalOrigin.SOUTHEAST_ASIAN, "VN": CulturalOrigin.SOUTHEAST_ASIAN,
    "MM": CulturalOrigin.SOUTHEAST_ASIAN, "KH": CulturalOrigin.SOUTHEAST_ASIAN,
    "LA": CulturalOrigin.SOUTHEAST_ASIAN, "BN": CulturalOrigin.SOUTHEAST_ASIAN,
    "TL": CulturalOrigin.SOUTHEAST_ASIAN,
    # Middle East
    "SA": CulturalOrigin.MIDDLE_EASTERN, "AE": CulturalOrigin.MIDDLE_EASTERN,
    "QA": CulturalOrigin.MIDDLE_EASTERN, "KW": CulturalOrigin.MIDDLE_EASTERN,
    "BH": CulturalOrigin.MIDDLE_EASTERN, "OM": CulturalOrigin.MIDDLE_EASTERN,
    "YE": CulturalOrigin.MIDDLE_EASTERN, "IQ": CulturalOrigin.MIDDLE_EASTERN,
    "IR": CulturalOrigin.MIDDLE_EASTERN, "SY": CulturalOrigin.MIDDLE_EASTERN,
    "LB": CulturalOrigin.MIDDLE_EASTERN, "JO": CulturalOrigin.MIDDLE_EASTERN,
    "IL": CulturalOrigin.MIDDLE_EASTERN, "PS": CulturalOrigin.MIDDLE_EASTERN,
    "TR": CulturalOrigin.MIDDLE_EASTERN,
    # North Africa
    "EG": CulturalOrigin.NORTH_AFRICAN, "MA": CulturalOrigin.NORTH_AFRICAN,
    "DZ": CulturalOrigin.NORTH_AFRICAN, "TN": CulturalOrigin.NORTH_AFRICAN,
    "LY": CulturalOrigin.NORTH_AFRICAN, "SD": CulturalOrigin.NORTH_AFRICAN,
    # Sub-Saharan Africa
    "NG": CulturalOrigin.SUB_SAHARAN, "GH": CulturalOrigin.SUB_SAHARAN,
    "KE": CulturalOrigin.SUB_SAHARAN, "TZ": CulturalOrigin.SUB_SAHARAN,
    "UG": CulturalOrigin.SUB_SAHARAN, "ET": CulturalOrigin.SUB_SAHARAN,
    "ZA": CulturalOrigin.SUB_SAHARAN, "SN": CulturalOrigin.SUB_SAHARAN,
    "CI": CulturalOrigin.SUB_SAHARAN, "CM": CulturalOrigin.SUB_SAHARAN,
    "ZM": CulturalOrigin.SUB_SAHARAN, "ZW": CulturalOrigin.SUB_SAHARAN,
    "RW": CulturalOrigin.SUB_SAHARAN, "AO": CulturalOrigin.SUB_SAHARAN,
    "MZ": CulturalOrigin.SUB_SAHARAN, "MG": CulturalOrigin.SUB_SAHARAN,
    "SL": CulturalOrigin.SUB_SAHARAN,
    # Eastern Europe
    "RU": CulturalOrigin.EASTERN_EUROPEAN, "UA": CulturalOrigin.EASTERN_EUROPEAN,
    "PL": CulturalOrigin.EASTERN_EUROPEAN, "RO": CulturalOrigin.EASTERN_EUROPEAN,
    "CZ": CulturalOrigin.EASTERN_EUROPEAN, "HU": CulturalOrigin.EASTERN_EUROPEAN,
    "BG": CulturalOrigin.EASTERN_EUROPEAN, "RS": CulturalOrigin.EASTERN_EUROPEAN,
    "HR": CulturalOrigin.EASTERN_EUROPEAN, "SK": CulturalOrigin.EASTERN_EUROPEAN,
    "SI": CulturalOrigin.EASTERN_EUROPEAN, "BY": CulturalOrigin.EASTERN_EUROPEAN,
    "GR": CulturalOrigin.EASTERN_EUROPEAN,
    # Latin America
    "BR": CulturalOrigin.LATIN_AMERICAN, "MX": CulturalOrigin.LATIN_AMERICAN,
    "AR": CulturalOrigin.LATIN_AMERICAN, "CO": CulturalOrigin.LATIN_AMERICAN,
    "CL": CulturalOrigin.LATIN_AMERICAN, "PE": CulturalOrigin.LATIN_AMERICAN,
    "VE": CulturalOrigin.LATIN_AMERICAN, "EC": CulturalOrigin.LATIN_AMERICAN,
    "BO": CulturalOrigin.LATIN_AMERICAN, "PY": CulturalOrigin.LATIN_AMERICAN,
    "UY": CulturalOrigin.LATIN_AMERICAN, "GT": CulturalOrigin.LATIN_AMERICAN,
    "CU": CulturalOrigin.LATIN_AMERICAN, "DO": CulturalOrigin.LATIN_AMERICAN,
    # Caribbean
    "JM": CulturalOrigin.CARIBBEAN, "TT": CulturalOrigin.CARIBBEAN,
    "HT": CulturalOrigin.CARIBBEAN,  "BB": CulturalOrigin.CARIBBEAN,
    "GD": CulturalOrigin.CARIBBEAN,  "LC": CulturalOrigin.CARIBBEAN,
    # Western
    "US": CulturalOrigin.WESTERN, "GB": CulturalOrigin.WESTERN,
    "CA": CulturalOrigin.WESTERN, "AU": CulturalOrigin.WESTERN,
    "NZ": CulturalOrigin.WESTERN, "IE": CulturalOrigin.WESTERN,
    "DE": CulturalOrigin.WESTERN, "FR": CulturalOrigin.WESTERN,
    "IT": CulturalOrigin.WESTERN, "ES": CulturalOrigin.WESTERN,
    "PT": CulturalOrigin.WESTERN, "NL": CulturalOrigin.WESTERN,
    "BE": CulturalOrigin.WESTERN, "CH": CulturalOrigin.WESTERN,
    "AT": CulturalOrigin.WESTERN, "SE": CulturalOrigin.WESTERN,
    "NO": CulturalOrigin.WESTERN, "DK": CulturalOrigin.WESTERN,
    "FI": CulturalOrigin.WESTERN,
}


# ---------------------------------------------------------------------------
# Name analysis patterns (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

_ARABIC_RANGE      = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+')
_DEVANAGARI_RANGE  = re.compile(r'[\u0900-\u097F]+')
_CJK_RANGE         = re.compile(r'[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]+')
_TAMIL_RANGE       = re.compile(r'[\u0B80-\u0BFF]+')

_SOUTH_ASIAN_PATTERNS = re.compile(
    r'\b(kumar|singh|sharma|patel|gupta|das|devi|rao|reddy|nair|'
    r'krishna|ram|lal|bhat|kaur|murthy|pillai|iyer|menon|'
    r'hassan|hussain|rahman|ali|khan|begum|sultana)\b', re.IGNORECASE)

_ARABIC_PATTERNS = re.compile(
    r'\b(al|el|bin|binti|abu|abd|abdul|mohammad|mohammed|muhammad|'
    r'ahmed|omar|ibrahim|fatima|aisha|hassan|ali|khalid|'
    r'abdallah|hamza|yusuf|zahra|maryam|layla)\b', re.IGNORECASE)

_EAST_ASIAN_PATTERNS = re.compile(
    r'\b(chen|wang|li|zhang|liu|yang|huang|zhao|wu|zhou|'
    r'kim|lee|park|choi|jung|nakamura|tanaka|suzuki|watanabe|'
    r'nguyen|tran|pham|le|hoang)\b', re.IGNORECASE)

_SUB_SAHARAN_PATTERNS = re.compile(
    r'\b(ade|ola|bayo|tunde|seun|biodun|chukwu|emeka|amara|'
    r'kofi|kwame|abena|ama|nana|chioma|ngozi|kemi|funmi)\b', re.IGNORECASE)


# ---------------------------------------------------------------------------
# System selection rules per cultural origin (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

_ORIGIN_RULES: Dict[CulturalOrigin, Dict] = {
    CulturalOrigin.SOUTH_ASIAN: {
        "astro_primary": AstrologySystem.VEDIC, "astro_secondary": AstrologySystem.WESTERN,
        "astro_weight": 0.70, "num_primary": NumerologySystem.VEDIC,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.65,
        "use_ba_zi": False, "use_jyotish": True, "use_western": True,
        "ayanamsa": "lahiri", "house_system": "whole_sign",
    },
    CulturalOrigin.EAST_ASIAN: {
        "astro_primary": AstrologySystem.CHINESE, "astro_secondary": AstrologySystem.WESTERN,
        "astro_weight": 0.65, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.60,
        "use_ba_zi": True, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.SOUTHEAST_ASIAN: {
        "astro_primary": AstrologySystem.HYBRID, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.60, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.60,
        "use_ba_zi": True, "use_jyotish": True, "use_western": True,
        "ayanamsa": "lahiri", "house_system": "whole_sign",
    },
    CulturalOrigin.MIDDLE_EASTERN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.65, "num_primary": NumerologySystem.CHALDEAN,
        "num_secondary": NumerologySystem.PYTHAGOREAN, "num_weight": 0.70,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "whole_sign",
    },
    CulturalOrigin.NORTH_AFRICAN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.65, "num_primary": NumerologySystem.CHALDEAN,
        "num_secondary": NumerologySystem.PYTHAGOREAN, "num_weight": 0.65,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.SUB_SAHARAN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": None,
        "astro_weight": 0.75, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.65,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.EASTERN_EUROPEAN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.70, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.65,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.LATIN_AMERICAN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": None,
        "astro_weight": 0.80, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.70,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.CARIBBEAN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": None,
        "astro_weight": 0.80, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.70,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.WESTERN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.70, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.70,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
    CulturalOrigin.UNKNOWN: {
        "astro_primary": AstrologySystem.WESTERN, "astro_secondary": AstrologySystem.VEDIC,
        "astro_weight": 0.65, "num_primary": NumerologySystem.PYTHAGOREAN,
        "num_secondary": NumerologySystem.CHALDEAN, "num_weight": 0.65,
        "use_ba_zi": False, "use_jyotish": False, "use_western": True,
        "ayanamsa": "none", "house_system": "placidus",
    },
}


# ---------------------------------------------------------------------------
# v2.0.0 — Synastry system selection rules
#
# Which astrology system to use for cross-chart synastry computation
# given the cultural origins of the two partners.
#
# Design rationale:
#   - Western tropical is the industry standard for synastry
#   - Vedic sidereal used when BOTH partners have South/SE Asian cultural context
#     (Jyotish kundali matching is the traditional method there)
#   - Mixed origins default to Western (most universally legible output)
# ---------------------------------------------------------------------------

_VEDIC_ORIGIN_SET = {CulturalOrigin.SOUTH_ASIAN, CulturalOrigin.SOUTHEAST_ASIAN}

_SYNASTRY_SYSTEM_RULES: Dict[Tuple[str, str], AstrologySystem] = {
    # Both South Asian → Vedic synastry (Jyotish kundali matching)
    ("south_asian",    "south_asian"):    AstrologySystem.VEDIC,
    ("south_asian",    "southeast_asian"):AstrologySystem.VEDIC,
    ("southeast_asian","south_asian"):    AstrologySystem.VEDIC,
    ("southeast_asian","southeast_asian"):AstrologySystem.HYBRID,
    # East Asian pair → Chinese astrology synastry (BaZi compatibility)
    ("east_asian",     "east_asian"):     AstrologySystem.CHINESE,
    # All other combinations → Western tropical (universal standard)
}

_SYNASTRY_DEFAULT_SYSTEM = AstrologySystem.WESTERN  # Default for all unspecified pairs


# ---------------------------------------------------------------------------
# v2.0.0 — Union Blueprint configuration dataclass
# ---------------------------------------------------------------------------

@dataclass
class UnionSystemConfig:
    """
    Complete system configuration for the Union Blueprint ($397 tool).

    Contains individual profiles for both partners AND the synastry
    computation configuration that applies to the cross-chart analysis.

    pct_output_mode is ALWAYS True for Union Blueprint — this is the flag
    the narrator checks to enforce the compatibility % output directive.
    All compatibility verdicts must be expressed as percentages:
        "Love compatibility: 74%" — ALWAYS
        "This couple is compatible" — NEVER
    """
    # Person A (primary — the purchaser of the reading)
    partner_a_profile:   CulturalProfile
    partner_a_weighting: AstrologyWeighting

    # Person B (secondary — the partner)
    partner_b_profile:   CulturalProfile
    partner_b_weighting: AstrologyWeighting

    # Synastry computation configuration
    synastry_system:     AstrologySystem    # Which system to use for cross-chart
    synastry_house_system: str              # "placidus" or "whole_sign"
    synastry_ayanamsa:   str               # "lahiri" or "none"
    composite_enabled:   bool              # Whether to compute composite chart

    # Output directive — ALWAYS True for Union Blueprint
    pct_output_mode:     bool = True       # % output enforced — no binary verdicts

    # Metadata
    dominant_cultural_origin: CulturalOrigin = CulturalOrigin.UNKNOWN
    reading_label_a:     str = "Person A"
    reading_label_b:     str = "Person B"


# ---------------------------------------------------------------------------
# v1.0.0 — Core detection functions (preserved intact)
# ---------------------------------------------------------------------------

def _detect_origin_from_country(country_code: str) -> Tuple[CulturalOrigin, float]:
    code = country_code.upper().strip()
    origin = _COUNTRY_TO_ORIGIN.get(code, CulturalOrigin.UNKNOWN)
    return origin, (0.90 if origin != CulturalOrigin.UNKNOWN else 0.30)


def _detect_origin_from_name(full_name: str) -> Tuple[Optional[CulturalOrigin], float]:
    if not full_name: return None, 0.0
    if _ARABIC_RANGE.search(full_name):     return CulturalOrigin.MIDDLE_EASTERN, 0.85
    if _DEVANAGARI_RANGE.search(full_name): return CulturalOrigin.SOUTH_ASIAN,    0.90
    if _CJK_RANGE.search(full_name):        return CulturalOrigin.EAST_ASIAN,     0.90
    if _TAMIL_RANGE.search(full_name):      return CulturalOrigin.SOUTH_ASIAN,    0.85
    if _SOUTH_ASIAN_PATTERNS.search(full_name): return CulturalOrigin.SOUTH_ASIAN,    0.70
    if _ARABIC_PATTERNS.search(full_name):      return CulturalOrigin.MIDDLE_EASTERN,  0.70
    if _EAST_ASIAN_PATTERNS.search(full_name):  return CulturalOrigin.EAST_ASIAN,      0.65
    if _SUB_SAHARAN_PATTERNS.search(full_name): return CulturalOrigin.SUB_SAHARAN,     0.65
    return None, 0.0


def _reconcile_origins(
    country_origin: CulturalOrigin, country_conf: float,
    name_origin: Optional[CulturalOrigin], name_conf: float,
) -> Tuple[CulturalOrigin, float]:
    if name_origin is None: return country_origin, country_conf
    if name_conf >= 0.85 and name_origin != country_origin:
        return name_origin, min(0.95, (country_conf + name_conf) / 2 + 0.05)
    if name_origin == country_origin:
        return country_origin, min(0.98, max(country_conf, name_conf) + 0.05)
    if name_conf >= 0.70 and country_conf >= 0.80:
        return country_origin, country_conf * 0.85
    return country_origin, country_conf


def _get_remedy_tradition(astro_primary: AstrologySystem) -> str:
    return {"vedic":"vedic","chinese":"chinese","western":"western","hybrid":"universal"}.get(
        astro_primary.value if hasattr(astro_primary,"value") else str(astro_primary), "universal"
    )


# ---------------------------------------------------------------------------
# v1.0.0 — Main individual system selector (preserved intact)
# ---------------------------------------------------------------------------

def select_systems(birth_data: BirthData) -> Tuple[CulturalProfile, AstrologyWeighting]:
    """
    Main entry point for Individual Blueprint system selection.

    Args:
        birth_data: BirthData with full_name, birth_place, present_location

    Returns:
        (CulturalProfile, AstrologyWeighting)
    """
    country_code = birth_data.birth_place.country_code
    country_origin, country_conf = _detect_origin_from_country(country_code)
    name_origin, name_conf       = _detect_origin_from_name(birth_data.full_name)
    final_origin, final_conf     = _reconcile_origins(country_origin, country_conf, name_origin, name_conf)
    rules = _ORIGIN_RULES.get(final_origin, _ORIGIN_RULES[CulturalOrigin.UNKNOWN])
    remedy_tradition = _get_remedy_tradition(rules["astro_primary"])

    profile = CulturalProfile(
        origin               = final_origin,
        country_code         = country_code,
        astrology_primary    = rules["astro_primary"],
        astrology_secondary  = rules.get("astro_secondary"),
        astrology_weight     = rules["astro_weight"],
        numerology_primary   = rules["num_primary"],
        numerology_secondary = rules.get("num_secondary"),
        numerology_weight    = rules["num_weight"],
        use_ba_zi            = rules["use_ba_zi"],
        use_jyotish          = rules["use_jyotish"],
        use_western          = rules["use_western"],
        confidence           = final_conf,
        remedy_tradition     = remedy_tradition,
    )

    secondary_weight = (1.0 - rules["astro_weight"]) if rules.get("astro_secondary") else 0.0
    weighting = AstrologyWeighting(
        primary_system   = rules["astro_primary"],
        secondary_system = rules.get("astro_secondary"),
        primary_weight   = rules["astro_weight"],
        secondary_weight = round(secondary_weight, 3),
        hour_uncertain   = not birth_data.hour_known,
        ayanamsa         = rules["ayanamsa"],
        house_system     = rules["house_system"],
        cultural_origin  = final_origin,
    )

    logger.info("AstrologySelector.select_systems completed", extra={
        "country_code": country_code, "country_origin": country_origin.value,
        "name_origin": name_origin.value if name_origin else "none",
        "final_origin": final_origin.value, "confidence": round(final_conf, 3),
        "astro_primary": weighting.primary_system.value,
        "astro_secondary": weighting.secondary_system.value if weighting.secondary_system else "none",
        "num_primary": profile.numerology_primary.value,
        "hour_uncertain": weighting.hour_uncertain, "remedy_tradition": remedy_tradition,
    })

    return profile, weighting


# ---------------------------------------------------------------------------
# v1.0.0 — Present location modifier (preserved intact)
# ---------------------------------------------------------------------------

def apply_present_location_modifier(
    weighting: AstrologyWeighting,
    present_location: GeoLocation,
    birth_location: GeoLocation,
) -> Dict[str, str]:
    """
    Determine if present location meaningfully differs from birth location.
    Returns timing domain modifiers for the Logic Engine.
    Present location does NOT change the primary astrology system —
    only adds locality timing signals for the TIMING domain.
    """
    modifiers = {}
    birth_country   = birth_location.country_code.upper()
    present_country = present_location.country_code.upper()

    if birth_country != present_country:
        modifiers["relocation_active"] = "true"
        modifiers["relocation_note"] = (
            f"Currently located in {present_location.country}, "
            f"born in {birth_location.country}. "
            "Astrocartography and locality chart are relevant for timing signals."
        )
        modifiers["timezone_note"] = (
            f"Present timezone ({present_location.timezone}) used for "
            "current Personal Year/Month/Day calculations."
        )
    else:
        modifiers["relocation_active"] = "false"

    present_origin, _ = _detect_origin_from_country(present_country)
    birth_origin = weighting.cultural_origin

    if present_origin != birth_origin and present_origin != CulturalOrigin.UNKNOWN:
        modifiers["cultural_relocation"] = (
            f"Living in a {present_origin.value} cultural context. "
            "Consider both origin and present cultural astrological influences."
        )

    return modifiers


# ---------------------------------------------------------------------------
# v2.0.0 — Synastry system selector
# ---------------------------------------------------------------------------

def _select_synastry_system(
    origin_a: CulturalOrigin,
    origin_b: CulturalOrigin,
) -> Tuple[AstrologySystem, str, str]:
    """
    Pick the most appropriate astrology system for synastry computation
    given the cultural origins of both partners.

    Returns (synastry_system, house_system, ayanamsa).

    Design rationale:
    - Western tropical (Placidus): industry standard for cross-chart synastry;
      most research literature (Hand, Townley, Greene) uses this system
    - Vedic sidereal (Whole Sign): traditional Jyotish kundali matching
      for South Asian couples; deeper cultural resonance
    - Chinese BaZi: East Asian couple compatibility; Day Master comparison
    - Hybrid: Southeast Asian mixed-origin couples
    """
    key = (origin_a.value, origin_b.value)
    system = _SYNASTRY_SYSTEM_RULES.get(key, _SYNASTRY_DEFAULT_SYSTEM)

    # House system and ayanamsa determined by synastry system
    if system == AstrologySystem.VEDIC:
        house_system = "whole_sign"
        ayanamsa     = "lahiri"
    elif system == AstrologySystem.CHINESE:
        house_system = "placidus"    # Western Placidus used alongside BaZi
        ayanamsa     = "none"
    elif system == AstrologySystem.HYBRID:
        house_system = "whole_sign"
        ayanamsa     = "lahiri"
    else:
        house_system = "placidus"   # Western tropical default
        ayanamsa     = "none"

    logger.debug(
        "Synastry system selected",
        extra={
            "origin_a": origin_a.value, "origin_b": origin_b.value,
            "synastry_system": system.value, "house_system": house_system,
        },
    )

    return system, house_system, ayanamsa


# ---------------------------------------------------------------------------
# v2.0.0 — Union Blueprint system selector (main entry point for $397 tool)
# ---------------------------------------------------------------------------

def select_union_systems(
    birth_data_a: BirthData,
    birth_data_b: BirthData,
    reading_label_a: str = "Person A",
    reading_label_b: str = "Person B",
) -> UnionSystemConfig:
    """
    Union Blueprint system selector ($397 tool).

    Runs select_systems() for each partner independently, then determines
    the optimal synastry system based on their combined cultural origins.

    Key design decisions:
    1. Each partner gets their own CulturalProfile for individual natal chart
    2. The synastry system is chosen to honour both cultural contexts
    3. pct_output_mode is ALWAYS True — the % output directive is non-negotiable
       for all Union Blueprint compatibility output
    4. composite_enabled is ALWAYS True for Union Blueprint

    % output directive:
        All compatibility verdicts in the Union Blueprint are expressed as
        percentages. This config value is checked by the narrator to enforce:
        "Love compatibility: 74%" — ALWAYS
        "This couple is compatible" — NEVER

    Args:
        birth_data_a:    Birth data for Person A (primary — the client)
        birth_data_b:    Birth data for Person B (the partner)
        reading_label_a: Display label for Person A (e.g. their first name)
        reading_label_b: Display label for Person B

    Returns:
        UnionSystemConfig with all individual and synastry configuration
    """
    # Individual system selection for each partner
    profile_a, weighting_a = select_systems(birth_data_a)
    profile_b, weighting_b = select_systems(birth_data_b)

    # Synastry system: determined by combined origins
    synastry_system, synastry_house, synastry_ayanamsa = _select_synastry_system(
        profile_a.origin, profile_b.origin
    )

    # Dominant origin: Person A's origin drives the overall reading context
    dominant_origin = profile_a.origin

    logger.info(
        "AstrologySelector.select_union_systems completed",
        extra={
            "origin_a":       profile_a.origin.value,
            "origin_b":       profile_b.origin.value,
            "astro_a":        weighting_a.primary_system.value,
            "astro_b":        weighting_b.primary_system.value,
            "synastry_system":synastry_system.value,
            "house_system":   synastry_house,
            "ayanamsa":       synastry_ayanamsa,
            "pct_output_mode":True,  # Always
            "composite":      True,  # Always
            "label_a":        reading_label_a,
            "label_b":        reading_label_b,
        },
    )

    return UnionSystemConfig(
        partner_a_profile     = profile_a,
        partner_a_weighting   = weighting_a,
        partner_b_profile     = profile_b,
        partner_b_weighting   = weighting_b,
        synastry_system       = synastry_system,
        synastry_house_system = synastry_house,
        synastry_ayanamsa     = synastry_ayanamsa,
        composite_enabled     = True,    # Always enabled for Union Blueprint
        pct_output_mode       = True,    # % directive — always enforced
        dominant_cultural_origin = dominant_origin,
        reading_label_a       = reading_label_a,
        reading_label_b       = reading_label_b,
    )


# ---------------------------------------------------------------------------
# v2.0.0 — Reading config dispatcher
# ---------------------------------------------------------------------------

def select_reading_config(
    tool_type:     str,             # "individual_blueprint" or "union_blueprint"
    birth_data_a:  BirthData,
    birth_data_b:  Optional[BirthData] = None,
    label_a:       str = "Person A",
    label_b:       str = "Person B",
) -> Tuple:
    """
    Main dispatcher for reading configuration.

    Routes to select_systems() for Individual Blueprint or
    select_union_systems() for Union Blueprint.

    Args:
        tool_type:   "individual_blueprint" ($297) or "union_blueprint" ($397)
        birth_data_a: Birth data for Person A (always required)
        birth_data_b: Birth data for Person B (required for Union Blueprint)
        label_a:     Display label for Person A
        label_b:     Display label for Person B

    Returns:
        Individual Blueprint: (CulturalProfile, AstrologyWeighting)
        Union Blueprint:      UnionSystemConfig

    Raises:
        ValueError: if Union Blueprint requested without birth_data_b
    """
    if tool_type == "union_blueprint":
        if birth_data_b is None:
            raise ValueError(
                "Union Blueprint requires birth data for both partners. "
                "birth_data_b is required when tool_type='union_blueprint'."
            )
        return (select_union_systems(birth_data_a, birth_data_b, label_a, label_b),)

    else:
        # Individual Blueprint (default)
        return select_systems(birth_data_a)
