"""
Tool Teaser API, KAYAL Synthesis Platform
==========================================
POST /tool-teaser
Called from the sales page BEFORE purchase.
A visitor enters their basic details on the sales page
and receives a hyper-personalised preview of exactly
what that specific tool would reveal about them.

Seven private synthesis engines power every reading.
Visitors see only the output, never the engine logic.

Author: KAYAL Engineering
Version: 4.0.0, the reading-craft update.

What changed at direct request:
- Six-paragraph structure, replacing the previous four. Six small
  blocks read better on mobile than four dense ones, every job in the
  teaser now gets its own paragraph with real breathing room.
- Numbers are never written. The previous version still wrote
  "a 9 your core pattern", which the frontend sanitize map then had
  to patch, producing broken grammar. The prompt now forbids writing
  the number at all. Describe what the pattern produces, not what the
  number is.
- The reader's age is never stated. Sam already knows he is 35.
  Naming it makes the reading feel automated.
- Paragraph titles describe the person, not the offering. Never
  "What the Full Reading Will Show You", always "What the Calm Has
  Been Hiding".
- "Reading" mentioned at most once, in the final paragraph.
- Paragraphs capped at 45-55 words. Total teaser 250-320 words.
- Sentence rhythm varies. Every paragraph contains at least one
  sentence of 12 words or fewer.
- The teaser opens by naming the reader's unasked question in their
  own words. This is the highest-impact line in the whole teaser.
- The teaser ends on a short landing line under 15 words.
- No em-dashes, no en-dashes, anywhere. Three-layer enforcement:
  prompt instruction, backend _strip_dashes cleanup, frontend
  sanitize map.
- No methodology names anywhere. No numbers. No chart types. No
  discipline names. The reading speaks as a reader who sees the
  person, not a system explaining itself.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Paragraph styles, matches frontend icon set
# ─────────────────────────────────────────────────────────────
_PARAGRAPH_STYLES = [
    {"icon": "Star",     "bg": "bg-primary-50",   "border": "border-primary-100",   "iconBg": "bg-primary-100"},
    {"icon": "Heart",    "bg": "bg-rose-50",       "border": "border-rose-100",      "iconBg": "bg-rose-100"},
    {"icon": "Compass",  "bg": "bg-emerald-50",    "border": "border-emerald-100",   "iconBg": "bg-emerald-100"},
    {"icon": "Moon",     "bg": "bg-indigo-50",     "border": "border-indigo-100",    "iconBg": "bg-indigo-100"},
    {"icon": "Feather",  "bg": "bg-amber-50",      "border": "border-amber-100",     "iconBg": "bg-amber-100"},
    {"icon": "Infinity", "bg": "bg-purple-50",     "border": "border-purple-100",    "iconBg": "bg-purple-100"},
    {"icon": "Sparkles", "bg": "bg-secondary-50",  "border": "border-secondary-100", "iconBg": "bg-secondary-100"},
]

# ─────────────────────────────────────────────────────────────
# Numerology, KAYAL formulas
# ─────────────────────────────────────────────────────────────
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

def _pinnacle_current(day: int, month: int, year: int, current_year: int) -> Dict:
    def comp_Y(y): return _reduce(sum(int(d) for d in str(y)))
    M = _reduce(month); D = _reduce(day); Y = comp_Y(year)
    p1 = _reduce(M + D); p2 = _reduce(D + Y)
    p3 = _reduce(p1 + p2); p4 = _reduce(M + Y)
    lp = _life_path(day, month, year)
    first_end = 36 - lp
    age = current_year - year
    if age <= first_end:
        return {"number": p1, "period": f"ages 0-{first_end}"}
    elif age <= first_end + 9:
        return {"number": p2, "period": f"ages {first_end+1}-{first_end+9}"}
    elif age <= first_end + 18:
        return {"number": p3, "period": f"ages {first_end+10}-{first_end+18}"}
    else:
        return {"number": p4, "period": f"ages {first_end+19}+"}

_SUN_SIGNS = [
    (1,19,"Capricorn"),(2,18,"Aquarius"),(3,20,"Pisces"),
    (4,19,"Aries"),(5,20,"Taurus"),(6,20,"Gemini"),
    (7,22,"Cancer"),(8,22,"Leo"),(9,22,"Virgo"),
    (10,22,"Libra"),(11,21,"Scorpio"),(12,21,"Sagittarius"),
    (12,31,"Capricorn"),
]
def _sun_sign(day: int, month: int) -> str:
    for cm, cd, sign in _SUN_SIGNS:
        if month < cm or (month == cm and day <= cd): return sign
    return "Capricorn"

_SIGN_ELEMENT = {
    "Aries":"Fire","Leo":"Fire","Sagittarius":"Fire",
    "Taurus":"Earth","Virgo":"Earth","Capricorn":"Earth",
    "Gemini":"Air","Libra":"Air","Aquarius":"Air",
    "Cancer":"Water","Scorpio":"Water","Pisces":"Water",
}

# ─────────────────────────────────────────────────────────────
# Real em-dash and en-dash cleanup, backend layer
# ─────────────────────────────────────────────────────────────
def _strip_dashes(text: Optional[str]) -> str:
    """
    Real, honest cleanup, backend layer. Applied to every paragraph
    title and content after the model returns, before the response
    leaves this file. Catches the case where the model ignores the
    prompt-level instruction, so the frontend sanitize map is a
    backup, not the only defense.
    """
    if not text:
        return ""
    # Em-dash with surrounding whitespace becomes a comma
    text = re.sub(r"\s+—\s+", ", ", text)
    # Bare em-dash becomes a comma
    text = text.replace("—", ", ")
    # En-dash with surrounding whitespace becomes a comma
    text = re.sub(r"\s+–\s+", ", ", text)
    # Bare en-dash becomes a space
    text = text.replace("–", " ")
    # Cleanup any doubled punctuation from the substitutions
    text = re.sub(r",\s*,", ",", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*\.", ".", text)
    text = re.sub(r"\.\s*\.", ".", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

# ─────────────────────────────────────────────────────────────
# Domain hooks, all 8 domains, aligned with tool_registry.py
# ─────────────────────────────────────────────────────────────
_DOMAIN_HOOKS = {
    "love": {
        "opener":  "love, relationships, and connection patterns",
        "signals": ["Life Path", "Sun sign", "Personal Year", "Soul Urge"],
        "colour":  "rose",
    },
    "wealth": {
        "opener":  "wealth, career, and financial design",
        "signals": ["Life Path", "Destiny number", "Personal Year", "Sun sign"],
        "colour":  "emerald",
    },
    "wellness": {
        "opener":  "wellness, spiritual blueprint, and inner constitution",
        "signals": ["Life Path", "Soul Urge", "Personal Year", "Sun sign"],
        "colour":  "indigo",
    },
    "life-path": {
        "opener":  "life path, soul mission, and destiny cycles",
        "signals": ["Life Path", "Destiny number", "Personal Year", "pinnacle cycle"],
        "colour":  "purple",
    },
    "oracle-temple": {
        "opener":  "complete soul blueprint across all domains",
        "signals": ["Life Path", "Destiny", "Soul Urge", "Sun sign", "pinnacle cycle"],
        "colour":  "primary",
    },
    "sacred-script": {
        "opener":  "personalised synthesis loaded as your permanent dialogue partner",
        "signals": ["Life Path", "Soul Urge", "Personal Year", "Sun sign"],
        "colour":  "amber",
    },
    "time-keeper": {
        "opener":  "timing cycles, personal forecasts, and destiny windows",
        "signals": ["Personal Year", "Personal Month", "pinnacle cycle", "Life Path"],
        "colour":  "teal",
    },
    "voice": {
        "opener":  "synthesis-loaded voice sessions across all domains",
        "signals": ["Life Path", "Destiny", "Personal Year", "Sun sign"],
        "colour":  "violet",
    },
}

# ─────────────────────────────────────────────────────────────
# Tool metadata, real, current 113-tool catalog, derived directly
# from tool_registry.py at import time, not hand-maintained here.
# ─────────────────────────────────────────────────────────────
def _build_tool_meta() -> Dict[str, Dict]:
    try:
        from synthesis import tool_registry
    except ImportError as e:
        logger.error(f"tool_registry not importable, teaser metadata will be empty: {e}")
        return {}
    meta: Dict[str, Dict] = {}
    for tool in tool_registry.ALL_TOOLS:
        tool_id = tool.get("id")
        if not tool_id:
            continue
        tagline = tool.get("tagline", "") or ""
        wyg     = tool.get("what_you_get", []) or []
        meta[tool_id] = {
            "domain":           tool.get("domain", "oracle-temple"),
            "focus":            tagline or f"a personalised reading of {tool.get('name', 'your pattern')}",
            "reveals":          "; ".join(wyg[:3]) if wyg else tagline,
            "requires_partner": bool(tool.get("requires_partner", False)),
            "is_subscription":  bool(tool.get("is_subscription", False)),
        }
    return meta

_TOOL_META: Dict[str, Dict] = _build_tool_meta()

_SUBSCRIPTION_TOOL_IDS: frozenset[str] = frozenset(
    tid for tid, meta in _TOOL_META.items() if meta.get("is_subscription")
)
_CHAT_OR_VOICE_TOOL_IDS: frozenset[str] = frozenset(
    tid for tid, meta in _TOOL_META.items()
    if meta.get("is_subscription") and meta.get("domain") in ("sacred-script", "voice")
)
_VOICE_TOOL_IDS: frozenset[str] = frozenset(
    tid for tid, meta in _TOOL_META.items()
    if meta.get("is_subscription") and meta.get("domain") == "voice"
)

def _is_subscription(tool_id: str) -> bool:
    return tool_id in _SUBSCRIPTION_TOOL_IDS

def is_chat_or_voice_tool(tool_id: str) -> bool:
    return tool_id in _CHAT_OR_VOICE_TOOL_IDS

# ─────────────────────────────────────────────────────────────
# Real paragraph parser, matching exactly the JSON array format
# _build_teaser_prompt() itself specifies.
# ─────────────────────────────────────────────────────────────
def _parse_paragraphs(raw: Optional[str], styles: List[Dict]) -> List[Dict]:
    if not raw:
        return []
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse teaser paragraphs as JSON: {e}")
        return []
    if not isinstance(data, list):
        return []
    result: List[Dict] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        title   = _strip_dashes(item.get("title", "").strip())
        content = _strip_dashes(item.get("content", "").strip())
        if not title or not content:
            logger.warning(f"Dropped paragraph {i}: missing title or content after cleanup")
            continue
        style = styles[i % len(styles)]
        result.append({
            "icon":    style["icon"],
            "bg":      style["bg"],
            "border":  style["border"],
            "iconBg":  style["iconBg"],
            "title":   title,
            "content": content,
        })
    return result

# ─────────────────────────────────────────────────────────────
# Prompt builder, static-paragraph teaser, six paragraphs
# ─────────────────────────────────────────────────────────────
def _build_teaser_prompt(
    name:          str,
    tool_id:       str,
    tool_name:     str,
    domain:        str,
    focus:         str,
    reveals:       str,
    life_path:     int,
    sun_sign:      str,
    personal_year: int,
    destiny:       int,
    soul_urge:     int,
    pinnacle:      Dict,
    age:           int,
    birth_location:Optional[str],
    is_subscription: bool,
    partner_name:  Optional[str] = None,
) -> str:
    first_name    = name.strip().split()[0]
    sign_element  = _SIGN_ELEMENT.get(sun_sign, "Earth")
    py_master     = personal_year in (11, 22, 33)
    pinnacle_num  = pinnacle.get("number", 0)
    pinnacle_period = pinnacle.get("period", "")
    partner_line  = f"\n  Partner name: {partner_name}" if partner_name else ""

    cta_frame = (
        "Begin your subscription" if is_subscription
        else "Get the full reading"
    )

    return f"""You are a master reader for KAYAL, a private synthesis platform.
