"""
Esoteric — Hermetic Principles
================================
Applies the Seven Hermetic Principles from the Kybalion (1908)
to detect cross-system pattern correspondence and generate
synthesis amplification signals.

The Seven Principles:
    1. Mentalism    — "The All is Mind; the Universe is Mental"
    2. Correspondence — "As above, so below; as below, so above"
    3. Vibration    — "Nothing rests; everything moves; everything vibrates"
    4. Polarity     — "Everything is dual; everything has poles"
    5. Rhythm       — "Everything flows, out and in; everything has its tides"
    6. Cause/Effect — "Every cause has its effect; every effect has its cause"
    7. Gender       — "Gender is in everything; everything has its masculine and feminine"

In KAYAL, these principles serve two functions:

    Correspondence (Principle 2) is the core detection tool.
    When astrology, numerology, palmistry, and physiognomy all point
    to the same pattern, they are reflecting "as above, so below" —
    the same soul pattern expressing at four different scales simultaneously.
    This is the most powerful confirmation the Logic Engine can produce.

    Polarity (Principle 4) is the conflict resolution tool.
    When systems disagree, it is often because they are seeing the same
    truth from opposite poles — not contradicting each other but
    revealing two ends of the same spectrum.

    Rhythm (Principle 5) feeds the timing layer.
    The personal year, dasha, luck pillar, and Mian Xiang period
    are all different measurements of the same rhythmic principle.

The user never sees Hermetic terminology.
They receive the confirmation, resolution, and timing insights.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from ..models import (
    HermeticCorrespondence,
    SignalTone,
    Domain,
    ALL_DOMAINS,
)
from ..weigher import WeightedSignalMap, WeightedSignal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Keyword correspondence groups
# When signals from different systems share keywords, Correspondence is active
# ---------------------------------------------------------------------------

_CORRESPONDENCE_CLUSTERS: Dict[str, List[str]] = {
    # Leadership cluster
    "leadership_authority": [
        "leadership", "authority", "command", "executive", "power",
        "ambition", "pioneering", "direction", "governance",
    ],
    # Love cluster
    "deep_love": [
        "devotion", "emotional_depth", "soul_connection", "romance",
        "passion", "commitment", "empathy", "nurturing", "bhakti",
    ],
    # Creativity cluster
    "creative_expression": [
        "creativity", "artistry", "expression", "innovation", "vision",
        "inspiration", "aesthetic", "performance", "originality",
    ],
    # Spiritual cluster
    "spiritual_depth": [
        "spirituality", "intuition", "psychic", "mysticism", "devotion",
        "transcendence", "meditation", "soul_mission", "karma", "dharma",
    ],
    # Wealth cluster
    "material_abundance": [
        "wealth", "abundance", "prosperity", "accumulation", "earning",
        "financial_mastery", "resources", "material_success",
    ],
    # Analytical cluster
    "analytical_intelligence": [
        "analysis", "precision", "research", "intellect", "systematic",
        "logical", "detail", "methodology", "expertise",
    ],
    # Endurance cluster
    "endurance_persistence": [
        "endurance", "persistence", "resilience", "determination",
        "consistency", "patience", "stamina", "tenacity",
    ],
    # Communication cluster
    "expressive_communication": [
        "communication", "eloquence", "persuasion", "teaching", "writing",
        "articulate", "social_intelligence", "charisma",
    ],
    # Healing cluster
    "healing_service": [
        "healing", "service", "compassion", "counselling", "nursing",
        "empathy", "care", "wellbeing", "restoration",
    ],
    # Transformation cluster
    "transformation": [
        "transformation", "reinvention", "evolution", "change",
        "breakthrough", "awakening", "rebirth", "renewal",
    ],
}

# Astrology–numerology–palm–face keyword bridges
# When an astrology keyword matches a numerology keyword
# for the same domain, Correspondence is confirmed
_PLANET_KEYWORD_MAP: Dict[str, List[str]] = {
    "Venus":   ["love", "beauty", "sensuality", "harmony", "artistry"],
    "Mars":    ["drive", "courage", "initiative", "competition", "passion"],
    "Jupiter": ["expansion", "abundance", "wisdom", "philosophy", "leadership"],
    "Saturn":  ["discipline", "mastery", "endurance", "karma", "structure"],
    "Mercury": ["communication", "intellect", "commerce", "analysis", "wit"],
    "Moon":    ["intuition", "empathy", "cycles", "nurturing", "sensitivity"],
    "Sun":     ["vitality", "identity", "authority", "creativity", "purpose"],
    "Uranus":  ["innovation", "originality", "freedom", "awakening", "disruption"],
    "Neptune": ["spirituality", "psychic", "mysticism", "compassion", "dissolution"],
    "Pluto":   ["transformation", "power", "depth", "shadow", "regeneration"],
}


# ---------------------------------------------------------------------------
# Output models
# ---------------------------------------------------------------------------

@dataclass
class CorrespondenceResult:
    """Result of As Above, So Below detection for a single domain."""
    domain:              str
    found:               bool
    matching_systems:    List[str]
    matching_cluster:    Optional[str]     # Which keyword cluster matched
    shared_keywords:     List[str]
    amplification:       float             # 1.0 = no amplification, 1.15 = strong
    confirmation_text:   str               # Plain language for synthesiser


@dataclass
class PolarityResult:
    """Result of Polarity principle application to a conflict."""
    domain:              str
    pole_a_system:       str
    pole_b_system:       str
    pole_a_reading:      str
    pole_b_reading:      str
    synthesis:           str               # The unified truth between the poles
    resolution_tone:     SignalTone


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def apply_hermetic_principles(
    weighted_map: WeightedSignalMap,
) -> HermeticCorrespondence:
    """
    Apply Hermetic principles to the weighted signal map.

    Primary: Detect Correspondence (As above, so below)
    Secondary: Identify Polarity opportunities for conflict resolution

    Returns:
        HermeticCorrespondence with amplification factor
    """
    correspondence_results = []
    polarity_opportunities = []

    for domain in ALL_DOMAINS:
        signals = weighted_map.signals_for(domain)
        if len(signals) < 2:
            continue

        # Correspondence detection
        corr = _detect_correspondence(domain, signals)
        if corr.found:
            correspondence_results.append(corr)

        # Polarity detection
        pol = _detect_polarity(domain, signals)
        if pol:
            polarity_opportunities.append(pol)

    # Determine overall correspondence strength
    if not correspondence_results:
        return HermeticCorrespondence(
            correspondence_found  = False,
            matching_systems      = [],
            principle_activated   = "none",
            amplification_factor  = 1.0,
            description           = "Each system provides independent insight.",
        )

    # Find the strongest correspondence
    strongest = max(correspondence_results, key=lambda c: len(c.matching_systems))
    systems_in_agreement = list({
        s for c in correspondence_results for s in c.matching_systems
    })

    # Amplification based on number of correspondences found
    total_correspondences = len(correspondence_results)
    if total_correspondences >= 5:
        amplification = 1.18
        principle     = "correspondence_strong"
    elif total_correspondences >= 3:
        amplification = 1.12
        principle     = "correspondence_moderate"
    else:
        amplification = 1.06
        principle     = "correspondence_present"

    description = _correspondence_description(
        correspondence_results, polarity_opportunities
    )

    return HermeticCorrespondence(
        correspondence_found  = True,
        matching_systems      = systems_in_agreement,
        principle_activated   = principle,
        amplification_factor  = amplification,
        description           = description,
    )


# ---------------------------------------------------------------------------
# Correspondence detection
# ---------------------------------------------------------------------------

def _detect_correspondence(
    domain: Domain,
    signals: List[WeightedSignal],
) -> CorrespondenceResult:
    """
    Detect As Above, So Below — the same pattern across multiple systems.

    Method:
    1. Extract keywords from all signals for this domain
    2. Group by system
    3. Find keyword clusters that appear across 2+ systems
    4. If found → Correspondence is active
    """
    # Group keywords by system
    system_keywords: Dict[str, Set[str]] = {}
    system_signals:  Dict[str, List[WeightedSignal]] = {}

    for ws in signals:
        sys_key = _broad_system(ws.raw.system)
        if sys_key not in system_keywords:
            system_keywords[sys_key] = set()
            system_signals[sys_key]  = []
        system_keywords[sys_key].update(
            kw.lower() for kw in ws.raw.keywords
        )
        # Also include astro affinity terms
        for planet in ws.raw.astro_affinity:
            mapped = _PLANET_KEYWORD_MAP.get(planet, [])
            system_keywords[sys_key].update(mapped)
        system_signals[sys_key].append(ws)

    systems = list(system_keywords.keys())
    if len(systems) < 2:
        return CorrespondenceResult(
            domain=domain.value, found=False,
            matching_systems=[], matching_cluster=None,
            shared_keywords=[], amplification=1.0,
            confirmation_text="",
        )

    # Check each correspondence cluster
    best_cluster      = None
    best_shared       = []
    best_systems      = []
    best_cluster_name = None

    for cluster_name, cluster_kws in _CORRESPONDENCE_CLUSTERS.items():
        cluster_set = set(cluster_kws)
        matching_systems = []
        for sys_key, kw_set in system_keywords.items():
            if kw_set & cluster_set:   # intersection
                matching_systems.append(sys_key)

        if len(matching_systems) >= 2:
            shared = list(
                set(kw for sys in matching_systems
                    for kw in system_keywords[sys]) & cluster_set
            )
            if len(shared) > len(best_shared):
                best_shared       = shared
                best_systems      = matching_systems
                best_cluster      = cluster_set
                best_cluster_name = cluster_name

    if not best_systems:
        # Try direct keyword overlap between any two systems
        all_pairs = [
            (s1, s2) for i, s1 in enumerate(systems)
            for s2 in systems[i+1:]
        ]
        for s1, s2 in all_pairs:
            overlap = system_keywords[s1] & system_keywords[s2]
            if len(overlap) >= 2 and len(overlap) > len(best_shared):
                best_shared   = list(overlap)[:5]
                best_systems  = [s1, s2]
                best_cluster_name = "direct_keyword_match"

    if not best_systems or len(best_systems) < 2:
        return CorrespondenceResult(
            domain=domain.value, found=False,
            matching_systems=[], matching_cluster=None,
            shared_keywords=[], amplification=1.0,
            confirmation_text="",
        )

    # Amplification by number of agreeing systems
    n = len(best_systems)
    amplification = 1.05 + (n - 2) * 0.04   # 2=1.05, 3=1.09, 4=1.13

    text = _correspondence_text(domain, best_systems, best_shared)

    return CorrespondenceResult(
        domain           = domain.value,
        found            = True,
        matching_systems = best_systems,
        matching_cluster = best_cluster_name,
        shared_keywords  = best_shared[:6],
        amplification    = round(amplification, 3),
        confirmation_text= text,
    )


def _correspondence_text(
    domain: Domain,
    systems: List[str],
    shared_keywords: List[str],
) -> str:
    """Plain language correspondence confirmation."""
    system_labels = {
        "astrology":   "the stars",
        "numerology":  "the numbers",
        "palmistry":   "the palm",
        "physiognomy": "the face",
    }
    system_names = [system_labels.get(s, s) for s in systems[:4]]

    if len(system_names) >= 3:
        names_str = ", ".join(system_names[:-1]) + f", and {system_names[-1]}"
    else:
        names_str = " and ".join(system_names)

    theme = shared_keywords[0].replace("_", " ") if shared_keywords else "this pattern"

    return (
        f"Both {names_str} reflect the same pattern of {theme} "
        f"in the {domain.value} domain — independent systems confirming the same truth."
    )


# ---------------------------------------------------------------------------
# Polarity detection
# ---------------------------------------------------------------------------

def _detect_polarity(
    domain: Domain,
    signals: List[WeightedSignal],
) -> Optional[PolarityResult]:
    """
    Detect Polarity — when two systems see opposite ends of the same truth.
    Returns a PolarityResult if a meaningful polarity is found.
    """
    positive_signals   = [ws for ws in signals
                          if ws.raw.tone in
                          {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}]
    challenging_signals = [ws for ws in signals
                           if ws.raw.tone in
                           {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}]

    if not positive_signals or not challenging_signals:
        return None

    # Get highest-weighted signal from each pole
    top_pos  = max(positive_signals,   key=lambda ws: ws.final_weight)
    top_neg  = max(challenging_signals, key=lambda ws: ws.final_weight)

    # Only report if both are from different systems
    if _broad_system(top_pos.raw.system) == _broad_system(top_neg.raw.system):
        return None

    synthesis = _polarity_synthesis(
        domain, top_pos.raw.reading, top_neg.raw.reading
    )

    return PolarityResult(
        domain          = domain.value,
        pole_a_system   = _broad_system(top_pos.raw.system),
        pole_b_system   = _broad_system(top_neg.raw.system),
        pole_a_reading  = top_pos.raw.reading[:200],
        pole_b_reading  = top_neg.raw.reading[:200],
        synthesis       = synthesis,
        resolution_tone = SignalTone.NEUTRAL,
    )


def _polarity_synthesis(domain: Domain, pos_reading: str, neg_reading: str) -> str:
    """Generate polarity synthesis — the truth between two poles."""
    syntheses = {
        Domain.LOVE: (
            "The depth of feeling and the vulnerability it requires "
            "are two aspects of the same capacity for love. "
            "The strength of your heart is also the source of its sensitivity."
        ),
        Domain.CAREER: (
            "The drive for achievement and the weight of responsibility "
            "are inseparable in a meaningful career. "
            "What challenges you is also what makes your contribution significant."
        ),
        Domain.HEALTH: (
            "Vitality and sensitivity are often found together — "
            "the same constitution that feels deeply also recovers deeply."
        ),
        Domain.WEALTH: (
            "The capacity to generate abundance and the wisdom to manage it "
            "are both required. One without the other is incomplete."
        ),
        Domain.SPIRITUAL: (
            "The light and the shadow are both part of the path. "
            "Spiritual growth requires encounter with both poles."
        ),
        Domain.CHARACTER: (
            "Your greatest strength, taken to its extreme, becomes your challenge. "
            "Both what you excel at and what you struggle with point to the same core quality."
        ),
        Domain.FINANCE: (
            "The ability to attract resources and the discipline to retain them "
            "are complementary capacities — both are needed."
        ),
        Domain.TIMING: (
            "Expansion and consolidation alternate in natural rhythm. "
            "The current tension between these forces is itself part of the cycle."
        ),
    }
    return syntheses.get(domain, "Both signals are true — they describe different facets of the same reality.")


# ---------------------------------------------------------------------------
# Overall description
# ---------------------------------------------------------------------------

def _correspondence_description(
    results:    List[CorrespondenceResult],
    polarities: List[PolarityResult],
) -> str:
    """Generate overall Hermetic description for the synthesis."""
    n_correspondences = len(results)
    n_polarities      = len(polarities)

    if n_correspondences >= 5:
        desc = (
            "Remarkable cross-system agreement detected across multiple domains. "
            "The same patterns are reflected independently by astrology, numerology, "
            "physiognomy, and palmistry — confirming these as central truths "
            "of this person's soul blueprint rather than coincidences."
        )
    elif n_correspondences >= 3:
        desc = (
            "Strong cross-system agreement in several domains. "
            "Multiple independent systems confirm the same patterns — "
            "these readings carry high confidence."
        )
    else:
        desc = (
            "Cross-system confirmation present in key domains. "
            "Where multiple systems agree, those signals carry elevated confidence."
        )

    if n_polarities > 0:
        desc += (
            f" {n_polarities} domain(s) show creative tension between different "
            "system perspectives — these represent complexity rather than contradiction."
        )

    return desc


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _broad_system(system: str) -> str:
    """Map detailed system string to broad category."""
    s = system.lower()
    if "astrology" in s:
        return "astrology"
    if "numerology" in s:
        return "numerology"
    if "palm" in s or "cross_hand" in s:
        return "palmistry"
    if "physiognomy" in s or "face" in s:
        return "physiognomy"
    return s


def get_polarity_resolutions(
    weighted_map: WeightedSignalMap,
) -> Dict[str, PolarityResult]:
    """
    Get all polarity resolutions keyed by domain.
    Used by resolver.py when Hermetic polarity resolution is appropriate.
    """
    results = {}
    for domain in ALL_DOMAINS:
        signals = weighted_map.signals_for(domain)
        if len(signals) >= 2:
            pol = _detect_polarity(domain, signals)
            if pol:
                results[domain.value] = pol
    return results
