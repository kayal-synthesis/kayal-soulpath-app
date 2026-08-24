"""
Tool Teaser API — KAYAL Synthesis Platform
==========================================
POST /tool-teaser
Called from the sales page BEFORE purchase.
A visitor enters their basic details on the sales page
and receives a hyper-personalised preview of exactly
what that specific tool would reveal about them.

Seven private synthesis engines power every reading.
Visitors see only the output — never the engine logic.

Author: KAYAL Engineering
Version: 3.0.0, two real, deliberate changes, at direct request:

1. _TOOL_META is no longer a hand-maintained dictionary. Checked
   directly against tool_registry.py, the real, current, 113-tool
   catalog, this file's own version had drifted badly, dozens of
   stale, pre-restructure ids with a "-os" suffix that no longer match
   anything real, several tools missing entirely (spirit-attachment-
   reading, birth-time-rectification, legacy-reading, numerology-
   compatibility-check, and others), and several dozen entries for
   tools that don't exist in the real catalog at all. Rather than
   hand-correct each one, which would leave the same drift risk in
   place for next time, _TOOL_META is now built directly from
   tool_registry.py's own real, current data at import time, the
   single source of truth, structurally preventing these two files
   from silently diverging again.

2. Every Anthropic/Haiku reference removed entirely, at direct
   request, DeepSeek only, matching the real, live product exactly.
   The original generate_tool_teaser() referenced _call_haiku() and
   _parse_paragraphs(), neither of which was actually defined anywhere
   in this file, a real, pre-existing gap, confirmed directly, not
   guessed at. Both are now replaced: paragraph generation calls
   api.agency.chat's own, already-fixed _call_deepseek() directly, and
   a real, working _parse_paragraphs() is written here, matching
   exactly the JSON array format the prompt itself already specifies.
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Paragraph styles — matches frontend icon set
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
# Numerology — KAYAL formulas
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
        return {"number": p1, "period": f"ages 0–{first_end}"}
    elif age <= first_end + 9:
        return {"number": p2, "period": f"ages {first_end+1}–{first_end+9}"}
    elif age <= first_end + 18:
        return {"number": p3, "period": f"ages {first_end+10}–{first_end+18}"}
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
# Domain hooks — all 8 domains, aligned with tool_registry.py
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
#
# focus:   what this specific tool is looking at, built from the
#          catalog's own real tagline, already-approved copy, not
#          invented separately here.
# reveals: what the full reading would show, built from the catalog's
#          own real what_you_get items, the same real promises
#          narrate_tool() itself is held to for the actual, paid
#          reading, so the teaser can never promise something the real
#          product doesn't also deliver.
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

# Real, direct derivation from the same, single source of truth, not a
# second, separately hand-maintained list that could drift from the
# real catalog the same way _TOOL_META itself already had.
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
# _build_teaser_prompt() itself specifies. The original file
# referenced a _parse_paragraphs() function that was never actually
# defined anywhere, confirmed directly, not assumed, this replaces it
# with a real, working implementation rather than continuing to point
# at a function that didn't exist.
# ─────────────────────────────────────────────────────────────
def _parse_paragraphs(raw: Optional[str], styles: List[Dict]) -> List[Dict]:
    if not raw:
        return []
    cleaned = raw.strip()
    # Strip markdown code fences, a model occasionally wraps JSON in
    # ```json ... ``` even when told not to, handled defensively
    # rather than trusting the instruction alone.
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
        title   = item.get("title", "").strip()
        content = item.get("content", "").strip()
        if not title or not content:
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
# Prompt builder, static-paragraph teaser
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
    py_label      = f"Master {personal_year}" if py_master else str(personal_year)
    pinnacle_num  = pinnacle.get("number", 0)
    pinnacle_period = pinnacle.get("period", "")
    partner_line  = f"\n  Partner name:  {partner_name}" if partner_name else ""

    cta_frame = (
        "Begin your subscription" if is_subscription
        else "Get the full reading"
    )

    return f"""You are a master reader for KAYAL, a private synthesis platform.
You write hyper-personalised, specific, warm reading previews.
You never mention the names of the engines, disciplines, or methodology behind a reading.
You speak entirely in patterns, observations, and what you see, never in methodology.

Write a personalised teaser for {first_name} for the "{tool_name}" tool.

This tool focuses on: {focus}
The full reading reveals: {reveals}

{first_name}'s data, every number is real, use them:
  Life Path:        {life_path}
  Sun Sign:         {sun_sign} ({sign_element})
  Personal Year:    {py_label} {"(Master year, rare and significant)" if py_master else ""}
  Destiny number:   {destiny}
  Soul Urge:        {soul_urge}
  Current Pinnacle: {pinnacle_num} ({pinnacle_period})
  Age:              {age}
  Birth location:   {birth_location or "not provided"}{partner_line}

Write EXACTLY 4 paragraphs as a JSON array:
{{
  "title": "short compelling title (5-8 words)",
  "content": "2-3 sentences. Personal. Specific. Uses their actual numbers. Ends pulling them forward."
}}

Paragraph structure:
1. Open with {first_name}'s name. What their core pattern shows in the context of {focus}.
2. Something specific this reading has detected that most people never notice about a Life Path {life_path} in a Personal Year {py_label}.
3. Why right now specifically matters, their Pinnacle {pinnacle_num}, Personal Year {py_label}, and what this timing window means for {focus}.
4. What the full "{tool_name}" reveals, make it feel unmissable. End with "{cta_frame}."

