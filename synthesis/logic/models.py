"""
Logic Engine — Models
=====================
Complete input/output contract for the KAYAL Logic Engine.
Version 3.0.0 — adds synastry, spirit world, health constitution,
expanded remedies, individual blueprint, and union blueprint models.

Upgrade notes (v2.0.0 → v3.0.0):
  - Domain enum expanded with 9 new domains
  - New enums: Gender, ToolType, RelationshipType, CompatibilityLevel,
    SpiritAttachmentType, InfidelityRisk, DominanceType,
    ChildNature, DeathOrderIndicator
  - New input models: PartnerBirthData, ParentData
  - UserInput extended: partner_data, parent_data, gender, tool_type
  - New output models: SpiritAttachment, SpiritWorldProfile,
    HealthVulnerability, HealthProfile, AstrologicalRemedy,
    NumerologicalRemedy, HealthRemedy, RelationshipRemedy,
    WealthRemedy, MentalRemedy, RemedyBundle,
    ChildrenForecast, SynastryCrossAspect, SynastryCompatibility,
    SynastryProfile, IndividualBlueprint, UnionBlueprint
  - New LLM payload models: LLMSpiritPayload, LLMHealthPayload,
    LLMRemedyBundlePayload, LLMSynastryPayload
  - SynthesisPayload extended: spirit_world, health_profile,
    remedy_bundle, synastry_profile, individual_blueprint, union_blueprint
  - LLMPayload extended: spirit_payload, health_payload,
    remedy_payload, synastry_payload
  - ALL v2.0.0 code preserved intact

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Enums  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

class ReadingTier(str, Enum):
    TIER_1_CORE        = "tier_1_core"
    TIER_2_FACE        = "tier_2_face"
    TIER_3_PALM        = "tier_3_palm"
    TIER_4_FULL        = "tier_4_full"
    TIER_2B_PALM_ONLY  = "tier_2b_palm_only"
    TIER_3B_FACE_PALM  = "tier_3b_face_palm"


class AstrologySystem(str, Enum):
    WESTERN  = "western"
    VEDIC    = "vedic"
    CHINESE  = "chinese"
    HYBRID   = "hybrid"


class NumerologySystem(str, Enum):
    PYTHAGOREAN = "pythagorean"
    CHALDEAN    = "chaldean"
    VEDIC       = "vedic"
    HYBRID      = "hybrid"


class CulturalOrigin(str, Enum):
    SOUTH_ASIAN      = "south_asian"
    EAST_ASIAN       = "east_asian"
    SOUTHEAST_ASIAN  = "southeast_asian"
    MIDDLE_EASTERN   = "middle_eastern"
    NORTH_AFRICAN    = "north_african"
    SUB_SAHARAN      = "sub_saharan"
    WESTERN          = "western"
    EASTERN_EUROPEAN = "eastern_european"
    LATIN_AMERICAN   = "latin_american"
    CARIBBEAN        = "caribbean"
    UNKNOWN          = "unknown"


class Domain(str, Enum):
    # ── v2.0.0 domains (preserved) ──────────────────────────────────────
    LOVE      = "love"
    HEALTH    = "health"
    WEALTH    = "wealth"
    CAREER    = "career"
    SPIRITUAL = "spiritual"
    FINANCE   = "finance"
    CHARACTER = "character"
    TIMING    = "timing"
    # ── v3.0.0 new domains ──────────────────────────────────────────────
    SYNASTRY          = "synastry"           # Union / relationship analysis
    SPIRIT_WORLD      = "spirit_world"       # Attachments, ancestors, curses
    SEXUALITY         = "sexuality"          # Sexual nature and compatibility
    DEATH_TRANSITION  = "death_transition"   # Longevity and death indicators
    IDENTITY          = "identity"           # Soul foundation and archetype
    PARENTS           = "parents"            # Inherited parental patterns
    CHILDREN_FORECAST = "children_forecast"  # Children timing, nature, destiny
    LEGACY            = "legacy"             # Reputation, fame, what endures
    REMEDIES_DOMAIN   = "remedies_domain"    # Dedicated remedies output domain

ALL_DOMAINS = list(Domain)


class ConvergenceLevel(str, Enum):
    FOUR_SYSTEM  = "four_system_agreement"
    THREE_SYSTEM = "three_system_agreement"
    TWO_SYSTEM   = "two_system_agreement"
    SINGLE       = "single_system"
    CONFLICTED   = "conflicted"


class SignalTone(str, Enum):
    STRONGLY_POSITIVE    = "strongly_positive"
    POSITIVE             = "positive"
    NEUTRAL              = "neutral"
    CHALLENGING          = "challenging"
    STRONGLY_CHALLENGING = "strongly_challenging"


class KabbalahPillar(str, Enum):
    MERCY    = "mercy"
    SEVERITY = "severity"
    MIDDLE   = "middle"


class ChineseElement(str, Enum):
    WOOD  = "wood"
    FIRE  = "fire"
    EARTH = "earth"
    METAL = "metal"
    WATER = "water"


class AyurvedicDosha(str, Enum):
    VATA        = "vata"
    PITTA       = "pitta"
    KAPHA       = "kapha"
    VATA_PITTA  = "vata_pitta"
    PITTA_KAPHA = "pitta_kapha"
    VATA_KAPHA  = "vata_kapha"
    TRIDOSHIC   = "tridoshic"


class RemedyTradition(str, Enum):
    """Which spiritual tradition the remedy draws from."""
    VEDIC     = "vedic"
    CHINESE   = "chinese"
    ISLAMIC   = "islamic"
    CHRISTIAN = "christian"
    AFRICAN   = "african"
    WESTERN   = "western"
    SYNCRETIC = "syncretic"
    BUDDHIST  = "buddhist"
    UNIVERSAL = "universal"


class RemedyUrgency(str, Enum):
    IMMEDIATE = "immediate"   # Active karmic debt or severe challenge
    SOON      = "soon"        # Building challenge — within 30 days
    ONGOING   = "ongoing"     # Maintenance practice
    OPTIONAL  = "optional"    # Enhancement, not urgent


class ProblemUrgency(str, Enum):
    ACTIVE_NOW = "active_now"   # Manifesting currently
    BUILDING   = "building"     # Pattern building toward manifestation
    RECURRING  = "recurring"    # Repeating karmic pattern
    RESOLVING  = "resolving"    # Challenge present but moving toward resolution


class TemporalPhase(str, Enum):
    PAST    = "past"
    PRESENT = "present"
    FUTURE  = "future"


class KarmicDebtType(str, Enum):
    DEBT_13 = "13"   # Laziness — hard work required
    DEBT_14 = "14"   # Abuse of freedom — discipline required
    DEBT_16 = "16"   # Ego and pride — humility required
    DEBT_19 = "19"   # Misuse of power — responsibility required


# ---------------------------------------------------------------------------
# Enums  (v3.0.0 — new additions)
# ---------------------------------------------------------------------------

class Gender(str, Enum):
    MALE         = "male"
    FEMALE       = "female"
    NON_BINARY   = "non_binary"
    UNSPECIFIED  = "unspecified"


class ToolType(str, Enum):
    """Determines which engine pipeline to invoke."""
    INDIVIDUAL_BLUEPRINT = "individual_blueprint"   # Single person — full 16-domain
    UNION_BLUEPRINT      = "union_blueprint"        # Two people — full synastry
    DOMAIN_READING       = "domain_reading"         # Single-domain focused tool
    QUICK_READING        = "quick_reading"          # Lightweight single tool
    LEGACY               = "legacy"                 # Existing v8 tool behaviour


class RelationshipType(str, Enum):
    """Classification of a union's fundamental nature."""
    TWIN_FLAME        = "twin_flame"
    SOULMATE          = "soulmate"
    KARMIC_PARTNER    = "karmic_partner"
    LIFE_PARTNER      = "life_partner"
    TRAUMA_BOND       = "trauma_bond"
    GROWTH_PARTNER    = "growth_partner"
    SEXUAL_PARTNER    = "sexual_partner"
    UNDETERMINED      = "undetermined"


