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
Version: 2.0.0 — aligned with tool_registry.py
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
_API_VERSION        = "2023-06-01"
MODEL_HAIKU         = "claude-haiku-4-5-20251001"

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
# Tool metadata — all 149 tools, IDs exact from tool_registry.py
# focus:   what this tool is looking at (guides Claude Haiku's angle)
# reveals: what the full reading would show (used in paragraph 4)
# ─────────────────────────────────────────────────────────────
_TOOL_META: Dict[str, Dict] = {

    # ── LOVE & RELATIONSHIPS ─────────────────────────────────
    "soulmate-arrival-window": {
        "domain":  "love",
        "focus":   "the specific timing windows when a significant romantic connection is most likely to arrive",
        "reveals": "three precise love windows in the next 24 months, what kind of person arrives in each, and the one pattern that has been closing your windows early",
    },
    "love-wound-reading": {
        "domain":  "love",
        "focus":   "the repeating heartbreak pattern and its root in your chart",
        "reveals": "the exact pattern across your love history, its astrological and numerological root, which type of person reliably triggers it, and the specific path through it",
    },
    "karmic-love-debt": {
        "domain":  "love",
        "focus":   "the love karma carried into this lifetime and what it requires to complete",
        "reveals": "the specific karmic love contracts in your chart, what they are asking you to heal, and the practices that accelerate that completion",
    },
    "twin-flame-verdict": {
        "domain":  "love",
        "focus":   "the true nature of the connection — twin flame, soulmate, karmic, or karmic lesson",
        "reveals": "an honest verdict on the soul-level nature of this connection based on both charts, and what that verdict means for how you proceed",
        "requires_partner": True,
    },
    "compatibility-decoder": {
        "domain":  "love",
        "focus":   "the precise areas of natural alignment and collision between two charts",
        "reveals": "where you are naturally built to work together, where you will reliably clash, and the specific dynamic each person needs to understand",
        "requires_partner": True,
    },
    "attachment-pattern-reading": {
        "domain":  "love",
        "focus":   "your attachment style as encoded in your chart and what it costs you in love",
        "reveals": "your specific attachment wiring, the pattern it creates in relationships, what triggers it, and the precise shift that changes it",
    },
    "love-timing-forecast": {
        "domain":  "love",
        "focus":   "your next 12 months in love mapped month by month",
        "reveals": "a month-by-month love forecast for the year ahead — when to open, when to wait, when to act, and the peak window in your current cycle",
    },
    "relationship-health-scan": {
        "domain":  "love",
        "focus":   "an honest assessment of where this specific relationship actually stands",
        "reveals": "the real state of this relationship as both charts show it, what each person is not saying, and what the synthesis recommends",
        "requires_partner": True,
    },
    "divorce-or-stay-reading": {
        "domain":  "love",
        "focus":   "the most important relationship decision — what both charts and the timing actually indicate",
        "reveals": "what both charts show about this relationship's soul-level purpose, whether it has completed, and what the synthesis recommends with full honesty",
        "requires_partner": True,
    },
    "self-love-blueprint": {
        "domain":  "love",
        "focus":   "the love you owe yourself first — as your chart describes it",
        "reveals": "the specific self-love deficit your chart carries, where it formed, and the precise practices that address it at the root",
    },
    "ex-return-oracle": {
        "domain":  "love",
        "focus":   "whether this person is returning and whether that return serves your path",
        "reveals": "what the timing and both charts show about a return, whether the karmic contract is complete or unfinished, and what you actually need right now",
    },
    "love-language-blueprint": {
        "domain":  "love",
        "focus":   "how you give love, how you need to receive it, and the gap between them",
        "reveals": "your specific love language signature beyond the five standard types, why the gap between giving and receiving keeps creating disconnection, and how to close it",
    },

    # ── WEALTH & CAREER ──────────────────────────────────────
    "wealth-blueprint-reading": {
        "domain":  "wealth",
        "focus":   "your complete wealth design — how you are built to earn, keep, and grow",
        "reveals": "your specific wealth archetype, the natural channels through which money flows most easily to you, and the pattern that has been working against your design",
    },
    "income-ceiling-breaker": {
        "domain":  "wealth",
        "focus":   "what is holding your income at the same level and the specific path through it",
        "reveals": "the exact pattern maintaining your current ceiling — numerological, karmic, or behavioural — and the precise shift that breaks through it",
    },
    "calling-decoder": {
        "domain":  "wealth",
        "focus":   "what you were built to do — named precisely from your chart",
        "reveals": "the intersection of your deepest gifts and what the world will pay most to receive from you, with the timing window most aligned with that move",
    },
    "founder-type-reading": {
        "domain":  "wealth",
        "focus":   "the business model and founder archetype your chart is built to run",
        "reveals": "your specific founder type, the business model most aligned with your wiring, and why the model you have been copying keeps underperforming",
    },
    "wealth-timing-forecast": {
        "domain":  "wealth",
        "focus":   "your financial peak windows in the next 24 months mapped precisely",
        "reveals": "the specific cycles when financial movement is most supported, what each window is suited for, and what to avoid in the gaps between them",
    },
    "career-pivot-reading": {
        "domain":  "wealth",
        "focus":   "whether to pivot, when to pivot, and exactly what to pivot toward",
        "reveals": "what your chart shows about your current career alignment, the timing window most supported for a transition, and the direction your design is pointing",
    },
    "money-wound-reading": {
        "domain":  "wealth",
        "focus":   "the belief your face confirms is costing you the most money",
        "reveals": "the specific money wound visible in your facial structure, its origin, how it is operating in your financial decisions right now, and the remedy",
    },
    "salary-negotiation-oracle": {
        "domain":  "wealth",
        "focus":   "the exact window, amount, and approach your chart supports for negotiation",
        "reveals": "the timing most aligned with a successful negotiation, the authority signature your chart carries, and the specific approach that your design supports",
    },
    "side-hustle-blueprint": {
        "domain":  "wealth",
        "focus":   "the income stream your chart is most naturally designed to build",
        "reveals": "the specific side income model most aligned with your wiring, the timing window to start, and the pattern that will make it sustainable",
    },
    "investment-timing-oracle": {
        "domain":  "wealth",
        "focus":   "when your chart supports taking financial risk and when it does not",
        "reveals": "the specific risk windows in your chart for the next 24 months, what type of investment each supports, and the cycles to sit out entirely",
    },
    "leadership-signature": {
        "domain":  "wealth",
        "focus":   "the authority your face projects and how to own it completely",
        "reveals": "the specific leadership archetype visible in your facial structure, how others currently read your authority, and the shifts that unlock your full leadership range",
    },
    "second-half-reading": {
        "domain":  "wealth",
        "focus":   "what your face predicts about your strongest decades ahead",
        "reveals": "the specific facial markers that indicate your peak decades, what your chart shows about the second half of your life, and the moves that position you for it",
    },

    # ── WELLNESS & SPIRITUALITY ──────────────────────────────
    "body-constitution-reading": {
        "domain":  "wellness",
        "focus":   "your body's actual design and why generic health advice keeps failing you",
        "reveals": "your specific constitutional type, the lifestyle and dietary approach most aligned with your design, and the pattern that keeps pulling you toward what does not serve your body",
    },
    "shadow-work-reading": {
        "domain":  "wellness",
        "focus":   "what you hide from yourself and why it is your greatest untapped power",
        "reveals": "the specific shadow patterns your chart carries, how they are operating in your life right now, and the integration path that releases the most energy",
    },
    "ancestral-wound-reading": {
        "domain":  "wellness",
        "focus":   "the pattern you inherited from your lineage and how to be the one who ends it",
        "reveals": "the specific ancestral pattern visible in your chart, how far back it runs, how it is expressing in your life, and the healing practice that closes it in your generation",
    },
    "spiritual-gifts-reading": {
        "domain":  "wellness",
        "focus":   "the specific spiritual capacities you arrived with and how to develop them",
        "reveals": "the unique spiritual gifts encoded in your chart and palm lines, how they are already operating, and the practices that activate them more fully",
    },
    "past-life-reading": {
        "domain":  "wellness",
        "focus":   "what you carried in from before and how it is shaping this lifetime",
        "reveals": "the past life patterns visible in your palm lines, the abilities and wounds you carried into this life, and how the unresolved elements are appearing in your current circumstances",
    },
    "chakra-blueprint": {
        "domain":  "wellness",
        "focus":   "which energy centres are blocked, which are overactive, and the specific remedy for each",
        "reveals": "your specific chakra pattern as your chart describes it, what each imbalance is connected to in your life, and the targeted practices that address each centre",
    },
    "dark-night-navigator": {
        "domain":  "wellness",
        "focus":   "the spiritual purpose of your most difficult period and the path through it",
        "reveals": "what your chart shows is actually happening in your current difficult period, why it is specific to your path, and the practices that help you move through rather than around it",
    },
    "intuition-activation": {
        "domain":  "wellness",
        "focus":   "what form your intuition takes and how to stop doubting it",
        "reveals": "the specific intuitive modality your chart is built for, why you have been doubting it, and the daily practice that strengthens your natural signal",
    },
    "vitality-code": {
        "domain":  "wellness",
        "focus":   "why your energy is where it is and the specific path to your natural peak",
        "reveals": "the vitality pattern visible in your palm lines and chart, what is draining your energy at the root level, and the targeted practices that restore your natural baseline",
    },
    "abundance-frequency-audit": {
        "domain":  "wellness",
        "focus":   "what your face reveals about your current relationship with abundance",
        "reveals": "the specific abundance blocks visible in your facial structure, the belief they encode, and the remedy that shifts your energetic relationship with receiving",
    },
    "sleep-and-dreams-reading": {
        "domain":  "wellness",
        "focus":   "what your chart says about your sleep patterns and what your dreams are communicating",
        "reveals": "your specific sleep architecture as your chart describes it, the pattern behind disrupted sleep, and what the recurring themes in your dream life are pointing toward",
    },
    "purpose-activation-reading": {
        "domain":  "wellness",
        "focus":   "not just what your purpose is but how to actually live it starting now",
        "reveals": "the full architecture of your purpose as your chart and palm lines describe it, why knowing it has not been enough, and the specific first move your synthesis recommends",
    },

    # ── LIFE PATH & DESTINY ──────────────────────────────────
    "life-path-deep-dive": {
        "domain":  "life-path",
        "focus":   "your Life Path number decoded in full — not the generic version",
        "reveals": "the complete picture of your Life Path — its specific gifts, its shadows, its highest expression, its recurring challenges, and what it looks like when fully embodied",
    },
    "soul-contract-reading": {
        "domain":  "life-path",
        "focus":   "what you agreed to before you arrived and how your life is fulfilling it",
        "reveals": "the specific agreements encoded in your chart, how they are showing up in your current circumstances, and what honouring them looks like in practical terms",
    },
    "pinnacle-reading": {
        "domain":  "life-path",
        "focus":   "the life chapter you are actually in and what it is asking of you",
        "reveals": "the full picture of your current Pinnacle, what it is designed to develop, what it demands, what it delivers, and how long you are in it",
    },
    "nine-year-cycle-reading": {
        "domain":  "life-path",
        "focus":   "the map of your entire life across nine-year cycles — past, present, and future",
        "reveals": "where you are in the nine-year arc, what each past cycle was building, what the current cycle requires, and what the next three years are moving toward",
    },
    "karmic-lessons-reading": {
        "domain":  "life-path",
        "focus":   "the lessons encoded in your chart that keep returning until they are learned",
        "reveals": "the specific karmic lessons in your chart, how they are currently showing up, what each one is asking you to develop, and the practices that accelerate their completion",
    },
    "north-node-reading": {
        "domain":  "life-path",
        "focus":   "the direction your soul is being pulled toward in this lifetime",
        "reveals": "your North Node placement, what it is pulling you away from, what it is pulling you toward, and the specific tension between those two directions in your current life",
    },
    "personal-year-deep-dive": {
        "domain":  "life-path",
        "focus":   "the full picture of your current Personal Year and what it is asking and offering",
        "reveals": "the complete map of your current Personal Year month by month, its specific theme, the opportunities encoded in it, and the mistakes most common in this year type",
    },
    "master-number-reading": {
        "domain":  "life-path",
        "focus":   "for 11, 22, and 33 Life Paths — the full weight of what you carry",
        "reveals": "the complete picture of your master number — its specific demands, its specific gifts, why it collapses under pressure, and what embodying it actually looks like",
    },
    "expression-number-reading": {
        "domain":  "life-path",
        "focus":   "the natural talents encoded in your full birth name",
        "reveals": "your specific Expression number, the talents it encodes, how they are currently being used or suppressed, and how they connect to your Life Path",
    },
    "soul-urge-reading": {
        "domain":  "life-path",
        "focus":   "what your heart actually wants underneath everything you think you want",
        "reveals": "your Soul Urge number in full, the deep desire it encodes, how it conflicts or aligns with your Life Path, and what happens when it is chronically unmet",
    },
    "missing-numbers-reading": {
        "domain":  "life-path",
        "focus":   "the numbers absent from your chart and what their absence means",
        "reveals": "the specific missing numbers in your chart, what each absence indicates about recurring challenges, and the targeted practices that address each gap",
    },
    "numerology-name-reading": {
        "domain":  "life-path",
        "focus":   "what your name vibrates and whether it is working for or against you",
        "reveals": "the full numerological signature of your birth name, whether it is in alignment with your Life Path, and what a misalignment is costing you",
    },

    # ── ORACLE TEMPLE — core synthesis (16) ─────────────────
    "complete-love-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your love blueprint across all disciplines",
        "reveals": "the full picture of your love design — pattern origins, timing windows, partner blueprint, and the remedy — synthesised from every relevant discipline",
    },
    "complete-wealth-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your wealth blueprint across all disciplines",
        "reveals": "the full map of your wealth design — ceiling patterns, calling, timing, and the specific path forward — synthesised from every relevant discipline",
    },
    "complete-health-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your health and vitality blueprint",
        "reveals": "the full picture of your constitutional design, vitality patterns, and the targeted practices most aligned with your specific body and chart",
    },
    "complete-purpose-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your life purpose across all disciplines",
        "reveals": "the complete architecture of your purpose — soul contract, calling, timing, and the practical first steps — synthesised from every relevant discipline",
    },
    "annual-destiny-forecast": {
        "domain":  "oracle-temple",
        "focus":   "a complete forecast of your year ahead across all life domains",
        "reveals": "a month-by-month synthesis of your year — love, wealth, health, and purpose — mapped from every relevant discipline with specific guidance for each period",
    },
    "shadow-and-light-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "the full picture of your shadow and your gifts — synthesised together",
        "reveals": "what your shadow is protecting, what your light is capable of, and how the integration of both creates the specific version of you that is most fully alive",
    },
    "relationship-karma-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your relationship karma across all disciplines",
        "reveals": "the full picture of your relational wiring — past life contracts, attachment patterns, love timing, and the remedy — synthesised from every relevant discipline",
    },
    "complete-spiritual-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your spiritual blueprint across all disciplines",
        "reveals": "the full map of your spiritual design — gifts, path, current stage, and practices — synthesised across every relevant discipline into one coherent picture",
    },
    "business-destiny-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your business and entrepreneurial blueprint",
        "reveals": "your founder archetype, the business model most aligned with your design, wealth timing, and the specific moves your synthesis recommends right now",
    },
    "children-family-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your family blueprint and parent-child dynamics",
        "reveals": "your parenting design, the soul contracts between you and your family members, and the specific guidance most relevant to your current family circumstances",
    },
    "relocation-destiny-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your geographical destiny and relocation blueprint",
        "reveals": "the locations most aligned with your chart, what each direction offers, and whether the move you are considering is supported by your current timing",
    },
    "creative-genius-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your creative design and artistic blueprint",
        "reveals": "your specific creative genius type, the medium most aligned with your wiring, the blocks that keep interrupting the flow, and the practices that remove them",
    },
    "fertility-soul-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your fertility blueprint and soul readiness",
        "reveals": "the timing windows most supported for conception, the energetic preparation your chart recommends, and the soul contract context for this specific journey",
    },
    "digital-identity-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your digital presence and personal brand design",
        "reveals": "the personal brand frequency most aligned with your chart, the platforms that suit your wiring, and the specific positioning that reflects your authentic authority",
    },
    "elder-years-synthesis": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your elder years blueprint and legacy design",
        "reveals": "the full picture of your later decades — what your chart shows about your peak, your legacy, and the specific preparation that makes those years your strongest",
    },
    "full-soul-portrait": {
        "domain":  "oracle-temple",
        "focus":   "a complete portrait of your soul synthesised across every discipline",
        "reveals": "the single most comprehensive reading available — every significant dimension of your blueprint synthesised into one coherent picture of who you are and what you are here for",
    },

    # ── ORACLE TEMPLE — flagship no-image (30) ───────────────
    "soulmate-arrival-window-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the soulmate arrival window reading",
        "reveals": "the full soulmate timing synthesis across all disciplines — deeper, wider, and more precise than the standard reading",
    },
    "love-wound-reading-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the love wound reading",
        "reveals": "the full love wound synthesis — pattern origins traced across every relevant discipline — with a complete remedy protocol",
    },
    "income-ceiling-breaker-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the income ceiling breaker",
        "reveals": "the full income ceiling synthesis — every pattern, every discipline, every angle — with a complete breakthrough protocol",
    },
    "calling-decoder-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the calling decoder",
        "reveals": "the full calling synthesis — what every discipline confirms you were built for — with a specific activation map",
    },
    "shadow-self-reading-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the shadow work reading",
        "reveals": "the full shadow synthesis across all disciplines — every pattern, every origin, every integration practice",
    },
    "spiritual-gifts-inventory-os": {
        "domain":  "oracle-temple",
        "focus":   "a complete inventory of your spiritual gifts across all disciplines",
        "reveals": "every spiritual gift your chart, palm, and esoteric reading confirms — named, described, and with specific development practices for each",
    },
    "soul-contract-reading-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the soul contract reading",
        "reveals": "the full soul contract synthesis — every agreement, every discipline, every implication — with a complete fulfilment map",
    },
    "nine-year-cycle-reading-os": {
        "domain":  "oracle-temple",
        "focus":   "the complete synthesis version of the nine-year cycle reading",
        "reveals": "the full nine-year arc synthesis — every cycle mapped across all disciplines with a complete navigation guide",
    },
    "soulmate-compatibility-verdict": {
        "domain":  "oracle-temple",
        "focus":   "a complete compatibility synthesis between two charts across all disciplines",
        "reveals": "the full compatibility picture — soul level, practical level, timing level — synthesised from every relevant discipline for both charts",
        "requires_partner": True,
    },
    "professional-compatibility-scan": {
        "domain":  "oracle-temple",
        "focus":   "a complete professional compatibility synthesis between two charts",
        "reveals": "the full professional partnership picture — complementary strengths, friction points, timing alignment — for both charts across all disciplines",
        "requires_partner": True,
    },
    "birthday-blueprint": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of what your birthday reveals about your blueprint",
        "reveals": "the full picture of your birthday number — its gifts, patterns, and significance — synthesised across every relevant discipline",
    },
    "birthday-gift-career-map": {
        "domain":  "oracle-temple",
        "focus":   "a complete map of the career gifts encoded in your birth date",
        "reveals": "every career-relevant gift your birthday encodes, how each is currently being used or suppressed, and the specific moves that activate them",
    },
    "pinnacle-portal": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your current pinnacle and what it is opening for you",
        "reveals": "the full picture of your current Pinnacle as every discipline describes it — what it is asking, what it is offering, and how to move through it with intention",
    },
    "pinnacle-transition-forecast": {
        "domain":  "oracle-temple",
        "focus":   "a complete forecast for your upcoming pinnacle transition",
        "reveals": "what is completing, what is beginning, and the specific preparation your synthesis recommends for the transition between your current and next Pinnacle",
    },
    "karmic-debt-cleanser": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your karmic debts and the specific practices that resolve them",
        "reveals": "every karmic debt visible in your chart, how each is currently manifesting, and the complete remedy protocol drawn from every relevant discipline",
    },
    "pattern-breaker": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your most persistent pattern and the specific path through it",
        "reveals": "the root of your most recurring pattern identified across every discipline, the mechanism maintaining it, and the complete interruption protocol",
    },
    "wealth-timing-oracle": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your wealth timing windows across all disciplines",
        "reveals": "every wealth timing window in the next 24 months mapped across all relevant cycles — with specific guidance for each window",
    },
    "career-opportunity-window": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your career opportunity windows right now",
        "reveals": "the specific career windows open in your chart right now, what each is suited for, and the moves your synthesis recommends before each window closes",
    },
    "constitutional-health-blueprint": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your health constitution across all disciplines",
        "reveals": "your full health constitution — constitutional type, vitality patterns, specific vulnerabilities, and the complete lifestyle protocol most aligned with your design",
    },
    "stress-body-reading": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of how stress operates in your specific body and chart",
        "reveals": "the specific stress signature in your chart, where it lands in your body, what triggers it, and the targeted practices that address it at the root",
    },
    "child-blueprint-os": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of a child's blueprint and the parent-child dynamic",
        "reveals": "the child's specific design, gifts, and challenges across all disciplines — and the parenting approach most aligned with who they actually are",
        "requires_partner": True,
    },
    "parent-child-mirror": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of the parent-child relationship dynamic",
        "reveals": "what both charts show about this specific relationship, the soul contract between parent and child, and the guidance most relevant to your current dynamic",
        "requires_partner": True,
    },
    "relocation-power-map": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of the geographical locations that amplify your blueprint",
        "reveals": "the specific locations most aligned with your chart for love, wealth, and purpose — and what each direction is most likely to activate",
    },
    "home-address-reading": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of what your home address vibrates and whether it supports you",
        "reveals": "the numerological and esoteric signature of your current address, whether it is aligned with your Life Path, and what a misalignment is costing you",
    },
    "business-name-audit": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of what your business name vibrates",
        "reveals": "the full numerological and esoteric signature of your business name, whether it amplifies or conflicts with your founder archetype, and what the synthesis recommends",
    },
    "founder-archetype": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your founder archetype across all disciplines",
        "reveals": "your specific founder archetype named and described across every discipline — your natural authority, your optimal business model, and your leadership signature",
    },
    "fertility-timing-map": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your fertility timing windows across all disciplines",
        "reveals": "the timing windows most supported for conception across all relevant cycles — with specific preparation guidance for each",
    },
    "family-blueprint": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your family blueprint and dynamics",
        "reveals": "the soul contracts and relational dynamics between family members, what each relationship is designed to develop, and the guidance most relevant right now",
        "requires_partner": True,
    },
    "personal-brand-frequency": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of the personal brand frequency most aligned with your chart",
        "reveals": "your specific personal brand signature, the message most aligned with your authority, the platforms that suit your wiring, and the positioning your synthesis recommends",
    },
    "authority-voice-reading": {
        "domain":  "oracle-temple",
        "focus":   "a complete synthesis of your natural authority and how it sounds when fully expressed",
        "reveals": "your specific authority signature, the voice and communication style most aligned with your chart, and what is currently muting or distorting your natural authority",
    },

    # ── ORACLE TEMPLE — face tools (10) ─────────────────────
    "face-shape-character-verdict": {
        "domain":  "oracle-temple",
        "focus":   "what your face shape reveals about your core character",
        "reveals": "the complete character portrait encoded in your face shape — your dominant tendencies, your relational style, and the traits that are most visible to others",
    },
    "facial-symmetry-relationship": {
        "domain":  "oracle-temple",
        "focus":   "what your facial symmetry reveals about your relationship patterns",
        "reveals": "the relationship tendencies encoded in your facial symmetry — how you present in close connections and the patterns most visible in your face",
    },
    "mian-xiang-wealth-face": {
        "domain":  "oracle-temple",
        "focus":   "the wealth indicators visible in your face through Mian Xiang face reading",
        "reveals": "the specific wealth markers in your facial structure, what each indicates about your financial trajectory, and the practices that activate the positive indicators",
    },
    "eye-reading-intelligence": {
        "domain":  "oracle-temple",
        "focus":   "what your eyes reveal about your intelligence type and inner life",
        "reveals": "the specific intelligence encoded in your eye structure, how you process information and experience, and the environments that allow your mind to work best",
    },
    "jaw-power-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your jaw reveals about your willpower and determination",
        "reveals": "the specific power signature encoded in your jaw structure, how it expresses in your approach to obstacles, and what strengthens or undermines your natural determination",
    },
    "forehead-intelligence-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your forehead reveals about your thinking style and early life influence",
        "reveals": "the intelligence and early life patterns encoded in your forehead structure, and how your formative experiences shaped the thinking style you are still operating from",
    },
    "skin-vitality-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your skin reveals about your current vitality and inner health",
        "reveals": "the vitality signals visible in your skin, what they indicate about your current inner state, and the targeted practices that address what they are showing",
    },
    "habitual-expression-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your habitual facial expressions reveal about your dominant emotional patterns",
        "reveals": "the emotional patterns encoded in your habitual expressions, what they reveal to others without your awareness, and how they are shaping your interactions",
    },
    "cheekbone-authority-map": {
        "domain":  "oracle-temple",
        "focus":   "what your cheekbones reveal about your authority and social power",
        "reveals": "the authority signature encoded in your cheekbone structure, how it operates in social and professional contexts, and what activates or undermines it",
    },
    "aging-marker-vitality": {
        "domain":  "oracle-temple",
        "focus":   "what your aging markers reveal about your vitality trajectory",
        "reveals": "the vitality patterns encoded in your aging markers, what they indicate about your health trajectory, and the practices most aligned with your specific design",
    },

    # ── ORACLE TEMPLE — palm tools (10) ─────────────────────
    "hand-shape-character-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your hand shape reveals about your core character and elemental type",
        "reveals": "the complete character portrait encoded in your hand shape — your elemental type, your dominant mode, and how you are naturally wired to engage with the world",
    },
    "life-line-vitality-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your life line reveals about your vitality and life arc",
        "reveals": "the vitality patterns, significant transitions, and life arc encoded in your life line — and what the specific markings indicate about your current phase",
    },
    "heart-line-love-map": {
        "domain":  "oracle-temple",
        "focus":   "what your heart line reveals about your emotional nature and love patterns",
        "reveals": "the complete love map encoded in your heart line — how you love, how you need to be loved, and the specific patterns most visible in your line",
    },
    "fate-line-mission-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your fate line reveals about your life mission and career path",
        "reveals": "the mission and career path encoded in your fate line — its direction, its significant markers, and what each marking indicates about your purpose and trajectory",
    },
    "mount-venus-love-vitality": {
        "domain":  "oracle-temple",
        "focus":   "what the Mount of Venus reveals about your love capacity and vitality",
        "reveals": "the love capacity, sensuality, and vitality encoded in your Mount of Venus — and what its development indicates about your current relationship with pleasure and connection",
    },
    "mount-jupiter-ambition": {
        "domain":  "oracle-temple",
        "focus":   "what the Mount of Jupiter reveals about your ambition and leadership",
        "reveals": "the ambition, leadership style, and authority encoded in your Mount of Jupiter — and what its development indicates about your current relationship with power and recognition",
    },
    "moon-mount-intuition": {
        "domain":  "oracle-temple",
        "focus":   "what the Mount of the Moon reveals about your intuition and imagination",
        "reveals": "the intuitive capacity, imagination, and subconscious patterns encoded in your Moon Mount — and the practices that develop what it shows is latent",
    },
    "thumb-willpower-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your thumb reveals about your willpower and decision-making",
        "reveals": "the willpower signature and decision-making style encoded in your thumb structure — and what it indicates about how you follow through on what matters most",
    },
    "marriage-line-reading": {
        "domain":  "oracle-temple",
        "focus":   "what your marriage lines reveal about your significant relationships",
        "reveals": "the significant relationship patterns encoded in your marriage lines — timing indicators, depth markers, and what each line indicates about your relational history and future",
    },
    "head-line-mind-map": {
        "domain":  "oracle-temple",
        "focus":   "what your head line reveals about your thinking style and mental blueprint",
        "reveals": "the complete mind map encoded in your head line — your thinking style, your decision-making approach, and the specific mental patterns most visible in your line",
    },

    # ── ORACLE TEMPLE — face + palm tools (10) ───────────────
    "complete-character-portrait": {
        "domain":  "oracle-temple",
        "focus":   "a complete character portrait synthesised from face and palm",
        "reveals": "the full picture of your character as both your face and palm confirm it — every significant trait, tendency, and capacity synthesised into one coherent portrait",
    },
    "love-architecture-reading": {
        "domain":  "oracle-temple",
        "focus":   "the complete architecture of your love life as face and palm reveal it",
        "reveals": "the full love architecture — patterns, capacity, timing indicators, and relational wiring — synthesised from facial and palm analysis together",
    },
    "wealth-signature-reading": {
        "domain":  "oracle-temple",
        "focus":   "your complete wealth signature as face and palm reveal it",
        "reveals": "the full wealth signature — earning style, financial patterns, authority projection, and trajectory — synthesised from facial and palm analysis together",
    },
    "health-constitution-reading": {
        "domain":  "oracle-temple",
        "focus":   "your complete health constitution as face and palm reveal it",
        "reveals": "the full health constitution — vitality patterns, constitutional type, specific vulnerabilities, and targeted practices — synthesised from facial and palm analysis together",
    },
    "career-authority-reading": {
        "domain":  "oracle-temple",
        "focus":   "your complete career authority as face and palm reveal it",
        "reveals": "the full career authority picture — leadership style, authority projection, professional patterns, and trajectory — synthesised from facial and palm analysis together",
    },
    "spiritual-blueprint-reading": {
        "domain":  "oracle-temple",
        "focus":   "your complete spiritual blueprint as face and palm reveal it",
        "reveals": "the full spiritual blueprint — gifts, path, current stage, and practices — synthesised from facial and palm analysis together",
    },
    "relationship-readiness-scan": {
        "domain":  "oracle-temple",
        "focus":   "your current relationship readiness as face and palm reveal it",
        "reveals": "your actual readiness for the relationship you say you want — what your face and palm confirm about where you are right now, and what prepares you for what is next",
    },
    "dual-elemental-conflict": {
        "domain":  "oracle-temple",
        "focus":   "the elemental conflict visible in both your face and palm",
        "reveals": "the specific elemental tension between your face and palm readings, what it creates in your life, and the practices that bring the two into alignment",
    },
    "peak-decade-map": {
        "domain":  "oracle-temple",
        "focus":   "a complete map of your peak decades as face and palm reveal them",
        "reveals": "the specific decades your face and palm indicate will be your strongest — and the preparation that makes each peak decade available to you",
    },
    "full-physical-reading": {
        "domain":  "oracle-temple",
        "focus":   "the most complete physical reading available — full face and full palm",
        "reveals": "the complete physical synthesis — every significant marker in both your face and palm read together and synthesised into one coherent portrait",
    },

    # ── SACRED SCRIPT — subscriptions (10) ──────────────────
    "the-life-scribe": {
        "domain":  "sacred-script",
        "focus":   "your complete synthesis loaded as your permanent dialogue partner",
        "reveals": "a subscription scribe with your full blueprint permanently in context — available to answer any question across every domain of your life, any time",
    },
    "love-scribe": {
        "domain":  "sacred-script",
        "focus":   "your love synthesis loaded as your permanent love guidance partner",
        "reveals": "a subscription scribe with your love blueprint permanently loaded — available for any love question, pattern, or decision you carry",
    },
    "wealth-scribe": {
        "domain":  "sacred-script",
        "focus":   "your wealth design loaded as your permanent financial guidance partner",
        "reveals": "a subscription scribe with your wealth blueprint permanently loaded — available for any financial question, career decision, or timing check",
    },
    "spiritual-scribe": {
        "domain":  "sacred-script",
        "focus":   "your spiritual path loaded as your permanent spiritual guidance partner",
        "reveals": "a subscription scribe with your spiritual blueprint permanently loaded — available for any question about your path, gifts, or current stage",
    },
    "health-scribe": {
        "domain":  "sacred-script",
        "focus":   "your health constitution loaded as your permanent wellness guidance partner",
        "reveals": "a subscription scribe with your constitutional blueprint permanently loaded — available for any health, vitality, or lifestyle question",
    },
    "purpose-scribe": {
        "domain":  "sacred-script",
        "focus":   "your soul contract loaded as your permanent purpose guidance partner",
        "reveals": "a subscription scribe with your purpose blueprint permanently loaded — available for any question about calling, direction, or soul mission",
    },
    "relationship-scribe": {
        "domain":  "sacred-script",
        "focus":   "your relationship karma loaded as your permanent relationship guidance partner",
        "reveals": "a subscription scribe with your relationship blueprint permanently loaded — available for any question about connection, compatibility, or relational patterns",
    },
    "grief-scribe": {
        "domain":  "sacred-script",
        "focus":   "a chart-calibrated companion through loss — available whenever you need it",
        "reveals": "a subscription scribe calibrated to your grief pattern and chart — available to hold context and provide guidance through any experience of loss",
    },
    "parenting-scribe": {
        "domain":  "sacred-script",
        "focus":   "your parenting blueprint loaded as your permanent parenting guidance partner",
        "reveals": "a subscription scribe with your parenting blueprint and your child's chart permanently loaded — available for any parenting question or family dynamic",
    },
    "business-scribe": {
        "domain":  "sacred-script",
        "focus":   "your founder archetype loaded as your permanent business guidance partner",
        "reveals": "a subscription scribe with your business blueprint permanently loaded — available for any business decision, strategy question, or timing check",
    },

    # ── TIME KEEPER — subscriptions (5) ─────────────────────
    "daily-personal-oracle": {
        "domain":  "time-keeper",
        "focus":   "your personalised daily energy forecast delivered every morning",
        "reveals": "a subscription daily oracle — your specific Personal Day energy, the opportunity and caution it carries, and the single most aligned action for that day",
    },
    "monthly-cycle-navigator": {
        "domain":  "time-keeper",
        "focus":   "your complete Personal Month forecast delivered on the first of each month",
        "reveals": "a subscription monthly navigator — the full picture of each Personal Month, its theme, its windows, and the specific guidance for navigating it well",
    },
    "quarterly-destiny-pulse": {
        "domain":  "time-keeper",
        "focus":   "a deep quarterly review of your timing, theme, and highest moves",
        "reveals": "a subscription quarterly pulse — a deep dive into the three-month period ahead, what it is building, what it is completing, and the specific moves most aligned with it",
    },
    "annual-arc-keeper": {
        "domain":  "time-keeper",
        "focus":   "your complete Personal Year mapped month by month — refreshed annually",
        "reveals": "a subscription annual map — your entire Personal Year broken into monthly windows with specific guidance for each, refreshed at the start of every new Personal Year",
    },
    "nine-year-arc-compass": {
        "domain":  "time-keeper",
        "focus":   "the complete nine-year cycle map updated at every Personal Year transition",
        "reveals": "a subscription nine-year compass — the full arc of your nine-year cycle kept in context and updated as you move through each Personal Year",
    },

    # ── VOICE — subscriptions (10) ───────────────────────────
    "oracle-voice-session": {
        "domain":  "voice",
        "focus":   "a 20-minute synthesis-loaded oracle voice session for any question",
        "reveals": "a subscription voice session with your complete synthesis in context — any question, any domain, spoken guidance calibrated to your specific blueprint",
    },
    "oracle-deep-dive-session": {
        "domain":  "voice",
        "focus":   "a 40-minute deep synthesis session for complex multi-domain questions",
        "reveals": "a subscription deep dive voice session — 40 minutes with your complete synthesis loaded for questions that cross multiple domains or require extended exploration",
    },
    "love-oracle-session": {
        "domain":  "voice",
        "focus":   "a voice session with your love synthesis permanently loaded",
        "reveals": "a subscription love oracle voice session — your love blueprint always in context, available for any love question you carry",
    },
    "wealth-oracle-session": {
        "domain":  "voice",
        "focus":   "a voice session with your wealth design and timing permanently loaded",
        "reveals": "a subscription wealth oracle voice session — your wealth blueprint always in context, available for any financial question or career decision",
    },
    "purpose-oracle-session": {
        "domain":  "voice",
        "focus":   "a voice session with your soul contract and calling permanently loaded",
        "reveals": "a subscription purpose oracle voice session — your purpose blueprint always in context, available for any question about direction, calling, or soul mission",
    },
    "daily-voice-briefing": {
        "domain":  "voice",
        "focus":   "your personalised 2-minute spoken energy forecast delivered every morning",
        "reveals": "a subscription daily voice briefing — your specific day energy spoken to you every morning, calibrated to your Personal Day number and current cycle",
    },
    "relationship-oracle-session": {
        "domain":  "voice",
        "focus":   "a 30-minute voice session with your relationship karma fully loaded",
        "reveals": "a subscription relationship oracle voice session — your relationship blueprint always in context for any question about connection, compatibility, or relational patterns",
    },
    "spiritual-oracle-session": {
        "domain":  "voice",
        "focus":   "a voice session with your spiritual path, gifts, and awakening stage loaded",
        "reveals": "a subscription spiritual oracle voice session — your spiritual blueprint always in context for any question about your path, gifts, or current stage",
    },
    "crisis-oracle-session": {
        "domain":  "voice",
        "focus":   "immediate synthesis-grounded guidance for urgent decisions and difficult moments",
        "reveals": "a subscription crisis oracle session — immediate spoken guidance with your full synthesis in context, available when decisions cannot wait",
    },
    "oracle-voice-unlimited": {
        "domain":  "voice",
        "focus":   "unlimited synthesis-loaded oracle voice sessions across all domains",
        "reveals": "an unlimited subscription — every voice session type available, all domains, your complete synthesis always loaded, any time you need guidance",
    },
}

