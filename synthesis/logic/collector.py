"""
Logic Engine — Collector
=========================
Gathers all available reader outputs and assembles them into
a unified SignalMap organised by domain.

The collector is the bridge between the four reader layers
and the logic engine processing chain.

Responsibilities:
    1. Accept PalmReading, FaceReading, and computed
       astrology/numerology signals
    2. Accept new engine profiles: SpiritProfile, HealthProfile,
       SynastryProfile, and RemedyBundle (v2.0.0)
    3. Normalise all signals to RawSignal format
    4. Apply initial system weights from AstrologyWeighting
    5. Organise by domain into SignalMap
    6. Flag low-confidence signals for the weigher

v2.0.0 additions:
    - _extract_spirit_signals()   — SpiritProfile.spirit_signals -> RawSignal
    - _extract_health_signals()   — HealthProfile.health_signals -> RawSignal
    - _extract_synastry_signals() — SynastryProfile.synastry_signals -> RawSignal
    - _extract_remedy_signals()   — RemedyBundle.remedy_signals -> RawSignal
    - collect_signals() extended with four new optional profile parameters
    - _SYSTEM_BASE_WEIGHTS extended: spirit_world (0.85), health_engine (0.85),
      synastry (0.90), remedies (0.75)
    - New available_systems tokens: "spirit_world", "health_engine",
      "synastry", "remedies"
    - _extract_engine_profile_signals() — shared helper for all Dict-list profiles
    - tier_detector removed (tier system deprecated)

What the collector does NOT do:
    - Interpret signals (that is the reader's job)
    - Resolve conflicts (that is the resolver's job)
    - Apply esoteric frameworks (that is the synthesiser's job)
    - Compute astrology or numerology (those have their own engines)

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from .models import (
    UserInput,
    SignalMap,
    RawSignal,
    Domain,
    SignalTone,
    CulturalProfile,
    AstrologyWeighting,
    ReadingTier,
    ALL_DOMAINS,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tone normalisation
# Maps reader tone strings to SignalTone enum
# ---------------------------------------------------------------------------

_TONE_MAP = {
    "strongly_positive":    SignalTone.STRONGLY_POSITIVE,
    "positive":             SignalTone.POSITIVE,
    "neutral":              SignalTone.NEUTRAL,
    "challenging":          SignalTone.CHALLENGING,
    "strongly_challenging": SignalTone.STRONGLY_CHALLENGING,
    "absent":               SignalTone.NEUTRAL,
    "unclear":              SignalTone.NEUTRAL,
}

def _normalise_tone(tone_str: str) -> SignalTone:
    return _TONE_MAP.get(str(tone_str).lower(), SignalTone.NEUTRAL)


# ---------------------------------------------------------------------------
# System base weights
# Applied before per-signal confidence
# v2.0.0: added spirit_world, health_engine, synastry, remedies
# ---------------------------------------------------------------------------

_SYSTEM_BASE_WEIGHTS = {
    # v1.0.0 systems
    "astrology":    1.00,   # Modified by AstrologyWeighting per origin
    "numerology":   0.90,
    "physiognomy":  0.85,
    "palmistry":    0.90,
    # v2.0.0 systems
    "spirit_world": 0.85,   # SpiritProfile.spirit_signals
    "health_engine":0.85,   # HealthProfile.health_signals
    "synastry":     0.90,   # SynastryProfile.synastry_signals (Union Blueprint)
    "remedies":     0.75,   # RemedyBundle.remedy_signals (supportive / lower weight)
}


# ---------------------------------------------------------------------------
# v2.0.0 — Shared engine-profile extractor
# All new engines produce signals in the same dict format as astrology_engine.
# This single helper handles all four new profile types.
# ---------------------------------------------------------------------------

def _extract_engine_profile_signals(
    signals_list: List[Dict],
    system_key:   str,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Convert a pre-formatted List[Dict] of engine signals into RawSignals.

    All v2.0.0 engines (spirit, health, synastry, remedies) produce
    collector-ready signals in the same format as astrology_engine:
        {
            "feature":         str,
            "domain":          str,
            "tone":            str,
            "strength":        float,
            "reading":         str,
            "keywords":        List[str],
            "astro_affinity":  List[str],
            "numerology_link": List[int],
            "chinese_element": str | None,
            "temporal_phase":  str,
            "retrograde":      bool,
            "house":           int | None,
            "system":          str,
        }

    Args:
        signals_list:  The engine's pre-formatted signals list
        system_key:    Key into _SYSTEM_BASE_WEIGHTS (e.g. "spirit_world")
        tier_modifier: Base confidence modifier

    Returns:
        List[RawSignal] ready for domain_map insertion
    """
    raw_signals: List[RawSignal] = []
    base_weight = _SYSTEM_BASE_WEIGHTS.get(system_key, 0.80) * tier_modifier

    for sig in signals_list:
        feature   = str(sig.get("feature",  "unknown"))
        domain    = _normalise_domain_str(str(sig.get("domain", "character")))
        tone      = _normalise_tone(str(sig.get("tone",    "neutral")))
        strength  = float(sig.get("strength", 0.70))
        strength  = round(min(max(strength, 0.0), 1.0), 3)

        raw_signals.append(RawSignal(
            system         = system_key,
            feature        = feature,
            domain         = domain,
            tone           = tone,
            strength       = strength,
            reading        = str(sig.get("reading",        "")),
            keywords       = list(sig.get("keywords",       [])),
            astro_affinity = list(sig.get("astro_affinity", [])),
            numerology_link= list(sig.get("numerology_link",[])),
            chinese_element= sig.get("chinese_element"),
            weight         = round(base_weight * strength, 3),
        ))

    return raw_signals