class CompatibilityLevel(str, Enum):
    EXCEPTIONAL   = "exceptional"    # 90–100 %
    HIGH          = "high"           # 75–89 %
    MODERATE      = "moderate"       # 55–74 %
    LOW           = "low"            # 35–54 %
    CHALLENGING   = "challenging"    # Below 35 %


class SpiritAttachmentType(str, Enum):
    ANCESTRAL      = "ancestral"      # Bloodline spirit
    EARTHBOUND     = "earthbound"     # Attached non-family spirit
    ASSIGNED       = "assigned"       # Guardian / protective spirit
    INTRUSIVE      = "intrusive"      # Hostile / draining attachment
    KARMIC         = "karmic"         # Past-life carried entity
    NONE_DETECTED  = "none_detected"


class InfidelityRisk(str, Enum):
    LOW       = "low"
    MODERATE  = "moderate"
    HIGH      = "high"
    VERY_HIGH = "very_high"


class DominanceType(str, Enum):
    """Which partner's chart is stronger in the union."""
    PERSON_A_DOMINANT  = "person_a_dominant"
    PERSON_B_DOMINANT  = "person_b_dominant"
    BALANCED           = "balanced"
    CONFLICTED         = "conflicted"  # Neither dominant — friction


class ChildNature(str, Enum):
    """Predicted temperament / nature of a child."""
    HIGHLY_GIFTED   = "highly_gifted"
    INTELLIGENT     = "intelligent"
    CREATIVE        = "creative"
    SPIRITUAL       = "spiritual"
    LEADERSHIP      = "leadership"
    SENSITIVE       = "sensitive"
    CHALLENGING     = "challenging"
    AVERAGE         = "average"


class DeathOrderIndicator(str, Enum):
    """Who is likely to transition first."""
    PERSON_A_FIRST  = "person_a_first"
    PERSON_B_FIRST  = "person_b_first"
    SIMULTANEOUS    = "simultaneous"   # Very rare — accidents, disasters
    UNCLEAR         = "unclear"


# ---------------------------------------------------------------------------
# Input models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class GeoLocation:
    place_name:   str
    city:         str
    country:      str
    country_code: str
    latitude:     float
    longitude:    float
    timezone:     str
    utc_offset:   float


