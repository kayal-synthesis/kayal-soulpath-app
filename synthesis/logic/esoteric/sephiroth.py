"""
Esoteric — Sephiroth
======================
Maps domain signals to the Tree of Life (Etz Chaim) sephiroth.
Determines which sephiroth are most activated by the combined readings.

The ten sephiroth are the ten divine emanations that structure all of creation.
In KAYAL, they serve as the deepest layer of domain synthesis —
identifying the soul's primary centre of gravity on the Tree.

Sephiroth and their domain mappings:
    Kether    (1 — Crown)        Spiritual — highest aspiration
    Chokmah   (2 — Wisdom)       Spiritual + Character — intuitive flash
    Binah     (3 — Understanding) Character + Health — structure, form
    Chesed    (4 — Mercy)        Love + Wealth — expansion, generosity
    Geburah   (5 — Strength)     Career — discipline, will, force
    Tiferet   (6 — Beauty)       Character synthesis — the Self, the heart
    Netzach   (7 — Victory)      Love + Finance — desire, art, Venus
    Hod       (8 — Splendour)    Career + Finance — Mercury, communication
    Yesod     (9 — Foundation)   Timing — Moon, subconsciousness, cycles
    Malkuth   (10 — Kingdom)     Health + Wealth — Earth, manifestation

The three pillars:
    Right (Mercy):   Chokmah → Chesed → Netzach     (expansion, positive)
    Left (Severity): Binah → Geburah → Hod          (structure, challenge)
    Middle (Balance):Kether → Tiferet → Yesod → Malkuth (integration)

The user never sees sephiroth names.
They receive the insight that flows from this mapping.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from ..models import (
    SephirahActivation,
    KabbalahPillar,
    SignalTone,
    Domain,
)
from ..weigher import WeightedSignalMap


# ---------------------------------------------------------------------------
# Sephiroth definitions
# ---------------------------------------------------------------------------

_SEPHIROTH = {
    "kether":   {"number": 1,  "name": "Crown",         "pillar": "middle",   "domains": ["spiritual"]},
    "chokmah":  {"number": 2,  "name": "Wisdom",         "pillar": "mercy",    "domains": ["spiritual", "character"]},
    "binah":    {"number": 3,  "name": "Understanding",  "pillar": "severity", "domains": ["character", "health"]},
    "chesed":   {"number": 4,  "name": "Mercy",          "pillar": "mercy",    "domains": ["love", "wealth"]},
    "geburah":  {"number": 5,  "name": "Strength",       "pillar": "severity", "domains": ["career"]},
    "tiferet":  {"number": 6,  "name": "Beauty",         "pillar": "middle",   "domains": ["character"]},
    "netzach":  {"number": 7,  "name": "Victory",        "pillar": "mercy",    "domains": ["love", "finance"]},
    "hod":      {"number": 8,  "name": "Splendour",      "pillar": "severity", "domains": ["career", "finance"]},
    "yesod":    {"number": 9,  "name": "Foundation",     "pillar": "middle",   "domains": ["timing"]},
    "malkuth":  {"number": 10, "name": "Kingdom",        "pillar": "middle",   "domains": ["health", "wealth"]},
}

# Sephiroth to journey language (never exposed as sephirah names)
_SEPHIROTH_JOURNEY_LANGUAGE = {
    "kether":   "reaching toward your highest purpose",
    "chokmah":  "accessing intuitive wisdom beyond ordinary knowing",
    "binah":    "building understanding through patient experience",
    "chesed":   "opening to love and abundance",
    "geburah":  "developing strength and purposeful will",
    "tiferet":  "integrating all aspects of yourself into wholeness",
    "netzach":  "following the deeper desire of the heart",
    "hod":      "mastering the power of intelligent communication",
    "yesod":    "aligning with natural cycles and deeper patterns",
    "malkuth":  "grounding your gifts into physical reality",
}


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def activate_sephiroth(weighted_map: WeightedSignalMap) -> SephirahActivation:
    """
    Determine which sephiroth are most activated by the combined readings.

    Activation is determined by:
    1. Signal weight and tone for each domain
    2. Mapping domains to their corresponding sephiroth
    3. Identifying the most strongly activated sephirah

    Returns:
        SephirahActivation with pillar balance and integration note
    """
    # Score each sephirah based on its domain signals
    sephirah_scores: Dict[str, float] = {s: 0.0 for s in _SEPHIROTH}

    positive_tones  = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenge_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    mercy_total    = 0.0
    severity_total = 0.0
    middle_total   = 0.0
    count          = 0

    for seph_name, seph_data in _SEPHIROTH.items():
        seph_domains = seph_data["domains"]
        pillar       = seph_data["pillar"]
        score        = 0.0

        for domain_str in seph_domains:
            try:
                domain = Domain(domain_str)
            except ValueError:
                continue

            signals = weighted_map.signals_for(domain)
            if not signals:
                continue

            # Score = weighted average tone for this domain
            domain_score = 0.0
            total_weight = 0.0
            for ws in signals[:6]:   # Top 6 signals per domain
                if ws.raw.tone in positive_tones:
                    tone_score = ws.final_weight * 1.0
                elif ws.raw.tone in challenge_tones:
                    tone_score = ws.final_weight * 0.4
                else:
                    tone_score = ws.final_weight * 0.7
                domain_score += tone_score
                total_weight += ws.final_weight

            if total_weight > 0:
                score += domain_score / total_weight

        # Average across domains this sephirah covers
        if seph_domains:
            score = score / len(seph_domains)

        sephirah_scores[seph_name] = round(score, 4)

        # Accumulate pillar totals
        if pillar == "mercy":
            mercy_total += score
        elif pillar == "severity":
            severity_total += score
        else:
            middle_total += score
        count += 1

    # Activated sephiroth (above threshold)
    threshold = 0.35
    activated = [
        s for s, score in sorted(
            sephirah_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        if score >= threshold
    ]

    if not activated:
        activated = [max(sephirah_scores, key=sephirah_scores.get)]

    primary = activated[0] if activated else "tiferet"

    # Pillar balance
    mercy_avg    = mercy_total / 3 if mercy_total > 0 else 0
    severity_avg = severity_total / 3 if severity_total > 0 else 0
    middle_avg   = middle_total / 4 if middle_total > 0 else 0

    if mercy_avg > severity_avg + 0.15:
        pillar_balance = KabbalahPillar.MERCY
    elif severity_avg > mercy_avg + 0.15:
        pillar_balance = KabbalahPillar.SEVERITY
    else:
        pillar_balance = KabbalahPillar.MIDDLE

    # Scores for resolver
    total = mercy_avg + severity_avg + middle_avg
    mercy_score    = round(mercy_avg    / total, 3) if total > 0 else 0.33
    severity_score = round(severity_avg / total, 3) if total > 0 else 0.33

    # Integration note — plain language, no sephirah names
    integration_note = _integration_note(primary, pillar_balance, activated)

    return SephirahActivation(
        activated        = activated[:5],
        primary          = primary,
        pillar_balance   = pillar_balance,
        mercy_score      = mercy_score,
        severity_score   = severity_score,
        integration_note = integration_note,
    )


def _integration_note(
    primary: str,
    pillar: KabbalahPillar,
    activated: List[str],
) -> str:
    """Generate plain-language integration note without sephirah names."""
    journey = _SEPHIROTH_JOURNEY_LANGUAGE.get(primary, "moving toward wholeness")

    if pillar == KabbalahPillar.MERCY:
        balance_note = (
            "The readings lean predominantly toward positive and expansive energy. "
            "The growth edge is to integrate structure and discernment."
        )
    elif pillar == KabbalahPillar.SEVERITY:
        balance_note = (
            "The readings show significant challenge and growth pressure. "
            "The path forward involves opening to grace and expansion."
        )
    else:
        balance_note = (
            "The readings show a well-balanced integration of both "
            "positive expression and growth challenges."
        )

    return f"The primary life theme is {journey}. {balance_note}"


def sephirah_domain_amplifier(
    sephirah: SephirahActivation,
    domain: str,
) -> float:
    """
    Return an amplification factor for a domain based on
    which sephiroth are activated.
    Used by synthesiser to amplify confirmed signals.
    """
    # Check if any activated sephiroth govern this domain
    governing = [
        s for s in sephirah.activated
        if domain in _SEPHIROTH.get(s, {}).get("domains", [])
    ]
    if not governing:
        return 1.0

    # Primary sephirah governing this domain = +10% amplification
    primary_governs = any(
        domain in _SEPHIROTH.get(sephirah.primary, {}).get("domains", [])
    for _ in [None])

    if primary_governs:
        return 1.12
    elif len(governing) >= 2:
        return 1.08
    else:
        return 1.04
