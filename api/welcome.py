"""
Welcome API — KAYAL Synthesis Platform
========================================
POST /welcome

The most important endpoint in the entire platform.
This is the first thing a visitor sees after onboarding.
It must be deeply personal, accurate, and immediately compelling.

A visitor who reads their welcome message and thinks
"how does it know this about me?" will buy.
A visitor who reads generic text will leave.

What makes this welcome special:
    1. Real Life Path calculation (KAYAL formula)
    2. Real Sun sign from birth date (astrology)
    3. Real Personal Year vibration (KAYAL formula)
    4. Real Destiny number (Pythagorean)
    5. Real Soul Urge (inner motivation)
    6. Culturally calibrated language
    7. Claude Haiku narration — warm, specific, personal
    8. 5-7 insight paragraphs with icons for visual display

v3.0.0 — Narrative arc enforcement (publishing principles applied):
    - _call_haiku() system prompt: narrative arc directive added. The welcome
      reading is the abstract of the entire platform — the desk rejection test.
      Haiku now receives explicit instruction to open every paragraph with
      SIGNIFICANCE before any number or system name.
    - _build_welcome_prompt(): paragraph instructions rewritten from content
      lists to narrative arc framing (Significance → Gap → Revelation → Impact
      for each of the 6 paragraphs). Title guidance added: titles must name
      the insight or the experience, not the system ("Life Path 5: The Explorer"
      is weak; "Why Conventional Paths Always Felt Like Cages" is strong).
    - _validate_paragraph_strength(): new function that checks whether any
      paragraph content opens with a weak framing pattern (name + number,
      "Your Life Path...", "Your Sun sign..."). If the required paragraphs 1–4
      fail this check, the prompt is retried once with a stronger instruction.
    - _fallback_paragraphs(): all four content paragraphs rewritten to open
      with significance rather than method. The desk-rejection failure mode
      (name + number as the opening) is eliminated from the fallback path.
    - Version: 2.0.0 → 3.0.0

v2.0.0 additions:
    - _pinnacle_current(): Pinnacle calculation added
    - _personal_month(): added for completeness
    - _build_welcome_prompt(): current year dynamic, pinnacle data, partner_name
    - generate_welcome_reading(): partner_name: Optional[str] = None added
    - Version: 1.0.0 → 2.0.0

Input (from onboarding):
    name:           string
    dob:            string ("YYYY-MM-DD")
    birth_time:     string | null ("HH:MM")
    birth_location: string | null ("City, Country")
    session_id:     string
    partner_name:   string | null  (v2.0.0 — for Union Blueprint visitors)

Output (exactly what your WelcomeModal expects):
    {
        "life_path":  int,
        "age":        int,
        "paragraphs": [
            {
                "icon":    string,
                "title":   string,
                "content": string,
                "bg":      string,
                "border":  string,
                "iconBg":  string
            }
        ]
    }

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import os

import json
import logging
import re
from datetime import date, datetime
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# ANTHROPIC_ENDPOINT and MODEL
# ─────────────────────────────────────────────
_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
_API_VERSION        = "2023-06-01"
MODEL_HAIKU         = "claude-haiku-4-5-20251001"

# ─────────────────────────────────────────────
# Icon and colour mapping for WelcomeModal (v1.0.0, preserved)
# ─────────────────────────────────────────────

_PARAGRAPH_STYLES = [
    {"icon":"Star",     "bg":"bg-primary-50",   "border":"border-primary-100",   "iconBg":"bg-primary-100"},
    {"icon":"Heart",    "bg":"bg-rose-50",       "border":"border-rose-100",      "iconBg":"bg-rose-100"},
    {"icon":"Compass",  "bg":"bg-emerald-50",    "border":"border-emerald-100",   "iconBg":"bg-emerald-100"},
    {"icon":"Moon",     "bg":"bg-indigo-50",     "border":"border-indigo-100",    "iconBg":"bg-indigo-100"},
    {"icon":"Feather",  "bg":"bg-amber-50",      "border":"border-amber-100",     "iconBg":"bg-amber-100"},
    {"icon":"Infinity", "bg":"bg-purple-50",     "border":"border-purple-100",    "iconBg":"bg-purple-100"},
    {"icon":"Sparkles", "bg":"bg-secondary-50",  "border":"border-secondary-100", "iconBg":"bg-secondary-100"},
]


# ─────────────────────────────────────────────
# Numerology calculations (v1.0.0, preserved)
# ─────────────────────────────────────────────

def _reduce(n: int) -> int:
    if n in (11, 22, 33): return n
    while n > 9:
        n = sum(int(d) for d in str(n))
        if n in (11, 22, 33): return n
    return n

def _life_path(day: int, month: int, year: int) -> int:
    return _reduce(sum(int(d) for d in f"{day:02d}{month:02d}{year:04d}"))

def _personal_year(day: int, month: int, current_year: int) -> int:
    uy = _reduce(sum(int(d) for d in str(current_year)))
    return _reduce(day + month + uy)

# v2.0.0 — Personal month calculation
def _personal_month(personal_year: int, current_month: int) -> int:
    return _reduce(personal_year + current_month)

_PYTHAGOREAN = {
    'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9,
    'J':1,'K':2,'L':3,'M':4,'N':5,'O':6,'P':7,'Q':8,'R':9,
    'S':1,'T':2,'U':3,'V':4,'W':5,'X':6,'Y':7,'Z':8,
}
_VOWELS = set("AEIOU")

def _destiny(name: str) -> int:
    return _reduce(sum(_PYTHAGOREAN.get(c, 0) for c in name.upper() if c.isalpha()))

def _soul_urge(name: str) -> int:
    return _reduce(sum(_PYTHAGOREAN.get(c, 0) for c in name.upper() if c in _VOWELS))

def _calculate_age(dob_str: str) -> int:
    try:
        birth = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        age   = today.year - birth.year
        if (today.month, today.day) < (birth.month, birth.day): age -= 1
        return age
    except Exception:
        return 0

# v2.0.0 — Pinnacle calculation (aligned with tool_teaser.py + daily_card.py)
def _pinnacle_current(day: int, month: int, year: int, current_year: int) -> Dict:
    """Return current Pinnacle number and period string."""
    def comp_Y(y): return _reduce(sum(int(d) for d in str(y)))
    M  = _reduce(month)
    D  = _reduce(day)
    Y  = comp_Y(year)
    p1 = _reduce(M + D)
    p2 = _reduce(D + Y)
    p3 = _reduce(p1 + p2)
    p4 = _reduce(M + Y)
    lp = _life_path(day, month, year)
    first_end = 36 - lp
    age = current_year - year
    if   age <= first_end:         return {"number": p1, "period": f"ages 0–{first_end}"}
    elif age <= first_end + 9:     return {"number": p2, "period": f"ages {first_end+1}–{first_end+9}"}
    elif age <= first_end + 18:    return {"number": p3, "period": f"ages {first_end+10}–{first_end+18}"}
    else:                          return {"number": p4, "period": f"ages {first_end+19}+"}


# ─────────────────────────────────────────────
# Astrology (v1.0.0, preserved)
# ─────────────────────────────────────────────

_SUN_SIGNS = [
    (1,19,"Capricorn"),(2,18,"Aquarius"),(3,20,"Pisces"),
    (4,19,"Aries"),(5,20,"Taurus"),(6,20,"Gemini"),
    (7,22,"Cancer"),(8,22,"Leo"),(9,22,"Virgo"),
    (10,22,"Libra"),(11,21,"Scorpio"),(12,21,"Sagittarius"),
    (12,31,"Capricorn"),
]
_SIGN_ELEMENT = {
    "Aries":"Fire","Leo":"Fire","Sagittarius":"Fire",
    "Taurus":"Earth","Virgo":"Earth","Capricorn":"Earth",
    "Gemini":"Air","Libra":"Air","Aquarius":"Air",
    "Cancer":"Water","Scorpio":"Water","Pisces":"Water",
}
_SIGN_QUALITY = {
    "Aries":"Cardinal","Cancer":"Cardinal","Libra":"Cardinal","Capricorn":"Cardinal",
    "Taurus":"Fixed","Leo":"Fixed","Scorpio":"Fixed","Aquarius":"Fixed",
    "Gemini":"Mutable","Virgo":"Mutable","Sagittarius":"Mutable","Pisces":"Mutable",
}
_SIGN_RULER = {
    "Aries":"Mars","Taurus":"Venus","Gemini":"Mercury","Cancer":"Moon",
    "Leo":"Sun","Virgo":"Mercury","Libra":"Venus","Scorpio":"Pluto",
    "Sagittarius":"Jupiter","Capricorn":"Saturn","Aquarius":"Uranus","Pisces":"Neptune",
}

def _sun_sign(day: int, month: int) -> str:
    for cm, cd, sign in _SUN_SIGNS:
        if month < cm or (month == cm and day <= cd): return sign
    return "Capricorn"


# ─────────────────────────────────────────────
# Life Path and personal year themes (v1.0.0, preserved)
# ─────────────────────────────────────────────

_LP_THEMES = {
    1:  ("The Pioneer",          "independence, leadership, and the courage to begin"),
    2:  ("The Peacemaker",       "deep empathy, partnership, and the power of patience"),
    3:  ("The Creative Voice",   "self-expression, joy, and the gift of inspired communication"),
    4:  ("The Builder",          "disciplined creation, lasting foundations, and honest work"),
    5:  ("The Explorer",         "freedom, change, and the wisdom found through experience"),
    6:  ("The Nurturer",         "love, responsibility, and the deep calling to serve and heal"),
    7:  ("The Seeker",           "wisdom, solitude, and the pursuit of deeper truth"),
    8:  ("The Manifestor",       "authority, material mastery, and power used in service"),
    9:  ("The Humanitarian",     "universal compassion, completion, and legacy"),
    11: ("The Intuitive Master", "spiritual illumination, inspired vision, and heightened sensitivity"),
    22: ("The Master Builder",   "grand vision made physical and lasting service to humanity"),
    33: ("The Master Teacher",   "unconditional love expressed as wisdom and sacred service"),
}
_PY_THEMES = {
    1:"new beginnings and bold initiation",2:"cooperation, patience, and deepening relationships",
    3:"creative expression and joyful expansion",4:"disciplined building and foundation work",
    5:"freedom, change, and unexpected opportunity",6:"love, family, and meaningful responsibility",
    7:"reflection, solitude, and inner development",8:"achievement, authority, and material harvest",
    9:"completion, release, and the close of a cycle",11:"spiritual awakening and heightened awareness",
    22:"master builder year — grand work becomes possible",33:"master teacher year — love as service",
}
_DESTINY_THEMES = {
    1:"to lead and pioneer",2:"to cooperate and harmonise",3:"to create and express",
    4:"to build lasting foundations",5:"to explore and inspire freedom",6:"to love and heal",
    7:"to seek and share wisdom",8:"to master and empower",9:"to serve humanity",
    11:"to inspire spiritual awakening",22:"to build for generations",
    33:"to teach through unconditional love",
}

# v2.0.0 — Pinnacle themes (brief, for prompt enrichment)
_PINNACLE_THEMES = {
    1:"beginnings, independence, and identity formation",
    2:"relationships, cooperation, and emotional depth",
    3:"creativity, communication, and social expansion",
    4:"discipline, hard work, and structural building",
    5:"freedom, adventure, and transformative change",
    6:"love, family responsibility, and community service",
    7:"introspection, spiritual development, and wisdom",
    8:"achievement, authority, and material manifestation",
    9:"completion, humanitarian purpose, and release",
    11:"spiritual sensitivity, inspiration, and illumination",
    22:"master building — turning vision into lasting reality",
    33:"compassionate mastery and teaching through love",
}


# ─────────────────────────────────────────────
# Cultural calibration (v1.0.0, preserved intact)
# ─────────────────────────────────────────────

def _cultural_note(birth_location: Optional[str]) -> str:
    if not birth_location:
        return "Use universally accessible language."
    loc = birth_location.lower()
    if any(w in loc for w in ["nigeria","ghana","kenya","ethiopia","south africa",
                               "cameroon","senegal","uganda","tanzania","ivory coast"]):
        return ("The person comes from an African cultural background. "
                "Honour themes of community, ancestry, and collective destiny. "
                "Language can reference the idea that one's path is written in the stars "
                "and known by one's ancestors.")
    if any(w in loc for w in ["india","pakistan","bangladesh","sri lanka","nepal"]):
        return ("South Asian background. Karma, dharma, and soul mission resonate deeply. "
                "Reference to the soul's journey across lifetimes is culturally natural. "
                "Avoid overly Western psychological framing.")
    if any(w in loc for w in ["malaysia","singapore","indonesia","philippines",
                               "thailand","vietnam","myanmar"]):
        return ("Southeast Asian background — blend of Chinese, Indian, and indigenous traditions. "
                "Themes of fate, balance, and merit resonate. "
                "Use inclusive language that honours multicultural heritage.")
    if any(w in loc for w in ["saudi","uae","qatar","kuwait","bahrain",
                               "oman","egypt","morocco","jordan","iraq"]):
        return ("Middle Eastern background. "
                "The idea of a destined path and divine will resonate deeply. "
                "Frame insights as what was written, what the soul came to fulfil. "
                "Avoid overly secular framing.")
    if any(w in loc for w in ["china","taiwan","hong kong","japan","korea"]):
        return ("East Asian background. "
                "Balance, elemental harmony, and cyclical time are culturally resonant. "
                "The idea of a destined role within family and society matters.")
    if any(w in loc for w in ["brazil","mexico","colombia","argentina",
                               "peru","venezuela","chile"]):
        return ("Latin American background. "
                "Passion, family, spirituality, and destiny are central themes. "
                "Warm, expressive, emotionally resonant language works well.")
    return "Use universally accessible, warm, and direct language."


# ─────────────────────────────────────────────
# Prompt builder
# v2.0.0: current_year dynamic, pinnacle data added, partner_name param
# ─────────────────────────────────────────────

def _build_welcome_prompt(
    first_name:     str,
    life_path:      int,
    destiny:        int,
    soul_urge:      int,
    sun_sign:       str,
    personal_year:  int,
    personal_month: int,
    pinnacle:       Dict,           # v2.0.0
    age:            int,
    current_year:   int,            # v2.0.0 — dynamic year
    birth_location: Optional[str],
    has_birth_time: bool,
    partner_name:   Optional[str],  # v2.0.0 — Union Blueprint visitor
) -> str:
    lp_title, lp_theme = _LP_THEMES.get(life_path,   ("The Seeker",    "self-discovery"))
    destiny_theme       = _DESTINY_THEMES.get(destiny, "to grow and evolve")
    py_theme            = _PY_THEMES.get(personal_year, "meaningful development")
    sign_element        = _SIGN_ELEMENT.get(sun_sign, "Earth")
    sign_quality        = _SIGN_QUALITY.get(sun_sign, "Fixed")
    sign_ruler          = _SIGN_RULER.get(sun_sign, "Saturn")
    cultural_note       = _cultural_note(birth_location)
    master_note         = " (a Master Number — carrying elevated spiritual responsibility)" if life_path in (11, 22, 33) else ""

    # v2.0.0 — Pinnacle context
    pinnacle_num    = pinnacle.get("number", 0)
    pinnacle_period = pinnacle.get("period", "")
    pinnacle_theme  = _PINNACLE_THEMES.get(pinnacle_num, "personal growth and development")

    # v2.0.0 — 6th paragraph instruction shifts for Union Blueprint visitors
    if partner_name:
        partner_first = partner_name.strip().split()[0]
        sixth_para_instruction = (
            f"6. Union invitation — {first_name} is exploring a relationship reading with {partner_first}. "
            f"Frame the 6th paragraph as an invitation to discover what their charts show together: "
            f"compatibility, timing, and what this connection is for at a deeper level. "
            f"Make it feel like the most important reading they could do right now."
        )
    else:
        sixth_para_instruction = (
            f"6. What awaits — a forward-looking invitation to explore what KAYAL can reveal further. "
            f"Create gentle curiosity. Hint at what remains unseen — palmistry, physiognomy, "
            f"the full chart — without listing features."
        )

    return f"""You are writing a deeply personal welcome reading for {first_name}, age {age}.

