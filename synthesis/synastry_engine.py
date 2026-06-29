"""
Synastry Engine — KAYAL Synthesis Platform
===========================================
Cross-chart astrological analysis engine for the Union Blueprint.

Position in the pipeline:
    BirthData (Person A) + BirthData (Person B)
         ↓
    SynastreyEngine.compute()
         ↓
    SynastryProfile  →  Logic Layer  →  LLM Narrator  →  Union Blueprint PDF

Responsibility:
    Compute a comprehensive synastry analysis between two natal charts.
    Produces a SynastryProfile containing:

    RELATIONSHIP ANALYSIS
    - Cross-chart aspects (all major A↔B planetary contacts)
    - Composite chart (midpoint method — the "relationship entity")
    - Marriage longevity scoring (12-factor weighted assessment)
    - Children timing and potential (5th house + Moon-Jupiter indicators)
    - Infidelity risk assessment (8 structural risk factors)
    - Dominance and power dynamics (who leads, who yields)

    LIFE DOMAIN CROSS-IMPACT
    - Career synergy (MC overlays, Saturn-Sun contacts)
    - Health cross-impact (6th house overlays, stress patterns)
    - Death order assessment (8th house + longevity comparison)

    SYNTHESIS
    - Multi-dimensional compatibility score (0.0–1.0 per domain)
    - Union remedies (7 categories for strengthening the bond)
    - Collector-ready signals for Logic Layer integration

Design principles:
    - Stateless: no shared state — fully thread-safe
    - Deterministic: same inputs → same output always
    - Graceful fallback: functions when pyswisseph is unavailable
      (Sun/Moon only positions via approximation mode)
    - Numerology integration: LP compatibility cross-referenced
    - Zero interpretation bias: reports structural indicators only;
      the LLM Narrator provides life-context interpretation

Knowledge sources:
    John Townley  — "Composite Charts" (1973) — midpoint composite method
    Robert Hand   — "Planets in Composite" (1975)
    Liz Greene    — "Relating" (1977) — synastry interpretation
    Stephen Arroyo — "Astrology, Karma & Transformation"
    Komilla Sutton — Vedic synastry tradition
    B.V. Raman    — "Hindu Predictive Astrology" (matching chapter)

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

from .astrology_engine import (
    _julian_day,
    _calculate_positions,
    _calculate_houses,
    _detect_aspects,
    _degree_to_sign,
    _find_planet_house,
    _determine_tone_and_strength,
    _planet_keywords,
    _planet_numerology,
    _PLANET_DOMAIN_MAP,
    _HOUSE_DOMAIN_MAP,
    _SIGN_CHINESE_ELEMENT,
    _DIGNIFIED_SIGNS,
    _DEBILITATED_SIGNS,
    _HOUSE_PLACIDUS,
    _HOUSE_WHOLE,
    _LAHIRI_AYANAMSA,
    SWE_AVAILABLE,
)

# Optional numerology integration — graceful fallback if unavailable
try:
    from .numerology_engine import life_path_compatibility, compute_compatibility_score
    NUMEROLOGY_AVAILABLE = True
except ImportError:
    NUMEROLOGY_AVAILABLE = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Key synastry planets for cross-chart analysis
_KEY_PLANETS_A = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu"]
_KEY_PLANETS_B = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu"]

# Priority cross-aspects for marriage longevity
_MARRIAGE_LONGEVITY_PAIRS: List[Tuple[str, str, float]] = [
    # (planet_a, planet_b, weight) — higher weight = stronger longevity signal
    ("Sun",     "Moon",    1.00),   # Fundamental polarity
    ("Moon",    "Sun",     1.00),   # Both directions
    ("Moon",    "Saturn",  0.90),   # Stability anchor
    ("Saturn",  "Moon",    0.90),
    ("Venus",   "Mars",    0.85),   # Attraction and desire
    ("Mars",    "Venus",   0.85),
    ("Venus",   "Jupiter", 0.80),   # Abundance in love
    ("Jupiter", "Venus",   0.80),
    ("Venus",   "Venus",   0.75),   # Shared values
    ("Sun",     "Jupiter", 0.70),   # Mutual growth
    ("Jupiter", "Sun",     0.70),
    ("Moon",    "Moon",    0.70),   # Emotional resonance
    ("Sun",     "Sun",     0.65),   # Core identity match
    ("Moon",    "Pluto",   0.60),   # Bond depth
    ("Pluto",   "Moon",    0.60),
    ("Moon",    "Jupiter", 0.60),   # Emotional expansion
    ("Jupiter", "Moon",    0.60),
    ("Venus",   "Pluto",   0.55),   # Intensity
    ("Saturn",  "Sun",     0.55),   # Respect and authority
    ("Sun",     "Saturn",  0.55),
]

# Aspects that strengthen marriage longevity
_POSITIVE_LONGEVITY_ASPECTS = {"conjunction", "trine", "sextile"}
_CHALLENGING_ASPECTS         = {"square", "opposition"}

# Infidelity risk planet pairs (planet_a, planet_b)
_INFIDELITY_RISK_PAIRS: List[Tuple[str, str, List[str], float]] = [
    # (planet_a, planet_b, risky_aspects, weight)
    ("Venus",   "Neptune", ["square", "opposition"], 0.90),
    ("Mars",    "Neptune", ["square", "opposition"], 0.85),
    ("Venus",   "Uranus",  ["square", "opposition", "conjunction"], 0.80),
    ("Mars",    "Uranus",  ["square", "opposition", "conjunction"], 0.75),
    ("Venus",   "Pluto",   ["square", "opposition"],  0.65),
    ("Mars",    "Pluto",   ["conjunction", "square"],  0.60),
    ("Jupiter", "Venus",   ["square", "opposition"],  0.55),
    ("Sun",     "Pluto",   ["square", "opposition"],  0.50),
]

# Compatibility scoring weights per domain
_COMPAT_WEIGHTS = {
    "love":              0.25,
    "career":            0.15,
    "wealth":            0.10,
    "health":            0.10,
    "spiritual":         0.10,
    "children_forecast": 0.10,
    "character":         0.20,
}

# Signs that indicate high creative/freedom orientation (infidelity context)
_FREEDOM_MOON_SIGNS = {"Gemini", "Sagittarius", "Aquarius", "Aries"}

# Longevity-strong houses (planets here indicate endurance)
_LONGEVITY_HOUSES = {1, 10, 11}  # Self, career, community
_LONGEVITY_WEAK_HOUSES = {8, 12}  # Transformation, hidden


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SynastryCrossAspect:
    """A single cross-chart aspect between Person A and Person B planets."""
    planet_a:      str
    planet_b:      str
    aspect:        str            # conjunction, trine, square, opposition, etc.
    orb:           float          # degrees from exact
    tone:          str            # strongly_positive, positive, neutral, challenging
    domain:        str            # primary domain this aspect touches
    weight:        float          # importance score 0.0–1.0 (tighter orb = higher weight)
    reading:       str
    keywords:      List[str]


@dataclass
class MarriageIndicator:
    """A single marriage longevity indicator."""
    indicator_type: str           # "cross_aspect", "house_overlay", "composite"
    planets:        List[str]
    aspect:         str
    tone:           str           # positive, negative, neutral
    weight:         float
    reading:        str


@dataclass
class ChildrenIndicator:
    """A single children timing/potential indicator."""
    indicator_type: str
    planets:        List[str]
    aspect:         str
    tone:           str
    reading:        str


@dataclass
class InfidelityIndicator:
    """A single infidelity structural risk or stabilising factor."""
    indicator_type:  str
    planets:         List[str]
    aspect:          str
    direction:       str          # "risk_factor" or "stabilising"
    significance:    float        # 0.0–1.0
    reading:         str


@dataclass
class DominanceProfile:
    """Power dynamics and leadership pattern in the union."""
    dominant_person:  str         # "person_a", "person_b", "equal", "conflicted"
    dominance_type:   str         # "sun_dominant", "saturn_dominant", "mars_dominant", "balanced"
    dominance_score:  float       # how strong the imbalance is (0.0 = equal, 1.0 = extreme)
    reading:          str
    sub_readings:     List[str]


@dataclass
class CareerSynergy:
    """Career and professional synergy between the two people."""
    synergy_level:  str           # "strong", "moderate", "weak", "conflicted"
    score:          float         # 0.0–1.0
    indicators:     List[str]
    reading:        str


@dataclass
class HealthCrossImpact:
    """How each person's chart affects the other's health."""
    impact_level:   str           # "supportive", "neutral", "stressful"
    score:          float         # 0.0–1.0 (higher = more supportive)
    indicators:     List[str]
    reading:        str


@dataclass
class DeathOrderAssessment:
    """Structural longevity comparison between two charts."""
    likely_order:      str        # "person_a_first", "person_b_first", "unclear"
    confidence:        str        # "high", "moderate", "low"
    longevity_score_a: float      # 0.0–1.0 constitutional longevity estimate
    longevity_score_b: float
    indicators:        List[str]
    reading:           str


@dataclass
class CompatibilityScore:
    """Multi-dimensional compatibility scoring."""
    overall:           float      # 0.0–1.0
    love:              float
    career:            float
    wealth:            float
    health:            float
    spiritual:         float
    children_forecast: float
    character:         float
    level:             str        # "excellent", "strong", "moderate", "challenging", "difficult"
    overview:          str


@dataclass
class SynastryProfile:
    """
    Complete synastry analysis payload for the Logic Layer.

    The Logic Layer / LLM Narrator uses this to produce the
    Union Blueprint narrative across all 15+ sections.
    """
    # Identification
    person_a_label:  str
    person_b_label:  str
    system:          str          # "western" or "vedic"

    # Core analysis
    cross_aspects:     List[SynastryCrossAspect]
    composite:         Dict[str, Dict]   # composite planet positions

    # Domain assessments
    marriage_longevity:    float                   # 0.0–1.0
    marriage_indicators:   List[MarriageIndicator]
    children_indicators:   List[ChildrenIndicator]
    infidelity_indicators: List[InfidelityIndicator]
    dominance:             DominanceProfile
    career_synergy:        CareerSynergy
    health_cross_impact:   HealthCrossImpact
    death_order:           DeathOrderAssessment

    # Compatibility
    compatibility: CompatibilityScore

    # Remedies
    union_remedies: List[str]

    # Collector-ready signals
    synastry_signals: List[Dict]

    # Metadata
    numerology_lp_compatibility: Optional[str] = None
    reading_ms:                  int           = 0

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _orb_weight(orb: float, max_orb: float = 8.0) -> float:
    """Convert orb in degrees to a 0.0–1.0 weight (tighter = higher)."""
    return max(0.0, 1.0 - (orb / max_orb))


def _lon_diff(lon_a: float, lon_b: float) -> float:
    """Shortest angular distance between two ecliptic longitudes."""
    d = abs(lon_a - lon_b) % 360
    return d if d <= 180 else 360 - d


def _cross_aspect_type(orb_diff: float) -> Optional[Tuple[str, str, float]]:
    """
    Given the angular difference between two planets,
    return (aspect_name, tone, max_orb) if within orb, else None.
    """
    ASPECTS = [
        (0,   "conjunction",  "strong_positive",  8.0),
        (60,  "sextile",      "positive",          6.0),
        (90,  "square",       "challenging",       8.0),
        (120, "trine",        "strongly_positive", 8.0),
        (150, "quincunx",     "neutral",           4.0),
        (180, "opposition",   "challenging",       8.0),
    ]
    for angle, name, tone, max_orb in ASPECTS:
        if abs(orb_diff - angle) <= max_orb:
            return name, tone, max_orb
    return None


# ---------------------------------------------------------------------------
# Core analysis functions
# ---------------------------------------------------------------------------

def _synastry_cross_aspects(
    pos_a: Dict, pos_b: Dict, system: str = "western"
) -> List[SynastryCrossAspect]:
    """
    Compute all major cross-chart aspects between A and B natal planets.
    Sorted by weight (tightest orb × planet importance).
    """
    aspects: List[SynastryCrossAspect] = []

    for pa in _KEY_PLANETS_A:
        if pa not in pos_a: continue
        lon_a = pos_a[pa]["longitude"]
        sign_a = pos_a[pa].get("sign", "")

        for pb in _KEY_PLANETS_B:
            if pb not in pos_b: continue
            lon_b = pos_b[pb]["longitude"]
            sign_b = pos_b[pb].get("sign", "")
            diff = _lon_diff(lon_a, lon_b)

            result = _cross_aspect_type(diff)
            if result is None: continue
            asp_name, tone, max_orb = result
            orb = abs(diff - {
                "conjunction":0,"sextile":60,"square":90,
                "trine":120,"quincunx":150,"opposition":180
            }[asp_name])

            # Domain: shared domains between the two planets
            da = _PLANET_DOMAIN_MAP.get(pa, ["character"])
            db = _PLANET_DOMAIN_MAP.get(pb, ["character"])
            shared = [d for d in da if d in db]
            domain = shared[0] if shared else da[0]

            quality = "harmonious" if "positive" in tone else "challenging"
            reading = (
                f"Person A's {pa} in {sign_a} {asp_name} Person B's {pb} in {sign_b} "
                f"(orb {round(orb,1)}°) — {quality} cross-chart contact in the "
                f"{domain} domain."
            )

            weight = _orb_weight(orb, max_orb) * (
                1.2 if pa in ("Sun","Moon","Venus","Mars") else 1.0
            ) * (
                1.2 if pb in ("Sun","Moon","Venus","Mars") else 1.0
            )

            aspects.append(SynastryCrossAspect(
                planet_a=pa, planet_b=pb, aspect=asp_name, orb=round(orb,2),
                tone=tone, domain=domain, weight=round(min(1.0,weight),3),
                reading=reading,
                keywords=[pa.lower(), pb.lower(), asp_name, domain],
            ))

    aspects.sort(key=lambda a: -a.weight)
    return aspects


def _composite_positions(pos_a: Dict, pos_b: Dict) -> Dict[str, Dict]:
    """
    Calculate the midpoint composite chart (Townley method).
    Returns composite planet positions with sign and degree.
    """
    composite: Dict[str, Dict] = {}
    planets = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Rahu"]
    for planet in planets:
        if planet not in pos_a or planet not in pos_b: continue
        lon_a = pos_a[planet]["longitude"]
        lon_b = pos_b[planet]["longitude"]
        # Midpoint — take shorter arc
        mid = (lon_a + lon_b) / 2.0
        if abs(lon_a - lon_b) > 180:
            mid = (mid + 180) % 360
        mid %= 360
        sign, deg, _ = _degree_to_sign(mid)
        ce = _SIGN_CHINESE_ELEMENT.get(sign, "earth")
        tone, strength = _determine_tone_and_strength(planet, sign, False)
        composite[planet] = {
            "longitude": round(mid, 4),
            "sign": sign, "degree": round(deg, 3),
            "tone": tone,
            "chinese_element": ce,
            "reading": (
                f"Composite {planet} in {sign} — the relationship entity's "
                f"{planet.lower()} energy expresses through {sign}."
            ),
        }
    return composite


def _marriage_longevity_score(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
    composite: Dict[str, Dict],
) -> Tuple[float, List[MarriageIndicator]]:
    """
    Compute marriage longevity score (0.0–1.0) from 12 indicator sets.

    Returns (score, indicators_list).
    """
    indicators: List[MarriageIndicator] = []
    raw_score = 0.0
    max_possible = 0.0

    # 1. Prioritised cross-aspect indicators
    for pa, pb, pair_weight in _MARRIAGE_LONGEVITY_PAIRS:
        max_possible += pair_weight
        matching = [a for a in cross_aspects if
                    (a.planet_a == pa and a.planet_b == pb)]
        if not matching: continue
        best = min(matching, key=lambda x: x.orb)

        if best.aspect in _POSITIVE_LONGEVITY_ASPECTS:
            contribution = pair_weight * _orb_weight(best.orb)
            raw_score += contribution
            tone = "positive"
            reading = (
                f"A's {pa} {best.aspect} B's {pb} (orb {best.orb}°) — "
                f"{_MARRIAGE_LONGEVITY_READING_MAP.get((pa,pb,best.aspect), 'a bonding aspect indicating commitment and longevity.')} "
            )
        elif best.aspect in _CHALLENGING_ASPECTS:
            # Challenging aspects still indicate intensity and engagement
            contribution = pair_weight * 0.4 * _orb_weight(best.orb)
            raw_score += contribution
            tone = "challenging"
            reading = (
                f"A's {pa} {best.aspect} B's {pb} (orb {best.orb}°) — "
                "a tension aspect requiring conscious work. The intensity can sustain "
                "engagement over time if both partners grow through the friction."
            )
        else:
            continue

        indicators.append(MarriageIndicator(
            indicator_type="cross_aspect",
            planets=[pa, pb], aspect=best.aspect,
            tone=tone, weight=pair_weight, reading=reading,
        ))

    # 2. 7th house overlays — A's key planets in B's 7th house
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        for planet in ["Sun", "Moon", "Venus", "Jupiter"]:
            if planet not in positions_person: continue
            lon_p = positions_person[planet]["longitude"]
            sign_p = positions_person[planet].get("sign","")
            house_in_other = _find_planet_house(lon_p, houses_other)
            if house_in_other == 7:
                w = 0.80 if planet in ("Sun","Moon","Venus") else 0.60
                max_possible += w; raw_score += w
                indicators.append(MarriageIndicator(
                    indicator_type="house_overlay",
                    planets=[planet], aspect="placement",
                    tone="positive", weight=w,
                    reading=(f"Person {person_label}'s {planet} in {sign_p} falls in the "
                             f"other partner's 7th house of marriage — a classic synastry "
                             f"indicator activating the partnership zone."),
                ))
            elif house_in_other == 5:  # Romance house overlay
                w = 0.50; max_possible += w; raw_score += w * 0.7
                indicators.append(MarriageIndicator(
                    indicator_type="house_overlay",
                    planets=[planet], aspect="placement",
                    tone="positive", weight=w,
                    reading=(f"Person {person_label}'s {planet} in the other's 5th house — "
                             f"romantic and creative activation. Adds joy and romance to the bond."),
                ))

    # 3. Saturn overlays on Descendant/7th — serious commitment indicator
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        if "Saturn" in positions_person:
            sat_lon = positions_person["Saturn"]["longitude"]
            house_sat = _find_planet_house(sat_lon, houses_other)
            if house_sat == 7:
                w = 0.70; max_possible += w; raw_score += w * 0.85
                indicators.append(MarriageIndicator(
                    indicator_type="house_overlay",
                    planets=["Saturn"], aspect="placement",
                    tone="positive", weight=w,
                    reading=(f"Person {person_label}'s Saturn in the other's 7th house — "
                             "Saturn in the partnership house indicates seriousness, duty, "
                             "and long-term commitment. One of the most durable union indicators."),
                ))

    # 4. Composite Sun-Moon aspects
    if "Sun" in composite and "Moon" in composite:
        sun_lon = composite["Sun"]["longitude"]
        moon_lon = composite["Moon"]["longitude"]
        diff = _lon_diff(sun_lon, moon_lon)
        for angle, asp_name, tone_map in [(0,"conjunction","positive"),(120,"trine","strongly_positive"),(60,"sextile","positive"),(180,"opposition","challenging")]:
            if abs(diff - angle) <= 8:
                orb = abs(diff - angle)
                w = 0.90; max_possible += w
                contribution = w * (_orb_weight(orb) if "positive" in tone_map else 0.4 * _orb_weight(orb))
                raw_score += contribution
                indicators.append(MarriageIndicator(
                    indicator_type="composite",
                    planets=["Composite Sun","Composite Moon"], aspect=asp_name,
                    tone=tone_map, weight=w,
                    reading=(f"Composite Sun {asp_name} Composite Moon (orb {round(orb,1)}°) — "
                             f"{'the central bond indicator in the composite chart. ' if asp_name in ('conjunction','trine') else 'the composite chart shows tension between the relationship identity and emotional needs. '}"
                             f"{'Deep soul union.' if asp_name in ('conjunction','trine') else 'Conscious integration required.'}"),
                ))
                break

    # Normalise
    score = min(1.0, raw_score / max(1.0, max_possible))
    return round(score, 3), indicators


# Marriage reading map for specific combinations
_MARRIAGE_LONGEVITY_READING_MAP: Dict[Tuple[str,str,str],str] = {
    ("Sun","Moon","conjunction"): "the most powerful union indicator — solar consciousness and lunar emotion merge. Profoundly complementary natures.",
    ("Moon","Sun","conjunction"): "deep emotional-solar merger. Complementary natures creating wholeness.",
    ("Sun","Moon","trine"): "easy natural flow between identity and emotional need. Fundamental compatibility.",
    ("Moon","Saturn","conjunction"): "Saturn anchors Moon's emotional world — the classic longevity indicator. Stability, duty, and lasting commitment.",
    ("Venus","Mars","conjunction"): "the most potent attraction indicator. Physical and romantic magnetism.",
    ("Venus","Mars","trine"): "easy flow of attraction and desire. Natural physical compatibility.",
    ("Venus","Jupiter","trine"): "abundance and joy in love. Both people bring generosity to the union.",
    ("Moon","Moon","conjunction"): "emotional attunement at the deepest level — both people feel intuitively understood.",
    ("Sun","Sun","trine"): "fundamental identity compatibility — each person's core self resonates with the other's.",
    ("Venus","Venus","conjunction"): "shared values, aesthetic sensibility, and approach to love align perfectly.",
    ("Moon","Jupiter","conjunction"): "emotional expansion and optimism in the bond. Jupiter blesses the Moon's world.",
}


def _children_indicators(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
) -> List[ChildrenIndicator]:
    """Evaluate children timing and potential from synastry."""
    indicators: List[ChildrenIndicator] = []

    # Moon-Jupiter cross aspects — the primary fertility indicator
    for pa, pb in [("Moon","Jupiter"),("Jupiter","Moon")]:
        matching = [a for a in cross_aspects if a.planet_a==pa and a.planet_b==pb]
        if not matching: continue
        best = min(matching, key=lambda x: x.orb)
        if best.aspect in ("conjunction","trine","sextile"):
            indicators.append(ChildrenIndicator(
                indicator_type="moon_jupiter_aspect", planets=[pa,pb], aspect=best.aspect,
                tone="strongly_positive",
                reading=(f"A's {pa} {best.aspect} B's {pb} (orb {best.orb}°) — "
                         "the premier fertility and children indicator in synastry. "
                         "Jupiter blesses the Moon's nurturing instinct. "
                         "Children are cosmically supported in this union."),
            ))

    # Venus-Jupiter aspects — abundance and children
    for pa, pb in [("Venus","Jupiter"),("Jupiter","Venus")]:
        matching = [a for a in cross_aspects if a.planet_a==pa and a.planet_b==pb]
        if not matching: continue
        best = min(matching, key=lambda x: x.orb)
        if best.aspect in ("conjunction","trine","sextile"):
            indicators.append(ChildrenIndicator(
                indicator_type="venus_jupiter_aspect", planets=[pa,pb], aspect=best.aspect,
                tone="positive",
                reading=(f"A's {pa} {best.aspect} B's {pb} — "
                         "Venus-Jupiter harmony in synastry indicates abundance in love and creativity. "
                         "A traditional indicator of blessed children."),
            ))

    # 5th house overlays
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        for planet in ["Jupiter","Moon","Sun","Venus"]:
            if planet not in positions_person: continue
            lon_p = positions_person[planet]["longitude"]
            sign_p = positions_person[planet].get("sign","")
            if _find_planet_house(lon_p, houses_other) == 5:
                tone = "strongly_positive" if planet == "Jupiter" else "positive"
                indicators.append(ChildrenIndicator(
                    indicator_type="fifth_house_overlay", planets=[planet],
                    aspect="placement", tone=tone,
                    reading=(f"Person {person_label}'s {planet} in {sign_p} falls in the "
                             f"other partner's 5th house of children and creativity. "
                             f"{'Jupiter here is the strongest traditional children blessing.' if planet=='Jupiter' else 'Activates the children house — a supportive indicator for progeny.'} "),
                ))

    # Rahu in 5th house of partner — karmic children destiny
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        if "Rahu" not in positions_person: continue
        lon_r = positions_person["Rahu"]["longitude"]
        if _find_planet_house(lon_r, houses_other) == 5:
            indicators.append(ChildrenIndicator(
                indicator_type="rahu_fifth_overlay", planets=["Rahu"],
                aspect="placement", tone="positive",
                reading=(f"Person {person_label}'s Rahu (North Node) falls in the other's 5th house — "
                         "a karmic children indicator. The soul's dharmic direction includes "
                         "parenthood and creative legacy through this union."),
            ))

    # Mars-Moon cross aspects — conception energy
    for pa, pb in [("Mars","Moon"),("Moon","Mars")]:
        matching = [a for a in cross_aspects if a.planet_a==pa and a.planet_b==pb]
        if not matching: continue
        best = min(matching, key=lambda x: x.orb)
        if best.aspect in ("conjunction","trine"):
            indicators.append(ChildrenIndicator(
                indicator_type="mars_moon_aspect", planets=[pa,pb], aspect=best.aspect,
                tone="positive",
                reading=(f"A's {pa} {best.aspect} B's {pb} — "
                         "Mars-Moon harmony indicates physical vitality flowing into nurturing. "
                         "A favourable indicator for conception energy."),
            ))
        elif best.aspect in ("square","opposition"):
            indicators.append(ChildrenIndicator(
                indicator_type="mars_moon_tension", planets=[pa,pb], aspect=best.aspect,
                tone="challenging",
                reading=(f"A's {pa} {best.aspect} B's {pb} — "
                         "Mars-Moon tension in synastry can indicate differing rhythms around "
                         "conception timing or parenting styles. Conscious alignment recommended."),
            ))

    return indicators


def _infidelity_indicators(
    pos_a: Dict, pos_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
) -> List[InfidelityIndicator]:
    """
    Evaluate structural infidelity risk factors and stabilising indicators.
    Note: these are structural observations, not predictions.
    Strong stabilising indicators must be weighed against risk factors.
    """
    indicators: List[InfidelityIndicator] = []

    # Risk factor aspects (planet pairs)
    for pa, pb, risky_aspects, weight in _INFIDELITY_RISK_PAIRS:
        for person_a_p, person_b_p in [(pa,pb),(pb,pa)]:
            matching = [a for a in cross_aspects
                       if a.planet_a==person_a_p and a.planet_b==person_b_p
                       and a.aspect in risky_aspects]
            if not matching: continue
            best = min(matching, key=lambda x: x.orb)
            ow = _orb_weight(best.orb)
            significance = round(weight * ow, 3)

            risk_readings = {
                ("Venus","Neptune","square"):   ("Venus-Neptune square — a romantic fantasy/idealization pattern. "
                    "One or both partners may project an ideal that the other cannot sustain. "
                    "Boundary clarity in love is essential."),
                ("Venus","Neptune","opposition"):("Venus-Neptune opposition — the love ideal and real partner become confused. "
                    "Spiritual or romantic escapism is a risk factor."),
                ("Mars","Neptune","square"):    ("Mars-Neptune square — desire and reality become misaligned. "
                    "Deceptive behaviour or self-deception around desire is a structural risk."),
                ("Venus","Uranus","conjunction"):("Venus-Uranus conjunction — strong need for freedom and novelty in love. "
                    "Conventional commitment may feel constraining."),
                ("Venus","Uranus","square"):    ("Venus-Uranus square — disruptive attraction patterns. "
                    "Freedom vs. commitment tension is structurally present."),
                ("Venus","Pluto","square"):     ("Venus-Pluto square — obsessive love dynamics with control undertones. "
                    "Power struggles around fidelity and possession may arise."),
                ("Jupiter","Venus","square"):   ("Jupiter-Venus square — tendency toward excess and boundary dissolution in pleasure. "
                    "Indulgence patterns require conscious management."),
            }
            reading_key = (pa, pb, best.aspect)
            reading = risk_readings.get(
                reading_key,
                f"A's {person_a_p}-B's {person_b_p} {best.aspect} — structural fidelity risk factor. Orb: {best.orb}°."
            )

            indicators.append(InfidelityIndicator(
                indicator_type=f"{person_a_p.lower()}_{person_b_p.lower()}_{best.aspect}",
                planets=[person_a_p, person_b_p], aspect=best.aspect,
                direction="risk_factor", significance=significance,
                reading=reading,
            ))

    # Stabilising factors
    # Moon-Saturn conjunction — the strongest stabilising indicator
    for pa, pb in [("Moon","Saturn"),("Saturn","Moon")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb and a.aspect=="conjunction"]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            indicators.append(InfidelityIndicator(
                indicator_type="moon_saturn_stabilising",
                planets=[pa, pb], aspect="conjunction",
                direction="stabilising", significance=round(0.90 * _orb_weight(best.orb), 3),
                reading=("Moon-Saturn conjunction in synastry — the most powerful commitment and "
                         "stability indicator. Saturn's structure gives the emotional bond "
                         "durability and seriousness. A strong counter-weight to risk factors."),
            ))

    # Venus-Saturn positive aspects — commitment to love
    for pa, pb in [("Venus","Saturn"),("Saturn","Venus")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("conjunction","trine","sextile")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            indicators.append(InfidelityIndicator(
                indicator_type="venus_saturn_stabilising",
                planets=[pa,pb], aspect=best.aspect,
                direction="stabilising", significance=round(0.75 * _orb_weight(best.orb), 3),
                reading=(f"A's {pa} {best.aspect} B's {pb} — "
                         "Venus-Saturn harmony indicates a serious, dutiful approach to love. "
                         "Both partners take commitment seriously. A structurally stabilising factor."),
            ))

    # Moon sign in freedom-oriented signs (individual risk modifier)
    for person_label, positions_person in [("A", pos_a), ("B", pos_b)]:
        moon_sign = positions_person.get("Moon", {}).get("sign", "")
        if moon_sign in _FREEDOM_MOON_SIGNS:
            indicators.append(InfidelityIndicator(
                indicator_type=f"moon_freedom_sign_{person_label.lower()}",
                planets=["Moon"], aspect="natal",
                direction="risk_factor", significance=0.40,
                reading=(f"Person {person_label}'s Moon in {moon_sign} — "
                         f"the {moon_sign} Moon has a natural orientation toward independence, "
                         f"variety, and freedom. In a committed union, this needs channels "
                         f"for genuine independence to avoid restlessness."),
            ))

    return indicators


def _dominance_profile(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
) -> DominanceProfile:
    """Assess power dynamics and leadership patterns in the union."""
    a_dominance_score = 0.0
    b_dominance_score = 0.0
    sub_readings: List[str] = []

    # A's Sun/Saturn/Mars aspecting B's Moon/Venus — A dominates
    for pa, pb, weight in [
        ("Sun","Moon",1.0), ("Saturn","Moon",0.9), ("Mars","Moon",0.8),
        ("Sun","Venus",0.7), ("Saturn","Venus",0.7), ("Mars","Venus",0.6),
    ]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("conjunction","square","opposition")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            contribution = weight * _orb_weight(best.orb)
            a_dominance_score += contribution
            sub_readings.append(
                f"A's {pa} {best.aspect} B's {pb} — A's {pa.lower()} energy "
                f"{'structures' if pa=='Saturn' else 'drives' if pa=='Mars' else 'illuminates'} "
                f"B's {pb.lower()} field."
            )

    # B's Sun/Saturn/Mars aspecting A's Moon/Venus — B dominates
    for pa, pb, weight in [
        ("Sun","Moon",1.0), ("Saturn","Moon",0.9), ("Mars","Moon",0.8),
        ("Sun","Venus",0.7), ("Saturn","Venus",0.7), ("Mars","Venus",0.6),
    ]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pb and a.planet_b==pa
                   and a.aspect in ("conjunction","square","opposition")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            contribution = weight * _orb_weight(best.orb)
            b_dominance_score += contribution
            sub_readings.append(
                f"B's {pb} {best.aspect} A's {pa} — B's {pb.lower()} energy "
                f"{'structures' if pb=='Saturn' else 'drives'} A's {pa.lower()} field."
            )

    # Positive mutual aspects — equality signals
    equality_aspects = [a for a in cross_aspects
                       if a.aspect in ("trine","sextile")
                       and a.planet_a in ("Venus","Moon","Sun")
                       and a.planet_b in ("Venus","Moon","Sun")]

    total = a_dominance_score + b_dominance_score
    imbalance = abs(a_dominance_score - b_dominance_score) / max(0.1, total)

    if total < 0.5 or (equality_aspects and imbalance < 0.2):
        dominant_person = "equal"
        dominance_type = "balanced"
        dominance_score = 0.0
        reading = ("Equal partnership dynamic — neither person structurally dominates. "
                   "Power and decision-making are naturally shared. "
                   "Mutual Venus/Moon harmony supports a balanced, collaborative union.")
    elif imbalance < 0.25:
        dominant_person = "conflicted"
        dominance_type = "conflicted"
        dominance_score = round(imbalance, 2)
        reading = ("Both partners carry similar structural authority. "
                   "Power dynamics are fluid and may shift by context. "
                   "Conscious agreements around leadership domains are recommended.")
    elif a_dominance_score > b_dominance_score:
        dominant_person = "person_a"
        dominant_planet = "saturn" if pos_a.get("Saturn") else "sun"
        dominance_type = f"{dominant_planet}_dominant"
        dominance_score = round(imbalance, 2)
        reading = (f"Person A holds the structural authority in this union (score: {round(a_dominance_score,2)} vs {round(b_dominance_score,2)}). "
                   "A's planetary energy shapes B's emotional and relational field. "
                   "Healthy only when A leads with awareness rather than control.")
    else:
        dominant_person = "person_b"
        dominant_planet = "saturn" if pos_b.get("Saturn") else "sun"
        dominance_type = f"{dominant_planet}_dominant"
        dominance_score = round(imbalance, 2)
        reading = (f"Person B holds the structural authority in this union (score: {round(b_dominance_score,2)} vs {round(a_dominance_score,2)}). "
                   "B's planetary energy shapes A's emotional and relational field. "
                   "Healthy only when B leads with awareness rather than control.")

    return DominanceProfile(
        dominant_person=dominant_person,
        dominance_type=dominance_type,
        dominance_score=dominance_score,
        reading=reading,
        sub_readings=sub_readings[:5],
    )


def _career_synergy(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
) -> CareerSynergy:
    """Evaluate career and professional synergy between the two people."""
    score = 0.5  # start neutral
    indicators: List[str] = []

    # Saturn-Sun positive aspects — professional respect
    for pa, pb in [("Saturn","Sun"),("Sun","Saturn")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("conjunction","trine","sextile")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            score += 0.15 * _orb_weight(best.orb)
            indicators.append(
                f"A's {pa} {best.aspect} B's {pb} — mutual professional respect and "
                "structured collaboration. Saturn gives authority, Sun gives vision."
            )

    # Jupiter-Saturn positive aspects — growth with structure
    for pa, pb in [("Jupiter","Saturn"),("Saturn","Jupiter")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("conjunction","trine","sextile")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            score += 0.12 * _orb_weight(best.orb)
            indicators.append(
                f"A's {pa} {best.aspect} B's {pb} — Jupiter expands what Saturn builds. "
                "Strong indicator for joint ventures, business, and financial growth."
            )

    # MC overlays — one person's planet in the other's 10th house
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        for planet in ["Sun","Jupiter","Saturn","Mars"]:
            if planet not in positions_person: continue
            if _find_planet_house(positions_person[planet]["longitude"], houses_other) == 10:
                score += 0.10
                sign_p = positions_person[planet].get("sign","")
                indicators.append(
                    f"Person {person_label}'s {planet} in {sign_p} falls in the "
                    f"other's 10th house of career — professional activation. "
                    f"{'Leadership and recognition flow from this contact.' if planet in ('Sun','Jupiter') else 'Structure and discipline are brought to the career domain.'}"
                )

    # Sun-Sun tension aspects — ego competition (negative for career synergy)
    sun_sun = [a for a in cross_aspects
               if a.planet_a=="Sun" and a.planet_b=="Sun"
               and a.aspect in ("square","opposition")]
    if sun_sun:
        score -= 0.10
        indicators.append(
            "Sun-Sun tension aspect — ego competition between partners. "
            "Both have strong individual identity drives that may create "
            "professional rivalry unless distinct domains are maintained."
        )

    # Mars-Mars tension — competitive friction
    mars_mars = [a for a in cross_aspects
                 if a.planet_a=="Mars" and a.planet_b=="Mars"
                 and a.aspect in ("square","opposition","conjunction")]
    if mars_mars:
        if mars_mars[0].aspect == "conjunction":
            score += 0.05
            indicators.append("Mars-Mars conjunction — shared drive and initiative. "
                              "Professional energy amplifies when working toward the same goal.")
        else:
            score -= 0.08
            indicators.append("Mars-Mars tension — competing drives and methods. "
                              "Professional collaboration requires clear role demarcation.")

    score = max(0.0, min(1.0, score))
    if score >= 0.75: level = "strong"
    elif score >= 0.55: level = "moderate"
    elif score >= 0.35: level = "weak"
    else: level = "conflicted"

    reading = (f"Career synergy: {level} (score {round(score,2)}). "
               f"{'Excellent professional partnership potential — complementary strengths.' if level=='strong' else 'Moderate career alignment — some collaborative and some competing energies.' if level=='moderate' else 'Career paths are largely independent — each should maintain separate professional domains.' if level=='weak' else 'Significant career friction — professional boundary clarity is essential.'}")

    return CareerSynergy(synergy_level=level, score=round(score,3), indicators=indicators[:6], reading=reading)


def _health_cross_impact(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
    cross_aspects: List[SynastryCrossAspect],
) -> HealthCrossImpact:
    """Assess how each person's chart impacts the other's health."""
    score = 0.6  # start slightly positive
    indicators: List[str] = []

    # Neptune-Sun hard aspects — vitality drain
    for pa, pb in [("Neptune","Sun"),("Sun","Neptune")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("square","opposition","conjunction")]
        if matching:
            best = min(matching, key=lambda x: x.orb)
            score -= 0.12 * _orb_weight(best.orb)
            indicators.append(
                f"A's {pa} {best.aspect} B's {pb} — Neptune contacts the Sun create "
                "a subtle vitality drain over time. Boundaries and energy management "
                "between the two people are important for long-term health."
            )

    # Saturn-Sun/Moon hard aspects — health pressure
    for pa, pb in [("Saturn","Sun"),("Saturn","Moon"),("Sun","Saturn"),("Moon","Saturn")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("square","opposition")]
        if matching:
            score -= 0.08
            indicators.append(
                f"A's {pa} square/opposition B's {pb} — chronic pressure pattern. "
                "One person's Saturn may limit the other's vitality or emotional freedom. "
                "Stress management and independent health practices are important."
            )

    # Mars-Mars/Saturn hard aspects — physical stress
    for pa, pb in [("Mars","Saturn"),("Saturn","Mars")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("square","opposition","conjunction")]
        if matching:
            score -= 0.08
            indicators.append(
                "Mars-Saturn cross aspect — physical tension and frustration patterns. "
                "Exercise and physical activity serve as important health regulators for this pair."
            )

    # 6th house overlays — health house activation
    for person_label, positions_person, houses_other in [
        ("A", pos_a, houses_b), ("B", pos_b, houses_a)
    ]:
        for planet in ["Jupiter","Venus","Sun"]:
            if planet not in positions_person: continue
            if _find_planet_house(positions_person[planet]["longitude"], houses_other) == 6:
                if planet == "Jupiter":
                    score += 0.10
                    indicators.append(f"Person {person_label}'s Jupiter activates the other's 6th house — "
                                     "healing and health expansion. Jupiter in the health house brings "
                                     "optimism and recovery capacity.")
                elif planet in ("Venus","Sun"):
                    score += 0.06
                    indicators.append(f"Person {person_label}'s {planet} in the other's 6th house — "
                                     "gentle positive activation of the health domain.")

        for planet in ["Saturn","Mars","Neptune"]:
            if planet not in positions_person: continue
            if _find_planet_house(positions_person[planet]["longitude"], houses_other) == 6:
                score -= 0.10
                indicators.append(
                    f"Person {person_label}'s {planet} activates the other's 6th house — "
                    f"{'chronic health focus or health limitation' if planet=='Saturn' else 'physical stress and inflammation triggers' if planet=='Mars' else 'confusion or hidden health issues'}. "
                    "Preventive health practices are especially important."
                )

    # Moon-Venus harmony — emotional health support
    for pa, pb in [("Moon","Venus"),("Venus","Moon")]:
        matching = [a for a in cross_aspects
                   if a.planet_a==pa and a.planet_b==pb
                   and a.aspect in ("conjunction","trine","sextile")]
        if matching:
            score += 0.08
            indicators.append(
                f"A's {pa} {matching[0].aspect} B's {pb} — "
                "emotional nourishment flows between the two people. "
                "Each supports the other's emotional and physical wellbeing."
            )

    score = max(0.0, min(1.0, score))
    if score >= 0.70: level = "supportive"
    elif score >= 0.45: level = "neutral"
    else: level = "stressful"

    reading = (
        f"Health cross-impact: {level} (score {round(score,2)}). "
        f"{'The synastry is generally supportive of both partners health and vitality.' if level=='supportive' else 'Health impacts are mixed — some supportive contacts, some stress patterns.' if level=='neutral' else 'Multiple health stress patterns in the synastry. Proactive individual health practices and clear energetic boundaries are important for this pair.'}"
    )

    return HealthCrossImpact(impact_level=level, score=round(score,3), indicators=indicators[:6], reading=reading)


def _death_order_assessment(
    pos_a: Dict, pos_b: Dict,
    houses_a: Dict, houses_b: Dict,
) -> DeathOrderAssessment:
    """
    Assess structural longevity indicators from each natal chart.
    Returns a comparative assessment of likely death order.
    Note: this is a structural probability assessment only,
    not a prediction. Many other factors (lifestyle, environment)
    are far stronger determinants.
    """
    score_a = 0.5
    score_b = 0.5
    indicators: List[str] = []

    def _longevity_score(positions: Dict, houses: Dict, label: str) -> float:
        """Score one person's longevity indicators 0.0–1.0."""
        s = 0.5

        # Saturn strength (Saturn rules longevity in both systems)
        sat_sign = positions.get("Saturn",{}).get("sign","")
        if sat_sign in _DIGNIFIED_SIGNS.get("Saturn",[]):
            s += 0.15; indicators.append(f"{label}'s Saturn dignified in {sat_sign} — strong structural longevity indicator.")
        elif sat_sign in _DEBILITATED_SIGNS.get("Saturn",[]):
            s -= 0.10; indicators.append(f"{label}'s Saturn debilitated in {sat_sign} — longevity may require more conscious support.")

        # 8th house emphasis — strong 8th house = strong death/transformation cycle = often longer life
        eighth_planets = [p for p,d in positions.items()
                         if _find_planet_house(d["longitude"], houses) == 8
                         and p not in ("Pluto","Saturn")]
        if eighth_planets:
            s += 0.05 * min(len(eighth_planets), 2)
            indicators.append(f"{label}'s 8th house emphasis ({', '.join(eighth_planets)}) — strong relationship with cycles of regeneration.")

        # Jupiter in 1st/8th/11th — longevity blessing
        if "Jupiter" in positions:
            jh = _find_planet_house(positions["Jupiter"]["longitude"], houses)
            if jh in (1, 8, 11):
                s += 0.12
                indicators.append(f"{label}'s Jupiter in the {jh}th house — a classical longevity and vitality blessing.")

        # Saturn in 8th — delays endings, associated with long life
        if "Saturn" in positions:
            sh = _find_planet_house(positions["Saturn"]["longitude"], houses)
            if sh == 8:
                s += 0.10
                indicators.append(f"{label}'s Saturn in the 8th house — traditional indicator of delayed endings and constitutional endurance.")

        # Sun strength
        sun_sign = positions.get("Sun",{}).get("sign","")
        if sun_sign in _DIGNIFIED_SIGNS.get("Sun",[]):
            s += 0.08; indicators.append(f"{label}'s Sun dignified in {sun_sign} — strong life force.")
        elif sun_sign in _DEBILITATED_SIGNS.get("Sun",[]):
            s -= 0.06

        return max(0.0, min(1.0, s))

    score_a = _longevity_score(pos_a, houses_a, "Person A")
    score_b = _longevity_score(pos_b, houses_b, "Person B")

    diff = abs(score_a - score_b)
    if diff < 0.08:
        order = "unclear"
        confidence = "low"
        reading = ("Longevity indicators are closely matched between the two charts. "
                   "No structural indication of which partner is likely to transition first. "
                   "Lifestyle factors are the dominant determinant.")
    elif score_a > score_b:
        order = "person_b_first"
        confidence = "moderate" if diff > 0.15 else "low"
        reading = (f"Person A's chart shows marginally stronger longevity indicators "
                   f"(A: {round(score_a,2)}, B: {round(score_b,2)}). "
                   f"Structurally, Person B may be the first to transition — though this "
                   f"is a tendency indicator only, not a prediction.")
    else:
        order = "person_a_first"
        confidence = "moderate" if diff > 0.15 else "low"
        reading = (f"Person B's chart shows marginally stronger longevity indicators "
                   f"(B: {round(score_b,2)}, A: {round(score_a,2)}). "
                   f"Structurally, Person A may be the first to transition — though this "
                   f"is a tendency indicator only, not a prediction.")

    return DeathOrderAssessment(
        likely_order=order, confidence=confidence,
        longevity_score_a=round(score_a,3), longevity_score_b=round(score_b,3),
        indicators=indicators[:6], reading=reading,
    )


