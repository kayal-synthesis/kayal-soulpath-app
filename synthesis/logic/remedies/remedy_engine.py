"""
Remedy Engine — KAYAL Synthesis Platform
==========================================
Central remedy selection and routing engine.

Responsibilities:
    1. Determine if a remedy is triggered (signal-based detection)
    2. Select the appropriate tradition based on CulturalProfile
    3. Route to the correct tradition-specific remedy builder
    4. Return SpiritualRemedy + PracticalSolution as DomainSolution
    5. Detect and explain what triggered the remedy

Trigger conditions (any one is sufficient):
    1. Karmic debt number present (13/14/16/19) — always triggers
    2. Domain on severity pillar (challenging signals dominant)
    3. Cross-hand suppressed signal on a major line
    4. Conflicting signals unresolved in a domain
    5. Tool flag: include_remedies = True AND urgency threshold met

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from ..models import (
    Domain,
    CulturalProfile,
    CulturalOrigin,
    RemedyTradition,
    RemedyUrgency,
    ProblemUrgency,
    SignalTone,
    SpiritualRemedy,
    PracticalSolution,
    DomainSolution,
    DomainProblem,
    KarmicDebt,
    NumerologyProfile,
    EsotericSynthesis,
    KabbalahPillar,
    ChineseElement,
)
from ..weigher import WeightedSignalMap
from .vedic_remedies import build_vedic_remedy
from .chinese_remedies import build_chinese_remedy
from .abrahamic_remedies import build_islamic_remedy, build_christian_remedy
from .other_remedies import (
    build_african_remedy,
    build_western_remedy,
    build_buddhist_remedy,
    build_syncretic_remedy,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cultural origin → remedy tradition mapping
# ---------------------------------------------------------------------------

_ORIGIN_TRADITION: Dict[CulturalOrigin, RemedyTradition] = {
    CulturalOrigin.SOUTH_ASIAN:      RemedyTradition.VEDIC,
    CulturalOrigin.EAST_ASIAN:       RemedyTradition.CHINESE,
    CulturalOrigin.SOUTHEAST_ASIAN:  RemedyTradition.BUDDHIST,
    CulturalOrigin.MIDDLE_EASTERN:   RemedyTradition.ISLAMIC,
    CulturalOrigin.NORTH_AFRICAN:    RemedyTradition.ISLAMIC,
    CulturalOrigin.SUB_SAHARAN:      RemedyTradition.AFRICAN,
    CulturalOrigin.WESTERN:          RemedyTradition.WESTERN,
    CulturalOrigin.EASTERN_EUROPEAN: RemedyTradition.CHRISTIAN,
    CulturalOrigin.LATIN_AMERICAN:   RemedyTradition.SYNCRETIC,
    CulturalOrigin.CARIBBEAN:        RemedyTradition.SYNCRETIC,
    CulturalOrigin.UNKNOWN:          RemedyTradition.UNIVERSAL,
}

# ---------------------------------------------------------------------------
# Trigger detection
# ---------------------------------------------------------------------------

def _detect_triggers(
    domain:       Domain,
    weighted_map: WeightedSignalMap,
    numerology:   Optional[NumerologyProfile],
    esoteric:     EsotericSynthesis,
    conflict_map: Dict[str, Optional[object]],
    include_flag: bool,
) -> Tuple[bool, List[str], RemedyUrgency]:
    """
    Determine if a remedy is triggered for a domain.

    Returns (triggered: bool, trigger_reasons: List[str], urgency: RemedyUrgency)
    """
    triggers   = []
    urgency    = RemedyUrgency.OPTIONAL

    # Trigger 1: Karmic debt
    if numerology:
        for debt in numerology.karmic_debts:
            domain_impact = debt.domain_impact
            if domain.value in domain_impact or len(domain_impact) == 0:
                triggers.append(f"Karmic Debt {debt.value} — {debt.lesson}")
                urgency = RemedyUrgency.IMMEDIATE

    # Trigger 2: Severity pillar dominance for this domain
    if esoteric.sephirah.pillar_balance == KabbalahPillar.SEVERITY:
        signals = weighted_map.signals_for(domain)
        challenging = [
            ws for ws in signals
            if ws.raw.tone in {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}
        ]
        positive = [
            ws for ws in signals
            if ws.raw.tone in {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
        ]
        if len(challenging) > len(positive):
            triggers.append(f"Multiple challenge signals in {domain.value} domain")
            urgency = max_urgency(urgency, RemedyUrgency.SOON)

    # Trigger 3: Conflict unresolved
    conflict = conflict_map.get(domain.value)
    if conflict is not None:
        triggers.append(f"Conflicting signals require spiritual harmonisation")
        urgency = max_urgency(urgency, RemedyUrgency.SOON)

    # Trigger 4: Chinese element lacking for this domain
    if esoteric.chinese.lacking_element:
        domain_element_map = {
            Domain.LOVE:     ChineseElement.FIRE,
            Domain.HEALTH:   ChineseElement.WATER,
            Domain.WEALTH:   ChineseElement.EARTH,
            Domain.CAREER:   ChineseElement.WOOD,
            Domain.SPIRITUAL:ChineseElement.WATER,
            Domain.FINANCE:  ChineseElement.METAL,
        }
        if domain in domain_element_map:
            if esoteric.chinese.lacking_element == domain_element_map[domain]:
                triggers.append(
                    f"{esoteric.chinese.lacking_element.value.title()} element "
                    f"deficiency affecting {domain.value}"
                )
                urgency = max_urgency(urgency, RemedyUrgency.ONGOING)

    # Trigger 5: Tool flag — include if any trigger exists
    if include_flag and triggers:
        pass  # Already triggered

    return bool(triggers), triggers, urgency


def max_urgency(a: RemedyUrgency, b: RemedyUrgency) -> RemedyUrgency:
    """Return the more urgent of two urgency levels."""
    order = [
        RemedyUrgency.OPTIONAL,
        RemedyUrgency.ONGOING,
        RemedyUrgency.SOON,
        RemedyUrgency.IMMEDIATE,
    ]
    return a if order.index(a) >= order.index(b) else b


# ---------------------------------------------------------------------------
# Remedy builder routing
# ---------------------------------------------------------------------------

def _build_remedy(
    domain:          Domain,
    tradition:       RemedyTradition,
    urgency:         RemedyUrgency,
    esoteric:        EsotericSynthesis,
    numerology:      Optional[NumerologyProfile],
) -> SpiritualRemedy:
    """Route to the correct tradition-specific remedy builder."""

    # Extract relevant esoteric data for builders
    lacking_element  = esoteric.chinese.lacking_element
    dominant_element = esoteric.chinese.dominant_element
    iching_meaning   = esoteric.chinese.iching_meaning
    nakshatra        = esoteric.vedic.nakshatra if esoteric.vedic else None
    karmic_debt_num  = None
    if numerology and numerology.karmic_debts:
        karmic_debt_num = int(numerology.karmic_debts[0].value)

    # Get weak planet from vedic synthesis
    planet_weakness = None
    if esoteric.vedic:
        # Map domain to atmakaraka-based weakness
        domain_planet = {
            Domain.LOVE:     "Venus",
            Domain.HEALTH:   "Sun",
            Domain.WEALTH:   "Jupiter",
            Domain.CAREER:   "Saturn",
            Domain.SPIRITUAL:"Ketu",
            Domain.FINANCE:  "Mercury",
        }.get(domain)
        planet_weakness = domain_planet

    if tradition == RemedyTradition.VEDIC:
        return build_vedic_remedy(domain, planet_weakness, nakshatra, karmic_debt_num, urgency)

    elif tradition == RemedyTradition.CHINESE:
        return build_chinese_remedy(domain, lacking_element, dominant_element, iching_meaning, urgency)

    elif tradition == RemedyTradition.ISLAMIC:
        return build_islamic_remedy(domain, urgency)

    elif tradition == RemedyTradition.CHRISTIAN:
        return build_christian_remedy(domain, urgency)

    elif tradition == RemedyTradition.AFRICAN:
        return build_african_remedy(domain, urgency)

    elif tradition == RemedyTradition.WESTERN:
        return build_western_remedy(domain, urgency)

    elif tradition == RemedyTradition.BUDDHIST:
        return build_buddhist_remedy(domain, urgency)

    elif tradition == RemedyTradition.SYNCRETIC:
        return build_syncretic_remedy(domain, urgency)

    else:
        # Universal — use Western as default
        return build_western_remedy(domain, urgency)


# ---------------------------------------------------------------------------
# Practical solution builder
# ---------------------------------------------------------------------------

def _build_practical_solution(
    domain:   Domain,
    problem:  DomainProblem,
    numerology: Optional[NumerologyProfile],
) -> PracticalSolution:
    """Build practical, grounded solution for a domain problem."""

    # Personal Year timing guidance
    timing_note = ""
    if numerology:
        py = numerology.personal_year
        if py in (1, 5, 8):
            timing_note = f"Personal Year {py} supports bold action — this is the right time to move."
        elif py in (2, 6):
            timing_note = f"Personal Year {py} favours cooperation and patience — work with others."
        elif py in (4, 7):
            timing_note = f"Personal Year {py} calls for planning and inner work before outer action."
        elif py == 9:
            timing_note = f"Personal Year 9 — complete and release before beginning anew."

    domain_solutions = {
        Domain.LOVE: PracticalSolution(
            domain=domain,
            action=(
                "Identify the specific pattern that is repeating in your relationships. "
                "Write it down without judgment. Then identify where you first learned this pattern. "
                "The pattern changes when its origin is understood."
            ),
            timing=timing_note or "Begin this week — awareness is the first action",
            duration="30-day pattern journal",
            expected_shift="Conscious pattern recognition breaks unconscious repetition within 30 days",
        ),
        Domain.HEALTH: PracticalSolution(
            domain=domain,
            action=(
                "Address the three foundational health pillars that the reading indicates are under pressure: "
                "sleep (7-8 hours minimum), hydration (2 litres daily), and one form of movement you genuinely enjoy. "
                "Do not attempt a complete lifestyle overhaul — address one pillar at a time."
            ),
            timing=timing_note or "Begin with sleep — the most immediate impact",
            duration="21-day foundation building",
            expected_shift="Constitutional health improvements become measurable within 21 days of consistent practice",
        ),
        Domain.WEALTH: PracticalSolution(
            domain=domain,
            action=(
                "Conduct an honest financial audit: income, outgoings, and the emotional patterns around money. "
                "Where does money leak that is not a genuine need? "
                "Identify one specific, sustainable change that addresses the leak."
            ),
            timing=timing_note or "Schedule the audit within 7 days",
            duration="3-month financial awareness practice",
            expected_shift="Financial clarity precedes financial change — expect clarity first, then flow",
        ),
        Domain.CAREER: PracticalSolution(
            domain=domain,
            action=(
                "Write a clear statement of your vocational purpose — one sentence that describes "
                "what you do, who you serve, and why it matters. "
                "Then audit your current role against this statement. "
                "The gap between them is the work."
            ),
            timing=timing_note or "Dedicate one hour this week to this writing exercise",
            duration="Ongoing quarterly review",
            expected_shift="Clarity of purpose attracts aligned opportunity within the current personal year cycle",
        ),
        Domain.SPIRITUAL: PracticalSolution(
            domain=domain,
            action=(
                "Establish a non-negotiable morning practice of 15 minutes. "
                "It does not matter what the practice is — "
                "what matters is the consistency and the intention behind it. "
                "The practice is the prayer."
            ),
            timing=timing_note or "Begin tomorrow morning, before checking your phone",
            duration="40 days — the traditional spiritual completion period",
            expected_shift="A consistent morning practice changes the quality of every hour that follows it",
        ),
        Domain.FINANCE: PracticalSolution(
            domain=domain,
            action=(
                "Create three financial containers: needs, wants, and growth. "
                "Allocate a percentage of every income to each before spending anything. "
                "Even 1% to growth is transformative over time."
            ),
            timing=timing_note or "Set this up on your next payday",
            duration="Ongoing — this becomes your permanent financial architecture",
            expected_shift="Financial structure creates financial confidence, which creates financial growth",
        ),
        Domain.CHARACTER: PracticalSolution(
            domain=domain,
            action=(
                "Identify your three most consistent strengths and your three most consistent shadows. "
                "For 30 days, lean into one strength and honestly address one shadow. "
                "Character is not changed by trying harder — it changes through honest awareness."
            ),
            timing=timing_note or "Write your six qualities today",
            duration="30-day character awareness practice",
            expected_shift="Honest self-knowledge is the beginning of genuine character development",
        ),
        Domain.TIMING: PracticalSolution(
            domain=domain,
            action=(
                "Map your Personal Year number against the themes of your current year. "
                "Identify the three most important actions aligned with this year's energy "
                "and the three actions that work against it. "
                "Timing is alignment, not force."
            ),
            timing="Review at the start of each month",
            duration="Ongoing — timing awareness becomes a lifelong skill",
            expected_shift="When actions align with timing cycles, effort produces disproportionate results",
        ),
    }

    return domain_solutions.get(domain, PracticalSolution(
        domain=domain,
        action="Identify the specific pattern active in this domain and address its root cause.",
        timing=timing_note or "Begin within 7 days",
        duration="30 days",
        expected_shift="Root cause awareness transforms the surface pattern",
    ))


# ---------------------------------------------------------------------------
# Problem builder
# ---------------------------------------------------------------------------

def _build_problem(
    domain:       Domain,
    triggers:     List[str],
    weighted_map: WeightedSignalMap,
    urgency:      RemedyUrgency,
    numerology:   Optional[NumerologyProfile],
) -> DomainProblem:
    """Build a DomainProblem from trigger information."""

    # Determine urgency as ProblemUrgency
    problem_urgency_map = {
        RemedyUrgency.IMMEDIATE: ProblemUrgency.ACTIVE_NOW,
        RemedyUrgency.SOON:      ProblemUrgency.BUILDING,
        RemedyUrgency.ONGOING:   ProblemUrgency.RECURRING,
        RemedyUrgency.OPTIONAL:  ProblemUrgency.RESOLVING,
    }
    problem_urgency = problem_urgency_map.get(urgency, ProblemUrgency.BUILDING)

    # Find the primary challenging signal for description
    signals = weighted_map.signals_for(domain)
    challenging = [
        ws for ws in signals
        if ws.raw.tone in {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}
    ]

    if challenging:
        description = challenging[0].raw.reading[:300]
        systems = list({ws.raw.system for ws in challenging[:3]})
    else:
        description = f"Pattern requiring attention in the {domain.value} domain — see triggers for detail."
        systems = []

    # Karmic link
    karmic_link = None
    if numerology:
        for debt in numerology.karmic_debts:
            if domain.value in debt.domain_impact or not debt.domain_impact:
                karmic_link = f"Karmic Debt {debt.value}: {debt.lesson}"
                break

    # Origin
    origin_parts = []
    for trigger in triggers[:2]:
        origin_parts.append(trigger)
    origin = " | ".join(origin_parts) if origin_parts else "Cross-system pattern detected"

    return DomainProblem(
        identified       = True,
        description      = description,
        origin           = origin,
        urgency          = problem_urgency,
        systems_flagging = systems,
        karmic_link      = karmic_link,
    )


# ---------------------------------------------------------------------------
# Main engine function
# ---------------------------------------------------------------------------

def build_domain_solution(
    domain:       Domain,
    cultural_profile: CulturalProfile,
    weighted_map: WeightedSignalMap,
    numerology:   Optional[NumerologyProfile],
    esoteric:     EsotericSynthesis,
    conflict_map: Dict[str, Optional[object]],
    include_flag: bool,
) -> DomainSolution:
    """
    Build complete DomainSolution for a single domain.

    Args:
        domain:           Target domain
        cultural_profile: For tradition selection
        weighted_map:     For trigger detection
        numerology:       For karmic debt detection and timing
        esoteric:         For Chinese element and sephirah data
        conflict_map:     From resolver — unresolved conflicts
        include_flag:     UserInput.include_remedies flag

    Returns:
        DomainSolution — may have no remedy if no triggers found
    """
    triggered, triggers, urgency = _detect_triggers(
        domain, weighted_map, numerology, esoteric, conflict_map, include_flag
    )

    if not triggered:
        return DomainSolution(
            domain           = domain,
            has_problem      = False,
            practical        = None,
            spiritual_remedy = None,
            remedy_triggered_by = [],
        )

    # Build problem
    problem = _build_problem(domain, triggers, weighted_map, urgency, numerology)

    # Build practical solution
    practical = _build_practical_solution(domain, problem, numerology)

    # Select tradition
    tradition = _ORIGIN_TRADITION.get(cultural_profile.origin, RemedyTradition.UNIVERSAL)

    # Build spiritual remedy
    remedy = _build_remedy(domain, tradition, urgency, esoteric, numerology)

    logger.info(
        "RemedyEngine.build_domain_solution — remedy triggered",
        extra={
            "domain":    domain.value,
            "tradition": tradition.value,
            "urgency":   urgency.value,
            "triggers":  triggers[:2],
        },
    )

    return DomainSolution(
        domain           = domain,
        has_problem      = True,
        practical        = practical,
        spiritual_remedy = remedy,
        remedy_triggered_by = triggers,
    )


def build_all_solutions(
    cultural_profile: CulturalProfile,
    weighted_map:     WeightedSignalMap,
    numerology:       Optional[NumerologyProfile],
    esoteric:         EsotericSynthesis,
    conflict_map:     Dict[str, Optional[object]],
    include_flag:     bool,
    requested_domains:List[Domain],
) -> Dict[str, DomainSolution]:
    """Build solutions for all requested domains."""
    solutions = {}
    for domain in requested_domains:
        solutions[domain.value] = build_domain_solution(
            domain, cultural_profile, weighted_map,
            numerology, esoteric, conflict_map, include_flag,
        )
    return solutions