This is the first thing they will see on KAYAL — a holistic life insight platform.
Your words must feel like they were written specifically for this person.
If they read this and think "how does it know this about me?" — you have succeeded.
If it feels generic — you have failed.

INTERNAL DATA — translate into lived consequence; never output labels or numbers:
  Core pattern:     Life Path {life_path}{master_note} — The {lp_title} — theme of {lp_theme}
  Elemental nature: {sun_sign} ({sign_element} sign, {sign_quality} quality, ruled by {sign_ruler})
  Life direction:   Destiny {destiny} — {destiny_theme}
  Hidden drive:     Soul Urge {soul_urge}
  Current chapter:  Personal Year {personal_year} — a season of {py_theme}
  This month:       Personal Month {personal_month}
  Life arc now:     Pinnacle {pinnacle_num} ({pinnacle_period}) — {pinnacle_theme}
  Birth location:   {birth_location or "unknown"}

CRITICAL TRANSLATION RULE — this is the most important instruction:
  Never output a system label or number in the reading. Translate every data point
  into the lived experience it describes.
  WRONG: "Your Life Path 5 indicates you need freedom."
  RIGHT: "The pattern at the centre of your life has always been the tension between
          needing to move and being told to stay."
  WRONG: "In a Personal Year 7, this is a time of reflection."
  RIGHT: "The current chapter of your life is specifically asking for stillness —
          the kind that produces clarity before anything else can grow."
  WRONG: "As a Scorpio, you feel emotions intensely."
  RIGHT: "What you feel privately runs much deeper than what you show — and the gap
          between those two realities is something you have navigated your entire life."
  The visitor should feel seen — not taught. Every sentence translates engine data
  into something they recognise from their own experience.

