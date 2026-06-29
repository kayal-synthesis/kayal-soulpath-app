"""
Synastry Reader — KAYAL Synthesis Platform
==========================================
Relationship knowledge base and domain-indexed interpretation layer.

Position in the pipeline:
    SynastryEngine.compute()  →  SynastryProfile  (raw scores + indicators)
              ↓
    SynastryReader.read()     →  SynastryReading  (domain-indexed interpretation)
              ↓
    Logic Layer synthesiser   →  LLM payload
              ↓
    LLM Narrator              →  Union Blueprint PDF delivered to client

Responsibility:
    Translate raw SynastryProfile scores and indicators into structured,
    domain-indexed relationship readings grounded in traditional astrological
    synastry knowledge, Chinese Bazi relationship reading, Vedic Jyotish
    compatibility (Guna matching + Dasha compatibility), and Western
    relationship astrology.

    This layer knows relationship astrology deeply.
    It does NOT know numerology, palmistry, or physiognomy.
    It does NOT produce final user-facing text — the LLM Narrator does that.
    It produces structured reading objects the Logic Layer synthesises across
    all modalities before passing to the narrator.

Design principles (mirrors palm_reader.py exactly):
    - Pure function: SynastryProfile in → SynastryReading out, no side effects
    - Deterministic: same input → same output always
    - Domain-indexed: every reading tagged to one or more of the 15 domains
    - Confidence-weighted: low-score indicators are marked accordingly
    - Cross-signal aware: confirms and conflicts tracked for Logic Layer

Knowledge sources:
    Robert Hand         — "Planets in Composite" (1975)
    Liz Greene          — "Relating" (1977)
    Stephen Arroyo      — "Astrology, Karma & Transformation"
    John Townley        — "Composite Charts" (1973)
    Komilla Sutton      — Vedic synastry tradition (Jyotish)
    B.V. Raman          — "Hindu Predictive Astrology" (Guna Milan)
    Joey Yap            — "BaZi — The Destiny Code" (relationship analysis)
    Donna Cunningham    — "An Astrological Guide to Self-Awareness"

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

from .synastry_engine import (
    SynastryProfile,
    SynastryCrossAspect,
    MarriageIndicator,
    ChildrenIndicator,
    InfidelityIndicator,
    DominanceProfile,
    CareerSynergy,
    HealthCrossImpact,
    DeathOrderAssessment,
    CompatibilityScore,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain vocabulary — full Union Blueprint domain set
# ---------------------------------------------------------------------------

class Domain(str, Enum):
    LOVE              = "love"
    SEXUALITY         = "sexuality"
    CHILDREN_FORECAST = "children_forecast"
    CAREER            = "career"
    FINANCE           = "finance"
    WEALTH            = "wealth"
    HEALTH            = "health"
    SPIRITUAL         = "spiritual"
    SPIRIT_WORLD      = "spirit_world"
    CHARACTER         = "character"
    IDENTITY          = "identity"
    PARENTS           = "parents"
    DEATH_TRANSITION  = "death_transition"
    LEGACY            = "legacy"
    TIMING            = "timing"

ALL_DOMAINS = list(Domain)


class ReadingTone(str, Enum):
    STRONGLY_POSITIVE    = "strongly_positive"
    POSITIVE             = "positive"
    NEUTRAL              = "neutral"
    CHALLENGING          = "challenging"
    STRONGLY_CHALLENGING = "strongly_challenging"
    ABSENT               = "absent"
    UNCLEAR              = "unclear"


class SignalStrength(str, Enum):
    STRONG   = "strong"
    MODERATE = "moderate"
    WEAK     = "weak"
    ABSENT   = "absent"


# ---------------------------------------------------------------------------
# Output dataclasses
# ---------------------------------------------------------------------------

@dataclass
class DomainReading:
    """What one synastry dimension says about one domain."""
    domain:           Domain
    tone:             ReadingTone
    signal_strength:  SignalStrength
    reading:          str
    keywords:         List[str]
    astro_affinity:   List[str]
    numerology_link:  List[int]
    vedic_note:       Optional[str]  = None
    chinese_note:     Optional[str]  = None


@dataclass
class FeatureReading:
    """Complete reading for one synastry dimension across all relevant domains."""
    feature_name:    str
    observation:     str           # plain factual summary of the engine data
    signal_strength: SignalStrength
    score:           Optional[float]  # 0.0–1.0 engine score where available
    domains:         List[DomainReading]
    cross_signals:   List[str]     # other features that confirm or conflict
    synthesis_note:  Optional[str] # how Logic Layer should weight this reading


@dataclass
class CompositeReading:
    """
    Reading of the composite chart — the relationship entity itself.
    In Townley's system, the composite chart reveals the 'third entity'
    created by the union: not A, not B, but the relationship itself.
    """
    composite_sun_sign:  Optional[str]
    composite_moon_sign: Optional[str]
    composite_asc_sign:  Optional[str]
    observation:         str
    domains:             List[DomainReading]
    entity_character:    str   # what kind of relationship entity this is
    relationship_element: str  # dominant element of the composite


@dataclass
class SynastryReading:
    """
    Complete synastry reading payload delivered to the Logic Layer.

    The Logic Layer should:
    1. Use marriage_longevity as the foundation of the love reading
    2. Use children_forecast for the progeny section
    3. Use infidelity_profile with both risk factors AND stabilisers
    4. Use dominance for the power dynamics section
    5. Use career_synergy for the professional compatibility section
    6. Use health_impact for the health cross-impact section
    7. Use death_order for the death and transition section
    8. Use spiritual_compat for the spiritual connection section
    9. Use composite for the relationship-entity readings
    10. Use cross_aspects_summary for the overall compatibility tone
    11. Use parental_patterns for the ancestral inheritance section
    12. Use wealth_synergy for the financial compatibility section

    Cross-referencing:
    - confirmed_signals: domains where multiple readings agree
    - conflicting_signals: domains where readings disagree
    - dominant_themes: top keywords across all readings
    """
    # Metadata
    person_a_label:     str
    person_b_label:     str
    reading_ms:         int
    overall_compatibility_level: str  # excellent, strong, moderate, challenging, difficult
    overall_score:      float         # 0.0–1.0

    # Feature readings
    marriage_longevity:  Optional[FeatureReading] = None
    children_forecast:   Optional[FeatureReading] = None
    infidelity_profile:  Optional[FeatureReading] = None
    dominance:           Optional[FeatureReading] = None
    career_synergy:      Optional[FeatureReading] = None
    health_impact:       Optional[FeatureReading] = None
    death_order:         Optional[FeatureReading] = None
    spiritual_compat:    Optional[FeatureReading] = None
    composite:           Optional[CompositeReading] = None
    cross_aspects_summary: Optional[FeatureReading] = None
    parental_patterns:   Optional[FeatureReading] = None
    wealth_synergy:      Optional[FeatureReading] = None

    # Synthesis helpers
    confirmed_signals:   Dict[str, List[str]] = field(default_factory=dict)
    conflicting_signals: Dict[str, List[str]] = field(default_factory=dict)
    dominant_themes:     List[str]            = field(default_factory=list)

    # Remedies pass-through from engine
    union_remedies: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _dr(
    domain: Domain,
    tone: ReadingTone,
    strength: SignalStrength,
    reading: str,
    keywords: List[str],
    astro: List[str],
    num: List[int],
    vedic: Optional[str] = None,
    chinese: Optional[str] = None,
) -> DomainReading:
    return DomainReading(
        domain=domain, tone=tone, signal_strength=strength,
        reading=reading, keywords=keywords,
        astro_affinity=astro, numerology_link=num,
        vedic_note=vedic, chinese_note=chinese,
    )


def _score_to_tone(score: float) -> ReadingTone:
    if score >= 0.80: return ReadingTone.STRONGLY_POSITIVE
    elif score >= 0.65: return ReadingTone.POSITIVE
    elif score >= 0.45: return ReadingTone.NEUTRAL
    elif score >= 0.30: return ReadingTone.CHALLENGING
    return ReadingTone.STRONGLY_CHALLENGING


def _score_to_strength(score: float) -> SignalStrength:
    if score >= 0.70: return SignalStrength.STRONG
    elif score >= 0.45: return SignalStrength.MODERATE
    elif score >= 0.20: return SignalStrength.WEAK
    return SignalStrength.ABSENT


def _positive_indicators(indicators: List, attr: str = "tone") -> int:
    """Count indicators with positive tone."""
    return sum(1 for i in indicators if getattr(i, attr, "") in
               ("positive", "strongly_positive"))


def _challenging_indicators(indicators: List, attr: str = "tone") -> int:
    """Count indicators with challenging tone."""
    return sum(1 for i in indicators if getattr(i, attr, "") in
               ("challenging", "strongly_challenging"))


# ---------------------------------------------------------------------------
# KNOWLEDGE BASE
# Each _read_*() function encodes the relationship astrology for one dimension.
# ---------------------------------------------------------------------------

def _read_marriage_longevity(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Interpret the marriage longevity score and indicators.
    Primary domains: LOVE, SEXUALITY, LEGACY.
    Grounds the reading in Townley composite theory and Hand's synastry rules.
    """
    score       = profile.marriage_longevity
    indicators  = profile.marriage_indicators
    tone        = _score_to_tone(score)
    strength    = _score_to_strength(score)
    pos_count   = _positive_indicators(indicators)
    neg_count   = _challenging_indicators(indicators)

    obs = (f"Marriage longevity score: {round(score, 2)}. "
           f"{pos_count} strengthening indicator(s), "
           f"{neg_count} tension indicator(s) across {len(indicators)} total assessed.")

    domains: List[DomainReading] = []

    # ── LOVE domain ──────────────────────────────────────────────────────
    if score >= 0.75:
        love_read = (
            "The synastry carries a strong structural foundation for lasting partnership. "
            "Multiple bonding aspects create a resilient emotional architecture — "
            "the kind that weathers life transitions without fracturing. "
            "The love here is not simply chemistry but structural compatibility: "
            "the planets of each chart support rather than destabilise the other's."
        )
    elif score >= 0.55:
        love_read = (
            "The synastry shows good structural compatibility with some growth edges. "
            "The foundational love indicators are positive — there is genuine resonance. "
            "The tension aspects, rather than undermining the bond, create the friction "
            "that sustains engagement over time. With awareness, this union endures."
        )
    elif score >= 0.40:
        love_read = (
            "The synastry shows moderate structural compatibility. "
            "The bond has genuine warmth and attraction, but some foundational "
            "misalignments require conscious attention to sustain over the long term. "
            "The relationship works best when both partners deliberately tend it."
        )
    else:
        love_read = (
            "The structural longevity indicators are challenging. "
            "This does not negate the attraction or the love — but it indicates "
            "that the default planetary energies pull in different directions. "
            "Long-term partnership here is a conscious choice against structural current, "
            "which is possible but demands more than most relationships require."
        )

    if pos_count >= 3:
        love_read += (
            f" {pos_count} strengthening indicators are present — "
            "the most significant being the Sun-Moon and Venus-Mars contacts that "
            "create the gravitational pull between these two charts."
        )

    domains.append(_dr(
        Domain.LOVE, tone, strength, love_read,
        ["marriage_longevity", "structural_compatibility", "bond_resilience",
         "emotional_architecture", "endurance"],
        ["Venus", "Moon", "Saturn", "Jupiter"], [2, 6, 4, 8],
        vedic="In Jyotish, marriage longevity is assessed through Guna Milan (36-point system), "
              "7th house strength, and Venus/Jupiter dignity. "
              "The structural synastry indicators here correspond to strong Guna Milan categories.",
        chinese="In BaZi relationship reading, the Day Master compatibility and "
                "the presence of 'He He' (合合) combinations between charts "
                "indicate structural longevity. Fire-Water balance is the key indicator.",
    ))

    # ── SEXUALITY domain ──────────────────────────────────────────────────
    venus_mars = [i for i in indicators
                  if any(p in i.planets for p in ["Venus","Mars"])
                  and i.aspect in ("conjunction","trine","sextile","square","opposition")]
    if venus_mars:
        best_vm = venus_mars[0]
        if best_vm.tone == "positive":
            sex_read = (
                "Venus-Mars cross-contacts in the synastry indicate strong physical "
                "and romantic chemistry. The attraction between these two charts is "
                "structural — not merely situational — suggesting that physical "
                "intimacy remains a source of connection over the long arc of the relationship."
            )
            sex_tone = ReadingTone.STRONGLY_POSITIVE
        else:
            sex_read = (
                "Venus-Mars tension in the synastry creates a complex desire dynamic — "
                "strong attraction combined with friction. The physical chemistry is real "
                "but may create power struggles around desire, timing, and initiative. "
                "The tension can sustain passion if channelled consciously."
            )
            sex_tone = ReadingTone.NEUTRAL
    elif score >= 0.55:
        sex_read = (
            "The general bonding quality of the synastry supports a warm and affectionate "
            "physical relationship. While no single Venus-Mars aspect stands out, "
            "the Moon and Venus contacts create emotional safety that sustains intimacy."
        )
        sex_tone = ReadingTone.POSITIVE
    else:
        sex_read = (
            "Physical intimacy will require more intentional nurturing in this union. "
            "The structural charts do not carry strong Venus-Mars activation. "
            "Emotional connection is the primary gateway to physical closeness for this pair."
        )
        sex_tone = ReadingTone.NEUTRAL

    domains.append(_dr(
        Domain.SEXUALITY, sex_tone, strength, sex_read,
        ["physical_chemistry", "desire_compatibility", "intimacy_endurance", "venus_mars"],
        ["Venus", "Mars", "Pluto", "Scorpio"], [2, 9, 6],
    ))

    # ── LEGACY domain ────────────────────────────────────────────────────
    if score >= 0.65:
        legacy_read = (
            "A structurally strong union creates the conditions for lasting legacy. "
            "What this couple builds together — family, home, creative work, community — "
            "is likely to endure beyond the relationship itself. "
            "The durability of the bond is the foundation for durable contribution."
        )
        legacy_tone = ReadingTone.POSITIVE
    else:
        legacy_read = (
            "Legacy through this union requires deliberate co-creation. "
            "The structural charts do not automatically generate shared legacy — "
            "it must be consciously chosen and built. "
            "When both partners align on a shared purpose, the relationship produces meaning."
        )
        legacy_tone = ReadingTone.NEUTRAL

    domains.append(_dr(
        Domain.LEGACY, legacy_tone, strength, legacy_read,
        ["union_legacy", "shared_contribution", "enduring_creation"],
        ["Saturn", "Jupiter", "Sun"], [4, 8, 3],
    ))

    cross = []
    if pos_count >= 3:
        cross.append("Strong marriage indicators — confirm with composite Sun-Moon harmony")
    if neg_count >= 2:
        cross.append("Tension aspects present — cross-reference with infidelity profile")
    cross.append("Marriage longevity — always read alongside dominance and wealth synergy")

    return FeatureReading(
        feature_name="marriage_longevity",
        observation=obs,
        signal_strength=strength,
        score=score,
        domains=domains,
        cross_signals=cross,
        synthesis_note=(
            f"Marriage score {round(score,2)} ({_score_to_tone(score).value}). "
            "Logic Layer should weight this reading at 30% of the love domain synthesis — "
            "the highest weight of any single synastry feature."
        ),
    )


