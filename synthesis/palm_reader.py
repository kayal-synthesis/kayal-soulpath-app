"""
Palm Reader — KAYAL Synthesis Platform
=======================================
Palmistry knowledge base and domain-indexed interpretation layer.

v2.0.0 additions:
    - Domain enum expanded: SPIRIT_WORLD, SEXUALITY, DEATH_TRANSITION,
      IDENTITY, PARENTS, CHILDREN_FORECAST, LEGACY
    - New imports from palm_engine v4.0.0: ChildrenLineFeature, HealthMarker,
      SpiritualMarker, LifeLineAssessment, FateLineAssessment, InfidelityMarker
    - PalmReading extended: 6 new optional FeatureReading fields
    - New reading functions: _read_children_lines, _read_health_markers,
      _read_spiritual_markers, _read_life_line_assessment,
      _read_fate_line_assessment, _read_infidelity_markers
    - _detect_cross_signals and _extract_dominant_themes updated
    - PalmReader.read() updated to populate all 6 new fields
    - All v1.0.0 code preserved intact

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

from .palm_engine import (
    PalmFeatures, DualPalmFeatures, CrossHandComparison,
    LineFeature, LinePresence, LineCurvature, Magnitude,
    HandShape, FingerLength, FingerFlexibility,
    MountFeature, SkinFeature, SkinTone, SkinTexture, MarriageLineFeature,
    ChildrenLineFeature, HealthMarker, SpiritualMarker,
    LifeLineAssessment, FateLineAssessment, InfidelityMarker,
)

logger = logging.getLogger(__name__)


class Domain(str, Enum):
    LOVE       = "love"
    HEALTH     = "health"
    WEALTH     = "wealth"
    CAREER     = "career"
    SPIRITUAL  = "spiritual"
    FINANCE    = "finance"
    CHARACTER  = "character"
    SPIRIT_WORLD      = "spirit_world"
    SEXUALITY         = "sexuality"
    DEATH_TRANSITION  = "death_transition"
    IDENTITY          = "identity"
    PARENTS           = "parents"
    CHILDREN_FORECAST = "children_forecast"
    LEGACY            = "legacy"

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


@dataclass
class DomainReading:
    domain:          Domain
    tone:            ReadingTone
    signal_strength: SignalStrength
    reading:         str
    keywords:        List[str]
    astro_affinity:  List[str]
    numerology_link: List[int]


@dataclass
class FeatureReading:
    feature_name:    str
    observation:     str
    signal_strength: SignalStrength
    domains:         List[DomainReading]
    cross_signals:   List[str]
    vedic_note:      Optional[str]
    esoteric_note:   Optional[str]


@dataclass
class HandShapeReading:
    shape:           HandShape
    element:         str
    ruling_planet:   str
    observation:     str
    character_core:  str
    domains:         List[DomainReading]
    vedic_note:      str


@dataclass
class CrossHandReading:
    dominant_label:     str
    non_dominant_label: str
    overall_signal:     str
    domain_gaps:        Dict[str, str]
    growth_indicators:  List[str]
    suppressed:         List[str]
    fulfilled:          List[str]


@dataclass
class PalmReading:
    hand_label:         str
    reading_ms:         int
    overall_confidence: float
    hand_shape:         HandShapeReading
    life_line:    Optional[FeatureReading] = None
    heart_line:   Optional[FeatureReading] = None
    head_line:    Optional[FeatureReading] = None
    fate_line:    Optional[FeatureReading] = None
    sun_line:     Optional[FeatureReading] = None
    mercury_line: Optional[FeatureReading] = None
    mount_venus:      Optional[FeatureReading] = None
    mount_jupiter:    Optional[FeatureReading] = None
    mount_saturn:     Optional[FeatureReading] = None
    mount_apollo:     Optional[FeatureReading] = None
    mount_mercury:    Optional[FeatureReading] = None
    mount_mars_upper: Optional[FeatureReading] = None
    mount_mars_lower: Optional[FeatureReading] = None
    mount_moon:       Optional[FeatureReading] = None
    mount_neptune:    Optional[FeatureReading] = None
    thumb:  Optional[FeatureReading] = None
    index:  Optional[FeatureReading] = None
    middle: Optional[FeatureReading] = None
    ring:   Optional[FeatureReading] = None
    pinky:  Optional[FeatureReading] = None
    marriage_lines: Optional[FeatureReading] = None
    girdle_venus:   Optional[FeatureReading] = None
    intuition_line: Optional[FeatureReading] = None
    skin: Optional[FeatureReading] = None
    cross_hand: Optional[CrossHandReading] = None
    confirmed_signals:   Dict[str, List[str]] = field(default_factory=dict)
    conflicting_signals: Dict[str, List[str]] = field(default_factory=dict)
    dominant_themes:     List[str]            = field(default_factory=list)
    children_lines_reading:       Optional[FeatureReading] = None
    health_markers_reading:       Optional[FeatureReading] = None
    spiritual_markers_reading:    Optional[FeatureReading] = None
    life_line_assessment_reading: Optional[FeatureReading] = None
    fate_line_assessment_reading: Optional[FeatureReading] = None
    infidelity_markers_reading:   Optional[FeatureReading] = None

    def to_dict(self) -> Dict:
        return asdict(self)


def _sig(feature: Optional[LineFeature]) -> SignalStrength:
    if feature is None: return SignalStrength.ABSENT
    p = feature.presence; c = feature.continuity
    if p == LinePresence.ABSENT: return SignalStrength.ABSENT
    if p == LinePresence.UNCLEAR: return SignalStrength.WEAK
    if p == LinePresence.FAINT or c < 0.35: return SignalStrength.WEAK
    if p == LinePresence.MODERATE or c < 0.65: return SignalStrength.MODERATE
    return SignalStrength.STRONG


def _mount_sig(mount: Optional[MountFeature]) -> SignalStrength:
    if mount is None: return SignalStrength.ABSENT
    if mount.elevation == Magnitude.UNCLEAR: return SignalStrength.WEAK
    if mount.elevation == Magnitude.LOW: return SignalStrength.MODERATE
    return SignalStrength.STRONG


def _dr(domain,tone,strength,reading,keywords,astro,num) -> DomainReading:
    return DomainReading(domain=domain,tone=tone,signal_strength=strength,
        reading=reading,keywords=keywords,astro_affinity=astro,numerology_link=num)


def _read_hand_shape(shape: HandShape) -> HandShapeReading:
    if shape == HandShape.EARTH:
        domains = [
            _dr(Domain.LOVE, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Loyal, steady, and deeply committed once trust is established. Love expressed through action and provision. Slow to open but enduring when bonded.",
                ["loyalty","stability","commitment","patience"],["Venus","Saturn","Taurus","Capricorn"],[4,8,22]),
            _dr(Domain.HEALTH, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Robust physical constitution with strong endurance. Vulnerability in digestive system and joints under prolonged stress.",
                ["endurance","constitution","stamina"],["Saturn","Virgo","Taurus"],[4,8]),
            _dr(Domain.WEALTH, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Wealth accumulated slowly and kept carefully. Strong affinity for property, land, and material assets. Conservative with money.",
                ["accumulation","property","conservation","security"],["Saturn","Venus","Taurus","Capricorn"],[4,8,6]),
            _dr(Domain.CAREER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Excels in fields requiring sustained effort: construction, agriculture, finance, management, engineering, trades. Leadership through reliability.",
                ["craftsmanship","management","persistence","execution"],["Saturn","Mars","Capricorn","Virgo"],[4,8,22]),
            _dr(Domain.SPIRITUAL, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Spirituality expressed through the physical world — nature, craft, sanctity of honest work.",
                ["earth_spirituality","presence","craft","nature"],["Saturn","Earth","Capricorn"],[4,22]),
            _dr(Domain.FINANCE, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Conservative financial instincts. Prefers real estate, fixed assets, bonds. Steady wealth-building over decades.",
                ["conservation","real_estate","security","long_term"],["Saturn","Venus","Taurus"],[4,8]),
            _dr(Domain.CHARACTER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Reliable, honest, patient, and methodical. Strong practical intelligence. Stubbornness is the shadow of consistency.",
                ["reliability","patience","pragmatism","honesty"],["Saturn","Earth","Taurus","Virgo"],[4,8,22]),
        ]
        return HandShapeReading(shape=shape,element="earth",ruling_planet="Saturn",
            observation="Square palm with short fingers. Skin typically firm and thick.",
            character_core="A fundamentally practical, grounded nature. Builds steadily, values tangible results, operates from a deep need for security.",
            domains=domains,vedic_note="Prithvi tattva. Strong Saturn influence. Past-life karma around material manifestation.")
    elif shape == HandShape.AIR:
        domains = [
            _dr(Domain.LOVE, ReadingTone.POSITIVE, SignalStrength.MODERATE,
                "Seeks mental and conversational connection before emotional depth. Values honesty and clear communication in love.",
                ["intellectual_connection","communication","honesty","curiosity"],["Mercury","Venus","Gemini","Libra","Aquarius"],[5,7,11]),
            _dr(Domain.HEALTH, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Nervous system is the primary vulnerability. Anxiety, insomnia, stress-related conditions common. Benefits from breathwork and structured rest.",
                ["nervous_system","anxiety","respiratory","mental_health"],["Mercury","Gemini","Virgo"],[5,7]),
            _dr(Domain.WEALTH, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Wealth through ideas, communication, and knowledge. Information and consulting are natural channels. Risk: over-analysis.",
                ["ideas","information","consulting","intellectual_capital"],["Mercury","Jupiter","Gemini"],[5,3,7]),
            _dr(Domain.CAREER, ReadingTone.STRONGLY_POSITIVE, SignalStrength.STRONG,
                "Natural fit for intellectual and communicative fields: writing, teaching, law, science, technology, journalism, psychology.",
                ["communication","analysis","teaching","technology","writing"],["Mercury","Jupiter","Gemini","Aquarius"],[5,3,7]),
            _dr(Domain.SPIRITUAL, ReadingTone.POSITIVE, SignalStrength.MODERATE,
                "Drawn to philosophical and esoteric intellectual traditions. Spirituality expressed through understanding.",
                ["philosophy","esoteric_study","gnosis","understanding"],["Mercury","Jupiter","Uranus","Aquarius"],[7,11]),
            _dr(Domain.FINANCE, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Strong in financial analysis. Tendency to overthink investment decisions. Best in information-economy investments.",
                ["analysis","strategy","technology","information"],["Mercury","Gemini","Aquarius"],[5,7]),
            _dr(Domain.CHARACTER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Curious, articulate, adaptable, witty. Shadow: anxiety, scattered focus, detachment.",
                ["curiosity","adaptability","wit","analysis"],["Mercury","Air","Gemini"],[5,3,7]),
        ]
        return HandShapeReading(shape=shape,element="air",ruling_planet="Mercury",
            observation="Square palm with long fingers. Prominent knuckles. Skin often fine-textured.",
            character_core="A fundamentally mental, communicative nature. Lives primarily in the mind. Connects ideas and people with ease.",
            domains=domains,vedic_note="Vayu tattva. Mercury-dominant. Past-life patterns around communication, trade, and learning.")
    elif shape == HandShape.FIRE:
        domains = [
            _dr(Domain.LOVE, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Passionate, spontaneous, and magnetic in love. Requires freedom and stimulation. Deep loyalty beneath the adventurous exterior.",
                ["passion","spontaneity","intensity","freedom","magnetism"],["Mars","Sun","Aries","Leo","Sagittarius"],[1,9,19]),
            _dr(Domain.HEALTH, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "High energy output. Prone to burnout, adrenal fatigue, inflammation. Physical activity is essential.",
                ["burnout","inflammation","energy","adrenal","cardiovascular"],["Mars","Sun","Aries","Leo"],[1,9]),
            _dr(Domain.WEALTH, ReadingTone.POSITIVE, SignalStrength.MODERATE,
                "Wealth through bold action, entrepreneurship, leadership. Can generate rapidly but also lose rapidly.",
                ["entrepreneurship","boldness","leadership","creation"],["Mars","Sun","Jupiter","Aries"],[1,9,3]),
            _dr(Domain.CAREER, ReadingTone.STRONGLY_POSITIVE, SignalStrength.STRONG,
                "Natural leader, entrepreneur, performer, pioneer. Excels in sales, entertainment, start-ups, sport, military, politics.",
                ["leadership","entrepreneurship","pioneering","performance"],["Mars","Sun","Aries","Leo","Sagittarius"],[1,9,19]),
            _dr(Domain.SPIRITUAL, ReadingTone.POSITIVE, SignalStrength.MODERATE,
                "Spirituality experienced as direct and embodied. Drawn to fire traditions: shamanism, kundalini, active prayer.",
                ["kundalini","shamanism","direct_experience","fire"],["Mars","Sun","Aries","Jupiter"],[1,9]),
            _dr(Domain.FINANCE, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Bold financial moves — high risk, high reward. Needs discipline systems to prevent impulsive decisions.",
                ["risk","entrepreneurship","impulsive","ownership"],["Mars","Jupiter","Aries"],[1,9]),
            _dr(Domain.CHARACTER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Courageous, inspiring, generous, action-oriented. Shadow: impulsive, impatient.",
                ["courage","inspiration","generosity","impatience"],["Mars","Sun","Fire","Aries"],[1,9,19]),
        ]
        return HandShapeReading(shape=shape,element="fire",ruling_planet="Mars",
            observation="Rectangular palm with short fingers. Skin warm to touch. Often slightly flushed.",
            character_core="A fundamentally energetic, intuitive, action-oriented nature. Initiates before thinking. Inspires by example.",
            domains=domains,vedic_note="Agni tattva. Mars and Sun dominant. Strong warrior and sovereign karma from past lives.")
    elif shape == HandShape.WATER:
        domains = [
            _dr(Domain.LOVE, ReadingTone.STRONGLY_POSITIVE, SignalStrength.STRONG,
                "Deeply emotional, empathic, and devoted in love. Seeks soul-level connection. Needs boundaries to avoid losing self in relationship.",
                ["empathy","devotion","depth","soul_connection","sensitivity"],["Moon","Venus","Neptune","Cancer","Pisces","Scorpio"],[2,11,6]),
            _dr(Domain.HEALTH, ReadingTone.CHALLENGING, SignalStrength.MODERATE,
                "Sensitive constitution strongly affected by emotional state. Prone to fluid retention, hormonal fluctuations, psychosomatic conditions.",
                ["hormonal","fluid_retention","psychosomatic","sensitivity"],["Moon","Neptune","Cancer","Pisces"],[2,11]),
            _dr(Domain.WEALTH, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Wealth through creative, healing, service fields. Can undervalue own contributions — needs financial boundary support.",
                ["creativity","healing","service","arts","undervaluing"],["Moon","Venus","Neptune","Cancer"],[2,6,11]),
            _dr(Domain.CAREER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Natural healer, artist, counsellor, creative. Excels in psychology, nursing, social work, music, visual arts, writing.",
                ["healing","arts","counselling","creativity","service"],["Moon","Neptune","Venus","Cancer","Pisces"],[2,6,11]),
            _dr(Domain.SPIRITUAL, ReadingTone.STRONGLY_POSITIVE, SignalStrength.STRONG,
                "Naturally spiritual. Psychic sensitivity, prophetic dreams, empathic knowing are common. Drawn to mysticism and healing traditions.",
                ["mysticism","psychic","devotion","dreams","intuition"],["Moon","Neptune","Pisces","Cancer"],[2,11,7]),
            _dr(Domain.FINANCE, ReadingTone.CHALLENGING, SignalStrength.MODERATE,
                "Money carries emotional charge. Tends toward undercharging and over-giving. Needs structured financial guidance.",
                ["undercharging","emotional_money","boundaries","guilt"],["Moon","Neptune","Cancer"],[2,11]),
            _dr(Domain.CHARACTER, ReadingTone.POSITIVE, SignalStrength.STRONG,
                "Compassionate, creative, intuitive, deeply feeling. Shadow: boundary dissolution, emotional overwhelm, victim patterns.",
                ["compassion","creativity","intuition","boundaries"],["Moon","Neptune","Water","Pisces"],[2,11,6]),
        ]
        return HandShapeReading(shape=shape,element="water",ruling_planet="Moon",
            observation="Oval or rectangular palm with long, flexible fingers. Skin often soft and fine.",
            character_core="A fundamentally emotional, receptive, creative nature. Absorbs the feeling-world of everyone nearby.",
            domains=domains,vedic_note="Jala tattva. Moon and Venus dominant. Strong past-life patterns around devotion, sacrifice, and service.")
    else:
        domains = [
            _dr(Domain.LOVE, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Adaptable in love — can connect with varied personality types. Pattern determined by dominant lines and mounts.",
                ["adaptability","versatility","flexibility"],["Mercury","Venus"],[3,5,6]),
            _dr(Domain.HEALTH, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Variable constitution. Life line and skin condition carry more weight than hand shape for health assessment.",
                ["variable","adaptable"],["Mercury"],[3,5]),
            _dr(Domain.CAREER, ReadingTone.POSITIVE, SignalStrength.MODERATE,
                "Versatile — can operate across disciplines. Fate line and dominant mounts specify direction.",
                ["versatility","adaptability","multi_talented"],["Mercury","Jupiter"],[3,5]),
            _dr(Domain.CHARACTER, ReadingTone.NEUTRAL, SignalStrength.MODERATE,
                "Complex, multi-layered character. Individual features carry more weight than shape alone.",
                ["complexity","versatility","adaptability"],["Mercury"],[3,5]),
        ]
        return HandShapeReading(shape=shape,element="mixed",ruling_planet="Mercury",
            observation="Mixed proportions — neither fully square nor rectangular. Most common hand type.",
            character_core="A multifaceted, adaptable nature carrying qualities of more than one element.",
            domains=domains,vedic_note="Mixed tattva. Read other features with greater weight than shape alone.")


def _read_life_line(f):
    sig = _sig(f)
    if sig == SignalStrength.ABSENT: return None
    p=f.presence; c=f.continuity; cur=f.curvature; branches=f.branches; islands=f.islands; depth=f.depth
    parts=[]
    if p==LinePresence.STRONG and depth==Magnitude.HIGH: parts.append("deeply etched, strong life line")
    elif p==LinePresence.STRONG: parts.append("clearly present life line")
    elif p==LinePresence.MODERATE: parts.append("moderately present life line")
    else: parts.append("faint life line")
    if cur==LineCurvature.CURVED: parts.append("with a wide, sweeping arc")
    elif cur==LineCurvature.STRAIGHT: parts.append("running close to the thumb")
    elif cur==LineCurvature.WAVY: parts.append("with an irregular, wavy path")
    if c<0.40: parts.append("significantly broken or interrupted")
    elif c<0.65: parts.append("with some gaps or islands")
    if branches>2: parts.append(f"with {branches} upward branches")
    if islands>0: parts.append(f"showing {islands} island formation(s)")
    obs=". ".join(parts).capitalize()+"."
    domains=[]
    if p in (LinePresence.STRONG,LinePresence.MODERATE) and c>0.65:
        ht=ReadingTone.STRONGLY_POSITIVE if depth==Magnitude.HIGH else ReadingTone.POSITIVE
        hr="Strong vitality and physical resilience. The body recovers well from illness and stress. Constitutional strength is a foundational asset."
        if cur==LineCurvature.CURVED: hr+=" The wide arc signals abundant life force. High physical energy reserves."
    elif p==LinePresence.FAINT or c<0.40:
        ht=ReadingTone.CHALLENGING
        hr="Life force channelled inward rather than expressed physically. Vitality present but concentrated. Rest and energy management are more important than for most."
    else:
        ht=ReadingTone.NEUTRAL; hr="Moderate vitality. Energy levels are variable and context-dependent."
    if islands>0: hr+=f" The {islands} island(s) suggest defined periods of physical depletion."
    domains.append(_dr(Domain.HEALTH,ht,sig,hr,["vitality","constitution","resilience","life_force"],["Sun","Mars","Aries"],[1,4,9]))
    cr="The sweeping arc signals a person who embraces life fully — warm, generous, physically present." if cur==LineCurvature.CURVED else "The line running close to the thumb indicates a cautious, home-centred nature. Security is deeply valued." if cur==LineCurvature.STRAIGHT else "The life line indicates a variable, adaptable approach to experience."
    if c<0.40: cr+=" The breaks indicate significant life transitions — chapters that ended and new ones that began."
    domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,cr,["life_approach","vitality_expression","adaptability"],["Sun","Mars"],[1,9]))
    if branches>1: domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,f"The {branches} upward branches indicate periods of significant career advancement.",["advancement","opportunity","growth"],["Sun","Jupiter"],[1,3]))
    if cur==LineCurvature.CURVED and depth==Magnitude.HIGH: domains.append(_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"Strong life force carried with awareness. Embodied spirituality rather than withdrawal.",["embodiment","presence","life_force"],["Sun","Jupiter","Aries"],[1,9]))
    return FeatureReading(feature_name="life_line",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Islands on life line — check head line","Multiple branches — cross-reference fate line"],
        vedic_note="Ayushya Rekha — measures vitality and longevity. Breaks indicate Graha transitions.",
        esoteric_note="Corresponds to Prana channel in Hermetic tradition.")


def _read_heart_line(f):
    sig=_sig(f)
    if sig==SignalStrength.ABSENT: return None
    p=f.presence; c=f.continuity; cur=f.curvature; depth=f.depth; branches=f.branches; islands=f.islands
    parts=[]
    if p==LinePresence.STRONG and cur==LineCurvature.CURVED: parts.append("long, deeply curved heart line")
    elif p==LinePresence.STRONG and cur==LineCurvature.STRAIGHT: parts.append("long, straight heart line")
    elif p==LinePresence.MODERATE: parts.append("moderate heart line")
    else: parts.append("faint heart line")
    if c<0.50: parts.append("with significant chaining or breaks")
    if branches>1: parts.append(f"with {branches} branch(es)")
    if islands>0: parts.append(f"showing {islands} island(s)")
    obs=". ".join(parts).capitalize()+"."
    domains=[]
    if cur==LineCurvature.CURVED and p==LinePresence.STRONG:
        lr="Deeply romantic, emotionally expressive, and idealistic in love. Loves generously and seeks a partner who matches emotional depth. The curved line indicates warmth — affection shown openly."; lt=ReadingTone.STRONGLY_POSITIVE
    elif cur==LineCurvature.STRAIGHT and p==LinePresence.STRONG:
        lr="A more composed approach to love. Emotions felt deeply but expressed carefully. Seeks intellectual and practical compatibility alongside emotional connection."; lt=ReadingTone.POSITIVE
    elif p==LinePresence.FAINT:
        lr="Emotional energy directed inward or toward a few trusted relationships. Selective and private."; lt=ReadingTone.NEUTRAL
    else:
        lr="Moderate emotional depth with balanced expression in relationships."; lt=ReadingTone.NEUTRAL
    if c<0.50: lr+=" The chained quality indicates emotional sensitivity — a history of feeling things very deeply."
    if islands>0: lr+=f" The {islands} island(s) point to specific periods of emotional difficulty."
    if branches>1: lr+=f" The {branches} upward branches indicate capacity for deep connection."
    domains.append(_dr(Domain.LOVE,lt,sig,lr,["romance","emotional_depth","affection","idealism"],["Venus","Moon","Neptune","Libra","Cancer","Pisces"],[2,6,11]))
    hr="The deeply etched heart line indicates a strong cardiovascular constitution. Joy is as medicinal as any treatment." if (depth==Magnitude.HIGH and p==LinePresence.STRONG) else "The irregular heart line suggests cardiovascular sensitivity to emotional stress." if c<0.50 else "Moderate cardiovascular constitution."
    ht=ReadingTone.POSITIVE if (depth==Magnitude.HIGH and p==LinePresence.STRONG) else ReadingTone.NEUTRAL
    domains.append(_dr(Domain.HEALTH,ht,sig,hr,["cardiovascular","emotional_health","heart"],["Sun","Venus","Leo","Libra"],[6,2]))
    cr="The curved heart line reveals a person who leads with the heart. Empathy and warmth are signature traits." if cur==LineCurvature.CURVED else "The straighter heart line indicates emotional maturity and self-containment."
    domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,cr,["empathy","emotional_intelligence","warmth"],["Venus","Moon","Cancer","Libra"],[2,6]))
    if p==LinePresence.STRONG and cur==LineCurvature.CURVED: domains.append(_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"Capacity for devotional love — Bhakti in Vedic tradition. Love as a spiritual practice is a natural path.",["devotion","bhakti","love_as_path"],["Venus","Moon","Neptune","Pisces"],[2,6,11]))
    return FeatureReading(feature_name="heart_line",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Heart line islands — check head line","Chained heart line — Venus mount will modulate"],
        vedic_note="Hridaya Rekha — governs emotional body and relationship quality.",
        esoteric_note="Corresponds to Anahata (heart chakra) pathway. Islands represent karmic contractions.")


def _read_head_line(f):
    sig=_sig(f)
    if sig==SignalStrength.ABSENT: return None
    p=f.presence; c=f.continuity; cur=f.curvature; depth=f.depth; length=f.length_pct; islands=f.islands
    parts=[]
    if p==LinePresence.STRONG and length>0.7: parts.append("long, strong head line")
    elif p==LinePresence.STRONG: parts.append("strong but shorter head line")
    elif p==LinePresence.MODERATE: parts.append("moderate head line")
    else: parts.append("faint head line")
    if cur==LineCurvature.CURVED: parts.append("sloping downward toward mount of Moon")
    elif cur==LineCurvature.STRAIGHT: parts.append("running straight across the palm")
    if c<0.50: parts.append("with notable breaks or islands")
    if islands>0: parts.append(f"showing {islands} island(s)")
    obs=". ".join(parts).capitalize()+"."
    domains=[]
    if length>0.7 and p==LinePresence.STRONG:
        cr_read="Long, strong head line signals exceptional mental stamina, analytical power, and capacity to sustain complex thinking. Strategic roles and research are natural fits."; ct=ReadingTone.STRONGLY_POSITIVE
    elif length>0.5:
        cr_read="Good mental focus with practical orientation. Direct, efficient thinking style."; ct=ReadingTone.POSITIVE
    else:
        cr_read="Shorter head line favours focused, action-oriented thinking. Strong in execution and practical decisions."; ct=ReadingTone.NEUTRAL
    if cur==LineCurvature.CURVED: cr_read+=" Downward slope adds creative and imaginative colouring. Intuition is a professional asset."
    elif cur==LineCurvature.STRAIGHT: cr_read+=" Straight trajectory indicates a logical, systematic mind — strong in precision and data."
    domains.append(_dr(Domain.CAREER,ct,sig,cr_read,["analytical","strategic","focus","mental_stamina","precision"],["Mercury","Saturn","Virgo","Capricorn","Gemini"],[7,4,5]))
    char_read="The sloping head line reveals a mind that blends logic with imagination — capable of both analysis and creative synthesis." if cur==LineCurvature.CURVED else "The straight head line indicates a pragmatic, reality-grounded mind."
    if islands>0: char_read+=f" The {islands} island(s) suggest periods of mental pressure and concentration disruption."
    domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,char_read,["intellect","reasoning","creativity","pragmatism"],["Mercury","Virgo","Gemini"],[5,7]))
    if c<0.50 or islands>0: domains.append(_dr(Domain.HEALTH,ReadingTone.CHALLENGING,sig,"Interrupted or islanded head line points to periods of mental fatigue and anxiety. Mindfulness practices and adequate mental recovery are prescribed.",["mental_health","anxiety","stress"],["Mercury","Moon","Virgo"],[5,7]))
    else: domains.append(_dr(Domain.HEALTH,ReadingTone.POSITIVE,sig,"Clear, continuous head line indicates good mental stamina and cognitive resilience.",["mental_clarity","cognitive_resilience"],["Mercury","Virgo"],[5,7]))
    if cur==LineCurvature.STRAIGHT and length>0.6: domains.append(_dr(Domain.WEALTH,ReadingTone.POSITIVE,sig,"Long, straight head line indicates strong financial reasoning — logical, strategic, resistant to emotional decisions.",["financial_reasoning","strategy","logic"],["Mercury","Saturn","Virgo","Capricorn"],[4,7,8]))
    elif cur==LineCurvature.CURVED: domains.append(_dr(Domain.WEALTH,ReadingTone.NEUTRAL,sig,"Wealth through creative, intuitive, or artistic means.",["creative_wealth","intuition","artistic"],["Moon","Neptune","Venus"],[2,3,6]))
    return FeatureReading(feature_name="head_line",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Head line islands — cross-reference with heart line","Curved head line — Moon mount will modulate"],
        vedic_note="Matri/Buddhi Rekha — governs intellectual faculty. Correlates with Mercury and Jupiter.",
        esoteric_note="Corresponds to Ajna (third eye) pathway. Islands represent disruptions in conscious awareness.")


def _read_fate_line(f):
    sig=_sig(f)
    if sig==SignalStrength.ABSENT or f.presence==LinePresence.ABSENT:
        return FeatureReading(feature_name="fate_line",observation="No fate line detected.",signal_strength=SignalStrength.ABSENT,
            domains=[_dr(Domain.CAREER,ReadingTone.NEUTRAL,SignalStrength.ABSENT,"Absence of fate line signals a self-directed life path — this person makes their own fate rather than following one.",["self_directed","freedom","autonomy"],["Uranus","Jupiter","Aquarius"],[1,5]),
                     _dr(Domain.CHARACTER,ReadingTone.NEUTRAL,SignalStrength.ABSENT,"Highly autonomous — defines success on own terms.",["autonomy","individuality"],["Uranus","Aquarius"],[1,5])],
            cross_signals=["Absence of fate line — examine sun line and head line for direction"],
            vedic_note="Absence of Bhagya Rekha — strong individual karma. Soul charting a unique, self-willed course.",esoteric_note=None)
    p=f.presence; c=f.continuity; depth=f.depth; branches=f.branches; length=f.length_pct
    parts=[]
    if p==LinePresence.STRONG and depth==Magnitude.HIGH: parts.append("deeply etched fate line")
    elif p==LinePresence.STRONG: parts.append("clearly present fate line")
    elif p==LinePresence.MODERATE: parts.append("moderate fate line")
    else: parts.append("faint fate line")
    if length>0.7: parts.append("running nearly the full length of the palm")
    elif length<0.4: parts.append("covering only the lower portion")
    if c<0.50: parts.append("with significant breaks or changes")
    if branches>1: parts.append(f"with {branches} branching")
    obs=". ".join(parts).capitalize()+"."
    domains=[]
    if p==LinePresence.STRONG and c>0.65:
        cr="A strong, clear fate line indicates a well-defined life mission with natural momentum. Career develops with purpose and direction. Doors open in alignment with calling."; ct=ReadingTone.STRONGLY_POSITIVE
    elif c<0.50:
        cr="The broken fate line signals significant career transitions — multiple chapters. Each break marks a shedding of old role and emergence of new one."; ct=ReadingTone.NEUTRAL
    elif p==LinePresence.FAINT:
        cr="The faint fate line indicates a path still being defined. Career direction emerges gradually through experience."; ct=ReadingTone.NEUTRAL
    else:
        cr="Moderate career direction — purpose is present but still developing."; ct=ReadingTone.POSITIVE
    if branches>1: cr+=f" The {branches} branches indicate parallel career paths or a career spanning disciplines."
    domains.append(_dr(Domain.CAREER,ct,sig,cr,["purpose","direction","vocation","mission"],["Saturn","Sun","Capricorn","Leo"],[8,1,4]))
    if p==LinePresence.STRONG: domains.append(_dr(Domain.WEALTH,ReadingTone.POSITIVE,sig,"A strong fate line indicates consistent material flow aligned with life purpose.",["purpose_aligned_wealth","consistency","recognition"],["Saturn","Sun","Jupiter"],[8,1]))
    domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL if c<0.50 else ReadingTone.POSITIVE,sig,"A complex multi-chapter character who reinvents themselves. Identity evolves with the path." if c<0.50 else "A person with strong sense of direction and life purpose.",["evolution","reinvention"] if c<0.50 else ["purpose","direction","consistency"],["Saturn","Uranus"] if c<0.50 else ["Saturn","Capricorn"],[1,8] if c<0.50 else [8,4]))
    if depth==Magnitude.HIGH and length>0.7: domains.append(_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"Long, deep fate line indicates strong karmic mission. This life carries specific soul-level work the person is drawn back to regardless of detours.",["karma","soul_mission","dharma","calling"],["Saturn","Capricorn","North_Node"],[8,4,22]))
    return FeatureReading(feature_name="fate_line",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Broken fate line — career transitions confirmed by head line islands","Fate line branches — check sun line"],
        vedic_note="Bhagya Rekha — indicates strength of prarabdha karma. Strong line = strong dharmic momentum.",
        esoteric_note="The soul's contractual agreements for this incarnation. Breaks = renegotiated contracts.")


def _read_sun_line(f):
    sig=_sig(f)
    if sig==SignalStrength.ABSENT:
        return FeatureReading(feature_name="sun_line",observation="No sun line detected.",signal_strength=SignalStrength.ABSENT,
            domains=[_dr(Domain.CAREER,ReadingTone.NEUTRAL,SignalStrength.ABSENT,"Absence of sun line does not indicate lack of success. Success comes quietly and on personal terms.",["quiet_success","personal_fulfilment","private"],["Saturn","Virgo"],[4,7])],
            cross_signals=[],vedic_note="Absence of Surya Rekha — success through consistent effort rather than public recognition.",esoteric_note=None)
    p=f.presence; depth=f.depth
    obs=(f"{'Strong' if p==LinePresence.STRONG else 'Moderate' if p==LinePresence.MODERATE else 'Faint'} sun line present beneath ring finger. "
         f"{'Deeply etched.' if depth==Magnitude.HIGH else 'Clear.' if depth==Magnitude.MODERATE else 'Faint impression.'}")
    if p==LinePresence.STRONG:
        ct=ReadingTone.STRONGLY_POSITIVE; cr="The strong sun line signals natural talent recognised by others, public visibility, and capacity to turn gifts into achievement. Reputation becomes a career asset."
        wt=ReadingTone.POSITIVE; wr="The sun line combined with fate line creates strong wealth potential through recognised contribution."
    else:
        ct=ReadingTone.POSITIVE; cr="A moderate sun line indicates creative ability and some public recognition."
        wt=ReadingTone.NEUTRAL; wr="Moderate success potential through creative or professional talent."
    return FeatureReading(feature_name="sun_line",observation=obs,signal_strength=sig,
        domains=[_dr(Domain.CAREER,ct,sig,cr,["recognition","talent","success","reputation","visibility"],["Sun","Apollo","Leo","Jupiter"],[1,3,19]),
                 _dr(Domain.WEALTH,wt,sig,wr,["recognition_wealth","talent","creative_success"],["Sun","Leo","Jupiter"],[1,3]),
                 _dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A person with genuine creative gifts and the confidence to express them. Optimism and self-belief are natural assets.",["confidence","creativity","optimism"],["Sun","Leo","Jupiter"],[1,3])],
        cross_signals=["Sun line — cross-reference with Apollo mount elevation"],
        vedic_note="Surya Rekha — Aditya blessing: recognition, honour, creative fruition.",
        esoteric_note="The sun line corresponds to the expression of the Higher Self through form.")


def _read_mercury_line(f):
    sig=_sig(f)
    if sig==SignalStrength.ABSENT: return None
    p=f.presence; c=f.continuity
    obs=(f"{'Strong' if p==LinePresence.STRONG else 'Moderate' if p==LinePresence.MODERATE else 'Faint'} mercury line present. "
         f"{'Continuous.' if c>0.65 else 'With some interruptions.'}")
    if p==LinePresence.STRONG and c>0.65: hr="Clear mercury line indicates strong digestive and metabolic function, and well-developed business and communication instincts."; ht=ReadingTone.POSITIVE
    elif c<0.50: hr="Interrupted mercury line suggests variable digestive health and nervous system strain. Gut health is worth monitoring."; ht=ReadingTone.NEUTRAL
    else: hr="Moderate mercury line — health and communication functioning adequately."; ht=ReadingTone.NEUTRAL
    return FeatureReading(feature_name="mercury_line",observation=obs,signal_strength=sig,
        domains=[_dr(Domain.HEALTH,ht,sig,hr,["digestion","nervous_system","metabolism","gut_health"],["Mercury","Virgo"],[5,6]),
                 _dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"A present mercury line adds business acumen, communication skills, and commercial awareness.",["communication","business","acumen","persuasion"],["Mercury","Gemini","Virgo"],[5,3]),
                 _dr(Domain.FINANCE,ReadingTone.POSITIVE,sig,"Mercury line presence indicates financial instinct and ability to spot commercial opportunities.",["financial_instinct","commercial","opportunity"],["Mercury","Gemini"],[5,3])],
        cross_signals=["Mercury line — confirm with Mercury mount elevation"],
        vedic_note="Budha Rekha — governs intellect, communication, and metabolic health.",esoteric_note=None)


def _read_marriage_lines(m):
    if m is None or m.count==0:
        return FeatureReading(feature_name="marriage_lines",observation="No union lines detected on percussion edge.",signal_strength=SignalStrength.ABSENT,
            domains=[_dr(Domain.LOVE,ReadingTone.NEUTRAL,SignalStrength.ABSENT,"Absence of union lines does not indicate a life without deep relationships. Significant bonds may be reflected more strongly in the heart line.",["open","unconventional","heart_led"],["Venus","Uranus"],[1,5,11])],
            cross_signals=["Examine heart line quality when union lines are absent"],vedic_note=None,esoteric_note=None)
    count=m.count; strongest=m.lines[m.strongest_idx] if m.strongest_idx>=0 else None
    strongest_depth=strongest["depth"] if strongest else Magnitude.LOW.value
    obs=f"{count} union line(s) detected. Strongest line: {strongest_depth} depth."
    lr="One deeply significant union indicated. Tends toward singular, committed partnership." if count==1 else "Two significant unions — either two partnerships, or one relationship that transforms fundamentally into two distinct phases." if count==2 else f"{count} significant relationships indicated over the lifetime. Rich relational life."
    if strongest_depth==Magnitude.HIGH.value: lr+=" The deepest union line is strongly etched — indicating a bond of exceptional depth."
    return FeatureReading(feature_name="marriage_lines",observation=obs,signal_strength=SignalStrength.MODERATE,
        domains=[_dr(Domain.LOVE,ReadingTone.POSITIVE,SignalStrength.MODERATE,lr,["partnership","union","commitment","relationship"],["Venus","Moon","Libra","Cancer"],[2,6]),
                 _dr(Domain.CHARACTER,ReadingTone.NEUTRAL,SignalStrength.MODERATE,f"The {count} union line(s) reflect deep capacity for committed relationship. Relationships are taken seriously as life-defining experiences.",["commitment","depth","relational_capacity"],["Venus","Saturn","Libra"],[2,6])],
        cross_signals=["Union lines — always read alongside heart line and Venus mount"],
        vedic_note="Vivah Rekha — karmic weight of partnership in this lifetime.",esoteric_note=None)


def _read_mount(name,mount,planet,sign,domains_high,domains_low,vedic):
    sig=_mount_sig(mount)
    if sig==SignalStrength.ABSENT: return None
    elev=mount.elevation if mount else Magnitude.UNCLEAR; firm=mount.firmness if mount else Magnitude.UNCLEAR
    if elev==Magnitude.HIGH: obs=f"Well-developed {name} mount. {'Firm texture indicates active energy.' if firm==Magnitude.HIGH else 'Soft texture indicates receptive energy.'}"; dlist=domains_high; to=None
    elif elev==Magnitude.LOW: obs=f"Flat or underdeveloped {name} mount."; dlist=domains_low; to=ReadingTone.NEUTRAL
    else: obs=f"Moderately developed {name} mount."; dlist=domains_high; to=ReadingTone.NEUTRAL
    domains=[_dr(d,to if to else t,sig,r,kw,[planet,sign],n) for d,t,r,kw,n in dlist]
    return FeatureReading(feature_name=f"mount_{name}",observation=obs,signal_strength=sig,domains=domains,cross_signals=[f"Mount {name} — confirm with {planet} line presence"],vedic_note=vedic,esoteric_note=None)


def _read_mount_venus(m):
    high=[(Domain.LOVE,ReadingTone.STRONGLY_POSITIVE,"A well-developed Venus mount is the most powerful love indicator. Signals abundant capacity for love, sensuality, beauty, and deep romantic feeling.",["love","sensuality","beauty","passion","magnetism"],[2,6,11]),
          (Domain.HEALTH,ReadingTone.POSITIVE,"Firm, raised Venus mount indicates strong vitality, good circulation, and robust physical constitution.",["vitality","circulation","physical_health"],[6,2]),
          (Domain.WEALTH,ReadingTone.POSITIVE,"Venus mount elevation suggests wealth attraction through charm, beauty, and creative expression.",["attraction","charm","creative_wealth"],[6,2]),
          (Domain.CHARACTER,ReadingTone.POSITIVE,"Warm, generous, magnetic, pleasure-appreciating character. Genuinely enjoys life and shares that enjoyment.",["warmth","generosity","magnetism","sensuality"],[6,2]),
          (Domain.SPIRITUAL,ReadingTone.POSITIVE,"Venus energy elevated — Bhakti and devotional love are natural spiritual pathways. Beauty as a sacred principle.",["devotion","beauty_as_sacred","sensual_spirituality"],[6,2])]
    low=[(Domain.LOVE,ReadingTone.NEUTRAL,"Flat Venus mount indicates a more restrained, practical approach to love. Not cold — more cerebral in expression.",["reserved","practical_love","restrained"],[7,4]),
         (Domain.CHARACTER,ReadingTone.NEUTRAL,"Practical, self-contained character. Pleasure is not a primary motivator.",["self_contained","practical"],[4,7])]
    return _read_mount("venus",m,"Venus","Taurus/Libra",high,low,"Shukra Parvat — governs love, beauty, artistic sense, and marital harmony.")


def _read_mount_jupiter(m):
    high=[(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,"Developed Jupiter mount marks natural leadership, ambition, and authority that others recognise. Leadership, teaching, and mentorship are natural fits.",["leadership","ambition","authority","recognition"],[1,8,3]),
          (Domain.WEALTH,ReadingTone.POSITIVE,"Jupiter mount elevation adds expansive wealth potential — abundance thinking, generosity, and ability to attract large opportunities.",["abundance","expansion","generosity","opportunity"],[3,8]),
          (Domain.SPIRITUAL,ReadingTone.POSITIVE,"Strong Jupiter mount indicates spiritual authority and the role of teacher or guide. Natural philosopher and wisdom keeper.",["wisdom","teaching","philosophy","spiritual_authority"],[3,7]),
          (Domain.CHARACTER,ReadingTone.POSITIVE,"Confident, generous, philosophical, naturally commanding. Shadow: arrogance — wisdom is the antidote.",["confidence","generosity","philosophy","authority"],[3,1])]
    low=[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Modest, humble, prefers collaboration over leadership.",["humility","collaboration","modesty"],[2,6]),
         (Domain.CAREER,ReadingTone.NEUTRAL,"Career satisfaction through contribution rather than status.",["contribution","service","collaboration"],[6,2])]
    return _read_mount("jupiter",m,"Jupiter","Sagittarius/Pisces",high,low,"Guru Parvat — governs wisdom, expansion, and dharmic leadership.")


def _read_mount_saturn(m):
    high=[(Domain.CAREER,ReadingTone.POSITIVE,"Developed Saturn mount adds depth, seriousness, and mastery potential. This person plays a long game — skills compound into genuine expertise.",["mastery","discipline","expertise","long_game"],[4,8,22]),
          (Domain.SPIRITUAL,ReadingTone.POSITIVE,"Saturn mount elevation indicates a soul drawn to wisdom through solitude, study, and honest confrontation of reality.",["solitude","discipline","wisdom","esoteric_study"],[4,7,8]),
          (Domain.CHARACTER,ReadingTone.NEUTRAL,"Serious, disciplined, patient, deeply reflective. Prominent Saturn mount can bring melancholia as shadow of depth.",["seriousness","discipline","depth","melancholia"],[4,8]),
          (Domain.HEALTH,ReadingTone.NEUTRAL,"Saturn mount elevation — watch for skeletal, dental, and skin conditions. Chronic rather than acute.",["skeletal","chronic_care","prevention"],[4])]
    low=[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Light, spontaneous, less weighed down by duty or consequence.",["spontaneity","lightness","freedom"],[5,1])]
    return _read_mount("saturn",m,"Saturn","Capricorn/Aquarius",high,low,"Shani Parvat — governs karma, discipline, and service.")


def _read_mount_apollo(m):
    high=[(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,"Developed Apollo mount is the hallmark of the creative, artist, and performer. Success in creative fields, entertainment, design, and expression.",["creativity","artistry","performance","beauty","expression"],[3,1,6]),
          (Domain.WEALTH,ReadingTone.POSITIVE,"Apollo mount elevation adds charisma to wealth generation — success through being seen and appreciated.",["charisma","public_facing","creative_wealth"],[3,1]),
          (Domain.CHARACTER,ReadingTone.POSITIVE,"Optimistic, joyful, creative, magnetically expressive. Shadow: vanity — need for external validation.",["optimism","creativity","joy","expressiveness"],[3,6]),
          (Domain.SPIRITUAL,ReadingTone.POSITIVE,"Apollo mount — beauty as a doorway to the divine. Art, music, and aesthetic experience are genuine spiritual practices.",["beauty_as_sacred","art_as_spirituality","joy"],[3,6])]
    low=[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Less driven by creative expression or public recognition. Substance over performance.",["substance","pragmatism","private"],[4,7])]
    return _read_mount("apollo",m,"Sun/Apollo","Leo",high,low,"Surya Parvat — governs recognition, artistry, and solar vitality.")


def _read_mount_mercury(m):
    high=[(Domain.CAREER,ReadingTone.POSITIVE,"Mercury mount elevation adds commercial intelligence, persuasive communication, quick analytical ability. Natural in business, sales, negotiation, writing, and medicine.",["communication","business","negotiation","medicine","writing"],[5,3]),
          (Domain.FINANCE,ReadingTone.POSITIVE,"Developed Mercury mount indicates sharp commercial instincts — can identify profitable opportunities and negotiate favourable terms.",["commercial_instinct","negotiation","opportunity"],[5,3]),
          (Domain.HEALTH,ReadingTone.POSITIVE,"Mercury mount elevation correlates with strong nervous system and metabolic regulation.",["nervous_system","metabolism","digestion"],[5]),
          (Domain.CHARACTER,ReadingTone.POSITIVE,"Quick-witted, persuasive, adaptable, commercially astute. Shadow: cunning if Mercury energy is misdirected.",["wit","persuasion","adaptability","commercial_sense"],[5,3])]
    low=[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Direct, straightforward communication style. Less inclined toward persuasion or commercial manoeuvring.",["directness","honesty","simplicity"],[4,7])]
    return _read_mount("mercury",m,"Mercury","Gemini/Virgo",high,low,"Budha Parvat — governs intellect, communication, and commercial karma.")


def _read_mount_moon(m):
    high=[(Domain.SPIRITUAL,ReadingTone.STRONGLY_POSITIVE,"Developed Moon mount is the strongest psychic and intuitive indicator. Imagination, dreaming, and non-rational knowing are heightened. This person receives information from beyond the ordinary senses.",["psychic","intuition","dreaming","imagination","empathy"],[2,11,7]),
          (Domain.LOVE,ReadingTone.POSITIVE,"Moon mount elevation adds deep romantic imagination and sensitivity. Love experienced as total emotional and spiritual immersion.",["romantic_imagination","sensitivity","emotional_depth"],[2,11]),
          (Domain.CAREER,ReadingTone.POSITIVE,"Creative, artistic, and healing vocations are highlighted. Writing, music, psychology, and spiritual work are natural expressions.",["creativity","writing","healing","psychology","music"],[2,11]),
          (Domain.HEALTH,ReadingTone.NEUTRAL,"Developed Moon mount indicates sensitivity to environmental and lunar cycles. Sleep quality and hormonal rhythms require mindful management.",["hormonal","sleep","lunar_sensitivity","emotional_health"],[2]),
          (Domain.CHARACTER,ReadingTone.POSITIVE,"Deeply imaginative, empathic, psychically sensitive. Shadow: moodiness, escapism.",["imagination","empathy","psychic","moodiness"],[2,11])]
    low=[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Rational, grounded, less swayed by imagination or emotion.",["rationality","groundedness","pragmatism"],[4,8])]
    return _read_mount("moon",m,"Moon","Cancer/Pisces",high,low,"Chandra Parvat — governs the mind (Manas), intuition, and subconscious.")


def _read_mount_mars(upper,lower):
    upper_sig=_mount_sig(upper); lower_sig=_mount_sig(lower)
    if upper_sig==SignalStrength.ABSENT and lower_sig==SignalStrength.ABSENT: return None
    upper_elev=upper.elevation if upper else Magnitude.LOW; lower_elev=lower.elevation if lower else Magnitude.LOW
    obs=f"Mars upper (resistance/endurance): {upper_elev.value}. Mars lower (aggression/initiative): {lower_elev.value}."
    overall_sig=SignalStrength.STRONG if (upper_elev==Magnitude.HIGH or lower_elev==Magnitude.HIGH) else SignalStrength.MODERATE
    domains=[]
    if lower_elev==Magnitude.HIGH: domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,overall_sig,"Strong lower Mars indicates initiative, courage, and the drive to compete. Natural in leadership, military, sport, and pioneering roles.",["initiative","courage","competition","drive"],["Mars","Aries","Scorpio"],[1,9]))
    if upper_elev==Magnitude.HIGH: domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,overall_sig,"Strong upper Mars indicates exceptional endurance, patience under pressure, and the ability to hold ground.",["endurance","resilience","patience","resistance"],["Mars","Scorpio"],[8,9]))
    if lower_elev==Magnitude.HIGH and upper_elev==Magnitude.HIGH: domains.append(_dr(Domain.HEALTH,ReadingTone.POSITIVE,overall_sig,"Both Mars mounts developed — exceptional physical resilience and recovery capacity.",["physical_resilience","recovery","strength"],["Mars","Aries"],[1,9]))
    if lower_elev==Magnitude.LOW and upper_elev==Magnitude.LOW: domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Flat Mars mounts indicate a peaceful, non-confrontational nature. Avoids conflict by design, not weakness.",["peaceful","non_confrontational","diplomatic"],["Venus","Libra"],[2,6]))
    return FeatureReading(feature_name="mount_mars",observation=obs,signal_strength=overall_sig,domains=domains,cross_signals=["Mars mounts — confirm with life line vigor and thumb will"],vedic_note="Mangal Parvat — govern courage, competition, and physical strength.",esoteric_note=None)


def _read_mount_neptune(m):
    sig=_mount_sig(m)
    if sig==SignalStrength.ABSENT: return None
    elev=m.elevation if m else Magnitude.UNCLEAR; obs=f"Neptune mount (base of palm, centre): {elev.value} elevation."
    return FeatureReading(feature_name="mount_neptune",observation=obs,signal_strength=sig,
        domains=[_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"Developed Neptune mount indicates a bridge between the conscious and unconscious. Spiritual mediation and transpersonal experience are accessible.",["unconscious","mediation","transpersonal","mysticism"],["Neptune","Pisces"],[11,22]),
                 _dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Neptune mount carries the bridge quality — this person naturally mediates between different worlds or states of consciousness.",["mediation","bridge","sensitivity"],["Neptune","Pisces"],[11])],
        cross_signals=["Neptune mount — amplifies Moon mount if both are developed"],
        vedic_note="Corresponds to the space between Chandra and Shukra Parvat — governs dissolution of ego in the transcendent.",
        esoteric_note="In Hermetic tradition, Neptune mount is the seat of the Higher Self contact point.")


def _read_finger(name,f,planet,domain_readings):
    if f is None: return None
    length=f.length; flex=f.flexibility; tip=f.tip_shape; sig=SignalStrength.STRONG
    obs=f"{name.title()} finger: {length.value} length, {flex.value} flexibility, {tip} tip."
    raw=domain_readings.get(length.value,domain_readings.get("average",[]))
    domains=[]
    for domain,tone,reading,kw,astro,num in raw:
        if flex==FingerFlexibility.FLEXIBLE: reading+=" Flexibility adds adaptability."
        elif flex==FingerFlexibility.STIFF: reading+=" Stiffness adds consistency."
        if tip=="pointed": reading+=" Pointed tip adds idealism."
        elif tip=="spatulate": reading+=" Spatulate tip adds practical drive."
        domains.append(_dr(domain,tone,sig,reading,kw,astro,num))
    return FeatureReading(feature_name=f"finger_{name}",observation=obs,signal_strength=sig,domains=domains,cross_signals=[],vedic_note=f"Anguli {name.title()} — governed by {planet}.",esoteric_note=None)


def _read_thumb(f):
    if f is None: return None
    r={"long":[(Domain.CHARACTER,ReadingTone.STRONGLY_POSITIVE,"A long thumb is the strongest indicator of willpower, leadership capacity, and the ability to execute decisions with force.",["willpower","leadership","determination","authority"],["Mars","Sun","Aries"],[1,8]),(Domain.CAREER,ReadingTone.POSITIVE,"Strong executive function. Natural in leadership and entrepreneurial roles.",["leadership","execution","authority"],["Mars","Sun"],[1,8])],
       "short":[(Domain.CHARACTER,ReadingTone.NEUTRAL,"A shorter thumb indicates a more flexible, cooperative approach. Will is exercised through consensus rather than force.",["cooperation","flexibility","diplomacy"],["Venus","Moon","Libra"],[2,6])],
       "average":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Well-proportioned thumb indicates balanced willpower — firm when necessary, flexible when appropriate.",["balance","willpower","judgment"],["Sun","Mercury"],[1,5])]}
    return _read_finger("thumb",f,"Mars/Venus",{k:[(d,t,ri,kw,a,n) for d,t,ri,kw,a,n in v] for k,v in r.items()})


def _read_index_finger(f):
    if f is None: return None
    r={"long":[(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,"A long index finger is the clearest indicator of natural authority, ambition, and the drive to lead. Others defer to this person.",["authority","ambition","leadership","confidence"],["Jupiter","Sun","Leo","Aries"],[1,8,19]),(Domain.CHARACTER,ReadingTone.POSITIVE,"High self-confidence, strong identity, natural gravitas. Shadow: ego, difficulty sharing power.",["confidence","gravitas","ego","leadership"],["Jupiter","Sun"],[1,8])],
       "short":[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Shorter index finger indicates modesty, preference for collaboration over command.",["humility","collaboration","modesty"],["Moon","Saturn"],[2,4])],
       "average":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Balanced confidence — leads when needed, follows when appropriate.",["balance","confidence","adaptability"],["Jupiter","Mercury"],[3,5])]}
    return _read_finger("index",f,"Jupiter",{k:[(d,t,ri,kw,a,n) for d,t,ri,kw,a,n in v] for k,v in r.items()})


def _read_middle_finger(f):
    if f is None: return None
    r={"long":[(Domain.CHARACTER,ReadingTone.NEUTRAL,"A long middle finger indicates serious, responsible, duty-conscious nature. Obligations and consequences are always considered.",["responsibility","seriousness","duty","conscientiousness"],["Saturn","Capricorn"],[4,8]),(Domain.CAREER,ReadingTone.POSITIVE,"Reliable, meticulous, conscientious. Excellence through disciplined effort.",["discipline","reliability","meticulous"],["Saturn","Virgo","Capricorn"],[4,8])],
       "short":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Shorter middle finger indicates carefree, spontaneous, risk-tolerant nature. Duty sits lightly.",["spontaneity","freedom","risk_tolerance","lightness"],["Jupiter","Sagittarius"],[3,5])],
       "average":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Balanced sense of responsibility — serious when it matters, light-hearted when appropriate.",["balance","responsibility","flexibility"],["Saturn","Mercury"],[4,5])]}
    return _read_finger("middle",f,"Saturn",{k:[(d,t,ri,kw,a,n) for d,t,ri,kw,a,n in v] for k,v in r.items()})


def _read_ring_finger(f):
    if f is None: return None
    r={"long":[(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,"Long ring finger is a primary indicator of creative talent, aesthetic sensitivity, and drive for recognition. Arts, design, architecture call strongly.",["creativity","artistry","recognition","aesthetics","expression"],["Sun","Apollo","Leo","Venus"],[3,6,1]),(Domain.CHARACTER,ReadingTone.POSITIVE,"Naturally expressive, beauty-oriented, recognition-seeking. Shadow: over-attachment to external validation.",["expressiveness","beauty","recognition_seeking"],["Sun","Leo"],[3,1])],
       "short":[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Shorter ring finger indicates practical orientation over artistic. Less driven by recognition, more by function.",["practicality","function","modesty"],["Saturn","Mercury"],[4,5])],
       "average":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Balanced creative expression — artistic appreciation without overriding need for recognition.",["balance","creativity","appreciation"],["Sun","Venus"],[3,6])]}
    return _read_finger("ring",f,"Sun/Apollo",{k:[(d,t,ri,kw,a,n) for d,t,ri,kw,a,n in v] for k,v in r.items()})


def _read_pinky_finger(f):
    if f is None: return None
    r={"long":[(Domain.CAREER,ReadingTone.POSITIVE,"Long pinky is the clearest communication indicator. Exceptional verbal, written, and persuasive ability. Natural in law, sales, diplomacy, writing.",["communication","persuasion","eloquence","diplomacy","writing"],["Mercury","Gemini","Libra"],[3,5]),(Domain.FINANCE,ReadingTone.POSITIVE,"Long pinky adds commercial intelligence — ability to negotiate and structure deals.",["negotiation","commercial","persuasion"],["Mercury"],[3,5]),(Domain.CHARACTER,ReadingTone.POSITIVE,"Articulate, persuasive, socially intelligent. Words are a superpower.",["articulate","persuasion","social_intelligence"],["Mercury","Gemini"],[3,5])],
       "short":[(Domain.CHARACTER,ReadingTone.NEUTRAL,"Shorter pinky indicates concise, direct communication style. Says what is needed and no more.",["directness","conciseness","honesty"],["Saturn","Mercury"],[4,7])],
       "average":[(Domain.CHARACTER,ReadingTone.POSITIVE,"Balanced communication — can both express and listen effectively.",["balance","communication","listening"],["Mercury"],[3,5])]}
    return _read_finger("pinky",f,"Mercury",{k:[(d,t,ri,kw,a,n) for d,t,ri,kw,a,n in v] for k,v in r.items()})


def _read_skin(s):
    if s is None: return None
    obs_parts=[f"Skin tone: {s.tone.value}"]
    if s.texture: obs_parts.append(f"texture: {s.texture.value}")
    if s.moisture: obs_parts.append(f"moisture: {s.moisture.value}")
    if s.color_cast and s.color_cast!="neutral": obs_parts.append(f"colour cast: {s.color_cast}")
    obs=". ".join(obs_parts)+"."
    if s.texture==SkinTexture.SMOOTH and s.moisture==Magnitude.HIGH: hr="Smooth, well-hydrated skin indicates strong vitality, good lymphatic circulation, and effective cellular renewal."; ht=ReadingTone.POSITIVE
    elif s.texture==SkinTexture.COARSE or s.moisture==Magnitude.LOW: hr="Coarse or dry skin suggests the body may be under hydration or metabolic stress. Thyroid function and nutritional status worth monitoring."; ht=ReadingTone.NEUTRAL
    else: hr="Moderate skin condition — adequate vitality and constitution."; ht=ReadingTone.NEUTRAL
    if s.color_cast=="yellow": hr+=" Yellow cast may indicate liver or digestive stress."; ht=ReadingTone.CHALLENGING
    elif s.color_cast=="pale": hr+=" Pallor may indicate iron deficiency or circulation concern."; ht=ReadingTone.CHALLENGING
    elif s.color_cast=="red": hr+=" Red cast indicates high energy output or circulatory activity."
    cr="Fine, smooth skin texture traditionally indicates refinement, sensitivity, and receptivity." if s.texture==SkinTexture.SMOOTH else "Coarser skin indicates a more robust, earthy, physically oriented character." if s.texture==SkinTexture.COARSE else "Moderate skin texture — balanced between sensitivity and robustness."
    return FeatureReading(feature_name="skin",observation=obs,signal_strength=SignalStrength.MODERATE,
        domains=[_dr(Domain.HEALTH,ht,SignalStrength.MODERATE,hr,["vitality","constitution","hydration","circulation","skin_health"],["Moon","Venus","Sun"],[6,2]),
                 _dr(Domain.CHARACTER,ReadingTone.NEUTRAL,SignalStrength.MODERATE,cr,["sensitivity","refinement","constitution"],["Moon","Earth","Venus"],[2,4])],
        cross_signals=["Skin health — cross-reference with life line vitality and Mercury line"],
        vedic_note="Skin texture and colour indicate current state of Prana and health of the subtle body.",esoteric_note=None)


def _read_cross_hand(comp):
    overall_parts=[]; domain_gaps={}; growth=[]; suppressed_list=[]; fulfilled=[]
    if not comp.shape_match: overall_parts.append(f"The hands carry different elemental energies ({comp.shape_delta}), suggesting significant evolution from innate nature toward a consciously developed self.")
    else: overall_parts.append("Both hands share the same elemental nature — the person is living in alignment with their innate blueprint.")
    line_names=["life_line","heart_line","head_line","fate_line","sun_line","mercury_line"]
    line_labels={"life_line":"Vitality","heart_line":"Emotional life","head_line":"Mental development","fate_line":"Life purpose","sun_line":"Creative expression","mercury_line":"Communication"}
    for line_name in line_names:
        delta=getattr(comp,line_name,None)
        if delta is None: continue
        label=line_labels.get(line_name,line_name); sig=delta.interpretation_signal
        if sig=="developed": growth.append(line_name); domain_gaps[line_name]=f"{label}: consciously developed beyond innate baseline. A healthy growth arc."
        elif sig=="suppressed": suppressed_list.append(line_name); domain_gaps[line_name]=f"{label}: innate potential exceeds current expression. This represents unlived capacity — key growth signal."
        elif sig=="overexpressed": domain_gaps[line_name]=f"{label}: dominant hand significantly exceeds innate baseline. May be over-relied upon or driven by compensation."
        elif sig=="compensated": domain_gaps[line_name]=f"{label}: partially developed from a stronger innate base. Some natural capacity remains underutilised."
        elif sig=="unchanged": fulfilled.append(line_name)
    high_mount_gaps=[f"{k}: {v['signal']}" for k,v in comp.mount_deltas.items() if v["signal"]!="unchanged"]
    if high_mount_gaps: domain_gaps["mounts"]="Mount evolution: "+"; ".join(high_mount_gaps[:4])
    if comp.marriage_count_delta>0: domain_gaps["love"]=f"Dominant hand shows {comp.marriage_count_delta} more union line(s) than the non-dominant — relationships have multiplied beyond original blueprint."
    elif comp.marriage_count_delta<0: domain_gaps["love"]="Non-dominant hand shows more union potential than currently expressed — relational capacity may be underutilised."
    overall=" ".join(overall_parts)
    if suppressed_list: overall+=f" Key suppressed capacities — {', '.join(suppressed_list)} — represent the most important growth opportunity this reading reveals."
    if growth: overall+=f" Consciously developed strengths — {', '.join(growth)} — show deliberate self-cultivation."
    return CrossHandReading(dominant_label=comp.dominant_label,non_dominant_label=comp.non_dominant_label,overall_signal=overall,domain_gaps=domain_gaps,growth_indicators=growth,suppressed=suppressed_list,fulfilled=fulfilled)


# ── v2.0.0 NEW READING FUNCTIONS ─────────────────────────────────────────────

def _read_children_lines(c):
    if c is None or c.count==0:
        return FeatureReading(feature_name="children_lines",observation="No children lines detected.",signal_strength=SignalStrength.ABSENT,
            domains=[_dr(Domain.CHILDREN_FORECAST,ReadingTone.NEUTRAL,SignalStrength.ABSENT,"Absence of children lines does not confirm a childless life. It indicates either fewer significant parenting bonds, or parental energy expressed through creative or mentoring channels rather than biological parenthood.",["childless_possibility","creative_parenting","mentoring"],["Saturn","Moon","Virgo"],[4,7])],
            cross_signals=["Check Venus mount and marriage lines for additional parenting indicators"],
            vedic_note="Absence of Santana Rekha read alongside 5th house in natal chart.",esoteric_note=None)
    depth_rank={"high":3,"moderate":2,"low":1}
    strong_count=sum(1 for line in c.lines if depth_rank.get(line.get("strength","low"),0)==3)
    obs=c.note; domains=[]
    if c.count==1: fc_read="One clearly indicated child or deeply significant parenting bond. Concentrated, deeply felt parental experience."; fc_tone=ReadingTone.POSITIVE
    elif c.count==2: fc_read="Two children lines — a family of two, or two distinct deeply significant parenting bonds."; fc_tone=ReadingTone.POSITIVE
    elif c.count>=3: fc_read=f"{c.count} children lines detected — a larger family or extensive parenting energy extending to mentoring and community nurturing."; fc_tone=ReadingTone.STRONGLY_POSITIVE
    else: fc_read="Children line indicators present."; fc_tone=ReadingTone.NEUTRAL
    if strong_count>=1: fc_read+=" The strongly etched line(s) indicate healthy, robust children and a strong parental bond."
    domains.append(_dr(Domain.CHILDREN_FORECAST,fc_tone,SignalStrength.MODERATE,fc_read,["children_indicated","parenting","family","parental_bond"],["Moon","Venus","Cancer","Jupiter"],[2,6]))
    domains.append(_dr(Domain.LOVE,ReadingTone.POSITIVE,SignalStrength.MODERATE,f"The {c.count} children line(s) indicate that family creation is a meaningful thread in the relationship narrative.",["family","children_in_love","parenting_partnership"],["Moon","Venus","Cancer"],[6,2]))
    if strong_count>=1: domains.append(_dr(Domain.HEALTH,ReadingTone.POSITIVE,SignalStrength.WEAK,"Strongly etched children lines traditionally indicate children with good constitutional health.",["children_health","robust_offspring"],["Jupiter","Sun"],[6,3]))
    return FeatureReading(feature_name="children_lines",observation=obs,signal_strength=SignalStrength.MODERATE,domains=domains,
        cross_signals=["Children lines — always read alongside Venus mount and marriage lines","Strong children lines + strong fate line = successful, purposeful children"],
        vedic_note="Santana Rekha — number and depth correspond to karmic agreements made with incoming souls.",
        esoteric_note="Each children line represents a soul contract — an agreement made before incarnation to parent or guide a specific soul.")


def _read_health_markers(markers):
    if not markers: return None
    obs=f"{len(markers)} health marker(s) detected: "+", ".join(m.marker_type for m in markers[:4])+("..." if len(markers)>4 else ".")
    domains=[]; high_sev=[m for m in markers if m.severity==Magnitude.HIGH]; moderate_sev=[m for m in markers if m.severity==Magnitude.MODERATE]
    for marker in markers:
        tone=ReadingTone.CHALLENGING if marker.severity==Magnitude.HIGH else ReadingTone.NEUTRAL if marker.severity==Magnitude.MODERATE else ReadingTone.POSITIVE
        sig=SignalStrength.STRONG if marker.severity==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.HEALTH,tone,sig,marker.note,["health_marker",marker.system.replace(" ","_"),marker.marker_type],["Saturn","Moon","Virgo","Mercury"],[6,4]))
    if high_sev: summary=f"{len(high_sev)} high-severity health markers detected — systems: "+", ".join(m.system for m in high_sev[:3])+". Warrant conscious attention."; st=ReadingTone.CHALLENGING
    elif moderate_sev: summary=f"{len(moderate_sev)} moderate health markers. Areas of sensitivity: "+", ".join(m.system for m in moderate_sev[:3])+". Lifestyle awareness recommended."; st=ReadingTone.NEUTRAL
    else: summary="Minor health markers only — general wellness practices sufficient."; st=ReadingTone.POSITIVE
    domains.insert(0,_dr(Domain.HEALTH,st,SignalStrength.STRONG,summary,["health_overview","constitutional_vulnerabilities","preventive_focus"],["Saturn","Moon","Virgo"],[6,4,7]))
    return FeatureReading(feature_name="health_markers",observation=obs,signal_strength=SignalStrength.STRONG if high_sev else SignalStrength.MODERATE,domains=domains,
        cross_signals=["Health markers — always cross-reference with life line vitality","Mercury line islands confirm digestive health markers"],
        vedic_note="Palm health markers correspond to specific planetary afflictions in Vedic astrology.",esoteric_note=None)


def _read_spiritual_markers(markers):
    if not markers: return None
    strong_markers=[m for m in markers if m.strength==Magnitude.HIGH]; obs=f"{len(markers)} spiritual gift indicator(s) detected: "+", ".join(m.gift_indicated for m in markers[:4])+("..." if len(markers)>4 else ".")
    domains=[]
    for marker in markers:
        tone=ReadingTone.STRONGLY_POSITIVE if marker.strength==Magnitude.HIGH else ReadingTone.POSITIVE if marker.strength==Magnitude.MODERATE else ReadingTone.NEUTRAL
        sig=SignalStrength.STRONG if marker.strength==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.SPIRITUAL,tone,sig,marker.note,["spiritual_gift",marker.gift_indicated,marker.marker_type],["Neptune","Moon","Uranus","Pisces"],[11,7,2]))
        if marker.gift_indicated in ("psychic_sensitivity","spiritual_mediumship","healing_communication"):
            domains.append(_dr(Domain.SPIRIT_WORLD,tone,sig,f"Spiritual marker indicates elevated sensitivity to non-physical dimensions. Gift: {marker.gift_indicated}.",["spirit_world_sensitivity",marker.gift_indicated,"thin_veil"],["Neptune","Pluto","Pisces","Scorpio"],[11,7,22]))
    if strong_markers: summary=f"{len(strong_markers)} strong spiritual gift marker(s): "+", ".join(m.gift_indicated for m in strong_markers[:3])+". These are genuine abilities requiring conscious development."; st=ReadingTone.STRONGLY_POSITIVE
    else: summary=f"{len(markers)} spiritual indicator(s) present. Spiritual sensitivity is part of this person's natural constitution."; st=ReadingTone.POSITIVE
    domains.insert(0,_dr(Domain.SPIRITUAL,st,SignalStrength.STRONG,summary,["spiritual_overview","psychic_gifts","spiritual_constitution"],["Neptune","Moon","Uranus"],[11,7,2]))
    return FeatureReading(feature_name="spiritual_markers",observation=obs,signal_strength=SignalStrength.STRONG if strong_markers else SignalStrength.MODERATE,domains=domains,
        cross_signals=["Spiritual markers — amplified by Moon mount elevation","Neptune mount + Moon mount together create strongest psychic configuration"],
        vedic_note="Spiritual gift markers correspond to strong Ketu and Neptune influences — past-life spiritual development carried forward.",
        esoteric_note="Spiritual markers are the palm's record of the soul's accumulated gifts from previous lives.")


def _read_life_line_assessment(assessment):
    if assessment is None: return None
    obs=assessment.assessment_note; domains=[]
    ht=ReadingTone.STRONGLY_POSITIVE if assessment.vitality_level==Magnitude.HIGH else ReadingTone.POSITIVE if assessment.vitality_level==Magnitude.MODERATE else ReadingTone.NEUTRAL
    domains.append(_dr(Domain.HEALTH,ht,SignalStrength.MODERATE,f"Vitality: {assessment.vitality_level.value}. Strength over time: {assessment.strength_over_time}. {assessment.assessment_note}",["vitality_assessment","longevity","constitutional_strength"],["Sun","Mars","Jupiter"],[1,4,9]))
    if assessment.longevity_indicator=="long": dt_tone=ReadingTone.POSITIVE; dt_read="Long life indicated. The life force carries sustained momentum into advanced age. Transition when it comes is likely to be after a full, complete life."
    elif assessment.longevity_indicator=="average": dt_tone=ReadingTone.NEUTRAL; dt_read="Average longevity indicators. Life span shaped more by lifestyle choices than constitutional predetermination."
    else: dt_tone=ReadingTone.CHALLENGING; dt_read="Life line configuration warrants conscious attention to vitality. This is a call to support the life force through rest and nourishment — not a prediction of early death."
    if assessment.island_count>0: dt_read+=f" {assessment.island_count} island formation(s) indicate periods of reduced vitality. These are temporary depressions."
    if assessment.fork_at_end: dt_read+=" Fork at end of life line — a significant life direction change in later years. Often indicates major transformation or spiritual awakening in older age."
    domains.append(_dr(Domain.DEATH_TRANSITION,dt_tone,SignalStrength.MODERATE,dt_read,["longevity","life_span","transition_timing","vitality_arc"],["Saturn","Pluto","Sun"],[4,8,9]))
    return FeatureReading(feature_name="life_line_assessment",observation=obs,signal_strength=SignalStrength.MODERATE,domains=domains,
        cross_signals=["Life line assessment — confirm with fate line start position","Life line fork — cross-reference with 4th Pinnacle transition age"],
        vedic_note="Ayushya Rekha assessment always read alongside natal chart 8th house, longevity yogas, and current Dasha period.",
        esoteric_note="The life line traces the arc of the soul's chosen incarnation.")


def _read_fate_line_assessment(assessment):
    if assessment is None: return None
    obs=assessment.assessment_note; domains=[]
    ct=ReadingTone.STRONGLY_POSITIVE if assessment.career_strength==Magnitude.HIGH else ReadingTone.POSITIVE if assessment.career_strength==Magnitude.MODERATE else ReadingTone.NEUTRAL
    cr=f"Career stability: {assessment.career_stability}. Career begins: {assessment.career_start}. {'Self-made trajectory.' if assessment.self_made else 'Support from others aids career.'} {assessment.assessment_note}"
    if assessment.forks_detected>=2: cr+=f" {assessment.forks_detected} career forks — multiple income streams or multi-chapter career indicated."
    domains.append(_dr(Domain.CAREER,ct,SignalStrength.MODERATE,cr,["career_assessment","career_stability","self_made",assessment.career_stability],["Saturn","Sun","Jupiter","Capricorn"],[8,4,1]))
    wt=ReadingTone.STRONGLY_POSITIVE if assessment.wealth_potential==Magnitude.HIGH else ReadingTone.POSITIVE if assessment.wealth_potential==Magnitude.MODERATE else ReadingTone.NEUTRAL
    wr=f"Wealth potential: {assessment.wealth_potential.value}. {'Self-made wealth is the most natural accumulation pathway.' if assessment.self_made else 'Collaborative wealth-building is favoured.'}"
    if assessment.breaks_in_line>=2: wr+=f" {assessment.breaks_in_line} breaks suggest income may be inconsistent during career change phases."
    domains.append(_dr(Domain.WEALTH,wt,SignalStrength.MODERATE,wr,["wealth_assessment","earning_power","financial_stability"],["Saturn","Jupiter","Sun"],[8,4,22]))
    if assessment.career_strength==Magnitude.HIGH and assessment.career_stability=="stable": domains.append(_dr(Domain.LEGACY,ReadingTone.POSITIVE,SignalStrength.WEAK,"A strong, stable fate line suggests a professional legacy — the person's work is remembered and builds upon itself over decades.",["professional_legacy","career_impact","lasting_contribution"],["Saturn","Sun"],[8,22]))
    return FeatureReading(feature_name="fate_line_assessment",observation=obs,signal_strength=SignalStrength.MODERATE,domains=domains,
        cross_signals=["Fate line assessment — always read alongside sun line","Fate line breaks correlate with Personal Year 1 and 9 numerology transitions"],
        vedic_note="Bhagya Rekha detailed assessment. Self-made (wrist to Saturn) = strong prarabdha karma.",esoteric_note=None)


def _read_infidelity_markers(markers):
    if not markers: return None
    risk_markers=[m for m in markers if m.direction=="risk_factor"]; stabilising=[m for m in markers if m.direction=="stabilising"]
    obs=f"{len(markers)} fidelity marker(s) — {len(risk_markers)} risk factor(s), {len(stabilising)} stabilising indicator(s)."
    domains=[]
    for marker in markers:
        tone=ReadingTone.CHALLENGING if (marker.direction=="risk_factor" and marker.significance==Magnitude.HIGH) else ReadingTone.NEUTRAL if marker.direction=="risk_factor" else ReadingTone.POSITIVE
        sig=SignalStrength.STRONG if marker.significance==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.LOVE,tone,sig,marker.note,["fidelity_marker",marker.marker_type,marker.direction],["Venus","Mars","Scorpio","Pluto"],[2,5,6]))
        if marker.marker_type in ("high_firm_venus_mount","forked_heart_line","chained_heart_line"):
            domains.append(_dr(Domain.SEXUALITY,tone,sig,f"Sexuality marker: {marker.note}",["sexuality_indicator",marker.marker_type,"desire_pattern"],["Venus","Mars","Scorpio"],[2,5,8]))
    high_risk=[m for m in risk_markers if m.significance==Magnitude.HIGH]
    if len(high_risk)>=2: summary="Multiple high-significance fidelity risk factors present. Conscious commitment work and clear relational agreements are recommended."; st=ReadingTone.CHALLENGING
    elif risk_markers and not stabilising: summary="Fidelity risk factors present without strong stabilising markers. Awareness and intentional commitment are beneficial."; st=ReadingTone.NEUTRAL
    elif stabilising and not risk_markers: summary="Strong fidelity and loyalty indicators present. Commitment and reliability in relationships are natural strengths."; st=ReadingTone.POSITIVE
    else: summary="Mixed fidelity indicators — some risk factors balanced by stabilising markers. Conscious attention to relational commitments is recommended."; st=ReadingTone.NEUTRAL
    domains.insert(0,_dr(Domain.LOVE,st,SignalStrength.MODERATE,summary,["fidelity_overview","loyalty_assessment","relationship_integrity"],["Venus","Saturn","Moon"],[2,6,4]))
    return FeatureReading(feature_name="infidelity_markers",observation=obs,signal_strength=SignalStrength.MODERATE,domains=domains,
        cross_signals=["Fidelity markers — always read alongside marriage lines and heart line quality","Strong fate line often stabilises fidelity risk factors"],
        vedic_note="Venus and Mars placements in natal chart will strongly qualify palm fidelity indicators.",esoteric_note=None)


def _detect_cross_signals(reading):
    domain_tones={d.value:{} for d in ALL_DOMAINS}
    features=[
        reading.life_line,reading.heart_line,reading.head_line,
        reading.fate_line,reading.sun_line,reading.mercury_line,
        reading.mount_venus,reading.mount_jupiter,reading.mount_saturn,
        reading.mount_apollo,reading.mount_mercury,
        reading.mount_mars_upper,reading.mount_moon,reading.mount_neptune,
        reading.thumb,reading.index,reading.middle,reading.ring,reading.pinky,
        reading.marriage_lines,reading.skin,
        reading.children_lines_reading,reading.health_markers_reading,
        reading.spiritual_markers_reading,reading.life_line_assessment_reading,
        reading.fate_line_assessment_reading,reading.infidelity_markers_reading,
    ]
    for feat in features:
        if feat is None or feat.signal_strength in (SignalStrength.ABSENT,SignalStrength.WEAK): continue
        for dr in feat.domains:
            domain_tones[dr.domain.value][feat.feature_name]=dr.tone
    positive_tones={ReadingTone.POSITIVE,ReadingTone.STRONGLY_POSITIVE}; challenging_tones={ReadingTone.CHALLENGING,ReadingTone.STRONGLY_CHALLENGING}
    confirmed={}; conflicting={}
    for domain,feature_tones in domain_tones.items():
        pos=[f for f,t in feature_tones.items() if t in positive_tones]; neg=[f for f,t in feature_tones.items() if t in challenging_tones]
        if len(pos)>=2: confirmed[domain]=pos
        if len(neg)>=2:
            if domain not in conflicting: conflicting[domain]=[]
            conflicting[domain].extend(neg)
        if pos and neg:
            if domain not in conflicting: conflicting[domain]=[]
            conflicting[domain].extend([f"CONFLICT: {p} vs {n}" for p in pos[:2] for n in neg[:2]])
    return confirmed,conflicting


def _extract_dominant_themes(reading):
    keyword_count={}
    features=[
        reading.life_line,reading.heart_line,reading.head_line,
        reading.fate_line,reading.sun_line,reading.mercury_line,
        reading.mount_venus,reading.mount_jupiter,reading.mount_saturn,
        reading.mount_apollo,reading.mount_mercury,
        reading.mount_moon,reading.mount_neptune,
        reading.thumb,reading.index,reading.middle,reading.ring,reading.pinky,
        reading.skin,
        reading.children_lines_reading,reading.health_markers_reading,
        reading.spiritual_markers_reading,reading.life_line_assessment_reading,
        reading.fate_line_assessment_reading,reading.infidelity_markers_reading,
    ]
    for feat in features:
        if feat is None: continue
        for dr in feat.domains:
            for kw in dr.keywords:
                keyword_count[kw]=keyword_count.get(kw,0)+1
    return [kw for kw,_ in sorted(keyword_count.items(),key=lambda x:x[1],reverse=True)[:12]]


class PalmReader:
    def read(self, features: PalmFeatures) -> PalmReading:
        t0=time.monotonic()
        if features.error or features.hand_shape is None:
            return self._error_reading(features)
        reading=PalmReading(hand_label=features.hand_label,reading_ms=0,overall_confidence=features.confidence,hand_shape=_read_hand_shape(features.hand_shape))
        reading.life_line    = _read_life_line(features.life_line)
        reading.heart_line   = _read_heart_line(features.heart_line)
        reading.head_line    = _read_head_line(features.head_line)
        reading.fate_line    = _read_fate_line(features.fate_line)
        reading.sun_line     = _read_sun_line(features.sun_line)
        reading.mercury_line = _read_mercury_line(features.mercury_line)
        reading.mount_venus      = _read_mount_venus(features.mount_venus)
        reading.mount_jupiter    = _read_mount_jupiter(features.mount_jupiter)
        reading.mount_saturn     = _read_mount_saturn(features.mount_saturn)
        reading.mount_apollo     = _read_mount_apollo(features.mount_apollo)
        reading.mount_mercury    = _read_mount_mercury(features.mount_mercury)
        reading.mount_mars_upper = _read_mount_mars(features.mount_mars_upper,features.mount_mars_lower)
        reading.mount_moon       = _read_mount_moon(features.mount_moon)
        reading.mount_neptune    = _read_mount_neptune(features.mount_neptune)
        reading.thumb  = _read_thumb(features.thumb)
        reading.index  = _read_index_finger(features.index)
        reading.middle = _read_middle_finger(features.middle)
        reading.ring   = _read_ring_finger(features.ring)
        reading.pinky  = _read_pinky_finger(features.pinky)
        reading.marriage_lines = _read_marriage_lines(features.marriage_lines)
        reading.skin           = _read_skin(features.skin)
        reading.children_lines_reading       = _read_children_lines(features.children_lines)
        reading.health_markers_reading       = _read_health_markers(features.health_markers or [])
        reading.spiritual_markers_reading    = _read_spiritual_markers(features.spiritual_markers or [])
        reading.life_line_assessment_reading = _read_life_line_assessment(features.life_line_assessment)
        reading.fate_line_assessment_reading = _read_fate_line_assessment(features.fate_line_assessment)
        reading.infidelity_markers_reading   = _read_infidelity_markers(features.infidelity_markers or [])
        reading.confirmed_signals,reading.conflicting_signals = _detect_cross_signals(reading)
        reading.dominant_themes = _extract_dominant_themes(reading)
        reading.reading_ms = int((time.monotonic()-t0)*1000)
        logger.info("PalmReader.read completed",extra={"hand_label":features.hand_label,"confidence":features.confidence,"reading_ms":reading.reading_ms,"v2_features":6})
        return reading

    def read_both(self, dual: DualPalmFeatures) -> Tuple[PalmReading, PalmReading, CrossHandReading]:
        dom=self.read(dual.dominant); non_dom=self.read(dual.non_dominant); ch=_read_cross_hand(dual.comparison)
        dom.cross_hand=ch; non_dom.cross_hand=ch
        return dom,non_dom,ch

    def _error_reading(self, features: PalmFeatures) -> PalmReading:
        return PalmReading(hand_label=features.hand_label,reading_ms=0,overall_confidence=0.0,
            hand_shape=HandShapeReading(shape=HandShape.MIXED,element="unknown",ruling_planet="unknown",
                observation=features.error or "Analysis failed.",character_core="",domains=[],vedic_note=""))


def read_palm(features: PalmFeatures) -> PalmReading:
    return PalmReader().read(features)


def read_both_palms(dual: DualPalmFeatures) -> Tuple[PalmReading, PalmReading, CrossHandReading]:
    return PalmReader().read_both(dual)