def _compatibility_score(
    cross_aspects: List[SynastryCrossAspect],
    marriage_score: float,
    career: CareerSynergy,
    health: HealthCrossImpact,
    children_indicators: List[ChildrenIndicator],
    dominance: DominanceProfile,
) -> CompatibilityScore:
    """Compute multi-dimensional 0.0–1.0 compatibility scores."""

    def _domain_score(domain: str) -> float:
        """Score a specific domain from cross-aspects."""
        relevant = [a for a in cross_aspects if a.domain == domain]
        if not relevant: return 0.55  # neutral baseline
        pos = sum(a.weight for a in relevant if "positive" in a.tone)
        neg = sum(a.weight for a in relevant if "challenging" in a.tone)
        total = pos + neg
        if total == 0: return 0.55
        return min(1.0, max(0.0, 0.40 + (pos / total) * 0.60))

    love      = min(1.0, marriage_score * 0.7 + _domain_score("love") * 0.3)
    career_s  = career.score
    health_s  = health.score
    spiritual = _domain_score("spiritual")
    wealth_s  = _domain_score("wealth")
    character = _domain_score("character")
    children_s = (
        min(1.0, 0.50 + 0.15 * sum(1 for c in children_indicators if c.tone in ("positive","strongly_positive")))
        if children_indicators else 0.50
    )

    # Weighted overall
    overall = (
        love        * _COMPAT_WEIGHTS["love"] +
        career_s    * _COMPAT_WEIGHTS["career"] +
        wealth_s    * _COMPAT_WEIGHTS["wealth"] +
        health_s    * _COMPAT_WEIGHTS["health"] +
        spiritual   * _COMPAT_WEIGHTS["spiritual"] +
        children_s  * _COMPAT_WEIGHTS["children_forecast"] +
        character   * _COMPAT_WEIGHTS["character"]
    )
    # Dominance penalty
    if dominance.dominant_person == "conflicted":
        overall *= 0.92

    overall = max(0.0, min(1.0, overall))

    if overall >= 0.80: level = "excellent"
    elif overall >= 0.65: level = "strong"
    elif overall >= 0.50: level = "moderate"
    elif overall >= 0.35: level = "challenging"
    else: level = "difficult"

    overview = (
        f"Overall compatibility: {level} (score {round(overall,2)}). "
        f"{'A deeply compatible pair with strong mutual support across all domains.' if level=='excellent' else 'A strong connection with genuine mutual resonance and some growth areas.' if level=='strong' else 'A moderately compatible pair with meaningful connection and significant growth edges.' if level=='moderate' else 'A challenging combination requiring conscious work in multiple domains.' if level=='challenging' else 'A structurally difficult pairing requiring substantial personal development work from both partners.'}"
    )

    return CompatibilityScore(
        overall=round(overall,3), love=round(love,3), career=round(career_s,3),
        wealth=round(wealth_s,3), health=round(health_s,3), spiritual=round(spiritual,3),
        children_forecast=round(children_s,3), character=round(character,3),
        level=level, overview=overview,
    )