CULTURAL CONTEXT: {cultural_note}
BIRTH TIME: {"Provided — chart has good precision" if has_birth_time else "Not provided — working from solar energy"}

YOUR TASK:
Write exactly 6 insight paragraphs as a JSON array.
Each paragraph has: title (5-8 words), content (60-90 words, 2-3 sentences).

TITLE RULES — this is critical:
  WEAK title: "Life Path {life_path}: {lp_title}" — names the system, not the insight
  STRONG title: Names the experience, the pattern, or the consequence
  Examples of strong titles:
    "Why Conventional Paths Always Felt Like Cages"
    "The Tension Between Wanting and Needing"
    "What the World Keeps Asking You to Build"
    "The Drive That Others Mistake for Intensity"
  Every title should make {first_name} think: "that's me" — not "that's my number"

NARRATIVE ARC — every paragraph must follow this structure:
  SIGNIFICANCE first: Open with WHY this dimension of life matters — the cost of
    not understanding it, the pattern it creates when invisible. Do NOT open with
    "{first_name}, your Life Path is..." or "Your Sun in {sun_sign}..." — these are
    weak openings that name the system before the insight.
  GAP second: Name what has been missing from their self-understanding specifically.
  REVELATION third: Deliver what this means for how they live, decide, and relate.
    Name the lived experience — not the number or system label that produced it.
  The content should feel like the reader already knew this — they just hadn't named it.