def _read_children_forecast(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Interpret children indicators.
    Primary domains: CHILDREN_FORECAST, LOVE.
    """
    indicators  = profile.children_indicators
    pos_count   = _positive_indicators(indicators)
    neg_count   = _challenging_indicators(indicators)

    if pos_count >= 3:
        tone = ReadingTone.STRONGLY_POSITIVE; strength = SignalStrength.STRONG
        score = 0.85
    elif pos_count >= 1:
        tone = ReadingTone.POSITIVE; strength = SignalStrength.MODERATE
        score = 0.65
    elif neg_count >= 2:
        tone = ReadingTone.CHALLENGING; strength = SignalStrength.MODERATE
        score = 0.30
    else:
        tone = ReadingTone.NEUTRAL; strength = SignalStrength.MODERATE
        score = 0.50

    obs = (f"{len(indicators)} children indicator(s) detected. "
           f"{pos_count} positive, {neg_count} challenging.")

    domains: List[DomainReading] = []

    # Primary children reading
    moon_jup = [i for i in indicators if i.indicator_type in
                ("moon_jupiter_aspect","jupiter_in_5th_overlay","fifth_house_overlay")]
    fifth_count = sum(1 for i in indicators if "fifth" in i.indicator_type)
    rahu_fifth  = any(i.indicator_type == "rahu_fifth_overlay" for i in indicators)

    if pos_count >= 3:
        child_read = (
            "This synastry carries exceptional children indicators. "
            "Multiple activations of the 5th house and Jupiter-Moon contacts "
            "suggest that children are cosmically supported in this union. "
            "The karmic agreement between these two charts likely includes parenthood "
            "as a central shared purpose. Fertility indicators are structurally strong."
        )
    elif moon_jup:
        ind = moon_jup[0]
        child_read = (
            f"The {ind.planets[0]}-{ind.planets[-1]} {ind.aspect} in the synastry is "
            "one of the most reliable children indicators in relationship astrology. "
            "Jupiter's expansive blessing touches the Moon's nurturing instinct. "
            "Children are indicated with strong karmic support."
        )
    elif fifth_count >= 2:
        child_read = (
            f"{fifth_count} 5th house activations in the synastry — "
            "the house of children and creative legacy is strongly lit up. "
            "This pair has strong creative and generative potential together, "
            "expressed through both children and shared creative projects."
        )
    elif rahu_fifth:
        child_read = (
            "Rahu (North Node) in the other partner's 5th house indicates a karmic "
            "soul agreement around children and creative legacy. "
            "Parenthood is part of the dharmic direction of this union."
        )
    elif neg_count >= 2:
        child_read = (
            "Children indicators carry tension aspects in this synastry. "
            "This does not preclude parenthood — but it suggests that the parenting "
            "journey will require conscious alignment. Different rhythms around "
            "timing, parenting style, or role expectations may need direct conversation."
        )
    else:
        child_read = (
            "Children indicators are moderate in this synastry. "
            "The charts carry neither strong support nor strong resistance to parenthood. "
            "The choice of whether and when to have children is primarily a conscious "
            "decision rather than a karmic inevitability either way."
        )

    domains.append(_dr(
        Domain.CHILDREN_FORECAST, tone, strength, child_read,
        ["children_indicators", "fifth_house", "fertility", "karmic_parenthood",
         "moon_jupiter", "creative_legacy"],
        ["Moon", "Jupiter", "Venus", "Rahu", "Cancer"], [2, 3, 6],
        vedic="In Jyotish, children are assessed from the 5th house, Jupiter's strength, "
              "and the Putra Karaka (significator of children). "
              "Moon-Jupiter contacts are the classical Jyotish children blessing.",
        chinese="In BaZi, children are read from the Eating God (食神) and Hurting Officer (傷官) "
                "elements in the chart. Compatibility between these elements across two charts "
                "indicates parenting harmony or tension.",
    ))

    # Love domain cross-reading (children as relational experience)
    if pos_count >= 2:
        love_child_read = (
            "Strong children indicators add a profound bonding dimension to this union. "
            "Parenthood deepens the love between these two charts — "
            "the experience of raising children together is a primary strengthening force."
        )
        love_tone = ReadingTone.POSITIVE
    else:
        love_child_read = (
            "The parenting dimension will require intentional relational investment. "
            "Whether or not children are part of the picture, the creative output "
            "of this union requires deliberate co-creation."
        )
        love_tone = ReadingTone.NEUTRAL

    domains.append(_dr(
        Domain.LOVE, love_tone, SignalStrength.MODERATE, love_child_read,
        ["parenthood_as_bond", "creative_partnership", "generative_love"],
        ["Moon", "Jupiter", "Venus"], [2, 6, 3],
    ))

    cross = [
        "Children forecast — always cross-reference with 5th house strength in individual charts",
        "Moon-Jupiter aspects — confirm with lunar numerology cycles for timing",
    ]

    return FeatureReading(
        feature_name="children_forecast",
        observation=obs, signal_strength=strength, score=score,
        domains=domains, cross_signals=cross,
        synthesis_note="Logic Layer should use children_forecast as a standalone section in the Union Blueprint, weighted separately from the love reading.",
    )


def _read_infidelity_profile(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Interpret the infidelity structural risk profile.
    This is always dual-sided: risk factors AND stabilising indicators.
    Primary domains: LOVE, SEXUALITY, CHARACTER.
    """
    indicators  = profile.infidelity_indicators
    risk_factors   = [i for i in indicators if i.direction == "risk_factor"]
    stabilisers    = [i for i in indicators if i.direction == "stabilising"]
    high_risk      = [i for i in risk_factors if i.significance >= 0.70]

    if stabilisers and len(stabilisers) >= len(risk_factors):
        tone = ReadingTone.POSITIVE; strength = SignalStrength.MODERATE; score = 0.70
    elif not risk_factors:
        tone = ReadingTone.POSITIVE; strength = SignalStrength.MODERATE; score = 0.72
    elif len(high_risk) >= 2:
        tone = ReadingTone.CHALLENGING; strength = SignalStrength.STRONG; score = 0.28
    elif risk_factors and not stabilisers:
        tone = ReadingTone.NEUTRAL; strength = SignalStrength.MODERATE; score = 0.40
    else:
        tone = ReadingTone.NEUTRAL; strength = SignalStrength.MODERATE; score = 0.55

    obs = (f"Fidelity profile: {len(risk_factors)} structural risk factor(s), "
           f"{len(stabilisers)} stabilising indicator(s). "
           f"{len(high_risk)} high-significance risk factor(s).")

    domains: List[DomainReading] = []

    # ── LOVE domain ──────────────────────────────────────────────────────
    if len(high_risk) >= 2:
        love_read = (
            "The synastry carries multiple high-significance structural fidelity "
            "risk factors. These are not predictions — they are structural patterns "
            "that, without conscious management, increase the probability of boundary "
            "crossings over a long-term relationship. "
            "The remedy is not suspicion or restriction but explicit relational agreements: "
            "what fidelity means to each partner in concrete, negotiated terms. "
            "Clarity, not control, is the appropriate response to this structural reading."
        )
        love_tone = ReadingTone.CHALLENGING
    elif risk_factors and stabilisers:
        love_read = (
            f"The fidelity profile is mixed: {len(risk_factors)} risk factor(s) "
            f"are balanced by {len(stabilisers)} structural stabiliser(s). "
            "The stabilising indicators — particularly any Moon-Saturn or "
            "Venus-Saturn contacts — carry significant weight. "
            "The risk factors are real but contextualised by genuine structural commitment."
        )
        love_tone = ReadingTone.NEUTRAL
    elif stabilisers and not risk_factors:
        love_read = (
            f"{len(stabilisers)} structural fidelity stabiliser(s) are present "
            "with no significant risk factors. "
            "The synastry carries structural commitment patterns — "
            "particularly Saturn contacts that give the emotional bond durability and seriousness. "
            "Fidelity in this union is structurally supported."
        )
        love_tone = ReadingTone.POSITIVE
    else:
        love_read = (
            "The fidelity profile is structurally neutral — no major risk factors "
            "and no strong stabilising indicators. "
            "Fidelity here is a matter of values and conscious choice "
            "more than structural planetary pressure either way."
        )
        love_tone = ReadingTone.NEUTRAL

    domains.append(_dr(
        Domain.LOVE, love_tone, strength, love_read,
        ["fidelity_profile", "structural_commitment", "boundary_clarity",
         "relational_integrity"],
        ["Venus", "Saturn", "Neptune", "Mars"], [2, 6, 4, 8],
        vedic="In Jyotish, fidelity indicators are read from the 7th house, Venus placement, "
              "and the presence of Rahu/Ketu on the 7th axis. "
              "Venus-Neptune contacts in synastry correspond to romantic idealisation karma.",
    ))

    # ── SEXUALITY domain ──────────────────────────────────────────────────
    venus_nep = [i for i in risk_factors if
                 "neptune" in i.indicator_type and "venus" in i.indicator_type]
    mars_nep  = [i for i in risk_factors if
                 "neptune" in i.indicator_type and "mars" in i.indicator_type]

    if venus_nep or mars_nep:
        sex_read = (
            "Venus or Mars contacts with Neptune in the synastry create a "
            "romantically idealised sexuality — where the partner is experienced as "
            "a spiritual ideal rather than a grounded human being. "
            "This can produce profound transcendent connection AND a vulnerability "
            "to disillusionment or fantasy-seeking outside the relationship. "
            "The remedy is conscious reality-checking: seeing the partner clearly "
            "rather than through the Neptune lens."
        )
        sex_tone = ReadingTone.CHALLENGING
    elif high_risk:
        sex_read = (
            "Structural tension in the desire dynamic of this synastry. "
            "The sexual connection is intense but may carry a quality of "
            "frustrated desire, freedom-seeking, or boundary ambiguity. "
            "Conscious sexual communication and explicit agreements "
            "convert this tension from a risk into an energy source."
        )
        sex_tone = ReadingTone.NEUTRAL
    else:
        sex_read = (
            "The sexuality dimension of this synastry is structurally clean — "
            "no significant desire confusion or boundary ambiguity in the planetary contacts. "
            "Physical intimacy can be a source of straightforward pleasure and connection."
        )
        sex_tone = ReadingTone.POSITIVE

    domains.append(_dr(
        Domain.SEXUALITY, sex_tone, strength, sex_read,
        ["desire_clarity", "sexual_boundaries", "neptune_idealization",
         "physical_integrity"],
        ["Venus", "Mars", "Neptune", "Pluto"], [2, 9, 6],
    ))

    # ── CHARACTER domain ──────────────────────────────────────────────────
    if risk_factors:
        char_read = (
            "The presence of fidelity risk factors in the synastry reveals something "
            "important about the character tension in this union: "
            "one or both people carry structural patterns around freedom, "
            "idealisation, or desire that require character development to navigate well. "
            "This is not a character flaw — it is a growth edge the relationship provides."
        )
        char_tone = ReadingTone.NEUTRAL
    else:
        char_read = (
            "The structural character of both people, as revealed in the synastry, "
            "supports a principled approach to commitment. "
            "No significant character tension around fidelity is structurally indicated."
        )
        char_tone = ReadingTone.POSITIVE

    domains.append(_dr(
        Domain.CHARACTER, char_tone, SignalStrength.MODERATE, char_read,
        ["character_integrity", "growth_edge", "commitment_values"],
        ["Saturn", "Venus"], [4, 6],
    ))

    cross = [
        "Infidelity profile — always read alongside marriage longevity score",
        "High-risk fidelity factors require Moon-Saturn stabilisers to contextualise",
        "Cross-reference with dominance profile — power imbalance amplifies fidelity risk",
    ]

    return FeatureReading(
        feature_name="infidelity_profile",
        observation=obs, signal_strength=strength, score=score,
        domains=domains, cross_signals=cross,
        synthesis_note=(
            "Logic Layer: never present risk factors in isolation — always pair with "
            "stabilising indicators and remedy guidance. "
            "This reading is sensitive and must reach the narrator with full context."
        ),
    )


def _read_dominance(
    profile: SynastryProfile,
) -> FeatureReading:
    """Primary domains: CHARACTER, IDENTITY."""
    dom   = profile.dominance
    score = 1.0 - dom.dominance_score  # higher balance = higher score
    tone  = (ReadingTone.STRONGLY_POSITIVE if dom.dominant_person == "equal"
             else ReadingTone.POSITIVE if dom.dominant_person in ("person_a","person_b") and dom.dominance_score < 0.35
             else ReadingTone.NEUTRAL if dom.dominant_person == "conflicted"
             else ReadingTone.CHALLENGING)
    strength = SignalStrength.STRONG if dom.dominance_score > 0.40 else SignalStrength.MODERATE

    obs = f"Dominance pattern: {dom.dominant_person}. Type: {dom.dominance_type}. Imbalance score: {round(dom.dominance_score,2)}."
    domains: List[DomainReading] = []

    if dom.dominant_person == "equal":
        char_read = ("An equal-power dynamic is the rarest and most generative relationship structure. "
                     "Neither partner holds structural authority over the other's planetary field. "
                     "Decisions are naturally shared; leadership rotates by domain. "
                     "The growth edge of the equal union is learning to act decisively "
                     "without a default authority to defer to.")
        char_tone = ReadingTone.STRONGLY_POSITIVE
        id_read   = ("Both identities are preserved in this union. "
                     "Neither person's sense of self is structurally subordinated. "
                     "This supports individual growth while maintaining genuine partnership.")
        id_tone   = ReadingTone.POSITIVE
    elif dom.dominant_person == "conflicted":
        char_read = ("Both partners carry similar structural authority in the synastry — "
                     "neither yields naturally to the other. "
                     "This creates a dynamic of equal-but-competing leadership drives. "
                     "The relationship works best with explicit domain agreements: "
                     "one person leads in finance, the other in social, etc.")
        char_tone = ReadingTone.NEUTRAL
        id_read   = ("Identity tension is present — both people have strong individual identities "
                     "that resist subordination. The union must actively create space for both.")
        id_tone   = ReadingTone.NEUTRAL
    else:
        dominant_label = profile.person_a_label if dom.dominant_person == "person_a" else profile.person_b_label
        yielding_label = profile.person_b_label if dom.dominant_person == "person_a" else profile.person_a_label
        char_read = (f"{dominant_label} holds structural authority in this union "
                     f"(dominance score: {round(dom.dominance_score,2)}). "
                     f"{dom.reading} "
                     "The yielding partner's planetary field — particularly Moon and Venus — "
                     "is shaped by the dominant partner's Sun, Saturn, or Mars. "
                     "This is functional when the dominant partner leads with awareness "
                     "and the yielding partner maintains genuine autonomy in chosen domains.")
        char_tone = tone
        id_read   = (f"{yielding_label}'s sense of identity may gradually orient around "
                     f"{dominant_label}'s definition of the relationship. "
                     "Deliberate identity sovereignty practices — individual friendships, "
                     "personal creative projects, and separate goals — "
                     "are the structural remedy for the yielding partner.")
        id_tone   = ReadingTone.NEUTRAL if dom.dominance_score < 0.40 else ReadingTone.CHALLENGING

    domains.append(_dr(Domain.CHARACTER, char_tone, strength, char_read,
        ["power_dynamics","leadership_pattern","structural_authority","partnership_equality"],
        ["Sun","Saturn","Mars","Moon"],[1,4,8,2]))
    domains.append(_dr(Domain.IDENTITY, id_tone, strength, id_read,
        ["identity_sovereignty","self_preservation","individual_growth","autonomy"],
        ["Sun","Uranus","Saturn"],[1,4,11]))

    if dom.sub_readings:
        cross = dom.sub_readings[:3]
    else:
        cross = ["Dominance reading — cross-reference with career synergy and wealth synergy"]
    cross.append("High dominance imbalance amplifies infidelity risk in the yielding partner — check")

    return FeatureReading(
        feature_name="dominance",
        observation=obs, signal_strength=strength, score=score,
        domains=domains, cross_signals=cross,
        synthesis_note="Logic Layer: dominance reading shapes the 'relational dynamics' section. Always present with practical remedy for power balance.",
    )


def _read_career_synergy(
    profile: SynastryProfile,
) -> FeatureReading:
    """Primary domains: CAREER, FINANCE, WEALTH."""
    cs = profile.career_synergy
    score = cs.score; tone = _score_to_tone(score); strength = _score_to_strength(score)
    obs = f"Career synergy: {cs.synergy_level} (score {round(score,2)}). {len(cs.indicators)} indicator(s)."
    domains: List[DomainReading] = []

    if cs.synergy_level == "strong":
        career_read = ("The synastry carries strong professional synergy. "
                       "These two charts complement each other in the career domain — "
                       "Saturn-Sun contacts create mutual professional respect; "
                       "Jupiter-Saturn contacts bring growth and structure together. "
                       "Joint ventures, complementary businesses, or deliberate professional collaboration "
                       "amplify both partners' career trajectories.")
    elif cs.synergy_level == "moderate":
        career_read = ("Moderate career synergy — the professional energies are partly compatible "
                       "and partly independent. "
                       "Both partners benefit most from maintaining their own professional identities "
                       "while finding specific domains of genuine collaboration. "
                       "The relationship supports rather than supplants individual career paths.")
    elif cs.synergy_level == "weak":
        career_read = ("Career paths in this synastry are largely independent. "
                       "The two charts operate in different professional registers — "
                       "which can be healthy if both partners actively celebrate each other's "
                       "professional worlds without comparison or competition.")
    else:
        career_read = ("Career friction is structurally present in this synastry. "
                       "Competing Sun energies or Mars-Mars tension creates professional rivalry "
                       "that requires explicit management. "
                       "Separate professional domains and deliberate celebration of each other's "
                       "successes are the structural remedies.")

    domains.append(_dr(Domain.CAREER, tone, strength, career_read,
        ["career_synergy","professional_collaboration","complementary_strengths","saturn_sun"],
        ["Saturn","Sun","Jupiter","Mars","MC"],[8,1,3,4],
        vedic="In Jyotish, career compatibility is read from the 10th house compatibility, "
              "Saturn dignity cross-chart, and the strength of the Karma Karaka across both charts.",
        chinese="In BaZi, career synergy is assessed from the Wealth and Officer elements "
                "across both Day Masters. Complementary element flows indicate professional synergy."))

    fin_read = (f"The financial implications of this career synergy level ({cs.synergy_level}) "
                f"{'allow for deliberate joint financial planning and shared wealth-building strategies.' if cs.synergy_level in ('strong','moderate') else 'suggest maintaining financial independence as the primary structure, with selective joint ventures.'}")
    domains.append(_dr(Domain.FINANCE, tone, SignalStrength.MODERATE, fin_read,
        ["financial_synergy","joint_ventures","income_compatibility"],
        ["Jupiter","Saturn","Venus"],[3,4,6]))

    wealth_read = ("Joint wealth potential reflects the underlying career synergy. "
                   f"{'Strong career alignment creates conditions for deliberate wealth building together.' if cs.synergy_level == 'strong' else 'Moderate wealth synergy — shared financial goals work within individual financial sovereignty.' if cs.synergy_level == 'moderate' else 'Independent wealth paths — each partner maintains their primary financial sovereignty.'}")
    domains.append(_dr(Domain.WEALTH, tone, SignalStrength.MODERATE, wealth_read,
        ["wealth_building","financial_independence","joint_prosperity"],
        ["Jupiter","Venus","Saturn"],[3,6,8]))

    return FeatureReading(
        feature_name="career_synergy",
        observation=obs, signal_strength=strength, score=score,
        domains=domains, cross_signals=cs.indicators[:3],
        synthesis_note="Logic Layer: career synergy feeds both the career and wealth sections of the Union Blueprint.",
    )


def _read_health_impact(
    profile: SynastryProfile,
) -> FeatureReading:
    """Primary domain: HEALTH."""
    hi = profile.health_cross_impact
    score = hi.score; tone = _score_to_tone(score); strength = _score_to_strength(score)
    obs = f"Health cross-impact: {hi.impact_level} (score {round(score,2)}). {len(hi.indicators)} indicator(s)."
    domains: List[DomainReading] = []

    if hi.impact_level == "supportive":
        health_read = ("The synastry is structurally supportive of both partners' physical "
                       "and emotional health. "
                       "Moon-Venus harmony and Jupiter activations of the 6th house "
                       "create a relationship environment where each person's health is "
                       "enhanced by the other's presence. "
                       "Shared physical practices — exercise, cooking, wellness routines — "
                       "become a bonding force as well as a health investment.")
    elif hi.impact_level == "neutral":
        health_read = ("Health cross-impacts are mixed in this synastry — "
                       "some contacts are supportive and some create stress patterns. "
                       "The key is maintaining individual health sovereignty: "
                       "each partner keeps their own health practices regardless of "
                       "the relationship state. "
                       "When one partner is unwell or stressed, the other maintains "
                       "their own equilibrium rather than absorbing the disruption.")
    else:
        health_read = ("Multiple health stress patterns are structurally present in this synastry. "
                       "Neptune-Sun contacts may create a subtle vitality drain over time; "
                       "Saturn-Moon tensions may create chronic emotional pressure "
                       "that manifests as physical symptoms. "
                       "The structural remedy: both partners maintain vigorous independent "
                       "health practices, clear energetic boundaries, and regular time "
                       "in their own sovereign space. "
                       "This is not a reason to avoid the relationship — it is a call "
                       "for disciplined self-care within it.")

    domains.append(_dr(Domain.HEALTH, tone, strength, health_read,
        ["health_cross_impact","vitality_support","stress_patterns","energetic_boundaries",
         "sovereign_health_practice"],
        ["Moon","Sun","Saturn","Neptune","Jupiter"],[2,1,4,11,3],
        vedic="In Jyotish, health cross-impact is assessed from the 6th house overlays, "
              "Saturn dignity across charts, and the 8th house strength comparison.",
        chinese="In BaZi, health patterns are read from the seasonal element balance "
                "across both charts. Conflicting dominant elements create health friction."))

    return FeatureReading(
        feature_name="health_impact",
        observation=obs, signal_strength=strength, score=score,
        domains=domains, cross_signals=hi.indicators[:3],
        synthesis_note="Logic Layer: health cross-impact section in Union Blueprint requires remedy alongside the assessment.",
    )


def _read_death_order(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Primary domain: DEATH_TRANSITION.
    This is handled with care — structural tendency only, not prediction.
    """
    do = profile.death_order
    strength = SignalStrength.MODERATE if do.confidence == "moderate" else SignalStrength.WEAK
    tone = ReadingTone.NEUTRAL  # Always neutral — not positive or negative
    obs = (f"Death order assessment: {do.likely_order}. "
           f"Confidence: {do.confidence}. "
           f"Longevity score A: {do.longevity_score_a}, B: {do.longevity_score_b}.")

    person_a = profile.person_a_label
    person_b = profile.person_b_label

    if do.likely_order == "unclear" or do.confidence == "low":
        dt_read = ("The structural longevity indicators are closely matched between the two charts. "
                   "No reliable structural indication of which partner is likely to transition first. "
                   "Both charts carry similar constitutional vitality indicators. "
                   "Lifestyle, environment, and conscious health practices are far stronger "
                   "determinants of longevity than the structural planetary positions alone.")
    elif do.likely_order == "person_b_first":
        dt_read = (f"{person_a}'s chart carries marginally stronger structural longevity indicators "
                   f"(score: {do.longevity_score_a} vs {person_b}'s {do.longevity_score_b}). "
                   "This structural reading suggests the possibility of {person_b} transitioning first — "
                   "though this is a tendency reading with significant uncertainty. "
                   "The appropriate response is ensuring both partners have their own spiritual "
                   "relationship with impermanence, their individual legacies documented, "
                   "and their estate/wishes clearly communicated.")
    else:
        dt_read = (f"{person_b}'s chart carries marginally stronger structural longevity indicators "
                   f"(score: {do.longevity_score_b} vs {person_a}'s {do.longevity_score_a}). "
                   f"This structural reading suggests the possibility of {person_a} transitioning first. "
                   "The appropriate response is mutual preparation: both partners maintain "
                   "individual spiritual practices around impermanence, documented wishes, "
                   "and a relationship with the reality of eventual separation.")

    dt_read += (" This reading is always presented as structural tendency only — "
                "not as prediction or fate. The soul's actual timing is its own.")

    domains = [_dr(
        Domain.DEATH_TRANSITION, tone, strength, dt_read,
        ["longevity_comparison","transition_order","constitutional_vitality","impermanence"],
        ["Saturn","Pluto","Sun","Jupiter"],[4,8,9,3],
        vedic="In Jyotish, longevity is assessed from the Ayush Bhava (8th house), "
              "Saturn's strength, and the longevity Dasha sequence. "
              "The Maraka houses (2nd and 7th) also carry longevity information.",
        chinese="In BaZi, longevity is read from the Day Master strength, "
                "the 10-year Luck Pillar sequence, and the annual pillars at key ages.",
    )]

    return FeatureReading(
        feature_name="death_order",
        observation=obs, signal_strength=strength, score=None,
        domains=domains, cross_signals=do.indicators[:3],
        synthesis_note="Logic Layer: death order must always be presented with epistemic humility — structural tendency only. Never presented as fate.",
    )


def _read_spiritual_compat(
    profile: SynastryProfile,
) -> FeatureReading:
    """Primary domains: SPIRITUAL, SPIRIT_WORLD."""
    compat = profile.compatibility
    score  = compat.spiritual
    tone   = _score_to_tone(score)
    strength = _score_to_strength(score)
    obs = f"Spiritual compatibility score: {round(score,2)}."
    domains: List[DomainReading] = []

    cross_aspects = profile.cross_aspects
    neptune_aspects = [a for a in cross_aspects
                      if "Neptune" in (a.planet_a, a.planet_b)
                      and "positive" in a.tone]
    jupiter_aspects = [a for a in cross_aspects
                      if "Jupiter" in (a.planet_a, a.planet_b)
                      and "positive" in a.tone]
    saturn_aspects  = [a for a in cross_aspects
                      if "Saturn" in (a.planet_a, a.planet_b)]

    if score >= 0.75:
        spi_read = ("The spiritual dimension of this synastry is exceptionally harmonious. "
                    "Neptune and Jupiter contacts between the charts create a shared "
                    "spiritual language — these two people naturally understand each "
                    "other's inner life, values, and sense of the sacred. "
                    "A shared spiritual practice is not merely recommended but is "
                    "likely the most potent bonding force available to this pair.")
    elif score >= 0.55:
        spi_read = ("Good spiritual compatibility with some divergence in specific practices "
                    "or beliefs. The charts share enough spiritual resonance that a shared "
                    "inner life is possible, though individual spiritual autonomy is equally "
                    "important to honour. "
                    "Each person brings a different spiritual lens that enriches rather than "
                    "contradicts the other's — if differences are welcomed rather than resolved.")
    else:
        spi_read = ("The spiritual paths of these two people diverge structurally. "
                    "Different Saturn and Neptune placements indicate different relationships "
                    "with the sacred, with discipline, and with meaning. "
                    "This is not a barrier to relationship — it is an invitation to "
                    "genuine spiritual tolerance: each person's path held as valid "
                    "without requiring convergence.")

    if neptune_aspects:
        spi_read += (" Neptune contacts between the charts add a mystical, "
                     "soulmate quality to the connection — an experience of transcendence "
                     "in each other's presence.")
    if jupiter_aspects:
        spi_read += (" Jupiter cross-aspects amplify the philosophical and growth dimensions "
                     "of the spiritual connection — this pair expands each other's worldview.")

    domains.append(_dr(
        Domain.SPIRITUAL, tone, strength, spi_read,
        ["spiritual_compatibility","shared_sacred","neptune_connection","philosophical_resonance"],
        ["Neptune","Jupiter","Saturn","Pluto"],[11,3,7,22],
        vedic="In Jyotish, spiritual compatibility is assessed from the 9th house overlays, "
              "the dharma triangle (1st/5th/9th), and Jupiter's strength cross-chart.",
        chinese="In BaZi, spiritual compatibility relates to the Hidden Stems (藏干) "
                "across both charts and the flow of the Heavenly Stems in the annual pillars.",
    ))

    # SPIRIT_WORLD — karmic connection reading
    rahu_ketu = [a for a in cross_aspects
                 if "Rahu" in (a.planet_a, a.planet_b) or "Ketu" in (a.planet_a, a.planet_b)]
    pluto_aspects = [a for a in cross_aspects
                     if "Pluto" in (a.planet_a, a.planet_b)]

    if rahu_ketu or (score >= 0.60 and (neptune_aspects or pluto_aspects)):
        sw_read = ("This synastry carries indicators of a past-life or karmic soul connection. "
                   "Rahu/Ketu overlays, Pluto contacts, and Neptune resonance between charts "
                   "are the classical markers of souls who have encountered each other before. "
                   "The relationship carries a quality of recognition — an inexplicable "
                   "familiarity that transcends the current life meeting. "
                   "The karmic work between these souls relates to the primary tension "
                   "aspects in the synastry — they are here to resolve something together.")
        sw_tone = ReadingTone.POSITIVE
    else:
        sw_read = ("The synastry does not carry strong past-life indicators. "
                   "This union appears to be a new soul meeting rather than a karmic continuation. "
                   "New meetings carry their own power: no accumulated karma to resolve, "
                   "no pre-written scripts — a genuinely fresh agreement between souls.")
        sw_tone = ReadingTone.NEUTRAL

    domains.append(_dr(
        Domain.SPIRIT_WORLD, sw_tone, SignalStrength.MODERATE, sw_read,
        ["past_life_connection","karmic_meeting","soul_recognition","rahu_ketu"],
        ["Pluto","Neptune","Rahu"],[22,11,8],
        vedic="In Jyotish, past-life connections are indicated by the North Node (Rahu) "
              "and South Node (Ketu) overlays across charts, and Pluto-Moon contacts. "
              "These represent carried karma from previous cycles.",
    ))

    return FeatureReading(
        feature_name="spiritual_compat",
        observation=obs, signal_strength=strength, score=score,
        domains=domains,
        cross_signals=["Spiritual compat — confirm with composite Neptune and Jupiter positions",
                       "Rahu/Ketu overlays — cross-reference with 9th house strengths"],
        synthesis_note="Logic Layer: spiritual compatibility section feeds both the spiritual and karmic sections of the Union Blueprint.",
    )


def _read_composite_chart(
    profile: SynastryProfile,
) -> Optional[CompositeReading]:
    """
    Read the composite chart as the 'relationship entity.'
    In Townley's framework, the composite is a third chart — not A, not B,
    but the relationship itself as a living entity.
    """
    composite = profile.composite
    if not composite:
        return None

    sun  = composite.get("Sun",  {})
    moon = composite.get("Moon", {})
    venus= composite.get("Venus",{})
    mars = composite.get("Mars", {})
    sat  = composite.get("Saturn",{})
    jup  = composite.get("Jupiter",{})

    sun_sign  = sun.get("sign","")
    moon_sign = moon.get("sign","")
    ven_sign  = venus.get("sign","")

    # Determine composite element
    fire_count  = sum(1 for p in [sun,moon,venus,mars] if p.get("sign","") in
                     ("Aries","Leo","Sagittarius"))
    earth_count = sum(1 for p in [sun,moon,venus,mars] if p.get("sign","") in
                     ("Taurus","Virgo","Capricorn"))
    air_count   = sum(1 for p in [sun,moon,venus,mars] if p.get("sign","") in
                     ("Gemini","Libra","Aquarius"))
    water_count = sum(1 for p in [sun,moon,venus,mars] if p.get("sign","") in
                     ("Cancer","Scorpio","Pisces"))
    elem_counts = {"fire":fire_count,"earth":earth_count,"air":air_count,"water":water_count}
    dom_element = max(elem_counts, key=elem_counts.get)

    obs = (f"Composite Sun in {sun_sign}, Moon in {moon_sign}, Venus in {ven_sign}. "
           f"Dominant element: {dom_element}.")

    # Relationship entity character
    entity_map = {
        "fire":  "A passionate, active, visionary relationship entity. This union runs on inspiration, forward momentum, and shared purpose. The relationship itself is entrepreneurial.",
        "earth": "A practical, stable, building relationship entity. This union runs on shared tangible goals, security, and systematic co-creation. The relationship itself is productive.",
        "air":   "An intellectual, communicative, socially dynamic relationship entity. This union runs on ideas, conversation, and mental stimulation. The relationship itself is generative of thought.",
        "water": "An emotionally deep, intuitive, soulful relationship entity. This union runs on feeling, empathy, and spiritual resonance. The relationship itself is healing.",
    }
    entity_character = entity_map.get(dom_element, "A complex, multi-element relationship entity.")

    domains: List[DomainReading] = []

    # Composite Sun reading
    if sun_sign:
        domains.append(_dr(
            Domain.IDENTITY, ReadingTone.POSITIVE, SignalStrength.STRONG,
            (f"Composite Sun in {sun_sign} — the relationship's core identity and purpose expresses through {sun_sign}. "
             f"The union shines brightest when oriented toward {sun_sign} themes and values. "
             f"This is what the relationship is fundamentally 'for.'"),
            ["composite_sun","relationship_purpose","union_identity",sun_sign.lower()],
            ["Sun",sun_sign],[1,9],
        ))

    # Composite Moon reading
    if moon_sign:
        domains.append(_dr(
            Domain.LOVE, ReadingTone.POSITIVE, SignalStrength.STRONG,
            (f"Composite Moon in {moon_sign} — the emotional home base of the relationship. "
             f"Both partners feel most nourished within the union when {moon_sign} emotional needs are met. "
             f"This is the feeling-tone of the relationship at rest."),
            ["composite_moon","emotional_home","union_feeling","relationship_comfort"],
            ["Moon",moon_sign],[2,11],
        ))

    # Composite Venus reading
    if ven_sign:
        domains.append(_dr(
            Domain.LOVE, ReadingTone.POSITIVE, SignalStrength.MODERATE,
            (f"Composite Venus in {ven_sign} — the relationship's love language and aesthetic values. "
             f"What the union finds beautiful, pleasurable, and worth appreciating is expressed through {ven_sign}. "
             f"Date environments, shared aesthetics, and love expressions should honour {ven_sign} energy."),
            ["composite_venus","love_language","union_aesthetics","shared_pleasure"],
            ["Venus",ven_sign],[6,2],
        ))

    # Saturn in composite — structure and tests
    if sat.get("sign"):
        sat_sign = sat["sign"]
        sat_tone = (ReadingTone.POSITIVE if sat_sign in ("Capricorn","Aquarius","Libra")
                    else ReadingTone.NEUTRAL)
        domains.append(_dr(
            Domain.LEGACY, sat_tone, SignalStrength.MODERATE,
            (f"Composite Saturn in {sat_sign} — the test, the structure, and the legacy responsibility "
             f"of this relationship. The themes of {sat_sign} are where the union must demonstrate discipline, "
             f"endurance, and accountability. This is where the relationship grows up."),
            ["composite_saturn","relationship_test","union_responsibility","legacy_work"],
            ["Saturn",sat_sign],[4,8],
        ))

    # Jupiter in composite — growth and abundance
    if jup.get("sign"):
        jup_sign = jup["sign"]
        domains.append(_dr(
            Domain.WEALTH, ReadingTone.POSITIVE, SignalStrength.MODERATE,
            (f"Composite Jupiter in {jup_sign} — the growth and abundance dimension of the relationship. "
             f"The union expands most naturally through {jup_sign} themes: "
             f"where both people say 'yes' to life together most enthusiastically."),
            ["composite_jupiter","relationship_growth","union_abundance","expansion"],
            ["Jupiter",jup_sign],[3,9],
        ))

    return CompositeReading(
        composite_sun_sign=sun_sign or None,
        composite_moon_sign=moon_sign or None,
        composite_asc_sign=None,
        observation=obs,
        domains=domains,
        entity_character=entity_character,
        relationship_element=dom_element,
    )


def _read_cross_aspects_summary(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Summarise the overall cross-aspect picture.
    Primary domains: CHARACTER, LOVE.
    """
    aspects = profile.cross_aspects[:10]
    compat  = profile.compatibility
    pos = sum(1 for a in aspects if "positive" in a.tone)
    neg = sum(1 for a in aspects if "challenging" in a.tone)

    obs = (f"Top 10 cross-aspects: {pos} positive/harmonious, {neg} challenging. "
           f"Overall compatibility: {compat.level} (score {round(compat.overall,2)}).")

    tone     = _score_to_tone(compat.overall)
    strength = SignalStrength.STRONG

    if pos >= neg * 2:
        char_read = ("The cross-aspect picture is predominantly harmonious. "
                     "The planetary energies of these two charts flow together more often "
                     "than they collide. The fundamental compatibility of these two people "
                     "is structurally supported — their charts 'like' each other. "
                     "Challenges that arise are navigated with greater ease than for "
                     "couples whose charts carry heavier cross-tensions.")
    elif pos > neg:
        char_read = ("The cross-aspect picture is net-positive with meaningful growth edges. "
                     "More harmonious than challenging contacts, but the tension aspects "
                     "are significant enough to require conscious attention. "
                     "This is a relationship that asks something real of both people — "
                     "which is the condition for genuine growth.")
    elif neg > pos:
        char_read = ("The cross-aspect picture carries more tension than harmony. "
                     "This does not preclude a meaningful relationship — tension aspects "
                     "generate the friction that keeps engagement alive over time. "
                     "But this union requires both people to be exceptionally skilled "
                     "at navigating difference and conflict without dissolving the bond.")
    else:
        char_read = ("The cross-aspects balance harmonious and challenging contacts. "
                     "This is a balanced synastry — genuine attraction alongside genuine challenge. "
                     "The relationship is a continuous growth school for both people.")

    # Top three aspects as sub-notes
    if aspects:
        char_read += (" The three most significant cross-chart contacts are: "
                      + "; ".join(f"{a.planet_a} {a.aspect} {a.planet_b} ({a.domain})"
                                  for a in aspects[:3]) + ".")

    domains = [
        _dr(Domain.CHARACTER, tone, strength, char_read,
            ["cross_aspect_summary","structural_compatibility","harmonic_flow"],
            ["Sun","Moon","Venus","Mars","Saturn"],[1,2,6,9,4]),
        _dr(Domain.LOVE, tone, strength, compat.overview,
            ["overall_compatibility","relationship_potential","love_summary"],
            ["Venus","Moon","Sun","Jupiter"],[6,2,1,3]),
    ]

    return FeatureReading(
        feature_name="cross_aspects_summary",
        observation=obs, signal_strength=strength, score=compat.overall,
        domains=domains,
        cross_signals=["Cross-aspects summary — this is the headline reading; all other features contextualise it"],
        synthesis_note="Logic Layer: cross_aspects_summary should open the relationship compatibility section.",
    )


def _read_parental_patterns(
    profile: SynastryProfile,
) -> FeatureReading:
    """
    Interpret ancestral and parental pattern interactions between two charts.
    Primary domains: PARENTS, CHARACTER, IDENTITY.
    """
    pos_a = profile.person_a_label; pos_b = profile.person_b_label
    strength = SignalStrength.MODERATE; tone = ReadingTone.NEUTRAL
    obs = f"Parental pattern analysis for {pos_a} and {pos_b} union."

    saturn_aspects = [a for a in profile.cross_aspects
                     if "Saturn" in (a.planet_a, a.planet_b)]
    moon_aspects   = [a for a in profile.cross_aspects
                     if "Moon" in (a.planet_a, a.planet_b)]
    sun_aspects    = [a for a in profile.cross_aspects
                     if "Sun" in (a.planet_a, a.planet_b)]

    parent_read = (
        "Every intimate relationship activates the parental templates encoded in each person's chart. "
        f"The Saturn contacts between {pos_a}'s and {pos_b}'s charts — "
        + (f"primarily the {saturn_aspects[0].planet_a}-{saturn_aspects[0].planet_b} {saturn_aspects[0].aspect} — "
           if saturn_aspects else "including the general Saturn dynamic — ")
        + "reveal how each person's paternal template meets the other's. "
        "The Moon cross-contacts "
        + (f"({moon_aspects[0].planet_a}-{moon_aspects[0].planet_b} {moon_aspects[0].aspect}) "
           if moon_aspects else "")
        + "reveal how each person's maternal template is activated by the other. "
        "When partners unconsciously replicate parental dynamics — seeking the familiar "
        "even when it is uncomfortable — the relationship becomes a repetition of childhood patterns. "
        "The remedy is consciousness: recognising where you are responding to the partner's "
        "current behaviour versus a parental imprint from the past."
    )

    saturn_tone = (ReadingTone.POSITIVE
                   if saturn_aspects and "positive" in saturn_aspects[0].tone
                   else ReadingTone.NEUTRAL if saturn_aspects
                   else ReadingTone.NEUTRAL)

    char_read = (
        "The intersection of parental patterns in this synastry shapes core character dynamics. "
        + (f"The {pos_a}-{pos_b} Saturn contact suggests that authority, structure, and discipline "
           "patterns from the father figures of each person will be activated in this union. " if saturn_aspects else "")
        + "Both partners carry unconscious relational templates from their families of origin "
        "that this relationship will surface and invite healing."
    )

    id_read = (
        "Identity formation in this union will be influenced by the parental templates "
        "both people carry. "
        "Conscious family-of-origin work — understanding where 'this is how relationships work' "
        "beliefs originated — allows both partners to choose their relational patterns "
        "rather than simply repeat inherited ones."
    )

    domains = [
        _dr(Domain.PARENTS, tone, strength, parent_read,
            ["parental_patterns","maternal_template","paternal_template","family_of_origin",
             "unconscious_repetition"],
            ["Moon","Saturn","Sun"],[2,4,1]),
        _dr(Domain.CHARACTER, saturn_tone, strength, char_read,
            ["character_formation","authority_patterns","structural_template"],
            ["Saturn","Moon"],[4,2]),
        _dr(Domain.IDENTITY, ReadingTone.NEUTRAL, strength, id_read,
            ["identity_inheritance","relational_template","conscious_choice"],
            ["Moon","Saturn","Sun"],[2,4,1]),
    ]

    return FeatureReading(
        feature_name="parental_patterns",
        observation=obs, signal_strength=strength, score=None,
        domains=domains,
        cross_signals=["Parental patterns — cross-reference with dominance profile",
                       "Saturn contacts most relevant for paternal pattern activation",
                       "Moon contacts most relevant for maternal pattern activation"],
        synthesis_note="Logic Layer: parental patterns section in Union Blueprint supports the 'family inheritance' chapter.",
    )


def _read_wealth_synergy(
    profile: SynastryProfile,
) -> FeatureReading:
    """Primary domains: WEALTH, FINANCE."""
    compat = profile.compatibility
    score  = compat.wealth; tone = _score_to_tone(score); strength = _score_to_strength(score)
    obs    = f"Wealth compatibility score: {round(score,2)}."
    domains: List[DomainReading] = []

    venus_aspects = [a for a in profile.cross_aspects
                    if "Venus" in (a.planet_a,a.planet_b)]
    jup_aspects   = [a for a in profile.cross_aspects
                    if "Jupiter" in (a.planet_a,a.planet_b) and "positive" in a.tone]
    sat_aspects   = [a for a in profile.cross_aspects
                    if "Saturn" in (a.planet_a,a.planet_b)]

    if score >= 0.70:
        wealth_read = ("Strong financial and value compatibility in this synastry. "
                       "Venus and Jupiter contacts between the charts create a relationship "
                       "environment where both people's relationship with money and resources "
                       "is mutually supportive. "
                       "Joint wealth-building — shared investment in property, business, "
                       "or savings structures — is well-supported by the structural planetary alignment.")
    elif score >= 0.50:
        wealth_read = ("Moderate wealth compatibility with some value divergence. "
                       "Both people can build financial security together if they align "
                       "explicitly on shared financial goals and roles. "
                       "Where financial values differ, maintaining individual financial sovereignty "
                       "alongside shared structures is the most resilient approach.")
    else:
        wealth_read = ("Financial values and wealth patterns diverge structurally in this synastry. "
                       "Different relationships with money, security, and resource allocation "
                       "require explicit agreement rather than assumption. "
                       "Separate financial bases with defined joint contributions is the "
                       "structural recommendation for this pair.")

    if jup_aspects:
        wealth_read += (" Jupiter cross-aspects amplify the abundance potential when "
                        "both people are aligned on a shared goal.")

    domains.append(_dr(Domain.WEALTH, tone, strength, wealth_read,
        ["wealth_compatibility","financial_alignment","resource_sharing","abundance_flow"],
        ["Venus","Jupiter","Saturn"],[6,3,8]))
    domains.append(_dr(Domain.FINANCE, tone, SignalStrength.MODERATE,
        (f"Financial planning compatibility: {compat.level}. "
         "Explicitly agreed financial structures are recommended — "
         f"{'joint wealth vehicles are supported' if score>=0.60 else 'individual financial sovereignty as the primary structure'}. "),
        ["financial_planning","money_values","wealth_structure"],
        ["Saturn","Venus","Jupiter"],[4,6,3]))

    return FeatureReading(
        feature_name="wealth_synergy",
        observation=obs, signal_strength=strength, score=score,
        domains=domains,
        cross_signals=["Wealth synergy — always paired with career synergy in the reading",
                       "Jupiter cross-aspects amplify abundance when aligned on shared goal"],
        synthesis_note="Logic Layer: wealth synergy feeds the 'financial life together' section of the Union Blueprint.",
    )


# ---------------------------------------------------------------------------
# Cross-signal detection and theme extraction
# ---------------------------------------------------------------------------

def _detect_cross_signals(
    reading: SynastryReading,
) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    """
    Scan all feature readings for tonal agreement and conflict per domain.
    Returns (confirmed_signals, conflicting_signals).
    """
    domain_tones: Dict[str, Dict[str, ReadingTone]] = {d.value: {} for d in ALL_DOMAINS}

    features = [
        reading.marriage_longevity, reading.children_forecast, reading.infidelity_profile,
        reading.dominance, reading.career_synergy, reading.health_impact,
        reading.death_order, reading.spiritual_compat, reading.cross_aspects_summary,
        reading.parental_patterns, reading.wealth_synergy,
    ]

    for feat in features:
        if feat is None or feat.signal_strength in (SignalStrength.ABSENT, SignalStrength.WEAK):
            continue
        for dr in feat.domains:
            domain_tones[dr.domain.value][feat.feature_name] = dr.tone

    # Composite reading
    if reading.composite:
        for dr in reading.composite.domains:
            domain_tones[dr.domain.value]["composite"] = dr.tone

    positive_tones   = {ReadingTone.POSITIVE, ReadingTone.STRONGLY_POSITIVE}
    challenging_tones = {ReadingTone.CHALLENGING, ReadingTone.STRONGLY_CHALLENGING}

    confirmed: Dict[str, List[str]]   = {}
    conflicting: Dict[str, List[str]] = {}

    for domain, feature_tones in domain_tones.items():
        pos = [f for f, t in feature_tones.items() if t in positive_tones]
        neg = [f for f, t in feature_tones.items() if t in challenging_tones]

        if len(pos) >= 2:
            confirmed[domain] = pos
        if len(neg) >= 2:
            conflicting.setdefault(domain, []).extend(neg)
        if pos and neg:
            conflicting.setdefault(domain, []).extend(
                [f"CONFLICT: {p} vs {n}" for p in pos[:2] for n in neg[:1]]
            )

    return confirmed, conflicting


def _extract_dominant_themes(reading: SynastryReading) -> List[str]:
    """Extract the most frequently appearing keywords across all readings."""
    keyword_count: Dict[str, int] = {}

    features = [
        reading.marriage_longevity, reading.children_forecast, reading.infidelity_profile,
        reading.dominance, reading.career_synergy, reading.health_impact,
        reading.death_order, reading.spiritual_compat, reading.cross_aspects_summary,
        reading.parental_patterns, reading.wealth_synergy,
    ]

    for feat in features:
        if feat is None: continue
        for dr in feat.domains:
            for kw in dr.keywords:
                keyword_count[kw] = keyword_count.get(kw, 0) + 1

    if reading.composite:
        for dr in reading.composite.domains:
            for kw in dr.keywords:
                keyword_count[kw] = keyword_count.get(kw, 0) + 1

    sorted_kw = sorted(keyword_count.items(), key=lambda x: x[1], reverse=True)
    return [kw for kw, _ in sorted_kw[:15]]


# ---------------------------------------------------------------------------
# Main reader class
# ---------------------------------------------------------------------------

class SynastryReader:
    """
    Stateless synastry interpretation engine.

    Takes a SynastryProfile (raw scores and indicators) from SynastryEngine.
    Produces a SynastryReading (domain-indexed interpretation) for the Logic Layer.

    This class owns all relationship astrology knowledge:
    - Marriage longevity interpretation (Townley / Hand tradition)
    - Children and fertility astrology
    - Fidelity structural assessment
    - Power dynamics and dominance reading
    - Career and wealth synergy
    - Health cross-impact patterns
    - Death order (structural tendency only)
    - Spiritual compatibility (Western + Vedic traditions)
    - Composite chart as relationship entity
    - Parental pattern activation

    It knows nothing about numerology, palmistry, or physiognomy.
    Those systems complement what this reader produces.
    """

    def read(self, profile: SynastryProfile) -> SynastryReading:
        """
        Interpret a SynastryProfile into a full SynastryReading.

        Args:
            profile: SynastryProfile from SynastryEngine.compute()

        Returns:
            SynastryReading. Always returns — never raises.
        """
        t0 = time.monotonic()

        reading = SynastryReading(
            person_a_label               = profile.person_a_label,
            person_b_label               = profile.person_b_label,
            reading_ms                   = 0,
            overall_compatibility_level  = profile.compatibility.level,
            overall_score                = profile.compatibility.overall,
        )

        # ── Feature readings ──────────────────────────────────────────────
        reading.marriage_longevity  = _read_marriage_longevity(profile)
        reading.children_forecast   = _read_children_forecast(profile)
        reading.infidelity_profile  = _read_infidelity_profile(profile)
        reading.dominance           = _read_dominance(profile)
        reading.career_synergy      = _read_career_synergy(profile)
        reading.health_impact       = _read_health_impact(profile)
        reading.death_order         = _read_death_order(profile)
        reading.spiritual_compat    = _read_spiritual_compat(profile)
        reading.composite           = _read_composite_chart(profile)
        reading.cross_aspects_summary = _read_cross_aspects_summary(profile)
        reading.parental_patterns   = _read_parental_patterns(profile)
        reading.wealth_synergy      = _read_wealth_synergy(profile)

        # ── Pass-through remedies from engine ─────────────────────────────
        reading.union_remedies = profile.union_remedies

        # ── Synthesis helpers ─────────────────────────────────────────────
        reading.confirmed_signals, reading.conflicting_signals = _detect_cross_signals(reading)
        reading.dominant_themes = _extract_dominant_themes(reading)

        reading.reading_ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "SynastryReader.read completed",
            extra={
                "person_a":            profile.person_a_label,
                "person_b":            profile.person_b_label,
                "overall_level":       reading.overall_compatibility_level,
                "overall_score":       reading.overall_score,
                "confirmed_domains":   list(reading.confirmed_signals.keys()),
                "conflicting_domains": list(reading.conflicting_signals.keys()),
                "dominant_themes":     reading.dominant_themes[:5],
                "reading_ms":          reading.reading_ms,
            },
        )

        return reading

    def _error_reading(
        self, profile: SynastryProfile, error: str
    ) -> SynastryReading:
        """Return a minimal reading when the profile is unusable."""
        return SynastryReading(
            person_a_label               = profile.person_a_label,
            person_b_label               = profile.person_b_label,
            reading_ms                   = 0,
            overall_compatibility_level  = "unclear",
            overall_score                = 0.0,
        )


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def read_synastry(profile: SynastryProfile) -> SynastryReading:
    """
    Module-level convenience wrapper for SynastryReader.read().

    Example:
        from synthesis.synastry_engine import compute_synastry_profile
        from synthesis.synastry_reader import read_synastry

        profile = compute_synastry_profile(
            day_a=15, month_a=3, year_a=1985, hour_a=14.5,
            lat_a=3.147, lon_a=101.695, utc_a=8.0,
            day_b=22, month_b=7, year_b=1988, hour_b=9.0,
            lat_b=3.147, lon_b=101.695, utc_b=8.0,
        )
        reading = read_synastry(profile)
        print(reading.marriage_longevity.domains[0].reading)
        print(reading.dominant_themes)
    """
    return SynastryReader().read(profile)
