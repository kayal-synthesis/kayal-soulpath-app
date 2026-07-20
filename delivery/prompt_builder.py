"""
Prompt Builder — KAYAL Delivery Layer
=======================================
Converts a SynthesisPayload into a structured PromptPackage
ready for the LLM Narrator (llm_narrator.py).

Position in the pipeline:
    SynthesisPayload (from synthesis/logic/synthesiser.py)
             ↓
    prompt_builder.build_prompt_package()
             ↓
    PromptPackage
             ↓
    llm_narrator.py  →  LLM API  →  narrative sections
             ↓
    pdf_formatter.py  →  Blueprint PDF

Responsibility:
    Select, fill, and constrain prompt templates for every section
    in the Individual Blueprint ($297) and Union Blueprint ($397).

    Enforces mandatory output constraints in every prompt:
    HEALTH   — Non-diagnostic language only. "Structural indicator",
               "constitutional tendency", never "You have / will develop".
    COMPAT   — All compatibility as %. "74% love compatibility" — ALWAYS.
               "This couple is compatible" — NEVER.
    SPIRIT   — Epistemic humility. "Structural indicator", never fear-mongering.
    DEATH    — Structural tendency only. NEUTRAL tone. Never "will die first".
    INFIDEL  — Risk factors and stabilisers always presented together.
    TIMING   — Never predict specific events. "Pattern", "tendency", "indicator".

v3.0.0 — Em-dash removal:
    - Added "Never use em-dashes (—) or en-dashes (–)" to _KAYAL_BRAND_VOICE
    - Added same instruction to _GLOBAL_CONSTRAINTS
    - Updated all section system prompts with "Never use em-dashes (—)" instruction
    - This ensures the LLM is instructed at every level not to output em-dashes

Individual Blueprint (12 sections):
    character_overview, career_vocation, love_relationships,
    financial_life, health_constitution, spiritual_path,
    wealth_potential, life_timing, spirit_world,
    identity_purpose, legacy_mission, remedies_activation

Union Blueprint (22 sections, adds):
    union_overview, marriage_longevity, intimacy_compatibility,
    children_potential, career_synergy, wealth_compatibility,
    health_cross_impact, spiritual_compatibility, death_order,
    infidelity_profile, dominance_dynamics, parental_patterns,
    union_legacy, union_remedies,
    person_a_character, person_b_character

v2.0.0 — Narrative arc enhancement (publishing principles applied):
    Every section system prompt now follows Problem → Gap → Solution → Impact.
    Brand voice updated to mandate story-first framing, not content-list framing.
    System context updated to frame the blueprint as a coherent narrative journey.
    _build_individual_user_prompt() adds a NARRATIVE_ANCHOR line drawn from
    the primary signal to prime the model with the person's specific story before
    instructing it to write. Avoids the "technically correct but uncompelling" failure mode.

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Output dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SectionPrompt:
    """
    A single section prompt ready for the LLM narrator.

    The narrator calls the LLM once per SectionPrompt, collects the
    returned narrative, and assembles the full Blueprint document.
    """
    section_id:    str          # e.g. "character_overview"
    section_title: str          # Display title for the section
    domain:        str          # Primary domain this section covers
    system_prompt: str          # LLM system role + constraints
    user_prompt:   str          # Data-filled user message
    max_tokens:    int          # Suggested max output tokens
    temperature:   float        # Suggested temperature (0.0–1.0)
    required:      bool         # If True, section cannot be skipped
    is_pct_section:bool = False # True → narrator must output a % score
    pct_label:     Optional[str] = None  # e.g. "Love compatibility"


@dataclass
class PromptPackage:
    """
    Complete prompt package delivered to the LLM narrator.

    The narrator iterates self.sections in order, calls the LLM for each,
    and assembles the results into the final Blueprint document.
    """
    session_id:    str
    tool_type:     str           # "individual_blueprint" or "union_blueprint"
    person_name:   str           # First name of Person A
    partner_name:  Optional[str] # First name of Person B (Union Blueprint only)
    tier:          str           # Reading tier
    cultural_origin: str

    # Ordered list of section prompts
    sections:      List[SectionPrompt]

    # Global system context (prepended to every section call)
    system_context:str

    # Compatibility percentages (Union Blueprint only)
    compatibility_percentages: Optional[Dict[str, float]] = None
    pct_output_mode: bool = False   # True → all compat output must be %

    # Token budget estimate
    total_estimated_tokens: int = 0

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Section configuration — defines every section for both tools
# ---------------------------------------------------------------------------

# (section_id, title, primary_domain, max_tokens, temperature, required, is_pct, pct_label)
_INDIVIDUAL_SECTIONS = [
    ("character_overview",  "Your Character",                "character",    800, 0.80, True,  False, None),
    ("career_vocation",     "Career & Vocation",             "career",       700, 0.75, True,  False, None),
    ("love_relationships",  "Love & Relationships",          "love",         700, 0.80, True,  False, None),
    ("financial_life",      "Financial Life",                "finance",      600, 0.72, True,  False, None),
    ("health_constitution", "Health & Constitution",         "health",       650, 0.70, True,  False, None),
    ("spiritual_path",      "Spiritual Path",                "spiritual",    700, 0.82, True,  False, None),
    ("wealth_potential",    "Wealth Potential",              "wealth",       600, 0.72, True,  False, None),
    ("life_timing",         "Life Timing",                   "timing",       550, 0.72, True,  False, None),
    ("spirit_world",        "Spirit World & Ancestors",      "spirit_world", 650, 0.80, False, False, None),
    ("identity_purpose",    "Identity & Purpose",            "identity",     600, 0.78, True,  False, None),
    ("legacy_mission",      "Legacy & Mission",              "legacy",       550, 0.78, False, False, None),
    ("remedies_activation", "Remedies & Activation",         "character",    750, 0.70, True,  False, None),
]

_UNION_SECTIONS = [
    ("union_overview",         "Union Overview",               "love",               900, 0.82, True,  True,  "Overall compatibility"),
    ("person_a_character",     "{name_a} — Character",         "character",          600, 0.78, True,  False, None),
    ("person_b_character",     "{name_b} — Character",         "character",          600, 0.78, True,  False, None),
    ("marriage_longevity",     "Marriage Longevity",           "love",               750, 0.78, True,  True,  "Marriage longevity"),
    ("intimacy_compatibility", "Intimacy Compatibility",       "sexuality",          650, 0.78, True,  True,  "Intimacy compatibility"),
    ("children_potential",     "Children Potential",           "children_forecast",  650, 0.78, True,  True,  "Children potential"),
    ("career_synergy",         "Career Synergy",               "career",             600, 0.72, True,  True,  "Career synergy"),
    ("wealth_compatibility",   "Wealth Compatibility",         "wealth",             600, 0.72, True,  True,  "Wealth compatibility"),
    ("health_cross_impact",    "Health Cross-Impact",          "health",             600, 0.70, True,  True,  "Health cross-impact"),
    ("spiritual_compatibility","Spiritual Compatibility",      "spiritual",          650, 0.80, True,  True,  "Spiritual compatibility"),
    ("death_order",            "Longevity & Transition",       "death_transition",   500, 0.65, False, False, None),
    ("infidelity_profile",     "Fidelity Structure",           "love",               600, 0.72, False, False, None),
    ("dominance_dynamics",     "Relational Dynamics",          "character",          600, 0.75, True,  False, None),
    ("parental_patterns",      "Ancestral Inheritance",        "parents",            550, 0.75, False, False, None),
    ("union_legacy",           "Union Legacy",                 "legacy",             550, 0.78, True,  True,  "Legacy alignment"),
    ("union_remedies",         "Union Remedies",               "character",          750, 0.70, True,  False, None),
]


# ---------------------------------------------------------------------------
# KAYAL brand voice and global system context
# ---------------------------------------------------------------------------

_KAYAL_BRAND_VOICE = """
You are KAYAL — a multi-system metaphysical intelligence and wisdom guide.
Your voice is:
  • Warm, grounded, and deeply respectful of the human being you are addressing
  • Authoritative but never alarmist — every difficult pattern is framed as an invitation
  • Precise — you translate multi-system intelligence into the specific language of this person's lived experience
  • Compassionate — you hold both the gift and the growth edge without hierarchy
  • Free of clichés and generic self-help language
  • Present-tense and personal — you address the person directly as "you" or by name
  • Clean of all punctuation artifacts — you NEVER use em-dashes (—) or en-dashes (–)
    Use commas (,) or periods (.) instead. This is a strict requirement.