THE 6 PARAGRAPHS IN ORDER:

  1. CHARACTER — core pattern (Life Path {life_path}, {lp_title}):
     SIGNIFICANCE: Open with the cost of performing a character that doesn't fit —
     the exhaustion of being who others needed rather than who you are.
     GAP: What this person has never had named precisely about their fundamental nature.
     REVELATION: Translate the core pattern into what it actually means for how {first_name}
     moves through the world — the drive, the gift, and the tension at the centre of their life.
     Do not say "Life Path {life_path}". Say what it means.

  2. ELEMENTAL NATURE — {sun_sign} ({sign_element}):
     SIGNIFICANCE: Open with something most people born with this elemental quality
     experience but rarely have language for — a recurring pattern in how they move.
     GAP: What the {sign_element} quality creates that they have felt but not understood.
     REVELATION: What this specific elemental signature means for how {first_name}
     thinks, loves, and what they cannot ignore for long. No sign names needed —
     translate the quality into lived experience.

  3. LIFE DIRECTION — direction of contribution (Destiny {destiny}):
     SIGNIFICANCE: Open with the gap between what people do for a living and what
     they were actually built to contribute. Most people never close this gap.
     GAP: The specific misalignment between {first_name}'s current path and what they
     were designed to give — or what remains unexplored in the direction they are moving.
     REVELATION: What their life direction actually calls them toward. Name the domain,
     name the contribution. Do not say "Destiny {destiny}".

  4. HIDDEN DRIVER — inner motivation (Soul Urge {soul_urge}):
     SIGNIFICANCE: Open with the observation that most people optimise for the wrong
     thing — not because they're misguided, but because the real driver is invisible.
     GAP: What {first_name} has been reaching for beneath the surface that has never
     been accurately named — the need that shapes every major decision.
     REVELATION: Name what they need but rarely ask for aloud. What the hidden drive
     actually is. Do not say "Soul Urge {soul_urge}".

  5. THIS WINDOW — current chapter (Personal Year {personal_year} + Pinnacle {pinnacle_num}):
     SIGNIFICANCE: Open with the truth that the same action in the wrong season
     produces the wrong result. Most people don't know what season they're in.
     GAP: What {first_name} may be missing about the specific quality of this moment
     — what this chapter of their life is designed to build or complete.
     REVELATION: Translate the current convergence of cycles into the felt quality of
     this period — what it is asking for, what it supports, what it resists.
     Do not say "Personal Year {personal_year}" or "Pinnacle {pinnacle_num}".
     Say what this season actually feels like and what to do with it.

  {sixth_para_instruction}