@dataclass(frozen=True)
class BirthData:
    full_name:        str
    day:              int
    month:            int
    year:             int
    hour:             Optional[int]
    minute:           Optional[int]
    hour_known:       bool
    birth_place:      GeoLocation
    present_location: GeoLocation

    @property
    def birth_date(self) -> date:
        return date(self.year, self.month, self.day)

    @property
    def birth_datetime(self) -> datetime:
        h = self.hour if self.hour_known and self.hour is not None else 12
        m = self.minute if self.hour_known and self.minute is not None else 0
        return datetime(self.year, self.month, self.day, h, m)

    @property
    def has_current_name(self) -> bool:
        return False


@dataclass
class UserInput:
    birth_data:          BirthData
    current_name:        Optional[str]    = None
    face_reading:        Optional[object] = None
    dominant_palm:       Optional[object] = None
    non_dominant_palm:   Optional[object] = None
    dual_palm:           Optional[object] = None
    requested_domains:   List[Domain]     = field(default_factory=lambda: list(ALL_DOMAINS))
    include_remedies:    bool             = True
    session_id:          Optional[str]   = None
    # ── v3.0.0 additions ────────────────────────────────────────────────
    gender:              Optional[Gender]       = None
    tool_type:           ToolType               = ToolType.LEGACY
    partner_data:        Optional["PartnerBirthData"] = None   # Synastry
    parent_data:         Optional["ParentData"]       = None   # Inheritance

    def validate(self) -> List[str]:
        errors = []
        bd = self.birth_data
        if not bd.full_name or len(bd.full_name.strip()) < 2:
            errors.append("Full birth name is required.")
        if not (1 <= bd.day <= 31):
            errors.append(f"Day {bd.day} is invalid.")
        if not (1 <= bd.month <= 12):
            errors.append(f"Month {bd.month} is invalid.")
        current_year = datetime.now().year
        if not (1900 <= bd.year <= current_year):
            errors.append(f"Year {bd.year} must be between 1900 and {current_year}.")
        if bd.hour_known:
            if bd.hour is not None and not (0 <= bd.hour <= 23):
                errors.append(f"Hour {bd.hour} must be 0-23.")
            if bd.minute is not None and not (0 <= bd.minute <= 59):
                errors.append(f"Minute {bd.minute} must be 0-59.")
        if bd.birth_place.latitude == 0.0 and bd.birth_place.longitude == 0.0:
            errors.append("Birth place could not be geocoded.")
        # v3.0.0: synastry validation
        if self.tool_type == ToolType.UNION_BLUEPRINT and self.partner_data is None:
            errors.append("Union Blueprint requires partner_data.")
        return errors

    def has_face(self) -> bool:
        return self.face_reading is not None

    def has_dominant_palm(self) -> bool:
        return self.dominant_palm is not None

    def has_non_dominant_palm(self) -> bool:
        return self.non_dominant_palm is not None

    def has_both_palms(self) -> bool:
        return self.has_dominant_palm() and self.has_non_dominant_palm()

    def name_for_numerology(self) -> str:
        return (self.current_name or self.birth_data.full_name).strip().upper()

    def birth_name_for_numerology(self) -> str:
        return self.birth_data.full_name.strip().upper()

    # v3.0.0 helpers
    def is_synastry(self) -> bool:
        return self.tool_type == ToolType.UNION_BLUEPRINT and self.partner_data is not None

    def is_individual_blueprint(self) -> bool:
        return self.tool_type == ToolType.INDIVIDUAL_BLUEPRINT


# ---------------------------------------------------------------------------
# Input models  (v3.0.0 — new additions)
# ---------------------------------------------------------------------------

@dataclass
class PartnerBirthData:
    """
    Birth data for the second person in a synastry / union reading.
    Mirrors BirthData but as a regular dataclass (not frozen) for
    flexibility when partner data is partially known.
    """
    full_name:        str
    day:              int
    month:            int
    year:             int
    hour:             Optional[int]        = None
    minute:           Optional[int]        = None
    hour_known:       bool                 = False
    birth_place:      Optional[GeoLocation]= None
    gender:           Optional[Gender]     = None
    face_reading:     Optional[object]     = None  # Partner face image reading
    dominant_palm:    Optional[object]     = None  # Partner palm reading

    @property
    def birth_date(self) -> date:
        return date(self.year, self.month, self.day)

    @property
    def birth_datetime(self) -> datetime:
        h = self.hour   if self.hour_known and self.hour   is not None else 12
        m = self.minute if self.hour_known and self.minute is not None else 0
        return datetime(self.year, self.month, self.day, h, m)

    def name_for_numerology(self) -> str:
        return self.full_name.strip().upper()


@dataclass
class ParentData:
    """
    Optional parent birth data for inheritance pattern analysis.
    Even partial data (name only, or DOB only) adds value.
    """
    father_name:       Optional[str] = None
    father_dob:        Optional[str] = None   # ISO date string
    father_birth_place:Optional[str] = None
    mother_name:       Optional[str] = None
    mother_dob:        Optional[str] = None
    mother_birth_place:Optional[str] = None
    # Relationship between parents — affects inherited patterns
    parents_married:   Optional[bool] = None
    parents_divorced:  Optional[bool] = None
    father_deceased:   Optional[bool] = None
    mother_deceased:   Optional[bool] = None