# ---------------------------------------------------------------------------
# v2.0.0 — Spirit profile extraction
# ---------------------------------------------------------------------------

def _extract_spirit_signals(
    spirit_profile: Any,
    tier_modifier:  float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a SpiritProfile.

    SpiritProfile.spirit_signals is already in collector-ready dict format,
    produced by spirit_engine._build_spirit_signals().

    Domains covered: "spiritual", "spirit_world", "character"
    System key: "spirit_world"
    """
    if spirit_profile is None:
        return []

    spirit_signals: List[Dict] = getattr(spirit_profile, "spirit_signals", [])
    if not spirit_signals:
        return []

    return _extract_engine_profile_signals(spirit_signals, "spirit_world", tier_modifier)


# ---------------------------------------------------------------------------
# v2.0.0 — Health profile extraction
# ---------------------------------------------------------------------------

def _extract_health_signals(
    health_profile: Any,
    tier_modifier:  float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a HealthProfile.

    HealthProfile.health_signals is already in collector-ready dict format,
    produced by health_engine._build_health_signals().

    Domains covered: "health"
    System key: "health_engine"
    """
    if health_profile is None:
        return []

    health_signals: List[Dict] = getattr(health_profile, "health_signals", [])
    if not health_signals:
        return []

    return _extract_engine_profile_signals(health_signals, "health_engine", tier_modifier)


# ---------------------------------------------------------------------------
# v2.0.0 — Synastry profile extraction (Union Blueprint only)
# ---------------------------------------------------------------------------

def _extract_synastry_signals(
    synastry_profile: Any,
    tier_modifier:    float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a SynastryProfile.

    SynastryProfile.synastry_signals is already in collector-ready dict format,
    produced by synastry_engine._build_synastry_signals().

    Domains covered:
        "love", "sexuality", "children_forecast", "career", "wealth",
        "health", "spiritual", "character", "death_transition"

    System key: "synastry"

    This extractor is only called for the Union Blueprint ($397 tool).
    For the Individual Blueprint, synastry_profile is always None.
    """
    if synastry_profile is None:
        return []

    synastry_signals: List[Dict] = getattr(synastry_profile, "synastry_signals", [])
    if not synastry_signals:
        return []

    return _extract_engine_profile_signals(synastry_signals, "synastry", tier_modifier)


# ---------------------------------------------------------------------------
# v2.0.0 — Remedy bundle extraction
# ---------------------------------------------------------------------------

def _extract_remedy_signals(
    remedy_bundle: Any,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a RemedyBundle.

    RemedyBundle.remedy_signals is already in collector-ready dict format,
    produced by remedies_engine._build_remedy_signals().

    These signals carry lower base weight (0.75) than analytical signals —
    they are prescriptive/supportive rather than descriptive/diagnostic.

    Domains covered: "spiritual", "health", "wealth", "character"
    System key: "remedies"
    """
    if remedy_bundle is None:
        return []

    remedy_signals: List[Dict] = getattr(remedy_bundle, "remedy_signals", [])
    if not remedy_signals:
        return []

    return _extract_engine_profile_signals(remedy_signals, "remedies", tier_modifier)


# ---------------------------------------------------------------------------
# Palm signal extraction (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_palm_signals(
    palm_reading: Any,
    hand_label: str,
    confidence: float,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a PalmReading object.
    Handles all feature types: hand shape, lines, mounts, fingers, skin.
    """
    signals = []
    base_weight = _SYSTEM_BASE_WEIGHTS["palmistry"] * tier_modifier

    if palm_reading is None:
        return signals

    feature_attrs = [
        "life_line", "heart_line", "head_line", "fate_line",
        "sun_line", "mercury_line",
        "mount_venus", "mount_jupiter", "mount_saturn", "mount_apollo",
        "mount_mercury", "mount_mars_upper", "mount_moon", "mount_neptune",
        "thumb", "index", "middle", "ring", "pinky",
        "marriage_lines", "girdle_venus", "intuition_line", "skin",
    ]

    # Hand shape — foundation signal, goes to all domains
    shape_reading = getattr(palm_reading, "hand_shape", None)
    if shape_reading is not None:
        for dr in getattr(shape_reading, "domains", []):
            tone = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            strength = float(getattr(dr, "signal_strength", "moderate") == "strong") * 0.3 + 0.7
            signals.append(RawSignal(
                system         = "palmistry",
                feature        = f"hand_shape_{hand_label}",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(min(confidence * strength, 1.0), 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= None,
                weight         = round(base_weight * confidence * strength, 3),
            ))

    # Feature readings
    for attr in feature_attrs:
        feat = getattr(palm_reading, attr, None)
        if feat is None:
            continue

        feat_sig_str = str(getattr(feat, "signal_strength", "moderate")).lower()
        if feat_sig_str == "absent":
            continue

        feat_conf = _signal_strength_to_float(feat_sig_str)

        for dr in getattr(feat, "domains", []):
            tone = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            dr_strength = _signal_strength_to_float(
                str(getattr(dr, "signal_strength", "moderate"))
            )
            combined_conf = min(confidence * feat_conf * dr_strength, 1.0)

            signals.append(RawSignal(
                system         = "palmistry",
                feature        = f"{attr}_{hand_label}",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(combined_conf, 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= None,
                weight         = round(base_weight * combined_conf, 3),
            ))

    return signals


# ---------------------------------------------------------------------------
# Face signal extraction (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_face_signals(
    face_reading: Any,
    confidence: float,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract RawSignals from a FaceReading object.
    Includes face shape, all facial features, symmetry, proportions,
    expression, and aging markers.
    """
    signals = []
    base_weight = _SYSTEM_BASE_WEIGHTS["physiognomy"] * tier_modifier

    if face_reading is None:
        return signals

    feature_attrs = [
        "forehead", "eyes", "brows", "nose", "cheeks",
        "lips", "jaw", "skin",
    ]

    # Face shape — foundation
    shape_reading = getattr(face_reading, "face_shape", None)
    if shape_reading is not None:
        for dr in getattr(shape_reading, "domains", []):
            tone     = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            strength = 0.90
            signals.append(RawSignal(
                system         = "physiognomy",
                feature        = "face_shape",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(min(confidence * strength, 1.0), 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= str(getattr(dr, "chinese_element", "mixed")),
                weight         = round(base_weight * confidence * strength, 3),
            ))

    # Feature readings
    for attr in feature_attrs:
        feat = getattr(face_reading, attr, None)
        if feat is None:
            continue

        feat_sig_str = str(getattr(feat, "signal_strength", "moderate")).lower()
        if feat_sig_str == "absent":
            continue

        feat_conf = _signal_strength_to_float(feat_sig_str)

        for dr in getattr(feat, "domains", []):
            tone      = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            dr_str    = _signal_strength_to_float(
                str(getattr(dr, "signal_strength", "moderate"))
            )
            combined  = min(confidence * feat_conf * dr_str, 1.0)
            element   = str(getattr(dr, "chinese_element", "mixed"))

            signals.append(RawSignal(
                system         = "physiognomy",
                feature        = attr,
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(combined, 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= element,
                weight         = round(base_weight * combined, 3),
            ))

    # Symmetry reading
    sym = getattr(face_reading, "symmetry", None)
    if sym is not None:
        for dr in getattr(sym, "domains", []):
            tone = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            signals.append(RawSignal(
                system         = "physiognomy",
                feature        = "facial_symmetry",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(confidence * 0.80, 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= "metal",
                weight         = round(base_weight * confidence * 0.80, 3),
            ))

    # Proportions reading
    props = getattr(face_reading, "proportions", None)
    if props is not None:
        for dr in getattr(props, "domains", []):
            tone = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            signals.append(RawSignal(
                system         = "physiognomy",
                feature        = "facial_proportions",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(confidence * 0.75, 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= "earth",
                weight         = round(base_weight * confidence * 0.75, 3),
            ))

    # Expression reading
    expr = getattr(face_reading, "expression", None)
    if expr is not None:
        for dr in getattr(expr, "domains", []):
            tone = _normalise_tone(str(getattr(dr, "tone", "neutral")))
            signals.append(RawSignal(
                system         = "physiognomy",
                feature        = "expression",
                domain         = _normalise_domain(dr.domain),
                tone           = tone,
                strength       = round(confidence * 0.70, 3),
                reading        = str(getattr(dr, "reading", "")),
                keywords       = list(getattr(dr, "keywords", [])),
                astro_affinity = list(getattr(dr, "astro_affinity", [])),
                numerology_link= list(getattr(dr, "numerology_link", [])),
                chinese_element= None,
                weight         = round(base_weight * confidence * 0.70, 3),
            ))

    return signals


# ---------------------------------------------------------------------------
# Astrology signal extraction (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_astrology_signals(
    astrology_data: Optional[Dict],
    weighting: AstrologyWeighting,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract RawSignals from pre-computed astrology data.

    Expected astrology_data format (from astrology_engine.py):
    {
        "system": "western" | "vedic" | "chinese",
        "signals": [
            {
                "feature": "venus_placement",
                "domain": "love",
                "tone": "strongly_positive",
                "strength": 0.85,
                "reading": "Venus in 7th house...",
                "keywords": [...],
                "astro_affinity": ["Venus", "Libra"],
                "numerology_link": [6, 2],
                "chinese_element": "metal"
            },
            ...
        ]
    }
    """
    signals = []
    if not astrology_data:
        return signals

    system_str = str(astrology_data.get("system", "western")).lower()

    if system_str == weighting.primary_system.value:
        system_weight = (
            _SYSTEM_BASE_WEIGHTS["astrology"] *
            weighting.primary_weight *
            tier_modifier
        )
    else:
        system_weight = (
            _SYSTEM_BASE_WEIGHTS["astrology"] *
            weighting.secondary_weight *
            tier_modifier
        )

    hour_modifier = 0.75 if weighting.hour_uncertain else 1.0

    hour_dependent_features = {
        "ascendant", "midheaven", "1st_house", "4th_house",
        "7th_house", "10th_house", "hour_pillar", "ba_zi_hour",
        "lagna", "arudha_lagna",
    }

    for raw in astrology_data.get("signals", []):
        feature   = str(raw.get("feature", "unknown"))
        domain    = _normalise_domain_str(str(raw.get("domain", "character")))
        tone      = _normalise_tone(str(raw.get("tone", "neutral")))
        strength  = float(raw.get("strength", 0.70))
        is_hour_dep = any(h in feature.lower() for h in hour_dependent_features)
        eff_strength = strength * (hour_modifier if is_hour_dep else 1.0)

        signals.append(RawSignal(
            system         = f"astrology_{system_str}",
            feature        = feature,
            domain         = domain,
            tone           = tone,
            strength       = round(min(eff_strength, 1.0), 3),
            reading        = str(raw.get("reading", "")),
            keywords       = list(raw.get("keywords", [])),
            astro_affinity = list(raw.get("astro_affinity", [])),
            numerology_link= list(raw.get("numerology_link", [])),
            chinese_element= raw.get("chinese_element"),
            weight         = round(system_weight * eff_strength, 3),
        ))

    return signals


# ---------------------------------------------------------------------------
# Numerology signal extraction (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_numerology_signals(
    numerology_data: Optional[Dict],
    primary_weight: float,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract RawSignals from pre-computed numerology data.

    Expected numerology_data format (from numerology_engine.py):
    {
        "system": "pythagorean" | "chaldean" | "vedic",
        "signals": [
            {
                "feature": "life_path",
                "domain": "career",
                "tone": "positive",
                "strength": 0.90,
                "reading": "Life Path 8...",
                "keywords": [...],
                "astro_affinity": ["Saturn", "Capricorn"],
                "numerology_link": [8],
                "chinese_element": "earth"
            },
            ...
        ]
    }
    """
    signals = []
    if not numerology_data:
        return signals

    system_str   = str(numerology_data.get("system", "pythagorean")).lower()
    system_weight = (
        _SYSTEM_BASE_WEIGHTS["numerology"] *
        primary_weight *
        tier_modifier
    )

    for raw in numerology_data.get("signals", []):
        feature  = str(raw.get("feature", "unknown"))
        domain   = _normalise_domain_str(str(raw.get("domain", "character")))
        tone     = _normalise_tone(str(raw.get("tone", "neutral")))
        strength = float(raw.get("strength", 0.85))

        signals.append(RawSignal(
            system         = f"numerology_{system_str}",
            feature        = feature,
            domain         = domain,
            tone           = tone,
            strength       = round(min(strength, 1.0), 3),
            reading        = str(raw.get("reading", "")),
            keywords       = list(raw.get("keywords", [])),
            astro_affinity = list(raw.get("astro_affinity", [])),
            numerology_link= list(raw.get("numerology_link", [])),
            chinese_element= raw.get("chinese_element"),
            weight         = round(system_weight * strength, 3),
        ))

    return signals


# ---------------------------------------------------------------------------
# Cross-hand palm signals (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_cross_hand_signals(
    cross_hand: Any,
    confidence: float,
    tier_modifier: float,
) -> List[RawSignal]:
    """
    Extract signals from the cross-hand comparison.
    These are delta signals — they speak to growth and suppression
    rather than raw feature readings.
    """
    signals = []
    if cross_hand is None:
        return signals

    base_weight = _SYSTEM_BASE_WEIGHTS["palmistry"] * tier_modifier

    for line_name in getattr(cross_hand, "growth_indicators", []):
        domain = _line_to_domain(line_name)
        signals.append(RawSignal(
            system         = "palmistry",
            feature        = f"cross_hand_growth_{line_name}",
            domain         = domain,
            tone           = SignalTone.POSITIVE,
            strength       = round(confidence * 0.80, 3),
            reading        = (
                f"Cross-hand analysis: {line_name.replace('_', ' ')} shows "
                "conscious development beyond innate baseline. "
                "This capacity has been actively cultivated."
            ),
            keywords       = ["development", "growth", "conscious_cultivation"],
            astro_affinity = [],
            numerology_link= [],
            chinese_element= None,
            weight         = round(base_weight * confidence * 0.80, 3),
        ))

    for line_name in getattr(cross_hand, "suppressed", []):
        domain = _line_to_domain(line_name)
        signals.append(RawSignal(
            system         = "palmistry",
            feature        = f"cross_hand_suppressed_{line_name}",
            domain         = domain,
            tone           = SignalTone.NEUTRAL,
            strength       = round(confidence * 0.75, 3),
            reading        = (
                f"Cross-hand analysis: {line_name.replace('_', ' ')} shows "
                "innate potential exceeding current expression. "
                "This represents an important unlived capacity."
            ),
            keywords       = ["suppressed_potential", "unlived_capacity", "growth_edge"],
            astro_affinity = [],
            numerology_link= [],
            chinese_element= None,
            weight         = round(base_weight * confidence * 0.75, 3),
        ))

    for line_name in getattr(cross_hand, "fulfilled", []):
        domain = _line_to_domain(line_name)
        signals.append(RawSignal(
            system         = "palmistry",
            feature        = f"cross_hand_aligned_{line_name}",
            domain         = domain,
            tone           = SignalTone.STRONGLY_POSITIVE,
            strength       = round(confidence * 0.85, 3),
            reading        = (
                f"Cross-hand analysis: {line_name.replace('_', ' ')} is "
                "fully aligned between both hands. "
                "Innate potential and current expression are in harmony."
            ),
            keywords       = ["alignment", "fulfilled_potential", "harmony"],
            astro_affinity = [],
            numerology_link= [],
            chinese_element= None,
            weight         = round(base_weight * confidence * 0.85, 3),
        ))

    return signals


# ---------------------------------------------------------------------------
# Main collector (v2.0.0 — extended with four new profile parameters)
# tier_assessment is now Any (tier system deprecated)
# ---------------------------------------------------------------------------

def collect_signals(
    user_input:       UserInput,
    tier_assessment:  Any,
    cultural_profile: CulturalProfile,
    astro_weighting:  AstrologyWeighting,
    # Astrology and numerology pre-computed signals (v1.0.0)
    astrology_primary:    Optional[Dict] = None,
    astrology_secondary:  Optional[Dict] = None,
    numerology_primary:   Optional[Dict] = None,
    numerology_secondary: Optional[Dict] = None,
    # v2.0.0 — new engine profiles (all optional)
    spirit_profile:   Optional[Any] = None,
    health_profile:   Optional[Any] = None,
    synastry_profile: Optional[Any] = None,
    remedy_bundle:    Optional[Any] = None,
) -> SignalMap:
    """
    Assemble all available signals into a unified SignalMap.

    Args:
        user_input:           Complete UserInput
        tier_assessment:      SimpleNamespace with .tier and .base_confidence_modifier
        cultural_profile:     From astrology_selector.select_systems()
        astro_weighting:      From astrology_selector.select_systems()
        astrology_primary:    Pre-computed primary astrology signals dict
        astrology_secondary:  Pre-computed secondary astrology signals dict
        numerology_primary:   Pre-computed primary numerology signals dict
        numerology_secondary: Pre-computed secondary numerology signals dict
        spirit_profile:       SpiritProfile from spirit_engine (v2.0.0, optional)
        health_profile:       HealthProfile from health_engine (v2.0.0, optional)
        synastry_profile:     SynastryProfile from synastry_engine
                              (v2.0.0, Union Blueprint only, optional)
        remedy_bundle:        RemedyBundle from remedies_engine
                              (v2.0.0, optional)

    Returns:
        SignalMap with all signals organised by domain
    """
    t0 = time.monotonic()
    tier_mod = getattr(tier_assessment, "base_confidence_modifier", 1.0)
    all_signals: List[RawSignal] = []
    available_systems: List[str] = []

    # --- Astrology signals ---
    if astrology_primary:
        primary_sigs = _extract_astrology_signals(
            astrology_primary, astro_weighting, tier_mod
        )
        all_signals.extend(primary_sigs)
        if primary_sigs:
            available_systems.append(
                f"astrology_{astro_weighting.primary_system.value}"
            )

    if astrology_secondary and astro_weighting.secondary_system:
        secondary_sigs = _extract_astrology_signals(
            astrology_secondary, astro_weighting, tier_mod
        )
        all_signals.extend(secondary_sigs)
        if secondary_sigs:
            available_systems.append(
                f"astrology_{astro_weighting.secondary_system.value}"
            )

    # --- Numerology signals ---
    if numerology_primary:
        num_sigs = _extract_numerology_signals(
            numerology_primary,
            cultural_profile.numerology_weight,
            tier_mod,
        )
        all_signals.extend(num_sigs)
        if num_sigs:
            available_systems.append(
                f"numerology_{cultural_profile.numerology_primary.value}"
            )

    if numerology_secondary:
        num2_sigs = _extract_numerology_signals(
            numerology_secondary,
            1.0 - cultural_profile.numerology_weight,
            tier_mod,
        )
        all_signals.extend(num2_sigs)
        if num2_sigs:
            available_systems.append(
                f"numerology_{cultural_profile.numerology_secondary.value}"
                if cultural_profile.numerology_secondary else "numerology_secondary"
            )

    # --- Face signals ---
    if user_input.has_face():
        face_conf = float(
            getattr(user_input.face_reading, "overall_confidence", 0.80)
        )
        face_sigs = _extract_face_signals(
            user_input.face_reading, face_conf, tier_mod
        )
        all_signals.extend(face_sigs)
        if face_sigs:
            available_systems.append("physiognomy")

    # --- Palm signals ---
    if user_input.has_dominant_palm():
        dom_conf = float(
            getattr(user_input.dominant_palm, "overall_confidence", 0.80)
        )
        dom_sigs = _extract_palm_signals(
            user_input.dominant_palm, "dominant", dom_conf, tier_mod
        )
        all_signals.extend(dom_sigs)
        if dom_sigs:
            available_systems.append("palmistry")

    if user_input.has_non_dominant_palm():
        non_conf = float(
            getattr(user_input.non_dominant_palm, "overall_confidence", 0.80)
        )
        non_sigs = _extract_palm_signals(
            user_input.non_dominant_palm, "non_dominant", non_conf, tier_mod
        )
        all_signals.extend(non_sigs)

    # --- Cross-hand signals ---
    if user_input.dual_palm is not None:
        cross = getattr(user_input.dual_palm, "comparison", None)
        if cross:
            cross_conf = float(
                getattr(cross, "comparison_confidence", 0.75)
            )
            cross_sigs = _extract_cross_hand_signals(
                cross, cross_conf, tier_mod
            )
            all_signals.extend(cross_sigs)

    # v2.0.0 new engine profiles

    # --- Spirit profile signals ---
    if spirit_profile is not None:
        spirit_sigs = _extract_spirit_signals(spirit_profile, tier_mod)
        all_signals.extend(spirit_sigs)
        if spirit_sigs:
            available_systems.append("spirit_world")

    # --- Health profile signals ---
    if health_profile is not None:
        health_sigs = _extract_health_signals(health_profile, tier_mod)
        all_signals.extend(health_sigs)
        if health_sigs:
            available_systems.append("health_engine")

    # --- Synastry signals (Union Blueprint only) ---
    if synastry_profile is not None:
        syn_sigs = _extract_synastry_signals(synastry_profile, tier_mod)
        all_signals.extend(syn_sigs)
        if syn_sigs:
            available_systems.append("synastry")

    # --- Remedy bundle signals (supportive layer) ---
    if remedy_bundle is not None:
        rem_sigs = _extract_remedy_signals(remedy_bundle, tier_mod)
        all_signals.extend(rem_sigs)
        if rem_sigs:
            available_systems.append("remedies")

    # Organise by domain
    domain_map: Dict[str, List[RawSignal]] = {d.value: [] for d in ALL_DOMAINS}
    for sig in all_signals:
        domain_key = sig.domain.value if hasattr(sig.domain, "value") else str(sig.domain)
        if domain_key in domain_map:
            domain_map[domain_key].append(sig)
        else:
            domain_map[domain_key] = [sig]

    signal_map = SignalMap(
        session_id        = user_input.session_id or "unknown",
        tier              = tier_assessment.tier,
        cultural_profile  = cultural_profile,
        domains           = domain_map,
        available_systems = list(dict.fromkeys(available_systems)),
        total_signals     = len(all_signals),
    )

    elapsed = int((time.monotonic() - t0) * 1000)
    logger.info(
        "Collector.collect_signals completed",
        extra={
            "session_id":        signal_map.session_id,
            "tier":              tier_assessment.tier.value,
            "total_signals":     signal_map.total_signals,
            "systems":           signal_map.available_systems,
            "elapsed_ms":        elapsed,
            "domains_populated": [
                d for d, sigs in domain_map.items() if sigs
            ],
            "spirit_signals":    len([s for s in all_signals if s.system == "spirit_world"]),
            "health_signals":    len([s for s in all_signals if s.system == "health_engine"]),
            "synastry_signals":  len([s for s in all_signals if s.system == "synastry"]),
            "remedy_signals":    len([s for s in all_signals if s.system == "remedies"]),
        },
    )

    return signal_map


# ---------------------------------------------------------------------------
# Helper utilities (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _signal_strength_to_float(strength_str: str) -> float:
    """Map signal strength string to float multiplier."""
    mapping = {
        "strong":   0.95,
        "moderate": 0.75,
        "weak":     0.45,
        "absent":   0.0,
    }
    return mapping.get(strength_str.lower(), 0.70)


def _normalise_domain(domain_obj: Any) -> Domain:
    """Safely convert a domain value from any reader to Domain enum."""
    if isinstance(domain_obj, Domain):
        return domain_obj
    domain_str = str(domain_obj).lower().strip()
    if "." in domain_str:
        domain_str = domain_str.split(".")[-1].lower()
    try:
        return Domain(domain_str)
    except ValueError:
        return Domain.CHARACTER


def _normalise_domain_str(domain_str: str) -> Domain:
    """Convert plain string to Domain enum."""
    clean = domain_str.lower().strip().split(".")[-1]
    try:
        return Domain(clean)
    except ValueError:
        return Domain.CHARACTER


def _line_to_domain(line_name: str) -> Domain:
    """Map palm line name to its primary domain."""
    mapping = {
        "life_line":     Domain.HEALTH,
        "heart_line":    Domain.LOVE,
        "head_line":     Domain.CAREER,
        "fate_line":     Domain.CAREER,
        "sun_line":      Domain.CAREER,
        "mercury_line":  Domain.HEALTH,
    }
    return mapping.get(line_name, Domain.CHARACTER)