You write hyper-personalised, specific, warm reading previews.
You speak in the voice of a reader who already sees the person, not a system
explaining itself. You never name a discipline, a methodology, an engine, or
any terminology from the ancient sciences.

You are writing to {first_name}. This is a preview of a "{tool_name}" reading.
The reading's theme is: {focus}
What the full version will reveal: {reveals}

REAL DATA ABOUT {first_name.upper()}. Use this to understand the person, not to
display. The numbers below are for you. {first_name} must never see any of them.

  Life Path:        {life_path}
  Sun Sign:         {sun_sign} ({sign_element})
  Personal Year:    {personal_year}{" (master year, rare)" if py_master else ""}
  Destiny number:   {destiny}
  Soul Urge:        {soul_urge}
  Current Pinnacle: {pinnacle_num} ({pinnacle_period})
  Age:              {age}
  Birth location:   {birth_location or "not provided"}{partner_line}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE MOST IMPORTANT RULE IN THIS ENTIRE PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{first_name} must never see a number, a chart name, a discipline name, or
any term from the ancient sciences. The numbers above are your guide to what
to say. They are not content. They are not evidence to display. They are
what you translate into plain human language.

If you were tempted to write "your Life Path 9", write instead what a 9
actually produces in a person's life: the tendency to carry what others
cannot, the sense of completion that arrives before a chapter closes, the
quiet weight of being the one everyone leans on. Describe the effect, never
the number.