Writing style:
  • Paragraphs only — no bullet points, no numbered lists in the main narrative
  • Rich, flowing prose that a perceptive person would want to read twice
  • Each section stands alone as a complete piece of writing
  • Begin immediately with substance — no preambles or "I will now discuss..."
  • End with an insight or forward-leaning note — never with a summary
  • Never use em-dashes (—) in your writing. Use commas (,) or periods (.) instead.

Narrative arc — every section follows this structure:
  1. SIGNIFICANCE  — Open by establishing why this dimension of life matters,
                     and why most people never have accurate information about it.
                     This is the "desk rejection" test: if the reader doesn't
                     feel the importance in the first two sentences, they stop reading.
  2. GAP           — Name what has been missing from their self-understanding
                     in this domain. Not generic ("most people don't know themselves")
                     but specific to what the signals in their chart reveal about the
                     particular blind spot or unexplored pattern.
  3. REVELATION    — Deliver what this synthesis specifically shows about this person.
                     Be concrete. Name what this means for how they live, decide, love,
                     and work — not the number or system that produced it. The insight
                     they paid for is not the formula; it is what the formula reveals
                     about their specific life. Every sentence must feel written for
                     this person and no one else.
  4. IMPACT        — Land the real-world consequence. What changes in how they live,
                     decide, or relate because of what was just revealed?
                     End every section here — never with a summary or restatement.

The structure must be felt, not visible. The reader should experience a journey,
not recognise the formula. Weak writing lists content. Strong writing tells a story.
""".strip()

_GLOBAL_CONSTRAINTS = """
ABSOLUTE OUTPUT CONSTRAINTS (apply to every section without exception):
  1. HEALTH: Never diagnose, predict, or recommend medical treatment.
     Use only: "structural indicator", "constitutional tendency", "area requiring awareness".
     Always include: "This is not a medical diagnosis."
  2. TIMING: Never predict specific future events.
     Use: "structural pattern", "timing tendency", "indicator", "current window suggests".
  3. DEATH/TRANSITION: Always NEUTRAL tone. Never "will die first" or "shorter life".
     Use: "structural longevity comparison", "tendency indicator only", "not a prediction".
  4. SPIRIT WORLD: Epistemic humility always. "Structural spiritual indicator" not certainty.
  5. FINANCES/LEGAL: This is not financial or legal advice.
  6. METHODOLOGY — THE MOST IMPORTANT CONSTRAINT:
     Never expose the system, discipline, number, formula, or placement label in the output.
     The visitor must feel seen — not taught. The reading is revelation, not a report.

     NEVER WRITE IN OUTPUT:
       "Life Path 5", "Life Path number", "Personal Year 7", "Pinnacle 3",
       "Sun in Scorpio", "Moon in Gemini", "your Venus", "your Ascendant",
       "your chart", "your Destiny number", "your Soul Urge", "your Midheaven",
       "Saturn return", "Jupiter phase", "Vedic Dasha", "Rahu", "Ketu",
       "numerology shows", "astrology indicates", "your blueprint says",
       "the palm reading reveals", "facial structure analysis shows",
       "according to [any system]", any system name as a label.

     ALWAYS TRANSLATE — every system output becomes lived consequence:
       WRONG: "Your Life Path 5 indicates you need freedom and variety."
       RIGHT: "The fundamental pattern of your life is the tension between
               rootedness and the compulsion to keep moving — and the places
               this tension has cost you most are the places you were told to stay still."

       WRONG: "You are in a Personal Year 7 — a year of introspection."
       RIGHT: "The current chapter of your life is specifically asking for
               stillness, for inward focus, for the quiet that produces clarity."

       WRONG: "With your Scorpio Moon, you feel emotions intensely."
       RIGHT: "Your emotional experience runs deeper than what you show —
               what you feel privately is rarely what the people around you see."

       WRONG: "Your Destiny number 3 suggests creativity and communication."
       RIGHT: "You carry a particular quality of expression — a way of
               articulating things that others feel but cannot name."

  7. PUNCTUATION: NEVER use em-dashes (—) or en-dashes (–). Use commas (,) or periods (.) instead.

     The data driving this reading stays inside the engine.
     What reaches the visitor is only what it means for their life.
