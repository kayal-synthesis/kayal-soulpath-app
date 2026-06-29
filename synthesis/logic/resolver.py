"""
Logic Engine — Resolver
========================
Resolves conflicts between systems when they disagree on a domain signal.

A conflict exists when:
    - Two or more systems give opposing tones for the same domain
      (e.g. astrology says love is positive, palmistry says challenging)
    - A single system gives a signal with very low confidence
    - Cross-system keywords contradict each other meaningfully

Resolution priority rules per domain:
    These are encoded from traditional esoteric priority hierarchies.
    The user never sees these rules — they see the resolved synthesis.

Priority hierarchy (v1.0.0, preserved):
    LOVE       → Astrology (Venus/7th house) > Palm (heart line) > Face > Numerology
    HEALTH     → Palm (life line) > Vedic Ayurveda > Face (skin/aging) > Astrology
    WEALTH     → Face (nose — Mian Xiang) > Astrology (2nd/8th house) > Palm > Numerology
    CAREER     → Numerology (Life Path) > Astrology (10th house/Saturn) > Palm (fate line) > Face
    SPIRITUAL  → Numerology (7/11/22) > Vedic (Ketu/12th house) > Palm (Moon mount) > Face
    FINANCE    → Astrology (2nd house) > Palm (Mercury line) > Numerology (8) > Face
    CHARACTER  → Face (Mian Xiang/physiognomy) > Astrology (Sun/Moon/Rising) > Palm > Numerology
    TIMING     → Vedic Dasha > Numerology (Personal Year) > Astrology transits > Face (Mian Xiang)

Priority hierarchy (v2.0.0 additions):
    SPIRIT_WORLD      → Spirit engine > Vedic astrology > Western > Numerology > Palmistry
    SEXUALITY         → Synastry > Astrology > Palmistry > Physiognomy > Health engine
    CHILDREN_FORECAST → Synastry > Palmistry > Vedic astrology > Chinese astrology
    DEATH_TRANSITION  → Vedic astrology > Health engine > Spirit engine > Palmistry
    PARENTS           → Spirit engine > Vedic astrology > Physiognomy > Chinese astrology
    LEGACY            → Numerology > Western astrology > Synastry > Palmistry
    IDENTITY          → Western astrology > Vedic astrology > Spirit engine > Palmistry

v2.0.0 additions:
    - _DOMAIN_PRIORITY: 7 new domain entries (spirit_world through identity)
    - _COMPATIBILITY_DOMAINS: set of domains where synastry is primary authority
    - _is_compatibility_domain(): predicate for synastry-relevant domains
    - _resolve_synastry_conflict(): % blend for Union Blueprint domain conflicts
        When synastry and astrology/palmistry conflict for a compatibility domain,
        NEITHER signal is suppressed — both poles express as a % blend.
        This enforces the % output directive at the resolver layer:
        "Synastry: 82% / Individual natal: 61% → Net: 74%"
    - _format_conflict_as_pct(): converts both conflict poles to % display strings
    - resolve_conflicts(): now iterates all domain keys incl. new ones;
        routes synastry conflicts through _resolve_synastry_conflict()
    - assess_convergence(): now iterates all domain keys incl. new ones

Hermetic Polarity resolution (v1.0.0, preserved):
    When two systems disagree but their keywords overlap in a polarity cluster,
    the resolver applies the Polarity principle — synthesising both poles
    into a unified truth rather than choosing one.

% Compatibility directive (v2.0.0):
    All compatibility verdicts in the Union Blueprint are expressed as percentages.
    The resolver enforces this at conflict resolution time:
    - "Compatible" / "Not compatible" → NEVER used
    - "Love compatibility: 74%" → ALWAYS used
    - When synastry conflicts with individual natal for a relational domain,
      the resolution logs both % values and produces a net % reading

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .models import (
    ConflictResolution,
    Domain,
    SignalTone,
    ALL_DOMAINS,
    ConvergenceLevel,
)
from .weigher import WeightedSignalMap, WeightedSignal
from .esoteric.hermetic import get_polarity_resolutions, PolarityResult, _broad_system

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain priority rules (v2.0.0 — expanded)
#
# Lists of broad system keys in descending priority order.
# The first system in the list wins conflicts for that domain.
# New system keys: "spirit_world", "health_engine", "synastry", "remedies"
# ---------------------------------------------------------------------------

_DOMAIN_PRIORITY: Dict[str, List[str]] = {

    # ── v1.0.0 domains (preserved intact) ────────────────────────────────

    "love": [
        "astrology",    # Venus / 7th house — primary love authority
        "palmistry",    # Heart line, Venus mount, marriage lines
        "physiognomy",  # Face features, eye shape, lips
        "numerology",   # Life path 2, 6, expression numbers
    ],
    "health": [
        "palmistry",    # Life line — primary health authority
        "numerology",   # Vedic numerology health signal
        "physiognomy",  # Skin, aging markers, face colour
        "astrology",    # 6th house, medical astrology
    ],
    "wealth": [
        "physiognomy",  # Nose (Mian Xiang wealth palace)
        "astrology",    # 2nd/8th house, Jupiter
        "palmistry",    # Fate line, sun line, mounts
        "numerology",   # Life path 8, expression 8
    ],
    "career": [
        "numerology",   # Life Path — primary career vocation signal
        "astrology",    # 10th house, Saturn, Midheaven
        "palmistry",    # Fate line, head line, dominant mount
        "physiognomy",  # Cheekbones, face shape, jaw
    ],
    "spiritual": [
        "numerology",   # Master numbers 7, 11, 22, 33
        "astrology",    # Neptune, 12th house, Ketu
        "palmistry",    # Moon mount, intuition line
        "physiognomy",  # Forehead, eye depth
    ],
    "finance": [
        "astrology",    # 2nd house Venus/Jupiter
        "palmistry",    # Mercury line, fate line
        "numerology",   # Life path 8, 4
        "physiognomy",  # Nose alar flare (Mian Xiang)
    ],
    "character": [
        "physiognomy",  # Face shape — primary character in Mian Xiang
        "astrology",    # Sun/Moon/Rising — primary character in Western
        "palmistry",    # Hand shape, fingers
        "numerology",   # Expression number, soul urge
    ],
    "timing": [
        "astrology",    # Vedic dasha (if Vedic primary) or transits
        "numerology",   # Personal year cycle
        "physiognomy",  # Mian Xiang life period
        "palmistry",    # Line timing (least precise)
    ],

    # ── v2.0.0 new domains ────────────────────────────────────────────────

    "spirit_world": [
        "spirit_world", # Spirit engine — primary authority for spirit domain
        "astrology",    # Vedic: Ketu/12th house moksha; Western: Neptune/Pluto
        "numerology",   # Karmic debt 13/14/16/19; LP 7/11/22/33
        "palmistry",    # Moon mount, intuition line, spiritual markers
        "physiognomy",  # Forehead third-eye zone, deep-set eyes
    ],
    "sexuality": [
        "synastry",     # Cross-chart Venus-Mars — primary in Union Blueprint context
        "astrology",    # Venus, Mars, 5th/8th house, Scorpio emphasis
        "palmistry",    # Girdle of Venus, Venus mount, marriage lines
        "physiognomy",  # Lips, philtrum, nose bridge (Mian Xiang)
        "health_engine",# Physical vitality as foundation of sexuality
    ],
    "children_forecast": [
        "synastry",     # Cross-chart 5th house overlays — primary in couple context
        "palmistry",    # Children lines — primary in individual chart context
        "astrology",    # Vedic: Putra bhava; Chinese: children pillar
        "numerology",   # LP children tendency indicators
        "spirit_world", # Karmic children soul agreements
    ],
    "death_transition": [
        "astrology",    # Vedic: Ayush bhava/Maraka lords — primary authority
        "health_engine",# Longevity structural score
        "spirit_world", # Ancestral death patterns, karmic transition indicators
        "palmistry",    # Life line terminus, Saturn mount
        "physiognomy",  # Longevity markers in Mian Xiang
    ],
    "parents": [
        "spirit_world", # Ancestral/parental connection — primary for this domain
        "astrology",    # Vedic: Matru/Pitru bhava; Chinese: parents pillar
        "physiognomy",  # Forehead (father), chin (mother) — Mian Xiang tradition
        "palmistry",    # Life line branches, inheritance markers
        "numerology",   # LP inherited patterns
    ],
    "legacy": [
        "numerology",   # Life mission/LP — primary legacy authority
        "astrology",    # 10th house, Saturn, Pluto (generational)
        "synastry",     # Union legacy in couple context
        "palmistry",    # Fate line, sun line — career/legacy endurance
        "physiognomy",  # Brow bones, chin, jaw — authority markers
    ],
    "identity": [
        "astrology",    # Sun, Ascendant — primary identity in Western tradition
                        # Lagna, Atmakaraka — primary in Vedic tradition
        "spirit_world", # Past-life identity (Ketu sign reading)
        "palmistry",    # Thumb, index finger, hand shape — core identity
        "physiognomy",  # Face shape, overall facial identity reading
        "numerology",   # Life Path + Expression = identity core
    ],
}


# ---------------------------------------------------------------------------
# Compatibility domain registry (v2.0.0)
#
# Domains where synastry is a primary resolution system.
# When synastry conflicts with other systems in these domains,
# the conflict is routed through _resolve_synastry_conflict()
# rather than standard priority resolution.
# ---------------------------------------------------------------------------

_COMPATIBILITY_DOMAINS: Set[str] = {
    "love", "sexuality", "children_forecast", "career",
    "wealth", "finance", "health", "spiritual", "character",
    "spirit_world", "identity", "legacy",
}

_STRICTLY_RELATIONAL_DOMAINS: Set[str] = {
    "sexuality", "children_forecast",
}


def _is_compatibility_domain(domain_key: str) -> bool:
    """True when the domain is relevant to couple compatibility scoring."""
    return domain_key in _COMPATIBILITY_DOMAINS


def _synastry_is_active(signals: List[WeightedSignal]) -> bool:
    """True when the synastry system has contributed signals to this domain."""
    return any(_broad_system(ws.raw.system) == "synastry" for ws in signals)


# ---------------------------------------------------------------------------
# v2.0.0 — Synastry conflict resolution
#
# When synastry conflicts with individual natal systems for a compatibility
# domain, the conflict is NOT resolved by winner-takes-all suppression.
# Instead, both poles are preserved and expressed as a % blend.
#
# This enforces the % output directive at the resolver layer.
# ---------------------------------------------------------------------------

def _format_conflict_as_pct(
    synastry_weight:     float,
    individual_weight:   float,
    synastry_tone:       SignalTone,
    individual_tone:     SignalTone,
    domain_key:          str,
) -> Tuple[float, str]:
    """
    Convert a synastry vs. individual natal conflict to a % net reading.

    Returns (net_pct_0_to_100, display_string).
    The display_string is the resolution_reading passed to ConflictResolution.

    % calculation:
        synastry_pct  = polarity(synastry_tone)  × synastry_weight   [0.0–1.0]
        individual_pct= polarity(individual_tone) × individual_weight [0.0–1.0]
        net = weighted blend → normalised to 0–100

    All compatibility output is expressed as %: never "compatible"/"not compatible".
    """
    positive_tones   = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    def _tone_to_signed(tone: SignalTone) -> float:
        if tone == SignalTone.STRONGLY_POSITIVE:   return +1.00
        if tone == SignalTone.POSITIVE:             return +0.70
        if tone == SignalTone.NEUTRAL:              return  0.00
        if tone == SignalTone.CHALLENGING:          return -0.60
        if tone == SignalTone.STRONGLY_CHALLENGING: return -0.90
        return 0.0

    syn_signed = _tone_to_signed(synastry_tone)
    ind_signed = _tone_to_signed(individual_tone)

    # Weight synastry 60%, individual 40% in compatibility domains
    # (synastry reflects the ACTUAL relationship; individual reflects natal potential)
    syn_contribution  = syn_signed  * synastry_weight   * 0.60
    ind_contribution  = ind_signed  * individual_weight * 0.40

    total_weight = synastry_weight * 0.60 + individual_weight * 0.40
    if total_weight == 0:
        net_raw = 0.0
    else:
        net_raw = (syn_contribution + ind_contribution) / total_weight

    # Normalise to 0–100 (net_raw range: -1.0 to +1.0 → 0 to 100)
    net_pct = round((net_raw + 1.0) / 2.0 * 100.0, 1)
    net_pct = min(100.0, max(0.0, net_pct))

    syn_pct = round((syn_signed + 1.0) / 2.0 * 100.0, 0)
    ind_pct = round((ind_signed + 1.0) / 2.0 * 100.0, 0)

    display = (
        f"{domain_key.replace('_', ' ').title()} compatibility: {net_pct:.0f}% "
        f"(synastry cross-chart: {syn_pct:.0f}% | individual natal: {ind_pct:.0f}%). "
        f"The synastry and individual natal readings diverge — "
        f"the cross-chart reading ({syn_pct:.0f}%) reflects the relational reality "
        f"between these two people, while the individual natal ({ind_pct:.0f}%) reflects "
        f"each person's solo baseline. Net reading weights synastry at 60%."
    )

    return net_pct, display


def _resolve_synastry_conflict(
    domain:   Domain,
    signals:  List[WeightedSignal],
) -> ConflictResolution:
    """
    Resolve a conflict between synastry signals and individual natal signals
    for a compatibility domain.

    Unlike standard priority resolution, this does NOT suppress the losing
    system. Both poles contribute to a % net score, fulfilling the
    compatibility % directive.

    Used by resolve_conflicts() when:
        (a) synastry signals are present for the domain, AND
        (b) the domain is in _COMPATIBILITY_DOMAINS, AND
        (c) a tone conflict exists between synastry and other systems
    """
    domain_key = domain.value
    positive_tones   = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    # Separate synastry from individual natal signals
    syn_signals = [ws for ws in signals if _broad_system(ws.raw.system) == "synastry"]
    ind_signals = [ws for ws in signals if _broad_system(ws.raw.system) != "synastry"]

    # Best signal from each camp
    best_syn = max(syn_signals, key=lambda ws: ws.final_weight) if syn_signals else None
    best_ind = max(ind_signals, key=lambda ws: ws.final_weight) if ind_signals else None

    if not best_syn:
        # No synastry signal — fall through to standard priority resolution
        return _resolve_by_priority(domain, signals, {})

    if not best_ind:
        # Only synastry — no conflict
        return ConflictResolution(
            domain           = domain,
            conflict_systems = ["synastry"],
            winning_system   = "synastry",
            resolution_rule  = f"Single system (synastry) — no conflict to resolve in {domain_key}.",
            resolved_tone    = best_syn.raw.tone,
            resolved_reading = best_syn.raw.reading,
            suppressed_signal= "",
            confidence       = round(best_syn.final_weight, 3),
        )

    syn_tone = best_syn.raw.tone
    ind_tone = best_ind.raw.tone

    # Check if there is actually a conflict between the two camps
    syn_positive = syn_tone in positive_tones
    ind_positive = ind_tone in positive_tones
    syn_negative = syn_tone in challenging_tones
    ind_negative = ind_tone in challenging_tones

    conflict_present = (syn_positive and ind_negative) or (syn_negative and ind_positive)

    if not conflict_present:
        # Same direction — no conflict, return weighted highest
        best_overall = max(signals, key=lambda ws: ws.final_weight)
        return ConflictResolution(
            domain           = domain,
            conflict_systems = ["synastry", _broad_system(best_ind.raw.system)],
            winning_system   = _broad_system(best_overall.raw.system),
            resolution_rule  = f"No tone conflict in {domain_key} — synastry and natal systems agree.",
            resolved_tone    = best_overall.raw.tone,
            resolved_reading = best_overall.raw.reading,
            suppressed_signal= "",
            confidence       = round(best_overall.final_weight, 3),
        )

    # Genuine conflict → % blend
    net_pct, display_reading = _format_conflict_as_pct(
        synastry_weight   = best_syn.final_weight,
        individual_weight = best_ind.final_weight,
        synastry_tone     = syn_tone,
        individual_tone   = ind_tone,
        domain_key        = domain_key,
    )

    # Resolved tone from net_pct
    if net_pct >= 65:    resolved_tone = SignalTone.POSITIVE
    elif net_pct >= 50:  resolved_tone = SignalTone.NEUTRAL
    elif net_pct >= 35:  resolved_tone = SignalTone.CHALLENGING
    else:                resolved_tone = SignalTone.STRONGLY_CHALLENGING

    conflict_systems = list(set(
        [_broad_system(ws.raw.system) for ws in signals]
    ))

    logger.info(
        "Resolver — synastry conflict resolved as %",
        extra={
            "domain":          domain_key,
            "synastry_pct":    round(((_tone_signed(syn_tone) + 1.0) / 2.0) * 100, 0),
            "individual_pct":  round(((_tone_signed(ind_tone) + 1.0) / 2.0) * 100, 0),
            "net_pct":         net_pct,
            "resolved_tone":   resolved_tone.value,
        },
    )

    return ConflictResolution(
        domain           = domain,
        conflict_systems = conflict_systems,
        winning_system   = "synastry_blend",  # Neither suppressed — % blend
        resolution_rule  = (
            f"% Compatibility blend applied for {domain_key}: "
            f"synastry cross-chart (60% weight) + individual natal (40% weight). "
            f"Net {domain_key.replace('_',' ').title()} compatibility: {net_pct:.0f}%. "
            "No system suppressed — both poles contribute to the percentage score."
        ),
        resolved_tone    = resolved_tone,
        resolved_reading = display_reading,
        suppressed_signal= "",        # Nothing suppressed — both poles preserved in reading
        confidence       = round(min(best_syn.final_weight, best_ind.final_weight), 3),
    )


def _tone_signed(tone: SignalTone) -> float:
    """Helper: convert tone to -1.0 / 0.0 / +1.0 signed float."""
    if tone == SignalTone.STRONGLY_POSITIVE:   return +1.00
    if tone == SignalTone.POSITIVE:             return +0.70
    if tone == SignalTone.NEUTRAL:              return  0.00
    if tone == SignalTone.CHALLENGING:          return -0.60
    if tone == SignalTone.STRONGLY_CHALLENGING: return -0.90
    return 0.0


# ---------------------------------------------------------------------------
# Conflict detection (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _has_conflict(signals: List[WeightedSignal]) -> bool:
    """
    Detect if a domain has genuine system-level conflict.
    Returns True if high-weight signals from different systems
    point in opposite tone directions.
    """
    if len(signals) < 2:
        return False

    positive_tones    = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    system_dominant_tone: Dict[str, SignalTone] = {}
    system_max_weight:    Dict[str, float]      = {}

    for ws in signals:
        sys = _broad_system(ws.raw.system)
        if sys not in system_dominant_tone or ws.final_weight > system_max_weight[sys]:
            system_dominant_tone[sys] = ws.raw.tone
            system_max_weight[sys]    = ws.final_weight

    threshold = 0.25
    active = {
        sys: tone
        for sys, tone in system_dominant_tone.items()
        if system_max_weight.get(sys, 0) >= threshold
    }

    has_positive    = any(t in positive_tones    for t in active.values())
    has_challenging = any(t in challenging_tones for t in active.values())

    return has_positive and has_challenging


# ---------------------------------------------------------------------------
# Priority-based resolution (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _resolve_by_priority(
    domain:           Domain,
    signals:          List[WeightedSignal],
    polarity_results: Dict[str, PolarityResult],
) -> ConflictResolution:
    """
    Resolve a conflict by applying domain priority rules.

    Steps:
    1. Check if Hermetic Polarity resolution applies (both poles valid)
    2. If not, apply domain priority hierarchy
    3. Take the highest-weight signal from the winning system
    4. Document the suppressed signal for the synthesiser
    """
    domain_key = domain.value

    # Step 1: Hermetic Polarity resolution
    polarity = polarity_results.get(domain_key)
    if polarity and _polarity_is_valid(signals):
        return ConflictResolution(
            domain           = domain,
            conflict_systems = [polarity.pole_a_system, polarity.pole_b_system],
            winning_system   = "hermetic_polarity",
            resolution_rule  = (
                "Hermetic Polarity principle: both systems reflect valid but "
                "opposite aspects of the same truth. "
                "Synthesis integrates both rather than choosing one."
            ),
            resolved_tone    = SignalTone.NEUTRAL,
            resolved_reading = polarity.synthesis,
            suppressed_signal= "",
            confidence       = 0.80,
        )

    # Step 2: Priority hierarchy
    priority_order = _DOMAIN_PRIORITY.get(domain_key, list(_broad_systems_in(signals)))

    system_signals: Dict[str, List[WeightedSignal]] = {}
    for ws in signals:
        sys = _broad_system(ws.raw.system)
        system_signals.setdefault(sys, []).append(ws)

    winning_system  = None
    winning_signals = []
    suppressed_sys  = None
    suppressed_sigs = []

    for priority_sys in priority_order:
        if priority_sys in system_signals:
            winning_system  = priority_sys
            winning_signals = system_signals[priority_sys]
            break

    for priority_sys in priority_order:
        if priority_sys != winning_system and priority_sys in system_signals:
            suppressed_sys  = priority_sys
            suppressed_sigs = system_signals[priority_sys]
            break

    if not winning_system or not winning_signals:
        best = max(signals, key=lambda ws: ws.final_weight)
        winning_system  = _broad_system(best.raw.system)
        winning_signals = [best]

    best_winning  = max(winning_signals, key=lambda ws: ws.final_weight)
    resolved_tone = best_winning.raw.tone

    suppressed_text = ""
    if suppressed_sigs:
        best_supp = max(suppressed_sigs, key=lambda ws: ws.final_weight)
        suppressed_text = (
            f"{suppressed_sys.title()} indicates: "
            f"{best_supp.raw.reading[:150]}..."
            if len(best_supp.raw.reading) > 150
            else f"{suppressed_sys.title()} indicates: {best_supp.raw.reading}"
        )

    rule = (
        f"Domain priority rule: for the {domain_key} domain, "
        f"{winning_system} carries higher traditional authority "
        f"than {suppressed_sys or 'other systems'}. "
        f"The {winning_system} signal is used as the primary reading."
    )

    confidence = round(best_winning.final_weight * 0.90, 3)

    return ConflictResolution(
        domain           = domain,
        conflict_systems = list(system_signals.keys()),
        winning_system   = winning_system,
        resolution_rule  = rule,
        resolved_tone    = resolved_tone,
        resolved_reading = best_winning.raw.reading,
        suppressed_signal= suppressed_text,
        confidence       = confidence,
    )


def _polarity_is_valid(signals: List[WeightedSignal]) -> bool:
    """Polarity resolution valid when both poles have meaningful weight."""
    positive_tones    = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    pos_weight = sum(ws.final_weight for ws in signals if ws.raw.tone in positive_tones)
    neg_weight = sum(ws.final_weight for ws in signals if ws.raw.tone in challenging_tones)

    if pos_weight == 0 or neg_weight == 0:
        return False

    ratio = min(pos_weight, neg_weight) / max(pos_weight, neg_weight)
    return ratio >= 0.35


def _broad_systems_in(signals: List[WeightedSignal]) -> List[str]:
    """Get unique broad systems present in a signal list."""
    seen = []
    for ws in signals:
        s = _broad_system(ws.raw.system)
        if s not in seen:
            seen.append(s)
    return seen


# ---------------------------------------------------------------------------
# Main resolver (v2.0.0 — new domain iteration + synastry conflict path)
# ---------------------------------------------------------------------------

def resolve_conflicts(
    weighted_map: WeightedSignalMap,
) -> Dict[str, Optional[ConflictResolution]]:
    """
    Detect and resolve conflicts across all domains.

    v2.0.0 changes:
    - Iterates all domain keys present in weighted_map.domains (not just ALL_DOMAINS)
      to handle new v3.0.0 domain keys (spirit_world, sexuality, etc.)
    - Routes synastry conflicts through _resolve_synastry_conflict() for
      compatibility domains — producing % blend readings instead of suppression

    Args:
        weighted_map: From weigher.weigh_signals()

    Returns:
        Dict keyed by domain.value → ConflictResolution or None if no conflict
    """
    polarity_results = get_polarity_resolutions(weighted_map)
    resolutions: Dict[str, Optional[ConflictResolution]] = {}

    # v2.0.0: iterate ALL domains including new ones not yet in ALL_DOMAINS enum
    all_domain_keys = set(d.value for d in ALL_DOMAINS) | set(weighted_map.domains.keys())

    for domain_key in all_domain_keys:
        # Get signals — try enum first, fall back to dict key
        try:
            domain_enum = Domain(domain_key)
            signals = weighted_map.signals_for(domain_enum)
        except ValueError:
            signals = weighted_map.domains.get(domain_key, [])
            domain_enum = _make_domain_proxy(domain_key)

        if not signals:
            resolutions[domain_key] = None
            continue

        if not _has_conflict(signals):
            resolutions[domain_key] = None
            continue

        # v2.0.0: Synastry conflict path for compatibility domains
        if (
            _is_compatibility_domain(domain_key)
            and _synastry_is_active(signals)
        ):
            resolution = _resolve_synastry_conflict(domain_enum, signals)
        else:
            # Standard priority path
            resolution = _resolve_by_priority(domain_enum, signals, polarity_results)

        resolutions[domain_key] = resolution

        logger.info(
            "Resolver.resolve_conflicts — conflict resolved",
            extra={
                "domain":          domain_key,
                "conflict_systems":resolution.conflict_systems,
                "winner":          resolution.winning_system,
                "resolution_rule": resolution.resolution_rule[:100],
            },
        )

    return resolutions


# ---------------------------------------------------------------------------
# Convergence assessment (v2.0.0 — iterates all domain keys)
# ---------------------------------------------------------------------------

def assess_convergence(
    weighted_map: WeightedSignalMap,
    resolutions:  Dict[str, Optional[ConflictResolution]],
) -> Dict[str, str]:
    """
    Assess final convergence level for each domain after resolution.
    Returns dict: domain.value → ConvergenceLevel.value

    v2.0.0: iterates all domain keys present in weighted_map.domains,
    not just ALL_DOMAINS enum values.
    """
    convergence: Dict[str, str] = {}
    all_domain_keys = set(d.value for d in ALL_DOMAINS) | set(weighted_map.domains.keys())

    for domain_key in all_domain_keys:
        try:
            domain_enum = Domain(domain_key)
            signals     = weighted_map.signals_for(domain_enum)
        except ValueError:
            signals = weighted_map.domains.get(domain_key, [])

        resolution = resolutions.get(domain_key)

        if not signals:
            convergence[domain_key] = ConvergenceLevel.SINGLE.value
            continue

        unique_systems = len(set(_broad_system(ws.raw.system) for ws in signals))

        if resolution:
            # v2.0.0: % blend resolutions are a special convergence class
            if getattr(resolution, "winning_system", "") == "synastry_blend":
                convergence[domain_key] = "synastry_blend"  # New convergence class
            elif unique_systems >= 3:
                convergence[domain_key] = ConvergenceLevel.CONFLICTED.value
            else:
                convergence[domain_key] = ConvergenceLevel.CONFLICTED.value
        else:
            if unique_systems >= 4:
                convergence[domain_key] = ConvergenceLevel.FOUR_SYSTEM.value
            elif unique_systems == 3:
                convergence[domain_key] = ConvergenceLevel.THREE_SYSTEM.value
            elif unique_systems == 2:
                convergence[domain_key] = ConvergenceLevel.TWO_SYSTEM.value
            else:
                convergence[domain_key] = ConvergenceLevel.SINGLE.value

    return convergence


# ---------------------------------------------------------------------------
# Utility — Domain proxy for new domain keys not yet in enum
# ---------------------------------------------------------------------------

class _DomainProxy:
    """
    Lightweight stand-in for Domain enum when domain_key is not yet in
    the Domain enum (new v3.0.0 domains). Quacks like Domain for
    ConflictResolution construction.
    """
    def __init__(self, key: str):
        self.value = key

    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return f"DomainProxy({self.value!r})"


def _make_domain_proxy(domain_key: str) -> _DomainProxy:
    """Return a Domain-like proxy object for a new domain key."""
    return _DomainProxy(domain_key)