# ---------------------------------------------------------------------------
# Numerology models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class KarmicDebt:
    """A single karmic debt detected in the numerology profile."""
    debt_type:    KarmicDebtType
    source:       str
    value:        int
    lesson:       str
    domain_impact:List[str]


@dataclass
class Pinnacle:
    """A single pinnacle life cycle."""
    number:     int
    start_age:  int
    end_age:    Optional[int]
    theme:      str
    challenge:  int
    is_current: bool


@dataclass
class NumerologyProfile:
    """
    Complete numerology profile for a person.
    All calculations use KAYAL custom formulas.
    """
    life_path:            int
    destiny:              int
    soul_urge:            int
    personality:          int
    birthday_gift:        int
    birthday_challenge:   int
    is_life_path_master:  bool
    is_destiny_master:    bool
    is_soul_urge_master:  bool
    karmic_debts:         List[KarmicDebt]
    pinnacles:            List[Pinnacle]
    current_pinnacle:     Pinnacle
    universal_year:       int
    personal_year:        int
    personal_month:       int
    personal_week:        int
    personal_day:         int
    chaldean_life_path:   Optional[int]
    chaldean_destiny:     Optional[int]
    chaldean_note:        Optional[str]


# ---------------------------------------------------------------------------
# Cultural and system selection models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class CulturalProfile:
    origin:               CulturalOrigin
    country_code:         str
    astrology_primary:    AstrologySystem
    astrology_secondary:  Optional[AstrologySystem]
    astrology_weight:     float
    numerology_primary:   NumerologySystem
    numerology_secondary: Optional[NumerologySystem]
    numerology_weight:    float
    use_ba_zi:            bool
    use_jyotish:          bool
    use_western:          bool
    confidence:           float
    remedy_tradition:     RemedyTradition


@dataclass
class AstrologyWeighting:
    primary_system:   AstrologySystem
    secondary_system: Optional[AstrologySystem]
    primary_weight:   float
    secondary_weight: float
    hour_uncertain:   bool
    ayanamsa:         str
    house_system:     str
    cultural_origin:  CulturalOrigin


# ---------------------------------------------------------------------------
# Signal models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class RawSignal:
    system:          str
    feature:         str
    domain:          Domain
    tone:            SignalTone
    strength:        float
    reading:         str
    keywords:        List[str]
    astro_affinity:  List[str]
    numerology_link: List[int]
    chinese_element: Optional[str]
    weight:          float
    temporal_phase:  Optional[TemporalPhase] = None


@dataclass
class SignalMap:
    session_id:       str
    tier:             ReadingTier
    cultural_profile: CulturalProfile
    domains:          Dict[str, List[RawSignal]]
    available_systems:List[str]
    total_signals:    int

    def signals_for(self, domain: Domain) -> List[RawSignal]:
        return self.domains.get(domain.value, [])

    def systems_for(self, domain: Domain) -> List[str]:
        return list({s.system for s in self.signals_for(domain)})


# ---------------------------------------------------------------------------
# Esoteric models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class FourWorldsMap:
    atziluth_active: bool
    beriah_active:   bool
    yetzirah_active: bool
    assiah_active:   bool
    worlds_count:    int
    completeness:    float


@dataclass
class SephirahActivation:
    activated:         List[str]
    primary:           str
    pillar_balance:    KabbalahPillar
    mercy_score:       float
    severity_score:    float
    integration_note:  str


@dataclass
class HermeticCorrespondence:
    correspondence_found: bool
    matching_systems:     List[str]
    principle_activated:  str
    amplification_factor: float
    description:          str


@dataclass
class ChineseSynthesis:
    day_master_element: ChineseElement
    year_element:       ChineseElement
    month_element:      Optional[ChineseElement]
    hour_element:       Optional[ChineseElement]
    dominant_element:   ChineseElement
    lacking_element:    Optional[ChineseElement]
    element_balance:    Dict[str, int]
    ba_zi_profile:      str
    hour_uncertain:     bool
    iching_hexagram:    Optional[int]
    iching_meaning:     Optional[str]


@dataclass
class VedicSynthesis:
    rashi:             str
    nakshatra:         str
    nakshatra_pada:    int
    lagna:             str
    atmakaraka:        str
    dosha:             AyurvedicDosha
    dosha_notes:       str
    karma_indicators:  List[str]
    dharma_indicator:  str


@dataclass
class EsotericSynthesis:
    four_worlds:           FourWorldsMap
    sephirah:              SephirahActivation
    hermetic:              HermeticCorrespondence
    chinese:               ChineseSynthesis
    vedic:                 VedicSynthesis
    tree_of_life_path:     str
    unified_theme:         str
    amplification_domains: List[str]


# ---------------------------------------------------------------------------
# Resolution models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class ConflictResolution:
    domain:            Domain
    conflict_systems:  List[str]
    winning_system:    str
    resolution_rule:   str
    resolved_tone:     SignalTone
    resolved_reading:  str
    suppressed_signal: str
    confidence:        float


# ---------------------------------------------------------------------------
# Temporal arc models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class TemporalArc:
    past:           str
    past_systems:   List[str]
    present:        str
    present_systems:List[str]
    future:         str
    future_systems: List[str]
    arc_confidence: float