ABSOLUTE RULES:
  - Never open any paragraph with "{first_name}," followed immediately by a number or system name
  - Never output: "Life Path", "Personal Year", "Soul Urge", "Destiny number",
    "Pinnacle", "Sun sign", "Sun in", any sign name followed by "in", any number as a label
  - Never mention "KAYAL", "the platform", or "this reading" — speak to the person
  - Mention {first_name}'s name naturally (not as a paragraph opener) at least twice
  - Every sentence must add something new — no padding, no repetition
  - Speak as if you already know them. Not as a system explaining itself.

Respond with ONLY a valid JSON array. No preamble. No explanation. No markdown.
Format:
[
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}}
]"""


# ─────────────────────────────────────────────
# Fallback paragraphs (v1.0.0, preserved with pinnacle enrichment)
# ─────────────────────────────────────────────

def _fallback_paragraphs(
    first_name:    str,
    life_path:     int,
    sun_sign:      str,
    personal_year: int,
    pinnacle:      Dict,
    age:           int,
    current_year:  int,
    partner_name:  Optional[str],
) -> List[Dict]:
    """
    Fallback paragraphs used when the Haiku API call fails or returns unparseable output.

    v3.0.0: All content paragraphs rewritten to open with SIGNIFICANCE before
    any name or number. The previous version opened with "{first_name}, your
    Life Path {lp}..." — exactly the weak framing pattern _validate_paragraph_strength()
    is designed to catch and retry. These are now clean.
    """
    lp_title, lp_theme = _LP_THEMES.get(life_path, ("The Seeker", "self-discovery"))
    py_theme     = _PY_THEMES.get(personal_year, "meaningful development")
    pinnacle_n   = pinnacle.get("number", 0)
    pinnacle_per = pinnacle.get("period", "")
    sign_element = _SIGN_ELEMENT.get(sun_sign, "Earth")

    # 6th paragraph: union-aware or solo
    if partner_name:
        partner_first = partner_name.strip().split()[0].title()
        p6 = {
            "title":   f"What Two Charts Reveal Together",
            "content": (
                f"The most significant patterns in a relationship are invisible from inside it. "
                f"What {first_name} and {partner_first}'s charts show together — the soul-level "
                f"purpose of this connection, its timing, and what each person is here to give "
                f"and receive — is something neither chart reveals alone. "
                f"That reading is available, and it is worth doing."
            ),
        }
    else:
        p6 = {
            "title":   "The Map Goes Much Deeper",
            "content": (
                f"What has been revealed here is the surface. The patterns in your face, "
                f"your palm lines, your full chart — each system adds a layer of specificity "
                f"that numbers alone cannot reach. Every domain of life has a blueprint: "
                f"love, work, health, wealth, spiritual path. "
                f"The deeper reading is waiting, {first_name}."
            ),
        }

    return [
        {
            # Para 1: CHARACTER — opens with the cost of performing the wrong character
            "title":   f"The Character You Were Always Meant to Be",
            "content": (
                f"Most people spend years performing a version of themselves built for "
                f"someone else's approval — not the character their actual nature was designed for. "
                f"The {lp_title} — a life built around {lp_theme} — is the character at the "
                f"centre of {first_name}'s story. "
                f"Everything they have found meaningful traces back to this drive, "
                f"even the experiences that seemed to contradict it."
            ),
        },
        {
            # Para 2: ELEMENTAL NATURE — opens with the element pattern
            "title":   f"The {sign_element} Quality That Shapes Everything",
            "content": (
                f"There is a specific quality to how {sign_element} energy "
                f"moves through the world — a way of processing, a thing it cannot ignore, "
                f"a pattern in what it finds meaningful versus what drains it. "
                f"This elemental signature runs through how {first_name} thinks, "
                f"how they love, and what they keep returning to."
            ),
        },
        {
            # Para 3: SOUL CONTRACT — opens with the gap between doing and contributing
            "title":   "What You Were Built to Contribute",
            "content": (
                f"There is a gap between what most people do for a living and what they "
                f"were actually designed to give. The calling is not a job title — "
                f"it is the specific contribution that only this particular configuration "
                f"of gifts and wiring can make. "
                f"For {first_name}, the thread that connects every experience of genuine "
                f"meaning runs through this direction."
            ),
        },
        {
            # Para 4: HIDDEN DRIVER — opens with the invisible optimisation
            "title":   "The Drive That Runs Below the Surface",
            "content": (
                f"Every decision optimises for something. The question is whether that "
                f"something has ever been accurately named. The hidden driver is the need "
                f"that shapes what feels satisfying versus what feels "
                f"hollow, regardless of what logic says should be enough. "
                f"Understanding it changes how {first_name} reads their own choices."
            ),
        },
        {
            # Para 5: THIS WINDOW — opens with the cost of working against your season
            "title":   f"Working With This Moment, Not Against It",
            "content": (
                f"The same action taken in the wrong season produces the wrong result. "
                f"The current chapter of {current_year} — a season of {py_theme} — "
                f"combined with a longer arc focused on {pinnacle_theme} creates a specific "
                f"window with its own momentum. "
                f"What {first_name} does now compounds differently than what they did before."
            ),
        },
        p6,
    ]


# ─────────────────────────────────────────────
# API call (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def _call_haiku(prompt: str) -> Optional[str]:
    try:
        import httpx
    except ImportError:
        logger.error("httpx not installed"); return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _ANTHROPIC_ENDPOINT,
                headers={
                    "Content-Type":      "application/json",
                    "anthropic-version": _API_VERSION,
                    "x-api-key":         os.environ.get("ANTHROPIC_API_KEY", ""),
                },
                json={
                    "model":      MODEL_HAIKU,
                    "max_tokens": 2000,
                    "system": (
                        "You are a master reader — warm, direct, and deeply perceptive. "
                        "You write personalised insight paragraphs that make the reader think: "
                        "'how does it know this about me?'\n\n"
                        "NARRATIVE ARC — every paragraph must follow this structure:\n"
                        "  SIGNIFICANCE first: open with why this dimension of life matters — "
                        "the cost, the pattern, or the question it raises. "
                        "Never open with the person's name followed by a number or system label. "
                        "Never open with 'Your Life Path...', 'Your Sun sign...', "
                        "'As a Life Path...', 'Born under...', 'Your Personal Year...'. "
                        "These are desk rejections — the reader disengages before the insight lands.\n"
                        "  GAP second: name what has been invisible or unnamed for this person.\n"
                        "  REVELATION third: deliver what this means for how they live, decide, "
                        "and relate. Be concrete. Be personal. Name the lived experience — "
                        "not the system label or number that produced it.\n\n"
                        "METHODOLOGY RULE — the most important instruction:\n"
                        "Never output system names or numbers in the reading. "
                        "Translate every data point into lived consequence. "
                        "The visitor must feel seen — not taught. "
                        "The reading is revelation, not a report.\n\n"
                        "TITLE RULE: Titles must name the insight or experience, not the system. "
                        "'Life Path 5: The Explorer' is weak. "
                        "'Why Conventional Paths Always Felt Like Cages' is strong.\n\n"
                        "You respond only with valid JSON arrays as instructed — no other text."
                    ),
                    "messages": [{"role": "user", "content": prompt}],
                }
            )
            if response.status_code != 200:
                logger.error(f"Claude API error {response.status_code}: {response.text[:200]}")
                return None
            data    = response.json()
            content = data.get("content", [])
            return " ".join(
                block.get("text", "") for block in content if block.get("type") == "text"
            ).strip()
    except Exception as e:
        logger.error(f"Claude Haiku call failed: {e}"); return None


def _parse_paragraphs(raw_text: str) -> Optional[List[Dict]]:
    if not raw_text: return None
    text = re.sub(r"```json\s*", "", raw_text)
    text = re.sub(r"```\s*",     "", text).strip()
    start = text.find("["); end = text.rfind("]")
    if start == -1 or end == -1:
        logger.warning("No JSON array found in Claude response"); return None
    try:
        paragraphs = json.loads(text[start:end+1])
        if not isinstance(paragraphs, list): return None
        validated = []
        for p in paragraphs:
            if isinstance(p, dict) and "title" in p and "content" in p:
                validated.append({"title": str(p["title"]), "content": str(p["content"])})
        return validated if validated else None
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}"); return None


# v3.0.0 — Opening sentence validation for welcome paragraphs
_WEAK_PARA_PATTERNS = re.compile(
    r"^(your life path|your sun|your destiny|your soul urge|"
    r"as a life path|born under|in numerology|according to|"
    r"based on|[a-z]+,?\s+your life path|[a-z]+,?\s+as a|"
    r"life path \d|personal year \d|your personal year|"
    r"your pinnacle|your destiny number|"
    r"numerology (shows|reveals|indicates|suggests)|"
    r"astrology (shows|reveals|indicates|suggests)|"
    r"with (your|a) (sun|moon|venus|mars) in|"
    r"[a-z]+ is a \d|[a-z]+ is an \d|"
    r"as a? \d|with \d in)",
    re.IGNORECASE,
)


def _validate_paragraph_strength(paragraphs: List[Dict]) -> bool:
    """
    Check that the first 4 content paragraphs open with significance,
    not with a weak framing pattern (name + number, system name first).

    Returns True if all required paragraphs pass. False if any fail.
    A failed check triggers one retry in generate_welcome_reading().
    """
    for p in paragraphs[:4]:
        content = p.get("content", "")
        first_sentence = content.split(".")[0].strip()
        if _WEAK_PARA_PATTERNS.match(first_sentence):
            logger.info(
                "Weak paragraph opening detected",
                extra={"opening": first_sentence[:80]},
            )
            return False
    return True


# ─────────────────────────────────────────────
# Main welcome handler
# v2.0.0: pinnacle, personal_month, current_year, partner_name
# ─────────────────────────────────────────────

async def generate_welcome_reading(
    name:           str,
    dob:            str,
    birth_time:     Optional[str],
    birth_location: Optional[str],
    session_id:     str,
    partner_name:   Optional[str] = None,   # v2.0.0 — Union Blueprint visitors
) -> Dict[str, Any]:
    """
    Generate a highly personalised welcome reading.

    v2.0.0: partner_name is optional. If provided (Union Blueprint visitor),
    paragraph 6 invites them to explore the compatibility reading instead of
    the solo deep-dive invitation.

    Returns the dict your WelcomeModal expects:
    {
        "life_path":  int,
        "age":        int,
        "paragraphs": [...]
    }
    """
    try:
        birth       = datetime.strptime(dob, "%Y-%m-%d")
        day, month, year = birth.day, birth.month, birth.year
    except ValueError:
        logger.error(f"Invalid DOB format: {dob}"); return _error_response()

    first_name     = name.strip().split()[0] if name.strip() else "Seeker"
    today          = date.today()
    current_year   = today.year            # v2.0.0 — dynamic (not hardcoded)
    current_month  = today.month

    age            = _calculate_age(dob)
    lp             = _life_path(day, month, year)
    dest           = _destiny(name)
    su             = _soul_urge(name)
    sun            = _sun_sign(day, month)
    py             = _personal_year(day, month, current_year)
    pm             = _personal_month(py, current_month)   # v2.0.0
    pinnacle       = _pinnacle_current(day, month, year, current_year)  # v2.0.0
    has_birth_time = bool(birth_time and birth_time.strip())

    logger.info(
        "WelcomeReading.generate",
        extra={
            "session_id":    session_id,
            "life_path":     lp,
            "sun_sign":      sun,
            "personal_year": py,
            "personal_month":pm,
            "pinnacle":      pinnacle.get("number"),
            "destiny":       dest,
            "soul_urge":     su,
            "age":           age,
            "has_partner":   partner_name is not None,
        }
    )

    prompt = _build_welcome_prompt(
        first_name     = first_name,
        life_path      = lp,
        destiny        = dest,
        soul_urge      = su,
        sun_sign       = sun,
        personal_year  = py,
        personal_month = pm,
        pinnacle       = pinnacle,
        age            = age,
        current_year   = current_year,
        birth_location = birth_location,
        has_birth_time = has_birth_time,
        partner_name   = partner_name,
    )

    raw_text   = await _call_haiku(prompt)
    paragraphs = _parse_paragraphs(raw_text) if raw_text else None

    # v3.0.0 — opening sentence validation: retry once if any of the first 4
    # paragraphs open with a weak framing pattern (name + number, system-first)
    if paragraphs and not _validate_paragraph_strength(paragraphs):
        logger.info("Welcome paragraphs failed opening sentence check — retrying with stronger instruction")
        retry_prompt = (
            prompt
            + "\n\nCRITICAL — YOUR PREVIOUS ATTEMPT FAILED: "
            "The first sentence of several paragraphs opened with a weak framing — "
            "either a system name, a number label, or a methodology reference "
            "('Your Life Path...', 'Your Sun sign...', 'As a Life Path...', "
            "'Personal Year 7...', 'Life Path 5 means...', 'Your Destiny number...'). "
            "This is the equivalent of a desk rejection: the reader disengages "
            "before the insight lands.\n\n"
            "Rewrite all 6 paragraphs. Every paragraph MUST open with SIGNIFICANCE: "
            "the cost, the pattern, or the question that makes this dimension of "
            "life matter — BEFORE anything that names the system or the number. "
            "The first sentence should make the reader think 'yes, that's the thing "
            "I've never been able to name' — not 'here is my number'.\n\n"
            "Additionally: do NOT output any system label or number in the content. "
            "No 'Life Path 5', no 'Personal Year 7', no 'Sun in Scorpio', "
            "no 'Soul Urge 3', no 'Pinnacle 4'. Translate every data point into "
            "the lived experience it describes."
        )
        retry_raw = await _call_haiku(retry_prompt)
        retry_paragraphs = _parse_paragraphs(retry_raw) if retry_raw else None
        if retry_paragraphs:
            paragraphs = retry_paragraphs

    if not paragraphs:
        logger.warning("Using fallback paragraphs for welcome reading")
        paragraphs = _fallback_paragraphs(
            first_name    = first_name,
            life_path     = lp,
            sun_sign      = sun,
            personal_year = py,
            pinnacle      = pinnacle,
            age           = age,
            current_year  = current_year,
            partner_name  = partner_name,
        )

    # Attach visual styles
    styled = []
    for i, p in enumerate(paragraphs[:7]):
        style = _PARAGRAPH_STYLES[i % len(_PARAGRAPH_STYLES)]
        styled.append({
            "icon":    style["icon"],
            "title":   p["title"],
            "content": p["content"],
            "bg":      style["bg"],
            "border":  style["border"],
            "iconBg":  style["iconBg"],
        })

    return {
        "life_path":      lp,
        "age":            age,
        "paragraphs":     styled,
        # Extra metadata (not used by modal but useful for caching/analytics)
        "sun_sign":       sun,
        "personal_year":  py,
        "personal_month": pm,           # v2.0.0
        "pinnacle":       pinnacle,      # v2.0.0
        "destiny":        dest,
        "soul_urge":      su,
        "session_id":     session_id,
    }


def _error_response() -> Dict[str, Any]:
    return {
        "life_path":  7,
        "age":        0,
        "paragraphs": [{
            "icon":    "Star",
            "title":   "Your Journey Begins",
            "content": (
                "We couldn't generate your personalised welcome reading right now, "
                "but your journey is already unfolding. "
                "Explore our tools to discover what the universe has in store for you."
            ),
            "bg":     "bg-primary-50",
            "border": "border-primary-100",
            "iconBg": "bg-primary-100",
        }],
        "session_id": "",
    }