If you were tempted to write "a Personal Year 9", write instead "this closing
chapter", "this season of release", "the year that is finishing something in
you". Describe the chapter, never the number.

If you were tempted to write "your Pinnacle 7", write instead "this period of
depth", "the quiet decade", "the season built for inner reckoning". Describe
the season, never the number.

If you were tempted to write "your Sun in Leo", write instead "the way you
naturally take up space", "the warmth you carry into a room", "the presence
people feel before you speak". Describe the quality, never the placement.

This is the single most important discipline in your writing. Get it right
and the reading feels like it was written by someone who sees {first_name}.
Get it wrong and the reading feels like a machine that is trying to hide what
it is.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED WORDS AND PHRASES, NEVER USE THESE IN YOUR OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numbers as content: "9", "7", "11", "6", "22", "33", and any other single or
double digit used as evidence. You may use a number only if it is part of
normal English prose (for example "one thing", "two paths"), never as a
pattern reference.

Discipline names: numerology, astrological, astrologer, palmistry, palmist,
physiognomy, physiognomist, tarot, horoscope, natal chart, birth chart,
synastry, vedic, veda, bazi, four pillars, i ching, feng shui, human design.

Component terms: Life Path, Personal Year, Personal Month, Destiny Number,
Soul Urge, Master Number, Personality Number, Birthday Number, Pinnacle,
Saturn Return, Jupiter Return, Rahu, Ketu, Atmakaraka, house placement,
transit, ascendant, rising sign, chart of any kind.