# ---------------------------------------------------------------------------
# Problem identification models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class DomainProblem:
    identified:        bool
    description:       str
    origin:            str
    urgency:           ProblemUrgency
    systems_flagging:  List[str]
    karmic_link:       Optional[str]


# ---------------------------------------------------------------------------
# Solution models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class PracticalSolution:
    domain:        Domain
    action:        str
    timing:        str
    duration:      str
    expected_shift:str


@dataclass
class SpiritualRemedy:
    tradition:        RemedyTradition
    domain:           Domain
    urgency:          RemedyUrgency
    title:            str
    description:      str
    timing:           str
    duration:         str
    materials:        List[str]
    mantra_or_prayer: Optional[str]
    expected_shift:   str
    caution:          Optional[str]


@dataclass
class DomainSolution:
    domain:             Domain
    has_problem:        bool
    practical:          Optional[PracticalSolution]
    spiritual_remedy:   Optional[SpiritualRemedy]
    remedy_triggered_by:List[str]


# ---------------------------------------------------------------------------
# Synthesis output models  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class SupportingSignal:
    system:   str
    feature:  str
    reading:  str
    strength: float


@dataclass
class DomainSynthesis:
    domain:               Domain
    convergence_level:    ConvergenceLevel
    synthesis_confidence: float
    primary_signal:       str
    supporting_signals:   List[SupportingSignal]
    tension:              Optional[str]
    resolution:           Optional[str]
    timing_note:          Optional[str]
    growth_edge:          Optional[str]
    keywords:             List[str]
    tone:                 SignalTone
    sephirah_note:        Optional[str]
    pillar:               KabbalahPillar
    temporal:             Optional[TemporalArc]    = None
    problem:              Optional[DomainProblem]  = None
    solution:             Optional[DomainSolution] = None


@dataclass
class TimingLayer:
    personal_year:          int
    personal_year_theme:    str
    personal_month:         int
    personal_month_theme:   str
    personal_week:          int
    personal_week_theme:    str
    personal_day:           int
    personal_day_theme:     str
    current_transits:       List[str]
    next_major_transit:     str
    saturn_return_phase:    Optional[str]
    jupiter_phase:          str
    mian_xiang_period:      str
    mian_xiang_theme:       str
    current_luck_pillar:    Optional[str]
    luck_pillar_theme:      Optional[str]
    current_dasha:          Optional[str]
    dasha_theme:            Optional[str]
    unified_timing:         str
    opportunity_window:     str
    caution_window:         Optional[str]
    current_pinnacle:       Optional[int]  = None
    current_pinnacle_theme: Optional[str]  = None
    next_pinnacle_age:      Optional[int]  = None
    next_pinnacle_theme:    Optional[str]  = None


# ---------------------------------------------------------------------------
# Output models  (v3.0.0 — new additions)
# ---------------------------------------------------------------------------

# ── Spirit World ─────────────────────────────────────────────────────────────

@dataclass
class SpiritAttachment:
    """A single identified spiritual attachment or presence."""
    attachment_type:   SpiritAttachmentType
    description:       str          # What this presence is
    origin:            str          # Where it came from
    domain_impact:     List[str]    # Which life areas it affects
    is_draining:       bool         # Whether it depletes the person's energy
    remedy_required:   bool
    remedy_summary:    Optional[str]


@dataclass
class SpiritWorldProfile:
    """
    Complete spirit world and ancestral analysis for one person.
    Drawn from 12th house, Neptune, Pluto, South Node,
    palm spirit mounts, and numerology karmic indicators.
    """
    has_attachments:          bool
    attachments:              List[SpiritAttachment]
    ancestral_burden:         str        # What the bloodline carries
    ancestral_gift:           str        # What the bloodline bestows
    generational_curse:       Optional[str]
    generational_blessing:    Optional[str]
    past_life_indicators:     List[str]  # Key past-life patterns
    spiritual_contracts:      List[str]  # Active soul contracts
    unresolved_vows:          List[str]  # Past-life vows still binding
    spiritual_protection:     str        # Strength of natural protection
    psychic_openness:         str        # How open the spiritual channel is
    home_spiritual_condition: str        # Is the home environment clean
    overall_burden_level:     float      # 0.0 (clear) to 1.0 (heavily burdened)
    primary_remedy_tradition: RemedyTradition


# ── Health ───────────────────────────────────────────────────────────────────

@dataclass
class HealthVulnerability:
    """A single identified health vulnerability."""
    system_or_organ:   str          # e.g. "cardiovascular", "liver", "nervous system"
    vulnerability:     str          # Plain language description
    planetary_ruler:   str          # Which planet governs this vulnerability
    is_inherited:      bool         # From bloodline vs personal chart
    urgency:           ProblemUrgency
    recommended_focus: str


@dataclass
class HealthProfile:
    """
    Complete health and constitutional analysis for one person.
    Drawn from 6th house, Saturn, Mars, Moon, Ascendant,
    palm health markers, face vitality zones, and numerology.
    """
    constitutional_type:        str              # e.g. "Fire-dominant Pitta"
    dominant_element:           str              # fire / earth / air / water
    ayurvedic_dosha:            AyurvedicDosha
    vulnerabilities:            List[HealthVulnerability]
    inherited_conditions:       List[str]        # From bloodline
    mental_health_profile:      str              # Anxiety, depression, manic tendencies
    emotional_body_connection:  str              # How emotions manifest physically
    longevity_indicator:        str              # Long / average / short — with nuance
    major_health_crisis_window: Optional[str]   # Age range or period if indicated
    addictive_tendency:         str              # Low / moderate / high
    sexual_vitality:            str              # Energy and health in this area
    recommended_diet:           str
    recommended_exercise:       str
    recommended_sleep:          str
    planetary_health_rulers:    List[str]        # Which planets most affect health


