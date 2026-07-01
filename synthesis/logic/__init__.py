"""
Logic Engine — KAYAL Synthesis Platform
=========================================
Main entry point for the logic engine module.

Usage — Individual Blueprint ($297):
    from synthesis.logic import run_logic_engine, UserInput, BirthData, GeoLocation

    result = run_logic_engine(
        user_input        = user_input,
        astrology_primary = astro_data,
        numerology_primary= num_data,
        astrology_timing  = astro_timing,
        numerology_timing = num_timing,
        spirit_profile    = spirit_prof,   # v2.0.0 optional
        health_profile    = health_prof,   # v2.0.0 optional
        remedy_bundle     = remedy_bdl,    # v2.0.0 optional
    )

Usage — Union Blueprint ($397):
    from synthesis.logic import run_union_engine, UserInput, BirthData, GeoLocation

    result = run_union_engine(
        user_input_a      = user_input_a,
        user_input_b      = user_input_b,
        astrology_primary_a = astro_a,
        astrology_primary_b = astro_b,
        numerology_primary_a= num_a,
        astrology_timing_a  = timing_a,
        numerology_timing_a = num_timing_a,
        synastry_profile    = synastry,    # pre-computed from synastry_engine
        spirit_profile_a    = spirit_a,    # optional
        health_profile_a    = health_a,    # optional
    )

    # result is LLMPayload — send to llm_narrator.py
    # All compatibility scores are in % (pct_output_mode=True always)

v2.0.0 additions:
    - run_logic_engine() extended: spirit_profile, health_profile,
      synastry_profile, remedy_bundle passed to collector and synthesiser
    - run_union_engine(): Union Blueprint ($397) full pipeline
        Uses select_union_systems() for two-person system selection
        Routes synastry_profile through collector -> weigher -> resolver -> synthesiser
        pct_output_mode=True enforced: all compatibility output is %
        "Love compatibility: 74%" — always; "compatible/not compatible" — never
    - New imports: select_union_systems, UnionSystemConfig, SpiritProfile,
      HealthProfile, SynastryProfile, RemedyBundle and compute_* wrappers
    - __all__ updated with all new public exports
    - tier_detector removed (tier system deprecated)

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import time
import types
from typing import Any, Dict, Optional, Union

from .models import (
    UserInput,
    BirthData,
    GeoLocation,
    LLMPayload,
    LogicEngineError,
    ReadingTier,
    Domain,
    ALL_DOMAINS,
)
from .astrology_selector import (
    select_systems,
    apply_present_location_modifier,
    # v2.0.0
    select_union_systems,
    select_reading_config,
    UnionSystemConfig,
)
from .collector import collect_signals
from .weigher import weigh_signals, detect_convergence
from .resolver import resolve_conflicts, assess_convergence
from .synthesiser import synthesise
from .payload_builder import build_llm_payload
from .esoteric.four_worlds import map_four_worlds
from .esoteric.sephiroth import activate_sephiroth
from .esoteric.pillars import assess_pillars
from .esoteric.paths import derive_journey_path
from .esoteric.hermetic import apply_hermetic_principles
from .esoteric.chinese import synthesise_chinese
from .esoteric.vedic import synthesise_vedic
from .models import EsotericSynthesis

# v2.0.0 — New engine profile imports (graceful fallback if engines not yet deployed)
try:
    from ..spirit_engine import SpiritProfile, compute_spirit_profile
    _SPIRIT_ENGINE_AVAILABLE = True
except ImportError:
    SpiritProfile = None  # type: ignore
    _SPIRIT_ENGINE_AVAILABLE = False

try:
    from ..health_engine import HealthProfile, compute_health_profile
    _HEALTH_ENGINE_AVAILABLE = True
except ImportError:
    HealthProfile = None  # type: ignore
    _HEALTH_ENGINE_AVAILABLE = False

try:
    from ..synastry_engine import SynastryProfile, compute_synastry_profile
    _SYNASTRY_ENGINE_AVAILABLE = True
except ImportError:
    SynastryProfile = None  # type: ignore
    _SYNASTRY_ENGINE_AVAILABLE = False

try:
    from ..remedies_engine import RemedyBundle, compute_remedy_bundle
    _REMEDIES_ENGINE_AVAILABLE = True
except ImportError:
    RemedyBundle = None  # type: ignore
    _REMEDIES_ENGINE_AVAILABLE = False

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Individual Blueprint pipeline — run_logic_engine()
# v2.0.0: extended with spirit_profile, health_profile,
#         synastry_profile, remedy_bundle parameters
# ---------------------------------------------------------------------------

def run_logic_engine(
    user_input:           UserInput,
    # Astrology and numerology (pre-computed by upstream engines)
    astrology_primary:    Optional[Dict] = None,
    astrology_secondary:  Optional[Dict] = None,
    numerology_primary:   Optional[Dict] = None,
    numerology_secondary: Optional[Dict] = None,
    astrology_timing:     Optional[Dict] = None,
    numerology_timing:    Optional[Dict] = None,
    vedic_chart:          Optional[Dict] = None,
    current_year:         int            = 2026,
    # v2.0.0 — new engine profiles (all optional)
    spirit_profile:   Optional[Any] = None,
    health_profile:   Optional[Any] = None,
    synastry_profile: Optional[Any] = None,   # Union Blueprint only — pass None for Individual
    remedy_bundle:    Optional[Any] = None,
) -> Union[LLMPayload, LogicEngineError]:
    """
    Run the complete logic engine pipeline for the Individual Blueprint ($297).

    v2.0.0: four new optional profile parameters are now passed through to
    collect_signals() and synthesise(). Existing behaviour is fully preserved
    when these are None.

    Args:
        user_input:           Complete UserInput (always required)
        astrology_primary:    Primary astrology signals from astrology_engine.py
        astrology_secondary:  Secondary astrology signals (if hybrid)
        numerology_primary:   Primary numerology signals from numerology_engine.py
        numerology_secondary: Secondary numerology signals (if hybrid)
        astrology_timing:     Timing dict from astrology_engine v2.0.0
                              (includes arabic_parts, progressions, stelliums)
        numerology_timing:    Numerology timing dict
        vedic_chart:          Pre-computed Vedic chart from astrology_engine.py
        current_year:         Current year for timing calculations
        spirit_profile:       SpiritProfile from spirit_engine (optional)
        health_profile:       HealthProfile from health_engine (optional)
        synastry_profile:     SynastryProfile from synastry_engine
                              (triggers Union Blueprint % mode in synthesiser)
        remedy_bundle:        RemedyBundle from remedies_engine (optional)

    Returns:
        LLMPayload on success
        LogicEngineError on failure

    Pipeline:
        1.  Validate input
        2.  Tier detection (deprecated — defaults to STANDARD)
        3.  Select astrology / numerology systems
        4.  Collect all signals (incl. spirit, health, synastry, remedy)
        5.  Weigh all signals
        6.  Build esoteric synthesis
        7.  Resolve conflicts (synastry conflicts -> % blend)
        8.  Assess convergence
        9.  Synthesise domain readings (spirit/health/synastry passed through)
        10. Build LLM payload
    """
    t0 = time.monotonic()
    session_id = user_input.session_id or f"session_{int(t0)}"

    logger.info(
        "LogicEngine.run_logic_engine starting",
        extra={
            "session_id":          session_id,
            "has_face":            user_input.has_face(),
            "has_dom_palm":        user_input.has_dominant_palm(),
            "has_non_palm":        user_input.has_non_dominant_palm(),
            "has_spirit_profile":  spirit_profile is not None,
            "has_health_profile":  health_profile is not None,
            "has_synastry_profile":synastry_profile is not None,
            "has_remedy_bundle":   remedy_bundle is not None,
        },
    )

    # --- Step 1: Validate ---
    errors = user_input.validate()
    if errors:
        return LogicEngineError(
            session_id   = session_id,
            error_code   = "VALIDATION_FAILED",
            message      = "Input validation failed: " + "; ".join(errors),
            recoverable  = True,
            missing_data = errors,
        )

    # --- Step 2: Tier detection (tier system deprecated — defaults to STANDARD) ---
    tier_assessment = types.SimpleNamespace(tier=ReadingTier.STANDARD)

    # --- Step 3: System selection ---
    cultural_profile, astro_weighting = select_systems(user_input.birth_data)
    present_modifiers = apply_present_location_modifier(
        astro_weighting,
        user_input.birth_data.present_location,
        user_input.birth_data.birth_place,
    )

    # --- Step 4: Collect signals (v2.0.0: includes new profiles) ---
    signal_map = collect_signals(
        user_input           = user_input,
        tier_assessment      = tier_assessment,
        cultural_profile     = cultural_profile,
        astro_weighting      = astro_weighting,
        astrology_primary    = astrology_primary,
        astrology_secondary  = astrology_secondary,
        numerology_primary   = numerology_primary,
        numerology_secondary = numerology_secondary,
        # v2.0.0 new engine profiles
        spirit_profile       = spirit_profile,
        health_profile       = health_profile,
        synastry_profile     = synastry_profile,
        remedy_bundle        = remedy_bundle,
    )

    if signal_map.total_signals == 0:
        return LogicEngineError(
            session_id   = session_id,
            error_code   = "NO_SIGNALS",
            message      = (
                "No signals could be collected. "
                "Ensure astrology and numerology data are provided."
            ),
            recoverable  = True,
            missing_data = ["astrology_primary", "numerology_primary"],
        )

    # --- Step 5: Weigh signals ---
    weighted_map = weigh_signals(signal_map, cultural_profile, astro_weighting)

    # --- Step 6: Esoteric synthesis ---
    four_worlds   = map_four_worlds(tier_assessment)
    sephirah      = activate_sephiroth(weighted_map)
    pillar_result = assess_pillars(weighted_map)
    hermetic      = apply_hermetic_principles(weighted_map)
    chinese_synth = synthesise_chinese(user_input.birth_data)
    vedic_synth   = synthesise_vedic(
        user_input.birth_data,
        vedic_chart  = vedic_chart,
        current_year = current_year,
    )

    esoteric = EsotericSynthesis(
        four_worlds           = four_worlds,
        sephirah              = sephirah,
        hermetic              = hermetic,
        chinese               = chinese_synth,
        vedic                 = vedic_synth,
        tree_of_life_path     = derive_journey_path(sephirah),
        unified_theme         = sephirah.integration_note,
        amplification_domains = [],
    )

    # --- Step 7: Resolve conflicts ---
    resolutions = resolve_conflicts(weighted_map)

    # --- Step 8: Convergence ---
    convergence_map = assess_convergence(weighted_map, resolutions)

    # --- Step 9: Synthesise (v2.0.0: includes new profiles) ---
    synthesis = synthesise(
        session_id        = session_id,
        tier              = tier_assessment.tier,
        cultural_profile  = cultural_profile,
        weighted_map      = weighted_map,
        resolutions       = resolutions,
        convergence_map   = convergence_map,
        esoteric          = esoteric,
        pillar_directive  = pillar_result.balance_directive,
        numerology_timing = numerology_timing,
        astrology_timing  = astrology_timing,
        # v2.0.0 new profiles
        spirit_profile    = spirit_profile,
        health_profile    = health_profile,
        synastry_profile  = synastry_profile,
    )

    # --- Step 10: Build LLM payload ---
    first_name  = user_input.birth_data.full_name.split()[0].title()
    llm_payload = build_llm_payload(
        synthesis       = synthesis,
        user_first_name = first_name,
        tier_assessment = tier_assessment,
    )

    total_ms = int((time.monotonic() - t0) * 1000)

    logger.info(
        "LogicEngine.run_logic_engine completed",
        extra={
            "session_id":    session_id,
            "tier":          tier_assessment.tier.value,
            "total_signals": signal_map.total_signals,
            "domains_built": len(synthesis.domains),
            "overall_conf":  synthesis.overall_confidence,
            "total_ms":      total_ms,
        },
    )

    return llm_payload


# ---------------------------------------------------------------------------
# Union Blueprint pipeline — run_union_engine()
# v2.0.0: new function for the $397 Complete Union Blueprint tool
# ---------------------------------------------------------------------------

def run_union_engine(
    # Person A (primary — the client who purchased the reading)
    user_input_a:         UserInput,
    # Person B (the partner)
    user_input_b:         UserInput,
    # Pre-computed astrology signals for each partner
    astrology_primary_a:  Optional[Dict] = None,
    astrology_primary_b:  Optional[Dict] = None,
    astrology_secondary_a:Optional[Dict] = None,
    # Numerology and timing (primarily Person A's chart drives the reading)
    numerology_primary_a: Optional[Dict] = None,
    astrology_timing_a:   Optional[Dict] = None,
    numerology_timing_a:  Optional[Dict] = None,
    vedic_chart_a:        Optional[Dict] = None,
    # Synastry — pre-computed from synastry_engine.compute_synastry_profile()
    synastry_profile:     Optional[Any]  = None,
    # Optional individual profiles for Person A
    spirit_profile_a:     Optional[Any]  = None,
    health_profile_a:     Optional[Any]  = None,
    remedy_bundle:        Optional[Any]  = None,
    # Metadata
    current_year:         int            = 2026,
) -> Union[LLMPayload, LogicEngineError]:
    """
    Run the complete logic engine pipeline for the Union Blueprint ($397).

    This function orchestrates the full two-person compatibility reading.
    It uses Person A's natal chart as the foundation and weaves in the
    cross-chart synastry analysis as a primary signal layer.

    % OUTPUT DIRECTIVE (enforced here):
        All compatibility verdicts in the Union Blueprint are expressed
        as percentages. This is enforced through:
        1. select_union_systems() sets pct_output_mode=True on UnionSystemConfig
        2. synastry_profile is passed to collect_signals() -> collector adds
           synastry signals with system_key="synastry"
        3. synastry_profile is passed to synthesise() -> triggers
           _build_compatibility_block() -> generates Dict[domain->%]
        4. The LLM narrator receives compatibility_percentages and uses them:
           "Love compatibility: 74%" — ALWAYS
           "This couple is compatible" — NEVER

    Args:
        user_input_a:         UserInput for Person A (primary client)
        user_input_b:         UserInput for Person B (partner)
        astrology_primary_a:  Person A's natal signals from astrology_engine
        astrology_primary_b:  Person B's natal signals from astrology_engine
        astrology_secondary_a:Person A's secondary (Vedic/Chinese) signals
        numerology_primary_a: Person A's numerology signals
        astrology_timing_a:   Person A's timing dict (transits, arabic_parts, etc.)
        numerology_timing_a:  Person A's numerology timing dict
        vedic_chart_a:        Person A's Vedic chart data
        synastry_profile:     SynastryProfile from synastry_engine.compute_synastry_profile()
        spirit_profile_a:     Person A's SpiritProfile (optional)
        health_profile_a:     Person A's HealthProfile (optional)
        remedy_bundle:        RemedyBundle for the couple (optional)
        current_year:         Current year for timing calculations

    Returns:
        LLMPayload on success (includes compatibility_percentages in synthesis)
        LogicEngineError on failure

    Pipeline:
        1.  Validate both UserInput objects
        2.  Tier detection (deprecated — defaults to STANDARD)
        3.  select_union_systems() -> UnionSystemConfig (pct_output_mode=True)
        4.  collect_signals() with synastry_profile (triggers synastry signal layer)
        5.  weigh_signals()
        6.  Esoteric synthesis (Person A's chart as foundation)
        7.  resolve_conflicts() — synastry conflicts -> % blend
        8.  assess_convergence()
        9.  synthesise() with synastry_profile -> _build_compatibility_block() -> % scores
        10. build_llm_payload() with Union Blueprint context + compatibility %
    """
    t0 = time.monotonic()
    session_id = user_input_a.session_id or f"union_{int(t0)}"

    logger.info(
        "LogicEngine.run_union_engine starting",
        extra={
            "session_id":          session_id,
            "label_a":             user_input_a.birth_data.full_name.split()[0],
            "label_b":             user_input_b.birth_data.full_name.split()[0],
            "has_synastry":        synastry_profile is not None,
            "has_spirit_a":        spirit_profile_a is not None,
            "has_health_a":        health_profile_a is not None,
            "has_remedy":          remedy_bundle is not None,
            "pct_output_mode":     True,  # Always for Union Blueprint
        },
    )

    # --- Step 1: Validate both inputs ---
    errors_a = user_input_a.validate()
    errors_b = user_input_b.validate()
    if errors_a or errors_b:
        all_errors = (
            [f"Person A: {e}" for e in errors_a] +
            [f"Person B: {e}" for e in errors_b]
        )
        return LogicEngineError(
            session_id   = session_id,
            error_code   = "VALIDATION_FAILED",
            message      = "Union Blueprint input validation failed: " + "; ".join(all_errors),
            recoverable  = True,
            missing_data = all_errors,
        )

    # --- Step 2: Tier detection (tier system deprecated — defaults to STANDARD) ---
    tier_assessment = types.SimpleNamespace(tier=ReadingTier.STANDARD)

    # --- Step 3: Union system selection ---
    # select_union_systems() automatically sets pct_output_mode=True
    # and determines synastry system based on both partners' cultural origins
    name_a = user_input_a.birth_data.full_name.split()[0].title()
    name_b = user_input_b.birth_data.full_name.split()[0].title()

    union_config = select_union_systems(
        user_input_a.birth_data,
        user_input_b.birth_data,
        reading_label_a = name_a,
        reading_label_b = name_b,
    )

    # Extract Person A's individual profile for the reading foundation
    cultural_profile_a = union_config.partner_a_profile
    astro_weighting_a  = union_config.partner_a_weighting

    present_modifiers = apply_present_location_modifier(
        astro_weighting_a,
        user_input_a.birth_data.present_location,
        user_input_a.birth_data.birth_place,
    )

    # --- Step 4: Collect signals (synastry is the primary new signal source) ---
    signal_map = collect_signals(
        user_input           = user_input_a,         # Person A as primary subject
        tier_assessment      = tier_assessment,
        cultural_profile     = cultural_profile_a,
        astro_weighting      = astro_weighting_a,
        # Person A's individual natal signals
        astrology_primary    = astrology_primary_a,
        astrology_secondary  = astrology_secondary_a,
        numerology_primary   = numerology_primary_a,
        numerology_secondary = None,
        # v2.0.0 new profiles
        spirit_profile       = spirit_profile_a,
        health_profile       = health_profile_a,
        synastry_profile     = synastry_profile,     # Union Blueprint primary layer
        remedy_bundle        = remedy_bundle,
    )

    if signal_map.total_signals == 0:
        return LogicEngineError(
            session_id   = session_id,
            error_code   = "NO_SIGNALS",
            message      = (
                "No signals collected for Union Blueprint. "
                "Provide astrology signals for at least Person A "
                "and the pre-computed synastry_profile."
            ),
            recoverable  = True,
            missing_data = ["astrology_primary_a", "synastry_profile"],
        )

    # --- Step 5: Weigh signals ---
    weighted_map = weigh_signals(signal_map, cultural_profile_a, astro_weighting_a)

    # --- Step 6: Esoteric synthesis (Person A's chart as foundation) ---
    four_worlds   = map_four_worlds(tier_assessment)
    sephirah      = activate_sephiroth(weighted_map)
    pillar_result = assess_pillars(weighted_map)
    hermetic      = apply_hermetic_principles(weighted_map)
    chinese_synth = synthesise_chinese(user_input_a.birth_data)
    vedic_synth   = synthesise_vedic(
        user_input_a.birth_data,
        vedic_chart  = vedic_chart_a,
        current_year = current_year,
    )

    esoteric = EsotericSynthesis(
        four_worlds           = four_worlds,
        sephirah              = sephirah,
        hermetic              = hermetic,
        chinese               = chinese_synth,
        vedic                 = vedic_synth,
        tree_of_life_path     = derive_journey_path(sephirah),
        unified_theme         = sephirah.integration_note,
        amplification_domains = [],
    )

    # --- Step 7: Resolve conflicts ---
    resolutions = resolve_conflicts(weighted_map)

    # --- Step 8: Convergence ---
    convergence_map = assess_convergence(weighted_map, resolutions)

    # --- Step 9: Synthesise with synastry_profile (triggers % compatibility block) ---
    synthesis = synthesise(
        session_id        = session_id,
        tier              = tier_assessment.tier,
        cultural_profile  = cultural_profile_a,
        weighted_map      = weighted_map,
        resolutions       = resolutions,
        convergence_map   = convergence_map,
        esoteric          = esoteric,
        pillar_directive  = pillar_result.balance_directive,
        numerology_timing = numerology_timing_a,
        astrology_timing  = astrology_timing_a,
        # v2.0.0 profiles — synastry triggers _build_compatibility_block()
        spirit_profile    = spirit_profile_a,
        health_profile    = health_profile_a,
        synastry_profile  = synastry_profile,   # -> % scores computed here
    )

    # --- Step 10: Build LLM payload ---
    llm_payload = build_llm_payload(
        synthesis        = synthesis,
        user_first_name  = name_a,
        tier_assessment  = tier_assessment,
        # v2.0.0 Union Blueprint context
        partner_name     = name_b,
        tool_type        = "union_blueprint",
        pct_output_mode  = union_config.pct_output_mode,  # Always True
    )

    total_ms = int((time.monotonic() - t0) * 1000)

    # Log compatibility % summary for monitoring
    compat_pcts = getattr(synthesis, "compatibility_percentages", None) or {}

    logger.info(
        "LogicEngine.run_union_engine completed",
        extra={
            "session_id":        session_id,
            "label_a":           name_a,
            "label_b":           name_b,
            "tier":              tier_assessment.tier.value,
            "total_signals":     signal_map.total_signals,
            "domains_built":     len(synthesis.domains),
            "overall_conf":      synthesis.overall_confidence,
            "overall_compat_pct":compat_pcts.get("overall"),
            "love_compat_pct":   compat_pcts.get("love"),
            "pct_output_mode":   union_config.pct_output_mode,
            "total_ms":          total_ms,
        },
    )

    return llm_payload


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

__all__ = [
    # Main pipeline functions
    "run_logic_engine",         # Individual Blueprint ($297)
    "run_union_engine",         # Union Blueprint ($397) — v2.0.0

    # Input models
    "UserInput",
    "BirthData",
    "GeoLocation",

    # Output models
    "LLMPayload",
    "LogicEngineError",

    # Enums
    "ReadingTier",
    "Domain",
    "ALL_DOMAINS",

    # System selection (v1.0.0)
    "select_systems",

    # System selection (v2.0.0)
    "select_union_systems",
    "select_reading_config",
    "UnionSystemConfig",

    # Logic pipeline components
    "collect_signals",
    "weigh_signals",
    "resolve_conflicts",
    "synthesise",
    "build_llm_payload",

    # v2.0.0 engine profiles (None if engine not deployed)
    "SpiritProfile",
    "HealthProfile",
    "SynastryProfile",
    "RemedyBundle",
]