def _build_synastry_signals(
    cross_aspects: List[SynastryCrossAspect],
    marriage_indicators: List[MarriageIndicator],
    children_indicators: List[ChildrenIndicator],
    compatibility: CompatibilityScore,
    system: str,
) -> List[Dict]:
    """Build collector.py-ready signals from synastry analysis."""
    signals: List[Dict] = []

    # Top cross-aspect signals
    for asp in cross_aspects[:12]:
        signals.append({
            "feature": f"synastry_{asp.planet_a.lower()}_{asp.aspect}_{asp.planet_b.lower()}",
            "domain": asp.domain,
            "tone": asp.tone,
            "strength": asp.weight,
            "reading": asp.reading,
            "keywords": asp.keywords,
            "astro_affinity": [asp.planet_a, asp.planet_b],
            "numerology_link": _planet_numerology(asp.planet_a),
            "chinese_element": None,
            "temporal_phase": "timeless",
            "retrograde": False,
            "house": None,
            "system": system,
        })

    # Marriage indicator signals
    for ind in marriage_indicators[:6]:
        signals.append({
            "feature": f"marriage_{ind.indicator_type}",
            "domain": "love",
            "tone": ind.tone,
            "strength": ind.weight,
            "reading": ind.reading,
            "keywords": [p.lower() for p in ind.planets] + ["marriage_longevity"],
            "astro_affinity": ind.planets,
            "numerology_link": [],
            "chinese_element": None,
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Children indicator signals
    for ind in children_indicators[:4]:
        signals.append({
            "feature": f"children_{ind.indicator_type}",
            "domain": "children_forecast",
            "tone": ind.tone,
            "strength": 0.80,
            "reading": ind.reading,
            "keywords": [p.lower() for p in ind.planets] + ["children_forecast"],
            "astro_affinity": ind.planets,
            "numerology_link": [],
            "chinese_element": None,
            "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": system,
        })

    # Overall compatibility signal
    signals.append({
        "feature": "synastry_overall_compatibility",
        "domain": "love",
        "tone": "strongly_positive" if compatibility.level in ("excellent","strong") else "positive" if compatibility.level=="moderate" else "challenging",
        "strength": compatibility.overall,
        "reading": compatibility.overview,
        "keywords": ["compatibility","synastry","union",compatibility.level],
        "astro_affinity": [], "numerology_link": [], "chinese_element": None,
        "temporal_phase": "timeless", "retrograde": False, "house": None, "system": system,
    })

    return signals


def _union_remedies(
    compatibility: CompatibilityScore,
    infidelity_indicators: List[InfidelityIndicator],
    dominance: DominanceProfile,
    career: CareerSynergy,
    health: HealthCrossImpact,
) -> List[str]:
    """Generate 7-category union remedies based on the synastry profile."""
    remedies: List[str] = []
    risk_count = sum(1 for i in infidelity_indicators if i.direction=="risk_factor")

    remedies.append(
        f"SPIRITUAL: Establish a shared spiritual practice — weekly meditation, prayer, or ceremonial ritual. "
        f"The composite chart suggests {'a devotional or contemplative practice' if compatibility.spiritual >= 0.65 else 'nature-based or movement practices'} as the most resonant form."
    )

    if compatibility.love < 0.60:
        remedies.append(
            "RELATIONSHIP: Daily non-transactional connection time (minimum 20 minutes). "
            "Scheduled weekly 'relationship council' — a designated time for genuine emotional check-in without agenda."
        )
    else:
        remedies.append(
            "RELATIONSHIP: Maintain the connection practices that already work naturally. "
            "The love connection is structurally strong — regular quality time sustains it."
        )

    if risk_count >= 2:
        remedies.append(
            "FIDELITY: Establish explicit agreements around independence, privacy, and relational boundaries. "
            "Multiple structural risk factors are present — the remedy is not restriction but clarity. "
            "Define what fidelity means to both partners in concrete, agreed terms."
        )
    else:
        remedies.append(
            "FIDELITY: The structural fidelity profile is reasonably stable. "
            "Maintain transparency, shared social circles, and regular honest check-ins about needs."
        )

    if dominance.dominant_person not in ("equal","conflicted"):
        dominant = "Person A" if dominance.dominant_person == "person_a" else "Person B"
        other = "Person B" if dominance.dominant_person == "person_a" else "Person A"
        remedies.append(
            f"POWER: The synastry shows {dominant} in the structurally dominant position. "
            f"Remedy: {other} consciously claims leadership in specific agreed domains (finances, social, creative). "
            f"Rotating authority prevents resentment and over-dependence."
        )
    else:
        remedies.append(
            "POWER: Equal or balanced power dynamics. "
            "Periodic explicit conversations about roles and decision-making domains keep the balance healthy."
        )

    if career.synergy_level in ("weak","conflicted"):
        remedies.append(
            "CAREER: Maintain separate professional identities and spaces. "
            "Celebrate individual achievements without competition. "
            "Career synergy in this chart is best found in complementary rather than shared domains."
        )
    else:
        remedies.append(
            "CAREER: Strong career synergy — consider deliberate professional collaboration. "
            "Joint ventures, complementary businesses, or shared professional networks amplify both."
        )

    if health.impact_level == "stressful":
        remedies.append(
            "HEALTH: This synastry carries health stress patterns. "
            "Individual health sovereignty is the key remedy — each partner maintains their own health practice "
            "without dependency on the other's energy. Shared calming practices (yoga, nature walks, breathwork) "
            "convert the stress patterns into bonding."
        )
    else:
        remedies.append(
            "HEALTH: The health synastry is supportive. "
            "Shared physical activity and cooking practices amplify the natural vitality connection."
        )

    if compatibility.wealth < 0.50:
        remedies.append(
            "WEALTH: Separate finances with a defined joint contribution structure. "
            "Wealth values differ structurally — transparency and agreed financial goals "
            "prevent the wealth domain from creating friction."
        )
    else:
        remedies.append(
            "WEALTH: Shared wealth-building practices align with the synastry. "
            "Joint investment in tangible assets (property, business) aligns with the composite chart."
        )

    return remedies


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class SynastryEngine:
    """
    Stateless, thread-safe synastry analysis engine.

    Takes birth data for two people, computes comprehensive cross-chart
    analysis, and returns a SynastryProfile for the Logic Layer.

    Usage:
        engine = SynastryEngine()
        profile = engine.compute(
            day_a=15, month_a=3, year_a=1985, hour_a=14.5,
            lat_a=3.147, lon_a=101.695, utc_a=8.0,
            day_b=22, month_b=7, year_b=1988, hour_b=9.0,
            lat_b=3.147, lon_b=101.695, utc_b=8.0,
        )
        signals = profile.synastry_signals  # → collector.py
        narrative = profile.to_dict()       # → llm_narrator.py
    """

    def compute(
        self,
        # Person A birth data
        day_a: int, month_a: int, year_a: int,
        hour_a: float, lat_a: float, lon_a: float, utc_a: float,
        # Person B birth data
        day_b: int, month_b: int, year_b: int,
        hour_b: float, lat_b: float, lon_b: float, utc_b: float,
        # Options
        system: str = "western",
        person_a_label: str = "Person A",
        person_b_label: str = "Person B",
        numerology_lp_a: Optional[int] = None,
        numerology_lp_b: Optional[int] = None,
    ) -> SynastryProfile:
        """
        Compute a complete synastry profile.

        Args:
            day_a/b, month_a/b, year_a/b:  Birth date for each person
            hour_a/b:  Local birth hour as decimal (12.0 if unknown)
            lat_a/b:   Birth latitude (+N)
            lon_a/b:   Birth longitude (+E)
            utc_a/b:   UTC offset at birth location
            system:    "western" (tropical Placidus) or "vedic" (sidereal Lahiri)
            person_a_label:  Display label for Person A
            person_b_label:  Display label for Person B
            numerology_lp_a/b:  Optional pre-computed Life Path numbers for
                                 numerology cross-reference

        Returns:
            SynastryProfile — complete synastry analysis payload
        """
        import time
        t0 = time.monotonic()

        use_sidereal = (system == "vedic")
        house_sys    = _HOUSE_WHOLE if use_sidereal else _HOUSE_PLACIDUS

        # ── Julian Days ────────────────────────────────────────────────────
        jd_a = _julian_day(year_a, month_a, day_a, hour_a, utc_a)
        jd_b = _julian_day(year_b, month_b, day_b, hour_b, utc_b)

        # ── Natal charts ──────────────────────────────────────────────────
        pos_a    = _calculate_positions(jd_a, use_sidereal)
        pos_b    = _calculate_positions(jd_b, use_sidereal)
        houses_a = _calculate_houses(jd_a, lat_a, lon_a, house_sys, use_sidereal)
        houses_b = _calculate_houses(jd_b, lat_b, lon_b, house_sys, use_sidereal)

        # ── Cross-chart analysis ──────────────────────────────────────────
        cross_aspects = _synastry_cross_aspects(pos_a, pos_b, system)

        # ── Composite chart ───────────────────────────────────────────────
        composite = _composite_positions(pos_a, pos_b)

        # ── Domain assessments ────────────────────────────────────────────
        marriage_score, marriage_indicators = _marriage_longevity_score(
            pos_a, pos_b, houses_a, houses_b, cross_aspects, composite
        )
        children_inds   = _children_indicators(pos_a, pos_b, houses_a, houses_b, cross_aspects)
        infidelity_inds = _infidelity_indicators(pos_a, pos_b, cross_aspects)
        dominance       = _dominance_profile(pos_a, pos_b, houses_a, houses_b, cross_aspects)
        career          = _career_synergy(pos_a, pos_b, houses_a, houses_b, cross_aspects)
        health          = _health_cross_impact(pos_a, pos_b, houses_a, houses_b, cross_aspects)
        death_order     = _death_order_assessment(pos_a, pos_b, houses_a, houses_b)

        # ── Compatibility ─────────────────────────────────────────────────
        compatibility = _compatibility_score(
            cross_aspects, marriage_score, career, health, children_inds, dominance
        )

        # ── Remedies ──────────────────────────────────────────────────────
        remedies = _union_remedies(compatibility, infidelity_inds, dominance, career, health)

        # ── Synastry signals for collector.py ─────────────────────────────
        signals = _build_synastry_signals(
            cross_aspects, marriage_indicators, children_inds, compatibility, system
        )

        # ── Optional numerology LP compatibility ──────────────────────────
        lp_compat_str: Optional[str] = None
        if NUMEROLOGY_AVAILABLE and numerology_lp_a and numerology_lp_b:
            try:
                lp_compat = life_path_compatibility(numerology_lp_a, numerology_lp_b)
                lp_compat_str = lp_compat.get("reading", None)
            except Exception as e:
                logger.debug(f"Numerology LP compat failed: {e}")

        ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "SynastryEngine.compute completed",
            extra={
                "system":            system,
                "cross_aspects":     len(cross_aspects),
                "marriage_score":    marriage_score,
                "marriage_indicators": len(marriage_indicators),
                "children_indicators": len(children_inds),
                "infidelity_indicators": len(infidelity_inds),
                "dominance":         dominance.dominant_person,
                "compatibility":     compatibility.level,
                "compatibility_score": compatibility.overall,
                "signals_count":     len(signals),
                "reading_ms":        ms,
            },
        )

        return SynastryProfile(
            person_a_label=person_a_label,
            person_b_label=person_b_label,
            system=system,
            cross_aspects=cross_aspects,
            composite=composite,
            marriage_longevity=marriage_score,
            marriage_indicators=marriage_indicators,
            children_indicators=children_inds,
            infidelity_indicators=infidelity_inds,
            dominance=dominance,
            career_synergy=career,
            health_cross_impact=health,
            death_order=death_order,
            compatibility=compatibility,
            union_remedies=remedies,
            synastry_signals=signals,
            numerology_lp_compatibility=lp_compat_str,
            reading_ms=ms,
        )


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def compute_synastry_profile(
    day_a: int, month_a: int, year_a: int,
    hour_a: float, lat_a: float, lon_a: float, utc_a: float,
    day_b: int, month_b: int, year_b: int,
    hour_b: float, lat_b: float, lon_b: float, utc_b: float,
    system: str = "western",
    person_a_label: str = "Person A",
    person_b_label: str = "Person B",
    numerology_lp_a: Optional[int] = None,
    numerology_lp_b: Optional[int] = None,
) -> SynastryProfile:
    """
    Module-level convenience wrapper for SynastryEngine.compute().
    Instantiates engine and returns the profile in one call.

    Example:
        profile = compute_synastry_profile(
            day_a=15, month_a=3, year_a=1985, hour_a=14.5,
            lat_a=3.147, lon_a=101.695, utc_a=8.0,
            day_b=22, month_b=7, year_b=1988, hour_b=9.0,
            lat_b=3.147, lon_b=101.695, utc_b=8.0,
            person_a_label="David", person_b_label="Sarah",
            numerology_lp_a=5, numerology_lp_b=3,
        )
        print(profile.compatibility.overview)
        print(profile.marriage_longevity)
        print(len(profile.synastry_signals), "signals for collector")
    """
    return SynastryEngine().compute(
        day_a, month_a, year_a, hour_a, lat_a, lon_a, utc_a,
        day_b, month_b, year_b, hour_b, lat_b, lon_b, utc_b,
        system=system,
        person_a_label=person_a_label,
        person_b_label=person_b_label,
        numerology_lp_a=numerology_lp_a,
        numerology_lp_b=numerology_lp_b,
    )