""".strip()


# ---------------------------------------------------------------------------
# Per-section system prompts
# ---------------------------------------------------------------------------

_SECTION_SYSTEM_PROMPTS: Dict[str, str] = {

    "character_overview": (
        "Write the Character Overview section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Open with the truth that most people spend their lives performing "
        "a character they were told to be — not the one they actually are. The cost of this "
        "misidentification is specific and measurable. Name it.\n"
        "  GAP: The gap is that personality frameworks and cultural conditioning have obscured "
        "this person's actual nature. What has been misread or suppressed in them specifically? "
        "Draw this from the primary signal and dominant elemental expression.\n"
        "  REVELATION: Deliver the precise character portrait — the archetype, the elemental "
        "quality, the dominant drive, and the tension the chart presents as the central growth "
        "edge. Every sentence must feel written for this person specifically.\n"
        "  IMPACT: End with what becomes possible when this person operates from their actual "
        "nature rather than their performed one. Name the specific change.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 4–6 paragraphs of rich, specific prose. No lists."
    ),
    "career_vocation": (
        "Write the Career & Vocation section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Most people chose their career from a list of available options, "
        "not from a map of their actual design. The result is competence without fulfilment — "
        "or worse, the persistent sense that they are in the wrong life. Open here.\n"
        "  GAP: What has this person been missing about their actual vocational design? "
        "Not what they do well, but what they are structurally built for. The gap is often "
        "between the role they occupy and the domain where their specific design carries most authority.\n"
        "  REVELATION: Name the precise vocational calling — industries, roles, or domains "
        "where their specific configuration excels. Address professional style, natural "
        "authority expression, and the timing of career development. Be specific.\n"
        "  IMPACT: What changes when they align work with design? What is the cost of "
        "continued misalignment? End with the forward-facing implication.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 4–5 paragraphs. No generic career advice."
    ),
    "love_relationships": (
        "Write the Love & Relationships section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: The patterns in a person's love life are not random — they are "
        "structural. The same dynamic repeating across different partners is the signature "
        "of a chart pattern, not bad luck. This is rarely understood before it costs years.\n"
        "  GAP: What has been invisible to this person about their own relational design? "
        "The specific emotional wiring, the love language they need but rarely ask for, "
        "the type of partner they are structurally drawn to and why. Name the blind spot.\n"
        "  REVELATION: Deliver the complete relational portrait — emotional nature, love "
        "language, the partner archetype the chart points toward, and the growth edge "
        "the relationship pattern carries. Address both the gift and the challenge.\n"
        "  IMPACT: What shifts when the pattern is named? What kind of relationship becomes "
        "available? End with what this person can now do with this information.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 4–5 paragraphs."
    ),
    "financial_life": (
        "Write the Financial Life section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Money follows design — but only when the design is understood. "
        "Most people manage money using strategies that belong to a different financial "
        "archetype than their own. The mismatch is structural, not motivational.\n"
        "  GAP: What has this person been missing about their actual relationship with money? "
        "The specific financial wiring their chart indicates — earner type, relationship to "
        "risk, the domain where income flows most naturally, and what resists it.\n"
        "  REVELATION: Deliver the financial portrait with precision. The wealth approach "
        "encoded in their numerology and chart. The specific financial growth edge. "
        "This is not financial advice — frame all insights as structural indicators.\n"
        "  IMPACT: What becomes available when the financial design is aligned? What pattern "
        "ends when the misalignment is corrected?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs. End with the mandatory note: "
        "'This is not financial advice. These are structural indicators only.'"
    ),
    "health_constitution": (
        "Write the Health & Constitution section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Generic health advice fails most people because it ignores "
        "constitutional design. What depletes one person restores another. The body "
        "has a specific architecture — and working against it quietly costs vitality.\n"
        "  GAP: What has this person been missing about their own constitutional design? "
        "The Ayurvedic type that governs their recovery needs, the primary vitality pattern, "
        "the up-to-2 structural areas where they carry most physical sensitivity.\n"
        "  REVELATION: Deliver the constitutional portrait. Type, vitality pattern, "
        "structural awareness areas, and the lifestyle approach most aligned with their design. "
        "MANDATORY HEALTH CONSTRAINTS: (a) Never diagnose or predict illness. "
        "(b) Every statement is a 'structural indicator' or 'constitutional tendency'. "
        "(c) Frame all insights as invitations for lifestyle alignment, not warnings.\n"
        "  IMPACT: What becomes available when lifestyle aligns with constitutional design?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs. End with the mandatory sentence: "
        "'This reading identifies structural indicators only and is not a substitute "
        "for qualified medical advice.'"
    ),
    "spiritual_path": (
        "Write the Spiritual Path section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Most people arrive at spiritual practice by accident — through "
        "crisis, inheritance, or proximity. The chart encodes a specific path. Following "
        "the wrong tradition costs years. The right one accelerates everything.\n"
        "  GAP: What has been unrecognised about this person's spiritual nature and gifts? "
        "The specific capacity they carry that has perhaps been dismissed as imagination, "
        "sensitivity, or coincidence. Name what they have not yet named about themselves.\n"
        "  REVELATION: Deliver the spiritual portrait — the tradition or practices most "
        "aligned with their chart, the specific gifts indicated, and the invitation their "
        "spiritual life extends. Write from a place of genuine reverence. Be specific.\n"
        "  IMPACT: What opens when the spiritual path aligns with design? "
        "What is the invitation this particular configuration extends?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 4–5 paragraphs. This is the most sacred section — honour it."
    ),
    "wealth_potential": (
        "Write the Wealth Potential section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Wealth is not equally accessible through every door. Each person "
        "has specific channels where abundance flows most naturally — and specific patterns "
        "where effort drains without return. Most people spend years working the wrong channel.\n"
        "  GAP: What specific wealth channel has this person not yet recognised or activated? "
        "What misalignment between their actions and their structural wealth design is "
        "creating unnecessary resistance?\n"
        "  REVELATION: Deliver the wealth portrait with precision. The structural patterns "
        "that define this person's relationship with money, the specific wealth archetype, "
        "and the actions most aligned with it. "
        "This is not financial advice. All indicators are structural tendencies.\n"
        "  IMPACT: What becomes available when action aligns with wealth design?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "life_timing": (
        "Write the Life Timing section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: The same action taken in the wrong season produces the wrong result. "
        "Understanding timing is not superstition — it is structural intelligence. Most people "
        "work against their own cycles without knowing it.\n"
        "  GAP: What has this person been missing about the quality of the current chapter "
        "of their life? What opportunity or completion is encoded in this window that "
        "goes unrecognised when the timing layer is invisible?\n"
        "  REVELATION: Cover the qualities, themes, and invitations of the current chapter "
        "of this person's life — what this period is specifically asking for, what it "
        "supports, and what it resists. Include the quality of the current cycle, any "
        "major structural transitions active now, and the overall character of this window. "
        "CONSTRAINT: Express all timing as the felt quality of the period, never as "
        "system labels or numbers. Not 'Personal Year 7' — 'the current chapter is asking "
        "for stillness and inward focus.' Not 'Saturn return' — 'a structural reckoning "
        "with the foundations of adult life.' The visitor should feel the period described, "
        "not be taught about the system that named it.\n"
        "  IMPACT: What becomes possible when this person moves with their current cycle "
        "rather than against it? What should they be doing right now?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "spirit_world": (
        "Write the Spirit World & Ancestors section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: The lineage a person is born into carries both gifts and wounds "
        "that operate below conscious awareness. What the ancestors did not resolve, the "
        "living carry. This is not mysticism — it is pattern recognition across generations.\n"
        "  GAP: What ancestral pattern or spiritual indicator has operated in this person's "
        "life without being named? The unconscious inheritance that keeps appearing as "
        "a recurring theme, a relationship pattern, or an unexplained sensitivity.\n"
        "  REVELATION: Cover the structural spirit world indicators — psychic openness, "
        "ancestral connections, past-life patterns, spiritual contracts, any active "
        "ancestral burden. CONSTRAINTS: (a) Every indicator is 'structural' — never "
        "state certainty. (b) Frame all patterns as invitations for healing, never threats. "
        "(c) End each challenging indicator with its corresponding remedy.\n"
        "  IMPACT: What healing becomes available when the ancestral pattern is seen "
        "and consciously addressed?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Approach with epistemic humility and genuine reverence. Write 4–5 paragraphs."
    ),
    "identity_purpose": (
        "Write the Identity & Purpose section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: The most expensive confusion a person can carry is not knowing "
        "what they are here for. Not in the abstract sense — but specifically: what direction "
        "is this particular life pointing? Most people answer this question too small.\n"
        "  GAP: What has been unclear or unseen about the direction this person's soul is "
        "actually moving? The gap between their current self-conception and what the soul "
        "direction indicators together point toward.\n"
        "  REVELATION: Synthesise all soul direction indicators into a single unified "
        "statement of this person's direction — not as a system label but as a lived "
        "orientation. What is the central question this life is asking them to answer? "
        "What is the specific quality of contribution they are moving toward?\n"
        "  IMPACT: What changes in daily decisions when this direction is clear?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "legacy_mission": (
        "Write the Legacy & Mission section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Every life builds something — whether consciously or by accident. "
        "The chart indicates what this person is specifically capable of building that "
        "outlasts them. Most people never ask this question until it is too late to answer it fully.\n"
        "  GAP: What has this person not yet understood about the scale or nature of "
        "what they are building? The specific legacy indicators in the chart that point "
        "toward a contribution larger than the immediate and personal.\n"
        "  REVELATION: Identify what this person is building that will outlast them — "
        "the specific domain of legacy, the quality of contribution the structural indicators "
        "point toward, and the pattern of impact this life is designed to leave. "
        "Name the specific domain of legacy without naming the systems that produced the reading.\n"
        "  IMPACT: What does this person need to begin, protect, or commit to now "
        "in order to arrive at that legacy?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs with a forward-facing, inspiring tone. "
        "This is the closing vision of the blueprint."
    ),
    "remedies_activation": (
        "Write the Remedies & Activation section of a KAYAL Individual Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: This section is the bridge between the map and the territory. "
        "Reading is not enough. The most important thing a person can do after receiving "
        "a complete picture of their design is to act — specifically, with intention, "
        "and in alignment with what has just been revealed.\n"
        "  GAP: Name the single most important shift this person needs to make based "
        "on everything the blueprint has surfaced. One sentence. Make it specific to them.\n"
        "  REVELATION: Present the 5 most important remedies from the remedy bundle as "
        "a practical protocol. Each remedy is a concrete instruction, not a vague suggestion. "
        "Name each remedy by what it does, not by which system produced it. "
        "(a) A practice for spiritual alignment — specific, named, daily. "
        "(b) A practice for identity or name energy — specific adjustment or timing alignment. "
        "(c) A practice for grounding and presence — specific, constitutional, suited to their type. "
        "(d) A practice for physical vitality — specific, aligned to their constitutional design. "
        "(e) A practice for wealth and material alignment — a specific action, not a mindset prescription. "
        "Do not label these by system name. Present each as a concrete practice with a clear purpose.\n"
        "  IMPACT: End with a single forward-facing sentence that closes the blueprint. "
        "Not a summary. A send-off. The last thing they read should land.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 1 paragraph per remedy (5 paragraphs), preceded by the gap statement "
        "and followed by the closing sentence."
    ),

    "union_overview": (
        "Write the Union Overview section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Express the overall compatibility as a percentage on the very first line: "
        "'[Name A] and [Name B] share [X]% overall compatibility.' "
        "Then provide one sentence per major domain with its % score. "
        "NEVER use 'compatible/not compatible', 'will/won't work', 'good/bad match'. ALWAYS use percentages.\n\n"
        "NARRATIVE ARC AFTER THE % SUMMARY:\n"
        "  SIGNIFICANCE: Two people meeting is not random — it is structural. "
        "The question is not whether this union is 'good' or 'bad' but what it is FOR. "
        "Every significant relationship has a soul-level purpose that the charts reveal.\n"
        "  GAP: What has been missing from this couple's self-understanding as a unit? "
        "Not what they already know about each other — but what the cross-chart synthesis "
        "reveals that neither person could see from their own chart alone.\n"
        "  REVELATION: Deliver the essential nature of this union — its dominant theme, "
        "the specific gift it carries, and the primary growth edge it presents. "
        "Be specific. Name what kind of union this is at a structural level.\n"
        "  IMPACT: What becomes available to both people when they understand the purpose "
        "of this specific union rather than measuring it against an ideal?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write the % summary first, then 3–4 narrative paragraphs."
    ),
    "person_a_character": (
        "Write the individual character summary for Person A in a KAYAL Union Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  PURPOSE: This is not a standalone reading — it is context for understanding "
        "the dynamic. Open with the single most important thing to understand about "
        "this person's character in order to understand how they show up in this specific union.\n"
        "  REVELATION: Deliver a compact, precise portrait — fundamental nature, relational "
        "style, what they bring to a partnership, and the specific pattern they carry "
        "into relationships.\n"
        "  IMPACT: End with what understanding this person's design unlocks about the dynamic.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 2–3 paragraphs. Every sentence serves the union reading."
    ),
    "person_b_character": (
        "Write the individual character summary for Person B in a KAYAL Union Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  PURPOSE: This is context for understanding the dynamic. Open with the single "
        "most important thing to understand about this person's character in order to "
        "understand how they show up in this specific union.\n"
        "  REVELATION: Deliver a compact, precise portrait — fundamental nature, relational "
        "style, what they bring to a partnership, and the specific pattern they carry "
        "into relationships.\n"
        "  IMPACT: End with what understanding this person's design unlocks about the dynamic.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 2–3 paragraphs. Every sentence serves the union reading."
    ),
    "marriage_longevity": (
        "Write the Marriage Longevity section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Marriage longevity score: [X]%' on the first line.\n"
        "Score interpretation: 75%+ = structurally strong foundation; "
        "60–74% = good foundation with growth edges; "
        "45–59% = moderate, requiring conscious investment; "
        "below 45% = structurally challenging, requiring significant work.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: Longevity in a union is not accidental — it is structural. "
        "The charts indicate whether two people's fundamental rhythms can sustain each other "
        "across decades, not just years.\n"
        "  GAP: What specific dynamic — if left unaddressed — would most erode this union "
        "over time? Name the structural tension that requires conscious management.\n"
        "  REVELATION: Cover the primary longevity indicators, the bonding aspects present, "
        "the tension aspects and how they serve the bond, and what sustains this union over decades.\n"
        "  IMPACT: What does this couple need to know and do in order to make their "
        "longevity score their floor, not their ceiling?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "intimacy_compatibility": (
        "Write the Intimacy Compatibility section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Intimacy compatibility: [X]%' on the first line.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: Physical and emotional intimacy are structurally encoded — "
        "the Venus-Mars cross-chart dynamic determines whether two people's bodies "
        "and hearts speak the same language.\n"
        "  GAP: Where specifically does the intimacy potential of this union remain "
        "unexpressed or misunderstood? What does each person need that the other "
        "doesn't naturally offer?\n"
        "  REVELATION: Cover Venus-Mars dynamics, physical chemistry indicators, "
        "desire compatibility, and how intimacy evolves over time in this union. "
        "Language must be mature but not explicit. Warm, honest, and grounded.\n"
        "  IMPACT: What conscious practice deepens the intimacy this union is capable of?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "children_potential": (
        "Write the Children Potential section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Children potential: [X]%' on the first line.\n"
        "CONSTRAINTS: (a) Never guarantee children or state they 'will/won't have children'. "
        "(b) Frame all indicators as structural tendencies and karmic invitations. "
        "(c) Acknowledge that children can be biological, adopted, or creative legacy.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: The question of children — in whatever form — is one of the most "
        "significant structural questions a union faces. The charts indicate the karmic "
        "agreements around parenthood and what kind of parents these two people are designed to be.\n"
        "  GAP: What remains unexamined about this dimension of the union?\n"
        "  REVELATION: Cover the structural fertility and children indicators, the karmic "
        "agreements around parenthood, and what kind of parents this couple would be.\n"
        "  IMPACT: What does understanding this dimension prepare them for?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "career_synergy": (
        "Write the Career Synergy section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Career synergy: [X]%' on the first line.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: Whether two people's professional energies amplify or drain "
        "each other is structural — and gets more consequential as a union matures.\n"
        "  GAP: Where specifically does professional friction or missed collaboration "
        "potential exist in this union?\n"
        "  REVELATION: Cover professional compatibility, whether joint ventures are "
        "supported, each person's career contribution to the partnership, and the domains "
        "of potential professional collaboration or healthy independence.\n"
        "  IMPACT: What professional boundary or collaboration does this couple need "
        "to establish in order to protect both the union and their individual work?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "wealth_compatibility": (
        "Write the Wealth Compatibility section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Wealth compatibility: [X]%' on the first line.\n"
        "This is not financial advice. All indicators are structural tendencies.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: Money is one of the most reliable stress-tests of a union. "
        "The financial value alignment — or misalignment — between two charts determines "
        "whether shared resources build or erode the relationship.\n"
        "  GAP: What financial misalignment or unexplored synergy exists in this union?\n"
        "  REVELATION: Cover financial value alignment, wealth-building synergy, "
        "whether joint or separate financial structures are indicated, and the Jupiter "
        "channel for this union's shared abundance.\n"
        "  IMPACT: What financial structure or agreement would most protect this union?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "health_cross_impact": (
        "Write the Health Cross-Impact section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Health cross-impact: [X]%' on the first line.\n"
        "MANDATORY HEALTH CONSTRAINTS: Never diagnose. Never predict illness. "
        "All statements are structural indicators only.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: Two people living closely together exchange energy at a constitutional "
        "level. Whether that exchange supports or drains vitality is structurally determined.\n"
        "  GAP: Where does this union create a vitality drain or vitality surplus that "
        "neither person has fully recognised?\n"
        "  REVELATION: Cover how the charts interact in the health domain, vitality drain "
        "or vitality support patterns, and the recommended health sovereignty practices "
        "for this couple.\n"
        "  IMPACT: What individual health practice does each person need to protect "
        "in order to sustain the union long-term?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs. End with: 'These are structural indicators, not medical guidance.'"
    ),
    "spiritual_compatibility": (
        "Write the Spiritual Compatibility section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Spiritual compatibility: [X]%' on the first line.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: The deepest unions share a spiritual orientation — not necessarily "
        "the same practice, but the same fundamental relationship with meaning and mystery.\n"
        "  GAP: Where does the spiritual dimension of this union remain undeveloped or unexplored?\n"
        "  REVELATION: Cover the spiritual resonance between the two charts, whether a shared "
        "spiritual practice is indicated, karmic/past-life connection indicators, and the "
        "spiritual growth this union provides for both people.\n"
        "  IMPACT: What shared spiritual practice or orientation would most deepen this union?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 4 paragraphs with genuine reverence."
    ),
    "death_order": (
        "Write the Longevity & Transition section of a KAYAL Union Blueprint.\n"
        "MANDATORY CONSTRAINTS:\n"
        "(a) ALWAYS NEUTRAL TONE — this section has no positive or negative valence.\n"
        "(b) NEVER state 'will die first', 'shorter life', or make predictions.\n"
        "(c) ALWAYS include this sentence: 'This reading presents structural tendencies only — "
        "not predictions. Lifestyle, environment, and conscious choices are far stronger "
        "determinants of longevity than any structural indicator.'\n"
        "(d) Frame the entire section around conscious preparation and mutual support.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Cover: the structural longevity comparison, what both charts indicate about "
        "their relationship with impermanence, and how to prepare for eventual separation "
        "with wisdom and grace.\n\n"
        "Write 2–3 paragraphs."
    ),
    "infidelity_profile": (
        "Write the Fidelity Structure section of a KAYAL Union Blueprint.\n"
        "MANDATORY CONSTRAINTS:\n"
        "(a) ALWAYS present risk factors AND stabilising indicators together — never one without the other.\n"
        "(b) NEVER state that a person 'will be unfaithful' or 'cannot be faithful'.\n"
        "(c) Frame risk factors as structural patterns requiring conscious management.\n"
        "(d) Frame stabilisers as structural resources already present in the bond.\n"
        "(e) End with concrete, practical agreements — not warnings or judgements.\n\n"
        "NARRATIVE ARC:\n"
        "  SIGNIFICANCE: Fidelity is not a fixed trait — it is a structural challenge that "
        "varies by chart configuration. Understanding the specific risk factors in this union "
        "is not pessimism — it is the intelligence that prevents preventable ruptures.\n"
        "  REVELATION: Present risk factors first, then stabilisers immediately after. "
        "The structural resources this bond carries must follow every risk factor named.\n"
        "  IMPACT: Close with 3 specific, practical agreements this couple can make now "
        "to activate the stabilising indicators and consciously manage the risk factors.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs with psychological sophistication and zero sensationalism."
    ),
    "dominance_dynamics": (
        "Write the Relational Dynamics section of a KAYAL Union Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Every union has a power structure — and the unions that last are "
        "the ones where that structure is understood and consciously designed, not inherited "
        "by default or contested unconsciously.\n"
        "  GAP: What remains unexamined or silently contested about the power dynamic "
        "in this specific union?\n"
        "  REVELATION: Cover the power dynamic, whether one person holds structural "
        "authority, how leadership rotates, and the practical implications for "
        "decision-making. Include specific domain-based authority suggestions "
        "(who leads in finance, social life, major decisions).\n"
        "  IMPACT: Frame dominance patterns without blame — they are structural, not "
        "character flaws. What agreement would bring this dynamic into conscious design?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs."
    ),
    "parental_patterns": (
        "Write the Ancestral Inheritance section of a KAYAL Union Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: Every person brings their family-of-origin into their relationship — "
        "not as memory, but as structural pattern. The unconscious templates from both "
        "lineages meet in the union and either heal or repeat.\n"
        "  GAP: Which parental templates are currently operating below awareness in this "
        "relationship, creating friction or pattern-repetition neither person designed?\n"
        "  REVELATION: Cover how each person's family-of-origin patterns interact in this "
        "relationship, which parental templates are activated, and the healing invitation "
        "this union provides for both ancestral lines.\n"
        "  IMPACT: What pattern ends in this generation if this couple does the work "
        "this union is specifically designed to offer?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs with psychological depth and genuine healing intention."
    ),
    "union_legacy": (
        "Write the Union Legacy section of a KAYAL Union Blueprint.\n\n"
        "THIS IS A % OUTPUT SECTION.\n"
        "MANDATORY: Begin with 'Legacy alignment: [X]%' on the first line.\n\n"
        "NARRATIVE ARC AFTER THE SCORE:\n"
        "  SIGNIFICANCE: The greatest unions build something that outlasts both people. "
        "Not all couples are designed to leave a legacy — but this one may be. "
        "The composite chart indicates what this union is specifically capable of creating "
        "beyond the personal.\n"
        "  GAP: What remains uninvested in — the larger purpose this union could serve "
        "that neither person has fully articulated?\n"
        "  REVELATION: Cover what this union builds together, the deepest structural indicator "
        "of this relationship's collective purpose, and the contribution this partnership "
        "makes beyond itself. Name the specific domain of legacy without naming the "
        "systems or placements that produced the reading.\n"
        "  IMPACT: What would this couple need to commit to in order to arrive at that legacy?\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write 3–4 paragraphs with a visionary, inspiring tone."
    ),
    "union_remedies": (
        "Write the Union Remedies section of a KAYAL Union Blueprint.\n\n"
        "NARRATIVE ARC FOR THIS SECTION:\n"
        "  SIGNIFICANCE: This section is the bridge between the map and the territory. "
        "Understanding the union is not enough. The most important thing this couple "
        "can do after receiving a complete picture is to act — with specific, conscious, "
        "aligned intention.\n"
        "  GAP: Name the single most important shift this couple needs to make based "
        "on everything the blueprint has surfaced. One sentence. Make it specific.\n"
        "  REVELATION: Present the 7-category union remedy protocol as a practical guide. "
        "Each category is a concrete instruction — not a vague suggestion.\n"
        "  (1) Spiritual — a shared practice aligned with both charts.\n"
        "  (2) Relational — specific communication practices for this dynamic.\n"
        "  (3) Fidelity — explicit agreements based on the fidelity structure revealed.\n"
        "  (4) Power balance — domain authority assignments from the relational dynamics.\n"
        "  (5) Career — professional boundaries or collaboration framework.\n"
        "  (6) Health — individual sovereignty practices for each person.\n"
        "  (7) Wealth — the financial structure most aligned with this union's design.\n"
        "  IMPACT: End with a single sentence that closes the Union Blueprint. "
        "Not a summary. A send-off for this specific couple.\n\n"
        "WRITING CONSTRAINTS:\n"
        "- Never use em-dashes (—). Use commas (,) or periods (.) instead.\n"
        "Write the gap statement first, then 1 paragraph per category (7 paragraphs), "
        "then the closing sentence."
    ),
}


# ---------------------------------------------------------------------------
# Tone vocabulary — how to describe each signal tone in narrator language
# ---------------------------------------------------------------------------

_TONE_LABELS: Dict[str, str] = {
    "strongly_positive":    "strongly positive",
    "positive":             "positive",
    "neutral":              "balanced",
    "challenging":          "growth-edge",
    "strongly_challenging": "significant growth-edge",
}


# ---------------------------------------------------------------------------
# Tier depth controls — how much data to include per tier
# ---------------------------------------------------------------------------

_TIER_DEPTH: Dict[str, Dict[str, Any]] = {
    "TIER_1": {"max_signals": 2, "include_temporal": False, "include_esoteric": False, "supporting_limit": 1},
    "TIER_2": {"max_signals": 3, "include_temporal": True,  "include_esoteric": False, "supporting_limit": 2},
    "TIER_3": {"max_signals": 4, "include_temporal": True,  "include_esoteric": True,  "supporting_limit": 3},
    "TIER_4": {"max_signals": 5, "include_temporal": True,  "include_esoteric": True,  "supporting_limit": 4},
}

_DEFAULT_DEPTH = {"max_signals": 3, "include_temporal": True, "include_esoteric": False, "supporting_limit": 2}


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------

def _get_domain_synthesis(synthesis: Any, domain_key: str) -> Optional[Any]:
    """Safely get a DomainSynthesis for a domain key."""
    if hasattr(synthesis, "domains") and isinstance(synthesis.domains, dict):
        return synthesis.domains.get(domain_key)
    return None


def _format_temporal_arc(temporal: Any, include: bool) -> str:
    """Format the temporal arc into prompt data string."""
    if not temporal or not include:
        return ""
    parts = []
    if getattr(temporal, "past", None):
        parts.append(f"PAST PATTERN: {temporal.past[:200]}")
    if getattr(temporal, "present", None):
        parts.append(f"PRESENT PATTERN: {temporal.present[:200]}")
    if getattr(temporal, "future", None):
        parts.append(f"FUTURE TENDENCY: {temporal.future[:200]}")
    return "\n".join(parts)


def _format_supporting(signals: Any, limit: int) -> str:
    """Format supporting signals into prompt data string."""
    if not signals:
        return ""
    lines = []
    for sig in (signals or [])[:limit]:
        system  = getattr(sig, "system", "")
        reading = getattr(sig, "reading", "")
        if reading:
            lines.append(f"[{system.upper()}] {reading[:180]}")
    return "\n".join(lines)


def _format_problem_solution(ds: Any) -> str:
    """Format problem and solution if present."""
    parts = []
    problem = getattr(ds, "problem", None)
    if problem and getattr(problem, "identified", False):
        desc = getattr(problem, "description", "")
        if desc:
            parts.append(f"GROWTH EDGE IDENTIFIED: {desc[:200]}")
    solution = getattr(ds, "solution", None)
    if solution and getattr(solution, "has_problem", False):
        remedy = getattr(solution, "primary_remedy", "")
        if remedy:
            parts.append(f"PRIMARY REMEDY: {remedy[:200]}")
    return "\n".join(parts)


def _pct_for_domain(
    compat_pcts: Optional[Dict[str, float]],
    domain_key:  str,
    pct_label:   Optional[str],
) -> str:
    """Return formatted % line for a compatibility domain."""
    if not compat_pcts or not pct_label:
        return ""
    pct = compat_pcts.get(domain_key, compat_pcts.get("overall", 50.0))
    return f"{pct_label}: {round(pct):.0f}%"


def _timing_data_str(timing: Any) -> str:
    """Extract key timing data for the life_timing section."""
    if not timing:
        return ""
    parts = []
    py = getattr(timing, "personal_year", 0)
    py_theme = getattr(timing, "personal_year_theme", "")
    if py:
        parts.append(f"Personal Year {py}: {py_theme}")
    saturn = getattr(timing, "saturn_return_phase", None)
    if saturn:
        parts.append(f"Saturn Return: {str(saturn)[:200]}")
    jupiter = getattr(timing, "jupiter_phase", "")
    if jupiter:
        parts.append(f"Jupiter Phase: {jupiter[:100]}")
    dasha = getattr(timing, "current_dasha", None)
    if dasha:
        theme = getattr(timing, "dasha_theme", "")
        parts.append(f"Vedic Dasha: {dasha} — {theme}")
    unified = getattr(timing, "unified_timing", "")
    if unified:
        parts.append(f"Unified Timing: {unified[:200]}")
    return "\n".join(parts)


def _remedies_data_str(synthesis: Any) -> str:
    """Extract remedy data for the remedies section."""
    # Attempt to pull from synthesis.domains["character"] problem/solution
    # and from any remedy_signals in the weighted map
    ds = _get_domain_synthesis(synthesis, "character")
    sol = getattr(ds, "solution", None) if ds else None
    parts = []
    if sol:
        for attr in ["spiritual_remedy","astrological_remedy","numerological_remedy",
                     "health_remedy","wealth_remedy"]:
            r = getattr(sol, attr, None)
            if r:
                desc = getattr(r, "description", str(r))
                parts.append(f"{attr.replace('_',' ').upper()}: {str(desc)[:200]}")
    if not parts:
        # Fallback: pull growth edges from multiple domains
        for dk in ["spiritual","career","health","wealth","character"]:
            ds2 = _get_domain_synthesis(synthesis, dk)
            if ds2:
                ge = getattr(ds2, "growth_edge", None)
                if ge:
                    parts.append(f"{dk.upper()} GROWTH EDGE: {str(ge)[:150]}")
    return "\n".join(parts[:5])


# ---------------------------------------------------------------------------
# User prompt builders — one per section type
# ---------------------------------------------------------------------------

def _build_individual_user_prompt(
    section_id:  str,
    domain_key:  str,
    synthesis:   Any,
    person_name: str,
    depth:       Dict,
) -> str:
    """Build the data-filled user prompt for an Individual Blueprint section."""
    ds = _get_domain_synthesis(synthesis, domain_key)
    tier = synthesis.tier.value if hasattr(getattr(synthesis,"tier",None),"value") else "TIER_2"

    lines = [f"Write the {section_id.replace('_',' ').title()} section for {person_name}."]

    if ds:
        # NARRATIVE_ANCHOR — prime the model with the specific story before the data
        # This is the equivalent of a strong abstract opening: establish significance
        # from the actual signals before instructing what to write.
        primary = getattr(ds, "primary_signal", "")
        tone    = getattr(ds, "tone", None)
        tone_label = _TONE_LABELS.get(tone.value if hasattr(tone,"value") else str(tone), "balanced")

        if primary:
            # The anchor is drawn from the synthesis signal, not invented
            lines.append(
                f"\nNARRATIVE_ANCHOR ({tone_label} signal — open from here, do not quote directly):\n"
                f"{str(primary)[:400]}"
            )

        # Tension / resolution
        tension    = getattr(ds, "tension", None)
        resolution = getattr(ds, "resolution", None)
        if tension:
            lines.append(f"\nTENSION:\n{str(tension)[:200]}")
        if resolution:
            lines.append(f"\nRESOLUTION:\n{str(resolution)[:200]}")

        # Supporting signals
        supporting_str = _format_supporting(
            getattr(ds, "supporting_signals", []), depth["supporting_limit"]
        )
        if supporting_str:
            lines.append(
                f"\nSUPPORTING SIGNALS (internal engine data — translate into lived consequence; "
                f"never reproduce system names, numbers, or labels in output):\n{supporting_str}"
            )

        # Temporal arc
        if depth["include_temporal"]:
            temporal_str = _format_temporal_arc(
                getattr(ds, "temporal", None), True
            )
            if temporal_str:
                lines.append(f"\nTEMPORAL ARC:\n{temporal_str}")

        # Growth edge / problem / solution
        ps_str = _format_problem_solution(ds)
        if ps_str:
            lines.append(f"\nGROWTH EDGE / REMEDY:\n{ps_str}")

        # Keywords
        kws = getattr(ds, "keywords", [])
        if kws:
            lines.append(f"\nKEYWORDS: {', '.join(kws[:8])}")

    # Special section data
    if section_id == "life_timing":
        timing_str = _timing_data_str(getattr(synthesis, "timing", None))
        if timing_str:
            lines.append(
                f"\nTIMING DATA (internal engine data — express as the felt quality of this "
                f"period; never reproduce system names, cycle labels, or numbers in output):\n{timing_str}"
            )

    if section_id == "remedies_activation":
        rem_str = _remedies_data_str(synthesis)
        if rem_str:
            lines.append(f"\nREMEDY DATA:\n{rem_str}")

    if section_id == "spirit_world":
        spirit_ds = _get_domain_synthesis(synthesis, "spirit_world")
        if spirit_ds:
            sp_primary = getattr(spirit_ds, "primary_signal", "")
            if sp_primary:
                lines.append(f"\nSPIRIT WORLD SIGNALS:\n{str(sp_primary)[:400]}")

    # Cultural context
    origin = getattr(getattr(synthesis, "cultural_profile", None), "origin", None)
    if origin:
        lines.append(f"\nCULTURAL CONTEXT: {origin.value if hasattr(origin,'value') else str(origin)}")

    return "\n".join(lines)


def _build_union_user_prompt(
    section_id:   str,
    domain_key:   str,
    synthesis:    Any,
    name_a:       str,
    name_b:       str,
    compat_pcts:  Optional[Dict[str, float]],
    depth:        Dict,
    pct_label:    Optional[str] = None,
) -> str:
    """Build the data-filled user prompt for a Union Blueprint section."""
    ds = _get_domain_synthesis(synthesis, domain_key)

    lines = [f"Write the {section_id.replace('_',' ').title()} section for {name_a} and {name_b}."]

    # % score line (mandatory for pct sections)
    if pct_label and compat_pcts:
        pct_str = _pct_for_domain(compat_pcts, domain_key, pct_label)
        if pct_str:
            lines.append(f"\nCOMPATIBILITY SCORE (must appear verbatim in output):\n{pct_str}")

    if ds:
        primary = getattr(ds, "primary_signal", "")
        tone    = getattr(ds, "tone", None)
        tone_label = _TONE_LABELS.get(tone.value if hasattr(tone,"value") else str(tone), "balanced")
        if primary:
            lines.append(f"\nPRIMARY SIGNAL ({tone_label}):\n{str(primary)[:500]}")

        resolution = getattr(ds, "resolution", None)
        if resolution:
            lines.append(f"\nSYNTHESIS NOTE:\n{str(resolution)[:200]}")

        supporting_str = _format_supporting(
            getattr(ds, "supporting_signals", []), depth["supporting_limit"]
        )
        if supporting_str:
            lines.append(
                f"\nSUPPORTING SIGNALS (internal engine data — translate into lived consequence; "
                f"never reproduce system names, numbers, or labels in output):\n{supporting_str}"
            )

        kws = getattr(ds, "keywords", [])
        if kws:
            lines.append(f"\nKEYWORDS: {', '.join(kws[:8])}")

    # Section-specific extras
    if section_id == "union_overview" and compat_pcts:
        # Provide all domain % scores for the narrator to summarise
        domain_pcts = {
            k: f"{round(v):.0f}%" for k, v in compat_pcts.items()
            if k != "overall" and isinstance(v, (int, float))
        }
        pcts_str = "\n".join(f"  {k.replace('_',' ').title()}: {v}" for k,v in domain_pcts.items())
        lines.append(f"\nALL DOMAIN % SCORES:\n{pcts_str}")

    if section_id == "death_order":
        lines.append(
            "MANDATORY: This section must be NEUTRAL in tone. "
            "End with the required disclaimer about structural tendencies vs. predictions."
        )

    if section_id == "infidelity_profile":
        # Pull risk factors and stabilisers separately for clarity
        lines.append(
            "MANDATORY: Present risk factors first, then stabilisers immediately after. "
            "End with practical agreement recommendations."
        )

    if section_id == "union_remedies":
        rem_str = _remedies_data_str(synthesis)
        if rem_str:
            lines.append(f"\nREMEDY DATA:\n{rem_str}")

    if section_id in ("person_a_character", "person_b_character"):
        person_name = name_a if section_id == "person_a_character" else name_b
        lines[0] = f"Write the character summary for {person_name} (as part of a Union Blueprint)."
        char_ds = _get_domain_synthesis(synthesis, "character")
        if char_ds:
            primary = getattr(char_ds, "primary_signal", "")
            if primary:
                lines.append(f"\nCHARACTER SIGNALS:\n{str(primary)[:400]}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Section system prompt builder
# ---------------------------------------------------------------------------

def _build_section_system_prompt(section_id: str, person_name: str, partner_name: Optional[str]) -> str:
    """Combine KAYAL brand voice + global constraints + section-specific prompt."""
    section_specific = _SECTION_SYSTEM_PROMPTS.get(
        section_id,
        f"Write the {section_id.replace('_',' ').title()} section of a KAYAL Blueprint. "
        "Never use em-dashes (—). Use commas (,) or periods (.) instead. Write 3–4 paragraphs."
    )
    # Replace name placeholders
    if person_name:
        section_specific = section_specific.replace("{person_name}", person_name)
    if partner_name:
        section_specific = section_specific.replace("{partner_name}", partner_name)

    return (
        f"{_KAYAL_BRAND_VOICE}\n\n"
        f"{_GLOBAL_CONSTRAINTS}\n\n"
        f"SECTION INSTRUCTION:\n{section_specific}"
    )


# ---------------------------------------------------------------------------
# Global system context builder
# ---------------------------------------------------------------------------

def _build_system_context(
    tool_type:       str,
    person_name:     str,
    partner_name:    Optional[str],
    cultural_origin: str,
    tier:            str,
    pct_output_mode: bool,
) -> str:
    """Build the global system context prepended to every narrator call."""
    tool_label = (
        "KAYAL Complete Union Blueprint" if tool_type == "union_blueprint"
        else "KAYAL Individual Life Blueprint"
    )
    context_lines = [
        f"You are generating the {tool_label}.",
        f"Primary subject: {person_name}.",
    ]
    if partner_name:
        context_lines.append(f"Partner: {partner_name}.")
    context_lines.extend([
        f"Cultural origin: {cultural_origin}.",
        f"Reading tier: {tier}.",
        "",
        "NARRATIVE COHERENCE DIRECTIVE:",
        "This blueprint is a single coherent story told across multiple sections.",
        "Each section must advance the reader's understanding — not repeat what came before.",
        "The opening sentence of every section must establish significance before",
        "revealing any specific data. A reader who encounters this section first",
        "must immediately understand why it matters to their life.",
        "Technically correct content that lacks a compelling story will be rejected.",
        "The test: would a perceptive person feel seen and understood by this section,",
        "or would they recognise generic metaphysical writing dressed in their name?",
        "",
        "METHODOLOGY CONCEALMENT DIRECTIVE (ABSOLUTE — no exceptions):",
        "Never name any system, discipline, number, or label in the output text.",
        "Life Path numbers, Personal Year numbers, Pinnacle numbers, Sun signs,",
        "Moon signs, house placements, Saturn returns, Vedic Dasha periods,",
        "palm line names, facial structure analysis labels — none of these appear",
        "in the output. They are internal engine data. The output is the translation.",
        "The visitor should feel that you know their life intimately — not that",
        "you ran a calculation and are reporting the result.",
        "Prophecy, not report. Revelation, not methodology.",
        "",
        "PUNCTUATION DIRECTIVE (ABSOLUTE — no exceptions):",
        "Never use em-dashes (—) or en-dashes (–) in any output text.",
        "Use commas (,) or periods (.) instead. This is a strict requirement.",
    ])

    if pct_output_mode:
        context_lines.extend([
            "",
            "% COMPATIBILITY OUTPUT DIRECTIVE (MANDATORY FOR THIS READING):",
            "ALL compatibility statements MUST be expressed as percentages.",
            "CORRECT: 'Love compatibility: 74%' — 'Overall compatibility: 71%'",
            "INCORRECT: 'This couple is compatible' — 'They are a good match' — 'not compatible'",
            "CORRECT: 'Children potential: 68%' — 'Marriage longevity: 79%'",
            "INCORRECT: 'Children are indicated' — 'This union will last' — 'they won't have children'",
            "Every % section must begin with its score on the first line.",
        ])

    return "\n".join(context_lines)


# ---------------------------------------------------------------------------
# Token budget calculator
# ---------------------------------------------------------------------------

def _estimate_tokens(sections: List[SectionPrompt]) -> int:
    """Rough token estimate: system_prompt chars/4 + user_prompt chars/4 + max_tokens."""
    total = 0
    for s in sections:
        total += len(s.system_prompt) // 4
        total += len(s.user_prompt) // 4
        total += s.max_tokens
    return total


# ---------------------------------------------------------------------------
# Main builder functions
# ---------------------------------------------------------------------------

def build_individual_prompt_package(
    synthesis:        Any,          # SynthesisPayload from synthesiser.py
    person_name:      str,
    tier:             str           = "TIER_2",
    cultural_origin:  str           = "western",
    session_id:       str           = "",
) -> PromptPackage:
    """
    Build a PromptPackage for the Individual Blueprint ($297).

    Args:
        synthesis:       SynthesisPayload from synthesise()
        person_name:     First name of the client
        tier:            Reading tier string (TIER_1 through TIER_4)
        cultural_origin: Cultural origin for context
        session_id:      Session identifier

    Returns:
        PromptPackage with 12 ordered SectionPrompts
    """
    depth = _TIER_DEPTH.get(tier, _DEFAULT_DEPTH)

    system_context = _build_system_context(
        tool_type       = "individual_blueprint",
        person_name     = person_name,
        partner_name    = None,
        cultural_origin = cultural_origin,
        tier            = tier,
        pct_output_mode = False,
    )

    sections: List[SectionPrompt] = []
    for sid, title, domain, max_tok, temp, required, is_pct, pct_lbl in _INDIVIDUAL_SECTIONS:
        system_p = _build_section_system_prompt(sid, person_name, None)
        user_p   = _build_individual_user_prompt(sid, domain, synthesis, person_name, depth)

        sections.append(SectionPrompt(
            section_id    = sid,
            section_title = title,
            domain        = domain,
            system_prompt = system_p,
            user_prompt   = user_p,
            max_tokens    = max_tok,
            temperature   = temp,
            required      = required,
            is_pct_section= is_pct,
            pct_label     = pct_lbl,
        ))

    pkg = PromptPackage(
        session_id              = session_id,
        tool_type               = "individual_blueprint",
        person_name             = person_name,
        partner_name            = None,
        tier                    = tier,
        cultural_origin         = cultural_origin,
        sections                = sections,
        system_context          = system_context,
        compatibility_percentages = None,
        pct_output_mode         = False,
        total_estimated_tokens  = _estimate_tokens(sections),
    )

    logger.info(
        "PromptBuilder.build_individual_prompt_package completed",
        extra={
            "session_id":      session_id,
            "person_name":     person_name,
            "sections":        len(sections),
            "tier":            tier,
            "estimated_tokens":pkg.total_estimated_tokens,
        },
    )
    return pkg


def build_union_prompt_package(
    synthesis:        Any,          # SynthesisPayload (includes compatibility_percentages)
    name_a:           str,
    name_b:           str,
    tier:             str           = "TIER_2",
    cultural_origin:  str           = "western",
    session_id:       str           = "",
    compat_pcts:      Optional[Dict[str, float]] = None,
) -> PromptPackage:
    """
    Build a PromptPackage for the Union Blueprint ($397).

    % output directive is automatically enforced:
    - pct_output_mode=True set on the package
    - Every % section prompt mandates the score on the first line
    - System context contains the explicit % directive for every call

    Args:
        synthesis:       SynthesisPayload from synthesise() (includes compat_percentages)
        name_a:          First name of Person A (primary client)
        name_b:          First name of Person B (partner)
        tier:            Reading tier
        cultural_origin: Cultural origin of Person A
        session_id:      Session identifier
        compat_pcts:     Compatibility percentages dict (from _build_compatibility_block)
                         If None, extracted from synthesis.compatibility_percentages

    Returns:
        PromptPackage with 22 ordered SectionPrompts
    """
    depth = _TIER_DEPTH.get(tier, _DEFAULT_DEPTH)

    # Extract compatibility percentages from synthesis if not passed directly
    if compat_pcts is None:
        compat_pcts = getattr(synthesis, "compatibility_percentages", None)

    system_context = _build_system_context(
        tool_type       = "union_blueprint",
        person_name     = name_a,
        partner_name    = name_b,
        cultural_origin = cultural_origin,
        tier            = tier,
        pct_output_mode = True,     # Always True for Union Blueprint
    )

    sections: List[SectionPrompt] = []
    for sid, title_tpl, domain, max_tok, temp, required, is_pct, pct_lbl in _UNION_SECTIONS:
        # Fill name placeholders in title
        title = title_tpl.replace("{name_a}", name_a).replace("{name_b}", name_b)

        system_p = _build_section_system_prompt(sid, name_a, name_b)
        user_p   = _build_union_user_prompt(
            sid, domain, synthesis, name_a, name_b,
            compat_pcts, depth, pct_lbl,
        )

        sections.append(SectionPrompt(
            section_id    = sid,
            section_title = title,
            domain        = domain,
            system_prompt = system_p,
            user_prompt   = user_p,
            max_tokens    = max_tok,
            temperature   = temp,
            required      = required,
            is_pct_section= is_pct,
            pct_label     = pct_lbl,
        ))

    pkg = PromptPackage(
        session_id              = session_id,
        tool_type               = "union_blueprint",
        person_name             = name_a,
        partner_name            = name_b,
        tier                    = tier,
        cultural_origin         = cultural_origin,
        sections                = sections,
        system_context          = system_context,
        compatibility_percentages = compat_pcts,
        pct_output_mode         = True,     # Always enforced for Union Blueprint
        total_estimated_tokens  = _estimate_tokens(sections),
    )

    logger.info(
        "PromptBuilder.build_union_prompt_package completed",
        extra={
            "session_id":        session_id,
            "name_a":            name_a,
            "name_b":            name_b,
            "sections":          len(sections),
            "tier":              tier,
            "overall_compat_pct":compat_pcts.get("overall") if compat_pcts else None,
            "pct_sections":      sum(1 for s in sections if s.is_pct_section),
            "estimated_tokens":  pkg.total_estimated_tokens,
        },
    )
    return pkg


# ---------------------------------------------------------------------------
# Unified entry point
# ---------------------------------------------------------------------------

def build_prompt_package(
    synthesis:    Any,
    tool_type:    str            = "individual_blueprint",
    person_name:  str            = "the client",
    partner_name: Optional[str]  = None,
    tier:         str            = "TIER_2",
    session_id:   str            = "",
    compat_pcts:  Optional[Dict[str, float]] = None,
) -> PromptPackage:
    """
    Unified entry point — dispatches to Individual or Union builder.

    Args:
        synthesis:    SynthesisPayload from synthesise()
        tool_type:    "individual_blueprint" or "union_blueprint"
        person_name:  First name of Person A
        partner_name: First name of Person B (required for Union Blueprint)
        tier:         Reading tier string
        session_id:   Session identifier
        compat_pcts:  Compatibility percentages (optional — extracted from synthesis if None)

    Returns:
        PromptPackage ready for llm_narrator.py
    """
    # Extract cultural origin from synthesis
    origin = getattr(getattr(synthesis, "cultural_profile", None), "origin", None)
    cultural_origin = origin.value if hasattr(origin, "value") else str(origin or "western")

    # Extract tier from synthesis if not passed
    if tier == "TIER_2":
        synth_tier = getattr(synthesis, "tier", None)
        if synth_tier:
            tier = synth_tier.value if hasattr(synth_tier, "value") else str(synth_tier)

    if tool_type == "union_blueprint":
        if not partner_name:
            logger.warning("Union Blueprint requested without partner_name — using 'Partner'")
            partner_name = "Partner"
        return build_union_prompt_package(
            synthesis       = synthesis,
            name_a          = person_name,
            name_b          = partner_name,
            tier            = tier,
            cultural_origin = cultural_origin,
            session_id      = session_id,
            compat_pcts     = compat_pcts,
        )

    return build_individual_prompt_package(
        synthesis       = synthesis,
        person_name     = person_name,
        tier            = tier,
        cultural_origin = cultural_origin,
        session_id      = session_id,
    )