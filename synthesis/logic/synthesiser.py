"""
Logic Engine — Synthesiser
============================
Assembles the final unified DomainSynthesis for each domain
by combining weighted signals, conflict resolutions, esoteric
amplification, temporal arc, and remedy layer into a coherent payload.

Processing order per domain:
    1.  Collect weighted signals (from weigher)
    2.  Apply conflict resolution (from resolver)
    3.  Apply esoteric amplification (from esoteric layer)
    4.  Build primary signal from top-weighted readings
    5.  Build supporting signals from remaining systems
    6.  Extract tension from suppressed resolution signal
    7.  Generate resolution text if tension exists
    8.  Build temporal arc (past / present / future)
    9.  Identify domain problem if challenge signals present
    10. Add timing note where relevant
    11. Add growth edge from pillar balance directive
    12. Build remedy solution (practical + spiritual)
    13. Compute final confidence and convergence level

v3.0.0 additions:
    - _TEMPORAL_INTROS expanded: 7 new domain entries
        (spirit_world, sexuality, children_forecast, death_transition,
         parents, legacy, identity)
    - _handle_synastry_blend(): converts "synastry_blend" convergence class
        into a % reading, enforcing the compatibility % output directive:
        "Love compatibility: 74%" — never "This couple is compatible."
    - _build_compatibility_block(): generates Dict[domain→%] for Union Blueprint
        from WeightedSignalMap + COMPATIBILITY_DOMAIN_WEIGHTS
    - _build_domain_synthesis_for_key(): handles new domain string keys
        that are not yet in the Domain enum
    - synthesise() extended with 3 new optional parameters:
        spirit_profile, health_profile, synastry_profile
    - synthesise() now iterates ALL_DOMAINS PLUS any new domain keys present
        in weighted_map.domains (spirit_world, sexuality, etc.)
    - synthesise() routes "synastry_blend" convergence through _handle_synastry_blend()
    - synthesise() computes compatibility_percentages when synastry_profile present
    - SynthesisPayload compatibility_percentages field populated for Union Blueprint
    - build_timing_layer() updated: arabic_parts, progressions, stelliums from
        astrology_engine v2.0.0 timing_dict threaded into unified_timing narrative

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from .models import (
    SynthesisPayload,
    DomainSynthesis,
    SupportingSignal,
    TimingLayer,
    EsotericSynthesis,
    ConvergenceLevel,
    SignalTone,
    KabbalahPillar,
    TemporalArc,
    TemporalPhase,
    DomainProblem,
    ProblemUrgency,
    Domain,
    ALL_DOMAINS,
    CulturalProfile,
    ReadingTier,
    NumerologyProfile,
    UserInput,
)
from .weigher import (
    WeightedSignalMap, WeightedSignal,
    compute_compatibility_percentage, format_compatibility_report,
    COMPATIBILITY_DOMAIN_WEIGHTS,
)
from .resolver import ConflictResolution
from .esoteric.sephiroth import sephirah_domain_amplifier
from .esoteric.chinese import get_element_domain_reading
from .esoteric.vedic import get_dosha_domain_reading
from .esoteric.hermetic import _broad_system
from .remedies import build_all_solutions

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Temporal arc builder — temporal intros
# v3.0.0: expanded with 7 new domain entries
# ---------------------------------------------------------------------------

_TEMPORAL_INTROS = {
    "past": {
        # ── v2.0.0 (preserved) ────────────────────────────────────────────
        Domain.LOVE:     "The roots of your love patterns reach back to",
        Domain.HEALTH:   "Your constitutional foundation was shaped by",
        Domain.WEALTH:   "The wealth patterns you carry were seeded in",
        Domain.CAREER:   "The vocational gifts and patterns you brought into this life include",
        Domain.SPIRITUAL:"The spiritual nature you arrived with reflects",
        Domain.FINANCE:  "Your relationship with money has its origins in",
        Domain.CHARACTER:"The character you arrived with carries",
        Domain.TIMING:   "The karmic timing patterns active in your life originate from",
        # ── v3.0.0 new domains ────────────────────────────────────────────
        "spirit_world":      "The ancestral and past-life patterns carried across incarnations include",
        "sexuality":         "The intimate and desire patterns woven into your soul blueprint originate from",
        "children_forecast": "The karmic agreements around parenthood and creative progeny were established in",
        "death_transition":  "The soul's relationship with endings, transition, and regeneration was shaped by",
        "parents":           "The ancestral inheritance and parental lineage patterns you carry reach back to",
        "legacy":            "The contribution and legacy you were called to build were seeded in",
        "identity":          "The fundamental sense of self you arrived with reflects",
    },
    "present": {
        # ── v2.0.0 (preserved) ────────────────────────────────────────────
        Domain.LOVE:     "In your love life right now,",
        Domain.HEALTH:   "Your current health picture shows",
        Domain.WEALTH:   "Your wealth situation at this moment reflects",
        Domain.CAREER:   "In your career right now,",
        Domain.SPIRITUAL:"Your spiritual life in this moment is characterised by",
        Domain.FINANCE:  "Your financial position right now shows",
        Domain.CHARACTER:"Who you are right now —",
        Domain.TIMING:   "The current timing window indicates",
        # ── v3.0.0 new domains ────────────────────────────────────────────
        "spirit_world":      "The active spirit world dimension of your life right now shows",
        "sexuality":         "Your current intimate and relational desire life reflects",
        "children_forecast": "The children and creative generativity dimension of your life right now is characterised by",
        "death_transition":  "The current relationship with impermanence, loss, and regeneration in your life shows",
        "parents":           "The ancestral and parental patterns currently active in your life include",
        "legacy":            "What you are building toward as your contribution right now is",
        "identity":          "Who you are becoming in this current chapter of life reflects",
    },
    "future": {
        # ── v2.0.0 (preserved) ────────────────────────────────────────────
        Domain.LOVE:     "Looking ahead in love,",
        Domain.HEALTH:   "The health trajectory ahead shows",
        Domain.WEALTH:   "Your wealth potential moving forward",
        Domain.CAREER:   "The career path opening ahead",
        Domain.SPIRITUAL:"The spiritual growth ahead",
        Domain.FINANCE:  "The financial trajectory ahead",
        Domain.CHARACTER:"The character that is emerging",
        Domain.TIMING:   "The timing window ahead",
        # ── v3.0.0 new domains ────────────────────────────────────────────
        "spirit_world":      "The spiritual evolution and ancestral healing available ahead",
        "sexuality":         "The intimate and desire development opening ahead",
        "children_forecast": "The children, progeny, and creative legacy potential ahead",
        "death_transition":  "The soul's trajectory through impermanence and transition ahead",
        "parents":           "The ancestral healing and parental pattern resolution available ahead",
        "legacy":            "The legacy and contribution potential that is crystallising ahead",
        "identity":          "The identity that is emerging and consolidating ahead",
    },
}


# ---------------------------------------------------------------------------
# Synastry blend convergence constants
# ---------------------------------------------------------------------------

# Convergence level string produced by resolver.py v2.0.0
_SYNASTRY_BLEND_LEVEL = "synastry_blend"

# Label map for % display (enforces the % output directive)
_COMPAT_DISPLAY_LABELS: Dict[str, str] = {
    "love":              "Love compatibility",
    "sexuality":         "Intimacy compatibility",
    "children_forecast": "Children potential",
    "career":            "Career synergy",
    "wealth":            "Wealth compatibility",
    "finance":           "Financial alignment",
    "health":            "Health cross-impact",
    "spiritual":         "Spiritual compatibility",
    "character":         "Character compatibility",
    "spirit_world":      "Karmic/soul connection",
    "identity":          "Identity synergy",
    "legacy":            "Legacy alignment",
    "overall":           "Overall compatibility",
}


# ---------------------------------------------------------------------------
# Temporal arc builder (v2.0.0 — preserved intact)
# ---------------------------------------------------------------------------

_PAST_SYSTEMS    = {"palmistry", "numerology"}
_PRESENT_SYSTEMS = {"palmistry", "astrology", "numerology", "physiognomy"}
_FUTURE_SYSTEMS  = {"astrology", "numerology"}

_PAST_FEATURES   = {"hand_shape_non_dominant", "karmic_debt", "life_path",
                    "soul_urge", "destiny", "birthday_system"}
_PRESENT_FEATURES= {"heart_line_dominant", "fate_line_dominant", "head_line_dominant",
                    "personal_year", "current_pinnacle", "eyes", "nose",
                    "face_shape", "cheeks", "jaw"}
_FUTURE_FEATURES = {"personal_year", "current_pinnacle", "sun_line_dominant",
                    "facial_proportions", "next_pinnacle"}


def _build_temporal_arc(
    domain:    Any,  # Domain enum or string key for new domains
    signals:   List[WeightedSignal],
    esoteric:  EsotericSynthesis,
    numerology:Optional[NumerologyProfile],
) -> Optional[TemporalArc]:
    """Build a three-part temporal arc for a domain."""
    if not signals:
        return None

    # Safely get domain key (works for both Domain enum and string)
    domain_key = domain.value if hasattr(domain, "value") else str(domain)

    past_signals    = [ws for ws in signals if _is_past(ws)]
    present_signals = [ws for ws in signals if _is_present(ws)]
    future_signals  = [ws for ws in signals if _is_future(ws)]

    # Get temporal intros — try Domain enum first, then string key, then fallback
    past_intro    = (_TEMPORAL_INTROS["past"].get(domain) or
                     _TEMPORAL_INTROS["past"].get(domain_key) or
                     "In the past,")
    present_intro = (_TEMPORAL_INTROS["present"].get(domain) or
                     _TEMPORAL_INTROS["present"].get(domain_key) or
                     "Currently,")
    future_intro  = (_TEMPORAL_INTROS["future"].get(domain) or
                     _TEMPORAL_INTROS["future"].get(domain_key) or
                     "Looking ahead,")

    past_text    = _phase_text(past_signals,    past_intro)
    present_text = _phase_text(present_signals, present_intro)
    future_text  = _phase_text(future_signals,  future_intro)

    if esoteric.chinese.iching_meaning and domain_key in ("career", "timing", "spiritual"):
        iching = esoteric.chinese.iching_meaning
        future_text = (future_text.rstrip(".") + f". The I Ching also speaks to this moment: {iching}").strip()

    if numerology and numerology.karmic_debts:
        for debt in numerology.karmic_debts:
            if domain_key in debt.domain_impact:
                past_text = (
                    past_text.rstrip(".") +
                    f". This pattern carries the echo of Karmic Debt {debt.value} — {debt.lesson[:80]}."
                ).strip()
                break

    if not past_text:
        past_text = f"{past_intro} your innate {domain_key} blueprint was established through your birth chart and soul contract."
    if not present_text:
        present_text = f"{present_intro} the current pattern in your {domain_key} life reflects your present expression."
    if not future_text:
        future_text = f"{future_intro} your {domain_key} trajectory continues to develop based on current patterns and choices."

    return TemporalArc(
        past           = past_text,
        past_systems   = list({_broad_system(ws.raw.system) for ws in past_signals}),
        present        = present_text,
        present_systems= list({_broad_system(ws.raw.system) for ws in present_signals}),
        future         = future_text,
        future_systems = list({_broad_system(ws.raw.system) for ws in future_signals}),
        arc_confidence = _arc_confidence(past_signals, present_signals, future_signals),
    )


def _is_past(ws: WeightedSignal) -> bool:
    feat = ws.raw.feature.lower(); sys = _broad_system(ws.raw.system)
    temporal = getattr(ws.raw, "temporal_phase", None)
    if temporal and str(temporal) in ("past", "TemporalPhase.past"): return True
    return ("non_dominant" in feat or "karmic" in feat or
            any(f in feat for f in _PAST_FEATURES) or
            (sys == "numerology" and any(f in feat for f in ["life_path","soul_urge","destiny","birthday","karmic"])))

def _is_present(ws: WeightedSignal) -> bool:
    feat = ws.raw.feature.lower()
    temporal = getattr(ws.raw, "temporal_phase", None)
    if temporal and str(temporal) in ("present", "TemporalPhase.present"): return True
    return ("dominant" in feat or "personal_year" in feat or "current_pinnacle" in feat or
            any(f in feat for f in ["eyes","nose","face_shape","cheeks","jaw","lips"]))

def _is_future(ws: WeightedSignal) -> bool:
    feat = ws.raw.feature.lower()
    temporal = getattr(ws.raw, "temporal_phase", None)
    if temporal and str(temporal) in ("future", "TemporalPhase.future"): return True
    return ("transit" in feat or "next_pinnacle" in feat or "sun_line" in feat or
            ("fate_line" in feat and "non_dominant" in feat))

def _phase_text(signals: List[WeightedSignal], intro: str) -> str:
    if not signals: return ""
    top = signals[0]; text = top.raw.reading
    if len(text) > 250: text = text[:247] + "..."
    if not text.startswith(intro.split(",")[0]):
        text = intro + " " + text[0].lower() + text[1:]
    return text

def _arc_confidence(past, present, future) -> float:
    all_sigs = past + present + future
    if not all_sigs: return 0.0
    return round(sum(ws.final_weight for ws in all_sigs) / len(all_sigs), 3)


# ---------------------------------------------------------------------------
# Problem builder (v2.0.0 — preserved intact, key updated for string domains)
# ---------------------------------------------------------------------------

def _build_domain_problem(
    domain:    Any,
    signals:   List[WeightedSignal],
    numerology:Optional[NumerologyProfile],
    esoteric:  EsotericSynthesis,
) -> Optional[DomainProblem]:
    domain_key = domain.value if hasattr(domain, "value") else str(domain)
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}
    challenge_signals = [ws for ws in signals
                        if ws.raw.tone in challenging_tones and ws.final_weight > 0.22]
    if not challenge_signals: return None

    top = challenge_signals[0]
    description = top.raw.reading[:297] + "..." if len(top.raw.reading) > 300 else top.raw.reading
    flagging = list({_broad_system(ws.raw.system) for ws in challenge_signals[:4]})

    total_challenge_weight = sum(ws.final_weight for ws in challenge_signals)
    if total_challenge_weight > 1.5 or len(challenge_signals) >= 3:
        urgency = ProblemUrgency.ACTIVE_NOW
    elif total_challenge_weight > 0.8:
        urgency = ProblemUrgency.BUILDING
    else:
        urgency = ProblemUrgency.RECURRING

    karmic_link = None
    if numerology:
        for debt in numerology.karmic_debts:
            if domain_key in debt.domain_impact:
                karmic_link = f"Karmic Debt {debt.value}: {debt.lesson[:100]}"; break

    origin_parts = [_broad_system(ws.raw.system) for ws in challenge_signals[:2]]
    origin = f"Challenge signals from: {', '.join(set(origin_parts))}"
    if karmic_link: origin += f" | {karmic_link}"

    return DomainProblem(
        identified=True, description=description, origin=origin,
        urgency=urgency, systems_flagging=flagging, karmic_link=karmic_link,
    )


# ---------------------------------------------------------------------------
# Primary signal builder (v2.0.0 — preserved intact)
# ---------------------------------------------------------------------------

def _build_primary_signal(
    domain: Any, signals: List[WeightedSignal],
    resolution: Optional[ConflictResolution], esoteric: EsotericSynthesis,
) -> Tuple[str, float, SignalTone]:
    if resolution:
        return resolution.resolved_reading, resolution.confidence, resolution.resolved_tone
    if not signals:
        return "Insufficient data for this domain.", 0.0, SignalTone.NEUTRAL

    top = signals[0]; reading = top.raw.reading; confidence = top.final_weight; tone = top.raw.tone
    if len(reading) < 80 and len(signals) > 1:
        second = next((ws for ws in signals[1:]
                      if _broad_system(ws.raw.system) != _broad_system(top.raw.system)), None)
        if second and second.raw.reading:
            reading = reading.rstrip(".") + ". " + second.raw.reading
            confidence = (confidence + second.final_weight) / 2

    amplifier = sephirah_domain_amplifier(esoteric.sephirah, domain.value if hasattr(domain,"value") else str(domain))
    if esoteric.hermetic.correspondence_found:
        amplifier *= esoteric.hermetic.amplification_factor

    return reading, round(min(1.0, confidence * amplifier), 3), tone


# ---------------------------------------------------------------------------
# Supporting signals builder (v2.0.0 — preserved intact)
# ---------------------------------------------------------------------------

def _build_supporting_signals(
    signals: List[WeightedSignal], primary_sys: str,
    resolution: Optional[ConflictResolution], max_signals: int = 4,
) -> List[SupportingSignal]:
    supporting = []; seen_systems = {primary_sys}
    if resolution: seen_systems.add(resolution.winning_system)
    for ws in signals:
        if len(supporting) >= max_signals: break
        sys = _broad_system(ws.raw.system)
        if sys in seen_systems or ws.final_weight < 0.20: continue
        if not ws.raw.reading or len(ws.raw.reading) < 20: continue
        reading = ws.raw.reading[:177] + "..." if len(ws.raw.reading) > 180 else ws.raw.reading
        supporting.append(SupportingSignal(
            system=sys, feature=ws.raw.feature.replace("_dominant","").replace("_non_dominant",""),
            reading=reading, strength=round(ws.final_weight, 3)))
        seen_systems.add(sys)
    return supporting


# ---------------------------------------------------------------------------
# Tension / resolution builder (v2.0.0 — extended for new domains)
# ---------------------------------------------------------------------------

def _build_tension_resolution(
    resolution: Optional[ConflictResolution], esoteric: EsotericSynthesis, domain: Any,
) -> Tuple[Optional[str], Optional[str]]:
    if not resolution: return None, None
    if resolution.winning_system == "hermetic_polarity":
        return None, resolution.resolved_reading
    # v3.0.0: synastry_blend produces its own % reading — no tension/resolution needed
    if resolution.winning_system == "synastry_blend":
        return None, resolution.resolved_reading
    if not resolution.suppressed_signal: return None, None

    domain_key = domain.value if hasattr(domain,"value") else str(domain)
    tension = resolution.suppressed_signal

    domain_resolutions = {
        "love":         ("This tension reflects the complexity of your emotional life — "
                        "the depth of feeling and the practical patterns of how it is expressed "
                        "do not always align. The invitation is to bring awareness to the gap."),
        "career":       ("This tension reflects the difference between your innate vocation "
                        "and the practical path that has formed. "
                        "Resolution is found in work that honours both the calling and the craft."),
        "health":       ("This tension reflects different layers of your constitution — "
                        "what is structurally strong and what requires conscious attention. "
                        "Both signals are true at different levels."),
        "wealth":       ("This tension reflects the gap between wealth potential and current expression. "
                        "What the systems agree on: wealth is possible. "
                        "What they differ on: the timing and mechanism."),
        "spiritual":    ("Both signals may be pointing to different aspects of a single path — "
                        "the outer and inner dimensions of the same journey."),
        "character":    ("Character complexity is itself a sign of depth. "
                        "Both signals reflect real aspects of who you are — "
                        "the apparent contradiction may be your most distinctive quality."),
        "finance":      ("The financial tension reflects the difference between potential and habit. "
                        "Awareness of both signals gives the most useful financial picture."),
        "timing":       ("Timing signals from different systems often describe the same period "
                        "through different lenses. Together they give a fuller picture."),
        # v3.0.0 new domain resolutions
        "spirit_world": ("Both signals reflect different dimensions of the spirit world connection — "
                        "the ancestral inheritance and the current life expression may be at different stages of integration."),
        "sexuality":    ("Intimacy tension reflects the gap between desire nature and current expression. "
                        "Both signals carry truth about different layers of the same instinct."),
        "children_forecast": ("The tension reflects different timelines or expressions of generative potential. "
                             "Children and creative legacy can be expressed in many forms."),
        "death_transition":  ("The tension reflects the complexity of the soul's relationship with impermanence. "
                             "Both signals describe different aspects of the same arc."),
        "parents":      ("The parental pattern tension reflects the complex inheritance from both lineages. "
                        "Integration of both poles is the path of ancestral healing."),
        "legacy":       ("The legacy tension reflects the gap between calling and current manifestation. "
                        "Both signals carry information about what is possible."),
        "identity":     ("Identity tension is the creative tension of a complex, evolving self. "
                        "Both signals reflect real facets of who you are."),
    }

    resolution_text = domain_resolutions.get(
        domain_key, "Both signals carry truth — they describe different dimensions of the same reality."
    )
    return tension, resolution_text


# ---------------------------------------------------------------------------
# Timing note builder (v2.0.0 — domain check updated for new domains)
# ---------------------------------------------------------------------------

def _build_timing_note(domain: Any, signals: List[WeightedSignal], timing: TimingLayer) -> Optional[str]:
    domain_key = domain.value if hasattr(domain,"value") else str(domain)
    timing_relevant = {"career","love","wealth","spiritual","timing","legacy","identity","children_forecast"}
    if domain_key not in timing_relevant: return None
    parts = []
    if timing.personal_year:
        parts.append(f"Personal Year {timing.personal_year}: {timing.personal_year_theme}")
    if domain_key == "career" and timing.current_transits:
        parts.append("Current planetary transits support: " + timing.current_transits[0])
    if timing.mian_xiang_period and domain_key in {"career","wealth","love","legacy"}:
        parts.append(f"Mian Xiang life period: {timing.mian_xiang_period} — {timing.mian_xiang_theme}")
    if timing.current_dasha and domain_key in {"spiritual","spirit_world"}:
        parts.append(f"Current Vedic period: {timing.current_dasha} — {timing.dasha_theme}")
    return " | ".join(p for p in parts if p) or None


# ---------------------------------------------------------------------------
# Growth edge builder (v2.0.0 — preserved intact)
# ---------------------------------------------------------------------------

def _build_growth_edge(
    domain: Any, signals: List[WeightedSignal], pillar_directive: str, esoteric: EsotericSynthesis,
) -> Optional[str]:
    domain_key = domain.value if hasattr(domain,"value") else str(domain)
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}
    challenge_signals = [ws for ws in signals
                        if ws.raw.tone in challenging_tones and ws.final_weight > 0.25]
    if challenge_signals:
        top = challenge_signals[0]; reading = top.raw.reading
        return (reading[:197] + "...") if len(reading) > 200 else reading
    if "severity" in pillar_directive.lower() and domain_key in pillar_directive:
        return pillar_directive[:200]
    if domain_key == "spiritual":
        return esoteric.sephirah.integration_note[:200]
    return None


# ---------------------------------------------------------------------------
# Utility helpers (v2.0.0 — preserved intact)
# ---------------------------------------------------------------------------

def _convergence_from_str(level_str: str) -> ConvergenceLevel:
    try: return ConvergenceLevel(level_str)
    except ValueError: return ConvergenceLevel.SINGLE

def _extract_keywords(signals: List[WeightedSignal], max_kw: int = 8) -> List[str]:
    kw_count: Dict[str,int] = {}
    for ws in signals[:8]:
        for kw in ws.raw.keywords: kw_count[kw] = kw_count.get(kw,0)+1
    return [kw for kw,_ in sorted(kw_count.items(),key=lambda x:-x[1])[:max_kw]]

def _pillar_for_domain(domain: Any, signals: List[WeightedSignal]) -> KabbalahPillar:
    positive_tones = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}
    pos = sum(ws.final_weight for ws in signals if ws.raw.tone in positive_tones)
    neg = sum(ws.final_weight for ws in signals if ws.raw.tone in challenging_tones)
    if pos > neg * 1.3: return KabbalahPillar.MERCY
    elif neg > pos * 1.2: return KabbalahPillar.SEVERITY
    return KabbalahPillar.MIDDLE

def _chinese_enrichment(domain: Any, esoteric: EsotericSynthesis) -> Optional[str]:
    domain_key = domain.value if hasattr(domain,"value") else str(domain)
    return get_element_domain_reading(esoteric.chinese.day_master_element, domain_key)

def _extract_dominant_themes(domain_syntheses: Dict[str, DomainSynthesis]) -> List[str]:
    kw_count: Dict[str,int] = {}
    for ds in domain_syntheses.values():
        for kw in ds.keywords: kw_count[kw] = kw_count.get(kw,0)+1
    return [kw for kw,_ in sorted(kw_count.items(),key=lambda x:-x[1])[:12]]

def _build_confirmed_conflicting(
    domain_syntheses: Dict[str, DomainSynthesis],
    resolutions: Dict[str, Optional[ConflictResolution]],
) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    confirmed: Dict[str, List[str]] = {}; conflicting: Dict[str, List[str]] = {}
    for domain_key, ds in domain_syntheses.items():
        if ds.convergence_level in (ConvergenceLevel.FOUR_SYSTEM, ConvergenceLevel.THREE_SYSTEM, ConvergenceLevel.TWO_SYSTEM):
            confirmed[domain_key] = [s.system for s in ds.supporting_signals] + ["primary"]
        resolution = resolutions.get(domain_key)
        if resolution: conflicting[domain_key] = resolution.conflict_systems
    return confirmed, conflicting

def _overall_confidence(domain_syntheses: Dict[str, DomainSynthesis]) -> float:
    confidences = [ds.synthesis_confidence for ds in domain_syntheses.values()]
    return round(sum(confidences)/len(confidences),3) if confidences else 0.0


# ---------------------------------------------------------------------------
# v3.0.0 — Synastry blend handler
# ---------------------------------------------------------------------------

def _handle_synastry_blend(
    domain_key:  str,
    resolution:  ConflictResolution,
    signals:     List[WeightedSignal],
) -> Tuple[str, float, SignalTone]:
    """
    Handle a "synastry_blend" conflict resolution.

    When the resolver produces a synastry_blend resolution (Union Blueprint mode),
    the resolved_reading already contains the % blend display string:
        "Love compatibility: 74% (synastry: 82% | individual natal: 61%)"

    This function:
    1. Extracts the % reading from the resolution
    2. Returns it as the primary_reading with synastry_blend confidence
    3. Tone is determined from the resolved_tone in the resolution

    The % output directive: all compatibility verdicts are expressed as
    percentages. This function is the last point where binary verdict language
    can be caught and converted before reaching the narrator.
    """
    reading = resolution.resolved_reading

    # Ensure the reading contains a % figure — if not, build a default
    if "%" not in reading:
        label = _COMPAT_DISPLAY_LABELS.get(
            domain_key, domain_key.replace("_"," ").title() + " compatibility"
        )
        tone_to_pct = {
            SignalTone.STRONGLY_POSITIVE: 85,
            SignalTone.POSITIVE:          70,
            SignalTone.NEUTRAL:           55,
            SignalTone.CHALLENGING:       40,
            SignalTone.STRONGLY_CHALLENGING: 25,
        }
        pct = tone_to_pct.get(resolution.resolved_tone, 55)
        reading = f"{label}: {pct}% — {reading}"

    return reading, resolution.confidence, resolution.resolved_tone


# ---------------------------------------------------------------------------
# v3.0.0 — Compatibility percentage block builder
# ---------------------------------------------------------------------------

def _build_compatibility_block(
    weighted_map:     WeightedSignalMap,
    synastry_profile: Any,  # SynastryProfile from synastry_engine
) -> Dict[str, float]:
    """
    Generate per-domain compatibility percentages for the Union Blueprint.

    This is the function that produces the % scores the LLM narrator uses
    for every compatibility claim in the Union Blueprint report.

    % output directive enforced here:
        - "Love compatibility: 74%" — ALWAYS
        - "This couple is compatible" — NEVER

    Args:
        weighted_map:     From weigher.weigh_signals() — contains all signals
        synastry_profile: SynastryProfile from synastry_engine — provides
                         the pre-computed CompatibilityScore for cross-checking

    Returns:
        Dict[str, float] — domain → percentage (0.0–100.0) + "overall" key

    The scores are cross-referenced between two sources:
        1. compute_compatibility_percentage(weighted_map) — signal-weight-based
        2. synastry_profile.compatibility.* — pre-computed cross-chart scores
    The final score is 60% signal-weight + 40% pre-computed (where available).
    """
    # Source 1: signal-weight-based % scores
    signal_pcts = compute_compatibility_percentage(weighted_map, COMPATIBILITY_DOMAIN_WEIGHTS)

    # Source 2: pre-computed scores from synastry_engine.CompatibilityScore
    compat_obj = getattr(synastry_profile, "compatibility", None)
    pre_computed: Dict[str, float] = {}
    if compat_obj:
        pre_computed = {
            "love":              getattr(compat_obj, "love",    0.5) * 100,
            "career":            getattr(compat_obj, "career",  0.5) * 100,
            "wealth":            getattr(compat_obj, "wealth",  0.5) * 100,
            "health":            getattr(compat_obj, "health",  0.5) * 100,
            "spiritual":         getattr(compat_obj, "spiritual",0.5) * 100,
            "children_forecast": getattr(compat_obj, "children_forecast", 0.5) * 100,
            "character":         getattr(compat_obj, "character",0.5) * 100,
        }

    # Blend: 60% signal-weight, 40% pre-computed
    blended: Dict[str, float] = {}
    for domain_key in signal_pcts:
        sig_pct = signal_pcts.get(domain_key, 50.0)
        pre_pct = pre_computed.get(domain_key)
        if pre_pct is not None and domain_key != "overall":
            blended[domain_key] = round(sig_pct * 0.60 + pre_pct * 0.40, 1)
        else:
            blended[domain_key] = round(sig_pct, 1)

    # Recompute "overall" from blended domain scores
    blend_total = sum(
        blended[d] * COMPATIBILITY_DOMAIN_WEIGHTS.get(d, 0.0)
        for d in blended if d != "overall" and COMPATIBILITY_DOMAIN_WEIGHTS.get(d, 0.0) > 0
    )
    weight_sum = sum(
        COMPATIBILITY_DOMAIN_WEIGHTS.get(d, 0.0)
        for d in blended if d != "overall" and COMPATIBILITY_DOMAIN_WEIGHTS.get(d, 0.0) > 0
    )
    blended["overall"] = round(blend_total / weight_sum if weight_sum > 0 else 50.0, 1)

    return blended


# ---------------------------------------------------------------------------
# v3.0.0 — Domain synthesis for non-enum domain keys
# ---------------------------------------------------------------------------

def _build_domain_synthesis_for_key(
    domain_key:   str,
    signals:      List[WeightedSignal],
    resolution:   Optional[ConflictResolution],
    convergence:  str,
    esoteric:     EsotericSynthesis,
    numerology:   Optional[NumerologyProfile],
    pillar_dir:   str,
    timing:       TimingLayer,
    solutions:    Dict,
) -> DomainSynthesis:
    """
    Build a DomainSynthesis for a domain key that may not be in the Domain enum.
    Used for new v3.0.0 domain keys: spirit_world, sexuality, children_forecast, etc.
    """
    # Create a proxy that quacks like Domain for all helper functions
    class _DomainProxy:
        def __init__(self, key): self.value = key
        def __str__(self): return self.value
    domain_proxy = _DomainProxy(domain_key)

    conv_level = _convergence_from_str(convergence)

    # Handle synastry_blend convergence
    if convergence == _SYNASTRY_BLEND_LEVEL and resolution:
        primary_reading, confidence, tone = _handle_synastry_blend(
            domain_key, resolution, signals
        )
    else:
        primary_reading, confidence, tone = _build_primary_signal(
            domain_proxy, signals, resolution, esoteric
        )

    chinese_note = _chinese_enrichment(domain_proxy, esoteric)
    if chinese_note and len(primary_reading) < 300:
        primary_reading = primary_reading.rstrip(".") + ". " + chinese_note

    primary_sys = (resolution.winning_system if resolution else
                  (_broad_system(signals[0].raw.system) if signals else "unknown"))
    supporting  = _build_supporting_signals(signals, primary_sys, resolution)
    tension, res_text = _build_tension_resolution(resolution, esoteric, domain_proxy)
    timing_note = _build_timing_note(domain_proxy, signals, timing)
    growth_edge = _build_growth_edge(domain_proxy, signals, pillar_dir, esoteric)
    keywords    = _extract_keywords(signals)
    pillar      = _pillar_for_domain(domain_proxy, signals)
    temporal    = _build_temporal_arc(domain_proxy, signals, esoteric, numerology)
    problem     = _build_domain_problem(domain_proxy, signals, numerology, esoteric)
    solution    = solutions.get(domain_key)

    return DomainSynthesis(
        domain               = domain_proxy,   # type: ignore — proxy accepted by narrator
        convergence_level    = conv_level,
        synthesis_confidence = confidence,
        primary_signal       = primary_reading,
        supporting_signals   = supporting,
        tension              = tension,
        resolution           = res_text,
        timing_note          = timing_note,
        growth_edge          = growth_edge,
        keywords             = keywords,
        tone                 = tone,
        sephirah_note        = None,
        pillar               = pillar,
        temporal             = temporal,
        problem              = problem,
        solution             = solution,
    )


# ---------------------------------------------------------------------------
# Timing layer builder (v3.0.0 — handles arabic_parts, progressions, stelliums)
# ---------------------------------------------------------------------------

def build_timing_layer(
    esoteric:   EsotericSynthesis,
    numerology: Optional[Dict] = None,
    astrology:  Optional[Dict] = None,
) -> TimingLayer:
    """
    Build the unified timing layer from all available timing systems.

    v3.0.0: astrology timing_dict now includes arabic_parts, progressions,
    and stelliums from astrology_engine v2.0.0. These are extracted and
    noteworthy items woven into the unified_timing narrative.
    """
    num = numerology or {}
    astr = astrology or {}

    personal_year        = int(num.get("personal_year",  0))
    personal_year_theme  = str(num.get("personal_year_theme",  "A year of development and progress"))
    personal_month       = int(num.get("personal_month", 0))
    personal_month_theme = str(num.get("personal_month_theme", "Current month energy"))
    personal_week        = int(num.get("personal_week",  0))
    personal_week_theme  = str(num.get("personal_week_theme",  "Weekly cycle in progress"))
    personal_day         = int(num.get("personal_day",   0))
    personal_day_theme   = str(num.get("personal_day_theme",   "Today's personal vibration"))

    transits     = list(astr.get("current_transits", []))
    next_transit = str(astr.get("next_major_transit", ""))
    saturn_phase = astr.get("saturn_return_phase")
    jupiter_phase= str(astr.get("jupiter_phase", ""))

    # v3.0.0 — Arabic Parts extraction
    arabic_parts: Dict = astr.get("arabic_parts", {})
    arabic_notes: List[str] = []
    for part_name, part_data in (arabic_parts or {}).items():
        if isinstance(part_data, dict) and part_data.get("sign"):
            arabic_notes.append(
                f"{part_name} in {part_data['sign']}"
                + (f" (house {part_data['house']})" if part_data.get("house") else "")
            )

    # v3.0.0 — Progressions extraction (Sun and Moon most significant)
    progressions: Dict = astr.get("progressions", {})
    prog_notes: List[str] = []
    for planet in ("Sun", "Moon", "Ascendant"):
        prog = (progressions or {}).get(planet, {})
        if isinstance(prog, dict) and prog.get("sign"):
            prog_notes.append(f"Progressed {planet} in {prog['sign']}")

    # v3.0.0 — Stelliums extraction (3+ planets concentrated)
    stelliums: List = astr.get("stelliums", [])
    stellium_notes: List[str] = []
    for s in (stelliums or [])[:2]:
        if isinstance(s, dict) and s.get("reading"):
            stellium_notes.append(s["reading"][:80])

    mian_period = str(esoteric.chinese.ba_zi_profile[:60]) if esoteric.chinese.ba_zi_profile else ""
    mian_theme  = "Current life period active"

    dasha       = esoteric.vedic.rashi if esoteric.vedic else None
    dasha_theme = esoteric.vedic.dharma_indicator[:80] if esoteric.vedic else None

    iching_meaning = esoteric.chinese.iching_meaning or ""

    unified = _unified_timing_narrative(
        personal_year, personal_year_theme, transits, iching_meaning,
        esoteric.chinese.dominant_element.value,
        arabic_notes=arabic_notes, prog_notes=prog_notes, stellium_notes=stellium_notes,
    )
    opportunity = _opportunity_window(personal_year, esoteric)

    return TimingLayer(
        personal_year        = personal_year,
        personal_year_theme  = personal_year_theme,
        personal_month       = personal_month,
        personal_month_theme = personal_month_theme,
        personal_week        = personal_week,
        personal_week_theme  = personal_week_theme,
        personal_day         = personal_day,
        personal_day_theme   = personal_day_theme,
        current_transits     = transits[:3],
        next_major_transit   = next_transit,
        saturn_return_phase  = saturn_phase,
        jupiter_phase        = jupiter_phase,
        mian_xiang_period    = mian_period,
        mian_xiang_theme     = mian_theme,
        current_luck_pillar  = None,
        luck_pillar_theme    = None,
        current_dasha        = dasha,
        dasha_theme          = dasha_theme,
        unified_timing       = unified,
        opportunity_window   = opportunity,
        caution_window       = None,
    )


def _unified_timing_narrative(
    personal_year:    int,
    year_theme:       str,
    transits:         List[str],
    iching_meaning:   str,
    dominant_element: str,
    arabic_notes:     Optional[List[str]] = None,
    prog_notes:       Optional[List[str]] = None,
    stellium_notes:   Optional[List[str]] = None,
) -> str:
    """Build unified timing narrative. v3.0.0: weaves in arabic_parts, progressions, stelliums."""
    parts = []
    if personal_year:
        parts.append(f"Personal Year {personal_year} ({year_theme.split('.')[0]})")
    if iching_meaning:
        parts.append(iching_meaning.split(" — ")[0][:60] if " — " in iching_meaning else iching_meaning[:60])
    if arabic_notes:
        parts.append("Arabic Lots: " + "; ".join(arabic_notes[:2]))
    if prog_notes:
        parts.append("Progressions: " + "; ".join(prog_notes[:2]))
    if stellium_notes:
        parts.append("Concentration: " + stellium_notes[0])
    return (". ".join(parts) + ".") if parts else "The current period carries its own unique energy and opportunity."


def _opportunity_window(personal_year: int, esoteric: EsotericSynthesis) -> str:
    opportunity_years = {
        1:"New beginnings — the most powerful year for initiating what matters most.",
        3:"Creative expression and expansion — what you put out into the world grows.",
        5:"Freedom and change — unexpected opportunities arise through flexibility.",
        8:"Material achievement — effort invested now yields tangible results.",
        9:"Completion and release — finish what was started, prepare for new cycle.",
    }
    return opportunity_years.get(personal_year % 9 or 9, "A year of steady development and meaningful progress.")


# ---------------------------------------------------------------------------
# Main synthesiser (v3.0.0 — extended with new profiles + domain iteration)
# ---------------------------------------------------------------------------

def synthesise(
    session_id:         str,
    tier:               ReadingTier,
    cultural_profile:   CulturalProfile,
    weighted_map:       WeightedSignalMap,
    resolutions:        Dict[str, Optional[ConflictResolution]],
    convergence_map:    Dict[str, str],
    esoteric:           EsotericSynthesis,
    pillar_directive:   str,
    numerology_timing:  Optional[Dict] = None,
    astrology_timing:   Optional[Dict] = None,
    numerology_profile: Optional[NumerologyProfile] = None,
    user_input:         Optional[object] = None,
    # v3.0.0 new parameters
    spirit_profile:     Optional[Any] = None,
    health_profile:     Optional[Any] = None,
    synastry_profile:   Optional[Any] = None,
) -> SynthesisPayload:
    """
    Build the complete SynthesisPayload including temporal arc and remedies.

    v3.0.0 changes:
    - 3 new optional parameters: spirit_profile, health_profile, synastry_profile
    - Iterates ALL_DOMAINS PLUS any new domain keys present in weighted_map
      (spirit_world, sexuality, children_forecast, death_transition, parents, legacy, identity)
    - Routes "synastry_blend" convergence through _handle_synastry_blend()
      producing % readings instead of suppression
    - Computes compatibility_percentages when synastry_profile is present
      (Union Blueprint mode) — these are the % scores the narrator uses
    - All compatibility verdicts are percentages: "Love: 74%" not "Compatible"

    Args:
        session_id, tier, cultural_profile: Standard identifiers
        weighted_map:       Weighted signals from weigher
        resolutions:        Conflict resolutions from resolver (v2.0.0 includes synastry_blend)
        convergence_map:    Convergence levels (v2.0.0 includes "synastry_blend" class)
        esoteric:           Esoteric synthesis
        pillar_directive:   Pillar balance directive
        numerology_timing:  Numerology timing dict
        astrology_timing:   Astrology timing dict (v2.0.0 includes arabic_parts, progressions, stelliums)
        numerology_profile: Full NumerologyProfile for remedy engine
        user_input:         UserInput for include_remedies flag
        spirit_profile:     SpiritProfile from spirit_engine (v3.0.0, optional)
        health_profile:     HealthProfile from health_engine (v3.0.0, optional)
        synastry_profile:   SynastryProfile from synastry_engine (v3.0.0, Union Blueprint only)
    """
    t0 = time.monotonic()

    # Build timing layer — includes arabic_parts, progressions, stelliums (v3.0.0)
    timing_layer = build_timing_layer(esoteric, numerology_timing, astrology_timing)

    if numerology_profile:
        cp = numerology_profile.current_pinnacle
        timing_layer.current_pinnacle       = cp.number
        timing_layer.current_pinnacle_theme = cp.theme
        pinnacles = numerology_profile.pinnacles
        curr_idx  = next((i for i, p in enumerate(pinnacles) if p.is_current), len(pinnacles)-1)
        if curr_idx < len(pinnacles) - 1:
            nxt = pinnacles[curr_idx + 1]
            timing_layer.next_pinnacle_age   = nxt.start_age
            timing_layer.next_pinnacle_theme = nxt.theme

    include_remedies  = getattr(user_input, "include_remedies", True)  if user_input else True
    requested_domains = getattr(user_input, "requested_domains", list(ALL_DOMAINS)) if user_input else list(ALL_DOMAINS)

    solutions = build_all_solutions(
        cultural_profile  = cultural_profile,
        weighted_map      = weighted_map,
        numerology        = numerology_profile,
        esoteric          = esoteric,
        conflict_map      = resolutions,
        include_flag      = include_remedies,
        requested_domains = requested_domains,
    )

    domain_syntheses: Dict[str, DomainSynthesis] = {}

    # ── First pass: standard ALL_DOMAINS iteration ─────────────────────────
    for domain in ALL_DOMAINS:
        signals    = weighted_map.signals_for(domain)
        resolution = resolutions.get(domain.value)
        conv_str   = convergence_map.get(domain.value, "single")
        conv_level = _convergence_from_str(conv_str)

        # v3.0.0: route synastry_blend through special handler
        if conv_str == _SYNASTRY_BLEND_LEVEL and resolution:
            primary_reading, confidence, primary_tone = _handle_synastry_blend(
                domain.value, resolution, signals
            )
        else:
            primary_reading, confidence, primary_tone = _build_primary_signal(
                domain, signals, resolution, esoteric
            )

        chinese_note = _chinese_enrichment(domain, esoteric)
        if chinese_note and len(primary_reading) < 300:
            primary_reading = primary_reading.rstrip(".") + ". " + chinese_note

        primary_sys = (resolution.winning_system if resolution else
                      (_broad_system(signals[0].raw.system) if signals else "unknown"))
        supporting   = _build_supporting_signals(signals, primary_sys, resolution)
        tension, res_text = _build_tension_resolution(resolution, esoteric, domain)
        timing_note  = _build_timing_note(domain, signals, timing_layer)
        growth_edge  = _build_growth_edge(domain, signals, pillar_directive, esoteric)
        keywords     = _extract_keywords(signals)
        pillar       = _pillar_for_domain(domain, signals)
        sephirah_note= esoteric.sephirah.integration_note if domain == Domain.SPIRITUAL else None
        temporal     = _build_temporal_arc(domain, signals, esoteric, numerology_profile)
        problem      = _build_domain_problem(domain, signals, numerology_profile, esoteric)
        solution     = solutions.get(domain.value)

        domain_syntheses[domain.value] = DomainSynthesis(
            domain               = domain,
            convergence_level    = conv_level,
            synthesis_confidence = confidence,
            primary_signal       = primary_reading,
            supporting_signals   = supporting,
            tension              = tension,
            resolution           = res_text,
            timing_note          = timing_note,
            growth_edge          = growth_edge,
            keywords             = keywords,
            tone                 = primary_tone,
            sephirah_note        = sephirah_note,
            pillar               = pillar,
            temporal             = temporal,
            problem              = problem,
            solution             = solution,
        )

    # ── v3.0.0 Second pass: new domain keys not in ALL_DOMAINS ────────────
    existing_domain_values = {d.value for d in ALL_DOMAINS}
    for domain_key, new_signals in weighted_map.domains.items():
        if domain_key in existing_domain_values or not new_signals:
            continue  # Already processed or empty

        resolution = resolutions.get(domain_key)
        conv_str   = convergence_map.get(domain_key, "single")

        domain_syntheses[domain_key] = _build_domain_synthesis_for_key(
            domain_key  = domain_key,
            signals     = new_signals,
            resolution  = resolution,
            convergence = conv_str,
            esoteric    = esoteric,
            numerology  = numerology_profile,
            pillar_dir  = pillar_directive,
            timing      = timing_layer,
            solutions   = solutions,
        )

    # ── v3.0.0 Compatibility percentages (Union Blueprint only) ───────────
    compatibility_percentages: Optional[Dict[str, float]] = None
    compatibility_formatted:   Optional[Dict[str, str]]   = None

    if synastry_profile is not None:
        compatibility_percentages = _build_compatibility_block(
            weighted_map, synastry_profile
        )
        compatibility_formatted = format_compatibility_report(compatibility_percentages)

        logger.info(
            "Synthesiser — compatibility % computed (Union Blueprint mode)",
            extra={
                "overall_pct":   compatibility_percentages.get("overall"),
                "love_pct":      compatibility_percentages.get("love"),
                "children_pct":  compatibility_percentages.get("children_forecast"),
                "spiritual_pct": compatibility_percentages.get("spiritual"),
            },
        )

    # ── Synthesis metadata ─────────────────────────────────────────────────
    confirmed, conflicting = _build_confirmed_conflicting(domain_syntheses, resolutions)
    dominant_themes        = _extract_dominant_themes(domain_syntheses)
    overall_conf           = _overall_confidence(domain_syntheses)
    processing_ms          = int((time.monotonic() - t0) * 1000)

    logger.info(
        "Synthesiser.synthesise completed",
        extra={
            "session_id":              session_id,
            "tier":                    tier.value,
            "domains_built":           len(domain_syntheses),
            "new_domain_keys_built":   len(domain_syntheses) - len(ALL_DOMAINS),
            "synastry_blend_domains":  sum(1 for v in convergence_map.values()
                                          if v == _SYNASTRY_BLEND_LEVEL),
            "compatibility_pct_mode":  synastry_profile is not None,
            "overall_compat_pct":      compatibility_percentages.get("overall") if compatibility_percentages else None,
            "dominant_themes":         dominant_themes[:5],
            "overall_conf":            overall_conf,
            "processing_ms":           processing_ms,
        },
    )

    return SynthesisPayload(
        session_id              = session_id,
        tier                    = tier,
        cultural_profile        = cultural_profile,
        available_systems       = weighted_map.available_systems,
        domains                 = domain_syntheses,
        timing                  = timing_layer,
        esoteric                = esoteric,
        dominant_themes         = dominant_themes,
        confirmed_signals       = confirmed,
        conflicting_signals     = conflicting,
        overall_confidence      = overall_conf,
        processing_ms           = processing_ms,
        numerology_profile      = numerology_profile,
        # v3.0.0 new fields — gracefully ignored if SynthesisPayload model
        # has not yet been updated to include these fields
        **({
            "compatibility_percentages": compatibility_percentages,
            "compatibility_formatted":   compatibility_formatted,
            "spirit_profile":            spirit_profile,
            "health_profile":            health_profile,
        } if compatibility_percentages is not None else {}),
    )