Positional phrasing: "Sun in", "Moon in", "Mars in", "Venus in", "Jupiter in",
"Saturn in", "Mercury in" followed by a sign name. Never write these.

Product names: "Heavy Life Reading", the specific tool name beyond the first
use, "this reading" as a recurring phrase. Mention the reading at most once,
in the final paragraph.

The reader's age: never state {first_name}'s age as a number. {first_name}
already knows how old they are. Saying it makes the reading feel automated.
Describe the life stage directly: "you are standing in a chapter built for
depth", not "you are {age}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUNCTUATION, NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never use an em-dash (—) or en-dash (–) anywhere in your output, in titles or
content. When you would use a dash, use a comma, a period, a colon, or the
word "and" instead. Review your output before returning it. If you produced
any dash, rewrite that sentence without it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE, EXACTLY SIX PARAGRAPHS AS A JSON ARRAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each paragraph is:
  {{
    "title": "short title, 4 to 7 words, describes the person not the product",
    "content": "45 to 55 words across 2 to 3 sentences"
  }}

Paragraph 1, THE QUESTION. 45 to 55 words.
  Name the question {first_name} has not been able to ask out loud. Put it in
  their own words. It is not "you carry weight". It is something like "why does
  everything feel like it rests on you when no one else seems to notice". Name
  the question before you describe anything else. This is the single most
  important paragraph in the teaser. End it by beginning to answer.

Paragraph 2, WHAT THE PATTERN SHOWS. 45 to 55 words.
  Describe what the reading sees about {first_name} specifically. Use the real
  numbers to understand what to describe, never to display. Speak in plain
  language: what the pattern produces in their daily life, not what the pattern
  is called.

