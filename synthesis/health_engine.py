"""
Health Engine — KAYAL Synthesis Platform
=========================================
Constitutional health analysis for the Individual Blueprint.

Position in the pipeline:
    Natal positions (astrology_engine)
    Numerology data (numerology_engine)
    Palm health markers (palm_engine v4.0.0, optional)
    Face health markers (face_engine v3.0.0, optional)
         ↓
    HealthEngine.compute()
         ↓
    HealthProfile  →  Logic Layer  →  LLM Narrator  →  Blueprint PDF

IMPORTANT DISCLAIMER:
    This engine identifies structural indicators and constitutional tendencies
    from astrological, numerological, and biometric data.
    It does NOT diagnose medical conditions.
    All outputs are framed as structural tendencies and potential areas
    requiring awareness — not predictions, diagnoses, or prognoses.
    The KAYAL platform is not a substitute for qualified medical advice.

Responsibility:
    Produce a HealthProfile covering nine assessment categories:
    A. Constitution + Dosha    — fundamental body type (Vata/Pitta/Kapha)
    B. Vitality Score          — overall life force from Sun, Mars, 1st house
    C. Health Vulnerabilities  — specific weak points by planet/sign/house
    D. Organ System Map        — 12 body systems vulnerability assessment
    E. Mental Health Pattern   — anxiety, depression, obsessive, scattered
    F. Longevity Assessment    — structural longevity from Saturn, 8th, Jupiter
    G. Multi-source Integration — palm + face health markers incorporated
    H. Health Signals          — collector.py-ready signals (domain="health")
    I. Remedies                — lifestyle, dietary, exercise, mental (4 categories)

Knowledge sources:
    Cornell, Howard  — "Encyclopaedia of Medical Astrology" (1933)
    Davidson, Ronald — "Astrology" (medical chapters)
    Nauman, Eileen   — "Medical Astrology" (1982)
    Frawley, David   — "The Astrology of the Seers" (Vedic/Ayurvedic)
    Lad, Vasant      — "Ayurveda: The Science of Self-Healing"
    Chinese Medicine — Huang Di Nei Jing (Five Element correspondences)
    Cheiro           — "Palmistry for All" (hand health indicators)
    Hippocrates      — Humoural theory (foundational medical astrology basis)

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from .astrology_engine import (
        _find_planet_house,
        _DIGNIFIED_SIGNS,
        _DEBILITATED_SIGNS,
        SWE_AVAILABLE,
    )
    ASTRO_AVAILABLE = True
except ImportError:
    ASTRO_AVAILABLE = False
    SWE_AVAILABLE   = False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

class Magnitude(str, Enum):
    HIGH     = "high"
    MODERATE = "moderate"
    LOW      = "low"
    UNCLEAR  = "unclear"


# Western medical astrology: planet → primary body systems
_PLANET_BODY: Dict[str, List[str]] = {
    "Sun":     ["heart", "spine", "vitality", "eyes", "life_force"],
    "Moon":    ["digestion", "lymph", "stomach", "hormones", "fluids", "breast"],
    "Mercury": ["nervous_system", "lungs", "hands", "respiratory", "thyroid"],
    "Venus":   ["kidneys", "skin", "throat", "veins", "reproductive_female"],
    "Mars":    ["muscles", "blood", "inflammation", "adrenals", "fever", "iron"],
    "Jupiter": ["liver", "pituitary", "fat_tissue", "arteries", "insulin"],
    "Saturn":  ["bones", "teeth", "joints", "skin_chronic", "knees", "gallbladder"],
    "Uranus":  ["nervous_electrical", "ankles", "sudden_disruption"],
    "Neptune": ["immune", "lymph_subtle", "addictions", "feet", "chronic_fatigue"],
    "Pluto":   ["reproductive_deep", "regeneration", "detox", "cellular", "colon"],
    "Rahu":    ["obsessive_patterns", "unusual_conditions", "foreign_elements"],
}

# Zodiac sign → body zone (Western rulership)
_SIGN_BODY: Dict[str, Tuple[str, str]] = {
    # sign: (body_zone, ayurvedic_note)
    "Aries":       ("head, face, brain",                    "Pitta — sharp, inflammatory"),
    "Taurus":      ("throat, neck, thyroid, vocal cords",   "Kapha — stable, slow"),
    "Gemini":      ("lungs, arms, hands, nervous system",   "Vata — variable, nervous"),
    "Cancer":      ("chest, stomach, breasts, lymph",       "Kapha — fluid, retentive"),
    "Leo":         ("heart, spine, upper back",             "Pitta — vital, hot"),
    "Virgo":       ("intestines, digestion, pancreas",      "Vata — analytical, nervous"),
    "Libra":       ("kidneys, lower back, adrenal glands",  "Vata — balanced, airy"),
    "Scorpio":     ("reproductive, excretory, colon",       "Pitta — intense, deep"),
    "Sagittarius": ("hips, thighs, liver, sciatic nerve",   "Pitta/Vata — expansive"),
    "Capricorn":   ("bones, knees, joints, skin, teeth",    "Vata — dry, cold, structured"),
    "Aquarius":    ("ankles, calves, circulation, nerves",  "Vata — erratic, electrical"),
    "Pisces":      ("feet, immune system, lymph",           "Kapha — fluid, diffuse"),
}

# Element → Ayurvedic dosha mapping
_ELEMENT_DOSHA: Dict[str, str] = {
    "fire":  "pitta",
    "earth": "kapha",
    "air":   "vata",
    "water": "kapha",  # water = kapha (moisture) or pitta (heat) in Ayurveda
}

# Signs by dosha
_PITTA_SIGNS  = {"Aries", "Leo", "Scorpio", "Sagittarius"}
_VATA_SIGNS   = {"Gemini", "Virgo", "Libra", "Capricorn", "Aquarius"}
_KAPHA_SIGNS  = {"Taurus", "Cancer", "Pisces"}

# Planets by dosha ruler
_PITTA_PLANETS  = {"Sun", "Mars"}
_VATA_PLANETS   = {"Mercury", "Saturn", "Uranus", "Rahu"}
_KAPHA_PLANETS  = {"Moon", "Venus", "Jupiter", "Neptune"}

# Chinese 5-element organ correspondences
_CHINESE_ELEMENT_ORGANS: Dict[str, Dict] = {
    "wood":  {"organ": "liver/gallbladder", "season": "spring", "emotion": "anger/creativity"},
    "fire":  {"organ": "heart/small intestine", "season": "summer", "emotion": "joy/anxiety"},
    "earth": {"organ": "spleen/stomach", "season": "late summer", "emotion": "worry/overthinking"},
    "metal": {"organ": "lung/large intestine", "season": "autumn", "emotion": "grief/letting go"},
    "water": {"organ": "kidney/bladder", "season": "winter", "emotion": "fear/wisdom"},
}

# Numerology LP → primary health focus
_LP_HEALTH: Dict[int, Dict] = {
    1:  {"system": "cardiovascular, spine", "planet": "Sun",     "focus": "heart and vitality"},
    2:  {"system": "digestion, hormonal",   "planet": "Moon",    "focus": "stomach and emotional body"},
    3:  {"system": "respiratory, nervous",  "planet": "Jupiter", "focus": "lungs and expansive energy"},
    4:  {"system": "structural, skeletal",  "planet": "Saturn",  "focus": "bones and joints"},
    5:  {"system": "nervous, respiratory",  "planet": "Mercury", "focus": "nervous system and lungs"},
    6:  {"system": "renal, throat, skin",   "planet": "Venus",   "focus": "kidneys and skin"},
    7:  {"system": "skeletal, immune",      "planet": "Neptune", "focus": "immune and mysterious conditions"},
    8:  {"system": "circulatory, structural","planet": "Saturn", "focus": "endocrine and structural"},
    9:  {"system": "inflammatory, immune",  "planet": "Mars",    "focus": "inflammation and immune response"},
    11: {"system": "nervous, adrenal",      "planet": "Moon",    "focus": "nervous sensitivity and adrenals"},
    22: {"system": "systemic, structural",  "planet": "Uranus",  "focus": "systemic integration"},
    33: {"system": "emotional body, heart", "planet": "Venus",   "focus": "heart and emotional health"},
}

# Houses with primary health significance
_HEALTH_HOUSES = {
    1:  "constitution and physical body",
    6:  "health and illness — the primary health house",
    8:  "chronic illness, surgery, regeneration, longevity",
    12: "hidden illness, hospitalisation, immune, confinement",
}

# Organ systems for mapping
_ORGAN_SYSTEMS = [
    "cardiovascular", "digestive", "nervous", "endocrine",
    "musculoskeletal", "respiratory", "immune", "reproductive",
    "renal", "integumentary", "hepatic", "lymphatic",
]


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class HealthVulnerability:
    """
    A structural health vulnerability indicator.
    Severity indicates the weight of the indicator — not the certainty of illness.
    Management provides specific, actionable guidance.
    """
    system:            str       # body system: "cardiovascular", "digestive", etc.
    severity:          Magnitude # HIGH indicator (not high certainty of illness)
    planet_indicator:  str       # which planet/sign/house/aspect triggers this
    note:              str       # plain language description
    management:        str       # specific management recommendation
    chinese_element:   Optional[str] = None  # TCM element context
    ayurvedic_dosha:   Optional[str] = None  # Ayurvedic context


@dataclass
class OrganSystemProfile:
    """Vulnerability assessment for a specific body system."""
    system:              str
    vulnerability_level: Magnitude
    astro_indicator:     str
    ayurvedic_element:   str   # vata / pitta / kapha / balanced
    chinese_element:     str   # wood / fire / earth / metal / water / balanced
    note:                str


@dataclass
class MentalHealthProfile:
    """
    Mental and emotional health pattern from the natal chart.
    Identified from Mercury, Moon, Saturn, Neptune, and 12th house indicators.
    Always framed as tendencies, never as diagnoses.
    """
    primary_pattern:    str        # "anxiety_tendency", "depressive_tendency",
                                   # "obsessive_tendency", "scattered_tendency", "resilient"
    indicators:         List[str]  # what planetary factors indicate this pattern
    strengths:          List[str]  # mental health strengths from the same chart
    note:               str        # plain language summary
    remedies:           List[str]  # specific mental wellness practices


@dataclass
class HealthProfile:
    """
    Complete constitutional health payload for the Logic Layer / LLM Narrator.

    Important: All content in this profile represents structural indicators
    and constitutional tendencies — not medical diagnoses or predictions.
    The Logic Layer must frame all health readings with appropriate epistemic
    humility and include the platform disclaimer.
    """
    # Constitution
    constitution_type: str    # "robust", "sensitive", "variable", "resilient", "mixed"
    dosha_tendency:    str    # Ayurvedic: "vata", "pitta", "kapha", "vata_pitta",
                              # "pitta_kapha", "vata_kapha", "tridoshic"
    chinese_element:   str    # primary TCM element

    # Vitality
    vitality_level:    Magnitude
    vitality_score:    float       # 0.0–1.0

    # Vulnerability profile
    vulnerabilities:   List[HealthVulnerability]

    # Organ system map
    organ_systems:     List[OrganSystemProfile]

    # Mental health
    mental_health:     MentalHealthProfile

    # Longevity
    longevity_score:   float       # 0.0–1.0
    longevity_note:    str

    # Signals for collector.py
    health_signals:    List[Dict]

    # Remedies (4 categories)
    lifestyle_remedies:  List[str]
    dietary_remedies:    List[str]
    exercise_remedies:   List[str]
    mental_remedies:     List[str]

    # Key indicators
    primary_health_planet:  Optional[str]   # most health-significant planet
    primary_vulnerability:  Optional[str]   # most significant weak point
    numerology_health_focus: Optional[str]  # LP health system focus

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _house_of(planet: str, positions: Dict, houses: Dict) -> Optional[int]:
    if not ASTRO_AVAILABLE or planet not in positions: return None
    return _find_planet_house(positions[planet]["longitude"], houses)

def _sign_of(planet: str, positions: Dict) -> Optional[str]:
    return positions.get(planet, {}).get("sign") or None

def _is_retrograde(planet: str, positions: Dict) -> bool:
    return positions.get(planet, {}).get("retrograde", False)

def _planets_in_house(h: int, positions: Dict, houses: Dict) -> List[str]:
    if not ASTRO_AVAILABLE: return []
    return [p for p in positions
            if _find_planet_house(positions[p]["longitude"], houses) == h]

def _aspect(p1: str, p2: str, positions: Dict, orb: float = 8.0) -> Optional[str]:
    if p1 not in positions or p2 not in positions: return None
    d = abs(positions[p1]["longitude"] - positions[p2]["longitude"]) % 360
    if d > 180: d = 360 - d
    for angle, name in [(0,"conjunction"),(60,"sextile"),(90,"square"),
                         (120,"trine"),(150,"quincunx"),(180,"opposition")]:
        if abs(d - angle) <= orb: return name
    return None

def _hard(asp: Optional[str]) -> bool:
    return asp in ("square", "opposition")

def _soft(asp: Optional[str]) -> bool:
    return asp in ("conjunction", "trine", "sextile")

def _is_dignified(planet: str, sign: str) -> bool:
    return ASTRO_AVAILABLE and sign in _DIGNIFIED_SIGNS.get(planet, [])

def _is_debilitated(planet: str, sign: str) -> bool:
    return ASTRO_AVAILABLE and sign in _DEBILITATED_SIGNS.get(planet, [])


# ---------------------------------------------------------------------------
# A. Constitution and Dosha Assessment
# ---------------------------------------------------------------------------

def _assess_constitution(
    positions: Dict,
    houses:    Dict,
    life_path: Optional[int] = None,
) -> Tuple[str, str, str]:
    """
    Determine fundamental constitution type, Ayurvedic dosha, and TCM element.
    Returns (constitution_type, dosha_tendency, chinese_element).
    """
    pitta_score = 0; vata_score = 0; kapha_score = 0

    # Count planetary emphasis by dosha
    for planet, pos in positions.items():
        sign = pos.get("sign", "")
        if planet in _PITTA_PLANETS:  pitta_score += 2
        if planet in _VATA_PLANETS:   vata_score  += 2
        if planet in _KAPHA_PLANETS:  kapha_score += 2
        if sign in _PITTA_SIGNS:  pitta_score += 1
        elif sign in _VATA_SIGNS: vata_score  += 1
        elif sign in _KAPHA_SIGNS:kapha_score += 1

    # Weight Sun, Moon, Ascendant more heavily
    asc_sign = None
    if "Ascendant" in houses:
        # Approximate Ascendant sign from house cusp
        asc_lon = houses.get("Ascendant", 0.0)
        sign_idx = int(asc_lon / 30) % 12
        signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                 "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
        asc_sign = signs[sign_idx]
        if asc_sign in _PITTA_SIGNS:  pitta_score += 3
        elif asc_sign in _VATA_SIGNS: vata_score  += 3
        elif asc_sign in _KAPHA_SIGNS:kapha_score += 3

    total = max(1, pitta_score + vata_score + kapha_score)
    pitta_r = pitta_score / total
    vata_r  = vata_score  / total
    kapha_r = kapha_score / total

    # Determine dual or tri-doshic
    threshold = 0.30
    dominant_doshas = [
        d for d, r in [("vata", vata_r), ("pitta", pitta_r), ("kapha", kapha_r)]
        if r >= threshold
    ]

    if len(dominant_doshas) == 3:
        dosha = "tridoshic"
    elif len(dominant_doshas) == 2:
        sorted_d = sorted(
            [("vata",vata_r),("pitta",pitta_r),("kapha",kapha_r)],
            key=lambda x:-x[1]
        )
        dosha = f"{sorted_d[0][0]}_{sorted_d[1][0]}"
    else:
        dosha = max(
            [("vata",vata_r),("pitta",pitta_r),("kapha",kapha_r)],
            key=lambda x:x[1]
        )[0]

    # Constitution type from vitality indicators
    sun_sign  = _sign_of("Sun",  positions)
    mars_sign = _sign_of("Mars", positions)
    sat_sign  = _sign_of("Saturn",positions)

    sun_strong  = sun_sign  and _is_dignified("Sun",  sun_sign)
    mars_strong = mars_sign and _is_dignified("Mars", mars_sign)
    sat_strong  = sat_sign  and _is_dignified("Saturn",sat_sign)
    sun_weak    = sun_sign  and _is_debilitated("Sun",  sun_sign)
    sat_weak    = sat_sign  and _is_debilitated("Saturn",sat_sign)

    if sun_strong and mars_strong:
        constitution = "robust"
    elif sun_strong or mars_strong:
        constitution = "resilient"
    elif sun_weak and sat_weak:
        constitution = "sensitive"
    elif "tridoshic" in dosha:
        constitution = "balanced"
    elif "vata" in dosha and not "kapha" in dosha:
        constitution = "variable"
    else:
        constitution = "mixed"

    # Chinese element from primary dosha
    element_map = {
        "pitta": "fire", "vata": "metal",
        "kapha": "water", "tridoshic": "earth",
        "vata_pitta": "metal", "pitta_kapha": "fire",
        "vata_kapha": "water",
    }
    chinese_elem = element_map.get(dosha, "earth")

    return constitution, dosha, chinese_elem


# ---------------------------------------------------------------------------
# B. Vitality Assessment
# ---------------------------------------------------------------------------

def _assess_vitality(
    positions: Dict,
    houses:    Dict,
) -> Tuple[float, Magnitude]:
    """
    Assess overall life force from Sun, Mars, 1st house, and Jupiter.
    Returns (score 0.0–1.0, Magnitude).
    """
    score = 0.50  # neutral baseline

    # Sun — primary vitality indicator
    sun_sign = _sign_of("Sun", positions)
    sun_house = _house_of("Sun", positions, houses)
    if sun_sign:
        if _is_dignified("Sun", sun_sign):     score += 0.20
        elif _is_debilitated("Sun", sun_sign): score -= 0.12
        else:                                  score += 0.05
    if sun_house in (1, 10, 5):  score += 0.08  # angular/strong houses
    elif sun_house in (6, 8, 12): score -= 0.05  # cadent/challenging houses

    # Mars — physical energy and drive
    mars_sign  = _sign_of("Mars",  positions)
    mars_house = _house_of("Mars", positions, houses)
    if mars_sign:
        if _is_dignified("Mars", mars_sign):      score += 0.12
        elif _is_debilitated("Mars", mars_sign):  score -= 0.08
    if mars_house in (1, 10, 8):  score += 0.05  # Mars strong in 1st/10th/8th
    if _is_retrograde("Mars", positions):          score -= 0.04

    # Jupiter — expansion and recovery capacity
    jup_sign  = _sign_of("Jupiter", positions)
    jup_house = _house_of("Jupiter", positions, houses)
    if jup_sign and _is_dignified("Jupiter", jup_sign): score += 0.10
    if jup_house in (1, 5, 9, 10):                      score += 0.05

    # Saturn — longevity structure (well-placed = endurance)
    sat_sign  = _sign_of("Saturn", positions)
    sat_house = _house_of("Saturn", positions, houses)
    if sat_sign and _is_dignified("Saturn", sat_sign): score += 0.06
    if sat_sign and _is_debilitated("Saturn", sat_sign): score -= 0.06
    if sat_house in (6, 8, 12): score -= 0.05  # challenging house placement

    # 1st house emphasis
    first_planets = _planets_in_house(1, positions, houses)
    for p in first_planets:
        if p in ("Sun", "Mars", "Jupiter"): score += 0.05
        elif p in ("Saturn", "Neptune"):    score -= 0.03

    # Retrograde cluster (3+) — energy turned inward
    retro_count = sum(1 for p in positions
                     if positions[p].get("retrograde") and p not in ("Rahu",))
    if retro_count >= 4: score -= 0.06

    score = round(min(1.0, max(0.0, score)), 3)
    mag = (Magnitude.HIGH     if score >= 0.72 else
           Magnitude.MODERATE if score >= 0.48 else
           Magnitude.LOW)

    return score, mag


# ---------------------------------------------------------------------------
# C. Health Vulnerabilities
# ---------------------------------------------------------------------------

def _identify_vulnerabilities(
    positions: Dict,
    houses:    Dict,
    life_path: Optional[int] = None,
    palm_markers: Optional[List] = None,
    face_markers: Optional[List] = None,
) -> List[HealthVulnerability]:
    """
    Identify specific structural health vulnerabilities from the natal chart,
    numerology, and optional biometric markers.
    All vulnerabilities are framed as tendencies requiring awareness.
    """
    vulns: List[HealthVulnerability] = []

    # ── 6th house analysis — primary health house ─────────────────────────
    sixth_planets = _planets_in_house(6, positions, houses)
    for planet in sixth_planets:
        sign  = _sign_of(planet, positions)
        body_systems = _PLANET_BODY.get(planet, [])
        sign_body    = _SIGN_BODY.get(sign or "", ("",""))[0]

        if planet == "Saturn":
            vulns.append(HealthVulnerability(
                system="structural_chronic",
                severity=Magnitude.HIGH,
                planet_indicator=f"Saturn in the 6th house (sign: {sign})",
                note=(f"Saturn in the 6th house is one of the strongest indicators of "
                      f"chronic health patterns requiring disciplined management. "
                      f"Body areas: {sign_body}. "
                      f"Structural conditions (bone, joint, dental, skin) may require "
                      f"consistent preventive care throughout life. "
                      f"Saturn here rewards disciplined health routines — this person's "
                      f"health literally improves with age when managed consciously."),
                management=("Consistent, disciplined daily health practice is the primary remedy. "
                            "Calcium, vitamin D, collagen support for structural health. "
                            "Avoid cold, dampness, and irregular schedules."),
                ayurvedic_dosha="vata",
                chinese_element="water",
            ))

        elif planet == "Mars":
            vulns.append(HealthVulnerability(
                system="inflammatory",
                severity=Magnitude.MODERATE,
                planet_indicator=f"Mars in the 6th house (sign: {sign})",
                note=(f"Mars in the 6th house indicates a tendency toward inflammatory "
                      f"conditions, work-related injuries, or fever patterns. "
                      f"The fiery Mars energy in the health house can manifest as: "
                      f"inflammation, infections, cuts, burns, or overexertion. "
                      f"Body areas: {sign_body}. "
                      f"Mars 6th can also indicate exceptional physical capacity for recovery — "
                      f"this person heals quickly when supported."),
                management=("Anti-inflammatory diet and adequate rest between intense activities. "
                            "Avoid overheating and overexertion. Cooling foods and herbs "
                            "(cucumber, coconut, coriander) balance Mars fire."),
                ayurvedic_dosha="pitta",
                chinese_element="fire",
            ))

        elif planet == "Neptune":
            vulns.append(HealthVulnerability(
                system="immune_mysterious",
                severity=Magnitude.MODERATE,
                planet_indicator=f"Neptune in the 6th house (sign: {sign})",
                note=(f"Neptune in the 6th house indicates sensitivity to environmental "
                      f"toxins, chemicals, and pharmaceutical side effects. "
                      f"Mysterious or difficult-to-diagnose conditions may arise. "
                      f"The immune system operates subtly — conventional diagnosis may miss "
                      f"what alternative health approaches identify clearly. "
                      f"Body areas: {sign_body}."),
                management=("Clean environment, minimal chemical exposure, filtered water. "
                            "Gentle detoxification practices. Integrative and holistic health "
                            "approaches may be more effective than conventional for some conditions. "
                            "Alcohol and recreational substances are structurally inadvisable."),
                ayurvedic_dosha="kapha",
                chinese_element="water",
            ))

        elif planet == "Jupiter":
            vulns.append(HealthVulnerability(
                system="hepatic_metabolic",
                severity=Magnitude.LOW,
                planet_indicator=f"Jupiter in the 6th house (sign: {sign})",
                note=(f"Jupiter in the 6th house indicates tendency toward excess — "
                      f"overeating, overindulgence, or metabolic expansion. "
                      f"Liver, pituitary, and fat metabolism may need monitoring. "
                      f"Body areas: {sign_body}. "
                      f"Jupiter 6th also brings a natural resilience and optimism about health."),
                management=("Moderate diet and portion awareness. Regular exercise to manage "
                            "expansive Jupiter energy. Liver support (dandelion, milk thistle). "
                            "Blood sugar and cholesterol monitoring as preventive care."),
                ayurvedic_dosha="kapha",
                chinese_element="wood",
            ))

    # ── Saturn-Moon aspect — digestive and emotional health ───────────────
    sat_moon = _aspect("Saturn", "Moon", positions)
    if sat_moon:
        severity = Magnitude.HIGH if _hard(sat_moon) else Magnitude.LOW
        vulns.append(HealthVulnerability(
            system="digestive_emotional",
            severity=severity,
            planet_indicator=f"Saturn {sat_moon} Moon",
            note=(f"Saturn {sat_moon} Moon in the natal chart indicates the emotional "
                  f"body and the digestive system are linked — stress and emotional states "
                  f"directly impact gut function. "
                  f"{'Hard aspect: significant psychosomatic digestive patterns possible. Depression, emotional withholding, and digestive restriction may co-arise.' if _hard(sat_moon) else 'Soft aspect: the Saturn-Moon contact creates discipline around emotional and digestive health — generally manageable with routine.'} "
                  f"The stomach, lymph, and hormonal system are the primary concern areas."),
            management=("Stress management and emotional processing practices are as important as diet. "
                        "Regular eating schedule (Saturn requires routine). "
                        "Warming, easily digestible foods. Probiotics for gut flora support. "
                        "Therapy or journalling to process emotional-digestive link."),
            ayurvedic_dosha="vata",
            chinese_element="earth",
        ))

    # ── Mars-Moon aspect — inflammatory and hormonal ─────────────────────
    mars_moon = _aspect("Mars", "Moon", positions)
    if _hard(mars_moon):
        vulns.append(HealthVulnerability(
            system="inflammatory_hormonal",
            severity=Magnitude.MODERATE,
            planet_indicator=f"Mars {mars_moon} Moon",
            note=(f"Mars {mars_moon} Moon in the natal chart indicates inflammatory "
                  f"tendencies linked to emotional states and hormonal fluctuations. "
                  f"The fiery Mars energy activates lunar-ruled systems (hormones, digestion, "
                  f"reproductive) with intensity. "
                  f"Inflammatory conditions, menstrual irregularities, "
                  f"or emotional inflammation (reactive anger) may be areas requiring awareness."),
            management=("Anti-inflammatory diet — omega-3s, turmeric, ginger. "
                        "Emotional regulation practices (breathwork, martial arts) to channel "
                        "Mars energy constructively. Hormonal monitoring as preventive care. "
                        "Cooling lunar practices during high-stress periods."),
            ayurvedic_dosha="pitta",
            chinese_element="fire",
        ))

    # ── Neptune-Mercury aspect — nervous system sensitivity ───────────────
    nep_merc = _aspect("Neptune", "Mercury", positions)
    if nep_merc:
        severity = Magnitude.MODERATE if _hard(nep_merc) else Magnitude.LOW
        vulns.append(HealthVulnerability(
            system="nervous_respiratory",
            severity=severity,
            planet_indicator=f"Neptune {nep_merc} Mercury",
            note=(f"Neptune {nep_merc} Mercury indicates a sensitive nervous system "
                  f"susceptible to chemical sensitivities, brain fog, or difficulty with "
                  f"concentration under stress. "
                  f"The Mercury-ruled systems (nervous system, lungs, hands) may be "
                  f"influenced by Neptune's dissolving quality — manifesting as "
                  f"fogginess, anxiety, or unusual respiratory patterns. "
                  f"Pharmaceutical sensitivities and reactions to psychoactive substances "
                  f"may also be heightened."),
            management=("Clean, clear environments with good air quality. "
                        "Breathwork and pranayama for respiratory and nervous system support. "
                        "Brain-supporting nutrition: B vitamins, omega-3s, magnesium. "
                        "Cautious approach to pharmaceuticals — smaller doses may be effective."),
            ayurvedic_dosha="vata",
            chinese_element="metal",
        ))

    # ── Saturn in 8th — chronic conditions and longevity ─────────────────
    sat_house = _house_of("Saturn", positions, houses)
    if sat_house == 8:
        sat_sign = _sign_of("Saturn", positions)
        vulns.append(HealthVulnerability(
            system="chronic_regenerative",
            severity=Magnitude.MODERATE,
            planet_indicator=f"Saturn in the 8th house (sign: {sat_sign})",
            note=(f"Saturn in the 8th house indicates that the body's regenerative "
                  f"processes are disciplined and slow — which can manifest as "
                  f"either exceptional longevity (Saturn delays endings) or chronic "
                  f"conditions that require sustained management. "
                  f"The 8th house governs elimination, detoxification, and cellular renewal. "
                  f"Body areas particularly associated: {_SIGN_BODY.get(sat_sign or '', ('',''))[0]}."),
            management=("Consistent detoxification practices: regular fasting, liver support, "
                        "colon health maintenance. Structural health monitoring. "
                        "Saturn in the 8th often indicates that the body responds well to "
                        "structured, disciplined approaches over time."),
            ayurvedic_dosha="vata",
            chinese_element="water",
        ))

    # ── 12th house emphasis — hidden or immune conditions ─────────────────
    twelfth_planets = _planets_in_house(12, positions, houses)
    high_impact_12th = [p for p in twelfth_planets
                       if p in ("Saturn", "Neptune", "Pluto", "Mars")]
    if high_impact_12th:
        vulns.append(HealthVulnerability(
            system="immune_hidden",
            severity=Magnitude.MODERATE,
            planet_indicator=f"{', '.join(high_impact_12th)} in the 12th house",
            note=(f"Significant planets in the 12th house ({', '.join(high_impact_12th)}) "
                  f"indicate the immune system and hidden/chronic conditions as areas of "
                  f"constitutional awareness. "
                  f"The 12th house governs what is below the surface — conditions that may "
                  f"develop quietly before becoming apparent. "
                  f"Regular comprehensive health screening is especially recommended. "
                  f"Sleep quality and convalescence (rest + recovery) are critical health factors."),
            management=("Immune support: vitamin C, D, zinc, adaptogens (ashwagandha, rhodiola). "
                        "Sleep hygiene as a primary health practice. "
                        "Regular comprehensive blood work to catch patterns early. "
                        "Spiritual practices and retreat time serve both psychic and immune health."),
            ayurvedic_dosha="kapha",
            chinese_element="water",
        ))

    # ── Sign-based vulnerability from Sun, Moon, Ascendant ───────────────
    for planet, sign_key in [("Sun", _sign_of("Sun", positions)),
                              ("Moon", _sign_of("Moon", positions))]:
        if not sign_key: continue
        sign_body_zone, _ = _SIGN_BODY.get(sign_key, ("",""))
        # Only flag if debilitated or in challenging house
        p_house = _house_of(planet, positions, houses)
        if _is_debilitated(planet, sign_key) or p_house in (6, 8, 12):
            sev = Magnitude.HIGH if (_is_debilitated(planet, sign_key) and p_house in (6,8,12)) else Magnitude.MODERATE
            vulns.append(HealthVulnerability(
                system=sign_body_zone.split(",")[0].strip() if sign_body_zone else "general",
                severity=sev,
                planet_indicator=(f"{planet} {'debilitated' if _is_debilitated(planet, sign_key) else 'placed'} "
                                  f"in {sign_key}{f' (house {p_house})' if p_house else ''}"),
                note=(f"{planet} in {sign_key} "
                      f"{'(debilitated — weakened placement) ' if _is_debilitated(planet, sign_key) else ''}"
                      f"indicates structural attention to the body zone ruled by {sign_key}: "
                      f"{sign_body_zone}. "
                      f"This is not a pathology indicator but a constitutional tendency "
                      f"toward sensitivity in this zone."),
                management=(f"Preventive care and awareness for {sign_body_zone} area. "
                            f"Regular monitoring and lifestyle practices that support "
                            f"{sign_key.lower()}-ruled physiology."),
                ayurvedic_dosha=_SIGN_BODY.get(sign_key, ("",""))[1].split("—")[0].strip().lower() if _SIGN_BODY.get(sign_key) else "mixed",
            ))

    # ── Life Path numerology vulnerability ────────────────────────────────
    if life_path and life_path in _LP_HEALTH:
        lp_h = _LP_HEALTH[life_path]
        vulns.append(HealthVulnerability(
            system=lp_h["system"].split(",")[0].strip(),
            severity=Magnitude.LOW,  # numerology is a background indicator
            planet_indicator=f"Life Path {life_path} (ruled by {lp_h['planet']})",
            note=(f"Life Path {life_path} carries a constitutional focus on "
                  f"the {lp_h['focus']} — the {lp_h['planet']}-ruled body systems "
                  f"({lp_h['system']}) are the numerological health awareness zone. "
                  f"This is a background indicator amplified by matching astrological placements."),
            management=(f"Supportive lifestyle practices for the {lp_h['system']} system. "
                        f"Particularly relevant if also indicated by astrological placements."),
        ))

    # ── Integrate palm health markers ──────────────────────────────────────
    if palm_markers:
        for marker in palm_markers:
            sev = (Magnitude.HIGH if getattr(marker,"severity",None) and
                   marker.severity.value == "high" else Magnitude.MODERATE)
            system = getattr(marker, "system", "general").replace(" ","_")
            vulns.append(HealthVulnerability(
                system=system,
                severity=sev,
                planet_indicator=f"Palm health marker: {getattr(marker,'marker_type','unknown')}",
                note=getattr(marker, "note", "Palm health indicator detected."),
                management=(f"Palmistry health indicator for {system} system. "
                            f"Consistent with any matching astrological indicators. "
                            f"Standard lifestyle support for this body system is recommended."),
            ))

    # ── Integrate face health markers ──────────────────────────────────────
    if face_markers:
        for marker in face_markers:
            sev = (Magnitude.HIGH if getattr(marker,"severity",None) and
                   marker.severity.value == "high" else Magnitude.MODERATE)
            system = getattr(marker, "system", "general").replace(" ","_")
            vulns.append(HealthVulnerability(
                system=system,
                severity=sev,
                planet_indicator=f"Face health marker: {getattr(marker,'marker_type','unknown')}",
                note=getattr(marker, "note", "Facial health zone indicator detected."),
                management=(f"Mian Xiang (Chinese face reading) health indicator for {system} system. "
                            f"Supports any matching astrological or palm indicators."),
            ))

    # Sort by severity (HIGH first)
    severity_order = {Magnitude.HIGH: 0, Magnitude.MODERATE: 1, Magnitude.LOW: 2, Magnitude.UNCLEAR: 3}
    vulns.sort(key=lambda v: severity_order.get(v.severity, 3))

    return vulns


# ---------------------------------------------------------------------------
# D. Organ System Map
# ---------------------------------------------------------------------------

def _map_organ_systems(
    positions: Dict,
    houses:    Dict,
    dosha:     str,
) -> List[OrganSystemProfile]:
    """
    Map all 12 major body systems to vulnerability levels.
    Uses sign rulerships and planetary placements.
    """
    systems: List[OrganSystemProfile] = []

    # System definitions: (system_name, ruled_by_planet, ruled_by_sign, ayurvedic_elem, chinese_elem)
    system_map = [
        ("cardiovascular",   "Sun",     "Leo",          "pitta", "fire"),
        ("digestive",        "Moon",    "Cancer/Virgo", "kapha", "earth"),
        ("nervous",          "Mercury", "Gemini",       "vata",  "metal"),
        ("endocrine",        "Jupiter", "Sagittarius",  "pitta", "fire"),
        ("musculoskeletal",  "Saturn",  "Capricorn",    "vata",  "water"),
        ("respiratory",      "Mercury", "Gemini",       "vata",  "metal"),
        ("immune",           "Neptune", "Pisces",       "kapha", "water"),
        ("reproductive",     "Venus",   "Scorpio",      "kapha", "water"),
        ("renal",            "Venus",   "Libra",        "vata",  "water"),
        ("integumentary",    "Saturn",  "Capricorn",    "vata",  "metal"),
        ("hepatic",          "Jupiter", "Sagittarius",  "pitta", "wood"),
        ("lymphatic",        "Moon",    "Cancer",       "kapha", "water"),
    ]

    for sys_name, ruling_planet, ruling_sign, ayurvedic_elem, chinese_elem in system_map:
        planet_sign = _sign_of(ruling_planet, positions)
        planet_house = _house_of(ruling_planet, positions, houses)

        # Determine vulnerability level
        vuln = Magnitude.LOW  # default healthy
        note_parts = []

        if planet_sign and _is_debilitated(ruling_planet, planet_sign):
            vuln = Magnitude.HIGH
            note_parts.append(f"{ruling_planet} debilitated in {planet_sign}")
        elif planet_house in (6, 8, 12):
            vuln = Magnitude.MODERATE
            note_parts.append(f"{ruling_planet} in {planet_house}th house")
        elif planet_sign and _is_dignified(ruling_planet, planet_sign):
            vuln = Magnitude.LOW
            note_parts.append(f"{ruling_planet} dignified in {planet_sign} — system well-supported")
        else:
            note_parts.append(f"{ruling_planet} in {planet_sign or 'unknown'}")

        # Check if any planets are in the ruling sign
        planets_in_ruling = [p for p in positions
                            if positions[p].get("sign") == ruling_sign.split("/")[0]]
        if planets_in_ruling:
            hard_planets = [p for p in planets_in_ruling
                           if p in ("Saturn","Mars","Neptune","Pluto")]
            if hard_planets:
                vuln = Magnitude.MODERATE if vuln == Magnitude.LOW else vuln
                note_parts.append(f"{', '.join(hard_planets)} in {ruling_sign} zone")

        # Build note
        if vuln == Magnitude.HIGH:
            note = (f"{sys_name.replace('_',' ').title()} system shows structural indicators "
                    f"requiring consistent preventive attention. {'; '.join(note_parts)}. "
                    f"Regular health monitoring of this system is particularly recommended.")
        elif vuln == Magnitude.MODERATE:
            note = (f"{sys_name.replace('_',' ').title()} system has moderate structural indicators. "
                    f"{'; '.join(note_parts)}. "
                    f"Standard preventive care with awareness of lifestyle factors.")
        else:
            note = (f"{sys_name.replace('_',' ').title()} system shows positive structural indicators. "
                    f"{'; '.join(note_parts)}. Maintain current health practices.")

        systems.append(OrganSystemProfile(
            system=sys_name,
            vulnerability_level=vuln,
            astro_indicator=f"{ruling_planet} in {planet_sign or 'unknown'}" + (f" (house {planet_house})" if planet_house else ""),
            ayurvedic_element=ayurvedic_elem,
            chinese_element=chinese_elem,
            note=note,
        ))

    # Sort by vulnerability (HIGH first)
    severity_order = {Magnitude.HIGH: 0, Magnitude.MODERATE: 1, Magnitude.LOW: 2}
    systems.sort(key=lambda s: severity_order.get(s.vulnerability_level, 3))

    return systems


# ---------------------------------------------------------------------------
# E. Mental Health Assessment
# ---------------------------------------------------------------------------

def _assess_mental_health(
    positions: Dict,
    houses:    Dict,
) -> MentalHealthProfile:
    """
    Assess mental and emotional health patterns from the natal chart.
    Mercury, Moon, Saturn, Neptune, 12th house are primary indicators.
    Always framed as tendencies, never as diagnoses.
    """
    indicators: List[str] = []
    strengths:  List[str] = []
    remedies:   List[str] = []
    pattern_scores = {
        "anxiety_tendency":     0,
        "depressive_tendency":  0,
        "obsessive_tendency":   0,
        "scattered_tendency":   0,
        "resilient":            0,
    }

    # ── Mercury — mental processing style ────────────────────────────────
    merc_sign  = _sign_of("Mercury", positions)
    merc_house = _house_of("Mercury", positions, houses)
    merc_retro = _is_retrograde("Mercury", positions)

    if merc_sign in ("Gemini","Aquarius","Libra"):
        pattern_scores["scattered_tendency"] += 1
        indicators.append(f"Mercury in {merc_sign} — rapid, multi-directional thinking")
    elif merc_sign in ("Virgo","Capricorn","Scorpio"):
        pattern_scores["obsessive_tendency"] += 1
        strengths.append(f"Mercury in {merc_sign} — deep analytical capacity and precision")
    if merc_retro:
        pattern_scores["anxiety_tendency"] += 1
        indicators.append("Mercury retrograde natal — thinking turned inward, may over-analyse")
    if merc_house == 12:
        pattern_scores["anxiety_tendency"] += 2
        indicators.append("Mercury in 12th house — subconscious thinking, hidden worries, hidden intelligence")
        strengths.append("Mercury in 12th — access to deep unconscious wisdom and psychic intelligence")

    # ── Moon — emotional stability ────────────────────────────────────────
    moon_sign  = _sign_of("Moon", positions)
    moon_house = _house_of("Moon", positions, houses)
    sat_moon   = _aspect("Saturn", "Moon", positions)
    nep_moon   = _aspect("Neptune", "Moon", positions)
    mars_moon  = _aspect("Mars",    "Moon", positions)

    if moon_sign in ("Cancer","Pisces","Scorpio"):
        pattern_scores["anxiety_tendency"] += 1
        indicators.append(f"Moon in {moon_sign} — deep emotional sensitivity and empathic absorption")
        strengths.append(f"Moon in {moon_sign} — profound emotional intelligence and intuitive capacity")
    elif moon_sign in ("Capricorn","Aquarius"):
        pattern_scores["depressive_tendency"] += 1
        indicators.append(f"Moon in {moon_sign} — emotional detachment or emotional suppression tendency")
        strengths.append(f"Moon in {moon_sign} — emotional discipline and long-range perspective")

    if _hard(sat_moon):
        pattern_scores["depressive_tendency"] += 2
        indicators.append(f"Saturn {sat_moon} Moon — structural tendency toward melancholy, emotional restriction")
        strengths.append("Saturn-Moon tension — exceptional emotional resilience when consciously worked")
    if _hard(nep_moon):
        pattern_scores["anxiety_tendency"] += 1
        indicators.append(f"Neptune {nep_moon} Moon — porous emotional boundaries, empathic overwhelm risk")
    if _hard(mars_moon):
        pattern_scores["anxiety_tendency"] += 1
        indicators.append(f"Mars {mars_moon} Moon — emotional reactivity and volatile emotional energy")

    # ── Saturn — depression and restriction indicators ─────────────────────
    sat_sign  = _sign_of("Saturn", positions)
    sat_house = _house_of("Saturn", positions, houses)
    if sat_house == 12:
        pattern_scores["depressive_tendency"] += 1
        indicators.append("Saturn in 12th — tendency to suppress grief, hidden burden, difficulty asking for help")
    if sat_sign and _is_debilitated("Saturn", sat_sign):
        pattern_scores["anxiety_tendency"] += 1
        indicators.append(f"Saturn debilitated in {sat_sign} — structural instability creating anxiety patterns")

    # ── Neptune — dissolution and confusion patterns ───────────────────────
    nep_house = _house_of("Neptune", positions, houses)
    if nep_house in (1, 6, 12):
        pattern_scores["anxiety_tendency"] += 1
        indicators.append(f"Neptune in {nep_house}th house — boundary permeability, spiritual sensitivity")
        strengths.append(f"Neptune in {nep_house}th — access to non-ordinary states of awareness and creativity")

    # ── Pluto-Moon/Mercury — obsessive patterns ────────────────────────────
    pluto_moon = _aspect("Pluto", "Moon", positions)
    pluto_merc = _aspect("Pluto", "Mercury", positions)
    if _hard(pluto_moon) or _hard(pluto_merc):
        pattern_scores["obsessive_tendency"] += 1
        indicators.append("Pluto in hard aspect to Moon/Mercury — depth, intensity, obsessive thought patterns")
        strengths.append("Pluto-lunar/mercurial contact — extraordinary psychological depth and investigative capacity")

    # ── Jupiter aspects — mental expansion and resilience ────────────────
    jup_merc = _aspect("Jupiter", "Mercury", positions)
    if _soft(jup_merc):
        pattern_scores["resilient"] += 2
        strengths.append(f"Jupiter {jup_merc} Mercury — optimistic thinking, philosophical resilience")

    jup_moon = _aspect("Jupiter", "Moon", positions)
    if _soft(jup_moon):
        pattern_scores["resilient"] += 2
        strengths.append(f"Jupiter {jup_moon} Moon — emotional generosity, natural psychological buoyancy")

    # ── Determine primary pattern ─────────────────────────────────────────
    primary_pattern = max(pattern_scores, key=pattern_scores.get)
    if pattern_scores[primary_pattern] == 0:
        primary_pattern = "balanced"

    # ── Mental health description ─────────────────────────────────────────
    pattern_notes = {
        "anxiety_tendency": ("The natal chart carries structural indicators of anxiety tendencies — "
            "heightened nervous system sensitivity, emotional absorption, or over-analytical loops. "
            "These are constitutional tendencies, not diagnoses. With awareness and the right practices, "
            "the same sensitivity that creates anxiety also creates extraordinary intuition and empathy."),
        "depressive_tendency": ("The natal chart carries structural indicators of melancholic or "
            "depressive tendencies — particularly from Saturn-Moon contacts or Moon in cool signs. "
            "This is a constitutional tendency, not a diagnosis. "
            "The same depth that creates the depressive pull also creates profound wisdom, "
            "compassion, and creative richness."),
        "obsessive_tendency": ("The natal chart shows structural indicators of obsessive or "
            "intensely focused mental patterns — particularly from Pluto and Scorpio emphasis. "
            "This is a constitutional strength misapplied when the focus becomes rigid. "
            "The same obsessive quality creates extraordinary mastery when directed consciously."),
        "scattered_tendency": ("The natal chart indicates structural tendencies toward scattered "
            "attention, mental variety, and difficulty sustaining focus. "
            "This is a constitutional feature — the same breadth of attention creates versatility, "
            "adaptability, and the ability to synthesise across domains."),
        "resilient": ("The natal chart carries strong mental resilience indicators — "
            "Jupiter aspects to Mercury and Moon create a constitutional optimism and philosophical "
            "buoyancy. This person has structural psychological resources that support recovery "
            "from mental health challenges."),
        "balanced": ("The natal chart shows a relatively balanced mental health profile — "
            "no single pattern dominates. Standard wellness practices support the natural equilibrium."),
    }

    note = pattern_notes.get(primary_pattern, "Mental health indicators are mixed and balanced.")

    # ── Mental health remedies ────────────────────────────────────────────
    if primary_pattern == "anxiety_tendency":
        remedies = [
            "Daily breathwork or pranayama (10 minutes minimum) to regulate the nervous system.",
            "Magnesium glycinate supplementation — the anxiety mineral.",
            "Digital boundaries — scheduled news and social media windows rather than constant access.",
            "Body-based practices (yoga, dance, walking) to ground the anxious mind in the body.",
        ]
    elif primary_pattern == "depressive_tendency":
        remedies = [
            "Morning sunlight exposure — 10+ minutes daily to regulate circadian rhythm and mood.",
            "Exercise as primary remedy — the physical body activates the emotional body.",
            "Social connection structure — schedule regular contact, not ad hoc.",
            "Professional support — therapy, particularly somatic or cognitive approaches, is recommended for Saturn-Moon patterns.",
        ]
    elif primary_pattern == "obsessive_tendency":
        remedies = [
            "Scheduled 'worry time' — contain obsessive thoughts to a defined 20-minute window daily.",
            "Physical exercise as pattern-interrupt — breaks the obsessive loop.",
            "Grounding practices — earth element activities (gardening, cooking, walking) settle Pluto energy.",
            "Mindfulness meditation specifically for intrusive thoughts.",
        ]
    elif primary_pattern == "scattered_tendency":
        remedies = [
            "Single-tasking practice — one task, one session, complete before switching.",
            "Daily planning ritual — clear list of 3 priorities before starting any work.",
            "Physical grounding (cold water, barefoot on earth, weight training) anchors Mercury-air energy.",
            "Regular breaks structured into work patterns — prevents the scattered exhaustion of Mercury overload.",
        ]
    else:
        remedies = [
            "Daily mindfulness or meditation practice maintains the natural equilibrium.",
            "Regular physical exercise supports psychological resilience.",
            "Social connection and meaningful work sustain positive mental health baseline.",
        ]

    return MentalHealthProfile(
        primary_pattern=primary_pattern,
        indicators=indicators[:6],
        strengths=strengths[:4],
        note=note,
        remedies=remedies,
    )


# ---------------------------------------------------------------------------
# F. Longevity Assessment
# ---------------------------------------------------------------------------

def _assess_longevity(
    positions: Dict,
    houses:    Dict,
) -> Tuple[float, str]:
    """
    Assess structural longevity indicators.
    Returns (score 0.0–1.0, descriptive note).
    """
    score = 0.50  # baseline

    # Saturn — primary longevity structure
    sat_sign  = _sign_of("Saturn", positions)
    sat_house = _house_of("Saturn", positions, houses)
    if sat_sign and _is_dignified("Saturn", sat_sign): score += 0.15
    elif sat_sign and _is_debilitated("Saturn", sat_sign): score -= 0.10
    if sat_house in (1, 10, 11): score += 0.08  # strong houses
    elif sat_house == 8:          score += 0.05  # delays endings

    # Jupiter — recovery and expansion
    jup_sign  = _sign_of("Jupiter", positions)
    jup_house = _house_of("Jupiter", positions, houses)
    if jup_sign and _is_dignified("Jupiter", jup_sign): score += 0.10
    if jup_house in (1, 8, 11):  score += 0.06

    # Sun — life force
    sun_sign  = _sign_of("Sun",  positions)
    sun_house = _house_of("Sun", positions, houses)
    if sun_sign and _is_dignified("Sun", sun_sign): score += 0.08
    elif sun_sign and _is_debilitated("Sun", sun_sign): score -= 0.06
    if sun_house in (1, 10):     score += 0.05
    elif sun_house in (8, 12):   score -= 0.04

    # 8th house quality — regeneration
    eighth_planets = _planets_in_house(8, positions, houses)
    if "Jupiter" in eighth_planets: score += 0.08  # Jupiter blesses 8th
    if "Saturn"  in eighth_planets: score += 0.05  # Saturn delays in 8th
    if "Neptune" in eighth_planets: score -= 0.04

    score = round(min(1.0, max(0.0, score)), 3)

    if score >= 0.72:
        note = (f"Strong structural longevity indicators. "
                f"Saturn{'dignified' if sat_sign and _is_dignified('Saturn', sat_sign) else ''} "
                f"and {'dignified Jupiter' if jup_sign and _is_dignified('Jupiter', jup_sign) else 'Jupiter'} "
                f"create a constitutional foundation for enduring vitality. "
                f"The body responds well to disciplined health practices sustained over decades.")
    elif score >= 0.45:
        note = (f"Moderate longevity structural profile. "
                f"The constitutional indicators suggest adequate life force "
                f"with conscious management. Consistent health practices compound positively over time.")
    else:
        note = (f"Longevity indicators call for conscious health investment. "
                f"The structural indicators suggest a constitution that benefits significantly "
                f"from deliberate, consistent health support. "
                f"With appropriate lifestyle, diet, and medical awareness, "
                f"this structure can be substantially reinforced.")

    return score, note


# ---------------------------------------------------------------------------
# G. Health Signals
# ---------------------------------------------------------------------------

def _build_health_signals(
    profile: "HealthProfile",
    system:  str = "western",
) -> List[Dict]:
    """Build collector.py-ready signals from the health profile."""
    signals: List[Dict] = []

    # Vitality signal
    vit_tone = ("strongly_positive" if profile.vitality_level == Magnitude.HIGH
                else "positive" if profile.vitality_level == Magnitude.MODERATE
                else "challenging")
    signals.append({
        "feature":  "constitutional_vitality",
        "domain":   "health",
        "tone":     vit_tone,
        "strength": profile.vitality_score,
        "reading":  (f"Constitutional vitality: {profile.vitality_level.value} "
                     f"(score {profile.vitality_score}). "
                     f"Constitution type: {profile.constitution_type}. "
                     f"Ayurvedic dosha: {profile.dosha_tendency}."),
        "keywords": ["vitality", "constitution", profile.constitution_type, profile.dosha_tendency],
        "astro_affinity": ["Sun", "Mars", "Jupiter"],
        "numerology_link": [1, 9],
        "chinese_element": profile.chinese_element,
        "temporal_phase": "timeless", "retrograde": False, "house": 1, "system": system,
    })

    # Top 3 vulnerability signals
    for vuln in profile.vulnerabilities[:3]:
        tone = ("challenging" if vuln.severity == Magnitude.HIGH
                else "neutral" if vuln.severity == Magnitude.MODERATE
                else "positive")
        signals.append({
            "feature": f"health_vulnerability_{vuln.system}",
            "domain":  "health",
            "tone":    tone,
            "strength": 0.80 if vuln.severity == Magnitude.HIGH else 0.60,
            "reading": vuln.note,
            "keywords": ["vulnerability", vuln.system, "preventive_care"],
            "astro_affinity": [vuln.planet_indicator.split(" ")[0]],
            "numerology_link": [],
            "chinese_element": vuln.chinese_element or profile.chinese_element,
            "temporal_phase": "timeless", "retrograde": False, "house": None, "system": system,
        })

    # Mental health signal
    mh_tone = ("positive"    if "resilient" in profile.mental_health.primary_pattern
               else "neutral" if "balanced"  in profile.mental_health.primary_pattern
               else "challenging")
    signals.append({
        "feature": f"mental_health_{profile.mental_health.primary_pattern}",
        "domain":  "health",
        "tone":    mh_tone,
        "strength": 0.75,
        "reading": profile.mental_health.note,
        "keywords": ["mental_health", profile.mental_health.primary_pattern, "psychological_pattern"],
        "astro_affinity": ["Mercury", "Moon", "Saturn"],
        "numerology_link": [5, 7],
        "chinese_element": "metal",
        "temporal_phase": "timeless", "retrograde": False, "house": None, "system": system,
    })

    # Longevity signal
    lon_tone = ("strongly_positive" if profile.longevity_score >= 0.72
                else "positive" if profile.longevity_score >= 0.50
                else "neutral")
    signals.append({
        "feature": "structural_longevity",
        "domain":  "health",
        "tone":    lon_tone,
        "strength": profile.longevity_score,
        "reading": profile.longevity_note,
        "keywords": ["longevity", "constitution", "structural_vitality"],
        "astro_affinity": ["Saturn", "Jupiter", "Sun"],
        "numerology_link": [4, 8],
        "chinese_element": "water",
        "temporal_phase": "timeless", "retrograde": False, "house": 8, "system": system,
    })

    return signals


# ---------------------------------------------------------------------------
# H. Remedy Generation
# ---------------------------------------------------------------------------

def _generate_health_remedies(
    profile: "HealthProfile",
) -> Tuple[List[str], List[str], List[str], List[str]]:
    """
    Generate four categories of health remedies calibrated to the profile.
    Returns (lifestyle, dietary, exercise, mental).
    """
    lifestyle: List[str] = []
    dietary:   List[str] = []
    exercise:  List[str] = []
    mental:    List[str] = []

    dosha = profile.dosha_tendency
    vuln_systems = [v.system for v in profile.vulnerabilities if v.severity == Magnitude.HIGH]

    # ── Dosha-specific lifestyle ──────────────────────────────────────────
    if "vata" in dosha:
        lifestyle.extend([
            "VATA BALANCE: Consistent daily routine is the primary Vata remedy. "
            "Wake, eat, sleep, and work at consistent times. Vata thrives on rhythm.",
            "Oil self-massage (Abhyanga) with warm sesame oil before bathing — "
            "grounding, nourishing, and calming for the Vata nervous system.",
            "Warmth: warm clothes, warm food, warm environments. Vata constitution "
            "deteriorates with cold, wind, and dryness.",
        ])
        dietary.extend([
            "VATA DIET: Warm, oily, grounding, sweet foods. Soups, stews, root vegetables, "
            "ghee, warm milk, sesame, nuts, avocado.",
            "Avoid: raw vegetables, cold foods, ice, excessive caffeine, drying crackers "
            "and chips — these aggravate Vata's natural dryness.",
            "Eat in a calm, seated environment — Vata digestion is disrupted by eating "
            "while standing, rushing, or under stress.",
        ])
        exercise.extend([
            "VATA EXERCISE: Gentle, grounding, rhythmic exercise. Yoga (particularly Yin or Hatha), "
            "walking in nature, swimming, Tai Chi.",
            "Avoid: high-impact, erratic, extreme sports. Vata depletes quickly in intense activity.",
            "Exercise in the morning (6–10am) when Kapha provides structural support for Vata's movement.",
        ])
    elif "pitta" in dosha:
        lifestyle.extend([
            "PITTA BALANCE: Cool, calm environments. Avoid overheating in work, relationships, "
            "and environment. Take time in nature near water.",
            "Structure workload to prevent the Pitta tendency toward overwork and perfectionism. "
            "Scheduled rest is not optional — it is metabolic medicine for Pitta.",
        ])
        dietary.extend([
            "PITTA DIET: Cool, sweet, bitter, astringent foods. Salads, coconut, cucumber, "
            "sweet fruits, dairy, coriander, mint, turmeric.",
            "Avoid: spicy, sour, fermented foods, red meat, alcohol, excessive coffee "
            "— these stoke the already-hot Pitta fire.",
            "Eat at regular meal times — Pitta's strong digestion fires can become "
            "hypoglycaemic when meals are delayed.",
        ])
        exercise.extend([
            "PITTA EXERCISE: Moderate intensity, non-competitive, cooling activities. "
            "Swimming, cycling, hiking, yoga.",
            "Avoid: exercising in peak heat (10am–2pm), extremely competitive sports "
            "that stoke Pitta aggression.",
        ])
    elif "kapha" in dosha:
        lifestyle.extend([
            "KAPHA BALANCE: Stimulation, movement, and variety are the primary Kapha remedies. "
            "The Kapha tendency is toward inertia — structure must actively counter this.",
            "Avoid daytime sleeping — it aggravates Kapha. Early morning (before 6am) "
            "is the most energetically clearing time for Kapha.",
        ])
        dietary.extend([
            "KAPHA DIET: Light, dry, spicy, warming foods. Legumes, vegetables, spices, "
            "honey (not heated), light grains.",
            "Avoid: dairy, cold foods, heavy sweets, fried foods, wheat in excess "
            "— these amplify Kapha's natural heaviness.",
            "Smaller portions, two main meals, and avoid eating after 6pm to prevent "
            "Kapha accumulation.",
        ])
        exercise.extend([
            "KAPHA EXERCISE: Vigorous, sustained, varied exercise. Running, dancing, "
            "competitive sports, strength training.",
            "Exercise in the early morning — the Kapha time of day (6–10am) "
            "is best cleared with vigorous physical activity.",
        ])

    # ── Vulnerability-specific remedies ──────────────────────────────────
    if "cardiovascular" in vuln_systems:
        lifestyle.append("CARDIOVASCULAR: Regular monitoring of blood pressure and heart rate. "
                          "Mediterranean diet pattern. Stress reduction as primary cardiac medicine.")
    if "digestive" in vuln_systems or "hepatic" in vuln_systems:
        dietary.append("DIGESTIVE SUPPORT: Probiotic-rich foods (kefir, kimchi, sauerkraut). "
                       "Digestive bitters before meals. Liver support: dandelion, milk thistle, turmeric.")
    if "nervous" in vuln_systems or "nervous_respiratory" in vuln_systems:
        lifestyle.append("NERVOUS SYSTEM: Magnesium glycinate at bedtime. B-complex vitamins. "
                         "Digital sunset — no screens 1 hour before sleep. Nature exposure daily.")
    if "immune" in vuln_systems or "immune_mysterious" in vuln_systems:
        dietary.append("IMMUNE SUPPORT: Zinc, vitamin D3+K2, vitamin C complex (food-based). "
                        "Reduce processed sugar — sugar suppresses immune function for hours after consumption.")
    if "musculoskeletal" in vuln_systems or "structural_chronic" in vuln_systems:
        exercise.append("STRUCTURAL HEALTH: Weight-bearing exercise 3x/week for bone density. "
                         "Calcium + magnesium + vitamin D3 supplementation. "
                         "Regular stretching and joint mobility work.")

    # ── Mental health remedies (pass through from mental profile) ─────────
    mental.extend(profile.mental_health.remedies)
    if not mental:
        mental.extend([
            "Daily mindfulness or meditation practice (10 minutes minimum).",
            "Regular social connection and meaningful engagement.",
            "Sleep hygiene: consistent sleep and wake times, dark and cool room.",
        ])

    # ── Universal preventive recommendations ─────────────────────────────
    lifestyle.append("UNIVERSAL: Annual comprehensive blood panel (full metabolic, lipid, hormonal, "
                      "inflammatory markers) as the foundation of preventive care.")
    lifestyle.append("SLEEP: 7–9 hours of consistent sleep is the most powerful health intervention "
                     "available. Prioritise before all other health practices.")

    return lifestyle[:6], dietary[:5], exercise[:4], mental[:4]


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class HealthEngine:
    """
    Stateless constitutional health analysis engine.

    Takes natal chart data, numerology, and optional biometric inputs.
    Produces a HealthProfile for the Logic Layer / LLM Narrator.

    IMPORTANT: All outputs are structural indicators and constitutional
    tendencies — never medical diagnoses or prognoses. The Logic Layer
    must always include the appropriate disclaimer when presenting
    health readings to clients.

    Usage:
        engine = HealthEngine()
        profile = engine.compute(
            positions=natal_positions,
            houses=natal_houses,
            life_path=5,
            palm_health_markers=palm_features.health_markers,
            face_health_markers=face_features.face_health_markers,
        )
    """

    def compute(
        self,
        positions:           Dict,
        houses:              Dict,
        life_path:           Optional[int]   = None,
        palm_health_markers: Optional[List]  = None,
        face_health_markers: Optional[List]  = None,
        system:              str             = "western",
    ) -> HealthProfile:
        """
        Compute a complete constitutional health profile.

        Args:
            positions:  Dict of planetary positions from astrology_engine
            houses:     Dict of house cusps from astrology_engine
            life_path:  Numerology Life Path number (optional but recommended)
            palm_health_markers: List of HealthMarker from palm_engine v4.0.0 (optional)
            face_health_markers: List of FaceHealthMarker from face_engine v3.0.0 (optional)
            system:     "western" or "vedic"

        Returns:
            HealthProfile — complete constitutional health analysis.
            All content is structural indicator data only.
        """
        import time
        t0 = time.monotonic()

        # ── A. Constitution and dosha ──────────────────────────────────────
        constitution, dosha, chinese_element = _assess_constitution(
            positions, houses, life_path
        )

        # ── B. Vitality ────────────────────────────────────────────────────
        vitality_score, vitality_level = _assess_vitality(positions, houses)

        # ── C. Vulnerabilities (multi-source) ─────────────────────────────
        vulnerabilities = _identify_vulnerabilities(
            positions, houses, life_path,
            palm_health_markers, face_health_markers,
        )

        # ── D. Organ system map ────────────────────────────────────────────
        organ_systems = _map_organ_systems(positions, houses, dosha)

        # ── E. Mental health ───────────────────────────────────────────────
        mental_health = _assess_mental_health(positions, houses)

        # ── F. Longevity ───────────────────────────────────────────────────
        longevity_score, longevity_note = _assess_longevity(positions, houses)

        # ── Key indicator summaries ────────────────────────────────────────
        # Primary health planet: most health-significant in chart
        health_planet_priority = ["Saturn", "Neptune", "Mars", "Moon", "Sun", "Jupiter"]
        primary_health_planet = next(
            (p for p in health_planet_priority
             if _house_of(p, positions, houses) in (1, 6, 8, 12)),
            health_planet_priority[0] if positions else None
        )

        # Primary vulnerability
        primary_vulnerability = (
            vulnerabilities[0].system if vulnerabilities else None
        )

        # Numerology health focus
        num_focus = (
            _LP_HEALTH[life_path]["focus"] if life_path and life_path in _LP_HEALTH else None
        )

        # ── Build preliminary profile ──────────────────────────────────────
        profile = HealthProfile(
            constitution_type  = constitution,
            dosha_tendency     = dosha,
            chinese_element    = chinese_element,
            vitality_level     = vitality_level,
            vitality_score     = vitality_score,
            vulnerabilities    = vulnerabilities,
            organ_systems      = organ_systems,
            mental_health      = mental_health,
            longevity_score    = longevity_score,
            longevity_note     = longevity_note,
            health_signals     = [],           # filled below
            lifestyle_remedies = [],
            dietary_remedies   = [],
            exercise_remedies  = [],
            mental_remedies    = [],
            primary_health_planet    = primary_health_planet,
            primary_vulnerability    = primary_vulnerability,
            numerology_health_focus  = num_focus,
        )

        # ── H. Signals ────────────────────────────────────────────────────
        profile.health_signals = _build_health_signals(profile, system)

        # ── I. Remedies ───────────────────────────────────────────────────
        (profile.lifestyle_remedies,
         profile.dietary_remedies,
         profile.exercise_remedies,
         profile.mental_remedies) = _generate_health_remedies(profile)

        ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "HealthEngine.compute completed",
            extra={
                "constitution":      constitution,
                "dosha":             dosha,
                "vitality_level":    vitality_level.value,
                "vitality_score":    vitality_score,
                "vulnerabilities":   len(vulnerabilities),
                "high_severity":     sum(1 for v in vulnerabilities if v.severity == Magnitude.HIGH),
                "mental_pattern":    mental_health.primary_pattern,
                "longevity_score":   longevity_score,
                "signals":           len(profile.health_signals),
                "reading_ms":        ms,
            },
        )

        return profile


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def compute_health_profile(
    positions:           Dict,
    houses:              Dict,
    life_path:           Optional[int]  = None,
    palm_health_markers: Optional[List] = None,
    face_health_markers: Optional[List] = None,
    system:              str            = "western",
) -> HealthProfile:
    """
    Module-level convenience wrapper for HealthEngine.compute().

    Example:
        from synthesis.astrology_engine import _calculate_positions, _calculate_houses, _julian_day
        from synthesis.health_engine import compute_health_profile

        jd = _julian_day(1985, 3, 15, 14.5, 8.0)
        positions = _calculate_positions(jd)
        houses = _calculate_houses(jd, 3.147, 101.695)

        profile = compute_health_profile(
            positions=positions,
            houses=houses,
            life_path=5,
        )
        print(profile.constitution_type)     # e.g. "sensitive"
        print(profile.dosha_tendency)        # e.g. "vata_pitta"
        print(profile.vitality_level.value)  # "moderate"
        print(len(profile.health_signals), "signals for collector")
        for v in profile.vulnerabilities:
            print(f"  {v.severity.value}: {v.system} — {v.planet_indicator}")
    """
    return HealthEngine().compute(
        positions=positions, houses=houses,
        life_path=life_path,
        palm_health_markers=palm_health_markers,
        face_health_markers=face_health_markers,
        system=system,
    )
