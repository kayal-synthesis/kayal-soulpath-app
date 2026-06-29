"""
Spirit World Engine — KAYAL Synthesis Platform
===============================================
Spiritual dimension analysis for the Individual Blueprint.

Position in the pipeline:
    Natal positions (astrology_engine)
    Numerology data (numerology_engine)
    Palm spiritual markers (palm_engine / palm_reader, optional)
    Face spiritual markers (face_engine / face_reader, optional)
         ↓
    SpiritEngine.compute()
         ↓
    SpiritProfile  →  Logic Layer  →  LLM Narrator  →  Blueprint PDF

Responsibility:
    Identify and interpret structural spiritual indicators from a person's
    natal chart, numerological blueprint, and biometric features.

    Produces a SpiritProfile covering eight assessment categories:
    A. Psychic Openness           — sensitivity to non-physical dimensions
    B. Spirit Attachments         — ancestral, karmic, and energetic connections
    C. Ancestral Burdens          — inherited karmic patterns needing resolution
    D. Past-Life Indicators       — carried patterns from previous incarnations
    E. Spiritual Contracts        — soul-level agreements for this lifetime
    F. Unresolved Vows            — active vows from prior lives affecting current
    G. Ancestral Blessings        — inherited spiritual gifts and karmic credit
    H. Home Spiritual Condition   — the spiritual atmosphere of the living space

Design principles:
    - Grounded: all indicators derive from established astrological, Vedic,
      and numerological systems — not arbitrary or invented
    - Non-sensationalist: every "negative" indicator is framed as a growth
      opportunity or healing invitation, never as a threat or curse
    - Remediable: every burden identified carries a corresponding remedy
    - Deterministic: same inputs → same output always
    - Graceful fallback: functions with astrology only; numerology and
      biometric inputs are optional enhancements

Knowledge sources:
    Komilla Sutton   — "The Lunar Nodes: Crisis and Redemption" (Vedic)
    Barbara Hand Clow — "Chiron: Rainbow Bridge" (karmic healing)
    Howard Sasportas — "The Twelve Houses" (12th house tradition)
    Robert Hand      — "Planets in Transit"
    Bepin Behari     — Vedic nakshatra and spiritual significance
    Pythagoras       — Numerological karmic debt tradition
    Eckhart Tolle    — Framework for ancestral healing (non-astrological)
    Ancestral healing traditions: Indigenous, West African Ifa, Vedic Pitru Dosh

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Optional astrology engine integration
try:
    from .astrology_engine import (
        _find_planet_house,
        _degree_to_sign,
        _DIGNIFIED_SIGNS,
        _DEBILITATED_SIGNS,
        _SIGNS,
        SWE_AVAILABLE,
    )
    ASTRO_AVAILABLE = True
except ImportError:
    ASTRO_AVAILABLE = False
    SWE_AVAILABLE   = False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Signs with strong spiritual/psychic resonance
_PSYCHIC_SIGNS = {"Pisces", "Cancer", "Scorpio", "Capricorn"}
_SPIRITUAL_SIGNS = {"Sagittarius", "Aquarius", "Pisces", "Virgo"}

# Houses with spirit world significance
_SPIRIT_HOUSES = {12, 8, 4}         # Hidden realms, death/regeneration, roots
_DHARMA_HOUSES = {1, 5, 9}          # Identity, creativity, philosophy
_MOKSHA_HOUSES = {4, 8, 12}         # Liberation houses (Moksha trikona in Jyotish)

# Nakshatras with spirit world significance
_SPIRIT_NAKSHATRAS = {
    "Ashwini":     "Healing and transition — gateway between worlds. Ashwini Kumars are divine physicians.",
    "Magha":       "Ancestors (Pitru). Strong ancestral connection — the Pitru Devatas reside here.",
    "Jyeshtha":    "Divine protection and spiritual authority. Connection to protective spirit guardians.",
    "Revati":      "Completion and compassion. Final nakshatra — the bridge between cycles.",
    "Ashlesha":    "Serpent wisdom and kundalini energy. Deep unconscious and spirit communication.",
    "Shatabhisha": "The hundred healers. Spiritual healing gifts and hidden knowledge.",
    "Purva Bhadrapada": "The burning pair — purification through fire. Spiritual intensity.",
    "Uttara Bhadrapada": "The star of the universe. Deep wisdom and ancestral lineage strength.",
    "Ardra":       "Shiva's storm — transformation through dissolution. Spirit world access.",
    "Mula":        "The root — Nirrti, goddess of dissolution. Ancestral roots and karmic unbinding.",
}

# Karmic debt numbers (numerology)
_KARMIC_DEBT_NUMBERS = {
    13: "Transformation karmic debt — past life misuse of creative energy. Must build through sustained effort.",
    14: "Freedom karmic debt — past life abuse of freedom. Must cultivate discipline and moderation.",
    16: "Ego dissolution karmic debt — past life spiritual pride. Must surrender to higher guidance.",
    19: "Independence karmic debt — past life isolation and selfishness. Must learn interdependence.",
}

# Life Path numbers with elevated spiritual sensitivity
_HIGH_SPIRIT_LP = {
    7:  "The spiritual seeker — naturally tunes to higher dimensions. The contemplative and mystic.",
    11: "The master intuitive — psychic channel and spiritual messenger. Thin veil between worlds.",
    22: "The master builder — spiritual-material bridge. High responsibility spiritual contract.",
    33: "The master teacher — compassion at cosmic scale. The sacrificial spiritual teacher.",
}

# Signs associated with unresolved vow types
_VOW_INDICATORS: Dict[str, Dict] = {
    "celibacy_service": {
        "planets": ["Saturn","Neptune"],
        "house":   12,
        "aspect":  "conjunction",
        "description": "Vow of celibacy or devoted service from a prior religious life still active in the energy field.",
    },
    "poverty_renunciation": {
        "planets": ["Saturn","Venus"],
        "house":   12,
        "aspect":  "conjunction",
        "description": "Vow of poverty or renunciation of material comfort — may manifest as recurring financial blocks.",
    },
    "silence_isolation": {
        "planets": ["Saturn","Mercury"],
        "house":   12,
        "aspect":  "conjunction",
        "description": "Vow of silence or isolation — may manifest as communication blocks or preference for solitude.",
    },
    "sacrifice_martyrdom": {
        "planets": ["Neptune","Sun"],
        "house":   12,
        "aspect":  "square_opposition",
        "description": "Vow of sacrifice or martyrdom — may manifest as self-negation or chronic self-sacrifice.",
    },
}

# Planet-specific spiritual roles
_PLANET_SPIRIT_ROLE: Dict[str, str] = {
    "Neptune": "psychic_bridge",      # bridge to non-ordinary reality
    "Pluto":   "death_regeneration",  # death, underworld, shadow
    "Rahu":    "karmic_hunger",       # dharmic direction, obsessive pull
    "Ketu":    "past_life_memory",    # past life imprint, spiritual detachment
    "Saturn":  "ancestral_karma",     # ancestral duty, time, limitation
    "Moon":    "psychic_receptor",    # intuition, ancestral memory, fluid perception
    "Jupiter": "dharmic_blessing",    # spiritual teacher, blessings, expansion
    "Uranus":  "awakening_channel",   # sudden awakening, collective spiritual channel
}

# Ancestry-relevant signs by modality
_WATER_SIGNS = {"Cancer", "Scorpio", "Pisces"}
_EARTH_SIGNS  = {"Taurus", "Virgo", "Capricorn"}


# ---------------------------------------------------------------------------
# Magnitude enum (mirrors other engines)
# ---------------------------------------------------------------------------

class Magnitude(str, Enum):
    HIGH     = "high"
    MODERATE = "moderate"
    LOW      = "low"
    UNCLEAR  = "unclear"


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SpiritAttachment:
    """
    A spirit-world connection identified in the natal/biometric profile.
    NOT a diagnosis of 'possession' — these are energetic connections
    that can be positive (ancestral blessing) or require clearing (burden).
    Always includes a note on appropriate action.
    """
    attachment_type:  str       # "ancestral_connection", "karmic_contract", "place_energy",
                                # "past_self_resonance", "blessing", "burden"
    source:           str       # "maternal_lineage", "paternal_lineage", "past_life",
                                # "location", "karmic_partner", "divine_connection"
    severity:         Magnitude # HIGH = strong current-life impact; LOW = background energy
    indicator:        str       # astrological/numerological indicator that flagged this
    note:             str       # plain language description of the connection


@dataclass
class AncestralBurden:
    """
    An inherited karmic pattern from the ancestral lineage.
    All burdens carry a remedy — identification enables healing.
    """
    burden_type:  str   # "ancestral_grief", "financial_restriction", "relational_wound",
                        # "power_misuse", "collective_trauma", "unexpressed_potential"
    lineage:      str   # "maternal", "paternal", "both", "lineage_unspecified"
    indicator:    str   # the planetary indicator
    note:         str   # what this burden looks like in current life
    remedy:       str   # specific healing recommendation


@dataclass
class PastLifeIndicator:
    """
    A structural indicator of past-life patterns carried into this incarnation.
    Ketu/South Node, 12th house, and Neptune prominence are the classical markers.
    """
    indicator_type: str       # "ketu_sign", "twelfth_stellium", "neptune_prominent",
                              # "retrograde_cluster", "karmic_debt", "nakshatra_lineage"
    domain:         str       # which life domain this past-life pattern primarily touches
    strength:       Magnitude
    description:    str       # what the past life likely involved
    current_implication: str  # how this manifests in the current life


@dataclass
class SpiritualContract:
    """
    A soul-level agreement or mission identified from the natal chart.
    Rahu (North Node) is the primary significator; the 9th house and
    Life Path are supporting indicators.
    """
    contract_type: str   # "dharmic_direction", "karmic_completion", "teaching_mission",
                         # "healing_mission", "creative_contribution", "service_path",
                         # "bridge_builder", "transformation_catalyst"
    indicator:     str   # what identifies this contract
    description:   str   # what the contract entails
    activation:    str   # what activates / fulfils this contract


@dataclass
class UnresolvedVow:
    """
    An active vow from a prior lifetime that continues to shape current patterns.
    These are not permanent — they can be consciously renegotiated.
    """
    vow_type:              str   # "celibacy", "service", "poverty", "silence",
                                  # "sacrifice", "restraint", "obedience", "suffering"
    indicator:             str
    how_it_manifests:      str   # current-life pattern created by the vow
    renegotiation_guidance: str  # how to consciously complete or release the vow


@dataclass
class SpiritProfile:
    """
    Complete spirit world analysis payload for the Logic Layer / LLM Narrator.

    The Logic Layer uses this to produce the Spirit World and Spiritual Connection
    sections of the Individual Blueprint.
    """
    # Psychic openness assessment
    psychic_openness:       Magnitude
    psychic_openness_score: float      # 0.0–1.0

    # Spirit world connections
    spirit_attachments:     List[SpiritAttachment]

    # Ancestral dimension
    ancestral_burdens:      List[AncestralBurden]
    ancestral_blessings:    List[str]

    # Past-life dimension
    past_life_indicators:   List[PastLifeIndicator]

    # Contracts and vows
    spiritual_contracts:    List[SpiritualContract]
    unresolved_vows:        List[UnresolvedVow]

    # Home spiritual condition
    home_spiritual_condition: str
    home_spiritual_score:     float    # 0.0–1.0 (higher = more spiritually supportive home)

    # Collector-ready signals
    spirit_signals:         List[Dict]

    # Remedies
    cleansing_remedies:     List[str]
    protection_remedies:    List[str]
    activation_remedies:    List[str]

    # Key indicators summary
    primary_spirit_planet:  Optional[str]   # the most spiritually prominent planet
    primary_past_life_sign: Optional[str]   # Ketu sign (primary past life indicator)
    primary_rahu_sign:      Optional[str]   # Rahu sign (primary dharmic direction)
    nakshatra_spirit_note:  Optional[str]   # if birth nakshatra has spirit significance

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _house_of(planet: str, positions: Dict, houses: Dict) -> Optional[int]:
    """Return the house (1–12) of a planet from positions + houses dict."""
    if not ASTRO_AVAILABLE or planet not in positions:
        return None
    return _find_planet_house(positions[planet]["longitude"], houses)


def _sign_of(planet: str, positions: Dict) -> Optional[str]:
    """Return the sign of a planet."""
    return positions.get(planet, {}).get("sign") or None


def _is_retrograde(planet: str, positions: Dict) -> bool:
    return positions.get(planet, {}).get("retrograde", False)


def _planets_in_house(house_num: int, positions: Dict, houses: Dict) -> List[str]:
    """List all planets in a specific house."""
    if not ASTRO_AVAILABLE: return []
    result = []
    for planet in positions:
        h = _find_planet_house(positions[planet]["longitude"], houses)
        if h == house_num:
            result.append(planet)
    return result


def _aspects_between(p1: str, p2: str, positions: Dict, orb: float = 8.0) -> Optional[str]:
    """
    Return the aspect name between two planets if within orb, else None.
    Returns: 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition' | None
    """
    if p1 not in positions or p2 not in positions:
        return None
    d = abs(positions[p1]["longitude"] - positions[p2]["longitude"]) % 360
    if d > 180: d = 360 - d
    for angle, name in [(0,"conjunction"),(60,"sextile"),(90,"square"),
                         (120,"trine"),(150,"quincunx"),(180,"opposition")]:
        if abs(d - angle) <= orb:
            return name
    return None


def _is_hard_aspect(aspect: Optional[str]) -> bool:
    return aspect in ("square", "opposition", "quincunx")


def _is_soft_aspect(aspect: Optional[str]) -> bool:
    return aspect in ("conjunction", "trine", "sextile")


# ---------------------------------------------------------------------------
# A. Psychic Openness Assessment
# ---------------------------------------------------------------------------

def _assess_psychic_openness(
    positions: Dict,
    houses:    Dict,
    life_path: Optional[int]         = None,
    palm_spiritual_markers: Optional[List] = None,
    face_spiritual_markers: Optional[List] = None,
) -> Tuple[float, Magnitude]:
    """
    Assess the person's structural psychic openness from multiple sources.

    Scoring contributions (each 0.0–1.0, weighted):
    - Neptune placement and aspects (30%)
    - Moon sign and house (20%)
    - 12th house emphasis (15%)
    - Ketu prominence (15%)
    - Numerology LP (10%)
    - Biometric markers (10%)

    Returns (score: float 0.0–1.0, magnitude: Magnitude)
    """
    score = 0.0

    # Neptune — primary psychic bridge (weight 0.30)
    nep_sign  = _sign_of("Neptune", positions)
    nep_house = _house_of("Neptune", positions, houses)
    nep_moon  = _aspects_between("Neptune", "Moon", positions)
    nep_asc   = None  # Ascendant not in positions dict

    nep_sub = 0.0
    if nep_sign in _PSYCHIC_SIGNS: nep_sub += 0.30
    if nep_house in (1, 7, 12):    nep_sub += 0.35
    elif nep_house in (4, 8, 9):   nep_sub += 0.20
    if nep_moon in ("conjunction", "trine", "sextile"): nep_sub += 0.25
    elif nep_moon in ("square", "opposition"):           nep_sub += 0.10  # tension = still open
    score += min(1.0, nep_sub) * 0.30

    # Moon — psychic receptor (weight 0.20)
    moon_sign  = _sign_of("Moon", positions)
    moon_house = _house_of("Moon", positions, houses)
    moon_sub = 0.0
    if moon_sign in _PSYCHIC_SIGNS:        moon_sub += 0.50
    elif moon_sign in _SPIRITUAL_SIGNS:    moon_sub += 0.25
    if moon_house in (12, 8, 4):           moon_sub += 0.35
    elif moon_house in (1, 7, 9):          moon_sub += 0.20
    if _is_retrograde("Moon", positions):  moon_sub += 0.10
    score += min(1.0, moon_sub) * 0.20

    # 12th house emphasis (weight 0.15)
    twelfth_planets = _planets_in_house(12, positions, houses)
    twelfth_sub = min(1.0, len(twelfth_planets) * 0.30)
    if "Neptune" in twelfth_planets: twelfth_sub = min(1.0, twelfth_sub + 0.25)
    if "Moon"    in twelfth_planets: twelfth_sub = min(1.0, twelfth_sub + 0.20)
    score += twelfth_sub * 0.15

    # Ketu (South Node) prominence (weight 0.15)
    ketu_sign  = _sign_of("Rahu", positions)  # Ketu is opposite Rahu
    ketu_house = _house_of("Rahu", positions, houses)
    # Ketu house = opposite of Rahu house
    ketu_actual_house = ((ketu_house - 1 + 6) % 12 + 1) if ketu_house else None
    ketu_sub = 0.0
    if ketu_actual_house in (1, 12, 8, 9): ketu_sub += 0.50
    elif ketu_actual_house in (4, 7):       ketu_sub += 0.30
    ketu_moon = _aspects_between("Rahu", "Moon", positions)  # Rahu-Moon = Ketu-Moon
    if ketu_moon in ("conjunction", "trine"): ketu_sub += 0.30
    score += min(1.0, ketu_sub) * 0.15

    # Life Path numerology (weight 0.10)
    lp_sub = 0.0
    if life_path in _HIGH_SPIRIT_LP:
        lp_map = {7: 0.60, 11: 0.90, 22: 0.75, 33: 1.00}
        lp_sub = lp_map.get(life_path, 0.0)
    elif life_path in (2, 6):  # sensitive numbers
        lp_sub = 0.30
    elif life_path in (9,):    # humanitarian
        lp_sub = 0.40
    score += lp_sub * 0.10

    # Biometric markers (weight 0.10)
    bio_sub = 0.0
    if palm_spiritual_markers:
        strong = sum(1 for m in palm_spiritual_markers
                    if getattr(m, "strength", None) and
                    getattr(m, "strength").value == "high")
        bio_sub += min(1.0, strong * 0.35)
    if face_spiritual_markers:
        strong = sum(1 for m in face_spiritual_markers
                    if getattr(m, "presence", None) and
                    getattr(m, "presence").value == "high")
        bio_sub += min(1.0, strong * 0.35)
    score += min(1.0, bio_sub) * 0.10

    score = round(min(1.0, max(0.0, score)), 3)

    if score >= 0.75:   mag = Magnitude.HIGH
    elif score >= 0.50: mag = Magnitude.MODERATE
    elif score >= 0.25: mag = Magnitude.LOW
    else:               mag = Magnitude.UNCLEAR

    return score, mag


# ---------------------------------------------------------------------------
# B. Spirit Attachments
# ---------------------------------------------------------------------------

def _detect_spirit_attachments(
    positions: Dict,
    houses:    Dict,
    life_path: Optional[int] = None,
    karmic_debts: Optional[List[int]] = None,
) -> List[SpiritAttachment]:
    """
    Identify spirit-world connections from the natal chart.
    These are structural energetic connections — positive (blessings),
    neutral (contracted), or burdensome (requiring clearing).
    """
    attachments: List[SpiritAttachment] = []

    # ── Ancestral connection via 12th house planets ──────────────────────
    twelfth_planets = _planets_in_house(12, positions, houses)
    for planet in twelfth_planets:
        sign = _sign_of(planet, positions)
        lineage = "maternal_lineage" if sign in _WATER_SIGNS else "paternal_lineage"
        severity = Magnitude.HIGH if planet in ("Saturn","Pluto","Rahu") else Magnitude.MODERATE

        attachments.append(SpiritAttachment(
            attachment_type="ancestral_connection",
            source=lineage,
            severity=severity,
            indicator=f"{planet} in the 12th house (sign: {sign})",
            note=(f"{planet} in the 12th house indicates a significant connection to the "
                  f"ancestral spirit world, particularly from the {lineage.replace('_',' ')}. "
                  f"In Vedic astrology, the 12th house (Vyaya Bhava) is the realm of "
                  f"the ancestors, the spirit world, and karmic debts being resolved. "
                  f"{'This planet here suggests the ancestral line carries unresolved energy that seeks expression through this person.' if severity == Magnitude.HIGH else 'This connection is active but manageable — ancestral wisdom is more accessible than ancestral burden here.'}")
        ))

    # ── Ancestral blessing via Jupiter in 12th or 4th ───────────────────
    jup_house = _house_of("Jupiter", positions, houses)
    jup_sign  = _sign_of("Jupiter", positions)
    if jup_house in (4, 12):
        is_dignified = ASTRO_AVAILABLE and jup_sign in _DIGNIFIED_SIGNS.get("Jupiter", [])
        attachments.append(SpiritAttachment(
            attachment_type="blessing",
            source="ancestral_lineage",
            severity=Magnitude.LOW,  # LOW severity = positive, low-impact
            indicator=f"Jupiter in the {jup_house}th house (sign: {jup_sign})",
            note=(f"Jupiter in the {jup_house}th house is an ancestral blessing indicator. "
                  f"{'In Jyotish, Jupiter (Guru) in the Moksha houses carries the teacher-ancestor connection — accumulated spiritual merit from previous generations flows to this person.' if jup_house == 12 else 'Jupiter in the 4th house indicates the home and family carry abundant spiritual protection and ancestral blessing.'}"
                  f"{'Jupiter is dignified here, amplifying this blessing significantly.' if is_dignified else ''}")
        ))

    # ── Past-self resonance via Ketu conjunct personal planets ───────────
    rahu_sign = _sign_of("Rahu", positions)
    for planet in ["Sun", "Moon", "Mercury", "Venus", "Mars"]:
        asp = _aspects_between("Rahu", planet, positions, orb=5.0)
        if asp == "conjunction":
            attachments.append(SpiritAttachment(
                attachment_type="past_self_resonance",
                source="past_life",
                severity=Magnitude.MODERATE,
                indicator=f"Ketu conjunct {planet} (within 5°)",
                note=(f"Ketu (South Node) conjunct {planet} is a strong past-life imprint. "
                      f"The {planet.lower()} energy in this lifetime carries direct memory "
                      f"from previous incarnations — the person is extraordinarily familiar "
                      f"with this energy, sometimes uncomfortably so. "
                      f"This energy requires integration rather than avoidance: "
                      f"the past-self is trying to complete something through this planetary placement.")
            ))

    # ── Karmic contract via Pluto in 8th or 12th ────────────────────────
    pluto_house = _house_of("Pluto", positions, houses)
    pluto_sign  = _sign_of("Pluto", positions)
    if pluto_house in (8, 12):
        attachments.append(SpiritAttachment(
            attachment_type="karmic_contract",
            source="past_life",
            severity=Magnitude.MODERATE,
            indicator=f"Pluto in the {pluto_house}th house (sign: {pluto_sign})",
            note=(f"Pluto in the {pluto_house}th house indicates a deep karmic contract "
                  f"with the themes of death, transformation, and regeneration. "
                  f"In Western astrology, Pluto here is the soul's agreement to engage "
                  f"directly with the underworld energies — to descend and return, "
                  f"bringing wisdom from the depths. "
                  f"This is not a burden but an assignment of the highest order.")
        ))

    # ── Saturn in 12th — ancestral duty ─────────────────────────────────
    sat_house = _house_of("Saturn", positions, houses)
    sat_sign  = _sign_of("Saturn", positions)
    if sat_house == 12:
        attachments.append(SpiritAttachment(
            attachment_type="ancestral_connection",
            source="both_lineages",
            severity=Magnitude.HIGH,
            indicator=f"Saturn in the 12th house (sign: {sat_sign})",
            note=("Saturn in the 12th house in Vedic astrology indicates strong Pitru Dosh — "
                  "ancestral karma requiring specific remediation. "
                  "The Saturn energy here represents an ancestral duty that has been carried "
                  "across generations and has now reached this person for resolution. "
                  "This is one of the most significant spirit-world indicators in the chart. "
                  "Saturn's presence here is not punitive — it is karmic responsibility "
                  "arriving for conscious completion.")
        ))

    # ── Karmic debt 16 — spirit interference pattern ─────────────────────
    if karmic_debts and 16 in karmic_debts:
        attachments.append(SpiritAttachment(
            attachment_type="karmic_contract",
            source="past_life",
            severity=Magnitude.MODERATE,
            indicator="Karmic Debt Number 16 in numerological blueprint",
            note=("Karmic Debt 16 in the numerological tradition indicates a past-life "
                  "pattern of spiritual pride or the misuse of spiritual authority. "
                  "In this life, the soul's lesson is radical humility before the divine. "
                  "Until this is embraced, the 16 energy can manifest as unexpected "
                  "disruptions — particularly in areas where the ego has taken spiritual "
                  "ownership. The remedy: consistent surrender practices and spiritual "
                  "community rather than solitary spiritual authority.")
        ))

    # ── Neptune-Moon hard aspect — porous psychic boundary ───────────────
    nep_moon_asp = _aspects_between("Neptune", "Moon", positions)
    if _is_hard_aspect(nep_moon_asp):
        attachments.append(SpiritAttachment(
            attachment_type="past_self_resonance",
            source="collective_field",
            severity=Magnitude.MODERATE,
            indicator=f"Neptune {nep_moon_asp} Moon",
            note=(f"Neptune {nep_moon_asp} Moon in the natal chart indicates naturally "
                  "porous psychic boundaries. This person absorbs emotional and "
                  "spiritual information from the environment without a clear filter. "
                  "They may experience others' emotions, energies, or even ancestral "
                  "grief as their own. "
                  "The gift: extraordinary empathy and psychic receptivity. "
                  "The challenge: distinguishing self from other, present from ancestral, "
                  "one's own emotions from absorbed collective material.")
        ))

    return attachments


# ---------------------------------------------------------------------------
# C. Ancestral Burdens
# ---------------------------------------------------------------------------

def _assess_ancestral_burdens(
    positions: Dict,
    houses:    Dict,
    life_path: Optional[int]      = None,
    karmic_debts: Optional[List[int]] = None,
) -> List[AncestralBurden]:
    """
    Identify inherited ancestral patterns requiring healing.
    Every burden identified comes with a corresponding remedy.
    """
    burdens: List[AncestralBurden] = []

    # ── Saturn-Moon aspect — maternal ancestral grief ────────────────────
    sat_moon = _aspects_between("Saturn", "Moon", positions)
    if sat_moon:
        lineage = "maternal"
        burden_type = "ancestral_grief" if _is_hard_aspect(sat_moon) else "ancestral_structure"
        note = (_is_hard_aspect(sat_moon) and
                "Saturn square or opposing the Moon is the classical indicator of maternal "
                "ancestral grief — a pattern of sadness, loss, or emotional suppression "
                "carried through the maternal line that has not yet been consciously processed. "
                "This may manifest as: chronic low-grade melancholy, difficulty receiving nurturing, "
                "or unconscious sabotage of emotional intimacy. "
                "The ancestral mothers in this lineage carried something heavy — "
                "and this chart is now carrying it into awareness for resolution."
                or
                "Saturn conjunct or trine the Moon indicates a structured, duty-oriented "
                "maternal inheritance. The maternal line carries themes of responsibility, "
                "hard work, and serious approach to life. This can be a blessing of discipline "
                "or a burden of joylessness, depending on how consciously it is held.")
        remedy = ("Maternal line ancestral healing practice: write a letter to the maternal "
                  "ancestors acknowledging their grief and consciously choosing to set it down. "
                  "Ritual: light a white candle on Monday (Moon's day) and speak aloud: "
                  "'I receive your wisdom. I release your burden. I carry forward your strength.'")
        burdens.append(AncestralBurden(
            burden_type=burden_type, lineage=lineage,
            indicator=f"Saturn {sat_moon} Moon",
            note=note, remedy=remedy,
        ))

    # ── Saturn-Sun aspect — paternal ancestral burden ────────────────────
    sat_sun = _aspects_between("Saturn", "Sun", positions)
    if _is_hard_aspect(sat_sun):
        burdens.append(AncestralBurden(
            burden_type="ancestral_restriction",
            lineage="paternal",
            indicator=f"Saturn {sat_sun} Sun",
            note=("Saturn in hard aspect to the Sun indicates a paternal ancestral "
                  "pattern of restriction, authority pressure, or unfulfilled ambition. "
                  "The paternal line may carry patterns of: blocked career, "
                  "authoritarian father energy, or the weight of patriarchal duty "
                  "without joy. This person carries the task of liberating the "
                  "masculine/paternal energy — embodying authority with warmth "
                  "rather than rigidity."),
            remedy=("Paternal line healing: acknowledge the burden the paternal ancestors carried. "
                    "Ritual: on Saturday (Saturn's day), light a dark blue or black candle, "
                    "speak the names of the paternal grandfathers, and consciously "
                    "choose a different relationship with authority than the one inherited."),
        ))

    # ── Pluto in 4th house — generational trauma ─────────────────────────
    pluto_house = _house_of("Pluto", positions, houses)
    if pluto_house == 4:
        pluto_sign = _sign_of("Pluto", positions)
        burdens.append(AncestralBurden(
            burden_type="collective_trauma",
            lineage="both",
            indicator=f"Pluto in the 4th house (sign: {pluto_sign})",
            note=(f"Pluto in the 4th house in {pluto_sign} indicates a generational trauma "
                  f"embedded in the family system. Pluto's placement here — particularly "
                  f"in {'Scorpio or Cancer' if pluto_sign in ('Scorpio','Cancer') else pluto_sign} — "
                  f"suggests the family carries intense, transformative experiences that "
                  f"have not been fully integrated. War, migration, sudden loss, abuse of "
                  f"power, or profound collective events may be in the family history. "
                  f"This person's soul chose this family precisely because they have the "
                  f"capacity to process and transform what prior generations could not."),
            remedy=("Generational trauma healing: family constellation work (Hellinger method) "
                    "is the most effective remedy for this Pluto placement. "
                    "Shadow journaling and somatic therapy also activate Pluto-4th healing. "
                    "The family story must be acknowledged in full — the light and the shadow — "
                    "before it can be transformed."),
        ))

    # ── Saturn in 4th — home/family restriction ──────────────────────────
    sat_house = _house_of("Saturn", positions, houses)
    if sat_house == 4:
        sat_sign = _sign_of("Saturn", positions)
        burdens.append(AncestralBurden(
            burden_type="financial_restriction",
            lineage="both",
            indicator=f"Saturn in the 4th house (sign: {sat_sign})",
            note=(f"Saturn in the 4th house indicates ancestral financial restriction "
                  f"or scarcity programming embedded in the family system. "
                  f"The belief 'there is not enough' or 'security must be earned through suffering' "
                  f"may have been passed down through generations. "
                  f"This person carries both the ancestral wisdom of working with limited resources "
                  f"AND the task of releasing the scarcity belief that comes with it."),
            remedy=("Abundance ancestral work: on a new moon, write a new financial story "
                    "for the lineage. Acknowledge what the ancestors built with limited means. "
                    "Then consciously write the next chapter — one where abundance is normal "
                    "and deserved. Pitru Dosh puja (Vedic ancestral healing ritual) is "
                    "specifically recommended for this placement."),
        ))

    # ── Karmic debt numbers as ancestral pattern indicators ───────────────
    if karmic_debts:
        for kd in karmic_debts:
            if kd in _KARMIC_DEBT_NUMBERS:
                burden_notes = {
                    13: ("The 13 Karmic Debt indicates a past-life pattern of avoiding work "
                         "through manipulation or laziness, resulting in a current-life lesson "
                         "of sustained, disciplined effort. May manifest as: projects that "
                         "repeatedly fail before completion, creative blocks, or reluctance "
                         "to follow through on commitments."),
                    14: ("The 14 Karmic Debt indicates past-life excess — overindulgence "
                         "in sensory pleasures, freedom without responsibility. "
                         "May manifest as: addictive patterns, extreme mood swings, "
                         "or difficulty maintaining structure despite best intentions."),
                    16: ("The 16 Karmic Debt indicates past-life spiritual pride or "
                         "misuse of spiritual authority. May manifest as: cycles of "
                         "sudden fall from established positions, spiritual bypassing, "
                         "or the painful collapse of carefully constructed identities."),
                    19: ("The 19 Karmic Debt indicates past-life selfishness and "
                         "isolation — gaining power without giving back. "
                         "May manifest as: forced independence, isolation when support "
                         "is most needed, or the lesson of asking for and accepting help."),
                }
                remedies_kd = {
                    13: "Commit to one significant creative or professional project and see it through completion regardless of how long it takes. The 13 heals through perseverance.",
                    14: "Daily routine and structure are the primary remedy. Physical practices (yoga, martial arts, cold practice) create the inner container the 14 needs.",
                    16: "Daily surrender practice. Community spiritual participation rather than solo spiritual authority. The 16 heals through shared, humble devotion.",
                    19: "Deliberate interdependence: consciously ask for help daily. Service practices that require receiving as well as giving. The 19 heals through genuine mutual support.",
                }
                burdens.append(AncestralBurden(
                    burden_type="karmic_debt_pattern",
                    lineage="past_life",
                    indicator=f"Karmic Debt Number {kd}",
                    note=burden_notes.get(kd, _KARMIC_DEBT_NUMBERS[kd]),
                    remedy=remedies_kd.get(kd, "Consistent daily spiritual practice is the primary remedy."),
                ))

    # ── Missing numbers (if available) — karmic absence ──────────────────
    # (This would require missing_numbers from numerology_engine — placeholder)
    # Currently implemented as optional enhancement

    return burdens


# ---------------------------------------------------------------------------
# D. Past-Life Indicators
# ---------------------------------------------------------------------------

def _identify_past_life_indicators(
    positions:    Dict,
    houses:       Dict,
    life_path:    Optional[int]      = None,
    karmic_debts: Optional[List[int]] = None,
    nakshatra:    Optional[str]       = None,
) -> List[PastLifeIndicator]:
    """
    Identify structural past-life patterns from Ketu, 12th house, Neptune,
    retrograde clusters, karmic debts, and nakshatra.
    """
    indicators: List[PastLifeIndicator] = []

    # ── Ketu (South Node) sign — primary past-life indicator ─────────────
    rahu_sign = _sign_of("Rahu", positions)
    if rahu_sign:
        # Ketu is directly opposite Rahu in sign (180° away)
        rahu_idx = next((i for i, s in enumerate(
            ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
             "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
        ) if s == rahu_sign), None)
        if rahu_idx is not None:
            ketu_sign = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                         "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][
                (rahu_idx + 6) % 12
            ]

            ketu_readings = {
                "Aries":       ("warrior or pioneer in past lives — action, leadership, physical mastery", "career", "Leadership skills are natural but may come with aggression that needs channelling."),
                "Taurus":      ("accumulated material mastery and sensory wisdom — builder, farmer, artisan", "wealth", "Material intelligence is deep but may carry attachment to comfort or possessions."),
                "Gemini":      ("communicator, merchant, or scribe — words and information were the currency", "career", "Communication gifts are innate but scattered attention may need structure."),
                "Cancer":      ("nurturer, mother, or keeper of the home fires across many lives", "love", "Deep capacity for care but may struggle with emotional boundaries or codependency."),
                "Leo":         ("royalty, performer, or creative leader — identity through self-expression", "character", "Creative gifts are strong but ego attachment or need for recognition may persist."),
                "Virgo":       ("healer, servant, analyst — service through precision and discrimination", "health", "Healing intelligence is deep but perfectionism or self-criticism may be a shadow."),
                "Libra":       ("diplomat, judge, or artist — balance, beauty, and relational harmony", "love", "Relational intelligence is profound but indecision or people-pleasing may linger."),
                "Scorpio":     ("shaman, healer, or investigator — mastery of hidden and transformative realms", "spiritual", "Depth and intensity are natural gifts but power struggles or control issues may surface."),
                "Sagittarius": ("philosopher, wanderer, or teacher — truth and freedom were the primary drives", "spiritual", "Wisdom and broad vision are natural but commitment or discipline may be the growth edge."),
                "Capricorn":   ("builder of institutions, ruler, or elder — authority and structure across lives", "career", "Discipline and mastery are deeply encoded but rigidity or workaholism may need healing."),
                "Aquarius":    ("humanitarian, inventor, or visionary — collective service and innovation", "career", "Original thinking and collective vision are natural but emotional intimacy may need cultivation."),
                "Pisces":      ("mystic, healer, or devotee — spiritual immersion and selfless service", "spiritual", "Deep spiritual gifts and compassion but boundaries with reality may need strengthening."),
            }

            pl_desc, pl_domain, pl_implication = ketu_readings.get(
                ketu_sign, (f"accumulated mastery in {ketu_sign} themes", "character", "Past-life skills and patterns from this sign are naturally accessible.")
            )

            indicators.append(PastLifeIndicator(
                indicator_type="ketu_sign",
                domain=pl_domain,
                strength=Magnitude.HIGH,
                description=(f"Ketu (South Node) in {ketu_sign} — this person comes from past lives as a {pl_desc}. "
                             f"The {ketu_sign} energy is deeply familiar — perhaps uncomfortably so — "
                             f"because the soul has mastered it across multiple incarnations. "
                             f"In Vedic tradition, Ketu represents the accumulated karma of past lives: "
                             f"the skills are already there, but the soul is being called to move beyond them toward the Rahu direction of growth."),
                current_implication=pl_implication,
            ))

    # ── 12th house stellium — accumulated past-life energy ───────────────
    twelfth_planets = _planets_in_house(12, positions, houses)
    if len(twelfth_planets) >= 2:
        dominant = twelfth_planets[0] if twelfth_planets else "Neptune"
        domain_map = {"Neptune":"spiritual","Saturn":"career","Moon":"love",
                      "Venus":"love","Pluto":"spiritual","Jupiter":"spiritual",
                      "Mars":"career","Mercury":"career","Sun":"character","Rahu":"spiritual"}
        indicators.append(PastLifeIndicator(
            indicator_type="twelfth_stellium",
            domain=domain_map.get(dominant, "spiritual"),
            strength=Magnitude.HIGH,
            description=(f"{len(twelfth_planets)} planets in the 12th house "
                         f"({', '.join(twelfth_planets)}) — a significant cluster of past-life "
                         f"energy concentrated in the house of hidden realms and ancestral memory. "
                         f"In Western astrology, the 12th house holds what was not integrated in prior lives: "
                         f"uncompleted missions, accumulated gifts, and karmic patterns awaiting resolution. "
                         f"This is one of the most significant past-life indicators possible."),
            current_implication=("Strong pull toward solitude, spiritual practice, and behind-the-scenes work. "
                                 "May experience a sense of 'not quite fitting in' until the spiritual calling is answered. "
                                 "The 12th house planets are the buried treasure of this incarnation."),
        ))

    # ── Neptune prominent — mystical past-life experience ────────────────
    nep_house = _house_of("Neptune", positions, houses)
    nep_sign  = _sign_of("Neptune", positions)
    if nep_house in (1, 7, 12) or nep_sign in ("Pisces", "Scorpio"):
        indicators.append(PastLifeIndicator(
            indicator_type="neptune_prominent",
            domain="spiritual",
            strength=Magnitude.MODERATE,
            description=(f"Neptune in the {nep_house}th house in {nep_sign} — "
                         "Neptune prominence indicates past lives of deep spiritual immersion: "
                         "mystics, devotees, monastics, or those who lived with a permanently "
                         "thin veil between ordinary and non-ordinary reality. "
                         "The soul carries a memory of dissolution — of merging with something "
                         "greater — that it continues to seek in this lifetime."),
            current_implication=("May experience difficulty with clear boundaries, "
                                 "strong attraction to transcendent experiences, "
                                 "and a natural receptivity to spiritual transmission. "
                                 "The challenge is grounding the mystical gifts in practical form."),
        ))

    # ── Retrograde cluster — karmic acceleration ──────────────────────────
    retrograde_planets = [p for p in positions if _is_retrograde(p, positions)
                         and p not in ("Rahu",)]
    if len(retrograde_planets) >= 3:
        indicators.append(PastLifeIndicator(
            indicator_type="retrograde_cluster",
            domain="character",
            strength=Magnitude.MODERATE,
            description=(f"{len(retrograde_planets)} retrograde planets "
                         f"({', '.join(retrograde_planets[:4])}) — "
                         "multiple retrograde planets indicate a soul in intensive karmic "
                         "acceleration. Retrograde planets represent themes the soul has "
                         "encountered before and is revisiting with deeper intensity. "
                         "Each retrograde planet carries a specific past-life curriculum "
                         "being completed in this incarnation."),
            current_implication=("Themes of these retrograde planets feel deeply personal, "
                                 "sometimes obsessive, or like unfinished business. "
                                 "Progress in these areas comes through internal work rather "
                                 "than external action."),
        ))

    # ── Karmic debt numbers as past-life debt indicators ─────────────────
    if karmic_debts:
        for kd in karmic_debts:
            domain_kd = {13:"career", 14:"health", 16:"spiritual", 19:"character"}
            past_life_kd = {
                13: "a craftsperson, builder, or creative who avoided the labour required for mastery",
                14: "a person of power or pleasure who misused freedom or substance",
                16: "a spiritual teacher or leader whose ego overrode genuine service",
                19: "a ruler, innovator, or pioneer who isolated themselves from the people they served",
            }
            indicators.append(PastLifeIndicator(
                indicator_type="karmic_debt",
                domain=domain_kd.get(kd, "character"),
                strength=Magnitude.MODERATE,
                description=(f"Karmic Debt {kd} indicates a past life as {past_life_kd.get(kd, 'a soul learning ' + str(kd) + ' themes')}. "
                             f"The soul is returning to complete what was begun or correct what was misused."),
                current_implication=_KARMIC_DEBT_NUMBERS.get(kd, "Karmic completion is the primary task."),
            ))

    # ── Nakshatra past-life significance ─────────────────────────────────
    if nakshatra and nakshatra in _SPIRIT_NAKSHATRAS:
        indicators.append(PastLifeIndicator(
            indicator_type="nakshatra_lineage",
            domain="spiritual",
            strength=Magnitude.MODERATE,
            description=(f"Birth nakshatra {nakshatra} carries specific past-life significance. "
                         f"Vedic meaning: {_SPIRIT_NAKSHATRAS[nakshatra]}"),
            current_implication=(f"The {nakshatra} nakshatra amplifies the spirit-world connection "
                                 f"in this lifetime. This person's soul memory includes direct "
                                 f"engagement with the themes of {nakshatra}."),
        ))

    return indicators


# ---------------------------------------------------------------------------
# E. Spiritual Contracts
# ---------------------------------------------------------------------------

def _identify_spiritual_contracts(
    positions:    Dict,
    houses:       Dict,
    life_path:    Optional[int]   = None,
    rahu_sign:    Optional[str]   = None,
) -> List[SpiritualContract]:
    """
    Identify soul-level agreements and dharmic missions from Rahu, 9th house,
    and Life Path indicators.
    """
    contracts: List[SpiritualContract] = []

    # ── Rahu (North Node) sign — primary dharmic direction ───────────────
    rahu_s = rahu_sign or _sign_of("Rahu", positions)
    if rahu_s:
        rahu_contracts = {
            "Aries":       ("dharmic_direction", "To develop individual courage, initiative, and self-trust. The soul is contracted to pioneer and lead rather than follow."),
            "Taurus":      ("dharmic_direction", "To build material security and sensory mastery with presence and patience. Contracted to create enduring, beautiful things."),
            "Gemini":      ("teaching_mission",  "To communicate, connect, and synthesise knowledge. Contracted to be a bridge between different worlds of knowing."),
            "Cancer":      ("healing_mission",   "To develop deep emotional intelligence and nurturing capacity. Contracted to create home, family, and emotional safety."),
            "Leo":         ("creative_contribution", "To develop authentic creative self-expression and leadership through joy. Contracted to inspire through genuine expression."),
            "Virgo":       ("service_path",      "To develop mastery in service, healing, and precise practical work. Contracted to be a vessel of healing in practical form."),
            "Libra":       ("bridge_builder",    "To develop relational mastery, justice, and beauty. Contracted to create harmony between opposing forces."),
            "Scorpio":     ("transformation_catalyst", "To develop mastery of depth, death, and regeneration. Contracted to assist others' transformation and to regenerate what has been corrupted."),
            "Sagittarius": ("teaching_mission",  "To develop philosophical wisdom and teach the expansive truth. Contracted to seek and share the larger meaning."),
            "Capricorn":   ("dharmic_direction", "To develop genuine authority and build lasting institutions. Contracted to create structures that serve across generations."),
            "Aquarius":    ("bridge_builder",    "To develop collective vision and humanitarian service. Contracted to contribute to the evolution of human community."),
            "Pisces":      ("healing_mission",   "To develop spiritual devotion, compassion, and transcendence. Contracted to be a vessel of divine love and healing."),
        }
        contract_type, description = rahu_contracts.get(
            rahu_s, ("dharmic_direction", f"To develop and express the highest qualities of {rahu_s} energy.")
        )
        rahu_house = _house_of("Rahu", positions, houses)
        activation = (
            f"This contract activates when the person deliberately moves into Rahu's direction — "
            f"toward {rahu_s} themes in the "
            + (f"{rahu_house}th house domain of life. " if rahu_house else "relevant life domain. ")
            + "Resistance to this direction is the source of recurring frustration in the life."
        )
        contracts.append(SpiritualContract(
            contract_type=contract_type,
            indicator=f"Rahu (North Node) in {rahu_s}",
            description=description,
            activation=activation,
        ))

    # ── 9th house emphasis — philosophical/dharmic contract ──────────────
    ninth_planets = _planets_in_house(9, positions, houses)
    if ninth_planets:
        contracts.append(SpiritualContract(
            contract_type="teaching_mission",
            indicator=f"9th house emphasis: {', '.join(ninth_planets)}",
            description=(f"{', '.join(ninth_planets)} in the 9th house of dharma and higher wisdom. "
                         "In Vedic tradition, the 9th house (Dharma Bhava) is the house of one's "
                         "spiritual mission in this lifetime. Multiple planets here indicate a strong "
                         "dharmic contract — the person is meant to engage with philosophy, religion, "
                         "teaching, law, or long-distance exploration of meaning."),
            activation=("This contract activates through: advanced education, spiritual teaching, "
                        "travel to sacred places, or any work that connects individual meaning "
                        "to universal principles."),
        ))

    # ── Jupiter well-placed — wisdom transmission contract ───────────────
    jup_sign = _sign_of("Jupiter", positions)
    jup_house = _house_of("Jupiter", positions, houses)
    if ASTRO_AVAILABLE and jup_sign in _DIGNIFIED_SIGNS.get("Jupiter", []):
        contracts.append(SpiritualContract(
            contract_type="teaching_mission",
            indicator=f"Jupiter dignified in {jup_sign} (house: {jup_house})",
            description=("Dignified Jupiter in the natal chart indicates a wisdom transmission "
                         "contract — the soul is contracted to teach, guide, or expand others' "
                         "understanding. Jupiter's dignity suggests accumulated spiritual merit "
                         "from prior lives flowing into this one as a gift for conscious sharing. "
                         "This is a teacher-soul, whether in a formal or informal role."),
            activation=("Activated through genuine generosity — giving knowledge, resources, "
                        "and wisdom freely. Jupiter contracts activate when the person stops "
                        "hoarding knowledge and begins trusting abundance."),
        ))

    # ── High LP spiritual contracts ───────────────────────────────────────
    if life_path in _HIGH_SPIRIT_LP:
        lp_contracts = {
            7:  ("service_path",      "To develop and share mystical wisdom through solitude, study, and inner work.", "Activated by consistent contemplative practice and selective sharing of insights."),
            11: ("bridge_builder",    "To channel higher-dimensional wisdom into human-applicable form. The 11 is a spiritual messenger — the contract is to receive and transmit.", "Activated when the person stops filtering their inspiration through conventional logic and begins trusting the transmission."),
            22: ("creative_contribution", "To manifest large-scale spiritual vision in physical form — to build what has never existed before in service of collective evolution.", "Activated when personal ambition is surrendered to the larger mission the 22 has been assigned."),
            33: ("healing_mission",   "To embody compassion at cosmic scale — to teach love through being love rather than speaking of it.", "Activated through years of genuine self-development that results in a naturally elevated state accessible to others."),
        }
        ct, desc, activ = lp_contracts[life_path]
        contracts.append(SpiritualContract(
            contract_type=ct,
            indicator=f"Life Path {life_path} (Master Number)" if life_path in (11,22,33) else f"Life Path {life_path}",
            description=_HIGH_SPIRIT_LP[life_path] + " " + desc,
            activation=activ,
        ))

    return contracts


# ---------------------------------------------------------------------------
# F. Unresolved Vows
# ---------------------------------------------------------------------------

def _identify_unresolved_vows(
    positions: Dict,
    houses:    Dict,
) -> List[UnresolvedVow]:
    """
    Identify vows from prior lifetimes that are still active in the energy field.
    These manifest as recurring patterns in specific domains.
    All vows can be consciously renegotiated.
    """
    vows: List[UnresolvedVow] = []
    twelfth_planets = _planets_in_house(12, positions, houses)

    # ── Saturn in 12th — vow of service or isolation ─────────────────────
    if "Saturn" in twelfth_planets:
        vows.append(UnresolvedVow(
            vow_type="service",
            indicator="Saturn in the 12th house",
            how_it_manifests=("Compulsive service to others at the expense of self; "
                              "difficulty receiving help; sense that life must be earned "
                              "through sacrifice; preference for behind-the-scenes roles. "
                              "In some cases: attraction to monastic or isolated living."),
            renegotiation_guidance=("The vow of service is honoured but now requires "
                                    "a new form. Conscious service with appropriate boundaries "
                                    "is the completion. Speak internally to the past-self who "
                                    "took this vow: 'Your service was honoured. I carry your "
                                    "dedication but release your sacrifice. I serve from strength now, not duty.'"),
        ))

    # ── Neptune in 12th — vow of dissolution/sacrifice ───────────────────
    if "Neptune" in twelfth_planets:
        vows.append(UnresolvedVow(
            vow_type="sacrifice",
            indicator="Neptune in the 12th house",
            how_it_manifests=("Chronic self-sacrifice; difficulty knowing one's own needs; "
                              "tendency to merge with others' realities; attraction to "
                              "transcendence through substances, spiritual bypassing, or "
                              "martyrdom patterns. The vow of 'giving all of oneself to God/others.'"),
            renegotiation_guidance=("Neptune 12th vow renegotiation: 'I release the belief "
                                    "that I must dissolve completely to be spiritual. "
                                    "I can be whole AND connected to the divine.' "
                                    "Embodiment practices (yoga, dance, somatic work) are "
                                    "the primary renegotiation tool for Neptune 12th."),
        ))

    # ── Ketu conjunct Venus — vow of celibacy or renunciation ────────────
    ketu_venus = _aspects_between("Rahu", "Venus", positions, orb=5.0)
    if ketu_venus == "conjunction":
        vows.append(UnresolvedVow(
            vow_type="celibacy",
            indicator="Ketu conjunct Venus (within 5°)",
            how_it_manifests=("Difficulty fully claiming pleasure, beauty, and romantic love; "
                              "guilt around enjoyment; pattern of either asceticism or "
                              "over-compensation; relationships that feel like they must "
                              "be earned or justified. The ancient monastic vow still "
                              "running in the field."),
            renegotiation_guidance=("Consciously claim the right to pleasure and love "
                                    "in this lifetime. The vow was taken; it was honoured; "
                                    "it is now complete. Deliberately engaging beauty — "
                                    "art, music, sensory pleasure, love — without guilt "
                                    "is the renegotiation practice."),
        ))

    # ── Ketu conjunct Saturn — vow of restraint ───────────────────────────
    ketu_sat = _aspects_between("Rahu", "Saturn", positions, orb=5.0)
    if ketu_sat == "conjunction":
        vows.append(UnresolvedVow(
            vow_type="restraint",
            indicator="Ketu conjunct Saturn (within 5°)",
            how_it_manifests=("Extreme self-restriction; difficulty allowing joy or ease; "
                              "belief that expansion must be earned through deprivation first. "
                              "The Saturnian vow of strict discipline from a monastic "
                              "or military past-life context."),
            renegotiation_guidance=("Conscious joy practice: deliberately schedule ease, "
                                    "rest, and pleasure without preceding it with deprivation. "
                                    "The soul is not required to suffer before receiving good. "
                                    "This is the core renegotiation of the Ketu-Saturn vow."),
        ))

    # ── Pluto in 12th — vow or misuse of hidden power ────────────────────
    if "Pluto" in twelfth_planets:
        vows.append(UnresolvedVow(
            vow_type="power_renegotiation",
            indicator="Pluto in the 12th house",
            how_it_manifests=("Hidden or repressed power; fear of claiming full authority; "
                              "unconscious power patterns that emerge in unexpected ways; "
                              "shadow expressions of control. The past-life vow may have "
                              "been a misuse of power that required its renunciation."),
            renegotiation_guidance=("Power must be consciously claimed and consciously directed. "
                                    "The Pluto-12th path: acknowledge where power is being "
                                    "suppressed, identify where it is leaking unconsciously, "
                                    "and deliberately choose a form of power that serves rather "
                                    "than dominates. Shadow work (Jungian depth psychology) "
                                    "is the primary tool for this vow."),
        ))

    # ── Mercury in 12th — vow of silence ─────────────────────────────────
    if "Mercury" in twelfth_planets:
        vows.append(UnresolvedVow(
            vow_type="silence",
            indicator="Mercury in the 12th house",
            how_it_manifests=("Difficulty speaking one's truth; ideas that feel too sacred "
                              "to share; communication blocks or inner critic that silences "
                              "self-expression before it reaches others. "
                              "May have been a person of vow of silence — monk, nun, or ascetic."),
            renegotiation_guidance=("The vow of silence was honoured in prior lives. "
                                    "Now the soul is called to speak. "
                                    "Daily journaling, voice work, or public speaking practice "
                                    "consciously completes the Mercury-12th vow. "
                                    "Start small: one true thing shared each day."),
        ))

    return vows


# ---------------------------------------------------------------------------
# G. Ancestral Blessings
# ---------------------------------------------------------------------------

def _assess_ancestral_blessings(
    positions:    Dict,
    houses:       Dict,
    life_path:    Optional[int] = None,
) -> List[str]:
    """
    Identify inherited spiritual gifts and karmic credit.
    These are the positive inheritances from the ancestral/past-life account.
    """
    blessings: List[str] = []

    # Jupiter dignified
    jup_sign = _sign_of("Jupiter", positions)
    if ASTRO_AVAILABLE and jup_sign in _DIGNIFIED_SIGNS.get("Jupiter", []):
        blessings.append(
            f"Dignified Jupiter in {jup_sign} — the ancestral account carries substantial "
            "spiritual credit. Jupiter dignity indicates accumulated dharmic merit "
            "from prior lives and/or a generous, spiritually active ancestral line. "
            "This person has access to grace that others must work harder to receive."
        )

    # Jupiter in 1st, 4th, 9th, or 10th — life blessings
    jup_house = _house_of("Jupiter", positions, houses)
    if jup_house in (1, 9, 10):
        house_meanings = {1: "personal magnetism and life force", 9: "wisdom and dharmic fortune", 10: "career recognition and public honour"}
        blessings.append(
            f"Jupiter in the {jup_house}th house — ancestral blessing flowing into "
            f"{house_meanings.get(jup_house, 'this life domain')}. "
            "The generational spiritual merit manifests as natural fortune in this area."
        )

    # Venus dignified — love and beauty blessing
    ven_sign = _sign_of("Venus", positions)
    if ASTRO_AVAILABLE and ven_sign in _DIGNIFIED_SIGNS.get("Venus", []):
        blessings.append(
            f"Dignified Venus in {ven_sign} — ancestral blessing of love, beauty, and "
            "relational harmony. The maternal or Venusian line carries accumulated gifts "
            "of artistic ability, relational intelligence, and capacity for beauty "
            "that flows naturally into this person's life."
        )

    # Sun dignified — leadership/authority blessing
    sun_sign = _sign_of("Sun", positions)
    if ASTRO_AVAILABLE and sun_sign in _DIGNIFIED_SIGNS.get("Sun", []):
        blessings.append(
            f"Dignified Sun in {sun_sign} — ancestral blessing of authority, vitality, "
            "and leadership capacity. The paternal line carries a legacy of strength "
            "and purpose that flows into this person as natural leadership confidence."
        )

    # Moon in Cancer — powerful ancestral intuitive blessing
    if _sign_of("Moon", positions) == "Cancer":
        blessings.append(
            "Moon in Cancer — the most powerful ancestral memory placement. "
            "The lunar intelligence of the ancestors flows directly and clearly through "
            "this person. Intuition is a deep ancestral gift. "
            "The emotional and psychic heritage of the family is accessible as wisdom."
        )

    # Life Path blessings
    lp_blessings = {
        7:  "Life Path 7 — the gift of direct spiritual insight. The soul comes in with the contemplative intelligence already developed.",
        11: "Life Path 11 (Master Number) — the gift of psychic transmission. The veil between worlds is structurally thin for this soul.",
        22: "Life Path 22 (Master Number) — the gift of manifestation at scale. The capacity to build what the soul envisions is an extraordinary ancestral endowment.",
        33: "Life Path 33 (Master Number) — the gift of compassion as a state of being. The ability to hold divine love without burning up in it is a rare ancestral offering.",
        9:  "Life Path 9 — the gift of accumulated wisdom across many lifetimes. The 9 arrives with a deep humanitarian intelligence already formed.",
    }
    if life_path in lp_blessings:
        blessings.append(lp_blessings[life_path])

    # Ketu in spiritual signs — past-life spiritual mastery
    rahu_sign = _sign_of("Rahu", positions)
    if rahu_sign:
        ketu_sign_idx = (["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                          "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
                         ].index(rahu_sign) + 6) % 12
        ketu_sign = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                     "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][ketu_sign_idx]
        if ketu_sign in ("Sagittarius", "Pisces", "Scorpio", "Virgo"):
            blessings.append(
                f"Ketu (South Node) in {ketu_sign} — past-life spiritual mastery inherited as a natural gift. "
                f"The soul brings spiritual intelligence from prior lives spent in deep {ketu_sign} territory "
                f"— this wisdom is accessible without effort and can serve as a foundation for the Rahu direction."
            )

    return blessings


# ---------------------------------------------------------------------------
# H. Home Spiritual Condition
# ---------------------------------------------------------------------------

def _assess_home_condition(
    positions: Dict,
    houses:    Dict,
) -> Tuple[str, float]:
    """
    Assess the spiritual atmosphere and condition of the home / living space.
    Based on 4th house, IC sign, Moon placement, and 4th house planets.

    Returns (condition_description, score 0.0–1.0)
    """
    score = 0.5  # baseline neutral
    fourth_planets = _planets_in_house(4, positions, houses)
    moon_sign       = _sign_of("Moon", positions)
    moon_house      = _house_of("Moon", positions, houses)
    fourth_ruler_sign = None  # Simplified — would need 4th house cusp sign

    notes: List[str] = []

    # ── Beneficial 4th house planets ─────────────────────────────────────
    if "Jupiter" in fourth_planets:
        score += 0.25
        notes.append("Jupiter in the 4th house — the home carries abundant spiritual protection and generosity. A place of learning, wisdom, and divine blessing.")
    if "Venus" in fourth_planets:
        score += 0.15
        notes.append("Venus in the 4th house — the home carries beauty, harmony, and aesthetic grace. A naturally healing domestic environment.")
    if "Moon" in fourth_planets:
        score += 0.10
        notes.append("Moon in the 4th house — the home is emotionally nourishing and intuitively aligned. Strong ancestral connection to the living space.")

    # ── Challenging 4th house planets ────────────────────────────────────
    if "Saturn" in fourth_planets:
        score -= 0.15
        notes.append("Saturn in the 4th house — the home carries ancestral restriction or duty. Space clearing and conscious lightening of the domestic atmosphere are recommended.")
    if "Pluto" in fourth_planets:
        score -= 0.10
        notes.append("Pluto in the 4th house — the home carries intense transformative energy. Power dynamics within the family system require awareness.")
    if "Mars" in fourth_planets:
        score -= 0.08
        notes.append("Mars in the 4th house — the home may carry conflict energy or excess fire. Calming practices (water, blue/white decor, sound healing) are beneficial.")

    # ── Moon in water signs — natural spiritual home alignment ───────────
    if moon_sign in _WATER_SIGNS:
        score += 0.10
        notes.append(f"Moon in {moon_sign} — natural resonance with water element creates a home that is emotionally alive and spiritually receptive.")

    # ── Moon in 4th house — double home nourishment ──────────────────────
    if moon_house == 4:
        score += 0.08
        notes.append("Moon ruling the 4th house sector — deep emotional nourishment available in the home environment when properly tended.")

    score = round(min(1.0, max(0.0, score)), 3)

    if score >= 0.70:
        overall = ("The home carries strong spiritual protection and vitality. "
                   + " ".join(notes[:2])
                   + " This living space naturally supports meditation, healing, and spiritual practice.")
    elif score >= 0.45:
        overall = ("The home spiritual condition is moderately supportive with some areas requiring attention. "
                   + " ".join(notes[:2] if notes else ["The home is a neutral spiritual environment."])
                   + " Intentional space clearing and sacred anchoring practices will elevate the baseline.")
    else:
        overall = ("The home requires active spiritual attention and clearing. "
                   + " ".join(notes[:2] if notes else ["Heavy or stagnant energy patterns are indicated."])
                   + " Regular space clearing (sage, salt, sound), natural light, and living plants "
                   "are the foundational remedies. Consider rearranging the home's energy flow through basic Feng Shui or Vastu principles.")

    return overall, score


# ---------------------------------------------------------------------------
# Signal builder
# ---------------------------------------------------------------------------

def _build_spirit_signals(
    profile:  "SpiritProfile",
    system:   str = "western",
) -> List[Dict]:
    """Build collector.py-ready signals from the spirit profile."""
    signals: List[Dict] = []

    # Psychic openness signal
    tone = ("strongly_positive" if profile.psychic_openness == Magnitude.HIGH
            else "positive" if profile.psychic_openness == Magnitude.MODERATE
            else "neutral")
    signals.append({
        "feature": "psychic_openness",
        "domain":  "spiritual",
        "tone":    tone,
        "strength": profile.psychic_openness_score,
        "reading": (f"Psychic openness: {profile.psychic_openness.value} (score {profile.psychic_openness_score}). "
                    f"The natal chart, numerology, and biometric indicators collectively "
                    f"indicate {'exceptional' if profile.psychic_openness == Magnitude.HIGH else 'significant' if profile.psychic_openness == Magnitude.MODERATE else 'moderate'} "
                    f"sensitivity to non-ordinary dimensions."),
        "keywords": ["psychic_openness", "spirit_sensitivity", profile.psychic_openness.value],
        "astro_affinity": ["Neptune", "Moon", "Ketu"],
        "numerology_link": [7, 11],
        "chinese_element": "water",
        "temporal_phase": "timeless",
        "retrograde": False, "house": None, "system": system,
    })

    # Spirit attachments signals
    for att in profile.spirit_attachments:
        sev_tone = ("challenging" if att.severity == Magnitude.HIGH
                    else "neutral" if att.severity == Magnitude.MODERATE
                    else "positive")
        signals.append({
            "feature": f"spirit_attachment_{att.attachment_type}",
            "domain":  "spirit_world",
            "tone":    sev_tone,
            "strength": 0.80 if att.severity == Magnitude.HIGH else 0.65,
            "reading": att.note,
            "keywords": ["spirit_attachment", att.attachment_type, att.source],
            "astro_affinity": ["Neptune", "Pluto", "Rahu"],
            "numerology_link": [11, 7],
            "chinese_element": "water",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Ancestral burden signals
    for burden in profile.ancestral_burdens:
        signals.append({
            "feature": f"ancestral_burden_{burden.burden_type}",
            "domain":  "spirit_world",
            "tone":    "challenging",
            "strength": 0.75,
            "reading": burden.note,
            "keywords": ["ancestral_burden", burden.burden_type, burden.lineage],
            "astro_affinity": ["Saturn", "Pluto", "Moon"],
            "numerology_link": [4, 8],
            "chinese_element": "earth",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Ancestral blessing signals
    for i, blessing in enumerate(profile.ancestral_blessings[:3]):
        signals.append({
            "feature": f"ancestral_blessing_{i+1}",
            "domain":  "spiritual",
            "tone":    "strongly_positive",
            "strength": 0.85,
            "reading": blessing,
            "keywords": ["ancestral_blessing", "spiritual_gift", "karmic_credit"],
            "astro_affinity": ["Jupiter", "Venus", "Sun"],
            "numerology_link": [3, 6, 9],
            "chinese_element": "fire",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Past-life signals
    for pli in profile.past_life_indicators[:3]:
        signals.append({
            "feature": f"past_life_{pli.indicator_type}",
            "domain":  pli.domain,
            "tone":    "neutral",
            "strength": 0.80 if pli.strength == Magnitude.HIGH else 0.60,
            "reading": pli.description + " " + pli.current_implication,
            "keywords": ["past_life", pli.indicator_type, pli.domain],
            "astro_affinity": ["Ketu", "Neptune", "Pluto"],
            "numerology_link": [9, 7],
            "chinese_element": "water",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Spiritual contract signals
    for contract in profile.spiritual_contracts[:2]:
        signals.append({
            "feature": f"spiritual_contract_{contract.contract_type}",
            "domain":  "spiritual",
            "tone":    "strongly_positive",
            "strength": 0.90,
            "reading": contract.description,
            "keywords": ["spiritual_contract", contract.contract_type, "dharmic_mission"],
            "astro_affinity": ["Rahu", "Jupiter", "Sun"],
            "numerology_link": [1, 9, 11],
            "chinese_element": "fire",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Unresolved vow signals
    for vow in profile.unresolved_vows[:2]:
        signals.append({
            "feature": f"unresolved_vow_{vow.vow_type}",
            "domain":  "spirit_world",
            "tone":    "challenging",
            "strength": 0.70,
            "reading": vow.how_it_manifests,
            "keywords": ["unresolved_vow", vow.vow_type, "past_life_pattern"],
            "astro_affinity": ["Saturn", "Neptune", "Ketu"],
            "numerology_link": [4, 7],
            "chinese_element": "metal",
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Home condition signal
    home_tone = ("positive" if profile.home_spiritual_score >= 0.60
                 else "neutral" if profile.home_spiritual_score >= 0.40
                 else "challenging")
    signals.append({
        "feature": "home_spiritual_condition",
        "domain":  "spiritual",
        "tone":    home_tone,
        "strength": profile.home_spiritual_score,
        "reading": profile.home_spiritual_condition,
        "keywords": ["home_spiritual_condition", "domestic_energy", "ancestral_home"],
        "astro_affinity": ["Moon", "Jupiter", "Saturn"],
        "numerology_link": [2, 4, 6],
        "chinese_element": "earth",
        "temporal_phase": "timeless",
        "retrograde": False, "house": 4, "system": system,
    })

    return signals


# ---------------------------------------------------------------------------
# Remedies generator
# ---------------------------------------------------------------------------

def _generate_remedies(
    profile: "SpiritProfile",
) -> Tuple[List[str], List[str], List[str]]:
    """
    Generate three categories of remedies:
    - Cleansing: for burdens, attachments, and vows requiring release
    - Protection: for maintaining spiritual integrity
    - Activation: for awakening and developing spiritual gifts

    Returns (cleansing, protection, activation)
    """
    cleansing: List[str] = []
    protection: List[str] = []
    activation: List[str] = []

    # Cleansing based on burden count
    burden_count = len(profile.ancestral_burdens)
    vow_count    = len(profile.unresolved_vows)
    heavy_attachments = sum(1 for a in profile.spirit_attachments
                           if a.severity == Magnitude.HIGH)

    if burden_count >= 2 or heavy_attachments >= 2:
        cleansing.append(
            "ANCESTRAL CLEARING: Perform a formal ancestral acknowledgement ritual. "
            "Write the names of four generations of ancestors (as many as known) on paper. "
            "Light incense (frankincense or sandalwood) and speak aloud: "
            "'I acknowledge all that you carried. I honour your sacrifices. "
            "I release from my body and energy field what is not mine to carry. "
            "I carry forward your wisdom and release your wounds.' Burn the paper safely."
        )
        cleansing.append(
            "SPACE CLEARING: Monthly full-moon salt clearing practice. "
            "Place bowls of coarse salt in the corners of the home for 24 hours. "
            "Remove and dispose of the salt (do not reuse). "
            "Follow with fresh flowers, incense, and open windows."
        )

    if vow_count >= 1:
        for vow in profile.unresolved_vows[:2]:
            cleansing.append(f"VOW RENEGOTIATION ({vow.vow_type.upper()}): {vow.renegotiation_guidance}")

    if not cleansing:
        cleansing.append(
            "MAINTENANCE CLEARING: Weekly clearing practice — sage or palo santo "
            "for the living space; sea salt bath for personal energy field. "
            "Even without heavy burdens, regular energetic hygiene is recommended "
            "for anyone with significant 12th house or Neptune emphasis."
        )

    # Protection based on psychic openness level
    if profile.psychic_openness in (Magnitude.HIGH, Magnitude.MODERATE):
        protection.append(
            "PSYCHIC BOUNDARY PRACTICE: Daily grounding exercise (barefoot on earth or grass "
            "for 10 minutes minimum). Visualise roots growing from the base of the spine "
            "into the earth. State: 'I am grounded. My field belongs to me. "
            "I receive only what serves my highest good.'"
        )
        protection.append(
            "ENERGETIC CONTAINMENT: Before entering high-energy environments "
            "(hospitals, crowded places, emotionally intense meetings), "
            "place one hand on the heart and one on the belly. "
            "Breathe three times and set an internal boundary: "
            "'I am here as witness and participant, not as a sponge.' "
            "After intense environments: water clearing (wash hands and face, "
            "brief shower if possible)."
        )
    else:
        protection.append(
            "BASIC PROTECTION: Daily intention-setting practice. "
            "Upon waking, state the day's spiritual intention and invite only "
            "beneficial energies into the field. Simple but effective."
        )

    protection.append(
        "ANCESTRAL PROTECTION: Place photographs or representations of known ancestors "
        "in the home. Ask for their protection daily. Light a candle for them weekly. "
        "The ancestors who have completed their own healing become protectors — "
        "this is a universal cross-cultural truth."
    )

    # Activation based on spiritual contracts and openness
    if profile.spiritual_contracts:
        for contract in profile.spiritual_contracts[:2]:
            activation.append(
                f"CONTRACT ACTIVATION ({contract.contract_type.upper().replace('_',' ')}): "
                f"{contract.activation}"
            )

    if profile.psychic_openness == Magnitude.HIGH:
        activation.append(
            "PSYCHIC DEVELOPMENT: Formal training in intuitive or mediumistic development "
            "is recommended. The natural gifts are strong enough to benefit from structured "
            "development rather than remaining untrained. Options: spiritual development "
            "circles, Jungian dream work, or formal intuition training with a qualified teacher."
        )
    elif profile.psychic_openness == Magnitude.MODERATE:
        activation.append(
            "INTUITIVE DEVELOPMENT: Daily journaling practice specifically for intuitive "
            "impressions. Record dreams, synchronicities, and gut feelings without judgement. "
            "Review monthly to identify patterns. This activates the natural receptivity "
            "in a structured, grounded way."
        )

    if profile.ancestral_blessings:
        activation.append(
            "BLESSING ACTIVATION: Ancestral blessings require conscious claiming. "
            "Speak them aloud: 'I receive the gifts of my lineage. I am worthy of "
            "the spiritual inheritance that has been built across generations. "
            "I activate these gifts in service of this lifetime's purpose.' "
            "Speak this on the new moon of each month."
        )

    return cleansing, protection, activation


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class SpiritEngine:
    """
    Stateless spirit world analysis engine.

    Takes natal chart data + optional numerology and biometric inputs.
    Produces a SpiritProfile for the Logic Layer / LLM Narrator.

    Usage:
        engine = SpiritEngine()
        profile = engine.compute(
            positions=natal_positions,
            houses=natal_houses,
            life_path=7,
            karmic_debts=[16],
            nakshatra="Magha",
        )
    """

    def compute(
        self,
        positions:              Dict,
        houses:                 Dict,
        life_path:              Optional[int]        = None,
        karmic_debts:           Optional[List[int]]  = None,
        nakshatra:              Optional[str]        = None,
        rahu_sign:              Optional[str]        = None,
        palm_spiritual_markers: Optional[List]       = None,
        face_spiritual_markers: Optional[List]       = None,
        system:                 str                  = "western",
    ) -> SpiritProfile:
        """
        Compute a complete spirit world profile.

        Args:
            positions:   Dict of planetary positions from astrology_engine
            houses:      Dict of house cusps from astrology_engine
            life_path:   Numerology Life Path number (optional)
            karmic_debts: List of karmic debt numbers (optional)
            nakshatra:   Vedic birth nakshatra name (optional)
            rahu_sign:   Rahu sign (if already computed, avoids recomputation)
            palm_spiritual_markers: List of SpiritualMarker from palm_engine (optional)
            face_spiritual_markers: List of FaceSpiritualMarker from face_engine (optional)
            system:      "western" or "vedic"

        Returns:
            SpiritProfile — complete spirit world analysis
        """
        import time
        t0 = time.monotonic()

        # ── A. Psychic openness ────────────────────────────────────────────
        openness_score, openness_mag = _assess_psychic_openness(
            positions, houses, life_path, palm_spiritual_markers, face_spiritual_markers
        )

        # ── B. Spirit attachments ──────────────────────────────────────────
        attachments = _detect_spirit_attachments(
            positions, houses, life_path, karmic_debts
        )

        # ── C. Ancestral burdens ───────────────────────────────────────────
        burdens = _assess_ancestral_burdens(
            positions, houses, life_path, karmic_debts
        )

        # ── D. Past-life indicators ────────────────────────────────────────
        past_life = _identify_past_life_indicators(
            positions, houses, life_path, karmic_debts, nakshatra
        )

        # ── E. Spiritual contracts ─────────────────────────────────────────
        contracts = _identify_spiritual_contracts(
            positions, houses, life_path, rahu_sign
        )

        # ── F. Unresolved vows ─────────────────────────────────────────────
        vows = _identify_unresolved_vows(positions, houses)

        # ── G. Ancestral blessings ─────────────────────────────────────────
        blessings = _assess_ancestral_blessings(positions, houses, life_path)

        # ── H. Home spiritual condition ────────────────────────────────────
        home_condition, home_score = _assess_home_condition(positions, houses)

        # ── Key indicator summary ──────────────────────────────────────────
        # Primary spirit planet: highest-impact planet in spiritual positions
        spirit_planet_priority = ["Neptune","Pluto","Moon","Saturn","Jupiter","Rahu"]
        primary_spirit = next(
            (p for p in spirit_planet_priority
             if _house_of(p, positions, houses) in _SPIRIT_HOUSES),
            spirit_planet_priority[0] if positions else None
        )

        # Primary past-life sign (Ketu sign)
        rahu_s = rahu_sign or _sign_of("Rahu", positions)
        ketu_s = None
        if rahu_s:
            signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                     "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
            ketu_s = signs[(signs.index(rahu_s) + 6) % 12] if rahu_s in signs else None

        # Nakshatra spirit note
        nak_note = _SPIRIT_NAKSHATRAS.get(nakshatra) if nakshatra else None

        # ── Build preliminary profile for signal builder ───────────────────
        # (Build profile without signals first, then add signals)
        profile = SpiritProfile(
            psychic_openness       = openness_mag,
            psychic_openness_score = openness_score,
            spirit_attachments     = attachments,
            ancestral_burdens      = burdens,
            ancestral_blessings    = blessings,
            past_life_indicators   = past_life,
            spiritual_contracts    = contracts,
            unresolved_vows        = vows,
            home_spiritual_condition = home_condition,
            home_spiritual_score   = home_score,
            spirit_signals         = [],          # filled below
            cleansing_remedies     = [],
            protection_remedies    = [],
            activation_remedies    = [],
            primary_spirit_planet  = primary_spirit,
            primary_past_life_sign = ketu_s,
            primary_rahu_sign      = rahu_s,
            nakshatra_spirit_note  = nak_note,
        )

        # ── Build signals ──────────────────────────────────────────────────
        profile.spirit_signals = _build_spirit_signals(profile, system)

        # ── Generate remedies ──────────────────────────────────────────────
        profile.cleansing_remedies, profile.protection_remedies, profile.activation_remedies =             _generate_remedies(profile)

        ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "SpiritEngine.compute completed",
            extra={
                "psychic_openness":    openness_mag.value,
                "openness_score":      openness_score,
                "spirit_attachments":  len(attachments),
                "ancestral_burdens":   len(burdens),
                "past_life_indicators":len(past_life),
                "spiritual_contracts": len(contracts),
                "unresolved_vows":     len(vows),
                "ancestral_blessings": len(blessings),
                "home_score":          home_score,
                "signals":             len(profile.spirit_signals),
                "primary_spirit_planet": primary_spirit,
                "primary_past_life":   ketu_s,
                "reading_ms":          ms,
            },
        )

        return profile


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def compute_spirit_profile(
    positions:              Dict,
    houses:                 Dict,
    life_path:              Optional[int]       = None,
    karmic_debts:           Optional[List[int]] = None,
    nakshatra:              Optional[str]       = None,
    rahu_sign:              Optional[str]       = None,
    palm_spiritual_markers: Optional[List]      = None,
    face_spiritual_markers: Optional[List]      = None,
    system:                 str                 = "western",
) -> SpiritProfile:
    """
    Module-level convenience wrapper for SpiritEngine.compute().

    Example:
        from synthesis.astrology_engine import compute_western
        from synthesis.spirit_engine import compute_spirit_profile

        signals, timing, _ = compute_western(
            day=15, month=3, year=1985, hour=14.5,
            latitude=3.147, longitude=101.695, utc_offset=8.0,
        )
        # Extract positions from a direct call (not via compute_western wrapper)
        # For full usage, call SpiritEngine.compute() directly with raw positions/houses.

        profile = compute_spirit_profile(
            positions=positions,   # from _calculate_positions()
            houses=houses,         # from _calculate_houses()
            life_path=7,
            karmic_debts=[16],
            nakshatra="Magha",
        )
        print(profile.psychic_openness.value)
        print(len(profile.spirit_signals), "signals for collector")
        print(profile.spiritual_contracts[0].description)
    """
    return SpiritEngine().compute(
        positions=positions, houses=houses,
        life_path=life_path, karmic_debts=karmic_debts,
        nakshatra=nakshatra, rahu_sign=rahu_sign,
        palm_spiritual_markers=palm_spiritual_markers,
        face_spiritual_markers=face_spiritual_markers,
        system=system,
    )