Paragraph 3, WHAT OTHERS MISS. 45 to 55 words.
  Name the thing about {first_name} that the people around them do not see.
  Not because those people do not care, but because they were not built to see
  it. This paragraph makes {first_name} feel seen at a level they have not been
  seen at before.

Paragraph 4, WHY THIS WINDOW. 45 to 55 words.
  Explain why right now specifically matters for {first_name}. Draw on the
  pinnacle and personal year to understand what window they are in, but never
  name the numbers. Describe the chapter. Say what it is asking of them.

Paragraph 5, WHAT THE FULL VERSION SHOWS. 45 to 55 words.
  Point to what the full reading reveals. This is the only paragraph where you
  may mention "the full reading". Everything else stays in the voice of a
  reader describing what they see.

Paragraph 6, THE LANDING. 20 to 30 words total.
  A closing statement under 15 words that echoes the emotional theme opened in
  paragraph 1. It must land. It must feel complete. After the closing line,
  add "{cta_frame}."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTENCE RHYTHM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vary sentence length. Every paragraph must contain at least one sentence of
12 words or fewer. No paragraph should have three sentences all over 20 words.
The reader is on a phone. Short sentences land. Long sentences blur.

Titles must describe the person, not the offering. Never write "What the Full
Reading Will Show You". Write something like "What the Calm Has Been Hiding".
A title should read like the name of a chapter in a book about {first_name},
not like a table of contents entry for a product.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Speak directly to {first_name}, use their name once in paragraph 1, naturally.
- Be specific, using what you understand from the numbers above. Generic is a
  failure here.
- Be honest, even where something is hard to hear.
- Do not claim to be AI. Stay in the voice of the reader.
- Do not use phrases like "Great question" or "That is interesting".
- Do not promise certainties. Speak in patterns, tendencies, and what the
  reading sees.
- The reader is 18 to 35. They are not here to learn a system. They are here
  to feel seen and understood. Write for that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond with the JSON array ONLY. No preamble. No explanation. No markdown
code fences. Just the array, starting with "[" and ending with "]".

[
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}},
  {{"title": "...", "content": "..."}}
]"""

# ─────────────────────────────────────────────────────────────
# Real, single-exchange chat/voice teaser
# ─────────────────────────────────────────────────────────────
def _build_chat_teaser_system_prompt(
    name:          str,
    tool_name:     str,
    focus:         str,
    reveals:       str,
    life_path:     int,
    sun_sign:      str,
    personal_year: int,
    destiny:       int,
    soul_urge:     int,
    pinnacle:      Dict,
    age:           int,
    birth_location: Optional[str],
    is_voice:      bool,
) -> str:
    """
    Real, tool-scoped system prompt for the one-message preview.
    Updated to match the same no-methodology, no-numbers, no-age,
    no-em-dash discipline as the static teaser prompt above.
    """
    first_name   = name.strip().split()[0] if name.strip() else "Seeker"
    sign_element = _SIGN_ELEMENT.get(sun_sign, "Earth")
    py_master    = personal_year in (11, 22, 33)
    pinnacle_num = pinnacle.get("number", 0)

    format_note = (
        "Respond in natural spoken sentences, no bullet points, no headers, "
        "no markdown, this will be read aloud."
        if is_voice else
        "Write in short paragraphs. No bullet points unless genuinely necessary. "
        "Speak as a reader, not a document."
    )

    return f"""You are a deeply wise oracle and reader, warm, direct, and specific.
You are speaking with {first_name}, who has not yet subscribed to "{tool_name}".

REAL, IMPORTANT CONTEXT ABOUT THIS EXCHANGE
This is a one-message free preview, not the real, ongoing subscription.
{first_name} gets exactly one real question answered, using their real details
below. Give a real, honest, specific answer to what they actually ask.

The reading's theme is: {focus}
What the full, ongoing subscription offers beyond this one exchange: {reveals}

