"""
Remedies Engine — KAYAL Synthesis Platform
==========================================
Unified seven-category remedy generation for the Individual Blueprint.

Position in the pipeline:
    All other engine outputs (spirit, health, astrology, numerology)
         ↓
    RemediesEngine.compute()
         ↓
    RemedyBundle (7 categories + action plan)
         ↓
    Logic Layer  →  LLM Narrator  →  Blueprint PDF (Remedies section)

Responsibility:
    Synthesise outputs from ALL upstream engines into a unified,
    personalised remedy package covering seven life domains.
    This is the INTEGRATION layer — not a standalone calculator.

    Seven remedy categories:
    1. SPIRITUAL      — ancestral work, vow release, psychic protection, activation
    2. ASTROLOGICAL   — planetary propitiation (gemstone/color/mantra/timing/fasting)
    3. NUMEROLOGICAL  — LP activation, karmic debt healing, personal year alignment
    4. HEALTH         — diet, supplements, exercise, lifestyle from health profile
    5. RELATIONSHIP   — communication, intimacy, conflict, community practices
    6. WEALTH         — income timing, savings structure, investment approach
    7. MENTAL         — therapy modality, daily practice, urgency classification

Output extras:
    - immediate_actions: the 5 most important things to do right now
    - short_term_plan:   3-month priority sequence
    - long_term_plan:    1-year integration roadmap
    - integration_note:  how the seven categories work as a system

Design principles:
    - Synthesis first: always draws from upstream profiles before generating generic remedies
    - Specificity: each remedy tied to a specific indicator, not generic
    - Timing-aware: every remedy carries timing guidance
    - Tradition-attributed: Vedic, Western, numerological, or universal traditions named
    - Action-hierarchy: immediate > short-term > long-term, not everything at once
    - Non-prescriptive in health: lifestyle/complementary only, never pharmaceutical

Knowledge sources:
    Vedic:      B.V. Raman — "Planetary Influences on Human Affairs"
                Behari     — "Planets in the Signs and Houses"
                Hart Defouw — "Light on Life" (Jyotish remedies)
    Western:    Rex Bills   — "The Rulership Book"
                Robert Hand — "Horoscope Symbols"
    Numerology: Dan Millman  — "The Life You Were Born to Live"
                Glynis McCants — "Love by the Numbers"
    Ayurveda:   Vasant Lad  — "Ayurvedic Home Remedies"
    TCM:        Giovanni Maciocia — "The Foundations of Chinese Medicine"
    Ancestral:  Mark Wolynn  — "It Didn't Start with You"

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from .astrology_engine import (
        _find_planet_house, _DIGNIFIED_SIGNS, _DEBILITATED_SIGNS, SWE_AVAILABLE
    )
    ASTRO_AVAILABLE = True
except ImportError:
    ASTRO_AVAILABLE = False
    SWE_AVAILABLE   = False


# ---------------------------------------------------------------------------
# Planetary propitiation tables (Jyotish + Western synthesis)
# ---------------------------------------------------------------------------

_PLANET_GEMSTONES: Dict[str, Dict] = {
    "Sun":     {"vedic": "Ruby",           "alternative": "Garnet, Sunstone",        "metal": "Gold"},
    "Moon":    {"vedic": "Pearl",          "alternative": "Moonstone, White Coral",   "metal": "Silver"},
    "Mercury": {"vedic": "Emerald",        "alternative": "Green Tourmaline, Peridot","metal": "Gold/Silver alloy"},
    "Venus":   {"vedic": "Diamond",        "alternative": "White Sapphire, Opal",     "metal": "Silver"},
    "Mars":    {"vedic": "Red Coral",      "alternative": "Carnelian, Bloodstone",    "metal": "Copper"},
    "Jupiter": {"vedic": "Yellow Sapphire","alternative": "Citrine, Yellow Topaz",    "metal": "Gold"},
    "Saturn":  {"vedic": "Blue Sapphire",  "alternative": "Amethyst, Lapis Lazuli",   "metal": "Iron/Steel"},
    "Rahu":    {"vedic": "Hessonite Garnet","alternative": "Smoky Quartz, Agate",     "metal": "Mixed metals"},
    "Neptune": {"vedic": "Aquamarine",     "alternative": "Sea glass, Labradorite",   "metal": "Silver"},
    "Uranus":  {"vedic": "Tourmaline",     "alternative": "Aquamarine, Amazonite",    "metal": "Uranium glass (symbolic)"},
    "Pluto":   {"vedic": "Cat's Eye (Vaidurya)","alternative": "Obsidian, Black Tourmaline","metal": "Platinum"},
}

_PLANET_COLORS: Dict[str, List[str]] = {
    "Sun":     ["gold", "orange", "saffron", "bright yellow"],
    "Moon":    ["white", "silver", "cream", "pale blue"],
    "Mercury": ["green", "grey-green", "mint", "emerald"],
    "Venus":   ["white", "pink", "light blue", "pastel"],
    "Mars":    ["red", "scarlet", "orange-red", "copper"],
    "Jupiter": ["yellow", "golden yellow", "royal purple", "indigo"],
    "Saturn":  ["black", "dark blue", "charcoal", "indigo"],
    "Rahu":    ["smoky grey", "dark brown", "variegated"],
    "Neptune": ["sea blue", "aqua", "misty grey", "iridescent"],
    "Uranus":  ["electric blue", "turquoise", "neon", "multi-coloured"],
    "Pluto":   ["dark red", "maroon", "black", "deep purple"],
}

_PLANET_MANTRAS: Dict[str, Dict] = {
    "Sun":     {"vedic": "Om Suryaya Namaha", "affirmation": "I radiate confidence and vitality. My light illuminates the world."},
    "Moon":    {"vedic": "Om Chandraya Namaha", "affirmation": "I trust my intuition. My emotions are a gift."},
    "Mercury": {"vedic": "Om Budhaya Namaha", "affirmation": "My mind is clear and focused. I communicate with precision and grace."},
    "Venus":   {"vedic": "Om Shukraya Namaha", "affirmation": "I attract beauty and abundance. I am worthy of love."},
    "Mars":    {"vedic": "Om Mangalaya Namaha", "affirmation": "I act with courage and precision. My energy serves my highest purpose."},
    "Jupiter": {"vedic": "Om Gurave Namaha", "affirmation": "I expand into abundance. Wisdom and opportunity flow to me."},
    "Saturn":  {"vedic": "Om Shanaischaraya Namaha", "affirmation": "I build with patience and integrity. Time is my ally."},
    "Rahu":    {"vedic": "Om Rahave Namaha", "affirmation": "I embrace my dharmic direction with courage and focus."},
    "Neptune": {"vedic": "Om Namo Narayanaya", "affirmation": "I am connected to the infinite. My spiritual gifts serve the world."},
    "Uranus":  {"vedic": "Om Namah Shivaya", "affirmation": "I embrace transformation. My unique genius serves humanity."},
    "Pluto":   {"vedic": "Om Hrim Shrim Klim Mahakali", "affirmation": "I transform and regenerate. From depth I rise renewed."},
}

_PLANET_DAY: Dict[str, str] = {
    "Sun": "Sunday", "Moon": "Monday", "Mars": "Tuesday",
    "Mercury": "Wednesday", "Jupiter": "Thursday",
    "Venus": "Friday", "Saturn": "Saturday",
    "Rahu": "Saturday (dusk)", "Neptune": "Monday (full moon)",
    "Uranus": "Wednesday", "Pluto": "Tuesday",
}

_PLANET_HERBS: Dict[str, List[str]] = {
    "Sun":     ["saffron", "turmeric", "calamus", "ginger", "cinnamon"],
    "Moon":    ["white lotus", "jasmine", "sandalwood", "gotu kola", "marshmallow"],
    "Mercury": ["brahmi", "ginkgo", "peppermint", "fennel", "dill"],
    "Venus":   ["rose", "shatavari", "licorice", "coriander", "hibiscus"],
    "Mars":    ["garlic", "onion", "red pepper", "nettle", "cayenne", "ashwagandha"],
    "Jupiter": ["turmeric", "ashwagandha", "nutmeg", "sage", "dandelion"],
    "Saturn":  ["brahmi", "amalaki", "sesame", "ashwagandha", "haritaki"],
    "Rahu":    ["cannabis (where legal)", "calamus", "bayberry", "camphor"],
    "Neptune": ["blue lotus", "lavender", "mugwort", "valerian", "passionflower"],
}

_PLANET_ACTIVITIES: Dict[str, List[str]] = {
    "Sun":     ["morning sun exposure", "leadership practice", "creative self-expression", "father/authority healing"],
    "Moon":    ["moonlit walks", "journalling emotions", "cooking nourishing food", "water immersion", "mother healing"],
    "Mercury": ["reading, writing, learning", "communication practices", "breathwork", "hand crafts"],
    "Venus":   ["art and music creation", "beauty rituals", "relational generosity", "nature walks", "romantic practices"],
    "Mars":    ["vigorous exercise", "martial arts", "competitive sport", "decisive action", "anger expression"],
    "Jupiter": ["teaching and sharing wisdom", "charitable giving", "philosophical study", "travel", "spiritual expansion"],
    "Saturn":  ["disciplined daily practice", "fasting", "service to elders", "structured routine", "long-term commitment"],
    "Rahu":    ["new skill development", "exposure to unfamiliar cultures", "innovation projects", "dharmic work"],
    "Neptune": ["meditation", "creative arts", "water-based rituals", "dream journalling", "devotional practice"],
    "Uranus":  ["innovation projects", "community activism", "eccentricity celebration", "sudden change embrace"],
    "Pluto":   ["shadow work", "depth psychology", "power clearing", "radical honesty", "regenerative practices"],
}

# Numerology remedy tables
_KARMIC_DEBT_REMEDIES: Dict[int, Dict] = {
    13: {
        "core": "Discipline and sustained effort across all domains.",
        "practice": "Complete one significant long-term project before starting another. Resistance to completion is the karmic pattern to heal.",
        "mantra": "I commit fully. I see what I begin through to its natural completion.",
        "timing": "Begin remediation on a 4-vibration day (4th, 13th, 22nd, 31st of month).",
    },
    14: {
        "core": "Moderation and structured freedom.",
        "practice": "Daily discipline practice (cold shower, early rising, structured meals) as the foundation for genuine freedom.",
        "mantra": "I am disciplined and free. Structure is the ground from which I fly.",
        "timing": "Begin remediation on a 5-vibration day (5th, 14th, 23rd of month).",
    },
    16: {
        "core": "Humility and collective spiritual participation.",
        "practice": "Join a spiritual community and participate as a member, not a leader. Surrender practice daily.",
        "mantra": "I am guided. I release the need to control the divine. Through surrender I rise.",
        "timing": "Begin remediation on a 7-vibration day (7th, 16th, 25th of month).",
    },
    19: {
        "core": "Interdependence and genuine giving.",
        "practice": "Ask for help once per day, even for small things. Service practice that requires receiving as well as giving.",
        "mantra": "I am interconnected. My strength includes my need for others. Together we rise.",
        "timing": "Begin remediation on a 1-vibration day (1st, 10th, 19th, 28th of month).",
    },
}

_LP_WEALTH_APPROACH: Dict[int, str] = {
    1:  "Wealth through individual enterprise and leadership. Build something that bears your signature.",
    2:  "Wealth through partnership and collaboration. Your value amplifies in relationship.",
    3:  "Wealth through creative expression and communication. Let your creativity generate income.",
    4:  "Wealth through systematic building and reliable expertise. Consistency compounds.",
    5:  "Wealth through versatility and multiple income streams. Variety is your financial strength.",
    6:  "Wealth through service, beauty, and care. Community and family are your financial ecosystem.",
    7:  "Wealth through specialised knowledge and intellectual property. Depth commands premium.",
    8:  "Wealth through executive capacity and financial mastery. You are designed for abundance at scale.",
    9:  "Wealth through humanitarian contribution. Align income with service and the universe supports.",
    11: "Wealth through spiritual gifts and intuitive service. Your sensitivity is a market differentiator.",
    22: "Wealth through large-scale manifestation. Build structures that serve beyond individual benefit.",
    33: "Wealth through teaching and compassion. Your giving nature attracts abundance when boundaries are held.",
}

_PERSONAL_YEAR_GUIDANCE: Dict[int, Dict] = {
    1: {"theme": "New beginnings", "wealth": "Launch new ventures", "health": "Start new health practices", "relationship": "Initiate new connections", "avoid": "Continuing outgrown situations"},
    2: {"theme": "Partnerships and patience", "wealth": "Collaborate, avoid major solo decisions", "health": "Gentle practices, emotional health", "relationship": "Deepen existing bonds", "avoid": "Impulsive action"},
    3: {"theme": "Creativity and expression", "wealth": "Invest in creative and communication skills", "health": "Joyful movement", "relationship": "Social expansion", "avoid": "Overcommitment"},
    4: {"theme": "Foundation building", "wealth": "Save and structure finances", "health": "Structural health (bones, joints)", "relationship": "Stabilise home life", "avoid": "Shortcuts"},
    5: {"theme": "Change and freedom", "wealth": "New income streams, flexibility", "health": "Varied exercise, new health approaches", "relationship": "Adventure with partner", "avoid": "Resisting necessary change"},
    6: {"theme": "Service and family", "wealth": "Community-based income, family investment", "health": "Nurturing practices", "relationship": "Relationship healing", "avoid": "Self-neglect"},
    7: {"theme": "Reflection and spiritual growth", "wealth": "Avoid major financial decisions, research instead", "health": "Rest, meditation, inner work", "relationship": "Depth over breadth", "avoid": "Isolation or escapism"},
    8: {"theme": "Power and manifestation", "wealth": "Major financial initiatives, executive action", "health": "Endurance training", "relationship": "Power balance awareness", "avoid": "Overextension"},
    9: {"theme": "Completion and release", "wealth": "Clear debts, complete projects", "health": "Detoxification", "relationship": "Release what no longer serves", "avoid": "Starting major new things"},
}

_LP_RELATIONSHIP: Dict[int, str] = {
    1:  "You lead in relationships. Your growth edge: sharing leadership and valuing partnership input.",
    2:  "You create harmony and support naturally. Your growth edge: asserting your own needs without guilt.",
    3:  "You bring joy and creativity to relationships. Your growth edge: depth and sustained commitment.",
    4:  "You provide stability and loyalty. Your growth edge: flexibility and emotional expressiveness.",
    5:  "You bring excitement and adventure. Your growth edge: consistency and following through.",
    6:  "You nurture and care deeply. Your growth edge: receiving care without guilt or deflection.",
    7:  "You bring depth and wisdom. Your growth edge: vulnerability and emotional availability.",
    8:  "You bring ambition and capacity. Your growth edge: emotional attunement and service in relationship.",
    9:  "You bring compassion and vision. Your growth edge: personal intimacy alongside universal love.",
    11: "You bring sensitivity and spiritual depth. Your growth edge: grounding and practical partnership.",
    22: "You bring vision and capacity for transformation. Your growth edge: presence in everyday relationship.",
    33: "You bring devotion and compassion. Your growth edge: receiving without feeling you must give in return.",
}


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SpiritualRemedy:
    spirit_aspect: str   # "ancestral_clearing", "vow_release", "psychic_protection",
                         # "spiritual_activation", "home_clearing"
    remedy_type:   str   # "ritual", "meditation", "mantra", "ceremony", "practice"
    description:   str
    timing:        str   # "daily", "weekly", "new_moon", "full_moon", "immediately"
    tradition:     str   # "vedic", "western_esoteric", "ancestral", "universal"


@dataclass
class AstrologicalRemedy:
    planet:       str    # which planet this remedy addresses
    issue:        str    # what weakness or imbalance is being addressed
    remedy_type:  str    # "gemstone", "color", "mantra", "fasting", "timing", "activity"
    description:  str
    timing:       str    # "daily", "weekly (planet day)", "saturn_transit", etc.
    tradition:    str    # "vedic", "western", "both"


@dataclass
class NumerologicalRemedy:
    number:       int    # which number this remedy addresses
    aspect:       str    # "life_path", "karmic_debt", "personal_year", "pinnacle", "missing"
    remedy_type:  str    # "color", "timing", "mantra", "name", "practice"
    description:  str
    timing:       str


@dataclass
class HealthRemedy:
    body_system:  str    # "cardiovascular", "digestive", "nervous", etc.
    priority:     str    # "immediate", "recommended", "supportive"
    remedy_type:  str    # "dietary", "supplement", "exercise", "lifestyle", "herbal"
    description:  str
    duration:     str    # "3_days", "3_months", "ongoing"


@dataclass
class RelationshipRemedy:
    relationship_aspect: str  # "communication", "intimacy", "conflict", "family", "community"
    remedy_type:         str  # "practice", "therapy", "ritual", "study"
    description:         str
    timing:              str


@dataclass
class WealthRemedy:
    wealth_aspect: str   # "income", "savings", "investment", "debt_clearing", "abundance_mindset"
    remedy_type:   str   # "practice", "timing", "ritual", "financial_structure"
    description:   str
    timing:        str


@dataclass
class MentalRemedy:
    mental_aspect: str   # "anxiety", "depression", "focus", "clarity", "resilience", "shadow"
    remedy_type:   str   # "therapy", "practice", "breathwork", "medication_note", "lifestyle"
    description:   str
    urgency:       str   # "immediate", "recommended", "supportive"


@dataclass
class RemedyBundle:
    """
    The complete seven-category remedy package for the Individual Blueprint.

    Logic Layer instruction:
    Present the seven categories with the immediate_actions as the opening.
    Each category should be accompanied by the integration_note context.
    Remedies are already ordered by priority within each category.
    """
    # Seven remedy categories
    spiritual:      List[SpiritualRemedy]
    astrological:   List[AstrologicalRemedy]
    numerological:  List[NumerologicalRemedy]
    health:         List[HealthRemedy]
    relationship:   List[RelationshipRemedy]
    wealth:         List[WealthRemedy]
    mental:         List[MentalRemedy]

    # Prioritised action plan
    immediate_actions: List[str]
    short_term_plan:   List[str]
    long_term_plan:    List[str]

    # Synthesis note
    integration_note: str

    # Collector-ready signals
    remedy_signals: List[Dict]

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _house_of(planet: str, positions: Dict, houses: Dict) -> Optional[int]:
    if not ASTRO_AVAILABLE or planet not in positions: return None
    return _find_planet_house(positions[planet]["longitude"], houses)

def _sign_of(planet: str, positions: Dict) -> Optional[str]:
    return positions.get(planet, {}).get("sign") or None

def _is_debilitated(planet: str, sign: str) -> bool:
    return ASTRO_AVAILABLE and sign in _DEBILITATED_SIGNS.get(planet, [])

def _is_dignified(planet: str, sign: str) -> bool:
    return ASTRO_AVAILABLE and sign in _DIGNIFIED_SIGNS.get(planet, [])

def _planets_in_house(h: int, positions: Dict, houses: Dict) -> List[str]:
    if not ASTRO_AVAILABLE: return []
    return [p for p in positions
            if _find_planet_house(positions[p]["longitude"], houses) == h]

def _aspect(p1: str, p2: str, positions: Dict, orb: float = 8.0) -> Optional[str]:
    if p1 not in positions or p2 not in positions: return None
    d = abs(positions[p1]["longitude"] - positions[p2]["longitude"]) % 360
    if d > 180: d = 360 - d
    for angle, name in [(0,"conjunction"),(60,"sextile"),(90,"square"),
                         (120,"trine"),(150,"quincunx"),(180,"opposition")]:
        if abs(d - angle) <= orb: return name
    return None


# ---------------------------------------------------------------------------
# 2. Astrological Remedies
# ---------------------------------------------------------------------------

def _generate_astrological_remedies(
    positions:    Dict,
    houses:       Dict,
    timing_data:  Optional[Dict] = None,
) -> List[AstrologicalRemedy]:
    """
    Generate planetary propitiation remedies for weak or challenging planets.
    Prioritises: debilitated planets, hard-aspected personal planets,
    6th/8th/12th house personal planets, Saturn return if active.
    """
    remedies: List[AstrologicalRemedy] = []
    personal_planets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]

    for planet in personal_planets:
        sign  = _sign_of(planet, positions)
        house = _house_of(planet, positions, houses)
        if not sign: continue

        is_deb  = _is_debilitated(planet, sign)
        is_hard = house in (6, 8, 12) if house else False
        is_retro = positions.get(planet, {}).get("retrograde", False)

        if not (is_deb or is_hard or is_retro):
            continue  # Only remedy planets that need it

        gem   = _PLANET_GEMSTONES.get(planet, {})
        color = _PLANET_COLORS.get(planet, [])
        mantra = _PLANET_MANTRAS.get(planet, {})
        day    = _PLANET_DAY.get(planet, "")
        herbs  = _PLANET_HERBS.get(planet, [])
        acts   = _PLANET_ACTIVITIES.get(planet, [])

        issue = (f"debilitated in {sign}" if is_deb
                 else f"in the {house}th house (challenging placement)" if is_hard
                 else "retrograde (energy turned inward)")
        severity = "HIGH" if is_deb else "MODERATE"

        # Gemstone remedy
        remedies.append(AstrologicalRemedy(
            planet=planet, issue=issue,
            remedy_type="gemstone",
            description=(f"Vedic gemstone for {planet} ({issue}): "
                        f"{gem.get('vedic','')}, set in {gem.get('metal','')}. "
                        f"Alternative: {gem.get('alternative','')}. "
                        f"Wear on the {day} during {planet} hora (planetary hour). "
                        f"Minimum weight: 2 carats. Set in ring worn on appropriate finger. "
                        f"Activated by reciting the mantra 108 times before wearing."),
            timing=f"Begin wearing on {day} during waxing moon",
            tradition="vedic",
        ))

        # Color therapy remedy
        if color:
            remedies.append(AstrologicalRemedy(
                planet=planet, issue=issue,
                remedy_type="color",
                description=(f"Wear {color[0]} or {color[1] if len(color)>1 else color[0]} "
                            f"on {day} to strengthen {planet} energy. "
                            f"Incorporate {color[0]} into home décor in the direction ruled by {planet}. "
                            f"Visualise {color[0]} light entering the body during meditation on {day}."),
                timing=f"Every {day}",
                tradition="both",
            ))

        # Mantra remedy
        remedies.append(AstrologicalRemedy(
            planet=planet, issue=issue,
            remedy_type="mantra",
            description=(f"Vedic mantra: '{mantra.get('vedic','')}' — "
                        f"recite 108 times every {day} at sunrise. "
                        f"Affirmation version: '{mantra.get('affirmation','')}' — "
                        f"speak aloud 3 times upon waking daily."),
            timing=f"Daily (affirmation) + {day} (mantra, 108 repetitions)",
            tradition="both",
        ))

        # Activity remedy
        if acts:
            remedies.append(AstrologicalRemedy(
                planet=planet, issue=issue,
                remedy_type="activity",
                description=(f"Propitiate {planet} through aligned activities: "
                            f"{'; '.join(acts[:3])}. "
                            f"Schedule at least one {planet}-activating activity per week, "
                            f"ideally on {day}."),
                timing=f"Weekly minimum, especially on {day}",
                tradition="both",
            ))

        # Herb remedy
        if herbs:
            remedies.append(AstrologicalRemedy(
                planet=planet, issue=issue,
                remedy_type="herbal",
                description=(f"Herbs and foods that strengthen {planet}: "
                            f"{', '.join(herbs[:3])}. "
                            f"Include in diet on {day}. Herbal teas, tinctures, or culinary use. "
                            f"Consult a qualified herbalist for therapeutic dosing."),
                timing=f"Include in diet on {day}, regularly",
                tradition="vedic",
            ))

    # Saturn return specific remedy
    if timing_data and timing_data.get("saturn_return_phase"):
        sat_return = timing_data["saturn_return_phase"]
        remedies.insert(0, AstrologicalRemedy(
            planet="Saturn",
            issue="Active Saturn Return phase",
            remedy_type="timing",
            description=(f"Saturn Return is active: {sat_return[:100]}... "
                        f"Primary Saturn Return remedies: "
                        f"(1) Fast on Saturdays (fruits and nuts only or skip one meal). "
                        f"(2) Serve elders, homeless, or those suffering — Saturn is propitiated through service. "
                        f"(3) Wear dark blue or black on Saturdays. "
                        f"(4) Donate to Saturn charities: elderly care, disability support, prisoners. "
                        f"(5) Recite 'Om Shanaischaraya Namaha' 108 times on Saturday at sunset."),
            timing="Every Saturday throughout Saturn Return phase",
            tradition="vedic",
        ))

    return remedies[:12]  # Cap at 12 to avoid overwhelm


# ---------------------------------------------------------------------------
# 3. Numerological Remedies
# ---------------------------------------------------------------------------

def _generate_numerological_remedies(
    life_path:     Optional[int]       = None,
    karmic_debts:  Optional[List[int]] = None,
    personal_year: Optional[int]       = None,
    pinnacle:      Optional[int]       = None,
) -> List[NumerologicalRemedy]:
    """
    Generate numerological remedies for Life Path, karmic debts,
    personal year alignment, and pinnacle activation.
    """
    remedies: List[NumerologicalRemedy] = []

    # Life Path remedies
    if life_path:
        lp_color = {
            1:"gold/red", 2:"orange/silver", 3:"yellow/lavender", 4:"green/earth tones",
            5:"turquoise/silver", 6:"indigo/rose", 7:"violet/silver", 8:"gold/black",
            9:"gold/crimson", 11:"silver/electric blue", 22:"gold/earth", 33:"rose/gold",
        }
        lp_day = {
            1:"Sunday", 2:"Monday", 3:"Thursday/Friday", 4:"Saturday", 5:"Wednesday",
            6:"Friday", 7:"Saturday/Monday", 8:"Saturday", 9:"Mars days (Tuesday)",
            11:"Monday", 22:"Saturday", 33:"Friday",
        }
        colors = lp_color.get(life_path, "aligned to your ruling planet")
        day    = lp_day.get(life_path, "")

        remedies.append(NumerologicalRemedy(
            number=life_path, aspect="life_path",
            remedy_type="color",
            description=(f"Life Path {life_path} colour activation: wear or surround yourself "
                        f"with {colors} on your power days. "
                        f"Your primary day of power: {day}. "
                        f"Major decisions, launches, and new beginnings are most supported "
                        f"when aligned with {day} and dates that vibrate to {life_path} "
                        f"(dates summing to {life_path})."),
            timing=f"Emphasise {day}; schedule major actions on {life_path}-vibration dates",
        ))

        # LP number practice
        remedies.append(NumerologicalRemedy(
            number=life_path, aspect="life_path",
            remedy_type="practice",
            description=(f"Life Path {life_path} activation practice: "
                        f"meditate on the number {life_path} written in gold on black paper. "
                        f"Hold the number as a vibrational field in your energy for 5 minutes. "
                        f"Journal daily using your Life Path theme as the anchor: "
                        f"'{_LP_WEALTH_APPROACH.get(life_path, 'Embrace your unique path.')}' "),
            timing="Daily morning practice",
        ))

        # LP timing
        remedies.append(NumerologicalRemedy(
            number=life_path, aspect="life_path",
            remedy_type="timing",
            description=(f"Numerological timing optimisation for Life Path {life_path}: "
                        f"your peak manifestation window occurs during {life_path}-vibration "
                        f"personal years and months. "
                        f"Current personal year context: align all major launches and decisions "
                        f"to dates totalling {life_path} within the current personal year. "
                        f"Avoid major initiations on 4-year cycles if LP is 5 (and vice versa)."),
            timing="Ongoing — use numerological calendar",
        ))

    # Karmic debt remedies
    if karmic_debts:
        for kd in karmic_debts:
            if kd in _KARMIC_DEBT_REMEDIES:
                kdr = _KARMIC_DEBT_REMEDIES[kd]
                remedies.append(NumerologicalRemedy(
                    number=kd, aspect="karmic_debt",
                    remedy_type="practice",
                    description=(f"Karmic Debt {kd} healing practice — {kdr['core']} "
                                f"Daily practice: {kdr['practice']} "
                                f"Daily mantra: '{kdr['mantra']}' "
                                f"Optimal timing to begin: {kdr['timing']}."),
                    timing=kdr["timing"],
                ))
                remedies.append(NumerologicalRemedy(
                    number=kd, aspect="karmic_debt",
                    remedy_type="timing",
                    description=(f"Karmic Debt {kd} timing window: "
                                f"the {kd} vibration is particularly activated during personal years "
                                f"and months that vibrate to its root number. "
                                f"These periods bring the debt to the surface for healing — "
                                f"they are not punishments but scheduled healing windows. "
                                f"Prepare the daily practice BEFORE these periods arrive."),
                    timing="Activated during matching personal year/month cycles",
                ))

    # Personal year guidance
    if personal_year and personal_year in _PERSONAL_YEAR_GUIDANCE:
        pyg = _PERSONAL_YEAR_GUIDANCE[personal_year]
        remedies.append(NumerologicalRemedy(
            number=personal_year, aspect="personal_year",
            remedy_type="timing",
            description=(f"Personal Year {personal_year} — theme: '{pyg['theme']}'. "
                        f"Wealth focus this year: {pyg['wealth']}. "
                        f"Health focus: {pyg['health']}. "
                        f"Relationship focus: {pyg['relationship']}. "
                        f"What to avoid: {pyg['avoid']}."),
            timing="Entire current personal year (birthday to birthday)",
        ))

    # Pinnacle
    if pinnacle and pinnacle in (11, 22, 33):
        pinnacle_notes = {
            11: "Master Number 11 Pinnacle — an accelerated intuition and spiritual development period. Honour the sensitivity. Amplify the intuitive gifts through practice. Avoid numbing the heightened perception.",
            22: "Master Number 22 Pinnacle — a period of large-scale manifestation potential. The dreams become concrete. Ground the vision in practical step-by-step execution. What you build now can outlast your lifetime.",
            33: "Master Number 33 Pinnacle — a period of compassion at cosmic scale. Teaching, healing, and love expressed without condition. The gift is the capacity to hold this energy without burning out.",
        }
        remedies.append(NumerologicalRemedy(
            number=pinnacle, aspect="pinnacle",
            remedy_type="practice",
            description=pinnacle_notes.get(pinnacle, f"Master Number {pinnacle} Pinnacle activation."),
            timing="Active during entire Pinnacle period",
        ))

    return remedies


# ---------------------------------------------------------------------------
# 4. Spiritual Remedies
# ---------------------------------------------------------------------------

def _generate_spiritual_remedies(
    spirit_profile: Optional[Any] = None,
    positions:      Optional[Dict] = None,
    houses:         Optional[Dict] = None,
) -> List[SpiritualRemedy]:
    """
    Generate spiritual remedies from the spirit_profile and natal chart.
    If spirit_profile is not available, generates from chart indicators only.
    """
    remedies: List[SpiritualRemedy] = []

    # ── Always-applicable foundation remedies ────────────────────────────
    remedies.append(SpiritualRemedy(
        spirit_aspect="psychic_hygiene",
        remedy_type="practice",
        description=("DAILY SPIRITUAL HYGIENE: Upon waking, place both hands on the heart and state: "
                    "'I am protected, grounded, and guided.' "
                    "Set your spiritual intention for the day. "
                    "Upon sleeping, review the day and release: "
                    "'I release what is not mine. I keep what is wisdom.' "
                    "This two-point practice creates a spiritual container "
                    "for even the most sensitive chart configurations."),
        timing="Daily — morning and evening",
        tradition="universal",
    ))

    remedies.append(SpiritualRemedy(
        spirit_aspect="ancestral_connection",
        remedy_type="ritual",
        description=("WEEKLY ANCESTRAL ACKNOWLEDGEMENT: On Thursday evening (Jupiter's day), "
                    "light a white candle and speak aloud: "
                    "'To all my ancestors who have walked before me — I honour your journey. "
                    "I receive your wisdom. I release your burdens. "
                    "I carry your gifts forward.' "
                    "Leave the candle burning for 20 minutes, then extinguish. "
                    "This simple practice establishes a clear, conscious channel "
                    "to the ancestral field — beneficial for any chart."),
        timing="Every Thursday evening",
        tradition="ancestral",
    ))

    # ── Spirit profile-specific remedies ─────────────────────────────────
    if spirit_profile:
        # From spirit attachments
        high_attachments = [a for a in getattr(spirit_profile, "spirit_attachments", [])
                           if getattr(a, "severity", None) and a.severity.value == "high"]
        if high_attachments:
            remedies.append(SpiritualRemedy(
                spirit_aspect="ancestral_clearing",
                remedy_type="ceremony",
                description=("FORMAL ANCESTRAL CLEARING: Based on your spirit profile, "
                            "a formal ancestral clearing ceremony is recommended. "
                            "Options: (1) Family constellation work with a trained facilitator. "
                            "(2) Vedic Pitru Dosh puja performed by a qualified priest. "
                            "(3) Indigenous soul retrieval with a practitioner from your lineage's tradition. "
                            "The planetary indicators supporting this recommendation: "
                            + ", ".join(a.indicator for a in high_attachments[:2]) + ". "
                            "This is a one-time ceremony with ongoing maintenance practices."),
                timing="As soon as possible — within the current moon cycle",
                tradition="ancestral",
            ))

        # From unresolved vows
        vows = getattr(spirit_profile, "unresolved_vows", [])
        for vow in vows[:2]:
            remedies.append(SpiritualRemedy(
                spirit_aspect="vow_release",
                remedy_type="ritual",
                description=(f"VOW RENEGOTIATION — {getattr(vow,'vow_type','').upper()}: "
                            f"{getattr(vow,'renegotiation_guidance','')}"),
                timing="On the full moon of the current or next month",
                tradition="western_esoteric",
            ))

        # From spiritual contracts
        contracts = getattr(spirit_profile, "spiritual_contracts", [])
        for contract in contracts[:2]:
            remedies.append(SpiritualRemedy(
                spirit_aspect="spiritual_activation",
                remedy_type="practice",
                description=(f"CONTRACT ACTIVATION — {getattr(contract,'contract_type','').upper().replace('_',' ')}: "
                            f"{getattr(contract,'activation','')} "
                            f"Supporting practice: meditate on the Rahu direction weekly, "
                            f"journalling progress toward the dharmic goal."),
                timing="Weekly meditation; monthly review",
                tradition="vedic",
            ))

        # From ancestral blessings
        blessings = getattr(spirit_profile, "ancestral_blessings", [])
        if blessings:
            remedies.append(SpiritualRemedy(
                spirit_aspect="blessing_activation",
                remedy_type="practice",
                description=("ANCESTRAL BLESSING ACTIVATION: Your spirit profile shows "
                            f"{len(blessings)} ancestral blessing(s). "
                            "To activate these gifts: on the new moon each month, "
                            "speak aloud: 'I receive and activate the spiritual gifts of my lineage. "
                            "I am worthy of this inheritance.' "
                            "First blessing to claim: " + blessings[0][:120] + "..."),
                timing="New moon monthly",
                tradition="universal",
            ))

        # Psychic protection for high openness
        openness = getattr(spirit_profile, "psychic_openness", None)
        if openness and openness.value in ("high", "moderate"):
            remedies.append(SpiritualRemedy(
                spirit_aspect="psychic_protection",
                remedy_type="practice",
                description=("PSYCHIC BOUNDARY PRACTICE for high openness charts: "
                            "Before entering dense energy environments (hospitals, malls, "
                            "emotionally charged spaces): "
                            "(1) Black tourmaline in left pocket. "
                            "(2) Visualise a golden egg of light surrounding your aura. "
                            "(3) State: 'My field is my own. I witness without absorbing.' "
                            "After intense environments: "
                            "(1) Wash hands and face with cold water. "
                            "(2) Sea salt foot bath if possible. "
                            "(3) 5 deep breaths with full exhale to clear absorbed energy."),
                timing="As needed before/after dense energy environments",
                tradition="western_esoteric",
            ))

        # Home clearing
        home_score = getattr(spirit_profile, "home_spiritual_score", 0.5)
        if home_score < 0.5:
            remedies.append(SpiritualRemedy(
                spirit_aspect="home_clearing",
                remedy_type="ceremony",
                description=("HOME SPIRITUAL CLEARING: Your spirit profile indicates "
                            "the home environment requires attention. "
                            "Monthly clearing practice: "
                            "(1) Open all windows. "
                            "(2) Light frankincense or palo santo — move counter-clockwise through "
                            "each room, paying particular attention to corners and doorways. "
                            "(3) Seal by moving clockwise once through all rooms with sage or cedar. "
                            "(4) Place salt bowls in the four corners of the home for 24 hours. "
                            "(5) Dispose of salt outside. "
                            "For deeper clearing: Vedic Vastu Shanti puja is recommended."),
                timing="Monthly — ideally on the new moon",
                tradition="vedic",
            ))

    # ── Chart-based spiritual practice ────────────────────────────────────
    if positions and houses:
        nep_house = _house_of("Neptune", positions or {}, houses or {})
        if nep_house in (1, 7, 12):
            remedies.append(SpiritualRemedy(
                spirit_aspect="spiritual_activation",
                remedy_type="meditation",
                description=("NEPTUNE ACTIVATION MEDITATION for Neptune in the "
                            f"{nep_house}th house: "
                            "Yin or restorative yoga (20 minutes) followed by "
                            "open-field meditation (no technique, just awareness). "
                            "Neptune 1st/7th/12th house individuals receive spiritual "
                            "transmission most easily through non-directed, open presence. "
                            "Avoid forceful concentration techniques — surrender and receive."),
                timing="3x per week minimum",
                tradition="universal",
            ))

    return remedies


# ---------------------------------------------------------------------------
# 5. Health Remedies Synthesis
# ---------------------------------------------------------------------------

def _generate_health_remedies_synthesis(
    health_profile: Optional[Any] = None,
) -> List[HealthRemedy]:
    """
    Synthesise HealthRemedy items from a HealthProfile.
    If profile is unavailable, returns universal baseline remedies.
    """
    remedies: List[HealthRemedy] = []

    if health_profile:
        # Pull from profile's remedy lists
        for item in getattr(health_profile, "lifestyle_remedies", [])[:3]:
            parts = item.split(":", 1)
            label = parts[0].strip() if len(parts) > 1 else "LIFESTYLE"
            desc  = parts[1].strip() if len(parts) > 1 else item
            remedies.append(HealthRemedy(
                body_system="general",
                priority="recommended",
                remedy_type="lifestyle",
                description=desc,
                duration="ongoing",
            ))

        for item in getattr(health_profile, "dietary_remedies", [])[:3]:
            parts = item.split(":", 1)
            desc  = parts[1].strip() if len(parts) > 1 else item
            remedies.append(HealthRemedy(
                body_system="digestive",
                priority="recommended",
                remedy_type="dietary",
                description=desc,
                duration="ongoing",
            ))

        for item in getattr(health_profile, "exercise_remedies", [])[:2]:
            parts = item.split(":", 1)
            desc  = parts[1].strip() if len(parts) > 1 else item
            remedies.append(HealthRemedy(
                body_system="musculoskeletal",
                priority="recommended",
                remedy_type="exercise",
                description=desc,
                duration="ongoing",
            ))

        # High-severity vulnerability specific
        vulns = getattr(health_profile, "vulnerabilities", [])
        for v in vulns:
            if getattr(v, "severity", None) and v.severity.value == "high":
                remedies.insert(0, HealthRemedy(
                    body_system=v.system,
                    priority="immediate",
                    remedy_type="lifestyle",
                    description=(f"PRIORITY HEALTH FOCUS — {v.system.replace('_',' ').title()}: "
                                f"{v.management}"),
                    duration="3_months_minimum",
                ))

        # Dosha-specific anchor
        dosha = getattr(health_profile, "dosha_tendency", "")
        if dosha:
            dosha_anchor = {
                "vata": "VATA ANCHOR: Warm oil self-massage (Abhyanga) before morning shower — 10 minutes with sesame oil. Non-negotiable daily practice.",
                "pitta": "PITTA ANCHOR: 20-minute walk in nature at dusk (cooling time). Avoid working past 10pm. Coconut oil scalp massage weekly.",
                "kapha": "KAPHA ANCHOR: Cold shower finish (30 seconds) every morning to activate Kapha metabolism. Exercise before 10am.",
                "vata_pitta": "VATA-PITTA ANCHOR: Warm oil massage (Vata) + cool diet (Pitta). Avoid extreme temperatures in food and environment.",
                "pitta_kapha": "PITTA-KAPHA ANCHOR: Vigorous exercise (Kapha) + cooling diet (Pitta). Spicy foods in moderation only.",
                "vata_kapha": "VATA-KAPHA ANCHOR: Warming foods and oil (Vata) + stimulating morning practice (Kapha). Consistency above all.",
                "tridoshic": "TRIDOSHIC ANCHOR: Seasonal adjustments are key — adjust diet and practice to match the predominant season each quarter.",
            }
            anchor = dosha_anchor.get(dosha) or dosha_anchor.get(dosha.split("_")[0], "")
            if anchor:
                remedies.insert(0, HealthRemedy(
                    body_system="constitutional",
                    priority="immediate",
                    remedy_type="lifestyle",
                    description=anchor,
                    duration="ongoing",
                ))

    else:
        # Universal baseline health remedies
        remedies = [
            HealthRemedy(
                body_system="general",
                priority="immediate",
                remedy_type="lifestyle",
                description="SLEEP FOUNDATION: 7–9 hours at consistent times. Lights dim by 9pm. "
                            "No screens 60 minutes before bed. This single practice compounds "
                            "across every other health domain.",
                duration="ongoing",
            ),
            HealthRemedy(
                body_system="cardiovascular",
                priority="recommended",
                remedy_type="exercise",
                description="MOVEMENT MINIMUM: 30 minutes of brisk walking daily. "
                            "Non-negotiable before optimising any other health variable. "
                            "Nature walking preferred over treadmill.",
                duration="ongoing",
            ),
            HealthRemedy(
                body_system="immune",
                priority="recommended",
                remedy_type="supplement",
                description="IMMUNE BASELINE: Vitamin D3 (2000–5000 IU) + K2 daily. "
                            "Zinc (15–25mg) and Vitamin C (500mg food-based) daily. "
                            "Have levels tested annually to calibrate dosing.",
                duration="ongoing",
            ),
            HealthRemedy(
                body_system="digestive",
                priority="supportive",
                remedy_type="dietary",
                description="GUT FOUNDATION: Daily probiotic-rich food (kefir, kimchi, miso). "
                            "Prebiotic fibre at every meal (onion, garlic, oats, asparagus). "
                            "Remove ultra-processed foods as the primary dietary intervention.",
                duration="ongoing",
            ),
            HealthRemedy(
                body_system="general",
                priority="recommended",
                remedy_type="lifestyle",
                description="PREVENTIVE SCREENING: Annual comprehensive blood panel — "
                            "CBC, metabolic panel, lipids, HbA1c, thyroid (TSH, T3, T4), "
                            "vitamin D, ferritin, CRP. The data that enables targeted health action.",
                duration="annual",
            ),
        ]

    return remedies[:10]


# ---------------------------------------------------------------------------
# 6. Relationship Remedies
# ---------------------------------------------------------------------------

def _generate_relationship_remedies(
    life_path:        Optional[int] = None,
    synastry_profile: Optional[Any] = None,
    positions:        Optional[Dict] = None,
    houses:           Optional[Dict] = None,
) -> List[RelationshipRemedy]:
    """
    Generate relationship remedies from Life Path patterns, synastry profile,
    and natal chart indicators.
    """
    remedies: List[RelationshipRemedy] = []

    # LP relationship growth edge
    if life_path and life_path in _LP_RELATIONSHIP:
        lp_rel = _LP_RELATIONSHIP[life_path]
        remedies.append(RelationshipRemedy(
            relationship_aspect="communication",
            remedy_type="practice",
            description=(f"LIFE PATH {life_path} RELATIONSHIP PRACTICE: {lp_rel} "
                        f"Daily practice to develop this growth edge: "
                        f"in every significant conversation today, pause before responding "
                        f"and ask: 'What does this person most need from me right now?' "
                        f"This single practice develops the growth edge specific to your path."),
            timing="Daily practice — 30-day minimum to establish the new pattern",
        ))

    # Venus/Moon indicators for intimacy
    if positions and houses:
        venus_sign = _sign_of("Venus", positions)
        moon_sign  = _sign_of("Moon",  positions)

        if venus_sign:
            venus_love_notes = {
                "Aries":      "Love language: acts of initiative and challenge. Express love through action.",
                "Taurus":     "Love language: physical touch, sensory pleasure, and steadfast presence.",
                "Gemini":     "Love language: conversation, intellectual play, and variety.",
                "Cancer":     "Love language: emotional nurturance, home-making, and deep care.",
                "Leo":        "Love language: admiration, creative expression, and playful generosity.",
                "Virgo":      "Love language: acts of service, precision care, and practical helpfulness.",
                "Libra":      "Love language: beauty, harmony, fairness, and aesthetic shared experience.",
                "Scorpio":    "Love language: depth, intensity, transformative intimacy, and raw honesty.",
                "Sagittarius":"Love language: adventure, philosophical exploration, and expansive experience.",
                "Capricorn":  "Love language: reliability, ambitious shared goals, and quality over quantity.",
                "Aquarius":   "Love language: intellectual freedom, uniqueness, and unconventional intimacy.",
                "Pisces":     "Love language: spiritual connection, compassion, and transcendent togetherness.",
            }
            love_lang = venus_love_notes.get(venus_sign, "authentic connection in your Venus sign style")
            remedies.append(RelationshipRemedy(
                relationship_aspect="intimacy",
                remedy_type="practice",
                description=(f"VENUS IN {venus_sign.upper()} — LOVE LANGUAGE: {love_lang} "
                            f"Practice: explicitly name what you need in intimacy using "
                            f"this language. Ask your partner to do the same. "
                            f"Mismatched love languages cause more relationship friction "
                            f"than mismatched values — naming yours removes the ambiguity."),
                timing="Introduce in next meaningful relationship conversation",
            ))

        # Saturn aspects as commitment indicators
        sat_venus = _aspect("Saturn", "Venus", positions or {})
        if sat_venus and sat_venus in ("conjunction","square","opposition"):
            remedies.append(RelationshipRemedy(
                relationship_aspect="intimacy",
                remedy_type="therapy",
                description=(f"SATURN {sat_venus.upper()} VENUS PATTERN: "
                            "This natal aspect creates a structural tendency toward "
                            "fear of intimacy, delayed relationships, or demanding "
                            "perfection in partners before allowing closeness. "
                            "Recommended: attachment-focused therapy (EFT) to identify "
                            "the specific Saturn-Venus block. "
                            "The short form: notice where you postpone love until conditions "
                            "are 'right' — that postponement is the Saturn-Venus pattern."),
                timing="Begin therapeutic work within the next month",
            ))

    # Synastry-specific remedies
    if synastry_profile:
        union_remedies = getattr(synastry_profile, "union_remedies", [])
        for rem in union_remedies[:3]:
            # Extract category from the ALL-CAPS prefix pattern
            parts = rem.split(":", 1)
            if len(parts) == 2:
                cat = parts[0].strip().lower().replace(" ", "_")
                desc = parts[1].strip()
                aspect_map = {
                    "relationship": "communication",
                    "power": "conflict",
                    "fidelity": "intimacy",
                    "career": "community",
                    "health": "family",
                    "wealth": "community",
                    "spiritual": "community",
                }
                mapped_aspect = next(
                    (v for k, v in aspect_map.items() if k in cat),
                    "communication"
                )
                remedies.append(RelationshipRemedy(
                    relationship_aspect=mapped_aspect,
                    remedy_type="practice",
                    description=desc,
                    timing="Ongoing — establish before challenges arise",
                ))

    # Universal relationship practices
    remedies.extend([
        RelationshipRemedy(
            relationship_aspect="communication",
            remedy_type="practice",
            description=("WEEKLY RELATIONSHIP COUNCIL: 30-minute structured weekly check-in "
                        "with primary partner (or close family member if single). "
                        "Format: (1) What went well this week — 5 min each. "
                        "(2) What was difficult — 5 min each (no interrupting). "
                        "(3) One request for next week — 5 min each. "
                        "This practice prevents accumulation of unspoken grievances."),
            timing="Weekly — same day and time",
        ),
        RelationshipRemedy(
            relationship_aspect="family",
            remedy_type="practice",
            description=("FAMILY OF ORIGIN PRACTICE: Once per quarter, journal the answer to: "
                        "'In what ways am I relating to significant people in my life "
                        "the way I related to my mother/father/primary caregivers?' "
                        "Identifying the inherited pattern is the first step to choosing differently."),
            timing="Quarterly — aligned with seasonal change",
        ),
    ])

    return remedies[:8]


# ---------------------------------------------------------------------------
# 7. Wealth Remedies
# ---------------------------------------------------------------------------

def _generate_wealth_remedies(
    life_path:    Optional[int] = None,
    positions:    Optional[Dict] = None,
    houses:       Optional[Dict] = None,
    personal_year: Optional[int] = None,
) -> List[WealthRemedy]:
    """
    Generate wealth remedies from Life Path, Jupiter/Venus/2nd-8th house indicators,
    and personal year timing.
    """
    remedies: List[WealthRemedy] = []

    # LP wealth approach
    if life_path and life_path in _LP_WEALTH_APPROACH:
        lp_w = _LP_WEALTH_APPROACH[life_path]
        remedies.append(WealthRemedy(
            wealth_aspect="abundance_mindset",
            remedy_type="practice",
            description=(f"LIFE PATH {life_path} WEALTH APPROACH: {lp_w} "
                        f"Daily wealth activation: write this statement every morning — "
                        f"'Money flows to me through {lp_w.split('.')[0].lower()}.' "
                        f"Your wealth identity is strongest when your career and income "
                        f"align with your Life Path theme."),
            timing="Daily morning writing practice",
        ))

    if positions and houses:
        # Jupiter indicators
        jup_sign  = _sign_of("Jupiter", positions)
        jup_house = _house_of("Jupiter", positions, houses)
        if jup_sign:
            jup_wealth = {
                "Aries":       "Bold, pioneering ventures. First-mover advantage.",
                "Taurus":      "Patient, tangible asset accumulation. Property and land.",
                "Gemini":      "Multiple income streams. Communication and trading.",
                "Cancer":      "Family business, real estate, nurturing markets.",
                "Leo":         "Creative industries, performance, luxury goods.",
                "Virgo":       "Service-based income, health, precision work.",
                "Libra":       "Partnership ventures, beauty, law, diplomacy.",
                "Scorpio":     "Investment, inheritance, other people's money, deep research.",
                "Sagittarius": "Education, travel, publishing, philosophy, international.",
                "Capricorn":   "Corporate structures, long-term investment, authority fields.",
                "Aquarius":    "Technology, innovation, collective ventures, humanitarian.",
                "Pisces":      "Creative arts, spiritual services, healing, film.",
            }
            jup_w_note = jup_wealth.get(jup_sign, "aligned with Jupiter's sign themes")
            remedies.append(WealthRemedy(
                wealth_aspect="income",
                remedy_type="practice",
                description=(f"JUPITER IN {jup_sign.upper()} WEALTH CHANNEL: "
                            f"Your greatest wealth flows through: {jup_w_note} "
                            f"Align your primary income source with these themes. "
                            f"{'Jupiter in the ' + str(jup_house) + 'th house amplifies this in the ' + ['', 'self/identity', 'values/money', 'communication', 'home/family', 'creativity', 'service', 'partnerships', 'transformation', 'philosophy', 'career', 'community', 'spiritual'][jup_house if jup_house and jup_house <= 12 else 0] + ' domain.' if jup_house else ''}"),
                timing="Strategic planning — align career with Jupiter channel",
            ))

        # 2nd house — personal finances
        second_planets = _planets_in_house(2, positions, houses)
        if second_planets:
            sat_2nd = "Saturn" in second_planets
            jup_2nd = "Jupiter" in second_planets
            remedies.append(WealthRemedy(
                wealth_aspect="savings",
                remedy_type="financial_structure",
                description=("2ND HOUSE WEALTH STRUCTURE — "
                            f"Planets present: {', '.join(second_planets)}. "
                            + ("Saturn in the 2nd: wealth through discipline and systematic saving. "
                               "Automated savings transfers on payday are your structural remedy. "
                               "Budget rigidly — Saturn 2nd rewards the disciplined accumulator." if sat_2nd
                               else "Jupiter in the 2nd: natural abundance flow. Risk: overconfidence in income. "
                               "The remedy: automate savings BEFORE you enjoy income — "
                               "Jupiter needs a container or it expands beyond structure." if jup_2nd
                               else f"Your 2nd house planets ({', '.join(second_planets)}) shape your financial style. "
                               "Align money management style with these planetary energies.")),
                timing="Establish financial structure in the current personal year",
            ))

        # 8th house — investment and other people's money
        eighth_planets = _planets_in_house(8, positions, houses)
        if eighth_planets:
            remedies.append(WealthRemedy(
                wealth_aspect="investment",
                remedy_type="financial_structure",
                description=(f"8TH HOUSE WEALTH — planets: {', '.join(eighth_planets)}. "
                            "The 8th house governs investment, inheritance, other people's money, "
                            "and financial transformation. "
                            f"{'Pluto 8th: transformative relationship with money — profound gains through deep research and patience.' if 'Pluto' in eighth_planets else ''}"
                            f"{'Jupiter 8th: inheritance or unexpected windfalls possible. Guard against over-leverage.' if 'Jupiter' in eighth_planets else ''}"
                            f"{'Saturn 8th: slow, disciplined investment approach. Bonds, property, and index funds over speculation.' if 'Saturn' in eighth_planets else ''} "
                            "Investment approach: align investment strategy with the 8th house planetary energy."),
                timing="Review investment strategy annually with professional advisor",
            ))

        # Venus — attraction of abundance
        venus_sign = _sign_of("Venus", positions)
        venus_house = _house_of("Venus", positions, houses)
        if venus_sign and venus_house in (2, 8, 10, 11):
            remedies.append(WealthRemedy(
                wealth_aspect="abundance_mindset",
                remedy_type="ritual",
                description=(f"VENUS IN {venus_sign.upper()} (HOUSE {venus_house}) ABUNDANCE RITUAL: "
                            "Venus in wealth-significant houses indicates natural abundance magnetism. "
                            "Activate through: weekly gratitude practice specifically for money received. "
                            "Carry a piece of jade or pyrite as a Venus-wealth talisman. "
                            "On Fridays (Venus day), make one act of financial generosity — "
                            "the Venus principle: what you give in love, returns multiplied."),
                timing="Weekly on Fridays",
            ))

    # Personal year wealth timing
    if personal_year:
        pyg = _PERSONAL_YEAR_GUIDANCE.get(personal_year, {})
        if pyg:
            remedies.append(WealthRemedy(
                wealth_aspect="income",
                remedy_type="timing",
                description=(f"PERSONAL YEAR {personal_year} WEALTH TIMING: {pyg.get('wealth','')} "
                            f"Theme this year: '{pyg.get('theme','')}'. "
                            f"{'This is a major wealth initiation year — launch the financial project you have been preparing.' if personal_year == 8 else ''}"
                            f"{'This is a year to plant seeds, not harvest — invest in skills and foundations.' if personal_year == 1 else ''}"
                            f"{'This is a completion year — clear debts and close financial cycles before the new 9-year cycle begins.' if personal_year == 9 else ''}"),
                timing="Entire current personal year",
            ))

    # Universal wealth practices
    remedies.extend([
        WealthRemedy(
            wealth_aspect="savings",
            remedy_type="financial_structure",
            description=("WEALTH FOUNDATION — PAY YOURSELF FIRST: "
                        "Before any expense, transfer a minimum of 10% of all income "
                        "to a dedicated savings account immediately upon receipt. "
                        "Automate this transfer — the decision must not require willpower. "
                        "This single structural change compounds more than any investment strategy."),
            timing="Implement immediately — automated on next payday",
        ),
        WealthRemedy(
            wealth_aspect="abundance_mindset",
            remedy_type="ritual",
            description=("WEEKLY WEALTH REVIEW: Every Sunday, review the week's financial "
                        "flow — income, expenses, and savings. "
                        "Record three things money enabled this week (gratitude). "
                        "Identify one financial friction point to address next week (awareness). "
                        "This practice builds financial consciousness — the prerequisite for wealth."),
            timing="Weekly — Sunday evening",
        ),
    ])

    return remedies[:8]


# ---------------------------------------------------------------------------
# 8. Mental Remedies
# ---------------------------------------------------------------------------

def _generate_mental_remedies(
    health_profile: Optional[Any] = None,
    positions:      Optional[Dict] = None,
    houses:         Optional[Dict] = None,
) -> List[MentalRemedy]:
    """
    Generate mental/emotional health remedies from health profile
    and natal chart indicators.
    """
    remedies: List[MentalRemedy] = []

    mental_pattern = None
    if health_profile:
        mh = getattr(health_profile, "mental_health", None)
        if mh:
            mental_pattern = getattr(mh, "primary_pattern", None)

            # Pass through profile remedies as immediate
            for rem in getattr(mh, "remedies", [])[:3]:
                remedies.append(MentalRemedy(
                    mental_aspect=mental_pattern or "general",
                    remedy_type="practice",
                    description=rem,
                    urgency="recommended",
                ))

    # Pattern-specific therapy recommendation
    if mental_pattern:
        therapy_map = {
            "anxiety_tendency": (
                "immediate",
                "therapy",
                "THERAPY RECOMMENDATION — Anxiety Tendency: "
                "Cognitive Behavioural Therapy (CBT) or Acceptance and Commitment Therapy (ACT) "
                "are the evidence-based approaches for natal anxiety patterns. "
                "Specifically: identify the 3 core catastrophic thought patterns and "
                "create written counter-narratives. "
                "Somatic approaches (Somatic Experiencing, EMDR) address the nervous system "
                "component that talk therapy alone does not reach."
            ),
            "depressive_tendency": (
                "immediate",
                "therapy",
                "THERAPY RECOMMENDATION — Depressive Tendency: "
                "Behavioural Activation (part of CBT) and Interpersonal Therapy (IPT) "
                "are the most effective approaches for Saturn-Moon constitutional patterns. "
                "Key: start with physical intervention (exercise, sleep, light) before "
                "attempting cognitive work — the body must be activated first. "
                "Consider seasonal light therapy if depression has a winter pattern."
            ),
            "obsessive_tendency": (
                "recommended",
                "therapy",
                "THERAPY RECOMMENDATION — Obsessive Tendency: "
                "Exposure and Response Prevention (ERP) for compulsive patterns. "
                "ACT for values-based redirection of obsessive energy. "
                "The Pluto-Mercury or Scorpio-Mercury pattern that creates obsession "
                "also creates extraordinary depth of focus when channelled. "
                "The therapeutic goal: choose the obsession, don't be chosen by it."
            ),
            "scattered_tendency": (
                "recommended",
                "practice",
                "FOCUS PRACTICE — Scattered Tendency: "
                "Pomodoro technique (25-minute single-task focus intervals). "
                "Phone in another room during work — the proximity of the phone "
                "reduces cognitive capacity even when not in use. "
                "Weekly review to identify where the Mercury-air pattern diffused "
                "energy without completion. "
                "ADHD evaluation may be relevant if pattern is severe — Mercury-Uranus "
                "and Gemini emphasis are common in ADHD charts."
            ),
            "resilient": (
                "supportive",
                "practice",
                "RESILIENCE MAINTENANCE: Your chart carries strong mental resilience indicators. "
                "Maintain what works: regular physical exercise, social connection, and "
                "meaningful challenge. The Jupiter-Moon or Jupiter-Mercury contacts in your "
                "chart are a genuine psychological resource — consciously activate them by "
                "expanding your worldview through learning, travel, or philosophical study."
            ),
        }

        if mental_pattern in therapy_map:
            urgency, rtype, desc = therapy_map[mental_pattern]
            remedies.insert(0, MentalRemedy(
                mental_aspect=mental_pattern,
                remedy_type=rtype,
                description=desc,
                urgency=urgency,
            ))

    # Chart-specific mental remedies
    if positions and houses:
        # Saturn-Moon — depression structure
        sat_moon = _aspect("Saturn", "Moon", positions or {})
        if sat_moon in ("square", "opposition"):
            remedies.append(MentalRemedy(
                mental_aspect="depressive_tendency",
                remedy_type="lifestyle",
                description=("SATURN-MOON PATTERN REMEDY: "
                            "This aspect creates a structural tendency toward emotional restriction. "
                            "Primary remedy: morning sunlight exposure (10 minutes, eyes toward sky "
                            "but not directly at sun) before 9am. "
                            "This single practice recalibrates the Saturn-Moon cortisol-serotonin pattern "
                            "better than most supplements. "
                            "Secondary: one act of deliberate emotional expression daily — "
                            "laugh, cry, dance, or sing — to break the Saturn restriction cycle."),
                urgency="recommended",
            ))

        # Mercury-Neptune — brain fog
        merc_nep = _aspect("Mercury", "Neptune", positions or {})
        if merc_nep:
            remedies.append(MentalRemedy(
                mental_aspect="focus",
                remedy_type="lifestyle",
                description=("MERCURY-NEPTUNE CLARITY PRACTICES: "
                            "This aspect creates a naturally porous cognitive boundary — "
                            "genius-level imagination AND vulnerability to brain fog. "
                            "Clarity practices: "
                            "(1) Cold water face splash at the start of any cognitive task. "
                            "(2) Lion's Mane mushroom supplement for neural clarity. "
                            "(3) Eliminate alcohol and cannabis — these magnify the Neptune fog. "
                            "(4) Write first, think second — use writing to crystallise the "
                            "impressionistic Mercury-Neptune thought before it dissolves."),
                urgency="recommended",
            ))

        # 12th house Mercury — hidden anxiety
        merc_house = _house_of("Mercury", positions or {}, houses or {})
        if merc_house == 12:
            remedies.append(MentalRemedy(
                mental_aspect="anxiety_tendency",
                remedy_type="practice",
                description=("MERCURY 12TH HOUSE — HIDDEN THOUGHT PRACTICE: "
                            "Mercury in the 12th operates below conscious awareness — "
                            "thoughts and worries run in the background without surfacing. "
                            "Daily practice: 10-minute unfiltered stream-of-consciousness journalling "
                            "upon waking (before checking phone). "
                            "This externalises the subconscious Mercury process, making it "
                            "visible and therefore manageable. "
                            "What stays hidden in the 12th accumulates — what is written dissolves."),
                urgency="recommended",
            ))

    # Universal mental health remedies
    remedies.extend([
        MentalRemedy(
            mental_aspect="general",
            remedy_type="practice",
            description=("DAILY MENTAL HEALTH ANCHOR — THE TRIAD: "
                        "The three most evidence-based mental health practices: "
                        "(1) 30+ minutes of daily movement — the most effective antidepressant available. "
                        "(2) 7–9 hours of consistent sleep — the most effective anxiolytic available. "
                        "(3) One meaningful human connection daily — the most effective resilience builder. "
                        "All other mental health practices are supplements to this triad, not substitutes."),
            urgency="immediate",
        ),
        MentalRemedy(
            mental_aspect="shadow",
            remedy_type="practice",
            description=("SHADOW INTEGRATION PRACTICE: "
                        "Weekly: identify one quality in another person that triggered strong "
                        "emotional reaction (positive OR negative) this week. "
                        "Ask: 'In what way is this quality present in me, acknowledged or not?' "
                        "Journal for 5 minutes. "
                        "This Jungian shadow practice prevents the unconscious projection "
                        "that creates relationship friction and self-sabotage."),
            urgency="supportive",
        ),
    ])

    return remedies[:8]


# ---------------------------------------------------------------------------
# Priority Action Builder
# ---------------------------------------------------------------------------

def _prioritize_actions(
    bundle: "RemedyBundle",
    spirit_profile: Optional[Any],
    health_profile: Optional[Any],
    timing_data:    Optional[Dict],
    personal_year:  Optional[int],
) -> Tuple[List[str], List[str], List[str]]:
    """
    Build three-tier action plan from the full RemedyBundle.
    Returns (immediate_actions, short_term_plan, long_term_plan).
    """
    immediate: List[str] = []
    short_term: List[str] = []
    long_term:  List[str] = []

    # Immediate — high-severity health first
    high_health = [r for r in bundle.health if r.priority == "immediate"]
    for r in high_health[:2]:
        immediate.append(f"HEALTH: {r.description[:120].rstrip()}...")

    # Immediate — Saturn return if active
    if timing_data and timing_data.get("saturn_return_phase"):
        immediate.append(
            "ASTROLOGY: Saturn Return is active — begin Saturn propitiation "
            "this Saturday: fast, serve elders, wear dark blue, recite mantra 108 times."
        )

    # Immediate — critical spiritual if high attachments
    if spirit_profile:
        high_att = [a for a in getattr(spirit_profile, "spirit_attachments", [])
                   if getattr(a, "severity", None) and a.severity.value == "high"]
        if high_att:
            immediate.append(
                "SPIRITUAL: High-severity spirit attachment indicators — "
                "begin daily psychic hygiene practice and schedule formal ancestral "
                "clearing ceremony within the next 30 days."
            )

    # Immediate — mental health if immediate urgency
    for r in bundle.mental:
        if r.urgency == "immediate" and len(immediate) < 5:
            immediate.append(f"MENTAL: {r.description[:120].rstrip()}...")

    # Immediate — pay yourself first (always applicable)
    if len(immediate) < 5:
        immediate.append(
            "WEALTH: Automate 10% savings transfer from each paycheck "
            "before any expense — implement on your next payday."
        )

    # Immediate — morning routine anchor
    if len(immediate) < 5:
        immediate.append(
            "FOUNDATION: Establish the daily morning anchor — "
            "30-second psychic hygiene practice + mantra for your weakest planet + "
            "10 minutes of sunlight exposure. Non-negotiable before anything else."
        )

    # Short-term (3 months)
    short_term.extend([
        "ASTROLOGY (Month 1): Begin wearing planetary gemstone for weakest planet. "
        "Establish planetary day observance (mantra + color + activity weekly).",

        "NUMEROLOGY (Month 1): Begin Life Path activation practice daily. "
        "If karmic debt present — start the specific debt remediation practice.",

        "HEALTH (Months 1–3): Establish dosha-aligned diet and exercise baseline. "
        "Schedule annual blood panel if not done in the last 12 months.",

        "SPIRITUAL (Month 2): Perform the weekly ancestral acknowledgement practice "
        "every Thursday evening for 8 consecutive weeks.",

        "RELATIONSHIP (Month 2–3): Introduce the weekly relationship council. "
        "Have the love language conversation with primary partner.",

        "MENTAL (Month 1): Begin the primary mental health practice "
        f"({'therapy referral' if any(r.remedy_type=='therapy' for r in bundle.mental) else 'daily practice'}) "
        "from the mental remedies section.",
    ])

    if personal_year:
        pyg = _PERSONAL_YEAR_GUIDANCE.get(personal_year, {})
        if pyg:
            short_term.append(
                f"TIMING (This Personal Year {personal_year}): "
                f"Theme — '{pyg.get('theme','')}'. "
                f"Primary action: {pyg.get('wealth','')}."
            )

    # Long-term (1 year)
    long_term.extend([
        "SPIRITUAL DEEPENING: Complete at least one formal ancestral healing modality "
        "(family constellation, Pitru Dosh puja, or soul retrieval). "
        "Establish a daily meditation practice of 20+ minutes.",

        "ASTROLOGICAL INTEGRATION: Review planetary propitiation results at 6 months. "
        "Adjust gemstones and practices based on life changes observed. "
        "Note transits of Jupiter and Saturn for annual planning.",

        "HEALTH OPTIMISATION: At 3 months, review blood panel results and adjust "
        "supplementation protocol. At 6 months, evaluate dosha practice effectiveness "
        "with an Ayurvedic practitioner for a full consultation.",

        "WEALTH ARCHITECTURE: By month 6, have three financial structures in place: "
        "(1) Automated 10% savings. (2) Emergency fund (3 months expenses). "
        "(3) First investment vehicle aligned with your Jupiter channel.",

        "RELATIONSHIP DEPTH: Complete one significant relationship healing arc — "
        "either resolve a significant conflict, deepen intimacy through deliberate practice, "
        "or complete a clean closure with an unresolved connection.",

        "MENTAL INTEGRATION: At 12 months, evaluate the primary mental pattern. "
        "The question: has the pattern softened? Are there new choices available? "
        "If not, escalate the therapeutic support level.",

        "NUMEROLOGICAL YEAR REVIEW: As your personal year completes, review what "
        f"Personal Year {personal_year} initiated, required, and completed. "
        "Prepare consciously for the next personal year before it begins.",
    ])

    return immediate[:5], short_term[:7], long_term[:7]


# ---------------------------------------------------------------------------
# Signal Builder
# ---------------------------------------------------------------------------

def _build_remedy_signals(bundle: "RemedyBundle") -> List[Dict]:
    """Build collector.py-ready signals from the RemedyBundle."""
    signals: List[Dict] = []

    # Immediate actions as a summary signal
    signals.append({
        "feature": "remedy_immediate_actions",
        "domain":  "spiritual",
        "tone":    "positive",
        "strength": 0.90,
        "reading": "Immediate remedy actions: " + " | ".join(
            a[:80] for a in bundle.immediate_actions[:3]
        ),
        "keywords": ["remedies", "immediate_action", "healing"],
        "astro_affinity": [], "numerology_link": [],
        "chinese_element": None, "temporal_phase": "timeless",
        "retrograde": False, "house": None, "system": "both",
    })

    # Astrological remedy signal (top planet)
    if bundle.astrological:
        top_astro = bundle.astrological[0]
        signals.append({
            "feature": f"remedy_astro_{top_astro.planet.lower()}",
            "domain":  "spiritual",
            "tone":    "positive",
            "strength": 0.80,
            "reading": (f"Primary astrological remedy — {top_astro.planet} ({top_astro.issue}): "
                       f"{top_astro.description[:120]}"),
            "keywords": ["astrological_remedy", top_astro.planet.lower(), top_astro.remedy_type],
            "astro_affinity": [top_astro.planet], "numerology_link": [],
            "chinese_element": None, "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": top_astro.tradition,
        })

    # Numerological remedy signal
    if bundle.numerological:
        top_num = bundle.numerological[0]
        signals.append({
            "feature": f"remedy_numerology_{top_num.number}",
            "domain":  "character",
            "tone":    "positive",
            "strength": 0.75,
            "reading": top_num.description[:150],
            "keywords": ["numerological_remedy", str(top_num.number), top_num.aspect],
            "astro_affinity": [], "numerology_link": [top_num.number],
            "chinese_element": None, "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": "numerology",
        })

    # Wealth signal
    if bundle.wealth:
        top_w = bundle.wealth[0]
        signals.append({
            "feature": "remedy_wealth_primary",
            "domain":  "wealth",
            "tone":    "positive",
            "strength": 0.75,
            "reading": top_w.description[:150],
            "keywords": ["wealth_remedy", top_w.wealth_aspect, top_w.remedy_type],
            "astro_affinity": ["Jupiter","Venus"], "numerology_link": [],
            "chinese_element": "wood", "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": "both",
        })

    # Health signal
    immediate_health = [r for r in bundle.health if r.priority == "immediate"]
    if immediate_health:
        h = immediate_health[0]
        signals.append({
            "feature": f"remedy_health_{h.body_system}",
            "domain":  "health",
            "tone":    "neutral",
            "strength": 0.85,
            "reading": h.description[:150],
            "keywords": ["health_remedy", h.body_system, h.remedy_type],
            "astro_affinity": ["Saturn","Sun"], "numerology_link": [],
            "chinese_element": None, "temporal_phase": "timeless",
            "retrograde": False, "house": 6, "system": "both",
        })

    # Mental signal
    urgent_mental = [r for r in bundle.mental if r.urgency == "immediate"]
    if urgent_mental:
        m = urgent_mental[0]
        signals.append({
            "feature": f"remedy_mental_{m.mental_aspect}",
            "domain":  "health",
            "tone":    "challenging",
            "strength": 0.80,
            "reading": m.description[:150],
            "keywords": ["mental_remedy", m.mental_aspect, m.remedy_type],
            "astro_affinity": ["Mercury","Moon","Saturn"], "numerology_link": [],
            "chinese_element": "metal", "temporal_phase": "timeless",
            "retrograde": False, "house": None, "system": "both",
        })

    return signals


# ---------------------------------------------------------------------------
# Main Engine
# ---------------------------------------------------------------------------

class RemediesEngine:
    """
    Stateless, multi-source remedy orchestration engine.

    Takes outputs from all upstream engines and generates a unified,
    personalised RemedyBundle covering all seven life remedy categories.

    This engine synthesises — it does not recalculate what upstream
    engines have already produced. All raw signals come from:
        - astrology_engine  (positions, houses, timing)
        - spirit_engine     (spirit_profile)
        - health_engine     (health_profile)
        - synastry_engine   (synastry_profile, optional)
        - numerology data   (life_path, karmic_debts, personal_year, pinnacle)

    Usage:
        engine = RemediesEngine()
        bundle = engine.compute(
            positions=positions,
            houses=houses,
            life_path=5,
            karmic_debts=[16],
            personal_year=8,
            pinnacle=11,
            spirit_profile=spirit_profile,
            health_profile=health_profile,
        )
        print(bundle.immediate_actions)
        print(bundle.integration_note)
    """

    def compute(
        self,
        # Astrology data
        positions:        Dict,
        houses:           Dict,
        timing_data:      Optional[Dict]  = None,
        # Numerology
        life_path:        Optional[int]   = None,
        karmic_debts:     Optional[List[int]] = None,
        personal_year:    Optional[int]   = None,
        pinnacle:         Optional[int]   = None,
        # Upstream profiles
        spirit_profile:   Optional[Any]   = None,
        health_profile:   Optional[Any]   = None,
        synastry_profile: Optional[Any]   = None,
        # Options
        system:           str             = "western",
    ) -> RemedyBundle:
        """
        Compute the complete seven-category remedy bundle.

        Args:
            positions:      Natal planetary positions from astrology_engine
            houses:         Natal house cusps from astrology_engine
            timing_data:    Timing dict from compute_astrology() including
                            saturn_return_phase, progressions, etc.
            life_path:      Numerology Life Path number
            karmic_debts:   List of karmic debt numbers [13, 14, 16, 19]
            personal_year:  Current personal year (1–9)
            pinnacle:       Current pinnacle number (especially 11, 22, 33)
            spirit_profile: SpiritProfile from spirit_engine (optional)
            health_profile: HealthProfile from health_engine (optional)
            synastry_profile: SynastryProfile from synastry_engine (optional, for relationship remedies)
            system:         "western" or "vedic"

        Returns:
            RemedyBundle — complete remedy package with action plan.
        """
        import time
        t0 = time.monotonic()

        # ── Generate all seven categories ─────────────────────────────────
        astrological = _generate_astrological_remedies(
            positions, houses, timing_data
        )
        numerological = _generate_numerological_remedies(
            life_path, karmic_debts, personal_year, pinnacle
        )
        spiritual = _generate_spiritual_remedies(
            spirit_profile, positions, houses
        )
        health = _generate_health_remedies_synthesis(health_profile)
        relationship = _generate_relationship_remedies(
            life_path, synastry_profile, positions, houses
        )
        wealth = _generate_wealth_remedies(
            life_path, positions, houses, personal_year
        )
        mental = _generate_mental_remedies(health_profile, positions, houses)

        # ── Build preliminary bundle ───────────────────────────────────────
        bundle = RemedyBundle(
            spiritual=spiritual,
            astrological=astrological,
            numerological=numerological,
            health=health,
            relationship=relationship,
            wealth=wealth,
            mental=mental,
            immediate_actions=[],
            short_term_plan=[],
            long_term_plan=[],
            integration_note="",
            remedy_signals=[],
        )

        # ── Prioritise actions ─────────────────────────────────────────────
        bundle.immediate_actions, bundle.short_term_plan, bundle.long_term_plan =             _prioritize_actions(bundle, spirit_profile, health_profile, timing_data, personal_year)

        # ── Integration note ───────────────────────────────────────────────
        total_remedies = sum([
            len(spiritual), len(astrological), len(numerological),
            len(health), len(relationship), len(wealth), len(mental)
        ])
        high_health_count = sum(1 for r in health if r.priority == "immediate")
        urgent_mental = any(r.urgency == "immediate" for r in mental)

        bundle.integration_note = (
            f"This remedy bundle contains {total_remedies} specific interventions "
            f"across seven life domains. "
            f"{'Health requires immediate attention — prioritise the health remedies before all others. ' if high_health_count > 0 else ''}"
            f"{'Mental health carries immediate-urgency interventions — seek professional support alongside the practices listed. ' if urgent_mental else ''}"
            f"The seven categories work as a SYSTEM: "
            f"the spiritual practices clear the field; "
            f"the astrological remedies strengthen the planetary foundation; "
            f"the health practices build the physical vessel; "
            f"the mental practices create the cognitive clarity; "
            f"the wealth practices establish material security; "
            f"the relationship practices sustain human connection; "
            f"and the numerological practices align timing with cosmic cycles. "
            f"Begin with the five immediate actions. "
            f"Add one new practice every two weeks to avoid overwhelm. "
            f"Review progress monthly. Adjust annually."
        )

        # ── Build signals ──────────────────────────────────────────────────
        bundle.remedy_signals = _build_remedy_signals(bundle)

        ms = int((time.monotonic() - t0) * 1000)

        logger.info(
            "RemediesEngine.compute completed",
            extra={
                "spiritual":      len(spiritual),
                "astrological":   len(astrological),
                "numerological":  len(numerological),
                "health":         len(health),
                "relationship":   len(relationship),
                "wealth":         len(wealth),
                "mental":         len(mental),
                "total":          total_remedies,
                "immediate":      len(bundle.immediate_actions),
                "signals":        len(bundle.remedy_signals),
                "reading_ms":     ms,
            },
        )

        return bundle


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def compute_remedy_bundle(
    positions:        Dict,
    houses:           Dict,
    timing_data:      Optional[Dict]      = None,
    life_path:        Optional[int]       = None,
    karmic_debts:     Optional[List[int]] = None,
    personal_year:    Optional[int]       = None,
    pinnacle:         Optional[int]       = None,
    spirit_profile:   Optional[Any]       = None,
    health_profile:   Optional[Any]       = None,
    synastry_profile: Optional[Any]       = None,
    system:           str                 = "western",
) -> RemedyBundle:
    """
    Module-level convenience wrapper for RemediesEngine.compute().

    Example:
        from synthesis.remedies_engine import compute_remedy_bundle

        bundle = compute_remedy_bundle(
            positions=positions,
            houses=houses,
            timing_data=timing_dict,
            life_path=5,
            karmic_debts=[16],
            personal_year=8,
            pinnacle=11,
            spirit_profile=spirit_profile,
            health_profile=health_profile,
        )

        # Access the action plan
        for action in bundle.immediate_actions:
            print(action)

        # Access specific categories
        for remedy in bundle.astrological:
            print(f"{remedy.planet}: {remedy.remedy_type} — {remedy.timing}")

        # Collector integration
        signals = bundle.remedy_signals
    """
    return RemediesEngine().compute(
        positions=positions, houses=houses,
        timing_data=timing_data,
        life_path=life_path, karmic_debts=karmic_debts,
        personal_year=personal_year, pinnacle=pinnacle,
        spirit_profile=spirit_profile,
        health_profile=health_profile,
        synastry_profile=synastry_profile,
        system=system,
    )
