"""
Logic Engine — Payload Builder
================================
Formats the SynthesisPayload into LLMPayload for narration.
Version 2.0.0 — adds temporal arc and remedy formatting.

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from .models import (
    SynthesisPayload,
    LLMPayload,
    LLMDomainPayload,
    LLMTemporalPayload,
    LLMRemedyPayload,
    DomainSynthesis,
    ConvergenceLevel,
    SignalTone,
    KabbalahPillar,
    Domain,
    ReadingTier,
    CulturalProfile,
    CulturalOrigin,
    ALL_DOMAINS,
)
from .tier_detector import TierAssessment, suggest_upgrade
from .esoteric.paths import derive_journey_path

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System name humanisation
# Maps internal system keys to plain language
# ---------------------------------------------------------------------------

_SYSTEM_LABELS: Dict[str, str] = {
    "astrology":             "the stars",
    "astrology_western":     "Western astrology",
    "astrology_vedic":       "Vedic astrology",
    "astrology_chinese":     "Chinese astrology",
    "numerology":            "the numbers",
    "numerology_pythagorean":"numerology",
    "numerology_chaldean":   "numerology",
    "numerology_vedic":      "Vedic numerology",
    "palmistry":             "the palm",
    "physiognomy":           "the face",
    "hermetic_polarity":     "the deeper pattern",
}

def _humanise_system(system: str) -> str:
    return _SYSTEM_LABELS.get(system.lower(), system.replace("_", " ").title())


# ---------------------------------------------------------------------------
# Convergence language
# Describes how strongly confirmed a reading is
# ---------------------------------------------------------------------------

_CONVERGENCE_LANGUAGE: Dict[str, str] = {
    ConvergenceLevel.FOUR_SYSTEM.value:  "confirmed across all four systems",
    ConvergenceLevel.THREE_SYSTEM.value: "confirmed across three independent systems",
    ConvergenceLevel.TWO_SYSTEM.value:   "confirmed by two independent systems",
    ConvergenceLevel.SINGLE.value:       "indicated by one system",
    ConvergenceLevel.CONFLICTED.value:   "showing a meaningful complexity",
}

def _convergence_label(level: ConvergenceLevel) -> str:
    return _CONVERGENCE_LANGUAGE.get(level.value, "indicated")


# ---------------------------------------------------------------------------
# Tone instruction per signal tone + pillar
# ---------------------------------------------------------------------------

def _tone_instruction(tone: SignalTone, pillar: KabbalahPillar) -> str:
    """Generate LLM tone instruction for this domain."""
    if pillar == KabbalahPillar.MERCY:
        if tone in (SignalTone.STRONGLY_POSITIVE, SignalTone.POSITIVE):
            return "warm, celebratory, and encouraging — this is genuine good news"
        else:
            return "warm and grounded — acknowledge complexity with care"
    elif pillar == KabbalahPillar.SEVERITY:
        if tone in (SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING):
            return "compassionate, honest, and growth-oriented — name the challenge clearly but frame it as purposeful"
        else:
            return "steady and grounding — balance the challenge with genuine strength"
    else:
        return "balanced, direct, and empowering — neither sugar-coating nor over-emphasising"


# ---------------------------------------------------------------------------
# Cultural context note
# ---------------------------------------------------------------------------

def _cultural_context_note(profile: CulturalProfile) -> str:
    """
    Generate a brief cultural framing note for the LLM narrator.
    Helps the LLM calibrate language appropriately.
    """
    context_map: Dict[CulturalOrigin, str] = {
        CulturalOrigin.SOUTH_ASIAN: (
            "The user comes from South Asian cultural background. "
            "Vedic astrology and karma concepts will resonate naturally. "
            "Use Dharma/Karma language where appropriate. "
            "Avoid Western-centric individualism framing."
        ),
        CulturalOrigin.EAST_ASIAN: (
            "The user comes from East Asian cultural background. "
            "Five-element and balance concepts resonate naturally. "
            "Face reading (Mian Xiang) references can be mentioned respectfully. "
            "Community and family dimensions are important context."
        ),
        CulturalOrigin.SOUTHEAST_ASIAN: (
            "The user comes from Southeast Asian background — a rich blend of "
            "Chinese, Indian, and indigenous traditions. "
            "Use inclusive language that honours this multicultural heritage."
        ),
        CulturalOrigin.MIDDLE_EASTERN: (
            "The user comes from Middle Eastern or Arab cultural background. "
            "Honour concepts of fate, divine will, and cosmic order. "
            "Avoid overly Western psychological framing. "
            "The idea that meaning is written is culturally resonant."
        ),
        CulturalOrigin.NORTH_AFRICAN: (
            "The user comes from North African background. "
            "A blend of Arab, Berber, and Mediterranean influences. "
            "Spiritual depth and fatalistic acceptance coexist with pragmatism."
        ),
        CulturalOrigin.SUB_SAHARAN: (
            "The user comes from Sub-Saharan African background. "
            "Community, ancestry, and interconnectedness are culturally central. "
            "Honour the role of destiny while affirming human agency."
        ),
        CulturalOrigin.WESTERN: (
            "The user comes from a Western cultural background. "
            "Psychological framing and individual agency resonate well. "
            "Self-development and personal growth language is natural."
        ),
        CulturalOrigin.EASTERN_EUROPEAN: (
            "The user comes from Eastern European background. "
            "A blend of Western and Eastern sensibilities. "
            "Depth, fate, and resilience are culturally resonant themes."
        ),
        CulturalOrigin.LATIN_AMERICAN: (
            "The user comes from Latin American background. "
            "Passion, family, spirituality, and destiny are central cultural themes. "
            "Warm, expressive language resonates well."
        ),
        CulturalOrigin.CARIBBEAN: (
            "The user comes from Caribbean background — "
            "a rich multicultural heritage of African, European, and indigenous traditions. "
            "Spirituality, resilience, and community are core themes."
        ),
        CulturalOrigin.UNKNOWN: (
            "Cultural background is uncertain. "
            "Use universally accessible, respectful language. "
            "Avoid assumptions about spiritual or cultural framing."
        ),
    }
    return context_map.get(profile.origin, context_map[CulturalOrigin.UNKNOWN])


# ---------------------------------------------------------------------------
# Word count targeting per tier
# ---------------------------------------------------------------------------

_TIER_WORD_COUNTS: Dict[ReadingTier, int] = {
    ReadingTier.TIER_4_FULL:        2800,
    ReadingTier.TIER_3B_FACE_PALM:  2400,
    ReadingTier.TIER_3_PALM:        2200,
    ReadingTier.TIER_2_FACE:        2000,
    ReadingTier.TIER_2B_PALM_ONLY:  1900,
    ReadingTier.TIER_1_CORE:        1600,
}


# ---------------------------------------------------------------------------
# Overall theme synthesis
# ---------------------------------------------------------------------------

def _synthesise_overall_theme(
    payload: SynthesisPayload,
    first_name: str,
) -> str:
    themes     = payload.dominant_themes[:5]
    themes_str = ", ".join(t.replace("_", " ") for t in themes[:3])

    convergence_note = ""
    if payload.confirmed_signals:
        n = len(payload.confirmed_signals)
        convergence_note = (
            f"Multiple independent systems agree on {n} "
            f"{'domain' if n == 1 else 'domains'}, "
            "giving this reading unusual depth and reliability."
        )

    tier_note = ""
    if payload.tier == ReadingTier.TIER_4_FULL:
        tier_note = (
            "With all four systems active — astrology, numerology, "
            "physiognomy, and palmistry — this is a complete reading "
            "at every level of your being."
        )
    elif payload.tier == ReadingTier.TIER_1_CORE:
        tier_note = (
            "Based on your birth data, astrology and numerology "
            "reveal the foundational blueprint of your path."
        )

    return (
        f"The pattern that emerges most clearly across all systems "
        f"is one of {themes_str}. "
        f"{convergence_note} "
        f"{tier_note}"
    ).strip()


# ---------------------------------------------------------------------------
# Temporal payload formatter
# ---------------------------------------------------------------------------

def _format_temporal(ds: DomainSynthesis) -> Optional[LLMTemporalPayload]:
    """Convert TemporalArc to LLMTemporalPayload. Returns None if no arc."""
    if ds.temporal is None:
        return None
    return LLMTemporalPayload(
        past    = ds.temporal.past,
        present = ds.temporal.present,
        future  = ds.temporal.future,
    )


# ---------------------------------------------------------------------------
# Remedy payload formatter
# ---------------------------------------------------------------------------

def _format_remedy(ds: DomainSynthesis) -> Optional[LLMRemedyPayload]:
    """
    Convert DomainSolution to LLMRemedyPayload.
    Strips all tradition/system vocabulary — pure instruction language.
    Returns None if no remedy triggered.
    """
    if ds.solution is None or not ds.solution.has_problem:
        return None

    remedy = ds.solution.spiritual_remedy
    if remedy is None:
        return None

    return LLMRemedyPayload(
        has_remedy        = True,
        title             = remedy.title,
        description       = remedy.description,
        timing            = remedy.timing,
        duration          = remedy.duration,
        materials         = remedy.materials,
        mantra_or_prayer  = remedy.mantra_or_prayer,
        expected_shift    = remedy.expected_shift,
        caution           = remedy.caution,
    )


# ---------------------------------------------------------------------------
# Problem formatter
# ---------------------------------------------------------------------------

def _format_problem(ds: DomainSynthesis) -> Optional[str]:
    """Format domain problem as plain language string for LLM."""
    if ds.problem is None or not ds.problem.identified:
        return None

    urgency_language = {
        "active_now": "This challenge is active right now",
        "building":   "This challenge is building",
        "recurring":  "This is a recurring pattern",
        "resolving":  "This challenge is in the process of resolving",
    }
    urgency_str = urgency_language.get(
        ds.problem.urgency.value if ds.problem.urgency else "building",
        "A pattern requiring attention"
    )

    problem_text = f"{urgency_str}: {ds.problem.description}"
    if ds.problem.karmic_link:
        problem_text += f" Root: {ds.problem.karmic_link}"
    return problem_text


# ---------------------------------------------------------------------------
# Practical solution formatter
# ---------------------------------------------------------------------------

def _format_practical(ds: DomainSynthesis) -> Optional[str]:
    """Format practical solution as plain language string."""
    if ds.solution is None or not ds.solution.has_problem:
        return None
    practical = ds.solution.practical
    if practical is None:
        return None
    return (
        f"{practical.action} "
        f"Timing: {practical.timing}. "
        f"Duration: {practical.duration}. "
        f"Expected shift: {practical.expected_shift}"
    )


# ---------------------------------------------------------------------------
# Domain payload builder
# ---------------------------------------------------------------------------

def _build_domain_payload(
    domain: Domain,
    ds: DomainSynthesis,
) -> LLMDomainPayload:
    """Convert a DomainSynthesis to an LLMDomainPayload."""

    convergence_desc = _convergence_label(ds.convergence_level)

    supporting_points = []
    for ss in ds.supporting_signals:
        system_label = _humanise_system(ss.system)
        supporting_points.append(f"{system_label.title()}: {ss.reading}")

    tone_instr = _tone_instruction(ds.tone, ds.pillar)

    return LLMDomainPayload(
        domain             = domain.value,
        convergence_level  = convergence_desc,
        primary_reading    = ds.primary_signal,
        supporting_points  = supporting_points,
        tension            = ds.tension,
        resolution         = ds.resolution,
        timing             = ds.timing_note,
        growth_edge        = ds.growth_edge,
        tone_instruction   = tone_instr,
        keywords           = ds.keywords,
        temporal           = _format_temporal(ds),
        problem            = _format_problem(ds),
        practical_solution = _format_practical(ds),
        remedy             = _format_remedy(ds),
    )


# ---------------------------------------------------------------------------
# Karmic debt summary
# ---------------------------------------------------------------------------

def _karmic_summary(synthesis: SynthesisPayload) -> Optional[str]:
    """Build plain-language karmic debt summary for LLM payload header."""
    profile = synthesis.numerology_profile
    if not profile or not profile.karmic_debts:
        return None

    debts = profile.karmic_debts
    if len(debts) == 1:
        debt = debts[0]
        return (
            f"Karmic Debt {debt.value} is present in this chart. "
            f"{debt.lesson[:150]} "
            "This debt is not a punishment — it is an accelerated curriculum "
            "that the soul chose in order to grow rapidly."
        )
    else:
        numbers = ", ".join(str(d.value) for d in debts)
        return (
            f"Multiple karmic debts are present ({numbers}). "
            "This soul has chosen an intensive growth curriculum this lifetime. "
            "Each debt carries its own lesson — and its own remedy."
        )


# ---------------------------------------------------------------------------
# Pinnacle summary
# ---------------------------------------------------------------------------

def _pinnacle_summary(synthesis: SynthesisPayload) -> Optional[str]:
    """Build pinnacle timing summary for LLM payload."""
    timing = synthesis.timing
    if timing.current_pinnacle is None:
        return None

    parts = [
        f"Current life cycle (Pinnacle {timing.current_pinnacle}): {timing.current_pinnacle_theme}"
    ]
    if timing.next_pinnacle_age and timing.next_pinnacle_theme:
        parts.append(
            f"The next major life cycle begins at age {timing.next_pinnacle_age}: "
            f"{timing.next_pinnacle_theme}"
        )
    return " | ".join(parts)


# ---------------------------------------------------------------------------
# Main payload builder
# ---------------------------------------------------------------------------

def build_llm_payload(
    synthesis:       SynthesisPayload,
    user_first_name: str,
    tier_assessment: TierAssessment,
) -> LLMPayload:
    """
    Build the complete LLMPayload from SynthesisPayload.
    Zero esoteric vocabulary. Pure insight language.
    """
    # Domain payloads
    domain_payloads: List[LLMDomainPayload] = []
    for domain in ALL_DOMAINS:
        ds = synthesis.get_domain(domain)
        if ds is None:
            continue
        if not ds.primary_signal or ds.synthesis_confidence < 0.15:
            continue
        domain_payloads.append(_build_domain_payload(domain, ds))

    # Journey narrative
    journey = derive_journey_path(synthesis.esoteric.sephirah)

    # Overall theme
    overall_theme = _synthesise_overall_theme(synthesis, user_first_name)

    # Timing summary
    timing_summary = synthesis.timing.unified_timing
    if synthesis.timing.opportunity_window:
        timing_summary += " " + synthesis.timing.opportunity_window

    # Narration tone
    if synthesis.esoteric.sephirah.pillar_balance == KabbalahPillar.MERCY:
        narration_tone = "warm, celebratory, and empowering — the reading leans positive; honour this while including genuine growth edges"
    elif synthesis.esoteric.sephirah.pillar_balance == KabbalahPillar.SEVERITY:
        narration_tone = "compassionate, honest, and growth-oriented — name challenges clearly as purposeful rather than as verdicts"
    else:
        narration_tone = "balanced, direct, and empowering — give equal weight to strengths and growth edges"

    # Tier description
    tier_desc = tier_assessment.tier_description
    upgrade   = suggest_upgrade(tier_assessment)
    if upgrade:
        tier_desc = tier_desc + " " + upgrade

    # Cultural context
    cultural_ctx = _cultural_context_note(synthesis.cultural_profile)

    # Word count
    word_target = _TIER_WORD_COUNTS.get(synthesis.tier, 2000)

    # Karmic debts
    karmic = _karmic_summary(synthesis)
    has_karmic = bool(
        synthesis.numerology_profile and synthesis.numerology_profile.karmic_debts
    )

    # Pinnacle summary
    pinnacle = _pinnacle_summary(synthesis)

    logger.info(
        "PayloadBuilder.build_llm_payload completed",
        extra={
            "session_id":    synthesis.session_id,
            "tier":          synthesis.tier.value,
            "domains_built": len(domain_payloads),
            "has_remedies":  sum(1 for d in domain_payloads if d.remedy),
            "has_temporal":  sum(1 for d in domain_payloads if d.temporal),
            "has_karmic":    has_karmic,
            "word_target":   word_target,
        },
    )

    return LLMPayload(
        session_id          = synthesis.session_id,
        user_name           = user_first_name,
        tier_description    = tier_desc,
        domains             = domain_payloads,
        timing_summary      = timing_summary,
        overall_theme       = overall_theme,
        journey_narrative   = journey,
        dominant_themes     = synthesis.dominant_themes,
        narration_tone      = narration_tone,
        word_count_target   = word_target,
        cultural_context    = cultural_ctx,
        has_karmic_debts    = has_karmic,
        karmic_debt_summary = karmic,
        pinnacle_summary    = pinnacle,
    )