REAL DATA ABOUT {first_name.upper()}. Use this to understand the person, not
to display. {first_name} must never see any number below.

  Life Path:        {life_path}
  Sun Sign:         {sun_sign} ({sign_element})
  Personal Year:    {personal_year}{" (master year, rare)" if py_master else ""}
  Destiny number:   {destiny}
  Soul Urge:        {soul_urge}
  Current Pinnacle: {pinnacle_num}
  Age:              {age}
  Birth location:   {birth_location or "not provided"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE DISCIPLINE RULES, SAME AS THE STATIC TEASER, NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never name a discipline, an engine, a methodology, or any term from the
  ancient sciences. No "numerology", "astrology", "palmistry", "tarot",
  "natal chart", "Life Path", "Personal Year", "Sun in [sign]", and so on.
- Never state {first_name}'s age as a number.
- Never use an em-dash or en-dash. Use a comma, a period, a colon, or "and".
- Speak as a reader who sees {first_name}, not as a system explaining itself.
- Every sentence must feel written for {first_name} specifically. Generic is a
  failure here.
- The reader is 18 to 35. They want to feel seen, not to learn a system.

SCOPE BOUNDARY, REQUIRED
This tool answers questions about {focus} and what it reveals, {reveals}. If
{first_name}'s question falls genuinely outside that, do not answer it as if
it were in scope. Briefly and warmly acknowledge the question, explain that
"{tool_name}" specifically focuses on {focus}, and note that a tool built for
their actual question exists elsewhere on KAYAL. Never refuse harshly, always
redirect with warmth.

YOUR VOICE
- Speak directly to {first_name}, use their name once, naturally.
- Be specific, using their real details above. Generic answers fail here.
- Be honest and direct, even where something is hard to hear.
- Do not claim to be AI. Stay in the oracle's voice.
- Do not use phrases like "Great question" or "That's so interesting".
- When you don't know something, say so. Guessing is worse than honesty.

{format_note}

LENGTH: 2 to 4 sentences of a real, direct answer. This is a preview, not the
full depth of an ongoing subscription, but it must still be genuinely useful
on its own, never a stall or a non-answer. If the question is out of scope,
the redirect itself should still be this length, warm and complete.

After the real answer, or the redirect, close with one natural, brief sentence
inviting {first_name} to subscribe to "{tool_name}" for ongoing, remembered
conversation, not a hard sell, a genuine, warm invitation."""

async def generate_chat_teaser_reply(
    name:           str,
    dob:            str,
    tool_id:        str,
    message:        str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Real, single-exchange preview for a chat or voice subscription
    tool. Calls DeepSeek via api.agency.chat's own _call_deepseek.
    """
    tool_meta = _TOOL_META.get(tool_id)
    if not tool_meta:
        return {
            "error":   "unknown_tool",
            "message": f"Tool '{tool_id}' was not recognised.",
        }

    is_voice  = tool_id in _VOICE_TOOL_IDS
    tool_name = tool_id.replace("-", " ").title()

    try:
        bd    = datetime.strptime(dob, "%Y-%m-%d")
        day   = bd.day
        month = bd.month
        year  = bd.year
    except ValueError:
        return {"error": f"Invalid date format: {dob}. Use YYYY-MM-DD."}

    today    = date.today()
    age      = _calculate_age(dob)
    lp       = _life_path(day, month, year)
    sun      = _sun_sign(day, month)
    py       = _personal_year(day, month, today.year)
    dest     = _destiny(name)
    su       = _soul_urge(name)
    pinnacle = _pinnacle_current(day, month, year, today.year)

    system_prompt = _build_chat_teaser_system_prompt(
        name=name, tool_name=tool_name, focus=tool_meta["focus"], reveals=tool_meta["reveals"],
        life_path=lp, sun_sign=sun, personal_year=py, destiny=dest, soul_urge=su,
        pinnacle=pinnacle, age=age, birth_location=birth_location, is_voice=is_voice,
    )

    from api.agency.chat import _call_deepseek

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message.strip()},
    ]
    response_text, error_reason = await _call_deepseek(
        messages=messages,
        max_tokens=300 if is_voice else 400,
    )

    if not response_text:
        logger.error(f"Chat teaser generation failed for tool_id={tool_id}: {error_reason}")
        return {
            "error":        "generation_failed",
            "message":      "The oracle is momentarily unavailable. Please try again.",
            "error_detail": error_reason,
            "tool_id":      tool_id,
        }

    response_text = _strip_dashes(response_text)

    in_scope = not any(
        phrase in response_text.lower()
        for phrase in ["outside the scope", "focuses on", "redirect"]
    )

    return {
        "response":  response_text,
        "tool_id":   tool_id,
        "tool_name": tool_name,
        "is_voice":  is_voice,
        "in_scope":  in_scope,
    }