# ── Expanded Remedies ────────────────────────────────────────────────────────

@dataclass
class AstrologicalRemedy:
    """Gemstones, metals, colours, mantras, timing from planetary analysis."""
    planet:            str
    gemstone:          Optional[str]
    metal:             Optional[str]
    colour:            str
    power_day:         str          # Day of week ruled by this planet
    power_hour:        Optional[str]
    mantra:            Optional[str]
    propitiation_note: str          # What this planet needs to be calmed or strengthened


@dataclass
class NumerologicalRemedy:
    """Name, number, and timing corrections from numerology analysis."""
    current_name_rating:   str       # "aligned" / "neutral" / "weakening"
    name_correction_note:  Optional[str]
    lucky_numbers:         List[int]
    unlucky_numbers:       List[int]
    power_dates:           List[str] # Dates in current month that carry personal power
    address_vibration:     Optional[str]
    business_name_note:    Optional[str]


@dataclass
class HealthRemedy:
    """Diet, herbs, lifestyle prescribed from constitutional and chart analysis."""
    constitutional_prescription: str
    foods_to_favour:     List[str]
    foods_to_avoid:      List[str]
    herbs_recommended:   List[str]
    exercise_type:       str
    exercise_timing:     str
    sleep_prescription:  str
    emotional_practice:  str         # What emotional work the chart prescribes


@dataclass
class RelationshipRemedy:
    """Prescribed healing and action for love and relationships."""
    primary_wound_to_heal:  str
    shadow_work_prescribed: str
    communication_practice: str
    what_to_stop:           str
    attraction_prescription:str      # How to attract the right partner
    repair_possible:        bool     # Whether current relationship is repairable
    repair_prescription:    Optional[str]


@dataclass
class WealthRemedy:
    """Financial and career prescriptions from chart and numerology."""
    primary_money_block:    str
    belief_to_dismantle:    str
    wealth_creation_path:   str
    career_move_window:     str      # When to make moves based on current cycles
    what_is_leaking_money:  str
    partnership_guidance:   str


@dataclass
class MentalRemedy:
    """Psychological and emotional practice prescriptions."""
    therapy_approach:       str      # e.g. "somatic", "CBT", "depth psychology"
    meditation_type:        str
    journaling_prescription:str
    shadow_integration:     str
    emotional_cycle_note:   str


@dataclass
class RemedyBundle:
    """
    Complete remedies package for one person across all 7 categories.
    Each category may be None if not applicable or not enough data.
    """
    spiritual:    Optional[SpiritualRemedy]      # From v2.0.0 — reused
    astrological: Optional[AstrologicalRemedy]
    numerological:Optional[NumerologicalRemedy]
    health:       Optional[HealthRemedy]
    relationship: Optional[RelationshipRemedy]
    wealth:       Optional[WealthRemedy]
    mental:       Optional[MentalRemedy]
    # Priority ordering — which remedy to act on first
    priority_order:   List[str]   = field(default_factory=list)
    overall_note:     str         = ""


# ── Children Forecast ────────────────────────────────────────────────────────

@dataclass
class ChildForecast:
    """Prediction for a single child."""
    birth_order:          int           # 1st, 2nd, 3rd...
    conception_window:    str           # Age range or year window
    likely_sex:           str           # "male" / "female" / "unclear"
    nature:               ChildNature
    nature_description:   str
    likely_success:       str           # High / moderate / conditional
    health_outlook:       str
    relationship_with_parent: str       # How this child will relate to the parent
    special_notes:        Optional[str]


@dataclass
class ChildrenForecast:
    """
    Complete children analysis for one person (individual)
    or for a union (synastry).
    """
    will_have_children:     bool
    number_indicated:       int           # 0 if none indicated
    conception_difficulty:  bool
    children:               List[ChildForecast]
    parent_will_outlive_children: Optional[bool]  # None = unclear
    loss_of_child_risk:     str           # None / low / moderate / high
    parenting_style:        str           # What kind of parent this person will be
    parenting_wound:        str           # What they must consciously overcome
    fifth_house_summary:    str           # 5th house complete reading


# ── Synastry ─────────────────────────────────────────────────────────────────

@dataclass
class SynastryCrossAspect:
    """A single planetary aspect between Person A and Person B charts."""
    planet_a:          str          # e.g. "Venus"
    planet_b:          str          # e.g. "Mars"
    aspect_type:       str          # conjunction / trine / square / opposition / sextile
    orb:               float        # Degrees of orb
    tone:              SignalTone
    domain:            Domain
    interpretation:    str          # What this specific aspect means for the union
    is_karmic:         bool         # South node involvement or strong Saturn


