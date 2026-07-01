"""
Esoteric — Pillars
===================
Detects imbalance between the Pillar of Mercy and Pillar of Severity
across all domain signals, and generates balancing directives.

In Kabbalistic teaching, the Tree of Life has three pillars:
    Right (Mercy/Jachin):   Expansion, love, abundance, grace
    Left  (Severity/Boaz):  Structure, discipline, challenge, restriction
    Middle (Balance/Shekinah): Integration, harmony, the path of the Self

A healthy soul walks the Middle Pillar — neither all expansion
nor all contraction, but the integration of both.

When readings cluster heavily on one side, the Logic Engine
uses this to:
1. Ensure the synthesis addresses the imbalance
2. Generate appropriate growth edge language
3. Prevent the reading from being relentlessly positive
   or unrealistically bleak

This is invisible to the user.
They receive balanced guidance. The Tree decides the balance.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

from ..models import (
    KabbalahPillar,
    SignalTone,
    Domain,
    ALL_DOMAINS,
)
from ..weigher import WeightedSignalMap


# ---------------------------------------------------------------------------
# Output model
# ---------------------------------------------------------------------------

@dataclass
class PillarAssessment:
    """Result of pillar balance analysis."""
    dominant_pillar:    KabbalahPillar
    mercy_score:        float       # 0.0–1.0 weighted positive signal density
    severity_score:     float       # 0.0–1.0 weighted challenging signal density
    balance_score:      float       # How balanced (1.0 = perfect balance)
    domains_on_mercy:   List[str]   # Domains with net positive signal
    domains_on_severity:List[str]   # Domains with net challenging signal
    domains_balanced:   List[str]   # Domains in balance
    balance_directive:  str         # What the synthesis needs to address
    growth_language:    str         # Plain language growth edge for LLM


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def assess_pillars(weighted_map: WeightedSignalMap) -> PillarAssessment:
    """
    Assess pillar balance across all domain signals.

    Args:
        weighted_map: From weigher.weigh_signals()

    Returns:
        PillarAssessment with balance directive
    """
    positive_tones  = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenge_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    mercy_scores:    List[float] = []
    severity_scores: List[float] = []

    mercy_domains:    List[str] = []
    severity_domains: List[str] = []
    balanced_domains: List[str] = []

    for domain in ALL_DOMAINS:
        signals = weighted_map.signals_for(domain)
        if not signals:
            continue

        pos_weight = sum(
            ws.final_weight for ws in signals
            if ws.raw.tone in positive_tones
        )
        neg_weight = sum(
            ws.final_weight for ws in signals
            if ws.raw.tone in challenge_tones
        )
        total_weight = sum(ws.final_weight for ws in signals)

        if total_weight == 0:
            continue

        pos_ratio = pos_weight / total_weight
        neg_ratio = neg_weight / total_weight

        mercy_scores.append(pos_ratio)
        severity_scores.append(neg_ratio)

        if pos_ratio > neg_ratio + 0.20:
            mercy_domains.append(domain.value)
        elif neg_ratio > pos_ratio + 0.15:
            severity_domains.append(domain.value)
        else:
            balanced_domains.append(domain.value)

    avg_mercy    = sum(mercy_scores)    / len(mercy_scores)    if mercy_scores    else 0.5
    avg_severity = sum(severity_scores) / len(severity_scores) if severity_scores else 0.3

    # Balance score: 1.0 = perfect, 0.0 = extreme imbalance
    total = avg_mercy + avg_severity
    if total > 0:
        balance = 1.0 - abs(avg_mercy - avg_severity) / total
    else:
        balance = 0.5

    # Dominant pillar
    if avg_mercy > avg_severity + 0.20:
        dominant = KabbalahPillar.MERCY
    elif avg_severity > avg_mercy + 0.15:
        dominant = KabbalahPillar.SEVERITY
    else:
        dominant = KabbalahPillar.MIDDLE

    directive, growth = _balance_directive(
        dominant, avg_mercy, avg_severity,
        mercy_domains, severity_domains, balanced_domains,
    )

    return PillarAssessment(
        dominant_pillar     = dominant,
        mercy_score         = round(avg_mercy, 3),
        severity_score      = round(avg_severity, 3),
        balance_score       = round(balance, 3),
        domains_on_mercy    = mercy_domains,
        domains_on_severity = severity_domains,
        domains_balanced    = balanced_domains,
        balance_directive   = directive,
        growth_language     = growth,
    )


# ---------------------------------------------------------------------------
# Balance directive generation
# ---------------------------------------------------------------------------

def _balance_directive(
    dominant:         KabbalahPillar,
    mercy_score:      float,
    severity_score:   float,
    mercy_domains:    List[str],
    severity_domains: List[str],
    balanced_domains: List[str],
) -> Tuple[str, str]:
    """
    Generate internal balance directive and external growth language.
    Returns (internal_directive, external_growth_language).
    """
    if dominant == KabbalahPillar.MERCY:
        if mercy_score > 0.80:
            directive = (
                "Readings are strongly positive across most domains. "
                "Synthesiser must ensure growth edges and honest challenges "
                "are included — avoid a reading that is unrealistically optimistic. "
                "Identify at least two genuine growth areas to balance the output."
            )
            growth = (
                "Your natural strengths are abundant and confirmed across multiple systems. "
                "The invitation now is to develop the areas that challenge you — "
                "these are not weaknesses but the next layer of your becoming."
            )
        else:
            directive = (
                "Readings lean positive. Include 1–2 honest growth edges "
                "to balance the synthesis."
            )
            growth = (
                "The patterns show genuine strength. "
                "Staying honest about where growth is still needed "
                "will serve you more than basking in what is already working."
            )

    elif dominant == KabbalahPillar.SEVERITY:
        if severity_score > 0.65:
            directive = (
                "Readings show significant challenge pressure. "
                "Synthesiser must ensure genuine positive capacities are surfaced "
                "and that the reading does not become discouraging. "
                "The challenges identified are growth signals, not verdicts."
            )
            growth = (
                "This is a season of meaningful growth and challenge. "
                "The pressure you feel is purposeful — "
                "each difficulty is shaping something specific in you. "
                "Your genuine strengths are the foundation to build from."
            )
        else:
            directive = (
                "Readings show some challenge pressure. "
                "Balance with genuine positive signals present. "
                "Frame challenges as growth opportunities."
            )
            growth = (
                "Growth and challenge are woven through this reading alongside real strengths. "
                "Neither the difficulties nor the gifts tell the full story alone."
            )

    else:  # MIDDLE — balanced
        directive = (
            "Readings are well-balanced across positive and challenging signals. "
            "Synthesis can present both sides honestly without needing rebalancing."
        )
        growth = (
            "Your reading shows a genuinely balanced picture — "
            "real strengths alongside real growth areas. "
            "This balance is itself a kind of maturity."
        )

    # Specific domain notes if heavily imbalanced domains exist
    if severity_domains and dominant != KabbalahPillar.SEVERITY:
        directive += (
            f" Note: {', '.join(severity_domains)} domain(s) carry challenge signals "
            "that should be addressed honestly."
        )
    if mercy_domains and dominant != KabbalahPillar.MERCY:
        directive += (
            f" Note: {', '.join(mercy_domains)} domain(s) carry strong positive signals "
            "that should be clearly expressed."
        )

    return directive, growth