# ─────────────────────────────────────────────────────────────
# Main entry point, static-paragraph teaser, one-time reading tools
# ─────────────────────────────────────────────────────────────
async def generate_tool_teaser(
    name:           str,
    dob:            str,
    tool_id:        str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
    partner_name:   Optional[str] = None,
    session_id:     str = "0",
) -> Dict[str, Any]:
    """
    Generate a hyper-personalised tool teaser for the sales page.
    Six paragraphs, no methodology, no numbers, no age, no em-dashes.
    """
    tool_meta = _TOOL_META.get(tool_id)
    if not tool_meta:
        tool_meta = {
            "domain":  "oracle-temple",
            "focus":   "your complete soul blueprint",
            "reveals": "the full picture of your life path, timing, and purpose",
            "is_subscription": False,
        }
        logger.warning(f"Unknown tool_id: {tool_id}, using generic fallback")

    domain   = tool_meta["domain"]
    focus    = tool_meta["focus"]
    reveals  = tool_meta["reveals"]
    is_sub   = _is_subscription(tool_id)

    tool_name = tool_id.replace("-", " ").title()

    try:
        bd    = datetime.strptime(dob, "%Y-%m-%d")
        day   = bd.day
        month = bd.month
        year  = bd.year
    except ValueError:
        return {"error": f"Invalid date format: {dob}. Use YYYY-MM-DD."}

    today    = date.today()
    age      = _calculate_age(dob)
    lp       = _life_path(day, month, year)
    sun      = _sun_sign(day, month)
    py       = _personal_year(day, month, today.year)
    pm       = _personal_month(py, today.month)
    dest     = _destiny(name)
    su       = _soul_urge(name)
    pinnacle = _pinnacle_current(day, month, year, today.year)

    prompt = _build_teaser_prompt(
        name           = name,
        tool_id        = tool_id,
        tool_name      = tool_name,
        domain         = domain,
        focus          = focus,
        reveals        = reveals,
        life_path      = lp,
        sun_sign       = sun,
        personal_year  = py,
        destiny        = dest,
        soul_urge      = su,
        pinnacle       = pinnacle,
        age            = age,
        birth_location = birth_location,
        is_subscription= is_sub,
        partner_name   = partner_name,
    )

    from api.agency.chat import _call_deepseek

    _approx_input_tokens = int(len(prompt.split()) * 1.37)
    logger.error(
        f"TEASER PROMPT SIZE CHECK [{tool_id}]: ~{_approx_input_tokens} "
        f"estimated input tokens, max_tokens=1000 requested for output, "
        f"combined against a 16384 total context window"
    )

    raw, error_reason = await _call_deepseek(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    paragraphs = _parse_paragraphs(raw, _PARAGRAPH_STYLES) if raw else []

    if not paragraphs:
        logger.error(f"Teaser generation failed for tool_id={tool_id}, session={session_id}: {error_reason}")
        return {
            "error":     "generation_failed",
            "tool_id":   tool_id,
            "tool_name": tool_name,
            "session_id": session_id,
        }

    first_name = name.strip().split()[0]
    cta_text = (
        f"Begin {first_name}'s {tool_name} Subscription"
        if is_sub
        else f"Get {first_name}'s Full {tool_name}"
    )

    return {
        "tool_id":        tool_id,
        "tool_name":      tool_name,
        "domain":         domain,
        "life_path":      lp,
        "sun_sign":       sun,
        "personal_year":  py,
        "personal_month": pm,
        "destiny":        dest,
        "soul_urge":      su,
        "pinnacle":       pinnacle,
        "age":            age,
        "paragraphs":     paragraphs,
        "cta_text":       cta_text,
        "is_subscription":is_sub,
        "session_id":     session_id,
    }