"""
Logic Engine — Weigher
=======================
Assigns final confidence weights to all signals in the SignalMap.

The weigher applies four layers of weighting to every signal:

    Layer 1 — System weight
        Which system produced this signal, and how authoritative
        is that system for this cultural origin and this domain.

    Layer 2 — Feature confidence
        How reliably was this feature detected (from engine confidence).

    Layer 3 — Domain authority
        Some systems are more authoritative than others for specific
        domains. Astrology owns timing. Palmistry owns vitality.
        Face owns character. These are encoded as domain authority scores.

    Layer 4 — Tier modifier
        Higher tiers have more cross-system confirmation available,
        so individual signal weights are modulated upward.

v2.0.0 additions:
    - _DOMAIN_AUTHORITY extended: new systems in all existing domains
        spirit_world (0.60–1.00), health_engine (0.60–0.95),
        synastry (0.60–0.95), remedies (0.55–0.70)
    - _DOMAIN_AUTHORITY extended: 7 new domain entries
        spirit_world, sexuality, children_forecast, death_transition,
        parents, legacy, identity — full 12-system authority maps
    - _COMPATIBILITY_DOMAIN_WEIGHTS: per-domain weights for % scoring
    - compute_compatibility_percentage(): converts WeightedSignalMap
        domain scores to 0–100% for Union Blueprint report output
    - _normalise_system_key() updated for new system prefixes
    - weigh_signals() graceful fallback for new domain keys
    - detect_convergence() graceful fallback for new domain keys

Output:
    WeightedSignalMap — same structure as SignalMap but every signal
    has a final_weight applied and signals are sorted by weight descending.

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .models import (
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
# Domain authority scores per system (v2.0.0 — fully expanded)
#
# How much authority does each system have for each domain?
# 1.0 = primary authority, 0.5 = secondary, 0.3 = minor contribution
#
# Authority logic:
#   spirit_world — highest for spirit/ancestral domains; 0.60 floor elsewhere
#   health_engine — highest for health; reduced in non-health domains
#   synastry — high for all relationship domains; floor 0.65 elsewhere
#   remedies — consistently lower (0.55–0.70); prescriptive not diagnostic
# ---------------------------------------------------------------------------

_DOMAIN_AUTHORITY: Dict[str, Dict[str, float]] = {

    # ── LOVE ────────────────────────────────────────────────────────────────
    "love": {
        "palmistry":              0.90,   # Heart line, Venus mount, marriage lines
        "astrology_western":      0.95,   # Venus, 7th house — primary love authority
        "astrology_vedic":        0.90,   # Venus, 7th house Jyotish
        "astrology_chinese":      0.75,   # Ba Zi spouse star
        "physiognomy":            0.80,   # Eyes, lips, face shape
        "numerology_pythagorean": 0.75,
        "numerology_chaldean":    0.75,
        "numerology_vedic":       0.70,
        # v2.0.0
        "spirit_world":           0.72,   # Past-life love agreements, vow residue
        "health_engine":          0.60,   # Indirect — physical vitality affects love
        "synastry":               0.95,   # Cross-chart love — primary in Union Blueprint
        "remedies":               0.60,   # Love remedies: supportive layer
    },

    # ── HEALTH ──────────────────────────────────────────────────────────────
    "health": {
        "palmistry":              0.95,   # Life line — primary health authority
        "astrology_western":      0.85,   # 6th house, medical astrology
        "astrology_vedic":        0.90,   # 6th house Jyotish, Ayurveda
        "astrology_chinese":      0.80,   # Ba Zi health pillar
        "physiognomy":            0.88,   # Skin, aging markers, face colour
        "numerology_pythagorean": 0.60,
        "numerology_chaldean":    0.60,
        "numerology_vedic":       0.65,
        # v2.0.0
        "spirit_world":           0.65,   # Ancestral health burdens
        "health_engine":          0.95,   # Primary health engine — highest authority
        "synastry":               0.80,   # Health cross-impact in Union Blueprint
        "remedies":               0.65,   # Health remedy prescriptions
    },

    # ── WEALTH ──────────────────────────────────────────────────────────────
    "wealth": {
        "palmistry":              0.88,   # Fate line, sun line, mounts
        "astrology_western":      0.85,   # 2nd/8th house, Jupiter
        "astrology_vedic":        0.88,   # Dhana yoga — Vedic wealth combinations
        "astrology_chinese":      0.90,   # Ba Zi wealth element — primary
        "physiognomy":            0.92,   # Nose (Mian Xiang wealth palace) — primary
        "numerology_pythagorean": 0.80,
        "numerology_chaldean":    0.82,
        "numerology_vedic":       0.78,
        # v2.0.0
        "spirit_world":           0.68,   # Ancestral wealth blessings/restrictions
        "health_engine":          0.60,   # Indirect: vitality → earning capacity
        "synastry":               0.82,   # Wealth synergy between partners
        "remedies":               0.62,   # Wealth remedies
    },

    # ── CAREER ──────────────────────────────────────────────────────────────
    "career": {
        "palmistry":              0.90,   # Fate line, head line, mounts
        "astrology_western":      0.92,   # 10th house, Saturn, MC — primary
        "astrology_vedic":        0.90,   # 10th house, karma in Jyotish
        "astrology_chinese":      0.85,   # Ba Zi output element
        "physiognomy":            0.85,   # Cheekbones, face shape, jaw
        "numerology_pythagorean": 0.88,   # Life Path primary career signal
        "numerology_chaldean":    0.85,
        "numerology_vedic":       0.82,
        # v2.0.0
        "spirit_world":           0.65,   # Spiritual contracts as career dharma
        "health_engine":          0.62,   # Physical capacity affects career
        "synastry":               0.85,   # Career synergy between partners
        "remedies":               0.62,   # Career-aligned remedies
    },

    # ── SPIRITUAL ───────────────────────────────────────────────────────────
    "spiritual": {
        "palmistry":              0.85,   # Moon mount, intuition line
        "astrology_western":      0.88,   # Neptune, 12th house, Pisces
        "astrology_vedic":        0.92,   # 12th house moksha — primary in Vedic
        "astrology_chinese":      0.70,   # Less explicit in Ba Zi
        "physiognomy":            0.80,   # Forehead (third eye), eyes
        "numerology_pythagorean": 0.90,   # 7, 11, 22 — spiritual numbers
        "numerology_chaldean":    0.88,
        "numerology_vedic":       0.92,   # Primary spiritual authority in Vedic num
        # v2.0.0
        "spirit_world":           0.96,   # Psychic openness, contracts, blessings
        "health_engine":          0.60,   # Indirect: body as spiritual vessel
        "synastry":               0.82,   # Spiritual compatibility between partners
        "remedies":               0.72,   # Spiritual remedy prescriptions
    },

    # ── FINANCE ─────────────────────────────────────────────────────────────
    "finance": {
        "palmistry":              0.85,   # Mercury line, fate line
        "astrology_western":      0.88,   # 2nd/8th house specifics
        "astrology_vedic":        0.85,   # Dhana yogas
        "astrology_chinese":      0.92,   # Ba Zi wealth element — primary
        "physiognomy":            0.90,   # Nose alar flare (Mian Xiang)
        "numerology_pythagorean": 0.82,
        "numerology_chaldean":    0.85,   # Chaldean finance signal strong
        "numerology_vedic":       0.78,
        # v2.0.0
        "spirit_world":           0.65,   # Ancestral financial patterns
        "health_engine":          0.58,
        "synastry":               0.80,   # Financial compatibility between partners
        "remedies":               0.62,
    },

    # ── CHARACTER ───────────────────────────────────────────────────────────
    "character": {
        "palmistry":              0.88,   # Hand shape, fingers — core character
        "astrology_western":      0.90,   # Sun/Moon/Rising — primary character
        "astrology_vedic":        0.88,   # Lagna, Moon nakshatra
        "astrology_chinese":      0.85,   # Day master
        "physiognomy":            0.92,   # Face shape, features — primary character
        "numerology_pythagorean": 0.88,   # Expression, soul urge
        "numerology_chaldean":    0.85,
        "numerology_vedic":       0.82,
        # v2.0.0
        "spirit_world":           0.80,   # Past-life character imprints
        "health_engine":          0.65,   # Mental health as character expression
        "synastry":               0.85,   # Character compatibility
        "remedies":               0.62,
    },

    # ── TIMING ──────────────────────────────────────────────────────────────
    "timing": {
        "palmistry":              0.75,   # Line timing is approximate
        "astrology_western":      0.92,   # Transits — primary timing authority
        "astrology_vedic":        0.95,   # Dasha system — highest timing precision
        "astrology_chinese":      0.90,   # Luck pillars, annual Tai Sui
        "physiognomy":            0.88,   # Mian Xiang life periods — strong timing
        "numerology_pythagorean": 0.88,   # Personal year cycles
        "numerology_chaldean":    0.85,
        "numerology_vedic":       0.85,
        # v2.0.0
        "spirit_world":           0.68,   # Karmic timing, Dasha spiritual periods
        "health_engine":          0.60,
        "synastry":               0.72,   # Synastry timing overlaps
        "remedies":               0.58,
    },

    # ── v2.0.0 NEW DOMAINS ──────────────────────────────────────────────────

    # ── SPIRIT_WORLD ────────────────────────────────────────────────────────
    "spirit_world": {
        "palmistry":              0.80,   # Moon mount, spiritual line markers
        "astrology_western":      0.85,   # 12th house, Neptune, Pluto, Rahu/Ketu
        "astrology_vedic":        0.92,   # Moksha trikona, Ketu past-life — Vedic primary
        "astrology_chinese":      0.68,   # Less explicit in Ba Zi tradition
        "physiognomy":            0.75,   # Forehead (third-eye zone), deep-set eyes
        "numerology_pythagorean": 0.85,   # Karmic debt 13/14/16/19, LP 7/11/22/33
        "numerology_chaldean":    0.82,
        "numerology_vedic":       0.90,   # Vedic numerology spirit tradition — primary
        "spirit_world":           1.00,   # Spirit engine is the primary authority
        "health_engine":          0.60,   # Minimal — health as spiritual vessel
        "synastry":               0.70,   # Karmic cross-chart spirit connections
        "remedies":               0.72,   # Spirit world remedies
    },

    # ── SEXUALITY ───────────────────────────────────────────────────────────
    "sexuality": {
        "palmistry":              0.85,   # Venus mount, girdle of Venus, marriage lines
        "astrology_western":      0.90,   # Venus, Mars, 5th/8th house, Scorpio
        "astrology_vedic":        0.88,   # Kama trikona (1/5/9), 7th/8th house
        "astrology_chinese":      0.75,   # Ba Zi — subtle indicators
        "physiognomy":            0.82,   # Lips, philtrum, nose bridge (Mian Xiang)
        "numerology_pythagorean": 0.70,
        "numerology_chaldean":    0.72,
        "numerology_vedic":       0.68,
        "spirit_world":           0.65,   # Past-life sexuality/celibacy vow residue
        "health_engine":          0.72,   # Physical sexuality through health profile
        "synastry":               0.96,   # Cross-chart desire — primary in Union Blueprint
        "remedies":               0.60,
    },

    # ── CHILDREN_FORECAST ───────────────────────────────────────────────────
    "children_forecast": {
        "palmistry":              0.92,   # Children lines — primary in individual chart
        "astrology_western":      0.85,   # 5th house, Moon, Jupiter
        "astrology_vedic":        0.93,   # Putra bhava (5th house) — Vedic primary
        "astrology_chinese":      0.88,   # Children pillar in Ba Zi — primary in Chinese
        "physiognomy":            0.75,   # Subtle facial indicators (Mian Xiang)
        "numerology_pythagorean": 0.78,   # Life Path children tendency
        "numerology_chaldean":    0.75,
        "numerology_vedic":       0.80,
        "spirit_world":           0.72,   # Karmic children soul agreements
        "health_engine":          0.78,   # Fertility-adjacent health indicators
        "synastry":               0.94,   # Cross-chart children potential — primary for couples
        "remedies":               0.62,
    },

    # ── DEATH_TRANSITION ────────────────────────────────────────────────────
    "death_transition": {
        "palmistry":              0.90,   # Life line terminus, Saturn mount
        "astrology_western":      0.88,   # 8th house, Pluto, Saturn
        "astrology_vedic":        0.94,   # Ayush bhava (8th), Maraka lords — Vedic primary
        "astrology_chinese":      0.88,   # Ba Zi death-emptiness timing
        "physiognomy":            0.82,   # Longevity markers in Mian Xiang
        "numerology_pythagorean": 0.75,
        "numerology_chaldean":    0.78,
        "numerology_vedic":       0.80,
        "spirit_world":           0.88,   # Ancestral death patterns; spirit world transition
        "health_engine":          0.88,   # Longevity score — strong health contribution
        "synastry":               0.85,   # Death order between partners
        "remedies":               0.58,
    },

    # ── PARENTS ─────────────────────────────────────────────────────────────
    "parents": {
        "palmistry":              0.80,   # Life line branches, inheritance markers
        "astrology_western":      0.85,   # 4th house (mother), 10th house (father)
        "astrology_vedic":        0.90,   # Matru bhava (4th), Pitru bhava (9th) — Vedic primary
        "astrology_chinese":      0.85,   # Parents pillar in Ba Zi four pillars
        "physiognomy":            0.88,   # Forehead (father), chin (mother) — Mian Xiang
        "numerology_pythagorean": 0.75,
        "numerology_chaldean":    0.72,
        "numerology_vedic":       0.78,
        "spirit_world":           0.92,   # Ancestral/parental connection — primary
        "health_engine":          0.65,   # Inherited health patterns from parents
        "synastry":               0.80,   # Parental template activation in relationship
        "remedies":               0.68,   # Ancestral remedies
    },

    # ── LEGACY ──────────────────────────────────────────────────────────────
    "legacy": {
        "palmistry":              0.85,   # Fate line, sun line longevity
        "astrology_western":      0.88,   # 10th house, Saturn, Pluto
        "astrology_vedic":        0.85,   # 10th house, dharma in Jyotish
        "astrology_chinese":      0.82,   # Ba Zi output element, month pillar
        "physiognomy":            0.80,   # Brow bones, chin, jaw — authority legacy
        "numerology_pythagorean": 0.88,   # Life mission number, LP — primary
        "numerology_chaldean":    0.82,
        "numerology_vedic":       0.80,
        "spirit_world":           0.85,   # Spiritual contracts as legacy commitments
        "health_engine":          0.65,   # Longevity affects legacy span
        "synastry":               0.85,   # Union legacy — what couple builds together
        "remedies":               0.68,
    },

    # ── IDENTITY ────────────────────────────────────────────────────────────
    "identity": {
        "palmistry":              0.90,   # Hand shape, thumb, index finger
        "astrology_western":      0.94,   # Sun, Ascendant — primary identity authority
        "astrology_vedic":        0.92,   # Lagna, Atmakaraka — Vedic primary
        "astrology_chinese":      0.88,   # Day master — core identity in Ba Zi
        "physiognomy":            0.90,   # Face shape, overall facial identity
        "numerology_pythagorean": 0.88,   # Life Path + Expression = identity core
        "numerology_chaldean":    0.85,
        "numerology_vedic":       0.85,
        "spirit_world":           0.85,   # Past-life identity patterns (Ketu)
        "health_engine":          0.68,   # Mental health as identity expression
        "synastry":               0.80,   # How union shapes individual identity
        "remedies":               0.62,
    },
}


# ---------------------------------------------------------------------------
# Compatibility domain weights for % scoring (v2.0.0)
#
# Used by compute_compatibility_percentage() to produce domain-level %
# scores for the Union Blueprint report.
# Weights must sum to 1.0 across the domains relevant to compatibility.
#
# Individual Blueprint:  uses INDIVIDUAL_DOMAIN_WEIGHTS
# Union Blueprint:       uses COMPATIBILITY_DOMAIN_WEIGHTS
# ---------------------------------------------------------------------------

COMPATIBILITY_DOMAIN_WEIGHTS: Dict[str, float] = {
    "love":              0.22,
    "sexuality":         0.08,
    "children_forecast": 0.08,
    "career":            0.10,
    "wealth":            0.08,
    "finance":           0.05,
    "health":            0.08,
    "spiritual":         0.10,
    "character":         0.12,
    "spirit_world":      0.04,
    "identity":          0.03,
    "legacy":            0.02,
    # Not in compatibility score: timing, parents, death_transition
    # (these are presented as standalone % assessments, not blended)
}

assert abs(sum(COMPATIBILITY_DOMAIN_WEIGHTS.values()) - 1.0) < 1e-9,     "COMPATIBILITY_DOMAIN_WEIGHTS must sum to 1.0"

INDIVIDUAL_DOMAIN_WEIGHTS: Dict[str, float] = {
    "character":   0.20,
    "career":      0.18,
    "wealth":      0.15,
    "health":      0.15,
    "love":        0.12,
    "spiritual":   0.10,
    "finance":     0.05,
    "timing":      0.05,
    # Extended domains carry supplementary weight when present
    "identity":    0.00,
    "legacy":      0.00,
    "parents":     0.00,
    "spirit_world":0.00,
}


# ---------------------------------------------------------------------------
# Cultural origin modifiers (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

_CULTURAL_BOOSTS: Dict[str, Dict[str, float]] = {
    "south_asian": {
        "astrology_vedic":  1.10,
        "numerology_vedic": 1.10,
    },
    "east_asian": {
        "astrology_chinese": 1.12,
        "physiognomy":       1.08,
    },
    "southeast_asian": {
        "astrology_chinese": 1.08,
        "physiognomy":       1.06,
        "astrology_vedic":   1.05,
    },
    "middle_eastern": {
        "numerology_chaldean": 1.10,
        "astrology_western":   1.05,
    },
    "western": {
        "astrology_western":      1.05,
        "numerology_pythagorean": 1.05,
    },
}


# ---------------------------------------------------------------------------
# Tone weight modifiers (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

_TONE_WEIGHT_MODIFIER: Dict[SignalTone, float] = {
    SignalTone.STRONGLY_POSITIVE:    1.10,
    SignalTone.POSITIVE:             1.00,
    SignalTone.NEUTRAL:              0.85,
    SignalTone.CHALLENGING:          1.00,
    SignalTone.STRONGLY_CHALLENGING: 1.05,
}


# ---------------------------------------------------------------------------
# Output models (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

@dataclass
class WeightedSignal:
    """RawSignal with final computed weight."""
    raw:           RawSignal
    final_weight:  float      # Fully computed weight 0.0–1.0
    authority:     float      # Domain authority for this system
    cultural_boost: float     # Cultural origin boost applied


@dataclass
class WeightedSignalMap:
    """
    SignalMap with all signals weighted and sorted.
    Consumed by resolver.py and synthesiser.py.
    """
    session_id:        str
    tier:              ReadingTier
    cultural_profile:  CulturalProfile
    domains:           Dict[str, List[WeightedSignal]]
    available_systems: List[str]
    total_signals:     int

    def signals_for(self, domain: Domain) -> List[WeightedSignal]:
        return self.domains.get(domain.value, [])

    def top_signals(self, domain: Domain, n: int = 5) -> List[WeightedSignal]:
        return sorted(
            self.signals_for(domain),
            key=lambda s: s.final_weight,
            reverse=True,
        )[:n]

    def systems_active_for(self, domain: Domain) -> List[str]:
        return list({s.raw.system for s in self.signals_for(domain)})


# ---------------------------------------------------------------------------
# Main weigher (v2.0.0 — graceful new-domain fallback added)
# ---------------------------------------------------------------------------

def weigh_signals(
    signal_map:       SignalMap,
    cultural_profile: CulturalProfile,
    astro_weighting:  AstrologyWeighting,
) -> WeightedSignalMap:
    """
    Apply all weighting layers to every signal in the SignalMap.

    Args:
        signal_map:       From collector.collect_signals()
        cultural_profile: From astrology_selector.select_systems()
        astro_weighting:  From astrology_selector.select_systems()

    Returns:
        WeightedSignalMap with final weights applied.

    v2.0.0 change: weighted_domains initialised from signal_map.domains
    keys rather than ALL_DOMAINS only — this ensures new v3.0.0 domain keys
    (spirit_world, sexuality, children_forecast, death_transition, parents,
    legacy, identity) that are already in signal_map.domains are preserved
    in the output even if ALL_DOMAINS enum has not been updated.
    """
    origin_key = cultural_profile.origin.value
    cultural_boosts = _CULTURAL_BOOSTS.get(origin_key, {})

    # v2.0.0: seed from both ALL_DOMAINS and actual signal_map keys
    weighted_domains: Dict[str, List[WeightedSignal]] = {
        d.value: [] for d in ALL_DOMAINS
    }
    # Ensure any new domain keys from v3.0.0 models are also represented
    for domain_key in signal_map.domains:
        if domain_key not in weighted_domains:
            weighted_domains[domain_key] = []

    for domain_key, raw_signals in signal_map.domains.items():
        domain_authority_map = _DOMAIN_AUTHORITY.get(domain_key, {})

        for raw in raw_signals:
            system_key = _normalise_system_key(raw.system)

            # Layer 1 — Domain authority
            authority = domain_authority_map.get(system_key, 0.65)

            # Layer 2 — Cultural boost
            boost = cultural_boosts.get(system_key, 1.0)

            # Layer 3 — Tone modifier
            tone_mod = _TONE_WEIGHT_MODIFIER.get(raw.tone, 1.0)

            # Layer 4 — Signal strength (tier modifier already baked in by collector)
            # Final weight computation
            final_weight = round(
                min(1.0, raw.weight * authority * boost * tone_mod),
                4,
            )

            weighted_domains[domain_key].append(WeightedSignal(
                raw           = raw,
                final_weight  = final_weight,
                authority     = authority,
                cultural_boost= boost,
            ))

        # Sort by final_weight descending within each domain
        weighted_domains[domain_key].sort(
            key=lambda s: s.final_weight,
            reverse=True,
        )

    weighted_map = WeightedSignalMap(
        session_id        = signal_map.session_id,
        tier              = signal_map.tier,
        cultural_profile  = cultural_profile,
        domains           = weighted_domains,
        available_systems = signal_map.available_systems,
        total_signals     = signal_map.total_signals,
    )

    domain_counts = {
        d: len(weighted_domains.get(d, []))
        for d in weighted_domains
    }
    logger.info(
        "Weigher.weigh_signals completed",
        extra={
            "session_id":    signal_map.session_id,
            "domain_counts": domain_counts,
            "systems":       signal_map.available_systems,
        },
    )

    return weighted_map


# ---------------------------------------------------------------------------
# v2.0.0 — Compatibility percentage calculator
#
# Converts domain-level WeightedSignal data to 0–100% per domain,
# then computes a weighted overall % for the Union Blueprint report.
#
# The % compatibility directive:
#   All relationship compatibility output MUST be expressed as a percentage.
#   Never: "This couple is compatible" or "Children are indicated."
#   Always: "72% overall compatibility" / "Children potential: 68%"
# ---------------------------------------------------------------------------

def compute_compatibility_percentage(
    weighted_map: WeightedSignalMap,
    domain_weights: Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """
    Compute 0–100% compatibility scores per domain and overall.

    Uses the positive-signal weighted average within each domain:
        domain_score = Σ(positive_weight) / Σ(total_weight) × 100

    This means:
    - A domain with all positive/strongly-positive signals → ≈ 100%
    - A domain with all challenging signals → ≈ 0%
    - A balanced domain → ≈ 50%

    Args:
        weighted_map:   From weigh_signals()
        domain_weights: Override COMPATIBILITY_DOMAIN_WEIGHTS if provided
                        (e.g. use INDIVIDUAL_DOMAIN_WEIGHTS for solo reading)

    Returns:
        Dict with domain keys → float percentage (0.0–100.0),
        plus "overall" key for the weighted blended score.

    Example output:
        {
            "love":              82.4,
            "sexuality":         74.1,
            "children_forecast": 68.3,
            "career":            65.0,
            "wealth":            71.5,
            "health":            60.2,
            "spiritual":         88.7,
            "character":         76.3,
            "overall":           75.8,
        }
    """
    weights = domain_weights or COMPATIBILITY_DOMAIN_WEIGHTS
    positive_tones = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    neg_tones      = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    result: Dict[str, float] = {}

    for domain_key, weight_in_blend in weights.items():
        if weight_in_blend == 0.0:
            continue

        signals = weighted_map.domains.get(domain_key, [])
        if not signals:
            # No signals for this domain — assign neutral 50%
            result[domain_key] = 50.0
            continue

        total_weight  = sum(ws.final_weight for ws in signals)
        if total_weight == 0.0:
            result[domain_key] = 50.0
            continue

        # Signed score: positive signals contribute +, challenging -
        signed_score = 0.0
        for ws in signals:
            if ws.raw.tone in positive_tones:
                signed_score += ws.final_weight
            elif ws.raw.tone in neg_tones:
                signed_score -= ws.final_weight * 0.80  # challenging weighted slightly less
            # Neutral signals contribute 0 (neither + nor -)

        # Normalise to 0–100 range, centred at 50 for neutral
        # Range: [-total_weight, +total_weight] → [0, 100]
        normalised = (signed_score / total_weight + 1.0) / 2.0 * 100.0
        result[domain_key] = round(min(100.0, max(0.0, normalised)), 1)

    # Weighted overall score
    if result:
        overall_num = sum(
            result[d] * weights.get(d, 0.0)
            for d in result
            if weights.get(d, 0.0) > 0.0
        )
        overall_den = sum(
            weights.get(d, 0.0)
            for d in result
            if weights.get(d, 0.0) > 0.0
        )
        result["overall"] = round(overall_num / overall_den if overall_den > 0 else 50.0, 1)
    else:
        result["overall"] = 50.0

    return result


def format_compatibility_report(scores: Dict[str, float]) -> Dict[str, str]:
    """
    Convert raw % scores to display strings for the LLM narrator.

    Returns dict of domain → formatted string:
        "love" → "Love compatibility: 82%"
        "overall" → "Overall compatibility: 76%"

    This enforces the % output directive: all compatibility outputs
    are expressed as percentages, never as binary verdicts.
    """
    label_map = {
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
    formatted: Dict[str, str] = {}
    for key, pct in scores.items():
        label = label_map.get(key, key.replace("_", " ").title())
        formatted[key] = f"{label}: {pct:.0f}%"
    return formatted


# ---------------------------------------------------------------------------
# Convergence detector (v2.0.0 — graceful new-domain fallback)
# ---------------------------------------------------------------------------

def detect_convergence(weighted_map: WeightedSignalMap) -> Dict[str, Dict]:
    """
    Detect how many systems agree on tone direction for each domain.
    Returns convergence metadata for the synthesiser.

    v2.0.0 change: iterates weighted_map.domains.keys() rather than only
    ALL_DOMAINS — ensures new domain keys are included in output.

    Returns dict keyed by domain with:
        {
            "level":               ConvergenceLevel value string,
            "positive_systems":    [...],
            "challenging_systems": [...],
            "neutral_systems":     [...],
            "dominant_tone":       SignalTone.value,
            "confidence":          float,
        }
    """
    from .models import ConvergenceLevel

    result = {}
    positive_tones   = {SignalTone.POSITIVE, SignalTone.STRONGLY_POSITIVE}
    challenging_tones = {SignalTone.CHALLENGING, SignalTone.STRONGLY_CHALLENGING}

    # v2.0.0: iterate all present domains, not just ALL_DOMAINS enum
    all_domain_keys = set(d.value for d in ALL_DOMAINS) | set(weighted_map.domains.keys())

    for domain_key in all_domain_keys:
        try:
            domain_enum = Domain(domain_key)
            signals = weighted_map.signals_for(domain_enum)
        except ValueError:
            # New domain not yet in enum — read directly from dict
            signals = weighted_map.domains.get(domain_key, [])

        if not signals:
            result[domain_key] = {
                "level":               "single",
                "positive_systems":    [],
                "challenging_systems": [],
                "neutral_systems":     [],
                "dominant_tone":       SignalTone.NEUTRAL.value,
                "confidence":          0.0,
            }
            continue

        # Group by system (take highest-weighted signal per system)
        system_tones:   Dict[str, SignalTone] = {}
        system_weights: Dict[str, float]      = {}

        for ws in signals:
            sys_key = _normalise_system_key(ws.raw.system)
            if sys_key not in system_tones or ws.final_weight > system_weights[sys_key]:
                system_tones[sys_key]   = ws.raw.tone
                system_weights[sys_key] = ws.final_weight

        pos_systems = [s for s, t in system_tones.items() if t in positive_tones]
        neg_systems = [s for s, t in system_tones.items() if t in challenging_tones]
        neu_systems = [s for s, t in system_tones.items()
                       if t not in positive_tones and t not in challenging_tones]

        unique_systems = len(system_tones)

        try:
            from .models import ConvergenceLevel
            if unique_systems >= 4:
                level = ConvergenceLevel.FOUR_SYSTEM
            elif unique_systems == 3:
                level = ConvergenceLevel.THREE_SYSTEM
            elif unique_systems == 2:
                level = ConvergenceLevel.TWO_SYSTEM
            else:
                level = ConvergenceLevel.SINGLE
        except (ImportError, AttributeError):
            level_str = (
                "four_system"   if unique_systems >= 4 else
                "three_system"  if unique_systems == 3 else
                "two_system"    if unique_systems == 2 else
                "single"
            )
            # Use a plain string if ConvergenceLevel not available
            class _Level:
                def __init__(self, v): self.value = v
            level = _Level(level_str)

        # Conflicted if positive AND challenging systems both present
        if pos_systems and neg_systems:
            try:
                level = ConvergenceLevel.CONFLICTED
            except (NameError, AttributeError):
                level = _Level("conflicted")

        # Dominant tone by weighted vote
        pos_weight = sum(system_weights[s] for s in pos_systems if s in system_weights)
        neg_weight = sum(system_weights[s] for s in neg_systems if s in system_weights)
        if pos_weight > neg_weight:
            dominant_tone = SignalTone.POSITIVE
        elif neg_weight > pos_weight:
            dominant_tone = SignalTone.CHALLENGING
        else:
            dominant_tone = SignalTone.NEUTRAL

        # Confidence = average weight of top signals
        top_weights = [ws.final_weight for ws in signals[:5]]
        confidence  = round(sum(top_weights) / len(top_weights), 3) if top_weights else 0.0

        result[domain_key] = {
            "level":               level.value,
            "positive_systems":    pos_systems,
            "challenging_systems": neg_systems,
            "neutral_systems":     neu_systems,
            "dominant_tone":       dominant_tone.value,
            "confidence":          confidence,
        }

    return result


# ---------------------------------------------------------------------------
# Utility (v2.0.0 — new system prefixes added)
# ---------------------------------------------------------------------------

def _normalise_system_key(system: str) -> str:
    """
    Normalise system string to match _DOMAIN_AUTHORITY keys.

    v1.0.0:
        "astrology_western" → "astrology_western"
        "palmistry"         → "palmistry"
        "physiognomy"       → "physiognomy"

    v2.0.0 additions:
        "spirit_world"      → "spirit_world"
        "health_engine"     → "health_engine"
        "synastry"          → "synastry"
        "remedies"          → "remedies"
        cross-hand signals  → "palmistry"
    """
    s = system.lower().strip()

    # Map cross_hand signals back to palmistry
    if s.startswith("palmistry") or "cross_hand" in s:
        return "palmistry"

    # Normalise numerology variants (keep full key)
    if s.startswith("numerology"):
        return s

    # Normalise astrology variants (keep full key)
    if s.startswith("astrology"):
        return s

    # v2.0.0 new system keys — return as-is (exact match in _DOMAIN_AUTHORITY)
    if s in ("spirit_world", "health_engine", "synastry", "remedies", "physiognomy"):
        return s

    return s