# ─────────────────────────────────────────────────────────────
# Subscription tool IDs — use different CTA and framing
# ─────────────────────────────────────────────────────────────
_SUBSCRIPTION_TOOL_IDS: frozenset[str] = frozenset({
    # sacred-script
    "the-life-scribe","love-scribe","wealth-scribe","spiritual-scribe","health-scribe",
    "purpose-scribe","relationship-scribe","grief-scribe","parenting-scribe","business-scribe",
    # time-keeper
    "daily-personal-oracle","monthly-cycle-navigator","quarterly-destiny-pulse",
    "annual-arc-keeper","nine-year-arc-compass",
    # voice
    "oracle-voice-session","oracle-deep-dive-session","love-oracle-session",
    "wealth-oracle-session","purpose-oracle-session","daily-voice-briefing",
    "relationship-oracle-session","spiritual-oracle-session","crisis-oracle-session",
    "oracle-voice-unlimited",
})

def _is_subscription(tool_id: str) -> bool:
    return tool_id in _SUBSCRIPTION_TOOL_IDS


# ─────────────────────────────────────────────────────────────
# Prompt builder
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

    return f"""You are a master reader for KAYAL — a private synthesis platform.
You write hyper-personalised, specific, warm reading previews.
You never mention the names of the engines, disciplines, or methodology behind a reading.
You speak entirely in patterns, observations, and what you see — never in methodology.

Write a personalised teaser for {first_name} for the "{tool_name}" tool.

This tool focuses on: {focus}
The full reading reveals: {reveals}

{first_name}'s data — every number is real, use them:
  Life Path:        {life_path}
  Sun Sign:         {sun_sign} ({sign_element})
  Personal Year:    {py_label} {"(Master year — rare and significant)" if py_master else ""}
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
3. Why right now specifically matters — their Pinnacle {pinnacle_num}, Personal Year {py_label}, and what this timing window means for {focus}.
4. What the full "{tool_name}" reveals — make it feel unmissable. End with "{cta_frame}."

Rules — non-negotiable:
- Never name a discipline, engine, or methodology. No "numerology says", "astrology shows", "palmistry reveals".
- Every sentence must feel written for {first_name} specifically. Nothing generic.
- Speak as a reader who already sees them — not as a system explaining itself.
- Do not promise certainties — speak in patterns, tendencies, and what the reading sees.
- Respond ONLY with the JSON array. No preamble. No explanation.

[
  {{"title": "...", "content": "..."}},
  ...
]"""



