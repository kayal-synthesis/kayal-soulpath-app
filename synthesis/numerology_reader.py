"""
Numerology Reader — KAYAL Synthesis Platform
=============================================
Translates NumerologyProfile numbers into structured,
domain-indexed readings for the Logic Layer.

Follows the same architecture as palm_reader.py and face_reader.py:
    - Observer only: encodes what each number means, per domain
    - No interpretation beyond what numerology tradition establishes
    - Every reading carries astro_affinity and chinese_element
      for immediate Logic Layer cross-referencing
    - Temporal phase tagging: which numbers speak to past/present/future

v2.0.0 additions:
    - New fields in NumerologyReading: identity, health_detailed,
      spirit_indicators, sexuality, death_transition, children_forecast,
      legacy, parent_inheritance, infidelity_indicators, remedies
    - New reading functions: _read_identity, _read_health_detailed,
      _read_spirit_domain, _read_sexuality_domain, _read_death_transition,
      _read_children_forecast, _read_legacy_domain, _read_parent_inheritance,
      _read_infidelity_domain, _read_remedies_domain
    - New dataclass: SynastryNumerologyReading
    - New method: NumerologyReader.read_synastry()
    - New module function: read_synastry_numerology()
    - All v1.0.0 code preserved intact

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple

from .numerology_engine import (
    # v1.0.0 imports (preserved)
    NumerologyProfile,
    get_pyv_theme,
    get_month_theme,
    get_pinnacle_theme,
    get_challenge_theme,
    is_master,
    # v2.0.0 new imports
    get_week_theme,
    get_day_theme,
    infidelity_indicators_numerology,
    health_indicators_numerology,
    spirit_indicators_numerology,
    death_transition_indicators_num,
    children_timing_forecast_num,
    karmic_debt_cross_analysis,
    compute_compatibility_score,
    compatibility_verdict,
    union_destiny_numerology,
    parent_inheritance_numerology,
    name_correction_analysis,
    compute_partner_numerology,
)
from .logic.models import (
    Domain,
    ALL_DOMAINS,
    # v2.0.0 new imports
    CompatibilityLevel,
    InfidelityRisk,
    NumerologicalRemedy,
    PartnerBirthData,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Output contracts — mirror palm_reader.py exactly  (v1.0.0 — preserved)
# ---------------------------------------------------------------------------

class Domain2(str):
    pass  # Using string domain values directly


@dataclass
class NumDomainReading:
    domain:          str
    tone:            str          # "strongly_positive"/"positive"/"neutral"/"challenging"
    signal_strength: str          # "strong"/"moderate"/"weak"
    reading:         str
    keywords:        List[str]
    astro_affinity:  List[str]
    numerology_link: List[int]
    chinese_element: str
    temporal_phase:  str          # "past"/"present"/"future"/"timeless"


@dataclass
class NumFeatureReading:
    feature_name:    str
    observation:     str
    signal_strength: str
    domains:         List[NumDomainReading]
    cross_signals:   List[str]
    esoteric_note:   Optional[str]


@dataclass
class NumerologyReading:
    """
    Complete numerology reading payload for the Logic Layer.
    Mirrors PalmReading and FaceReading structure.
    v2.0.0: 10 new optional fields added — all existing fields preserved.
    """
    reading_ms:         int
    overall_confidence: float

    # v1.0.0 fields (preserved exactly)
    life_path:          Optional[NumFeatureReading] = None
    destiny:            Optional[NumFeatureReading] = None
    soul_urge:          Optional[NumFeatureReading] = None
    personality:        Optional[NumFeatureReading] = None
    birthday:           Optional[NumFeatureReading] = None
    current_pinnacle:   Optional[NumFeatureReading] = None
    personal_year:      Optional[NumFeatureReading] = None
    karmic_debts:       List[NumFeatureReading]     = field(default_factory=list)

    confirmed_signals:  Dict[str, List[str]]   = field(default_factory=dict)
    dominant_themes:    List[str]               = field(default_factory=list)

    # v2.0.0 new fields
    identity:             Optional[NumFeatureReading] = None
    health_detailed:      Optional[NumFeatureReading] = None
    spirit_indicators:    Optional[NumFeatureReading] = None
    sexuality:            Optional[NumFeatureReading] = None
    death_transition:     Optional[NumFeatureReading] = None
    children_forecast:    Optional[NumFeatureReading] = None
    legacy:               Optional[NumFeatureReading] = None
    parent_inheritance:   Optional[NumFeatureReading] = None
    infidelity_indicators:Optional[NumFeatureReading] = None
    remedies:             Optional[NumFeatureReading] = None

    def to_signal_list(self) -> List[Dict]:
        """Convert all readings to the signal dict format collector.py expects."""
        signals = []
        features = [
            self.life_path, self.destiny, self.soul_urge, self.personality,
            self.birthday, self.current_pinnacle, self.personal_year,
            # v2.0.0 new features
            self.identity, self.health_detailed, self.spirit_indicators,
            self.sexuality, self.death_transition, self.children_forecast,
            self.legacy, self.parent_inheritance, self.infidelity_indicators,
            self.remedies,
        ] + self.karmic_debts

        for feat in features:
            if feat is None:
                continue
            for dr in feat.domains:
                signals.append({
                    "feature":        feat.feature_name,
                    "domain":         dr.domain,
                    "tone":           dr.tone,
                    "strength":       0.90 if dr.signal_strength == "strong" else
                                      0.75 if dr.signal_strength == "moderate" else 0.50,
                    "reading":        dr.reading,
                    "keywords":       dr.keywords,
                    "astro_affinity": dr.astro_affinity,
                    "numerology_link":dr.numerology_link,
                    "chinese_element":dr.chinese_element,
                    "temporal_phase": dr.temporal_phase,
                })
        return signals

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# v2.0.0 new dataclass
# ---------------------------------------------------------------------------

@dataclass
class SynastryNumerologyReading:
    """
    Complete numerology reading for a union of two people.
    Contains individual readings plus union-level analysis.
    """
    reading_ms:            int
    overall_confidence:    float

    person_a_reading:      Optional[NumerologyReading] = None
    person_b_reading:      Optional[NumerologyReading] = None

    # Union-level analysis
    compatibility_score:   float                  = 0.0
    compatibility_level:   str                    = "moderate"
    compatibility_details: Dict                   = field(default_factory=dict)
    karmic_cross_analysis: Dict                   = field(default_factory=dict)
    union_destiny:         Dict                   = field(default_factory=dict)
    marriage_windows:      List[Dict]             = field(default_factory=list)

    # Domain-level union readings
    union_love_reading:    Optional[NumFeatureReading] = None
    union_wealth_reading:  Optional[NumFeatureReading] = None
    union_children_reading:Optional[NumFeatureReading] = None
    union_spirit_reading:  Optional[NumFeatureReading] = None
    union_destiny_reading: Optional[NumFeatureReading] = None

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def _dr(
    domain: str,
    tone: str,
    strength: str,
    reading: str,
    kw: List[str],
    astro: List[str],
    num: List[int],
    element: str = "earth",
    temporal: str = "timeless",
) -> NumDomainReading:
    return NumDomainReading(
        domain=domain, tone=tone, signal_strength=strength,
        reading=reading, keywords=kw, astro_affinity=astro,
        numerology_link=num, chinese_element=element,
        temporal_phase=temporal,
    )


# ---------------------------------------------------------------------------
# Life Path reading — the soul's core purpose  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_LIFE_PATH_READINGS: Dict[int, Dict[str, List]] = {
    1: {
        Domain.CAREER.value:    ("strongly_positive", "strong",
            "Life Path 1 is the pioneer and natural leader. Career thrives where initiative, independence, and originality are valued. You are not built to follow — you are built to begin.",
            ["leadership", "independence", "pioneering", "initiative"],
            ["Sun", "Aries", "Leo"], [1], "fire"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Original, courageous, and self-reliant. The shadow is self-importance — the lesson is leading through example, not authority.",
            ["originality", "courage", "self_reliance"],
            ["Sun", "Aries"], [1], "fire"),
        Domain.LOVE.value:      ("neutral", "moderate",
            "Independent in love — needs a partner who respects autonomy. Loves passionately but must not allow self-focus to eclipse partnership.",
            ["independence", "passion", "autonomy"],
            ["Sun", "Mars", "Aries"], [1], "fire"),
        Domain.SPIRITUAL.value: ("positive", "moderate",
            "The spiritual path of the 1 is direct experience. You find the divine through action and initiation — not through doctrine.",
            ["direct_experience", "initiation", "courage"],
            ["Sun", "Aries"], [1, 9], "fire"),
    },
    2: {
        Domain.LOVE.value:      ("strongly_positive", "strong",
            "Life Path 2 is the master of love, cooperation, and partnership. Relationships are not just part of life — they are the primary teacher. Deep empathy and the ability to truly listen.",
            ["partnership", "empathy", "cooperation", "sensitivity", "love"],
            ["Moon", "Venus", "Cancer", "Libra"], [2, 6], "water"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Diplomatic, sensitive, patient, and deeply intuitive. The shadow is self-erasure — the lesson is maintaining self while in deep connection.",
            ["diplomacy", "sensitivity", "patience", "intuition"],
            ["Moon", "Cancer", "Libra"], [2], "water"),
        Domain.CAREER.value:    ("positive", "moderate",
            "Thrives in cooperative environments, mediation, counselling, healing, and support roles. Not a lone pioneer — a master collaborator.",
            ["cooperation", "mediation", "counselling", "support"],
            ["Moon", "Venus", "Libra"], [2, 6], "water"),
        Domain.SPIRITUAL.value: ("positive", "moderate",
            "The spiritual path of the 2 is devotion and receptivity. The divine is found in the space between — in relationship, in silence, in surrender.",
            ["devotion", "receptivity", "surrender"],
            ["Moon", "Neptune", "Cancer"], [2, 11], "water"),
    },
    3: {
        Domain.CAREER.value:    ("strongly_positive", "strong",
            "Life Path 3 is the communicator, artist, and creative. Career flourishes in any field where expression, words, and creativity are the currency.",
            ["creativity", "communication", "expression", "artistry"],
            ["Jupiter", "Mercury", "Gemini", "Sagittarius"], [3], "fire"),
        Domain.LOVE.value:      ("positive", "moderate",
            "Charming, expressive, and romantic. Love is expressed through words, gestures, and creativity. The shadow is scattered attention.",
            ["charm", "expressiveness", "romance", "creativity"],
            ["Venus", "Jupiter", "Gemini"], [3, 6], "fire"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Joyful, optimistic, witty, and socially magnetic. The shadow is superficiality and scattering gifts without depth.",
            ["joy", "optimism", "wit", "creativity"],
            ["Jupiter", "Gemini"], [3], "fire"),
        Domain.SPIRITUAL.value: ("positive", "moderate",
            "The 3 finds the sacred in beauty, art, and joyful expression. Creativity is prayer.",
            ["creative_spirituality", "joy", "beauty"],
            ["Jupiter", "Neptune"], [3, 11], "fire"),
    },
    4: {
        Domain.CAREER.value:    ("strongly_positive", "strong",
            "Life Path 4 is the master builder. Career thrives where structure, systems, and sustained effort produce lasting results. Engineering, management, finance, and construction.",
            ["structure", "building", "systems", "endurance", "mastery"],
            ["Saturn", "Uranus", "Capricorn"], [4, 8], "earth"),
        Domain.WEALTH.value:    ("positive", "strong",
            "Wealth built brick by brick — slowly and permanently. Conservative financial instincts. Builds real assets that last.",
            ["conservative", "accumulation", "real_assets", "patience"],
            ["Saturn", "Capricorn", "Taurus"], [4, 8], "earth"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Reliable, disciplined, patient, and honest. The shadow is rigidity and resistance to change.",
            ["reliability", "discipline", "patience", "honesty"],
            ["Saturn", "Capricorn"], [4], "earth"),
        Domain.HEALTH.value:    ("neutral", "moderate",
            "The 4 tends to push through health signals rather than rest. The lesson is sustainable effort — the body requires maintenance, not just endurance.",
            ["endurance", "sustainability", "rest"],
            ["Saturn", "Virgo"], [4], "earth"),
    },
    5: {
        Domain.CAREER.value:    ("positive", "strong",
            "Life Path 5 thrives in dynamic, changing environments. Sales, travel, communications, marketing, and entrepreneurship. Cannot be caged in routine.",
            ["freedom", "change", "communication", "adaptability"],
            ["Mercury", "Gemini", "Sagittarius"], [5], "metal"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Adventurous, adaptable, curious, and freedom-loving. The shadow is restlessness, excess, and difficulty with commitment.",
            ["adventure", "adaptability", "curiosity", "freedom"],
            ["Mercury", "Uranus", "Gemini"], [5], "metal"),
        Domain.LOVE.value:      ("neutral", "moderate",
            "Needs freedom within commitment. Monotony is the enemy of this relationship. The partner must understand that 5 is loyal AND needs stimulation.",
            ["freedom", "stimulation", "adventure", "loyalty"],
            ["Mercury", "Venus", "Gemini"], [5], "metal"),
        Domain.SPIRITUAL.value: ("positive", "moderate",
            "The 5 discovers the sacred through experience — travel, exploration, and direct encounter with life's variety.",
            ["experiential_spirituality", "freedom", "exploration"],
            ["Mercury", "Uranus", "Sagittarius"], [5], "metal"),
    },
    6: {
        Domain.LOVE.value:      ("strongly_positive", "strong",
            "Life Path 6 is the number of love, home, and service. The deepest nurturer in numerology. Family and committed relationships are the primary life arena.",
            ["love", "family", "nurturing", "commitment", "service"],
            ["Venus", "Jupiter", "Libra", "Taurus"], [6, 2], "water"),
        Domain.CAREER.value:    ("positive", "moderate",
            "Healing, teaching, counselling, social work, and any field of service. Thrives where care and responsibility are expressed professionally.",
            ["healing", "teaching", "service", "responsibility"],
            ["Venus", "Jupiter", "Libra"], [6], "water"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Responsible, caring, harmonious, and protective. The shadow is perfectionism, martyrdom, and over-responsibility for others.",
            ["responsibility", "care", "harmony", "protectiveness"],
            ["Venus", "Libra", "Taurus"], [6], "water"),
        Domain.HEALTH.value:    ("positive", "moderate",
            "The 6 tends to care for others before self. The lesson is self-care as the foundation of service capacity.",
            ["self_care", "balance", "harmony"],
            ["Venus", "Virgo"], [6], "water"),
    },
    7: {
        Domain.SPIRITUAL.value: ("strongly_positive", "strong",
            "Life Path 7 is the seeker of truth. The most spiritually oriented of all Life Paths. Inner wisdom, solitude, and the pursuit of deeper understanding are the primary life themes.",
            ["wisdom", "seeking", "solitude", "truth", "inner_knowing"],
            ["Neptune", "Uranus", "Pisces", "Aquarius"], [7, 11], "water"),
        Domain.CAREER.value:    ("positive", "strong",
            "Research, science, philosophy, psychology, writing, and any field requiring depth and specialised knowledge.",
            ["research", "depth", "analysis", "philosophy", "writing"],
            ["Neptune", "Mercury", "Virgo"], [7], "water"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Analytical, introspective, perceptive, and spiritually attuned. The shadow is isolation, aloofness, and difficulty trusting others.",
            ["analysis", "introspection", "perception", "spiritual_depth"],
            ["Neptune", "Saturn", "Pisces"], [7], "water"),
        Domain.LOVE.value:      ("neutral", "moderate",
            "The 7 is selective and private in love. Needs a partner who respects depth and solitude. Not easily understood — but profoundly loving to those who earn access.",
            ["selectivity", "depth", "privacy", "profound_love"],
            ["Neptune", "Pisces"], [7], "water"),
    },
    8: {
        Domain.CAREER.value:    ("strongly_positive", "strong",
            "Life Path 8 is the number of power, authority, and material mastery. Born for positions of leadership, executive function, and financial achievement.",
            ["power", "authority", "achievement", "leadership", "mastery"],
            ["Saturn", "Pluto", "Capricorn", "Scorpio"], [8], "earth"),
        Domain.WEALTH.value:    ("strongly_positive", "strong",
            "The most financially oriented Life Path. Natural understanding of money, power, and how systems work. Wealth is the natural outcome of aligned effort.",
            ["financial_mastery", "power", "systems", "abundance"],
            ["Saturn", "Jupiter", "Capricorn"], [8], "earth"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Ambitious, authoritative, confident, and materially oriented. The shadow is control, materialism, and using power without wisdom.",
            ["ambition", "authority", "confidence", "power"],
            ["Saturn", "Capricorn"], [8], "earth"),
        Domain.SPIRITUAL.value: ("neutral", "moderate",
            "The spiritual path of the 8 is mastery in the material world as a spiritual practice. Power used in service is the 8's highest expression.",
            ["mastery", "service_through_power", "material_spirituality"],
            ["Saturn", "Pluto", "Capricorn"], [8, 4], "earth"),
    },
    9: {
        Domain.SPIRITUAL.value: ("strongly_positive", "strong",
            "Life Path 9 is the humanitarian and the old soul. The entire life is oriented toward service, wisdom, and the completion of cycles. One of the most spiritually significant paths.",
            ["service", "wisdom", "completion", "humanitarian", "old_soul"],
            ["Neptune", "Mars", "Pisces", "Aries"], [9, 3], "water"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Compassionate, idealistic, generous, and universal in love. The shadow is martyrdom, resentment, and difficulty releasing the past.",
            ["compassion", "idealism", "generosity", "universality"],
            ["Neptune", "Mars", "Pisces"], [9], "water"),
        Domain.CAREER.value:    ("positive", "strong",
            "Art, healing, social justice, education, and humanitarian work. Career has meaning only when it serves something larger than personal gain.",
            ["service", "art", "healing", "social_justice"],
            ["Neptune", "Jupiter", "Pisces"], [9, 3], "water"),
        Domain.LOVE.value:      ("positive", "moderate",
            "Loves universally and deeply. The challenge is loving the specific as much as the universal — intimate relationship alongside idealistic love of humanity.",
            ["universal_love", "depth", "idealism"],
            ["Neptune", "Venus", "Pisces"], [9, 6], "water"),
    },
    11: {
        Domain.SPIRITUAL.value: ("strongly_positive", "strong",
            "Life Path 11 is the Master Intuitive. The highest spiritual antenna in numerology. Psychic sensitivity, prophetic capacity, and the ability to inspire are natural gifts. The 11 is a channel — what comes through is for others.",
            ["psychic", "inspiration", "illumination", "channel", "master_intuitive"],
            ["Uranus", "Neptune", "Aquarius", "Pisces"], [11], "water"),
        Domain.CAREER.value:    ("positive", "strong",
            "Teaching, spiritual leadership, counselling, arts, and any work that inspires and uplifts. The 11 must work in a field that has meaning beyond income.",
            ["inspiration", "teaching", "spiritual_leadership", "arts"],
            ["Uranus", "Neptune", "Aquarius"], [11], "water"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Highly sensitive, visionary, idealistic, and naturally inspiring. The shadow is nervous tension, self-doubt, and difficulty grounding spiritual gifts in practical reality.",
            ["sensitivity", "vision", "inspiration", "idealism"],
            ["Uranus", "Neptune"], [11], "water"),
        Domain.LOVE.value:      ("positive", "moderate",
            "Deeply empathic and spiritually oriented in love. Seeks a soul partner, not just a companion. Intensity of feeling can be overwhelming without conscious management.",
            ["soul_connection", "empathy", "spiritual_love", "intensity"],
            ["Neptune", "Uranus", "Pisces"], [11, 2], "water"),
    },
    22: {
        Domain.CAREER.value:    ("strongly_positive", "strong",
            "Life Path 22 is the Master Builder — the most powerful Life Path. Capable of building lasting structures that serve humanity. The highest potential in numerology, carrying the weight of both 4 and 11.",
            ["master_builder", "legacy", "vision", "manifestation", "humanity_service"],
            ["Uranus", "Saturn", "Aquarius", "Capricorn"], [22], "earth"),
        Domain.CHARACTER.value: ("positive", "strong",
            "Visionary, disciplined, and capable of extraordinary achievement. The shadow is the gap between the grand vision and the daily discipline required to realise it.",
            ["vision", "discipline", "manifestation", "power"],
            ["Saturn", "Uranus", "Capricorn"], [22], "earth"),
        Domain.SPIRITUAL.value: ("positive", "strong",
            "The 22 is spiritual through building. The divine is expressed through what is created for the benefit of many. Service at scale is the spiritual path.",
            ["service_at_scale", "manifestation", "vision"],
            ["Saturn", "Uranus"], [22, 4], "earth"),
        Domain.WEALTH.value:    ("strongly_positive", "strong",
            "When aligned, the 22 can generate and manage wealth at a level most Life Paths cannot access. Financial mastery in service of a larger mission.",
            ["wealth_mastery", "manifestation", "large_scale"],
            ["Saturn", "Jupiter", "Capricorn"], [22, 8], "earth"),
    },
    33: {
        Domain.SPIRITUAL.value: ("strongly_positive", "strong",
            "Life Path 33 is the Master Teacher — the rarest and most spiritually elevated Life Path. Pure love expressed as service and wisdom. Teaching by being, not by instructing.",
            ["master_teacher", "unconditional_love", "wisdom_service", "sacred_teaching"],
            ["Neptune", "Venus", "Jupiter", "Pisces"], [33], "water"),
        Domain.CHARACTER.value: ("strongly_positive", "strong",
            "Embodied compassion and wisdom. The 33 carries the suffering of others with grace. The shadow is self-sacrifice at the cost of own spiritual development.",
            ["compassion", "wisdom", "grace", "sacred_service"],
            ["Neptune", "Venus", "Pisces"], [33], "water"),
        Domain.CAREER.value:    ("positive", "strong",
            "Healing, teaching at the highest level, spiritual leadership, and compassionate service in any form.",
            ["sacred_teaching", "healing", "spiritual_leadership"],
            ["Neptune", "Jupiter", "Pisces"], [33, 9], "water"),
    },
}


# ---------------------------------------------------------------------------
# Destiny number reading  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_DESTINY_THEMES: Dict[int, Tuple[str, str, List[str]]] = {
    1:  ("Leadership and originality is your destiny — pioneering paths others will follow", Domain.CAREER.value, ["leadership", "pioneering", "originality"]),
    2:  ("Partnership and mediation is your destiny — bringing harmony to divided spaces", Domain.LOVE.value, ["partnership", "harmony", "mediation"]),
    3:  ("Creative expression is your destiny — your words and art uplift those who encounter them", Domain.CAREER.value, ["creativity", "expression", "upliftment"]),
    4:  ("Building lasting foundations is your destiny — your work stands long after you", Domain.CAREER.value, ["building", "foundations", "legacy"]),
    5:  ("Freedom and experience is your destiny — you are here to explore and show others what is possible", Domain.CHARACTER.value, ["freedom", "exploration", "possibility"]),
    6:  ("Love, service and healing is your destiny — nurturing others toward wholeness", Domain.LOVE.value, ["love", "service", "healing"]),
    7:  ("Seeking and sharing wisdom is your destiny — your depth of understanding lights the way", Domain.SPIRITUAL.value, ["wisdom", "seeking", "illumination"]),
    8:  ("Material and spiritual mastery is your destiny — demonstrating that power can serve", Domain.CAREER.value, ["mastery", "power", "service"]),
    9:  ("Universal service is your destiny — your compassion and wisdom belong to everyone", Domain.SPIRITUAL.value, ["service", "wisdom", "compassion"]),
    11: ("Spiritual inspiration is your destiny — you are a channel for higher consciousness", Domain.SPIRITUAL.value, ["inspiration", "channel", "consciousness"]),
    22: ("Building for humanity is your destiny — your work serves generations, not just years", Domain.CAREER.value, ["legacy", "humanity", "building"]),
    33: ("Unconditional love in action is your destiny — wisdom expressed as pure compassionate service", Domain.SPIRITUAL.value, ["love", "wisdom", "service"]),
}


# ---------------------------------------------------------------------------
# Soul Urge reading  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_SOUL_URGE_THEMES: Dict[int, Tuple[str, str]] = {
    1:  ("Deep need for independence and the freedom to initiate", Domain.CHARACTER.value),
    2:  ("Deep need for love, harmony, and authentic connection", Domain.LOVE.value),
    3:  ("Deep need for creative expression and to be truly heard", Domain.CHARACTER.value),
    4:  ("Deep need for security, order, and tangible achievement", Domain.CHARACTER.value),
    5:  ("Deep need for freedom, experience, and constant stimulation", Domain.CHARACTER.value),
    6:  ("Deep need for family, harmony, and to be of genuine service", Domain.LOVE.value),
    7:  ("Deep need for solitude, understanding, and spiritual depth", Domain.SPIRITUAL.value),
    8:  ("Deep need for authority, achievement, and material mastery", Domain.CAREER.value),
    9:  ("Deep need to make a meaningful difference at the largest possible scale", Domain.SPIRITUAL.value),
    11: ("Deep need for spiritual understanding and to inspire others toward awakening", Domain.SPIRITUAL.value),
    22: ("Deep need to build something that outlasts you and serves many", Domain.CAREER.value),
    33: ("Deep need to love unconditionally and serve from that love", Domain.SPIRITUAL.value),
}


# ---------------------------------------------------------------------------
# Karmic debt readings  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

_KARMIC_READINGS: Dict[int, Dict] = {
    13: {
        Domain.CAREER.value:    ("challenging", "strong",
            "Karmic Debt 13 creates recurring lessons around effort and consistent work. "
            "Shortcuts collapse. What is built with patient, honest effort holds.",
            ["effort", "consistency", "honest_work"],
            ["Saturn", "Mars", "Capricorn"], [4, 8], "earth", "past"),
        Domain.CHARACTER.value: ("challenging", "strong",
            "The shadow of Debt 13 is the impulse to seek the easy path. "
            "The gift is that this soul knows how to build — once the resistance is overcome.",
            ["discipline", "endurance", "overcoming"],
            ["Saturn", "Capricorn"], [4], "earth", "past"),
    },
    14: {
        Domain.CHARACTER.value: ("challenging", "strong",
            "Karmic Debt 14 creates a pattern of excess and boundary dissolution. "
            "Freedom is found through structure, not despite it.",
            ["discipline", "boundaries", "structure"],
            ["Mercury", "Saturn", "Gemini"], [5, 4], "metal", "past"),
        Domain.HEALTH.value:    ("challenging", "moderate",
            "Debt 14 can manifest as physical excesses — addictive patterns, overindulgence. "
            "The body is the primary teacher of the 14's karmic lesson.",
            ["excess", "boundaries", "self_care"],
            ["Mercury", "Saturn"], [5], "metal", "past"),
    },
    16: {
        Domain.LOVE.value:      ("challenging", "strong",
            "Karmic Debt 16 creates patterns of sudden loss or dissolution in relationships "
            "when ego has taken over. The ego's constructions must fall — "
            "what is built in love survives, what is built in pride does not.",
            ["humility", "surrender", "love_over_pride"],
            ["Saturn", "Pluto", "Scorpio"], [7, 1], "water", "past"),
        Domain.SPIRITUAL.value: ("challenging", "strong",
            "Debt 16 is the spiritual awakener — through apparent failure, the soul discovers "
            "what is real. Every collapse in this number opens a deeper truth.",
            ["spiritual_awakening", "humility", "truth"],
            ["Pluto", "Saturn", "Scorpio"], [7], "water", "past"),
    },
    19: {
        Domain.CAREER.value:    ("challenging", "strong",
            "Karmic Debt 19 creates patterns of power misuse, dependency, or refusal to stand alone. "
            "True independence — taking full responsibility — is the karmic gift waiting to be claimed.",
            ["independence", "responsibility", "self_reliance"],
            ["Sun", "Saturn", "Aries"], [1, 8], "fire", "past"),
        Domain.CHARACTER.value: ("challenging", "strong",
            "The pattern of Debt 19 is either dominating others or becoming dependent on them. "
            "The middle path — interdependence with strong self — is the resolution.",
            ["self_reliance", "interdependence", "responsibility"],
            ["Sun", "Capricorn"], [1], "fire", "past"),
    },
}


# ---------------------------------------------------------------------------
# Personal Year reading  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def _read_personal_year(profile: NumerologyProfile) -> NumFeatureReading:
    py    = profile.personal_year
    theme = get_pyv_theme(py)
    pm    = profile.personal_month
    pw    = profile.personal_week
    pd    = profile.personal_day

    domains = []

    timing_domain_map = {
        1: [(Domain.CAREER.value, "positive", "Personal Year 1 opens new career chapters. Initiate boldly.", ["new_beginning", "career_start"]),
            (Domain.CHARACTER.value, "positive", "A year of personal reinvention and independent action.", ["reinvention", "independence"])],
        2: [(Domain.LOVE.value, "positive", "Personal Year 2 deepens relationships and partnerships.", ["relationship_deepening", "cooperation"]),
            (Domain.CHARACTER.value, "positive", "Patience and sensitivity are this year's primary lessons.", ["patience", "sensitivity"])],
        3: [(Domain.CAREER.value, "positive", "Personal Year 3 favours creative projects and communication.", ["creativity", "expression", "communication"]),
            (Domain.LOVE.value, "positive", "Romantic energy and social connections flourish.", ["romance", "social_expansion"])],
        4: [(Domain.CAREER.value, "positive", "Personal Year 4 demands disciplined building. Lay foundations now.", ["foundation", "discipline", "building"]),
            (Domain.WEALTH.value, "neutral", "Steady effort over speculation. The 4 year builds slowly.", ["steady_effort", "patience"])],
        5: [(Domain.CHARACTER.value, "positive", "Personal Year 5 brings change, freedom, and unexpected opportunities.", ["change", "freedom", "opportunity"]),
            (Domain.CAREER.value, "positive", "Career pivots and new directions are supported by this year's energy.", ["career_change", "freedom"])],
        6: [(Domain.LOVE.value, "strongly_positive", "Personal Year 6 is the year of love, family, and commitment.", ["love", "family", "commitment"]),
            (Domain.CAREER.value, "positive", "Service-oriented work and responsible roles are highlighted.", ["service", "responsibility"])],
        7: [(Domain.SPIRITUAL.value, "strongly_positive", "Personal Year 7 calls for reflection, solitude, and inner development.", ["reflection", "solitude", "inner_growth"]),
            (Domain.CHARACTER.value, "positive", "This year's wisdom comes from within, not from external achievement.", ["wisdom", "introspection"])],
        8: [(Domain.CAREER.value, "strongly_positive", "Personal Year 8 is the harvest — effort invested in previous years now yields results.", ["achievement", "harvest", "recognition"]),
            (Domain.WEALTH.value, "strongly_positive", "Financial momentum and material achievement are strongly supported.", ["financial_achievement", "momentum"])],
        9: [(Domain.SPIRITUAL.value, "positive", "Personal Year 9 calls for completion, release, and preparation for new cycle.", ["completion", "release", "wisdom"]),
            (Domain.CHARACTER.value, "positive", "Let go of what no longer serves. This year ends chapters.", ["releasing", "completion"])],
        11: [(Domain.SPIRITUAL.value, "strongly_positive", "Master Year 11 brings heightened spiritual awareness and inspired ideas.", ["spiritual_awareness", "inspiration", "illumination"]),
             (Domain.CHARACTER.value, "positive", "Sensitivity is elevated — protect your energy and trust intuitive signals.", ["sensitivity", "intuition"])],
        22: [(Domain.CAREER.value, "strongly_positive", "Master Year 22 — grand visions can manifest. Build with purpose.", ["manifestation", "grand_vision", "building"]),
             (Domain.SPIRITUAL.value, "positive", "Service at scale is supported. What you build now has lasting impact.", ["service", "legacy"])],
    }

    year_domains = timing_domain_map.get(py, timing_domain_map.get(py % 9 or 9, []))
    for dom, tone, reading, kw in year_domains:
        domains.append(_dr(
            dom, tone, "strong", reading, kw,
            ["Jupiter", "Saturn"], [py], "earth", "present"
        ))

    month_theme = get_month_theme(pm)
    domains.append(_dr(
        Domain.TIMING.value, "neutral", "moderate",
        f"Personal Month {pm}: {month_theme}. Weekly vibration {pw}, daily vibration {pd}.",
        ["monthly_energy", "timing"],
        ["Moon"], [pm], "water", "present"
    ))

    return NumFeatureReading(
        feature_name    = "personal_year",
        observation     = (
            f"Personal Year {py} ({theme}). "
            f"Personal Month {pm}, Week {pw}, Day {pd}."
        ),
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Personal Year — cross-reference with current Pinnacle for timing confirmation"],
        esoteric_note   = (
            f"In Kabbalistic numerology, Personal Year {py} corresponds to the "
            f"{'Kether (Crown)' if py == 1 else 'Yesod (Foundation)' if py == 9 else str(py) + 'th sephirah energy'}."
            if py in (1, 9) else None
        ),
    )


# ---------------------------------------------------------------------------
# Birthday system reading  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def _read_birthday(profile: NumerologyProfile, day: int) -> NumFeatureReading:
    gift      = profile.birthday_gift
    challenge = profile.birthday_challenge

    domains = [
        _dr(Domain.CHARACTER.value, "positive", "strong",
            f"Birthday Gift {gift}: this is a natural talent you arrived with. "
            f"It manifests effortlessly when you are in alignment. "
            f"Birthday Challenge {challenge}: this is the specific area that requires conscious work throughout life.",
            ["innate_gift", "natural_talent", "specific_challenge"],
            ["Sun", "Moon"], [gift, challenge], "earth", "timeless"),
        _dr(Domain.CAREER.value, "positive", "moderate",
            f"Birthday Gift {gift} represents a specific professional strength that distinguishes your contribution.",
            ["natural_strength", "professional_gift"],
            ["Sun"], [gift], "earth", "timeless"),
    ]

    return NumFeatureReading(
        feature_name    = "birthday_system",
        observation     = f"Born on the {day}th. Birthday Gift: {gift}. Birthday Challenge: {challenge}.",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Birthday gift — confirm with Life Path for complementary strength"],
        esoteric_note   = None,
    )


# ---------------------------------------------------------------------------
# Current Pinnacle reading  (v1.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

def _read_current_pinnacle(profile: NumerologyProfile) -> NumFeatureReading:
    cp       = profile.current_pinnacle
    theme    = get_pinnacle_theme(cp.number)
    ch_theme = get_challenge_theme(cp.challenge)
    timing   = (
        f"Ages {cp.start_age} to {cp.end_age}"
        if cp.end_age else f"Age {cp.start_age} onward"
    )

    domains = [
        _dr(Domain.CAREER.value, "positive", "strong",
            f"Current Pinnacle {cp.number} ({timing}): {theme} "
            f"Challenge: {ch_theme}",
            ["pinnacle_theme", "life_cycle", "current_period"],
            ["Saturn", "Jupiter"], [cp.number], "earth", "present"),
        _dr(Domain.CHARACTER.value, "positive", "strong",
            f"The current pinnacle ({cp.number}) defines the overarching theme of this life phase. "
            f"Understanding this cycle provides the context for all current experiences.",
            ["life_phase", "cycle_awareness"],
            ["Saturn"], [cp.number], "earth", "present"),
        _dr(Domain.TIMING.value, "positive", "strong",
            f"Pinnacle {cp.number} is active {timing}. "
            f"This is the structural timing layer beneath all current personal year cycles.",
            ["pinnacle_timing", "structural_cycle"],
            ["Saturn", "Jupiter"], [cp.number], "earth", "present"),
    ]

    pinnacles = profile.pinnacles
    curr_idx  = next(i for i, p in enumerate(pinnacles) if p.is_current)
    if curr_idx < 3:
        next_p = pinnacles[curr_idx + 1]
        domains.append(_dr(
            Domain.TIMING.value, "positive", "moderate",
            f"Next pinnacle ({next_p.number}) begins at age {next_p.start_age}: {get_pinnacle_theme(next_p.number)}",
            ["next_cycle", "future_theme"],
            ["Saturn"], [next_p.number], "earth", "future",
        ))

    return NumFeatureReading(
        feature_name    = "current_pinnacle",
        observation     = f"Pinnacle {cp.number} ({timing}): {theme}",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Pinnacle — cross-reference with Personal Year for layered timing"],
        esoteric_note   = (
            "In Kabbalistic numerology, Pinnacles correspond to the "
            "major arcs of the soul's journey through the Tree of Life."
        ),
    )


# ===========================================================================
# v2.0.0 — NEW READING FUNCTIONS
# All v1.0.0 functions above preserved exactly.
# ===========================================================================

# ---------------------------------------------------------------------------
# Identity / Soul Foundation reading
# ---------------------------------------------------------------------------

_IDENTITY_READINGS: Dict[int, Tuple[str, str, List[str]]] = {
    1:  ("The Pioneer — a soul encoded with the archetype of origination. You arrived to begin things, not to maintain them. Your identity is fundamentally individual.",
         "fire", ["pioneer", "originator", "individual", "courage"]),
    2:  ("The Diplomat — a soul encoded with the archetype of union. You arrived to bridge divides and create harmony. Your identity is fundamentally relational.",
         "water", ["diplomat", "bridge_builder", "harmoniser", "empathy"]),
    3:  ("The Creator — a soul encoded with the archetype of expression. You arrived to add beauty, joy, and creative meaning to the world.",
         "fire", ["creator", "artist", "communicator", "joy"]),
    4:  ("The Builder — a soul encoded with the archetype of foundation. You arrived to construct what endures. Your identity is fundamentally practical and purposeful.",
         "earth", ["builder", "architect", "disciplinarian", "endurance"]),
    5:  ("The Explorer — a soul encoded with the archetype of freedom. You arrived to experience the full range of life and show others what is possible.",
         "metal", ["explorer", "freedom_seeker", "adventurer", "catalyst"]),
    6:  ("The Nurturer — a soul encoded with the archetype of love. You arrived to care, heal, and create beauty. Your identity is fundamentally devoted.",
         "water", ["nurturer", "healer", "devoted", "responsible"]),
    7:  ("The Seeker — a soul encoded with the archetype of truth. You arrived to understand life at its deepest level and share what you discover.",
         "water", ["seeker", "analyst", "truth_finder", "wisdom_keeper"]),
    8:  ("The Authority — a soul encoded with the archetype of power. You arrived to demonstrate how strength can serve. Your identity is fundamentally commanding.",
         "earth", ["authority", "power_wielder", "achiever", "leader"]),
    9:  ("The Humanitarian — a soul encoded with the archetype of completion. You arrived to serve, to love universally, and to close the cycles that need closing.",
         "water", ["humanitarian", "old_soul", "servant", "wisdom_bearer"]),
    11: ("The Illuminator — a Master soul encoded with the archetype of inspiration. You arrived as a channel for higher consciousness. Your identity is fundamentally sacred.",
         "water", ["illuminator", "channel", "master_intuitive", "visionary"]),
    22: ("The Master Builder — the most powerful soul archetype in numerology. You arrived to create lasting structures that serve humanity far beyond your own lifetime.",
         "earth", ["master_builder", "legacy_creator", "visionary", "world_servant"]),
    33: ("The Master Teacher — the rarest soul archetype. You arrived to embody unconditional love and wisdom. Teaching not by instruction but by being.",
         "water", ["master_teacher", "unconditional_love", "wisdom_embodiment", "sacred_servant"]),
}


def _read_identity(profile: NumerologyProfile) -> NumFeatureReading:
    lp = profile.life_path
    archetype, element, keywords = _IDENTITY_READINGS.get(
        lp, (f"A soul on a unique Life Path {lp} journey", "earth", ["soul_path", "identity"])
    )

    domains = [
        _dr(Domain.IDENTITY.value if hasattr(Domain, 'IDENTITY') else Domain.CHARACTER.value,
            "positive", "strong", archetype, keywords,
            ["Sun", "Ascendant"], [lp], element, "timeless"),
        _dr(Domain.CHARACTER.value, "positive", "strong",
            f"Your soul archetype shapes every major decision and relationship. "
            f"Life Path {lp} is not what you do — it is what you are.",
            ["soul_identity", "core_archetype", "essence"],
            ["Sun", "Moon", "Ascendant"], [lp], element, "timeless"),
        _dr(Domain.SPIRITUAL.value, "positive", "moderate",
            f"The spiritual purpose encoded in Life Path {lp}: "
            f"{'Master Number — carries elevated spiritual responsibility.' if is_master(lp) else 'Your soul chose this path for specific evolutionary reasons.'}",
            ["soul_purpose", "spiritual_identity"],
            ["Neptune", "Sun"], [lp], element, "timeless"),
    ]

    return NumFeatureReading(
        feature_name    = "identity_soul_foundation",
        observation     = f"Life Path {lp} — Archetype: {archetype[:40]}...",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Identity — foundation for all domain readings"],
        esoteric_note   = (
            f"Master Number {lp} souls often spend the first half of life "
            "operating at the lower vibration before the higher path opens."
            if is_master(lp) else None
        ),
    )


# ---------------------------------------------------------------------------
# Health — detailed domain reading
# ---------------------------------------------------------------------------

def _read_health_detailed(profile: NumerologyProfile) -> NumFeatureReading:
    health_data = health_indicators_numerology(profile)

    domains = []

    # Primary vulnerability
    for vuln in health_data.get("vulnerabilities", []):
        domains.append(_dr(
            Domain.HEALTH.value, "challenging", "strong",
            f"{vuln['source']}: Vulnerability in {vuln['organs']}. {vuln['pattern']}",
            ["health_vulnerability", "organ_risk", vuln["organs"].replace(",", "").split()[0]],
            ["Saturn", "Mars", "Virgo"], [profile.life_path], "earth", "timeless"
        ))

    # Strengths
    for strength in health_data.get("strengths", []):
        domains.append(_dr(
            Domain.HEALTH.value, "positive", "moderate",
            strength,
            ["health_strength", "vitality"],
            ["Jupiter", "Sun"], [profile.personal_year], "fire", "present"
        ))

    # Personal Year health window
    if profile.personal_year == 7:
        domains.append(_dr(
            Domain.HEALTH.value, "positive", "strong",
            "Personal Year 7 — prime year for deep healing, rest, and restoration. Invest in health this year.",
            ["healing_year", "restoration", "rest"],
            ["Neptune", "Virgo"], [7], "water", "present"
        ))
    elif profile.personal_year in (4, 8):
        domains.append(_dr(
            Domain.HEALTH.value, "neutral", "moderate",
            f"Personal Year {profile.personal_year} — high-output year. Risk of neglecting health through overwork.",
            ["overwork_risk", "health_vigilance"],
            ["Saturn"], [profile.personal_year], "earth", "present"
        ))

    return NumFeatureReading(
        feature_name    = "health_detailed",
        observation     = health_data.get("health_summary", "Health profile computed"),
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Health — cross-reference with current Pinnacle for major health windows"],
        esoteric_note   = "In numerology, the 6th house equivalent is the personal challenge number.",
    )


# ---------------------------------------------------------------------------
# Spirit world indicators reading
# ---------------------------------------------------------------------------

def _read_spirit_domain(profile: NumerologyProfile) -> NumFeatureReading:
    spirit_data = spirit_indicators_numerology(profile)

    domains = []

    for indicator in spirit_data.get("spirit_indicators", []):
        domains.append(_dr(
            Domain.SPIRIT_WORLD.value if hasattr(Domain, 'SPIRIT_WORLD') else Domain.SPIRITUAL.value,
            "positive" if "naturally" in indicator or "sensitivity" in indicator else "challenging",
            "strong",
            indicator,
            ["spirit_indicator", "ancestral", "psychic"],
            ["Neptune", "Pluto", "Pisces"], [profile.life_path], "water", "past"
        ))

    # Psychic sensitivity
    sensitivity = spirit_data.get("psychic_sensitivity", "average")
    domains.append(_dr(
        Domain.SPIRITUAL.value, "positive",
        "strong" if sensitivity == "high" else "moderate",
        f"Psychic sensitivity: {sensitivity}. "
        f"Protection level: {spirit_data.get('protection_level', 'moderate')}.",
        ["psychic_sensitivity", "spiritual_protection"],
        ["Neptune", "Uranus", "Pisces"], [profile.life_path, 11], "water", "timeless"
    ))

    # Ancestral note
    domains.append(_dr(
        Domain.SPIRIT_WORLD.value if hasattr(Domain, 'SPIRIT_WORLD') else Domain.SPIRITUAL.value,
        "neutral", "moderate",
        spirit_data.get("ancestral_note", "Ancestral pattern analysis complete."),
        ["ancestral_karma", "bloodline", "generational"],
        ["Saturn", "Pluto", "South_Node"], [profile.destiny], "water", "past"
    ))

    return NumFeatureReading(
        feature_name    = "spirit_indicators",
        observation     = spirit_data.get("spirit_summary", "Spirit indicators computed"),
        signal_strength = "strong" if spirit_data.get("spirit_indicators") else "moderate",
        domains         = domains,
        cross_signals   = ["Spirit indicators — triggers spiritual remedy protocol"],
        esoteric_note   = "The 12th house in astrology and Karmic Debt numbers share the same function in their respective systems.",
    )


# ---------------------------------------------------------------------------
# Sexuality reading
# ---------------------------------------------------------------------------

_SEXUALITY_READINGS: Dict[int, Tuple[str, str, List[str]]] = {
    1:  ("Life Path 1 sexuality: intense, initiating, and physically direct. Prefers to lead. Passion is strong but must be matched with emotional presence to sustain.",
         "fire", ["initiating", "direct", "passionate", "physical"]),
    2:  ("Life Path 2 sexuality: deeply sensual, emotionally connected, and tender. Cannot separate physical intimacy from emotional safety. The most loyal of sexual energies.",
         "water", ["sensual", "emotional_connection", "tender", "loyal"]),
    3:  ("Life Path 3 sexuality: playful, expressive, and creative. Needs variety in expression but not necessarily in partners. Communicates openly about desire.",
         "fire", ["playful", "expressive", "creative", "communicative"]),
    4:  ("Life Path 4 sexuality: steady, physical, and deeply loyal. Not expressive by instinct — but reliable and deeply satisfying when trusted. Needs security before opening.",
         "earth", ["steady", "physical", "loyal", "needs_security"]),
    5:  ("Life Path 5 sexuality: adventurous, freedom-loving, and highly physical. Variety in experience — not necessarily partners — is a genuine need. Monotony kills desire.",
         "metal", ["adventurous", "freedom", "variety", "highly_physical"]),
    6:  ("Life Path 6 sexuality: deeply romantic, devoted, and expressive. Love and physical intimacy are inseparable. The most giving sexual nature — sometimes to own depletion.",
         "water", ["romantic", "devoted", "giving", "love_physical_unity"]),
    7:  ("Life Path 7 sexuality: private, selective, and deeply intimate. Sexual expression requires profound trust. When that trust exists, the depth of connection is extraordinary.",
         "water", ["private", "selective", "deep_intimacy", "trust_required"]),
    8:  ("Life Path 8 sexuality: powerful, commanding, and intense. Prefers to be in control. Physical vitality is strong. Intimacy is an extension of personal power dynamics.",
         "earth", ["powerful", "commanding", "intense", "control"]),
    9:  ("Life Path 9 sexuality: universal and spiritually tinged. Physical intimacy is experienced as sacred exchange. The risk is loving the ideal of the person rather than the specific.",
         "water", ["spiritual_intimacy", "sacred", "universal_love", "idealistic"]),
    11: ("Life Path 11 sexuality: deeply psychic and spiritually attuned. Physical intimacy is experienced as an energetic merging. Absorbs partner's energy — protection and boundaries essential.",
         "water", ["psychic_intimacy", "energetic_merging", "spiritual", "absorbing"]),
    22: ("Life Path 22 sexuality: purposeful, intensely physical, and deeply loyal. The body is treated as an instrument of building and creation. Sexual energy is channelled into life work.",
         "earth", ["purposeful", "physical", "loyal", "channelled_energy"]),
    33: ("Life Path 33 sexuality: sacredly devoted, unconditionally loving, and deeply giving. Physical intimacy is an act of consecration. Risk is complete self-giving without receipt.",
         "water", ["sacred_devotion", "unconditional", "giving", "consecrated"]),
}


def _read_sexuality_domain(profile: NumerologyProfile) -> NumFeatureReading:
    lp = profile.life_path
    reading, element, keywords = _SEXUALITY_READINGS.get(
        lp, (f"Life Path {lp} sexuality: unique expression requiring personal exploration.", "earth", ["sexuality", "intimacy"])
    )

    domains = [
        _dr(Domain.SEXUALITY.value if hasattr(Domain, 'SEXUALITY') else Domain.LOVE.value,
            "positive", "strong", reading, keywords,
            ["Venus", "Mars", "Pluto", "Scorpio"], [lp], element, "timeless"),
        _dr(Domain.LOVE.value, "positive", "moderate",
            f"Sexual and romantic compatibility note: Life Path {lp} needs a partner "
            f"who {'respects autonomy and pace' if lp in (1, 7) else 'provides emotional safety' if lp in (2, 4, 6) else 'can match energy and openness'}.",
            ["sexual_compatibility", "partner_needs"],
            ["Venus", "Mars"], [lp], element, "timeless"),
    ]

    # Karmic debt 16 adds sexual/intimacy wound indicator
    for debt in profile.karmic_debts:
        if debt.value == 16:
            domains.append(_dr(
                Domain.SEXUALITY.value if hasattr(Domain, 'SEXUALITY') else Domain.LOVE.value,
                "challenging", "strong",
                "Karmic Debt 16 may manifest as intimacy wounds — patterns of sudden loss or "
                "betrayal in love that require healing before full sexual-emotional openness is possible.",
                ["intimacy_wound", "karmic_intimacy", "healing_required"],
                ["Pluto", "Saturn", "Scorpio"], [16], "water", "past"
            ))

    return NumFeatureReading(
        feature_name    = "sexuality_profile",
        observation     = f"Life Path {lp} sexual nature: {keywords[0]} and {keywords[1]}",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Sexuality — cross-reference with Mars and Venus positions in astrology"],
        esoteric_note   = None,
    )


# ---------------------------------------------------------------------------
# Death and transition reading
# ---------------------------------------------------------------------------

def _read_death_transition(profile: NumerologyProfile) -> NumFeatureReading:
    transition_data = death_transition_indicators_num(profile)

    longevity = transition_data.get("longevity_tendency", "average")
    tone      = "positive" if longevity == "long" else \
                "neutral"  if longevity == "average" else "challenging"

    domains = [
        _dr(Domain.DEATH_TRANSITION.value if hasattr(Domain, 'DEATH_TRANSITION') else Domain.SPIRITUAL.value,
            tone, "moderate",
            transition_data.get("transition_note", "Longevity assessment complete."),
            ["longevity", "transition", "life_span"],
            ["Saturn", "Pluto", "Scorpio"], [profile.life_path], "water", "future"),
    ]

    for factor in transition_data.get("longevity_factors", []):
        domains.append(_dr(
            Domain.HEALTH.value, "positive", "moderate",
            factor, ["longevity_factor", "life_extension"],
            ["Jupiter", "Saturn"], [profile.life_path], "earth", "timeless"
        ))

    for caution in transition_data.get("caution_factors", []):
        domains.append(_dr(
            Domain.HEALTH.value, "challenging", "moderate",
            caution, ["longevity_caution", "life_risk"],
            ["Saturn", "Mars"], [profile.life_path], "earth", "timeless"
        ))

    # 9th year / completion cycle note
    if profile.personal_year == 9:
        domains.append(_dr(
            Domain.TIMING.value, "neutral", "moderate",
            "Personal Year 9 — a cycle completion year. Major chapters close. "
            "Not a death indicator, but a natural transition and release point.",
            ["cycle_completion", "year_9", "release"],
            ["Saturn", "Pluto"], [9], "water", "present"
        ))

    return NumFeatureReading(
        feature_name    = "death_transition",
        observation     = f"Longevity tendency: {longevity}",
        signal_strength = "moderate",
        domains         = domains,
        cross_signals   = ["Death/Transition — cross-reference with 8th house indicators in astrology"],
        esoteric_note   = (
            "In numerology, the 9 Life Path and 9 Personal Year both carry completion energy. "
            "True longevity is determined by lifestyle choices more than any single indicator."
        ),
    )


# ---------------------------------------------------------------------------
# Children forecast reading
# ---------------------------------------------------------------------------

def _read_children_forecast(profile: NumerologyProfile) -> NumFeatureReading:
    forecast = children_timing_forecast_num(
        birth_day   = profile.personal_day,   # Use as proxy — will be overridden by actual DOB
        birth_month = profile.personal_month,
        birth_year  = 1990,                   # Placeholder — real year passed in compute flow
        look_ahead  = 10,
    )

    domains = []

    # Life Path children indicators
    _LP_CHILDREN = {
        2:  ("strongly_positive", "Life Path 2 is deeply parental — children are a primary life theme."),
        4:  ("positive", "Life Path 4 provides stable, structured parenting — the disciplinarian with deep love."),
        6:  ("strongly_positive", "Life Path 6 is the most family-oriented path — parenthood is a sacred calling."),
        9:  ("positive", "Life Path 9 parents universally — equally devoted to own children and the world's children."),
        11: ("positive", "Life Path 11 parents with deep empathy and spiritual sensitivity."),
        5:  ("neutral", "Life Path 5 needs freedom — parenthood requires conscious commitment to presence."),
        7:  ("neutral", "Life Path 7 is selective — parenting can feel at odds with the need for solitude."),
        1:  ("neutral", "Life Path 1 parents with strength and leadership — must guard against self-focus."),
    }

    lp_tone, lp_note = _LP_CHILDREN.get(
        profile.life_path,
        ("neutral", f"Life Path {profile.life_path} brings unique parenting qualities.")
    )
    domains.append(_dr(
        Domain.CHILDREN_FORECAST.value if hasattr(Domain, 'CHILDREN_FORECAST') else Domain.LOVE.value,
        lp_tone, "strong", lp_note,
        ["parenting_nature", "children_relationship"],
        ["Moon", "Venus", "Cancer"], [profile.life_path], "water", "timeless"
    ))

    # Favourable conception years
    for year_data in forecast.get("favourable_years", [])[:3]:
        domains.append(_dr(
            Domain.CHILDREN_FORECAST.value if hasattr(Domain, 'CHILDREN_FORECAST') else Domain.LOVE.value,
            "positive", "strong",
            f"Year {year_data['year']} (Personal Year {year_data['personal_year']}): {year_data['note']}",
            ["conception_window", "fertility_year", f"py_{year_data['personal_year']}"],
            ["Moon", "Venus", "Jupiter"], [year_data['personal_year']], "water", "future"
        ))

    return NumFeatureReading(
        feature_name    = "children_forecast",
        observation     = forecast.get("summary", "Children forecast computed"),
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Children — cross-reference with 5th house and Venus in astrology"],
        esoteric_note   = "Personal Years 2, 6, and 9 carry the strongest child energy in numerology.",
    )


# ---------------------------------------------------------------------------
# Legacy and reputation reading
# ---------------------------------------------------------------------------

_LEGACY_READINGS: Dict[int, Tuple[str, List[str]]] = {
    1:  ("Legacy of the Pioneer: remembered as the one who began things others built upon. Original, courageous, and ahead of the time.",
         ["pioneer_legacy", "originator", "innovative_memory"]),
    2:  ("Legacy of the Peacemaker: remembered for bringing harmony, facilitating connections, and making people feel heard.",
         ["peacemaker_legacy", "connector", "harmony_builder"]),
    3:  ("Legacy of the Creator: remembered through creative works, words, and the joy brought to others.",
         ["creative_legacy", "artistic_memory", "expression"]),
    4:  ("Legacy of the Builder: remembered through what was constructed — systems, organisations, and foundations that outlast the person.",
         ["builder_legacy", "structural_memory", "lasting_foundations"]),
    5:  ("Legacy of the Explorer: remembered as someone who lived fully, showed others what was possible, and never stopped growing.",
         ["explorer_legacy", "freedom_legacy", "life_fully_lived"]),
    6:  ("Legacy of Love: remembered as a devoted parent, healer, and servant of family and community. Love made visible.",
         ["love_legacy", "family_memory", "service_remembered"]),
    7:  ("Legacy of Wisdom: remembered as a teacher of depth and truth. The body of knowledge left behind serves those who come after.",
         ["wisdom_legacy", "truth_keeper", "depth_memory"]),
    8:  ("Legacy of Achievement: remembered through material and institutional structures built. Power exercised in service.",
         ["achievement_legacy", "power_legacy", "material_memory"]),
    9:  ("Legacy of Service: remembered as someone who gave everything — humanitarian, artist, teacher of wisdom.",
         ["service_legacy", "humanitarian_memory", "completion"]),
    11: ("Legacy of Inspiration: remembered for the light brought into others' lives — the ideas, the art, the awakening.",
         ["inspiration_legacy", "illumination_memory", "spiritual_legacy"]),
    22: ("Legacy of the Ages: remembered through lasting institutions, movements, or works that serve humanity across generations.",
         ["generational_legacy", "master_builder_memory", "humanity_service"]),
    33: ("Legacy of Sacred Love: remembered as an embodiment of what unconditional love looks like in a human life.",
         ["sacred_love_legacy", "master_teacher_memory", "love_embodied"]),
}


def _read_legacy_domain(profile: NumerologyProfile) -> NumFeatureReading:
    lp = profile.life_path
    legacy_reading, keywords = _LEGACY_READINGS.get(
        lp, (f"Legacy of Life Path {lp}: a unique contribution remembered by those whose lives were touched.", ["personal_legacy"])
    )

    domains = [
        _dr(Domain.LEGACY.value if hasattr(Domain, 'LEGACY') else Domain.CHARACTER.value,
            "positive", "strong", legacy_reading, keywords,
            ["Saturn", "Jupiter", "Sun"], [lp], "earth", "future"),
        _dr(Domain.CAREER.value, "positive", "moderate",
            f"Professional legacy for Life Path {lp}: "
            f"{'building institutions' if lp in (4, 8, 22) else 'inspiring others' if lp in (3, 9, 11, 33) else 'leaving a body of wisdom' if lp == 7 else 'loving service' if lp in (2, 6) else 'pioneering new ground'}.",
            ["professional_legacy", "career_memory"],
            ["Saturn", "Sun"], [lp, profile.destiny], "earth", "future"),
    ]

    # Destiny contribution
    dest_theme, dest_dom, dest_kw = _DESTINY_THEMES.get(
        profile.destiny,
        ("Unique destiny contribution", Domain.CHARACTER.value, ["destiny_legacy"])
    )
    domains.append(_dr(
        Domain.LEGACY.value if hasattr(Domain, 'LEGACY') else Domain.CHARACTER.value,
        "positive", "strong",
        f"Destiny {profile.destiny} shapes the legacy: {dest_theme}",
        dest_kw + ["destiny_legacy"],
        ["Jupiter", "Sun"], [profile.destiny], "earth", "future"
    ))

    return NumFeatureReading(
        feature_name    = "legacy_domain",
        observation     = f"Life Path {lp} legacy archetype identified",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Legacy — cross-reference with 10th house (public standing) in astrology"],
        esoteric_note   = None,
    )


# ---------------------------------------------------------------------------
# Parent inheritance reading
# ---------------------------------------------------------------------------

def _read_parent_inheritance(
    profile:      NumerologyProfile,
    father_name:  Optional[str] = None,
    mother_name:  Optional[str] = None,
) -> NumFeatureReading:
    inheritance = parent_inheritance_numerology(profile, father_name, mother_name)

    domains = []

    for note in inheritance.get("father_inheritance", []):
        domains.append(_dr(
            Domain.PARENTS.value if hasattr(Domain, 'PARENTS') else Domain.CHARACTER.value,
            "neutral", "moderate", note,
            ["father_inheritance", "paternal_pattern"],
            ["Sun", "Saturn", "Capricorn"], [profile.life_path], "earth", "past"
        ))

    for note in inheritance.get("mother_inheritance", []):
        domains.append(_dr(
            Domain.PARENTS.value if hasattr(Domain, 'PARENTS') else Domain.CHARACTER.value,
            "neutral", "moderate", note,
            ["mother_inheritance", "maternal_pattern"],
            ["Moon", "Cancer", "Venus"], [profile.life_path], "water", "past"
        ))

    for note in inheritance.get("pattern_to_break", []):
        domains.append(_dr(
            Domain.CHARACTER.value, "challenging", "strong", note,
            ["pattern_to_break", "generational_wound", "karmic_inheritance"],
            ["Saturn", "Pluto", "South_Node"], [profile.life_path], "earth", "past"
        ))

    for note in inheritance.get("pattern_to_honour", []):
        domains.append(_dr(
            Domain.CHARACTER.value, "positive", "moderate", note,
            ["pattern_to_honour", "ancestral_gift", "lineage_strength"],
            ["Jupiter", "Moon"], [profile.life_path], "fire", "past"
        ))

    if not domains:
        domains.append(_dr(
            Domain.PARENTS.value if hasattr(Domain, 'PARENTS') else Domain.CHARACTER.value,
            "neutral", "moderate",
            f"Life Path {profile.life_path} inherited patterns are encoded in the birth date. "
            "The karmic configuration reveals the family lineage curriculum.",
            ["parent_inheritance", "lineage"],
            ["Moon", "Saturn"], [profile.life_path], "earth", "past"
        ))

    return NumFeatureReading(
        feature_name    = "parent_inheritance",
        observation     = "Parental inheritance patterns identified from numerology",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Parent inheritance — cross-reference with 4th house (mother) and 10th house (father) in astrology"],
        esoteric_note   = "In numerology, the Life Path carries the family karma encoded in the birth date.",
    )


# ---------------------------------------------------------------------------
# Infidelity indicators reading
# ---------------------------------------------------------------------------

def _read_infidelity_domain(profile: NumerologyProfile) -> NumFeatureReading:
    data = infidelity_indicators_numerology(profile)

    tone = "positive" if data["risk_level"] == "low" else \
           "neutral"  if data["risk_level"] == "moderate" else "challenging"

    domains = [
        _dr(Domain.LOVE.value, tone, "strong",
            data["summary"],
            ["fidelity", "loyalty", "infidelity_risk"],
            ["Venus", "Mars", "Scorpio"], [profile.life_path], "water", "timeless"),
    ]

    for factor in data.get("risk_factors", []):
        domains.append(_dr(
            Domain.LOVE.value, "challenging", "moderate", factor,
            ["infidelity_factor", "fidelity_risk"],
            ["Mars", "Uranus", "Scorpio"], [profile.life_path], "fire", "timeless"
        ))

    for factor in data.get("stable_factors", []):
        domains.append(_dr(
            Domain.LOVE.value, "positive", "moderate", factor,
            ["fidelity_strength", "loyalty_indicator"],
            ["Venus", "Saturn"], [profile.life_path], "earth", "timeless"
        ))

    return NumFeatureReading(
        feature_name    = "infidelity_indicators",
        observation     = f"Fidelity risk level: {data['risk_level']}",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Fidelity — cross-reference with Venus, Mars, and 7th house in astrology"],
        esoteric_note   = None,
    )


# ---------------------------------------------------------------------------
# Remedies domain reading
# ---------------------------------------------------------------------------

def _read_remedies_domain(profile: NumerologyProfile) -> NumFeatureReading:
    from .numerology_engine import compute_numerological_remedy
    remedy = compute_numerological_remedy(profile)

    lucky_str   = ", ".join(str(n) for n in remedy.lucky_numbers)
    unlucky_str = ", ".join(str(n) for n in remedy.unlucky_numbers)
    dates_str   = ", ".join(remedy.power_dates[:3]) if remedy.power_dates else "upcoming aligned dates"

    domains = [
        _dr(Domain.REMEDIES_DOMAIN.value if hasattr(Domain, 'REMEDIES_DOMAIN') else Domain.CHARACTER.value,
            "positive", "strong",
            f"Numerological remedy profile: "
            f"Lucky numbers — {lucky_str}. "
            f"Unlucky numbers to avoid — {unlucky_str}. "
            f"Power dates this month — {dates_str}.",
            ["lucky_numbers", "unlucky_numbers", "power_dates"],
            ["Jupiter", "Sun"], remedy.lucky_numbers, "fire", "present"),
    ]

    if remedy.name_correction_note:
        tone = "positive" if remedy.current_name_rating == "aligned" else \
               "neutral"  if remedy.current_name_rating == "neutral" else "challenging"
        domains.append(_dr(
            Domain.REMEDIES_DOMAIN.value if hasattr(Domain, 'REMEDIES_DOMAIN') else Domain.CHARACTER.value,
            tone, "strong", remedy.name_correction_note,
            ["name_correction", "name_vibration"],
            ["Mercury", "Sun"], [profile.destiny], "metal", "timeless"
        ))

    if remedy.address_vibration:
        domains.append(_dr(
            Domain.REMEDIES_DOMAIN.value if hasattr(Domain, 'REMEDIES_DOMAIN') else Domain.CHARACTER.value,
            "neutral", "moderate", remedy.address_vibration,
            ["address_vibration", "home_energy"],
            ["Saturn", "Moon"], [profile.life_path], "earth", "timeless"
        ))

    return NumFeatureReading(
        feature_name    = "numerological_remedies",
        observation     = f"Numerological remedy profile for Life Path {profile.life_path}",
        signal_strength = "strong",
        domains         = domains,
        cross_signals   = ["Remedies — always include in final output when include_remedies=True"],
        esoteric_note   = "Name vibration is the most actionable numerological remedy available.",
    )


# ---------------------------------------------------------------------------
# Main reader class  (v1.0.0 NumerologyReader.read preserved exactly;
#                    v2.0.0 fields populated in extended section + new method)
# ---------------------------------------------------------------------------

class NumerologyReader:
    """
    Stateless numerology interpretation engine.
    Takes NumerologyProfile and produces NumerologyReading for Logic Layer.
    """

    def read(
        self,
        profile:     NumerologyProfile,
        birth_day:   int,
        father_name: Optional[str] = None,
        mother_name: Optional[str] = None,
    ) -> NumerologyReading:
        t0 = time.monotonic()

        reading = NumerologyReading(
            reading_ms         = 0,
            overall_confidence = 0.92,
        )

        # ── v1.0.0 readings (preserved exactly) ────────────────────────

        # Life Path
        lp_num  = profile.life_path
        lp_data = _LIFE_PATH_READINGS.get(lp_num, {})
        if lp_data:
            domains = []
            for dom, (tone, strength, text, kw, astro, num, element) in lp_data.items():
                domains.append(_dr(dom, tone, strength, text, kw, astro, num, element, "timeless"))
            master_note = (
                f"Life Path {lp_num} is a Master Number — carrying elevated spiritual responsibility and potential. "
                "Master Number bearers often experience the lower vibration ({}) before the higher manifests."
                .format(lp_num // 11 * 2 if lp_num > 9 else "")
            ) if is_master(lp_num) else None

            reading.life_path = NumFeatureReading(
                feature_name    = "life_path",
                observation     = f"Life Path {lp_num}{' (Master Number)' if is_master(lp_num) else ''}",
                signal_strength = "strong",
                domains         = domains,
                cross_signals   = ["Life Path — foundational signal, cross-reference with Destiny and current Pinnacle"],
                esoteric_note   = master_note,
            )

        # Destiny
        dest_num = profile.destiny
        dest_theme, dest_dom, dest_kw = _DESTINY_THEMES.get(
            dest_num, ("Your destiny unfolds through your unique combination of gifts", Domain.CHARACTER.value, ["destiny", "purpose"])
        )
        reading.destiny = NumFeatureReading(
            feature_name    = "destiny",
            observation     = f"Destiny Number {dest_num}",
            signal_strength = "strong",
            domains         = [_dr(dest_dom, "positive", "strong", dest_theme, dest_kw,
                                   ["Jupiter", "Sun"], [dest_num], "fire", "timeless")],
            cross_signals   = ["Destiny — cross-reference with Life Path for soul purpose confirmation"],
            esoteric_note   = None,
        )

        # Soul Urge
        su_num = profile.soul_urge
        su_theme, su_dom = _SOUL_URGE_THEMES.get(
            su_num, ("A deep inner calling toward your unique path", Domain.CHARACTER.value)
        )
        reading.soul_urge = NumFeatureReading(
            feature_name    = "soul_urge",
            observation     = f"Soul Urge Number {su_num}",
            signal_strength = "strong",
            domains         = [_dr(su_dom, "positive", "strong", su_theme,
                                   ["soul_urge", "inner_motivation", "deep_desire"],
                                   ["Moon", "Neptune"], [su_num], "water", "timeless")],
            cross_signals   = ["Soul Urge — what drives you beneath surface motivations"],
            esoteric_note   = "The Soul Urge is the vowels — the breath of the name. It reveals the soul's deepest desire.",
        )

        # Personality
        pers_num = profile.personality
        reading.personality = NumFeatureReading(
            feature_name    = "personality",
            observation     = f"Personality Number {pers_num}",
            signal_strength = "moderate",
            domains         = [_dr(Domain.CHARACTER.value, "neutral", "moderate",
                                   f"Personality Number {pers_num}: how others perceive you before they know you. "
                                   "The outer layer, not the inner truth.",
                                   ["outer_personality", "first_impression", "social_mask"],
                                   ["Mercury", "Ascendant"], [pers_num], "metal", "timeless")],
            cross_signals   = ["Personality — compare to Soul Urge to see gap between outer and inner self"],
            esoteric_note   = None,
        )

        # Birthday
        reading.birthday = _read_birthday(profile, birth_day)

        # Current Pinnacle
        reading.current_pinnacle = _read_current_pinnacle(profile)

        # Personal Year
        reading.personal_year = _read_personal_year(profile)

        # Karmic Debts
        for debt in profile.karmic_debts:
            debt_num  = int(debt.value)
            debt_data = _KARMIC_READINGS.get(debt_num, {})
            domains   = []
            for dom, (tone, strength, text, kw, astro, num, element, temporal) in debt_data.items():
                domains.append(_dr(dom, tone, strength, text, kw, astro, num, element, temporal))

            if domains:
                reading.karmic_debts.append(NumFeatureReading(
                    feature_name    = f"karmic_debt_{debt_num}",
                    observation     = f"Karmic Debt {debt_num} — source: {debt.source}",
                    signal_strength = "strong",
                    domains         = domains,
                    cross_signals   = [f"Karmic Debt {debt_num} — always triggers spiritual remedy"],
                    esoteric_note   = (
                        f"Karmic Debt {debt_num} in Kabbalistic numerology corresponds to "
                        "a soul pattern requiring resolution in this lifetime. "
                        "The debt is not a punishment — it is an accelerated curriculum."
                    ),
                ))

        # Dominant themes (v1.0.0 logic preserved)
        theme_count: Dict[str, int] = {}
        for feat in [reading.life_path, reading.destiny, reading.soul_urge,
                     reading.current_pinnacle, reading.personal_year]:
            if feat:
                for dr in feat.domains:
                    for kw in dr.keywords:
                        theme_count[kw] = theme_count.get(kw, 0) + 1
        reading.dominant_themes = [
            kw for kw, _ in sorted(theme_count.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

        # ── v2.0.0 new readings ─────────────────────────────────────────

        reading.identity              = _read_identity(profile)
        reading.health_detailed       = _read_health_detailed(profile)
        reading.spirit_indicators     = _read_spirit_domain(profile)
        reading.sexuality             = _read_sexuality_domain(profile)
        reading.death_transition      = _read_death_transition(profile)
        reading.children_forecast     = _read_children_forecast(profile)
        reading.legacy                = _read_legacy_domain(profile)
        reading.parent_inheritance    = _read_parent_inheritance(profile, father_name, mother_name)
        reading.infidelity_indicators = _read_infidelity_domain(profile)
        reading.remedies              = _read_remedies_domain(profile)

        reading.reading_ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "NumerologyReader.read completed",
            extra={
                "life_path":     profile.life_path,
                "destiny":       profile.destiny,
                "personal_year": profile.personal_year,
                "karmic_debts":  len(profile.karmic_debts),
                "reading_ms":    reading.reading_ms,
                "v2_fields":     10,
            },
        )

        return reading

    def read_synastry(
        self,
        profile_a:     NumerologyProfile,
        profile_b:     NumerologyProfile,
        birth_day_a:   int,
        birth_day_b:   int,
        father_name_a: Optional[str] = None,
        mother_name_a: Optional[str] = None,
        father_name_b: Optional[str] = None,
        mother_name_b: Optional[str] = None,
    ) -> SynastryNumerologyReading:
        """
        Produce complete synastry numerology reading for two people.
        Calls read() for each person then computes union-level analysis.
        """
        t0 = time.monotonic()

        reading_a = self.read(profile_a, birth_day_a, father_name_a, mother_name_a)
        reading_b = self.read(profile_b, birth_day_b, father_name_b, mother_name_b)

        # Compatibility
        compat_data  = compute_compatibility_score(profile_a, profile_b)
        compat_level = compatibility_verdict(compat_data["overall_score"])
        karmic_cross = karmic_debt_cross_analysis(profile_a, profile_b)
        union_data   = union_destiny_numerology(profile_a, profile_b)

        # Union love reading
        union_love = _dr(
            Domain.LOVE.value,
            "strongly_positive" if compat_data["soul_urge_score"] >= 0.80 else "positive",
            "strong",
            f"Soul Urge compatibility {round(compat_data['soul_urge_score']*100)}%: "
            f"Life Path {profile_a.life_path} + Life Path {profile_b.life_path} = "
            f"Union Number {union_data['union_number']}. {union_data['union_theme']}",
            ["union_love", "soul_compatibility", "life_path_harmony"],
            ["Venus", "Moon", "Sun"], [profile_a.life_path, profile_b.life_path], "water", "timeless"
        )

        # Union wealth reading
        union_wealth = _dr(
            Domain.WEALTH.value,
            "positive" if compat_data["overall_score"] >= 0.70 else "neutral",
            "moderate",
            f"Financial compatibility: {round(compat_data['overall_score']*100)}% overall. "
            f"Combined wealth building potential based on Life Paths {profile_a.life_path} and {profile_b.life_path}.",
            ["union_wealth", "financial_compatibility"],
            ["Saturn", "Jupiter"], [profile_a.destiny, profile_b.destiny], "earth", "timeless"
        )

        # Union spirit reading
        spirit_summary = karmic_cross.get("karmic_summary", "Union karmic field assessed.")
        union_spirit = _dr(
            Domain.SPIRIT_WORLD.value if hasattr(Domain, 'SPIRIT_WORLD') else Domain.SPIRITUAL.value,
            "positive" if karmic_cross.get("intensity") == "light" else
            "neutral"  if karmic_cross.get("intensity") == "moderate" else "challenging",
            "strong",
            spirit_summary,
            ["union_karma", "shared_karmic_field"],
            ["Saturn", "Pluto", "South_Node"],
            list(karmic_cross.get("shared_debts", [])), "water", "past"
        )

        synastry = SynastryNumerologyReading(
            reading_ms            = int((time.monotonic() - t0) * 1000),
            overall_confidence    = 0.90,
            person_a_reading      = reading_a,
            person_b_reading      = reading_b,
            compatibility_score   = compat_data["overall_score"],
            compatibility_level   = compat_level.value,
            compatibility_details = compat_data,
            karmic_cross_analysis = karmic_cross,
            union_destiny         = union_data,
            marriage_windows      = union_data.get("marriage_windows", []),
            union_love_reading    = NumFeatureReading(
                feature_name    = "union_love",
                observation     = f"Love compatibility: {round(compat_data['soul_urge_score']*100)}%",
                signal_strength = "strong",
                domains         = [union_love],
                cross_signals   = ["Union love — cross-reference with Venus synastry aspects"],
                esoteric_note   = None,
            ),
            union_wealth_reading  = NumFeatureReading(
                feature_name    = "union_wealth",
                observation     = f"Wealth compatibility: {round(compat_data['overall_score']*100)}%",
                signal_strength = "moderate",
                domains         = [union_wealth],
                cross_signals   = ["Union wealth — cross-reference with 2nd and 8th house overlays"],
                esoteric_note   = None,
            ),
            union_spirit_reading  = NumFeatureReading(
                feature_name    = "union_spirit",
                observation     = f"Karmic intensity: {karmic_cross.get('intensity', 'moderate')}",
                signal_strength = "strong",
                domains         = [union_spirit],
                cross_signals   = ["Union karma — cross-reference with South Node contacts in synastry"],
                esoteric_note   = None,
            ),
        )

        logger.info(
            "NumerologyReader.read_synastry completed",
            extra={
                "lp_a":         profile_a.life_path,
                "lp_b":         profile_b.life_path,
                "compatibility":synastry.compatibility_score,
                "reading_ms":   synastry.reading_ms,
            },
        )

        return synastry


# ---------------------------------------------------------------------------
# Module-level convenience wrappers  (v1.0.0 preserved + v2.0.0 added)
# ---------------------------------------------------------------------------

def read_numerology(
    profile:     NumerologyProfile,
    birth_day:   int,
    father_name: Optional[str] = None,
    mother_name: Optional[str] = None,
) -> NumerologyReading:
    """Module-level convenience wrapper — v1.0.0 signature extended with optional args."""
    return NumerologyReader().read(profile, birth_day, father_name, mother_name)


def read_synastry_numerology(
    profile_a:     NumerologyProfile,
    profile_b:     NumerologyProfile,
    birth_day_a:   int,
    birth_day_b:   int,
    father_name_a: Optional[str] = None,
    mother_name_a: Optional[str] = None,
    father_name_b: Optional[str] = None,
    mother_name_b: Optional[str] = None,
) -> SynastryNumerologyReading:
    """Module-level convenience wrapper for synastry numerology reading."""
    return NumerologyReader().read_synastry(
        profile_a, profile_b,
        birth_day_a, birth_day_b,
        father_name_a, mother_name_a,
        father_name_b, mother_name_b,
    )
