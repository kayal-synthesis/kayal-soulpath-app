"""
Face Reader — KAYAL Synthesis Platform
=======================================
Physiognomy knowledge base and domain-indexed interpretation layer.

v2.0.0 additions:
    - Domain enum expanded: SPIRIT_WORLD, DEATH_TRANSITION, IDENTITY, PARENTS, LEGACY
    - New imports from face_engine v3.0.0: ParentInheritanceMarker, FaceHealthMarker,
      FaceSpiritualMarker, FaceLongevityMarker
    - FaceReading extended: parent_inheritance, face_health_zones,
      spiritual_face, longevity_face (all Optional[FeatureReading])
    - New reading functions: _read_parent_inheritance, _read_face_health_zones,
      _read_spiritual_face, _read_longevity_face
    - _detect_cross_signals and _extract_dominant_themes updated
    - FaceReader.read() updated to populate all 4 new fields
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

from .face_engine import (
    FaceFeatures, FaceShape, EyeFeature, EyeShape, EyeSet,
    NoseFeature, NoseShape, LipFeature, LipShape, BrowFeature, BrowShape,
    ForeheadFeature, ForeheadHeight, ForeheadWidth,
    JawFeature, JawlineType, ChinShape, CheekFeature, CheekbonePosition,
    SkinFeature, SkinTexture, SkinTone, ExpressionFeature, EmotionLabel,
    AgingMarker, SymmetryFeature, FacialProportions, Magnitude,
    ParentInheritanceMarker, FaceHealthMarker, FaceSpiritualMarker, FaceLongevityMarker,
)

logger = logging.getLogger(__name__)


class Domain(str, Enum):
    LOVE      = "love"
    HEALTH    = "health"
    WEALTH    = "wealth"
    CAREER    = "career"
    SPIRITUAL = "spiritual"
    FINANCE   = "finance"
    CHARACTER = "character"
    TIMING    = "timing"
    SPIRIT_WORLD     = "spirit_world"
    DEATH_TRANSITION = "death_transition"
    IDENTITY         = "identity"
    PARENTS          = "parents"
    LEGACY           = "legacy"

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
    chinese_element: str
    mian_xiang_note: Optional[str] = None


@dataclass
class FeatureReading:
    feature_name:    str
    observation:     str
    signal_strength: SignalStrength
    domains:         List[DomainReading]
    cross_signals:   List[str]
    chinese_note:    Optional[str]
    vedic_note:      Optional[str]
    western_note:    Optional[str]


@dataclass
class FaceShapeReading:
    shape:          FaceShape
    element:        str
    ruling_planet:  str
    life_period:    str
    observation:    str
    character_core: str
    domains:        List[DomainReading]
    chinese_note:   str
    vedic_note:     str
    western_note:   str


@dataclass
class SymmetryReading:
    overall_score: float
    observation:   str
    domains:       List[DomainReading]
    zone_notes:    Dict[str, str]


@dataclass
class ProportionReading:
    thirds_balance: str
    fifths_note:    str
    observation:    str
    domains:        List[DomainReading]


@dataclass
class ExpressionReading:
    dominant_signal: EmotionLabel
    observation:     str
    domains:         List[DomainReading]
    habitual_note:   str


@dataclass
class AgingReading:
    observation:    str
    vitality_signal: ReadingTone
    domains:         List[DomainReading]
    timing_note:     str


@dataclass
class FaceReading:
    """Complete face reading payload for the Logic Layer.
    v2.0.0: 4 new optional FeatureReading fields added after aging_markers.
    All v1.0.0 fields preserved exactly."""
    image_hash:          str
    reading_ms:          int
    overall_confidence:  float
    face_shape:          FaceShapeReading
    symmetry:            Optional[SymmetryReading]   = None
    proportions:         Optional[ProportionReading] = None
    forehead:            Optional[FeatureReading]    = None
    eyes:                Optional[FeatureReading]    = None
    brows:               Optional[FeatureReading]    = None
    nose:                Optional[FeatureReading]    = None
    cheeks:              Optional[FeatureReading]    = None
    lips:                Optional[FeatureReading]    = None
    jaw:                 Optional[FeatureReading]    = None
    skin:                Optional[FeatureReading]    = None
    expression:          Optional[ExpressionReading] = None
    aging_markers:       Optional[AgingReading]      = None
    confirmed_signals:   Dict[str, List[str]]        = field(default_factory=dict)
    conflicting_signals: Dict[str, List[str]]        = field(default_factory=dict)
    dominant_themes:     List[str]                   = field(default_factory=list)
    life_period_map:     Dict[str, str]              = field(default_factory=dict)
    # ── v2.0.0 new fields ────────────────────────────────────────────────
    parent_inheritance:  Optional[FeatureReading]    = None
    face_health_zones:   Optional[FeatureReading]    = None
    spiritual_face:      Optional[FeatureReading]    = None
    longevity_face:      Optional[FeatureReading]    = None

    def to_dict(self) -> Dict:
        return asdict(self)


def _dr(domain, tone, strength, reading, keywords, astro, num,
        element="mixed", mian_xiang=None) -> DomainReading:
    return DomainReading(domain=domain, tone=tone, signal_strength=strength,
        reading=reading, keywords=keywords, astro_affinity=astro, numerology_link=num,
        chinese_element=element, mian_xiang_note=mian_xiang)


def _feat_sig(confidence: float) -> SignalStrength:
    if confidence >= 0.75: return SignalStrength.STRONG
    elif confidence >= 0.50: return SignalStrength.MODERATE
    elif confidence >= 0.25: return SignalStrength.WEAK
    return SignalStrength.ABSENT


def _read_face_shape(shape, props):
    if shape == FaceShape.OVAL:
        obs="Oval face: balanced proportions, gently tapered toward chin. The most harmonious structural form in classical physiognomy."
        core="The oval face is regarded as the most balanced structural expression — indicating a person who can navigate between extremes, adapt readily, and lead with natural grace."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Balanced, adaptable, and naturally harmonious character. Diplomatic by structural temperament — sees multiple sides naturally. Shadow: indecision when all options appear equal.",["balance","adaptability","diplomacy","harmony","grace"],["Venus","Jupiter","Libra","Sagittarius"],[6,3,9],"metal","Metal element face — associated with refinement, justice, and clarity."),
            _dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Excels in roles requiring diplomacy, communication, and people management. Natural executive presence. Leadership through consensus-building. Highly effective in public-facing roles.",["leadership","diplomacy","communication","executive","public_facing"],["Venus","Jupiter","Mercury","Libra"],[6,3,11],"metal"),
            _dr(Domain.LOVE,ReadingTone.POSITIVE,SignalStrength.STRONG,"The oval face indicates balanced give-and-take in relationships. Neither overly dominant nor passive. Long-term partnerships are favoured over serial intensity.",["partnership","balance","harmony","complementarity"],["Venus","Libra","Jupiter"],[6,2,9],"metal"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.STRONG,"Steady wealth accumulation through relationship and reputation. Wealth comes through being trusted, not through aggressive pursuit.",["steady_accumulation","reputation","trust","relationship_wealth"],["Venus","Jupiter","Taurus"],[6,3],"metal"),
            _dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,SignalStrength.MODERATE,"The balanced oval face indicates openness to multiple spiritual paths. The seeker who can hold paradox.",["openness","balance","seeking","integration"],["Jupiter","Neptune","Libra"],[3,6,7],"metal"),
        ]
        return FaceShapeReading(shape=shape,element="metal",ruling_planet="Venus/Jupiter",life_period="All periods balanced — no single decade dominates",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the oval face (鹅蛋脸 goose-egg face) is the most auspicious shape. Metal element. All twelve houses are well-proportioned. Fortune tends to be consistent across all life decades.",
            vedic_note="Samudrika Shastra: the oval face (Chandra Mukha) indicates auspicious life with balanced karma. Associated with Shukra (Venus) and Guru (Jupiter).",
            western_note="Lavater described the oval face as 'the face of genius' — balanced enough to perceive all things, distinctive enough to express them.")

    elif shape == FaceShape.ROUND:
        obs="Round face: width and height approximately equal, full cheeks, soft jaw, rounded chin. Maximum soft-tissue volume relative to bone structure."
        core="The round face in Eastern tradition is associated with Water element — fluid, nurturing, emotionally intelligent, and socially magnetic."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Warm, approachable, empathic, and socially gifted. Naturally creates safety for others. Excellent emotional memory. Shadow: difficulty with boundaries.",["warmth","empathy","approachability","social_intelligence","nurturing"],["Moon","Cancer","Pisces","Venus"],[2,6,11],"water","Water face — associated with wisdom, adaptability, and social grace."),
            _dr(Domain.LOVE,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Exceptional warmth and nurturing energy in relationships. Love expressed through care, presence, and emotional attunement. Naturally seeks long-term, family-oriented partnership.",["nurturing","warmth","emotional_attunement","stability","family"],["Moon","Cancer","Venus","Taurus"],[2,6],"water"),
            _dr(Domain.CAREER,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Excels in people-centred fields: counselling, healthcare, teaching, hospitality, social work. Team environments are natural.",["people_centred","counselling","healthcare","teaching","team"],["Moon","Cancer","Venus"],[2,6],"water"),
            _dr(Domain.HEALTH,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Round face associated with strong digestive system. Potential vulnerability in fluid regulation, lymphatic drainage, and hormonal balance.",["digestion","hormonal","lymphatic","emotional_health"],["Moon","Cancer","Neptune"],[2,6],"water"),
            _dr(Domain.WEALTH,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Wealth through service and people-driven endeavours. Abundance flows naturally when aligned with service purpose.",["service_wealth","people_driven","care_economy"],["Moon","Venus","Cancer"],[2,6],"water"),
            _dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Naturally devotional. Round face associated with Bhakti traditions — love and service as spiritual practice.",["devotion","bhakti","community","service"],["Moon","Neptune","Cancer","Pisces"],[2,11],"water"),
        ]
        return FaceShapeReading(shape=shape,element="water",ruling_planet="Moon",life_period="Middle decades (40s–50s) — nose and cheek period strongest",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the round face (圆面) is the Water element face. Associated with adaptability, social grace, and the capacity to flow around obstacles. Middle-life period (nose house) typically strongest.",
            vedic_note="Samudrika Shastra: the round full face (Purna Mukha) indicates generous, prosperous, and socially blessed life. Strong Moon and Venus.",
            western_note="Lavater associated the full round face with benevolence, sensual appreciation, and communal warmth.")

    elif shape == FaceShape.SQUARE:
        obs="Square face: jaw width approximately equal to forehead width, strong defined jawline, angular facial structure."
        core="The square face signals the person of action, determination, and enduring will. Earth element — stable, persistent, resistant to being moved."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Determined, reliable, persistent, and practically intelligent. Natural authority through consistency and follow-through. Shadow: stubbornness, resistance to necessary change.",["determination","reliability","persistence","authority","consistency"],["Saturn","Mars","Capricorn","Aries"],[4,8,1],"earth","Earth face — stability, persistence, and practical intelligence."),
            _dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Natural leader, manager, and builder. Excels in military, engineering, law, finance, construction, and executive management.",["leadership","management","execution","strategy","endurance"],["Saturn","Mars","Capricorn","Virgo"],[4,8,22],"earth"),
            _dr(Domain.LOVE,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Loyal and protective in love — once committed, deeply so. Expresses affection through action. Seeks stability above romantic excitement.",["loyalty","protection","provision","stability","commitment"],["Saturn","Taurus","Capricorn"],[4,8],"earth"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.STRONG,"Builds wealth steadily and keeps it. Conservative financial instincts. Strong in property, tangible assets, and systematic investment.",["accumulation","property","conservative","systematic","tangible_assets"],["Saturn","Taurus","Capricorn"],[4,8],"earth"),
            _dr(Domain.HEALTH,ReadingTone.POSITIVE,SignalStrength.STRONG,"Strong physical constitution with excellent endurance. Vulnerabilities in joints, spine, and teeth under prolonged stress.",["endurance","constitution","joints","skeletal","stress_tolerance"],["Saturn","Capricorn","Virgo"],[4,8],"earth"),
            _dr(Domain.FINANCE,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Conservative, systematic, long-horizon financial thinker. Prefers real estate, bonds, and businesses with predictable revenue.",["conservative","systematic","long_horizon","security_first"],["Saturn","Capricorn","Taurus"],[4,8,22],"earth"),
        ]
        return FaceShapeReading(shape=shape,element="earth",ruling_planet="Saturn/Mars",life_period="Later decades (50s–70s) — jaw and chin period is strongest",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the square face (方面) is the Earth element face. Strongest period: jaw house (ages 61–70). Associated with authority, practical achievement, late-life recognition.",
            vedic_note="Samudrika Shastra: strong angular face indicates Kshatriya quality — the warrior and protector. Associated with Mars and Saturn.",
            western_note="Lavater described the square face as belonging to those of 'strong passions, firm will, and capacity for sustained effort.'")

    elif shape == FaceShape.HEART:
        obs="Heart face: broad forehead tapering significantly to a narrow chin. Widest point is the forehead."
        core="The heart-shaped face is governed by Fire element. The broad forehead signals intellectual and intuitive capacity in early life."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Creative, intuitive, passionate, and independently minded. Naturally inspiring — draws others through vision. Shadow: impulsivity, difficulty sustaining what is begun.",["creativity","intuition","passion","vision","inspiration"],["Mars","Sun","Aries","Leo","Sagittarius"],[1,3,9],"fire","Fire face — visionary, inspired, and energetically leading."),
            _dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Natural creative, entrepreneur, and pioneer. Strongest in early-to-middle career. Excels in design, arts, technology, consulting.",["creativity","entrepreneurship","pioneering","design","innovation"],["Mars","Sun","Uranus","Aries","Aquarius"],[1,3,9],"fire"),
            _dr(Domain.LOVE,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Passionate and idealistic in love. Early relationship patterns may be intense but variable. Mature love settles into deep, inspired partnership.",["passion","idealism","intellectual_match","intensity"],["Mars","Venus","Aries","Leo"],[1,3,9],"fire"),
            _dr(Domain.HEALTH,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Fire-type constitution — high energy output. Prone to adrenal fatigue and stress-related burnout. Rest must be deliberately scheduled.",["burnout","adrenal","nervous_system","energy_management"],["Mars","Sun","Aries"],[1,9],"fire"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Wealth through creative and intellectual contribution. Early career can generate strongly. Later wealth requires more deliberate financial discipline.",["creative_wealth","intellectual_contribution","early_peak"],["Mars","Jupiter","Sun"],[1,3],"fire"),
            _dr(Domain.SPIRITUAL,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"The broad forehead is the classic mark of heightened intuition and spiritual receptivity. Visions, strong intuitive knowing, and inspired states are natural.",["intuition","vision","spiritual_receptivity","inspiration"],["Mars","Sun","Uranus","Neptune","Aries"],[1,7,9],"fire"),
        ]
        return FaceShapeReading(shape=shape,element="fire",ruling_planet="Mars/Sun",life_period="Early decades (15–40) — forehead period is strongest",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the heart face is the Fire element face. Forehead house (ages 15–30) is the strongest period. The narrow chin house (ages 61–70) requires deliberate cultivation.",
            vedic_note="Samudrika Shastra: broad-forehead narrow-chin face — strong Budha and Mangala influence. High intellectual capacity with equally high need for grounding.",
            western_note="Lavater associated the high, broad forehead with 'the mark of genius' — elevated thinking and visionary capacity.")

    elif shape == FaceShape.OBLONG:
        obs="Oblong face: significantly longer than wide, consistent width from forehead through jaw."
        core="Oblong face corresponds to Wood element — upward-growing, disciplined, principled, and oriented toward long-term growth. Analytical intelligence is primary."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Analytical, principled, methodical, and quietly ambitious. Processes deeply before acting. Shadow: can appear aloof or emotionally distant.",["analytical","principled","methodical","intelligence","discipline"],["Mercury","Saturn","Virgo","Capricorn"],[4,7,8],"wood","Wood face — associated with growth, principle, and intellectual achievement."),
            _dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Natural in fields requiring depth: academia, research, law, medicine, philosophy, and technical sciences. Career builds slowly but reaches significant depth.",["research","academia","analysis","expertise","depth"],["Mercury","Saturn","Virgo","Capricorn"],[4,7,8],"wood"),
            _dr(Domain.LOVE,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Reserved in love — takes time to trust. Values intellectual compatibility. Deeply loyal once committed. Needs partner who respects need for solitude.",["reserved","intellectual_match","loyalty","solitude_need"],["Mercury","Saturn","Virgo"],[4,7],"wood"),
            _dr(Domain.HEALTH,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Wood element constitution — liver, tendons, and nervous system are key. Prone to tension headaches and eye strain from sustained mental effort.",["liver","nervous_system","eye_strain","tension","movement"],["Mercury","Jupiter","Virgo"],[4,7],"wood"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Wealth through expertise, specialisation, and sustained contribution. Slow and steady accumulation over a long career arc.",["expertise","specialisation","knowledge_business","slow_build"],["Mercury","Saturn","Jupiter"],[4,7,8],"wood"),
            _dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Drawn to philosophical and contemplative spiritual traditions. Meditation, study, and solitary practice are natural spiritual vehicles.",["contemplation","philosophy","study","solitary_practice"],["Mercury","Saturn","Jupiter"],[4,7],"wood"),
        ]
        return FaceShapeReading(shape=shape,element="wood",ruling_planet="Mercury/Saturn",life_period="All periods build gradually — career peak in middle decades",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the long narrow face (長面) is Wood element. Fortune builds gradually across all decades. Middle period (nose and cheek houses) shows strongest results.",
            vedic_note="Samudrika Shastra: the long face (Ayata Mukha) indicates scholarly nature and sustained intellectual contribution. Strong Budha.",
            western_note="Western tradition associates the long face with melancholic temperament — deep-feeling, principled, and introspective.")

    elif shape == FaceShape.DIAMOND:
        obs="Diamond face: narrow forehead and narrow chin with widest point at the cheekbones."
        core="The diamond face is rare and powerful. Prominent cheekbones signal authority, intensity, and the capacity to command attention without seeking it."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Intense, independent, uniquely expressive, and naturally commanding. Carves own path. Shadow: difficulty with authority figures and collaborative compromise.",["intensity","independence","uniqueness","commanding","nonconformity"],["Pluto","Uranus","Sun","Scorpio","Aquarius"],[1,4,7],"fire","Fire-Metal combined — intensity, authority, and transformative power."),
            _dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Pioneer, innovator, and change-maker. Prominent cheekbones signal authority that others follow. Strongest in entrepreneurial, creative, and leadership roles.",["pioneering","innovation","authority","creativity","leadership"],["Pluto","Uranus","Sun","Scorpio"],[1,7],"fire"),
            _dr(Domain.LOVE,ReadingTone.NEUTRAL,SignalStrength.MODERATE,"Intense and deeply feeling in love, but independence is non-negotiable. Needs a partner secure enough not to be threatened by their strength.",["intensity","independence","magnetism","powerful_attractions"],["Pluto","Scorpio","Uranus"],[1,7],"fire"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Wealth through uniqueness, authority, and disruption of existing patterns. Creates new categories of value.",["disruptive_wealth","authority","uniqueness","new_categories"],["Pluto","Uranus","Sun"],[1,7],"fire"),
        ]
        return FaceShapeReading(shape=shape,element="fire/metal",ruling_planet="Sun/Pluto",life_period="Middle decades (40s–50s) — cheekbone period is the dominant life force",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, prominent cheekbones (颧骨) indicate authority and power. The cheekbone house governs ages 46–47. A diamond face amplifies this throughout middle-life decades.",
            vedic_note="Samudrika Shastra: high prominent cheekbones indicate leadership karma. Associated with Surya and Mangala.",
            western_note="High cheekbones in Western tradition are associated with aristocratic bearing and natural authority.")

    elif shape == FaceShape.TRIANGLE:
        obs="Triangle face: narrow forehead widening to a broad, strong jaw. Jaw is the dominant structural feature."
        core="The triangle face indicates Earth element intensity — exceptional physical endurance and the capacity to outlast most. Later life is typically where this face type comes into its own."
        domains=[
            _dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Tenacious, physically enduring, practically brilliant, and slow to reveal. Outlasts competitors through sheer persistence. Shadow: stubborn, suspicious of authority.",["tenacity","endurance","persistence","practical_intelligence","caution"],["Saturn","Mars","Capricorn","Scorpio"],[4,8],"earth","Earth-dominant face — patience, endurance, and practical mastery."),
            _dr(Domain.CAREER,ReadingTone.POSITIVE,SignalStrength.STRONG,"Reaches full career expression later than most — the 40s and 50s are typically the strongest professional decades.",["late_bloomer","sustained_effort","endurance","physical_mastery"],["Saturn","Mars","Capricorn"],[4,8],"earth"),
            _dr(Domain.HEALTH,ReadingTone.STRONGLY_POSITIVE,SignalStrength.STRONG,"Exceptional physical constitution. The broad jaw indicates strong bone density and muscular endurance. Health tends to improve with age.",["physical_endurance","constitution","recovery","bone_density"],["Saturn","Mars","Capricorn"],[4,8],"earth"),
            _dr(Domain.WEALTH,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Wealth comes later and lasts longer. Builds slowly, loses little, often peaks financially when others slow down.",["late_wealth","conservation","endurance","late_peak"],["Saturn","Capricorn","Taurus"],[4,8],"earth"),
        ]
        return FaceShapeReading(shape=shape,element="earth",ruling_planet="Saturn",life_period="Later decades (50s–70s) strongest — jaw and chin period dominant",observation=obs,character_core=core,domains=domains,
            chinese_note="In Mian Xiang, the triangle face (三角面) with wide jaw indicates fortune and power building in the second half of life. Jaw house (ages 61–70) is the peak.",
            vedic_note="Samudrika Shastra: strong wide jaw indicates endurance karma — prevails through sustained effort.",
            western_note="Western tradition associates the wide, strong jaw with persistence and the capacity to endure what others cannot.")

    else:
        return FaceShapeReading(shape=shape,element="mixed",ruling_planet="Unknown",life_period="Cannot determine",observation="Face shape unclear.",character_core="Requires clearer image for reliable assessment.",domains=[],chinese_note="",vedic_note="",western_note="")


def _read_eyes(left, right, confidence):
    if left is None and right is None: return None
    primary=left or right; sig=_feat_sig(confidence)
    shape=primary.shape; eye_set=primary.set_position; tilt=primary.tilt_deg; lid=primary.lid_coverage
    parts=[f"Eye shape: {shape.value}"]
    if eye_set!=EyeSet.AVERAGE: parts.append(f"{eye_set.value.replace('_',' ')}")
    if abs(tilt)>5: parts.append(f"{'upward' if tilt>0 else 'downward'} canthus tilt ({round(tilt,1)}°)")
    if lid==Magnitude.HIGH: parts.append("significant hooding")
    obs=". ".join(parts).capitalize()+"."
    domains=[]
    if shape==EyeShape.ALMOND:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Almond eyes indicate balanced perception — sees both detail and larger picture. Diplomatic, perceptive, and naturally strategic. Strong emotional intelligence with rational awareness.",["perception","balance","diplomatic","strategic","emotional_intelligence"],["Mercury","Venus","Libra"],[6,3],"metal"))
        domains.append(_dr(Domain.LOVE,ReadingTone.POSITIVE,sig,"Balanced approach to love — neither overly guarded nor naively open. Perceptive about partners. Attractive quality: sees others clearly.",["perception","balance","clear_seeing","acceptance"],["Venus","Libra"],[6,2],"metal"))
    elif shape==EyeShape.ROUND:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Round eyes indicate an open, emotionally expressive, and curious nature. Highly empathic. Shadow: can be over-reactive or overwhelmed by emotional input.",["openness","curiosity","empathy","expressiveness","wonder"],["Moon","Neptune","Cancer","Pisces"],[2,11],"water"))
        domains.append(_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"Round eyes associated with heightened spiritual receptivity. The gaze takes in more than others — psychic sensitivity is common.",["receptivity","psychic","sensitivity","spiritual_openness"],["Moon","Neptune"],[2,11],"water"))
    elif shape==EyeShape.DEEP_SET:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Deep-set eyes indicate intense, contemplative, and perceptive nature. Observes more than they reveal. Strong inner world. Naturally strategic.",["intensity","contemplation","perception","strategic","inner_world"],["Pluto","Saturn","Scorpio","Capricorn"],[7,4],"water"))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Strong analytical and research capacity. Natural in roles requiring sustained concentration.",["analysis","research","concentration","depth"],["Saturn","Pluto","Virgo"],[4,7],"water"))
    elif shape==EyeShape.HOODED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Hooded eyes indicate a reserved, strategically self-revealing nature. Shows what they choose to show. In Mian Xiang: indicates wisdom and long strategic vision.",["reserve","strategy","wisdom","self_protection","selective_disclosure"],["Saturn","Pluto","Capricorn","Scorpio"],[4,7,8],"metal"))
    elif shape==EyeShape.UPTURNED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Upturned eyes indicate optimism, social confidence, and natural inclination toward positive expectation. Charismatic.",["optimism","charisma","social_confidence","positivity"],["Sun","Jupiter","Leo","Sagittarius"],[3,1],"fire"))
        domains.append(_dr(Domain.LOVE,ReadingTone.POSITIVE,sig,"Upturned eyes are considered highly attractive and romantically expressive. Naturally warm and inviting.",["attraction","warmth","romantic_expressiveness"],["Venus","Sun","Leo"],[3,6],"fire"))
    elif shape==EyeShape.DOWNTURNED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Downturned eyes indicate a more serious, empathic, and reflective nature. Often perceived as gentle or melancholic. Deeply feeling.",["seriousness","empathy","compassion","reflection","gentleness"],["Moon","Saturn","Cancer","Capricorn"],[2,4,7],"water"))
    if eye_set==EyeSet.WIDE_SET:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Wide-set eyes indicate broad perspective, tolerance, and capacity to see the big picture. Less detail-focused, more visionary.",["broad_perspective","tolerance","vision","generosity"],["Jupiter","Sagittarius","Aquarius"],[3,9,11],"wood","Wide-set eyes: 天眼 — expansive vision."))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Wide-set eyes favour strategic, visionary, and leadership roles.",["strategy","vision","leadership","big_picture"],["Jupiter","Sagittarius"],[3,9],"wood"))
    elif eye_set==EyeSet.CLOSE_SET:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Close-set eyes indicate a detail-oriented, precise, and focused mind. Exceptional concentration and analytical depth.",["detail_orientation","precision","focus","analytical"],["Mercury","Virgo","Saturn"],[4,7],"metal"))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Close-set eyes favour analytical, technical, and precision-demanding roles.",["analysis","precision","technical","detail"],["Mercury","Virgo"],[4,7],"metal"))
    cross=["Eyes — always cross-reference with brow shape for emotional expression pattern"]
    if left and right and abs(left.height_ratio-right.height_ratio)>0.05:
        cross.append("Notable left-right eye asymmetry — check overall symmetry score")
    return FeatureReading(feature_name="eyes",observation=obs,signal_strength=sig,domains=domains,cross_signals=cross,
        chinese_note="In Mian Xiang, eyes govern ages 35–40. Reveal quality of relationships, intelligence, and inner character. Clear, bright eyes indicate good fortune.",
        vedic_note="Samudrika Shastra: the eyes (Netra) reveal quality of Tejas — the vital fire. Bright eyes indicate strong Ojas.",
        western_note="Lavater: 'The eye is the portrait of the soul.' Shape, tilt, and set position collectively reveal the quality of perception and inner life.")


def _read_forehead(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Forehead: {f.height.value} height, {f.width.value} width, {f.slope} slope. Height ratio: {round(f.height_ratio,3)}, width ratio: {round(f.width_ratio,3)}."
    domains=[]
    if f.height==ForeheadHeight.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"High forehead in all traditions indicates strong intellectual capacity, philosophical depth, and the ability to think in abstractions. Memory strong. Early life marked by strong educational influence.",["intelligence","philosophy","abstract_thinking","memory","pattern_recognition"],["Mercury","Jupiter","Uranus","Virgo","Aquarius"],[7,3,11],"wood","High forehead: 天庭 (Tian Ting) — early life fortune."))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"High forehead indicates strong educational foundation. Academic, research, and knowledge-based careers naturally supported.",["academic","research","knowledge","intellectual_foundation"],["Mercury","Jupiter","Virgo"],[7,3],"wood"))
        domains.append(_dr(Domain.SPIRITUAL,ReadingTone.POSITIVE,sig,"A high forehead is the classic indicator of developed Ajna chakra — the third eye. Spiritual perception and philosophical insight are natural.",["third_eye","spiritual_perception","philosophy","higher_understanding"],["Uranus","Mercury","Jupiter","Aquarius"],[7,11],"wood"))
    elif f.height==ForeheadHeight.LOW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Lower forehead indicates action-oriented, practical nature. Thinks in concrete terms and learns best through experience.",["practical","action_oriented","experiential_learning","concrete"],["Mars","Saturn","Aries","Capricorn"],[1,4],"earth"))
    else:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Balanced forehead — adequate intellectual capacity without the over-thinking tendency. Practical intelligence combined with conceptual ability.",["balance","practical_intelligence","adaptability"],["Mercury","Saturn"],[5,4],"metal"))
    if f.slope=="receding":
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"A receding forehead indicates a more impulsive, instinct-driven nature. Acts before analysing.",["impulsive","instinctive","quick_acting"],["Mars","Aries"],[1,9],"fire"))
    elif f.slope=="protruding":
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A protruding forehead indicates strong analytical processing — the mind works before the action.",["analytical","deliberate","careful","consequence_aware"],["Mercury","Saturn","Virgo"],[4,7],"metal"))
    if f.width==ForeheadWidth.BROAD:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A broad forehead indicates comprehensive thinking — holds multiple considerations simultaneously. Planning and big-picture awareness are natural.",["comprehensive_thinking","planning","strategy","big_picture"],["Jupiter","Sagittarius","Aquarius"],[3,9],"wood"))
    return FeatureReading(feature_name="forehead",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Forehead — cross-reference with head line from palm for intellectual confirmation"],
        chinese_note="In Mian Xiang, forehead is Heaven Section (天庭) governing ages 15–30. Full smooth forehead = fortunate early life, strong parental support.",
        vedic_note="Samudrika Shastra: the forehead (Lalata) is the seat of fate inscriptions. Associated with Guru and Budha.",
        western_note="Lavater: 'the index of all mental faculties.' Height, width, and slope collectively reveal quality and style of thought.")


def _read_nose(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Nose shape: {f.shape.value}. Width: {round(f.width_ratio,3)}, height: {round(f.height_ratio,3)}. Bridge: {f.bridge_height.value}, tip: {f.tip_projection.value}, alar flare: {f.alar_flare.value}."
    domains=[]
    if f.bridge_height==Magnitude.HIGH and f.tip_projection==Magnitude.HIGH:
        wt=ReadingTone.STRONGLY_POSITIVE; wr="High bridge with strong tip projection is the most auspicious wealth indicator in Chinese face reading. Strong earning capacity through middle career phase."
    elif f.alar_flare==Magnitude.HIGH:
        wt=ReadingTone.POSITIVE; wr="Wide nostrils in Mian Xiang indicate capacity to hold and accumulate wealth. Middle career is typically the peak wealth period."
    elif f.alar_flare==Magnitude.LOW:
        wt=ReadingTone.NEUTRAL; wr="Narrow nostrils indicate money may flow through more readily. Requires deliberate wealth retention strategy."
    else:
        wt=ReadingTone.POSITIVE; wr="Moderate wealth indicators. Consistent middle-life financial development."
    domains.append(_dr(Domain.WEALTH,wt,sig,wr,["wealth_accumulation","earning_capacity","middle_life","retention"],["Jupiter","Venus","Taurus","Libra"],[6,8],"earth","Nose = wealth palace (財帛宮) — primary middle-life fortune indicator."))
    domains.append(_dr(Domain.FINANCE,wt,sig,"The nose structure in Mian Xiang governs financial patterns of the 41–50 decade.",["financial_peak","middle_life","accumulation"],["Jupiter","Venus","Taurus"],[6,8],"earth"))
    if f.shape==NoseShape.AQUILINE:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"The aquiline nose is the mark of leadership, independence, and determination. Does not follow — carves a path.",["leadership","independence","determination","honour","ambition"],["Sun","Mars","Saturn","Leo","Capricorn"],[1,8],"fire"))
        domains.append(_dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,sig,"The aquiline nose marks the born leader, entrepreneur, and executive. Career is self-directed and often pioneering.",["leadership","entrepreneurship","pioneering","executive"],["Sun","Mars","Leo","Aries"],[1,8],"fire"))
    elif f.shape==NoseShape.BROAD:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A broad nose indicates grounded, practical character. In Mian Xiang, a broad nose with wide nostrils is a strong wealth indicator.",["grounded","practical","physical_presence","wealth_capacity"],["Venus","Jupiter","Taurus"],[6,8],"earth"))
    elif f.shape==NoseShape.NARROW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"A narrow nose indicates refined, detail-oriented, selective approach to resources and relationships.",["refinement","selectivity","detail","quality_focus"],["Mercury","Virgo"],[4,7],"metal"))
    elif f.shape==NoseShape.UPTURNED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"An upturned nose indicates open, curious, accessible nature. In Mian Xiang, money can flow out freely — generosity natural but financial boundaries needed.",["openness","curiosity","generosity","financial_boundaries"],["Jupiter","Moon","Sagittarius"],[3,9],"water"))
    return FeatureReading(feature_name="nose",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Nose — primary wealth indicator, cross-reference with fate line from palm"],
        chinese_note="In Mian Xiang, nose is Wealth Palace (財帛宮) governing ages 41–50. Key: height of bridge, firmness of tip, width of nostrils.",
        vedic_note="Samudrika Shastra: the nose (Nasa) reveals the person's relationship with prosperity. Well-formed nose indicates favourable Shukra.",
        western_note="Lavater: aquiline = courage, broad = sensuality, finely shaped = refinement and discernment.")


def _read_lips(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Lip shape: {f.shape.value}. Corner direction: {f.corner_direction}. Fullness: {f.lip_fullness.value}. Width ratio: {round(f.width_ratio,3)}."
    domains=[]
    if f.corner_direction=="upturned":
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Upturned mouth corners indicate optimistic, socially warm, and positively-oriented character. In Mian Xiang, upturned corners are the most auspicious mouth feature — later decades bring social joy.",["optimism","warmth","social_joy","positivity","later_life_happiness"],["Jupiter","Venus","Sun","Sagittarius","Leo"],[3,6,9],"fire","Upturned corners: 月牙嘴 — auspicious social fortune."))
        domains.append(_dr(Domain.LOVE,ReadingTone.POSITIVE,sig,"Upturned corners signal naturally warm, giving, and romantically positive energy. Relationships in the later decades are typically fulfilling.",["warmth","romance","giving","later_love"],["Venus","Jupiter"],[6,3],"fire"))
    elif f.corner_direction=="downturned":
        domains.append(_dr(Domain.CHARACTER,ReadingTone.CHALLENGING,sig,"Downturned corners indicate a more critical, reserved, or serious default expression. In Mian Xiang, requires cultivation of social warmth in later decades.",["seriousness","critical_thinking","reserved","habitual_seriousness"],["Saturn","Mercury","Capricorn","Virgo"],[4,7],"metal","Downturned corners: 苦相 — requires deliberate cultivation of positive expression."))
    if f.lip_fullness==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Full lips indicate sensuality, generosity, expressiveness, and emotional warmth. This person gives freely.",["sensuality","generosity","expressiveness","warmth","giving"],["Venus","Moon","Taurus","Cancer"],[6,2],"water"))
        domains.append(_dr(Domain.LOVE,ReadingTone.STRONGLY_POSITIVE,sig,"Full lips are one of the strongest romantic indicators. Physical affection is important. Generous, passionate, and demonstrably loving.",["passion","physical_affection","generosity","demonstrative_love"],["Venus","Moon","Taurus"],[6,2],"water"))
    elif f.lip_fullness==Magnitude.LOW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Thinner lips indicate disciplined, precise, and word-careful nature. Says what is meant. Emotional expression through action rather than words.",["discipline","precision","conciseness","action_oriented"],["Mercury","Saturn","Virgo"],[4,7],"metal"))
    if f.shape==LipShape.CUPID_BOW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"The cupid bow lip is associated with romantic sensitivity, artistic appreciation, and refined expression.",["romantic_sensitivity","artistry","refinement","articulate"],["Venus","Moon","Neptune","Cancer","Pisces"],[6,2,11],"water"))
    if f.shape==LipShape.WIDE:
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"A wide mouth in Mian Xiang indicates strong communication capacity, social authority, and ability to command attention through speech.",["communication","social_authority","public_speaking","leadership"],["Mercury","Jupiter","Gemini","Leo"],[3,5],"fire"))
    td=ReadingTone.POSITIVE if f.corner_direction=="upturned" else ReadingTone.NEUTRAL
    domains.append(_dr(Domain.TIMING,td,sig,f"In Mian Xiang the mouth governs ages 51–60. {'The upturned corners indicate this decade brings social joy.' if f.corner_direction=='upturned' else 'This period requires cultivation of positive social expression.'}",["later_life","social_fortune","ages_51_60"],["Jupiter","Saturn"],[6,8],"earth","Mouth house (口宮) — governs social fortune in ages 51–60."))
    return FeatureReading(feature_name="lips",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Lips — cross-reference with heart line for emotional expression confirmation"],
        chinese_note="In Mian Xiang, mouth (口宮) governs ages 51–60. Key indicators: corner direction (up = auspicious), fullness, symmetry.",
        vedic_note="Samudrika Shastra: the mouth (Mukha) reveals quality of Vak — power of speech. Full, well-formed lips indicate Vak Siddhi.",
        western_note="Lavater: 'the mouth is the index of the soul's disposition.'")


def _read_brows(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Brow shape: {f.shape.value}. Arch: {f.arch_height.value}, thickness: {f.thickness.value}, gap: {f.brow_eye_gap.value}. Symmetry: {round(f.left_right_sym,3)}."
    domains=[]
    if f.shape==BrowShape.ARCHED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Arched brows indicate expressive, emotionally reactive, and aesthetically sensitive character. Responses are visible and genuine.",["expressiveness","emotional_reactivity","aesthetics","creativity"],["Moon","Venus","Cancer","Libra"],[2,6],"fire"))
        domains.append(_dr(Domain.LOVE,ReadingTone.POSITIVE,sig,"Arched brows signal emotional expressiveness and romantic sensitivity. Love is felt and shown.",["emotional_expressiveness","romantic","demonstrative"],["Moon","Venus"],[2,6],"fire"))
    elif f.shape==BrowShape.STRAIGHT:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Straight brows in Mian Xiang indicate direct, honest, and logically consistent character. What you see is what you get.",["directness","honesty","logical_consistency","authenticity"],["Saturn","Mercury","Virgo","Capricorn"],[4,7],"metal"))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Straight brows indicate reliable, consistent professional behaviour. Strong in roles requiring integrity.",["integrity","consistency","systematic","reliable"],["Saturn","Mercury"],[4,7],"metal"))
    elif f.shape==BrowShape.ANGULAR:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Angular brows indicate decisiveness, strong opinions, and capacity to make sharp judgments quickly.",["decisiveness","strong_opinions","judgment","clarity"],["Mars","Mercury","Aries","Virgo"],[1,4],"fire"))
    if f.thickness==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Thick, full brows in Mian Xiang indicate vitality, boldness, and abundant life energy. Generous with time and resources.",["vitality","boldness","generosity","physical_presence"],["Mars","Jupiter","Aries","Sagittarius"],[1,9],"fire","Thick brows: 龍眉 (dragon brows) — high vitality and generous nature."))
    if f.brow_eye_gap==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A generous brow-to-eye gap indicates emotional balance and measured response to stress. Does not over-react.",["emotional_balance","measured_response","calm","processing"],["Saturn","Mercury"],[4,7],"metal"))
    elif f.brow_eye_gap==Magnitude.LOW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"A narrow brow-eye gap indicates quick emotional reactivity and high situational awareness. Responds rapidly.",["quick_reactivity","situational_awareness","rapid_response"],["Mars","Mercury","Aries"],[1,5],"fire"))
    if f.left_right_sym<0.7:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Significant brow asymmetry indicates a complex, multi-layered emotional life. Rich inner world.",["complexity","multi_layered","inner_outer_gap"],["Moon","Pluto"],[2,7],"water"))
    return FeatureReading(feature_name="brows",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Brows — cross-reference with heart line for emotional nature confirmation"],
        chinese_note="In Mian Xiang, eyebrows (眉毛) govern ages 31–34. Reveal emotional nature, decision-making style, and quality of sibling/colleague relationships.",
        vedic_note="Samudrika Shastra: eyebrows reveal quality of Manas (mind) and emotional temperament.",
        western_note="Lavater described brows as 'the most expressive feature' — reveal the entire emotional register.")


def _read_jaw(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Jawline: {f.jawline_type.value}. Chin: {f.chin_shape.value}. Gonial angle: {round(f.gonial_angle,1)}°. Jaw width: {round(f.jaw_width_ratio,3)}. Chin projection: {f.chin_projection.value}."
    domains=[]
    if f.jawline_type==JawlineType.STRONG:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.STRONGLY_POSITIVE,sig,"A strong, defined jawline indicates exceptional willpower, determination, and the capacity to persist when others stop. The chin is the foundation — this person has a strong foundation.",["willpower","determination","persistence","foundation","endurance"],["Saturn","Mars","Capricorn","Aries"],[4,8,1],"earth","Strong jaw: 下巴 — strong later-life fortune and enduring vitality."))
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Strong jaw indicates exceptional endurance. Career often has a long arc with meaningful achievement in later decades.",["endurance","persistence","late_career_strength","long_arc"],["Saturn","Mars","Capricorn"],[4,8],"earth"))
        domains.append(_dr(Domain.HEALTH,ReadingTone.POSITIVE,sig,"Strong jaw structure indicates good skeletal density and physical endurance. Later-life health typically robust if foundation is maintained.",["skeletal_strength","endurance","constitutional_health","later_life"],["Saturn","Capricorn"],[4,8],"earth"))
    elif f.jawline_type==JawlineType.SOFT:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"A softer jawline indicates cooperative, adaptable, and relationally sensitive character. Persuades through warmth rather than force.",["cooperation","adaptability","warmth","persuasion"],["Venus","Moon","Libra","Cancer"],[6,2],"water"))
    if f.chin_shape==ChinShape.SQUARE:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A square chin is the classic mark of stubbornness and determination. In Mian Xiang: square, full chin indicates strong later-life fortune.",["stubbornness","determination","later_life_fortune","resilience"],["Saturn","Mars","Capricorn"],[4,8],"earth","Square chin: 方下巴 — strong endurance and favourable later-life fortune."))
    elif f.chin_shape==ChinShape.POINTED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"A pointed chin indicates sensitivity, artistic sensibility, and emotionally responsive character. In Mian Xiang, may indicate variable later decade.",["sensitivity","artistry","emotional_responsiveness","variable_later_life"],["Moon","Venus","Neptune"],[2,6,11],"water"))
    elif f.chin_shape==ChinShape.ROUNDED:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"A rounded chin indicates approachable, warm, and diplomatically inclined character. Later life brings social ease.",["approachability","warmth","diplomacy","social_ease"],["Venus","Moon","Libra"],[6,2],"water"))
    elif f.chin_shape==ChinShape.RECEDING:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.CHALLENGING,sig,"A receding chin indicates the later decades require deliberate cultivation of persistence and follow-through.",["completion_challenge","persistence_needed","follow_through"],["Saturn","Mercury"],[4,7],"metal"))
    ct=ReadingTone.POSITIVE if f.jawline_type==JawlineType.STRONG else ReadingTone.NEUTRAL
    domains.append(_dr(Domain.TIMING,ct,sig,f"In Mian Xiang the chin governs ages 61–70+. {'A strong jaw indicates this decade is one of the most powerful in the lifetime.' if f.jawline_type==JawlineType.STRONG else 'This period benefits from deliberate cultivation.'}",["later_life","ages_61_70","endurance"],["Saturn","Capricorn"],[4,8],"earth","Chin house (下巴宮) — governs vitality and fortune in later decades."))
    return FeatureReading(feature_name="jaw",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Jaw/chin — cross-reference with life line continuity for endurance confirmation"],
        chinese_note="In Mian Xiang, chin (下巴) governs ages 61–70+. Full, rounded, or square chin = strong later-life fortune.",
        vedic_note="Samudrika Shastra: the chin (Chibuka) reveals the final karma of the lifetime.",
        western_note="Lavater: 'The chin expresses the animal nature and the tenacity of the will.'")


def _read_cheeks(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Cheekbone position: {f.cheekbone_position.value}. Width: {f.cheekbone_width.value}. Fullness: {f.fullness.value}."
    domains=[]
    if f.cheekbone_position==CheekbonePosition.HIGH:
        domains.append(_dr(Domain.CAREER,ReadingTone.STRONGLY_POSITIVE,sig,"High cheekbones are the most powerful authority indicator in the face. In Mian Xiang, they govern years 46–47 — the social authority peak. Natural leaders. Executive, political roles are natural fits.",["authority","leadership","social_power","natural_command"],["Sun","Saturn","Mars","Leo","Capricorn"],[1,8],"fire","High cheekbones: 颧骨 — the mark of authority and social power."))
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"High cheekbones indicate determined, ambitious, and proud character. Does not easily accept diminishment. Shadow: can become controlling.",["determination","ambition","pride","authority","status_aware"],["Sun","Saturn","Leo"],[1,8],"fire"))
        domains.append(_dr(Domain.WEALTH,ReadingTone.POSITIVE,sig,"High cheekbones combined with a well-formed nose indicate strong wealth potential. Social authority opens financial doors.",["social_authority_wealth","middle_career_peak","door_opening"],["Sun","Jupiter","Leo"],[1,8],"fire"))
    elif f.cheekbone_position==CheekbonePosition.LOW:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Lower cheekbones indicate collaborative, consensus-building character. Connection and cooperation are primary drivers.",["collaboration","consensus","cooperation","connection"],["Venus","Moon","Libra","Cancer"],[2,6],"water"))
    if f.fullness==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Full cheeks indicate warmth, approachability, and generosity. In Mian Xiang, full cheeks signal strong social fortune.",["warmth","generosity","social_fortune","supporter_gathering"],["Moon","Venus","Jupiter"],[2,6],"earth","Full cheeks: 福相 — the blessed face; warmth and social abundance."))
    if f.cheekbone_width==Magnitude.HIGH:
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Wide cheekbones indicate broad social reach and influence. Can command respect across different social contexts.",["social_reach","influence","broad_command"],["Jupiter","Sun","Sagittarius"],[9,1],"fire"))
    return FeatureReading(feature_name="cheeks",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Cheekbones — primary authority indicator, cross-reference with Jupiter mount from palm"],
        chinese_note="In Mian Xiang, cheekbones (颧骨) govern ages 46–47 — social authority peak. High cheekbones must be supported by strong chin — otherwise authority collapses.",
        vedic_note="Samudrika Shastra: prominent cheekbones indicate Rajasic quality — the energy of kings. Associated with Surya and Mangala.",
        western_note="Lavater: high cheekbones are the mark of one who 'governs without effort.'")


def _read_skin(f, confidence):
    if f is None: return None
    sig=_feat_sig(confidence)
    obs=f"Skin tone: {f.tone.value}. Texture: {f.texture.value}. Moisture: {f.moisture.value}. Uniformity: {f.uniformity.value}. Cast: {f.color_cast}. Radiance: {f.radiance.value}."
    domains=[]
    if f.texture==SkinTexture.SMOOTH and f.moisture==Magnitude.HIGH and f.radiance==Magnitude.HIGH:
        ht=ReadingTone.STRONGLY_POSITIVE; hr="Smooth, well-hydrated, radiant skin indicates strong constitutional vitality, good lymphatic circulation, and effective cellular renewal. In Chinese medicine, clear radiant skin indicates strong Wei Qi."
    elif f.texture==SkinTexture.COARSE or f.moisture==Magnitude.LOW:
        ht=ReadingTone.NEUTRAL; hr="Coarse or dry skin suggests metabolic or hydration stress. Thyroid function, hydration, and nutritional status worth monitoring."
    else:
        ht=ReadingTone.POSITIVE; hr="Moderate skin condition indicating adequate vitality and constitution."
    if f.color_cast=="yellow": ht=ReadingTone.CHALLENGING; hr+=" Yellow cast indicates possible liver qi stagnation."
    elif f.color_cast=="pale": ht=ReadingTone.CHALLENGING; hr+=" Pallor indicates possible qi and blood deficiency."
    elif f.color_cast=="cool": hr+=" Cool cast may indicate circulation sensitivity."
    domains.append(_dr(Domain.HEALTH,ht,SignalStrength.MODERATE,hr,["vitality","constitution","circulation","wei_qi","cellular_health"],["Sun","Moon","Venus"],[6,2],"water"))
    if f.uniformity==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.MODERATE,"High skin uniformity indicates steady, consistent character — what is presented is consistent with what is felt.",["consistency","authenticity","steadiness"],["Saturn","Moon"],[4,2],"earth"))
    if f.radiance==Magnitude.HIGH:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,SignalStrength.MODERATE,"Strong facial radiance indicates abundant Shen (spirit) — the luminosity of the person's inner life is visible on the surface.",["shen_abundance","inner_luminosity","vitality","spirit"],["Sun","Jupiter"],[1,3],"fire","High radiance: 光澤 — abundant Shen, spiritual brightness."))
    return FeatureReading(feature_name="skin",observation=obs,signal_strength=SignalStrength.MODERATE,domains=domains,
        cross_signals=["Skin health — cross-reference with life line vitality and mercury line from palm"],
        chinese_note="In Chinese medicine and Mian Xiang, skin quality reflects state of Qi, Blood, and Shen. Yellow=liver, pale=blood deficiency, red=excess heat, dark=kidney qi.",
        vedic_note="Samudrika Shastra: skin (Tvak) quality reflects state of all seven dhatus. Radiant skin indicates strong Ojas.",
        western_note="Hippocratic tradition: skin colour and texture are diagnostic indicators of systemic health.")


def _read_symmetry(sym, confidence):
    if sym is None: return None
    score=sym.overall; obs=f"Overall symmetry: {round(score*100,1)}%. Upper: {round(sym.upper_third*100,1)}%, middle: {round(sym.middle_third*100,1)}%, lower: {round(sym.lower_third*100,1)}%."
    sig=_feat_sig(confidence)
    if score>0.88: st=ReadingTone.STRONGLY_POSITIVE; sr="Exceptionally high facial symmetry indicates strong constitutional harmony. In physiognomy, high symmetry signals reliability, consistency, and the capacity to be trusted across contexts."
    elif score>0.75: st=ReadingTone.POSITIVE; sr="Good facial symmetry indicating solid constitutional foundation with some natural complexity. Reliable and consistent with a multi-dimensional inner life."
    elif score>0.60: st=ReadingTone.NEUTRAL; sr="Moderate facial symmetry. Indicates a complex, multifaceted character who operates differently in different contexts. The asymmetry itself is a richness."
    else: st=ReadingTone.NEUTRAL; sr="Notable facial asymmetry indicates a highly complex, adaptable character. Different sides of self come forward in different contexts."
    domains=[
        _dr(Domain.CHARACTER,st,sig,sr,["consistency","reliability","complexity","authenticity"],["Saturn","Mercury"],[4,7],"metal"),
        _dr(Domain.LOVE,ReadingTone.POSITIVE if score>0.70 else ReadingTone.NEUTRAL,sig,"High symmetry signals consistency and reliability in relationship. Lower symmetry indicates a more complex, context-adaptive relational style.",["consistency","reliability","complexity"],["Venus","Saturn"],[6,4],"metal"),
    ]
    zone_notes={}
    if sym.upper_third<0.70: zone_notes["upper"]="Upper face asymmetry — early life experiences created some inconsistency in intellectual approach."
    if sym.middle_third<0.70: zone_notes["middle"]="Middle face asymmetry — perception and emotional life operate on multiple levels simultaneously."
    if sym.lower_third<0.70: zone_notes["lower"]="Lower face asymmetry — social presentation varies by context."
    return SymmetryReading(overall_score=score,observation=obs,domains=domains,zone_notes=zone_notes)


def _read_proportions(props, confidence):
    if props is None: return None
    upper=props.upper_third_ratio; middle=props.middle_third_ratio; lower=props.lower_third_ratio
    thirds={"upper":upper,"middle":middle,"lower":lower}
    dom=max(thirds,key=thirds.get); diff=max(thirds.values())-min(thirds.values())
    if diff<0.05: bal="balanced"; obs_t="All three facial thirds are approximately equal — classical physiognomy ideal."
    elif dom=="upper": bal="upper_dominant"; obs_t="Upper third (forehead) is dominant — early life and intellectual development are primary."
    elif dom=="middle": bal="middle_dominant"; obs_t="Middle third (eyes to nose) is dominant — career and wealth decades are primary."
    else: bal="lower_dominant"; obs_t="Lower third (nose to chin) is dominant — later life and legacy decades are primary."
    ic=props.intercanthal_ratio
    if ic>0.22: fn="Wide intercanthal distance — broad perspective, inclusive thinking, big-picture orientation."
    elif ic<0.17: fn="Narrow intercanthal distance — detail-focused, concentrated, precise analytical style."
    else: fn="Balanced eye spacing — combination of broad vision and detail awareness."
    obs=f"{obs_t} {fn}"; domains=[]
    sig=_feat_sig(confidence)
    if bal=="upper_dominant":
        domains.append(_dr(Domain.CAREER,ReadingTone.POSITIVE,sig,"Upper-dominant face indicates strongest career expression in early career (20s–30s). Education and creative work peak early.",["early_career_peak","intellectual","creative","education"],["Mercury","Jupiter","Uranus"],[3,7],"wood","Upper section dominant: 天庭 — early life fortune is strongest."))
    elif bal=="middle_dominant":
        domains.append(_dr(Domain.WEALTH,ReadingTone.STRONGLY_POSITIVE,sig,"Middle-dominant face indicates the wealth and career decades (40s–50s) as the primary life period. This is the peak expression.",["wealth_peak","career_peak","middle_decades"],["Jupiter","Saturn","Venus"],[8,6],"earth","Middle section dominant: 人中 — peak fortune in middle decades."))
    elif bal=="lower_dominant":
        domains.append(_dr(Domain.TIMING,ReadingTone.POSITIVE,sig,"Lower-dominant face indicates later life (60s+) as the primary power period. Builds slowly and reaches fullest expression in later decades.",["late_bloomer","later_life_peak","endurance"],["Saturn","Capricorn"],[4,8],"earth","Lower section dominant: 地格 — strongest fortune in later decades."))
    else:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Balanced facial thirds indicate consistent fortune across all life decades. Growth is even and sustained.",["balance","consistency","sustained_growth"],["Jupiter","Venus","Saturn"],[6,4],"metal"))
    return ProportionReading(thirds_balance=bal,fifths_note=fn,observation=obs,domains=domains)


def _read_expression(expr, confidence):
    if expr is None: return None
    signal=expr.dominant_signal; parts=[f"Dominant expression signal: {signal.value}"]
    if expr.smile_present: parts.append(f"smile present (intensity {round(expr.smile_intensity,2)})")
    if expr.brow_raise>0.4: parts.append(f"elevated brow raise ({round(expr.brow_raise,2)})")
    if expr.brow_furrow>0.4: parts.append(f"brow furrow ({round(expr.brow_furrow,2)})")
    obs=". ".join(parts).capitalize()+"."; domains=[]; hn=""
    sig=_feat_sig(confidence)
    if signal==EmotionLabel.JOY:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.STRONGLY_POSITIVE,sig,"Genuine smile at capture suggests the person's habitual emotional state leans toward positivity and openness.",["joy","positivity","openness","warmth"],["Sun","Jupiter","Leo","Sagittarius"],[3,9],"fire"))
        hn="Habitual joyful expression etches upward lines over time — an auspicious facial development in all traditions."
    elif signal==EmotionLabel.NEUTRAL:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Neutral expression indicates composed, self-contained, and emotionally balanced default state. Present and measured.",["composure","balance","self_containment","presence"],["Saturn","Mercury"],[4,7],"metal"))
        hn="Neutral habitual expression — character reads more clearly through structural features than expression."
    elif signal==EmotionLabel.SADNESS:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.NEUTRAL,sig,"Sadness signal may indicate the habitual emotional default is more introspective or melancholic. Deep feelers carry the weight of awareness.",["depth","sensitivity","introspection","melancholia"],["Moon","Saturn","Cancer","Capricorn"],[2,7],"water"))
        hn="Habitual sad expression deepens nasolabial folds and downturns corners. In Mian Xiang, deliberate cultivation of upward expression is recommended."
    elif signal==EmotionLabel.ANGER:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.CHALLENGING,sig,"Anger or tension signal suggests the person may carry habitual stress. In Chinese medicine, chronic anger affects liver qi.",["stress","frustration","tension","habitual_concern"],["Mars","Pluto","Aries","Scorpio"],[1,9],"fire"))
        hn="Habitual furrowed brow etches vertical lines (懸針紋) — indicate specific challenges in relationships and career."
    elif signal==EmotionLabel.SURPRISE:
        domains.append(_dr(Domain.CHARACTER,ReadingTone.POSITIVE,sig,"Open, surprised expression suggests receptivity, curiosity, and genuine engagement with the present moment.",["receptivity","curiosity","openness","engagement"],["Uranus","Mercury","Aquarius","Gemini"],[5,11],"fire"))
        hn="Habitual raised brows indicate an open, receptive character — a positive facial development."
    return ExpressionReading(dominant_signal=signal,observation=obs,domains=domains,habitual_note=hn)


def _read_aging_markers(aging, confidence):
    if aging is None: return None
    markers=[aging.forehead_line_density,aging.nasolabial_depth,aging.crow_feet_presence,aging.skin_texture_age_proxy]
    high_c=sum(1 for m in markers if m==Magnitude.HIGH); low_c=sum(1 for m in markers if m==Magnitude.LOW)
    obs=f"Forehead lines: {aging.forehead_line_density.value}. Nasolabial: {aging.nasolabial_depth.value}. Crow's feet: {aging.crow_feet_presence.value}. Skin texture: {aging.skin_texture_age_proxy.value}. Lip volume: {aging.lip_volume_indicator.value}. Cheek descent: {aging.cheek_descent.value}."
    if high_c>=3: vit=ReadingTone.NEUTRAL; tn="Structural aging markers suggest mature decades — consistent with middle or later life."
    elif low_c>=3: vit=ReadingTone.POSITIVE; tn="Minimal aging markers suggest early life decades or exceptionally well-maintained constitution."
    else: vit=ReadingTone.POSITIVE; tn="Mixed aging markers — structural age does not strongly constrain the reading."
    sig=_feat_sig(confidence)
    domains=[
        _dr(Domain.HEALTH,vit,sig,"Aging markers reveal current constitutional state. In Chinese medicine, indicate the current state of Jing (essence) — the fundamental constitutional resource.",["jing_essence","constitutional_state","life_experience_impact"],["Saturn","Moon","Capricorn"],[4,8],"water"),
        _dr(Domain.TIMING,ReadingTone.NEUTRAL,sig,tn,["life_phase","timing","structural_age"],["Saturn"],[4,8],"earth"),
    ]
    return AgingReading(observation=obs,vitality_signal=vit,domains=domains,timing_note=tn)


def _detect_cross_signals(reading):
    domain_tones={d.value:{} for d in ALL_DOMAINS}
    features=[reading.forehead,reading.eyes,reading.brows,reading.nose,reading.cheeks,reading.lips,reading.jaw,reading.skin,
              reading.parent_inheritance,reading.face_health_zones,reading.spiritual_face,reading.longevity_face]
    for feat in features:
        if feat is None or feat.signal_strength in (SignalStrength.ABSENT,SignalStrength.WEAK): continue
        for dr in feat.domains:
            domain_tones[dr.domain.value][feat.feature_name]=dr.tone
    for struct in [reading.symmetry,reading.proportions]:
        if struct is not None:
            for dr in struct.domains:
                domain_tones[dr.domain.value]["structure"]=dr.tone
    pos_t={ReadingTone.POSITIVE,ReadingTone.STRONGLY_POSITIVE}; neg_t={ReadingTone.CHALLENGING,ReadingTone.STRONGLY_CHALLENGING}
    confirmed={}; conflicting={}
    for domain,ft in domain_tones.items():
        pos=[f for f,t in ft.items() if t in pos_t]; neg=[f for f,t in ft.items() if t in neg_t]
        if len(pos)>=2: confirmed[domain]=pos
        if neg: conflicting[domain]=neg
        if pos and neg:
            if domain not in conflicting: conflicting[domain]=[]
            conflicting[domain].extend([f"CONFLICT: {p} vs {n}" for p in pos[:2] for n in neg[:1]])
    return confirmed,conflicting


def _extract_dominant_themes(reading):
    kc={}
    features=[reading.forehead,reading.eyes,reading.brows,reading.nose,reading.cheeks,reading.lips,reading.jaw,reading.skin,
              reading.parent_inheritance,reading.face_health_zones,reading.spiritual_face,reading.longevity_face]
    for feat in features:
        if feat is None: continue
        for dr in feat.domains:
            for kw in dr.keywords:
                kc[kw]=kc.get(kw,0)+1
    return [kw for kw,_ in sorted(kc.items(),key=lambda x:x[1],reverse=True)[:12]]


def _build_life_period_map(shape_reading,forehead,eyes,nose,lips,jaw):
    return {
        "ages_15_30":"Forehead period — "+((forehead.observation[:80]+"...") if forehead else "Forehead data unavailable."),
        "ages_31_40":"Eye and brow period — "+((eyes.observation[:80]+"...") if eyes else "Eye data unavailable."),
        "ages_41_50":"Nose period (wealth palace) — "+((nose.observation[:80]+"...") if nose else "Nose data unavailable."),
        "ages_51_60":"Mouth period — "+((lips.observation[:80]+"...") if lips else "Lip data unavailable."),
        "ages_61_plus":"Chin/jaw period — "+((jaw.observation[:80]+"...") if jaw else "Jaw data unavailable."),
        "dominant_period":shape_reading.life_period,
    }


# ===========================================================================
# v2.0.0 — NEW READING FUNCTIONS
# ===========================================================================

def _read_parent_inheritance(markers: List[ParentInheritanceMarker], confidence: float) -> Optional[FeatureReading]:
    """Translate parental inheritance zone markers into domain-indexed readings."""
    if not markers: return None
    sig=_feat_sig(confidence)
    obs=f"{len(markers)} parental inheritance marker(s) detected across facial zones: "+", ".join(set(m.zone for m in markers))+"."
    domains=[]
    # Group by zone and create readings
    for marker in markers:
        tone=(ReadingTone.POSITIVE if marker.dominance==Magnitude.HIGH
              else ReadingTone.NEUTRAL if marker.dominance==Magnitude.MODERATE
              else ReadingTone.POSITIVE)
        # Primary: PARENTS domain
        domains.append(_dr(Domain.PARENTS,tone,sig,marker.inherited_trait,
            ["parental_inheritance",marker.zone,marker.parent,marker.zone_feature],
            ["Moon","Sun","Saturn","Cancer","Capricorn"],[2,4,8],
            "water" if "mother" in marker.parent else "fire",
            marker.note))
        # IDENTITY domain — how inheritance shapes self
        if marker.dominance==Magnitude.HIGH:
            domains.append(_dr(Domain.IDENTITY,tone,sig,
                f"The {marker.parent} influence in the {marker.zone} zone strongly shapes identity — {marker.inherited_trait}",
                ["identity_formation","parental_pattern",marker.zone],
                ["Moon","Sun","Pluto"],[2,1,8],"mixed"))
    # CHARACTER summary
    father_zones=[m for m in markers if "father" in m.parent]
    mother_zones=[m for m in markers if "mother" in m.parent]
    balanced_zones=[m for m in markers if "balanced" in m.parent]
    if len(father_zones)>len(mother_zones):
        summary="The father's energetic patterns are dominant in the facial structure — intellectual style, professional patterns, and authority relationship are primarily paternal in origin."
        char_tone=ReadingTone.POSITIVE
    elif len(mother_zones)>len(father_zones):
        summary="The mother's energetic patterns are dominant — resilience, emotional foundation, and relational patterns are primarily maternal in origin."
        char_tone=ReadingTone.POSITIVE
    elif balanced_zones:
        summary="Both parental energies are well-balanced in the facial structure — this person integrates both inheritances without one dominating."
        char_tone=ReadingTone.STRONGLY_POSITIVE
    else:
        summary="Mixed parental inheritance patterns — different zones carry different parental influences."
        char_tone=ReadingTone.NEUTRAL
    domains.insert(0,_dr(Domain.CHARACTER,char_tone,sig,summary,
        ["parental_synthesis","inheritance_pattern","identity_foundation"],["Moon","Sun","Saturn"],[2,4,8],"mixed"))
    return FeatureReading(feature_name="parent_inheritance",observation=obs,signal_strength=sig,domains=domains,
        cross_signals=["Parental inheritance — cross-reference with 4th/10th house in natal chart","Forehead zone confirms paternal — cross-reference with father life path numerology"],
        chinese_note="In Mian Xiang, forehead (天庭) carries the father's celestial mandate; chin/jaw (地格) carries the mother's earthly foundation. The three zones together map the complete ancestral inheritance.",
        vedic_note="Samudrika Shastra: facial zones reveal karmic inheritance from ancestral lineage. The face is the map of ancestral karma brought forward.",
        western_note="Western physiognomy recognises facial inheritance patterns as revealing the dominant parental influence and how it shapes character and life path.")


def _read_face_health_zones(markers: List[FaceHealthMarker], confidence: float) -> Optional[FeatureReading]:
    """Translate Mian Xiang zone-organ health markers into domain-indexed readings."""
    if not markers: return None
    sig=_feat_sig(confidence)
    high=[m for m in markers if m.severity==Magnitude.HIGH]
    mod=[m for m in markers if m.severity==Magnitude.MODERATE]
    obs=f"{len(markers)} facial health zone indicator(s): "+", ".join(m.marker_type for m in markers[:4])+("..." if len(markers)>4 else ".")
    domains=[]
    for marker in markers:
        tone=(ReadingTone.CHALLENGING if marker.severity==Magnitude.HIGH
              else ReadingTone.NEUTRAL if marker.severity==Magnitude.MODERATE
              else ReadingTone.POSITIVE)
        msig=SignalStrength.STRONG if marker.severity==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.HEALTH,tone,msig,marker.note,
            ["facial_health_zone",marker.facial_zone,marker.system,marker.marker_type],
            ["Saturn","Moon","Mercury","Virgo"],[6,4,7],"water",
            f"Mian Xiang zone: {marker.facial_zone} → {marker.system}"))
    if high:
        summary=f"{len(high)} high-priority facial health zone indicator(s) — body systems: "+", ".join(set(m.system for m in high))+". These warrant conscious health attention."
        st=ReadingTone.CHALLENGING
    elif mod:
        summary=f"{len(mod)} moderate facial health zone indicator(s). Systems to support: "+", ".join(set(m.system for m in mod[:3]))+"."
        st=ReadingTone.NEUTRAL
    else:
        summary="Minor facial health zone indicators — general wellness practices are sufficient."
        st=ReadingTone.POSITIVE
    domains.insert(0,_dr(Domain.HEALTH,st,sig,summary,
        ["health_zone_overview","mian_xiang_health","preventive_focus"],
        ["Saturn","Moon","Mercury"],[6,4,7],"water"))
    return FeatureReading(feature_name="face_health_zones",observation=obs,signal_strength=SignalStrength.STRONG if high else SignalStrength.MODERATE,domains=domains,
        cross_signals=["Facial health zones — always cross-reference with palm health markers for confirmation","Face zone indicators + palm mercury line together confirm digestive health signal"],
        chinese_note="Mian Xiang (面相) maps every facial zone to specific organ systems. The face is the visible map of internal health. Zone-organ correspondences have been used diagnostically in Chinese medicine for over 2,000 years.",
        vedic_note="Vedic Samudrika Shastra also maps facial zones to organs and body systems. The nose bridge corresponds to the spine; the eye area to liver and kidneys.",
        western_note="Hippocratic tradition: colour, texture, and structural changes in facial zones reflect systemic organ health — still used in traditional naturopathic assessment.")


def _read_spiritual_face(markers: List[FaceSpiritualMarker], confidence: float) -> Optional[FeatureReading]:
    """Translate spiritual face markers into domain-indexed readings."""
    if not markers: return None
    sig=_feat_sig(confidence)
    strong=[m for m in markers if m.presence==Magnitude.HIGH]
    obs=f"{len(markers)} facial spiritual indicator(s): "+", ".join(m.gift_indicated for m in markers[:4])+("..." if len(markers)>4 else ".")
    domains=[]
    for marker in markers:
        tone=(ReadingTone.STRONGLY_POSITIVE if marker.presence==Magnitude.HIGH
              else ReadingTone.POSITIVE if marker.presence==Magnitude.MODERATE
              else ReadingTone.NEUTRAL)
        msig=SignalStrength.STRONG if marker.presence==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.SPIRITUAL,tone,msig,marker.note,
            ["facial_spiritual",marker.marker_type,marker.gift_indicated],
            ["Neptune","Uranus","Moon","Jupiter","Pisces"],[7,11,2],"water"))
        # Route psychic/mediumship gifts to SPIRIT_WORLD
        if marker.gift_indicated in ("psychic_depth","psychic_receptivity","psychic_openness","spiritual_mediumship"):
            domains.append(_dr(Domain.SPIRIT_WORLD,tone,msig,
                f"Facial indicator '{marker.marker_type}' signals capacity for spirit world perception. Gift: {marker.gift_indicated}. {marker.note}",
                ["spirit_world_access",marker.gift_indicated,"thin_veil","facial_indicator"],
                ["Neptune","Pluto","Pisces","Scorpio"],[11,7,22],"water"))
    if strong:
        summary=f"{len(strong)} strong facial spiritual gift indicator(s): "+", ".join(m.gift_indicated for m in strong[:3])+". These are structurally encoded spiritual capacities — not cultivated but innate."
        st=ReadingTone.STRONGLY_POSITIVE
    else:
        summary=f"{len(markers)} facial spiritual indicator(s) present. Spiritual sensitivity is part of this person's structural endowment."
        st=ReadingTone.POSITIVE
    domains.insert(0,_dr(Domain.SPIRITUAL,st,sig,summary,
        ["spiritual_overview","facial_spiritual_endowment","innate_gifts"],
        ["Neptune","Jupiter","Uranus"],[7,11,3],"water"))
    return FeatureReading(feature_name="spiritual_face",observation=obs,signal_strength=SignalStrength.STRONG if strong else SignalStrength.MODERATE,domains=domains,
        cross_signals=["Spiritual face — amplified when deep-set eyes + high forehead + wide eye spacing co-occur","Cross-reference with Moon mount elevation and spiritual markers from palm reading"],
        chinese_note="In Mian Xiang, the upper face (天部 — Heaven Section) reveals the person's connection to heaven and higher dimensions. High, smooth forehead + clear eyes = strong celestial connection.",
        vedic_note="Samudrika Shastra: facial features associated with spiritual gift are most concentrated in the 'tejas zone' — forehead to eyes. Deep-set eyes indicate developed Chitta (consciousness).",
        western_note="Western esoteric physiognomy (Lavater, Goethe's physiognomical essays): the high forehead and deep-set eyes are the classic marks of the mystic and philosopher.")


def _read_longevity_face(markers: List[FaceLongevityMarker], confidence: float) -> Optional[FeatureReading]:
    """Translate longevity indicators into domain-indexed readings."""
    if not markers: return None
    sig=_feat_sig(confidence)
    positive=[m for m in markers if m.indicator=="positive"]
    caution=[m for m in markers if m.indicator=="caution"]
    obs=f"{len(markers)} facial longevity indicator(s) — {len(positive)} positive, {len(caution)} caution."
    domains=[]
    for marker in markers:
        tone=(ReadingTone.POSITIVE if marker.indicator=="positive"
              else ReadingTone.NEUTRAL if marker.indicator=="neutral"
              else ReadingTone.CHALLENGING)
        msig=SignalStrength.STRONG if marker.strength==Magnitude.HIGH else SignalStrength.MODERATE
        domains.append(_dr(Domain.HEALTH,tone,msig,marker.note,
            ["longevity_indicator",marker.marker_type,marker.system,marker.indicator],
            ["Saturn","Sun","Jupiter","Capricorn"],[4,8,9],"earth"))
        # DEATH_TRANSITION domain — late-life vitality picture
        if marker.marker_type in ("strong_jaw","high_prominent_cheekbones","high_facial_symmetry","low_aging_marker_burden"):
            domains.append(_dr(Domain.DEATH_TRANSITION,tone,msig,
                f"Longevity indicator '{marker.marker_type}' suggests a {marker.indicator} late-life constitutional picture: {marker.note}",
                ["late_life_vitality",marker.marker_type,"constitutional_endurance"],
                ["Saturn","Pluto","Sun"],[4,8,9],"earth",
                f"Mian Xiang longevity: {marker.marker_type} → {marker.indicator} late-life picture."))
    if len(positive)>=3:
        summary=f"Strong facial longevity profile — {len(positive)} positive constitutional indicators. Structure supports a long, vital life."
        st=ReadingTone.STRONGLY_POSITIVE
    elif len(positive)>len(caution):
        summary=f"Positive facial longevity profile — {len(positive)} positive vs {len(caution)} caution indicators. Constitutional health is well-supported."
        st=ReadingTone.POSITIVE
    elif len(caution)>=3:
        summary=f"Longevity profile calls for deliberate lifestyle attention — {len(caution)} caution indicators. Conscious vitality cultivation recommended."
        st=ReadingTone.NEUTRAL
    else:
        summary="Mixed longevity indicators — lifestyle choices are the primary determinant of constitutional vitality."
        st=ReadingTone.NEUTRAL
    domains.insert(0,_dr(Domain.HEALTH,st,sig,summary,
        ["longevity_overview","constitutional_vitality","facial_longevity"],
        ["Saturn","Sun","Jupiter"],[4,8,9],"earth"))
    return FeatureReading(feature_name="longevity_face",observation=obs,signal_strength=SignalStrength.STRONG if len(positive)>=3 else SignalStrength.MODERATE,domains=domains,
        cross_signals=["Longevity face — always cross-reference with life line assessment from palm","Jaw strength + life line continuity = strongest longevity confirmation pair"],
        chinese_note="In Mian Xiang, longevity (寿) indicators are distributed across multiple facial features. The chin/jaw (later life), cheekbones (resilience), and facial radiance (Jing) are the three primary longevity markers.",
        vedic_note="Samudrika Shastra: longevity is read from the totality of facial structure — strong jaw, clear eyes, high symmetry, and radiant skin are the four pillars of constitutional longevity in the Vedic system.",
        western_note="Western structural physiognomy: bilateral symmetry, strong bone structure, and skin quality collectively constitute the most reliable structural longevity indicators available without clinical testing.")


class FaceReader:
    """Stateless physiognomy interpretation engine. v2.0.0: 4 new reading functions."""

    def read(self, features: FaceFeatures) -> FaceReading:
        t0=time.monotonic()
        if features.error or features.face_shape is None:
            return self._error_reading(features)
        conf=features.confidence
        shape_reading=_read_face_shape(features.face_shape,features.proportions)
        reading=FaceReading(image_hash=features.image_hash,reading_ms=0,overall_confidence=conf,face_shape=shape_reading)
        reading.symmetry    = _read_symmetry(features.symmetry,conf)
        reading.proportions = _read_proportions(features.proportions,conf)
        reading.forehead = _read_forehead(features.forehead,conf)
        reading.eyes     = _read_eyes(features.left_eye,features.right_eye,conf)
        reading.brows    = _read_brows(features.brows,conf)
        reading.nose     = _read_nose(features.nose,conf)
        reading.cheeks   = _read_cheeks(features.cheeks,conf)
        reading.lips     = _read_lips(features.lips,conf)
        reading.jaw      = _read_jaw(features.jaw,conf)
        reading.skin     = _read_skin(features.skin,conf)
        reading.expression    = _read_expression(features.expression,conf)
        reading.aging_markers = _read_aging_markers(features.aging_markers,conf)
        # ── v2.0.0 new readings ──────────────────────────────────────────
        reading.parent_inheritance = _read_parent_inheritance(features.parent_inheritance_markers or [],conf)
        reading.face_health_zones  = _read_face_health_zones(features.face_health_markers or [],conf)
        reading.spiritual_face     = _read_spiritual_face(features.face_spiritual_markers or [],conf)
        reading.longevity_face     = _read_longevity_face(features.face_longevity_markers or [],conf)
        reading.confirmed_signals,reading.conflicting_signals = _detect_cross_signals(reading)
        reading.dominant_themes = _extract_dominant_themes(reading)
        reading.life_period_map = _build_life_period_map(shape_reading,reading.forehead,reading.eyes,reading.nose,reading.lips,reading.jaw)
        reading.reading_ms=int((time.monotonic()-t0)*1000)
        logger.info("FaceReader.read completed",extra={"image_hash":features.image_hash,"face_shape":features.face_shape.value,"confidence":conf,"dominant_themes":reading.dominant_themes[:5],"confirmed_domains":list(reading.confirmed_signals.keys()),"reading_ms":reading.reading_ms,"v2_features":4})
        return reading

    def _error_reading(self, features: FaceFeatures) -> FaceReading:
        return FaceReading(image_hash=features.image_hash,reading_ms=0,overall_confidence=0.0,
            face_shape=FaceShapeReading(shape=FaceShape.UNCLEAR,element="unknown",ruling_planet="unknown",life_period="unknown",observation=features.error or "Analysis failed.",character_core="",domains=[],chinese_note="",vedic_note="",western_note=""))


def read_face(features: FaceFeatures) -> FaceReading:
    """Module-level convenience wrapper."""
    return FaceReader().read(features)