# ─────────────────────────────────────────────────────────────
# Main entry point
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

    Args:
        name:           Full birth name
        dob:            Date of birth "YYYY-MM-DD"
        tool_id:        Tool ID — must match tool_registry.py exactly
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

    # ── Resolve tool metadata ─────────────────────────────────
    tool_meta = _TOOL_META.get(tool_id)
    if not tool_meta:
        # Unknown tool — generic fallback
        tool_meta = {
            "domain":  "oracle-temple",
            "focus":   "your complete soul blueprint",
            "reveals": "the full picture of your life path, timing, and purpose",
        }
        logger.warning(f"Unknown tool_id: {tool_id} — using generic fallback")

    domain   = tool_meta["domain"]
    focus    = tool_meta["focus"]
    reveals  = tool_meta["reveals"]
    is_sub   = _is_subscription(tool_id)

    # Friendly display name from ID
    tool_name = tool_id.replace("-", " ").title()

    # ── Parse date of birth ───────────────────────────────────
    try:
        bd    = datetime.strptime(dob, "%Y-%m-%d")
        day   = bd.day
        month = bd.month
        year  = bd.year
    except ValueError:
        return {"error": f"Invalid date format: {dob}. Use YYYY-MM-DD."}

    # ── Calculate numbers ─────────────────────────────────────
    today    = date.today()
    age      = _calculate_age(dob)
    lp       = _life_path(day, month, year)
    sun      = _sun_sign(day, month)
    py       = _personal_year(day, month, today.year)
    pm       = _personal_month(py, today.month)
    dest     = _destiny(name)
    su       = _soul_urge(name)
    pinnacle = _pinnacle_current(day, month, year, today.year)

    # ── Build personalised paragraphs via Claude Haiku ────────
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

    raw = await _call_haiku(prompt)
    paragraphs = _parse_paragraphs(raw, _PARAGRAPH_STYLES) if raw else []

    if not paragraphs:
        logger.error(f"Teaser generation failed for tool_id={tool_id}, session={session_id}")
        return {
            "error":     "generation_failed",
            "tool_id":   tool_id,
            "tool_name": tool_name,
            "session_id": session_id,
        }

    # ── CTA text ──────────────────────────────────────────────
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