@dataclass
class SynastryCompatibility:
    """Compatibility scores across all life domains for the union."""
    overall_score:         float    # 0.0 – 1.0
    overall_level:         CompatibilityLevel
    emotional_score:       float
    intellectual_score:    float
    sexual_score:          float
    financial_score:       float
    spiritual_score:       float
    parenting_score:       float
    longevity_score:       float
    karmic_score:          float    # How heavy the karmic load between them is


@dataclass
class SynastryProfile:
    """
    Complete union analysis for two people.
    The full output of the synastry engine.
    """
    # Relationship classification
    relationship_type:         RelationshipType
    relationship_description:  str
    is_meant_for_marriage:     bool
    is_primarily_sexual:       bool

    # Compatibility
    compatibility:             SynastryCompatibility
    compatibility_summary:     str

    # Cross-chart aspects
    cross_aspects:             List[SynastryCrossAspect]
    composite_chart_summary:   str     # Composite (midpoint) chart reading
    dominant_houses:           List[str]  # Which houses most activated

    # Dominance
    dominance:                 DominanceType
    dominance_description:     str
    star_conflict:             bool     # Does one chart harm the other?
    star_conflict_description: Optional[str]

    # Marriage and longevity
    marriage_longevity:        str      # Likely duration or "enduring"
    separation_risk:           str      # Low / moderate / high / very high
    separation_trigger:        Optional[str]
    divorce_indicators:        List[str]
    reconciliation_possible:   bool

    # Fidelity
    person_a_infidelity_risk:  InfidelityRisk
    person_b_infidelity_risk:  InfidelityRisk
    infidelity_trigger:        Optional[str]

    # Death and longevity
    death_order:               DeathOrderIndicator
    death_order_description:   str
    longevity_impact:          str      # How the union affects each person's longevity

    # Children (union view)
    children_forecast:         Optional[ChildrenForecast]

    # Career and wealth
    union_wealth_potential:    str
    career_compatibility:      str
    best_occupation_together:  Optional[str]

    # Health cross-impact
    health_impact_a_on_b:      str      # How person A's energy affects B's health
    health_impact_b_on_a:      str

    # Inherited patterns
    person_a_parent_patterns:  List[str]  # What A inherited that affects the union
    person_b_parent_patterns:  List[str]

    # Spirit world (union)
    spirit_conflict:           bool     # Do their spirit attachments clash?
    spirit_conflict_description: Optional[str]
    ancestral_union_karma:     str      # What the bloodlines bring into the union

    # Destiny
    union_destiny:             str      # What they are here to build together
    union_karmic_contract:     str      # Is this karmic debt or dharmic purpose?
    union_life_purpose:        str

    # Remedies for the union
    union_remedy_bundle:       Optional[RemedyBundle]

    # Overall assessment
    overall_verdict:           str      # The single most important truth about this union
    biggest_threat:            str
    greatest_strength:         str
    what_to_focus_on:          str


# ── Blueprint output models ───────────────────────────────────────────────────

@dataclass
class IndividualBlueprint:
    """
    Top-level output model for the Individual Personal Life Blueprint tool.
    Aggregates all 16 domain analyses plus all new modules.
    """
    session_id:         str
    user_name:          str
    birth_data_summary: str
    # Core synthesis (from existing SynthesisPayload domains)
    domains:            Dict[str, DomainSynthesis]
    timing:             TimingLayer
    numerology_profile: Optional[NumerologyProfile]
    # New modules
    spirit_world:       Optional[SpiritWorldProfile]
    health_profile:     Optional[HealthProfile]
    children_forecast:  Optional[ChildrenForecast]
    remedy_bundle:      Optional[RemedyBundle]
    # Summary fields
    soul_purpose:       str
    dominant_life_theme:str
    current_chapter:    str
    next_12_months:     str
    death_transition:   str      # What the chart says about transition
    legacy_reading:     str      # What this person will leave behind
    generated_at:       str


@dataclass
class UnionBlueprint:
    """
    Top-level output model for the Complete Union Blueprint (synastry) tool.
    Contains both individual analyses plus the complete union profile.
    """
    session_id:             str
    person_a_name:          str
    person_b_name:          str
    # Individual analyses for each person
    person_a_blueprint:     Optional[IndividualBlueprint]
    person_b_blueprint:     Optional[IndividualBlueprint]
    # Union-level analysis
    synastry_profile:       SynastryProfile
    # Summary
    union_summary:          str
    union_verdict:          str
    generated_at:           str


# ---------------------------------------------------------------------------
# Synthesis payload  (v2.0.0 preserved + v3.0.0 additions)
# ---------------------------------------------------------------------------

@dataclass
class SynthesisPayload:
    session_id:           str
    tier:                 ReadingTier
    cultural_profile:     CulturalProfile
    available_systems:    List[str]
    domains:              Dict[str, DomainSynthesis]
    timing:               TimingLayer
    esoteric:             EsotericSynthesis
    dominant_themes:      List[str]
    confirmed_signals:    Dict[str, List[str]]
    conflicting_signals:  Dict[str, List[str]]
    overall_confidence:   float
    processing_ms:        int
    # v2.0.0 addition (preserved)
    numerology_profile:   Optional[NumerologyProfile] = None
    # v3.0.0 additions
    spirit_world:         Optional[SpiritWorldProfile]   = None
    health_profile:       Optional[HealthProfile]        = None
    remedy_bundle:        Optional[RemedyBundle]         = None
    synastry_profile:     Optional[SynastryProfile]      = None
    individual_blueprint: Optional[IndividualBlueprint]  = None
    union_blueprint:      Optional[UnionBlueprint]       = None

    def get_domain(self, domain: Domain) -> Optional[DomainSynthesis]:
        return self.domains.get(domain.value)

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# LLM payload models  (v2.0.0 preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class LLMTemporalPayload:
    """Temporal arc formatted for LLM narration."""
    past:    str
    present: str
    future:  str