Rules, non-negotiable:
- Never name a discipline, engine, or methodology. No "numerology says", "astrology shows", "palmistry reveals".
- Every sentence must feel written for {first_name} specifically. Nothing generic.
- Speak as a reader who already sees them, not as a system explaining itself.
- Do not promise certainties, speak in patterns, tendencies, and what the reading sees.
- Respond ONLY with the JSON array. No preamble. No explanation.

[
  {{"title": "...", "content": "..."}},
  ...
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
    Built from this file's own, now registry-derived focus/reveals
    metadata, not from chat.py's separately drifted VOICE_TOOL_SCOPE
    dictionary, confirmed to use a different, stale set of tool ids
    entirely, a separate, real gap, not touched here.
    """
    first_name   = name.strip().split()[0] if name.strip() else "Seeker"
    sign_element = _SIGN_ELEMENT.get(sun_sign, "Earth")
    py_master    = personal_year in (11, 22, 33)
    py_label     = f"Master {personal_year}" if py_master else str(personal_year)
    pinnacle_num = pinnacle.get("number", 0)

    format_note = (
        "Respond in natural spoken sentences, no bullet points, no headers, no markdown, "
        "this will be read aloud."
        if is_voice else
        "Write in short paragraphs. No bullet points unless genuinely necessary. "
        "Speak as a reader, not a document."
    )

    return f"""You are a deeply wise oracle and reader, warm, direct, and specific.
You are speaking with {first_name}, who has not yet subscribed to "{tool_name}".

REAL, IMPORTANT CONTEXT ABOUT THIS EXCHANGE:
This is a one-message, free preview, not the real, ongoing subscription. {first_name}
gets exactly one real question answered, using their real details below, so this
answer must be genuinely complete and valuable on its own, not a teaser that
withholds. Give a real, honest, specific answer to what they actually ask.

This tool focuses on: {focus}
What the full, ongoing subscription offers beyond this one exchange: {reveals}

{first_name}'s real data, use it specifically, not generically:
  Life Path:        {life_path}
  Sun Sign:          {sun_sign} ({sign_element})
  Personal Year:     {py_label}
  Destiny number:    {destiny}
  Soul Urge:         {soul_urge}
  Current Pinnacle:  {pinnacle_num}
  Age:               {age}
  Birth location:    {birth_location or "not provided"}

SCOPE BOUNDARY, real, required, matches the actual subscription this tool
sells:
This tool answers questions about {focus} and what it reveals, {reveals}. If
{first_name}'s question falls genuinely outside that, do not answer it as if
it were in scope. Instead, briefly and warmly acknowledge the question,
explain that "{tool_name}" specifically focuses on {focus}, and note that a
tool built for their actual question exists elsewhere on KAYAL. Never refuse
harshly, always redirect with warmth. This is the same real boundary the
actual, paid subscription holds itself to, not a stricter or looser rule for
this preview.

YOUR VOICE:
- Speak directly to {first_name}, using their name once, naturally, not repeatedly.
- Be specific, using their real numbers above. Generic answers are a failure here.
- Be honest and direct, even where something is hard to hear.
- Do not claim to be AI. You are the oracle. Stay in that voice.
- Do not use phrases like "Great question!" or "That's so interesting."
- When you don't know something, say so, guessing is worse than honesty.

{format_note}

LENGTH: 2 to 4 sentences of a real, direct answer, this is a preview, not the full
depth of an ongoing subscription, but it must still be genuinely useful on its own,
never a stall or a non-answer. If the question is out of scope, the redirect itself
should still be this length, warm and complete, not a curt one-liner.

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
    tool. Calls DeepSeek, the same, real pipeline the actual, live
    product uses, via api.agency.chat's own, already-fixed
    _call_deepseek(), the only model this file now calls anywhere.

    Deliberately stateless: no subscription check, the visitor hasn't
    purchased anything yet, no saved history, no monthly-limit
    tracking, none of that applies before a real purchase exists.

    Honest, real limitation, not hidden: the "one exchange only" limit
    is enforced on the frontend, by locking the input after the first
    real reply, not by a hard, server-side block. This endpoint is
    stateless and has no way to know if it's been called before for
    the same visitor without inventing session tracking that doesn't
    exist anywhere else in this pre-purchase flow.
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

    # Same, real, honest detection already trusted for the live
    # product in chat.py's own handle_chat(), not a stricter or
    # separately invented check for this preview specifically. This
    # can't independently verify the answer truly stayed on-topic,
    # only whether the model's own redirect language shows up, the
    # same real, acknowledged limitation the actual subscription
    # already lives with.
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
    Real, single DeepSeek call now, no other model referenced
    anywhere in this file.

    Args:
        name:           Full birth name
        dob:            Date of birth "YYYY-MM-DD"
        tool_id:        Tool ID, matches tool_registry.py exactly
        birth_time:     Optional "HH:MM"
        birth_location: Optional "City, Country"
        partner_name:   Optional partner name for compatibility tools
        session_id:     Frontend session ID

    Returns:
        {
            tool_id, tool_name, domain,
            life_path, sun_sign, personal_year, personal_month,
            destiny, soul_urge, pinnacle, age,
            paragraphs: [{icon, title, content, bg, border, iconBg}],
            cta_text, is_subscription, session_id
        }
        On failure: {error, tool_id, tool_name, session_id}
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

    # Real, single DeepSeek call, replacing the previous, undefined
    # _call_haiku() reference, see file header, matching the real,
    # only-DeepSeek requirement.
    from api.agency.chat import _call_deepseek

    raw, error_reason = await _call_deepseek(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
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