@dataclass
class LLMRemedyPayload:
    """Spiritual remedy formatted for LLM narration — zero system vocabulary."""
    has_remedy:       bool
    title:            str
    description:      str
    timing:           str
    duration:         str
    materials:        List[str]
    mantra_or_prayer: Optional[str]
    expected_shift:   str
    caution:          Optional[str]


@dataclass
class LLMDomainPayload:
    """Single domain formatted for LLM narration."""
    domain:            str
    convergence_level: str
    primary_reading:   str
    supporting_points: List[str]
    tension:           Optional[str]
    resolution:        Optional[str]
    timing:            Optional[str]
    growth_edge:       Optional[str]
    tone_instruction:  str
    keywords:          List[str]
    temporal:          Optional[LLMTemporalPayload] = None
    problem:           Optional[str]               = None
    practical_solution:Optional[str]               = None
    remedy:            Optional[LLMRemedyPayload]  = None


# ---------------------------------------------------------------------------
# LLM payload models  (v3.0.0 — new additions)
# ---------------------------------------------------------------------------

@dataclass
class LLMSpiritPayload:
    """Spirit world section formatted for LLM narration."""
    has_spirit_content:       bool
    ancestral_burden:         str
    ancestral_gift:           str
    generational_curse:       Optional[str]
    generational_blessing:    Optional[str]
    attachments_summary:      str       # Plain language — no system vocabulary
    past_life_summary:        str
    spiritual_protection:     str
    home_condition:           str
    remedy_summary:           str
    burden_level:             str       # "light" / "moderate" / "heavy"


@dataclass
class LLMHealthPayload:
    """Health section formatted for LLM narration."""
    constitutional_summary:   str
    vulnerability_summary:    str
    inherited_conditions:     str
    mental_health_note:       str
    longevity_note:           str
    crisis_window:            Optional[str]
    lifestyle_prescription:   str


@dataclass
class LLMRemedyBundlePayload:
    """Complete remedies bundle formatted for LLM narration."""
    has_remedies:          bool
    spiritual_remedy:      Optional[str]   # Plain language prescription
    astrological_remedy:   Optional[str]
    numerological_remedy:  Optional[str]
    health_remedy:         Optional[str]
    relationship_remedy:   Optional[str]
    wealth_remedy:         Optional[str]
    mental_remedy:         Optional[str]
    priority_order:        List[str]
    overall_remedy_note:   str


@dataclass
class LLMSynastryPayload:
    """Union blueprint formatted for LLM narration."""
    person_a_name:             str
    person_b_name:             str
    relationship_type:         str
    relationship_description:  str
    compatibility_summary:     str
    compatibility_score:       float
    is_meant_for_marriage:     str    # "yes" / "no" / "conditional"
    marriage_longevity:        str
    separation_risk:           str
    person_a_infidelity_risk:  str
    person_b_infidelity_risk:  str
    death_order:               str
    children_summary:          str
    union_wealth_summary:      str
    health_cross_impact:       str
    spirit_conflict_summary:   str
    union_destiny:             str
    biggest_threat:            str
    greatest_strength:         str
    what_to_focus_on:          str
    union_remedy_summary:      Optional[str]
    overall_verdict:           str
    dominance_description:     str
    star_conflict_summary:     Optional[str]


# ---------------------------------------------------------------------------
# LLM top-level payload  (v2.0.0 preserved + v3.0.0 additions)
# ---------------------------------------------------------------------------

@dataclass
class LLMPayload:
    """Complete payload sent to LLM narration layer."""
    session_id:          str
    user_name:           str
    tier_description:    str
    domains:             List[LLMDomainPayload]
    timing_summary:      str
    overall_theme:       str
    journey_narrative:   str
    dominant_themes:     List[str]
    narration_tone:      str
    word_count_target:   int
    cultural_context:    str
    # v2.0.0 additions (preserved)
    has_karmic_debts:    bool           = False
    karmic_debt_summary: Optional[str] = None
    pinnacle_summary:    Optional[str] = None
    # v3.0.0 additions
    spirit_payload:      Optional[LLMSpiritPayload]       = None
    health_payload:      Optional[LLMHealthPayload]       = None
    remedy_payload:      Optional[LLMRemedyBundlePayload] = None
    synastry_payload:    Optional[LLMSynastryPayload]     = None
    tool_type:           ToolType                         = ToolType.LEGACY
    children_summary:    Optional[str]                    = None
    death_transition:    Optional[str]                    = None
    legacy_reading:      Optional[str]                    = None

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Error model  (v2.0.0 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class LogicEngineError:
    session_id:   str
    error_code:   str
    message:      str
    recoverable:  bool
    missing_data: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)
