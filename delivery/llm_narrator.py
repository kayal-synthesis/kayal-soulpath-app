"""
LLM Narrator — KAYAL Synthesis Platform
=========================================

Converts a synthesis payload into the final user-facing reading
using the DeepSeek-V4 API.

Model routing by tier:
    Tier 4 (Full)          → deepseek-v4
    Tier 3 (Face + Palm)   → deepseek-v4
    Tier 2 (Face or Palm)  → deepseek-v4
    Tier 1 (Core only)     → deepseek-v4

v4.0.0 — Removed the Individual/Union Blueprint pipeline (both products
retired). This file previously supported two parallel narration paths:
the generic narrate()/narrate_async() used by every real tool purchase,
and a separate narrate_from_package()/narrate_from_package_async() path
built around prompt_builder.py's PromptPackage, used only by the two
retired Blueprint products. The Blueprint-only path is now removed
entirely: narrate_from_package(), narrate_from_package_async(),
_narrate_section(), _narrate_section_async(), _build_document_frame(),
_assemble_full_text(), _NARRATIVE_ORDER, and the % compliance machinery
(_validate_pct_output(), _inject_pct_if_missing(), _PCT_PATTERN,
_BINARY_VERDICTS), all specific to the retired products, are gone.
NarrationResult dropped the Blueprint-only fields it never needed for
the generic path (section_texts, compatibility_percentages,
pct_validated, opening_paragraph, closing_paragraph).

Two real safety mechanisms were found living only inside the now-removed
Blueprint-only functions, meaning the actual live purchase path never
used them. Both are now ported into narrate() and narrate_async()
directly, where every real tool purchase actually goes:
    - Weak-opening retry: if a reading opens with a system label or
      number instead of establishing why the section matters, one retry
      is attempted with a reinforced instruction before the text is
      accepted.
    - _strip_methodology_labels(): the code-level safety net that
      catches methodology terms (Life Path 5, your birth chart, Sun in
      Scorpio, Chaldean, etc.) if they survive the prompt constraints.
      This was previously dead code as far as the real purchase flow
      was concerned; it is now called on every real narration.

The hardcoded tool_type="individual_blueprint" that every prior
NarrationResult carried regardless of what was actually purchased is
also gone, replaced with the real tool_type/tool_id passed in the
payload.

v3.1.0: Switched from Claude (Sonnet/Haiku/Opus) to DeepSeek-V4
v3.1.1: Added em-dash (—) removal to _strip_methodology_labels() and _clean_output_text()
v4.0.1 — _MODEL_DEEPSEEK was hardcoded to "deepseek-v4", not a real
DeepSeek model identifier, while .env's own DEEPSEEK_MODEL correctly
said "deepseek-chat" the whole time, and main.py's own /health endpoint
independently, separately hardcoded "deepseek-chat" too, meaning two
different files already agreed on the right value while this one alone
used something else. Every real narration call was failing against
DeepSeek's API because of this, silently, landing on
_emergency_fallback() every time, "success": true and empty errors[]
included, since that fallback exists specifically to hand back
something rather than nothing, not to signal that anything went wrong.
Now reads DEEPSEEK_MODEL from the environment directly, the same value
already correctly set, rather than hardcoding a second, disagreeing
string that could drift out of sync again.

Author: KAYAL Engineering
Version: 4.0.1
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model constants (v4.0.1 — now reads the real model name from DEEPSEEK_MODEL
# in .env, rather than a hardcoded value that had drifted out of sync with
# it, "deepseek-chat" as the fallback matches what .env and main.py's own
# /health endpoint both already independently agreed was correct)
# ---------------------------------------------------------------------------
_MODEL_DEEPSEEK = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
_DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"

# Legacy model constants preserved for backward compatibility
MODEL_SONNET  = _MODEL_DEEPSEEK
MODEL_HAIKU   = _MODEL_DEEPSEEK
MODEL_OPUS    = _MODEL_DEEPSEEK

_TIER_MODELS = {
    "tier_4_full":        _MODEL_DEEPSEEK,
    "tier_3b_face_palm":  _MODEL_DEEPSEEK,
    "tier_3_palm":        _MODEL_DEEPSEEK,
    "tier_2_face":        _MODEL_DEEPSEEK,
    "tier_2b_palm_only":  _MODEL_DEEPSEEK,
    "tier_1_core":        _MODEL_DEEPSEEK,
}

# ---------------------------------------------------------------------------
# Output models (v2.0.0 — extended with 4 new fields)
# ---------------------------------------------------------------------------
@dataclass
class NarrationResult:
    """Final narration output from the LLM narrator."""
    session_id:      str
    model_used:      str
    tier:            str
    full_text:       str
    domain_sections: Dict[str, str]   # domain → narrated text
    word_count:      int
    tokens_used:     int
    processing_ms:   int
    fallback_used:   bool
    error:           Optional[str]
    tool_type:       str              = ""
    weak_opening_retried: bool        = False
    section_texts:   Dict[str, str]   = field(default_factory=dict)
    section_retry_count: int          = 0
    estimated_pages: int              = 0

# ---------------------------------------------------------------------------
# Tool-aware multi-section narration
# ---------------------------------------------------------------------------
# Real depth requires real structure: one focused LLM call per real content
# promise (each item in the tool's actual whatYouGet list), not one massive
# call asked to cover everything at once. A single long generation degrades
# toward repetition and vagueness well before it reaches genuine length;
# narrower, separately-called sections stay specific because each one only
# has to do one job. This mirrors the retired Blueprint system's real
# strength (one call per section), but is driven by each tool's own real
# content promises instead of two fixed 12/16-section templates.
#
# Depth scales with what was actually paid for, calibrated against the
# item-count tiers already established in the catalog: 8 items ($29-49),
# 9 items ($59), 10 items ($69-79), 12 items ($99). Word target per section
# rises with price too, so the $99 tier reaches a genuine 32-40 pages while
# the $29 tier still delivers a substantial 16-20, not something thin.
# ---------------------------------------------------------------------------
_WORDS_PER_PAGE = 300   # matches standard PDF body formatting
_SECTION_WORD_TIERS = [
    # (price_ceiling, word_lo, word_hi)
    (49,  600, 750),
    (59,  650, 800),
    (79,  700, 900),
    (999, 800, 1000),
]

def _words_per_section_for_price(price: float) -> Tuple[int, int]:
    """Return (low, high) word target per section for a given tool price."""
    for ceiling, lo, hi in _SECTION_WORD_TIERS:
        if price <= ceiling:
            return lo, hi
    return _SECTION_WORD_TIERS[-1][1], _SECTION_WORD_TIERS[-1][2]

def _build_item_section_prompt(
    item_text:      str,
    item_index:     int,
    item_total:     int,
    tool_name:      str,
    name:           str,
    shared_context: str,
    word_target:    int,
) -> str:
    """Build the prompt for narrating a single whatYouGet promise as its own section."""
    return (
        f"You are writing one section of {name}'s personal reading for the tool "
        f"\"{tool_name}\". This is section {item_index} of {item_total}.\n\n"
        f"THIS SECTION'S SPECIFIC JOB — deliver exactly this promise, in full, "
        f"using the real signal data below:\n\"{item_text}\"\n\n"
        f"SIGNAL DATA AVAILABLE FOR THIS READING:\n{shared_context}\n\n"
        f"Use whatever signals above are genuinely relevant to this specific promise. "
        f"Do not force in signals that do not actually serve this section's job.\n\n"
        f"Write approximately {word_target} words. Open with why this specific "
        f"question matters to {name}, not with a system name or a restatement of "
        f"the promise itself. Be concrete and specific to what the signals actually "
        f"show, not generic. End with what this means for {name} going forward, "
        f"not a summary.\n\n"
        f"Never use em-dashes (—). Use commas (,) or periods (.) instead. "
        f"Never mention system names, numbers, or methodology labels."
    )

def _narrate_tool_section(
    item_text:      str,
    item_index:     int,
    item_total:     int,
    tool_name:      str,
    name:           str,
    shared_context: str,
    system:         str,
    word_target:    int,
) -> Tuple[str, int, bool]:
    """Narrate one whatYouGet item as its own section. Sync."""
    prompt = _build_item_section_prompt(
        item_text, item_index, item_total, tool_name, name, shared_context, word_target
    )
    max_tokens = _word_to_tokens(word_target)

    response = _call_deepseek(
        messages=[{"role": "user", "content": prompt}],
        system=system,
        max_tokens=max_tokens,
    )
    text = _extract_text(response)
    tokens = _token_count(response)

    retried = False
    if not _check_opening_sentence(text):
        retried = True
        retry_prompt = (
            prompt
            + "\n\nCRITICAL: Your previous opening was too weak, it led with a system "
            "name, a number, or a restatement of the promise instead of establishing "
            "why this specific question matters to this person right now. Rewrite the "
            "opening. Never use em-dashes (—)."
        )
        try:
            retry_resp = _call_deepseek(
                messages=[{"role": "user", "content": retry_prompt}],
                system=system,
                max_tokens=max_tokens,
            )
            retry_text = _extract_text(retry_resp)
            tokens += _token_count(retry_resp)
            if retry_text and len(retry_text) > 50:
                text = retry_text
        except Exception as e:
            logger.warning(f"Section retry failed [item {item_index}]: {e}")

    text = _strip_methodology_labels(text)
    return text, tokens, retried

async def _narrate_tool_section_async(
    item_text:      str,
    item_index:     int,
    item_total:     int,
    tool_name:      str,
    name:           str,
    shared_context: str,
    system:         str,
    word_target:    int,
) -> Tuple[str, int, bool]:
    """Narrate one whatYouGet item as its own section. Async."""
    prompt = _build_item_section_prompt(
        item_text, item_index, item_total, tool_name, name, shared_context, word_target
    )
    max_tokens = _word_to_tokens(word_target)

    response = await _call_deepseek_async(
        messages=[{"role": "user", "content": prompt}],
        system=system,
        max_tokens=max_tokens,
    )
    text = _extract_text(response)
    tokens = _token_count(response)

    retried = False
    if not _check_opening_sentence(text):
        retried = True
        retry_prompt = (
            prompt
            + "\n\nCRITICAL: Your previous opening was too weak, it led with a system "
            "name, a number, or a restatement of the promise instead of establishing "
            "why this specific question matters to this person right now. Rewrite the "
            "opening. Never use em-dashes (—)."
        )
        try:
            retry_resp = await _call_deepseek_async(
                messages=[{"role": "user", "content": retry_prompt}],
                system=system,
                max_tokens=max_tokens,
            )
            retry_text = _extract_text(retry_resp)
            tokens += _token_count(retry_resp)
            if retry_text and len(retry_text) > 50:
                text = retry_text
        except Exception as e:
            logger.warning(f"Async section retry failed [item {item_index}]: {e}")

    text = _strip_methodology_labels(text)
    return text, tokens, retried

def _build_shared_context(payload: Dict) -> str:
    """Assemble the shared signal context every section can draw from."""
    domains        = payload.get("domains", [])
    timing_summary = payload.get("timing_summary", "")
    journey        = payload.get("journey_narrative", "")
    overall_theme  = payload.get("overall_theme", "")

    parts = []
    for dp in domains:
        domain_name = dp.get("domain", "").replace("_", " ").title()
        block = [f"[{domain_name}]"]
        if dp.get("convergence_level"):    block.append(f"Convergence: {dp['convergence_level']}")
        if dp.get("primary_reading"):      block.append(f"Primary: {dp['primary_reading']}")
        if dp.get("supporting_points"):    block.append(f"Supporting: {' | '.join(dp['supporting_points'][:2])}")
        if dp.get("temporal"):
            t = dp["temporal"]
            block.append(f"Past: {t.get('past','')} Present: {t.get('present','')} Future: {t.get('future','')}")
        if dp.get("tension"):              block.append(f"Tension: {dp['tension']}")
        if dp.get("resolution"):           block.append(f"Resolution: {dp['resolution']}")
        if dp.get("problem"):              block.append(f"Challenge: {dp['problem']}")
        if dp.get("practical_solution"):   block.append(f"Practical path: {dp['practical_solution']}")
        if dp.get("remedy") and dp["remedy"].get("has_remedy"):
            r = dp["remedy"]
            block.append(f"Remedy: {r.get('title','')}, {r.get('description','')[:200]}")
        if dp.get("timing"):               block.append(f"Timing: {dp['timing']}")
        if dp.get("growth_edge"):          block.append(f"Growth edge: {dp['growth_edge']}")
        parts.append("\n".join(block))

    if timing_summary: parts.append(f"[Timing Summary]\n{timing_summary}")
    if journey:         parts.append(f"[Journey]\n{journey}")
    if overall_theme:   parts.append(f"[Overall Theme]\n{overall_theme}")

    # ── Astrocartography, relocation-power-map only ──────────────────────
    # active_lines from main.py's evaluate_astrocartography_location() is
    # raw astronomical data (planet name, line type MC/IC/AC/DC, orb,
    # domains). None of that vocabulary is safe to feed into a prompt
    # directly, planet names and line-type labels are exactly the kind of
    # methodology exposure this whole system exists to avoid. What the
    # model actually needs is which life domains carry a real signal at
    # each location, nothing about how that was calculated.
    def _summarize_location_signal(city: str, active_lines: List[Dict]) -> str:
        if active_lines:
            domains_seen: List[str] = []
            for line in active_lines:
                for d in line.get("domains", []):
                    if d not in domains_seen:
                        domains_seen.append(d)
            domain_phrase = ", ".join(d.replace("_", " ") for d in domains_seen[:5])
            strength = "a strong" if len(active_lines) >= 3 else "a real"
            return (
                f"{city}: carries {strength} astronomical signal connected "
                f"specifically to: {domain_phrase}."
            )
        return (
            f"{city}: shows no notably strong astronomical signal in either "
            f"direction, a relatively neutral place for this person, neither "
            f"working strongly for them nor against them. This is a real, "
            f"honest finding, reflect it plainly rather than inventing a "
            f"stronger signal than is actually present."
        )

    astro_data = payload.get("astrocartography")
    if astro_data:
        current_city    = astro_data.get("current_city", "this location")
        current_lines   = astro_data.get("active_lines", [])
        candidates      = astro_data.get("candidates", [])

        location_summaries = [_summarize_location_signal(current_city, current_lines)]
        for cand in candidates:
            location_summaries.append(
                _summarize_location_signal(cand.get("city", "the candidate city"), cand.get("active_lines", []))
            )

        if candidates:
            parts.append(
                f"[Location Signal, Comparison]\n"
                + "\n".join(location_summaries) +
                f"\n\nThe person is directly weighing these specific places against "
                f"each other, not just asking about their current location in "
                f"isolation. Compare them honestly, if one genuinely carries a "
                f"stronger signal for what this person actually needs, say so "
                f"plainly, do not artificially balance the comparison if the real "
                f"signals are not actually balanced."
            )
        else:
            parts.append(f"[Location Signal]\n{location_summaries[0]}\n\nFactor this directly into whether this place is working with or against their pattern, and what that means for staying, adjusting their relationship to this place, or considering a move.")

    return "\n\n".join(parts)

def narrate_tool(
    tool_payload: Dict,
    use_opus:     bool = False,
    fallback:     bool = True,
) -> NarrationResult:
    """
    Tool-aware narrator — one real LLM call per whatYouGet promise, assembled
    into a genuinely deep, tool-specific reading. This is the real replacement
    for asking a single call to cover everything at once.

    tool_payload requires, in addition to the standard narrate() fields:
        tool_id:      str
        tool_name:    str
        tool_price:   float
        what_you_get: List[str]   — the tool's real, catalog-grounded promises
    """
    t0         = time.monotonic()
    session_id = tool_payload.get("session_id", "unknown")
    tier_key   = _extract_tier_key(tool_payload)
    tool_id    = tool_payload.get("tool_id", "")
    tool_name  = tool_payload.get("tool_name", "this reading")
    tool_price = float(tool_payload.get("tool_price", 29))
    what_you_get: List[str] = tool_payload.get("what_you_get", [])

    name           = tool_payload.get("user_name", "you")
    cultural_ctx   = tool_payload.get("cultural_context", "")
    narration_tone = tool_payload.get("narration_tone", "warm and direct")

    if not what_you_get:
        logger.warning(f"narrate_tool called with no what_you_get items [{tool_id}]")
        return narrate(tool_payload, use_opus=use_opus, fallback=fallback)

    word_lo, word_hi = _words_per_section_for_price(tool_price)
    word_target = (word_lo + word_hi) // 2

    system = _system_prompt(cultural_ctx, narration_tone)
    shared_context = _build_shared_context(tool_payload)

    section_texts: Dict[str, str] = {}
    tokens_used = 0
    retry_count = 0
    error = None
    fallback_used = False

    try:
        for i, item in enumerate(what_you_get, start=1):
            text, tokens, retried = _narrate_tool_section(
                item, i, len(what_you_get), tool_name, name,
                shared_context, system, word_target,
            )
            section_texts[f"section_{i}"] = text
            tokens_used += tokens
            if retried:
                retry_count += 1
    except Exception as e:
        error = str(e)
        logger.error(f"Tool narration error [{tool_id}]: {e}")
        if fallback:
            fallback_used = True
            payload_for_fallback = dict(tool_payload)
            payload_for_fallback.setdefault("word_count_target", word_target * len(what_you_get))
            fb = narrate(payload_for_fallback, use_opus=use_opus, fallback=True)
            return fb

    full_text = "\n\n".join(section_texts.values())
    word_count = len(full_text.split())
    estimated_pages = max(1, round(word_count / _WORDS_PER_PAGE))
    processing_ms = int((time.monotonic() - t0) * 1000)

    logger.info("Narrator.narrate_tool completed", extra={
        "session_id": session_id, "tool_id": tool_id, "tool_price": tool_price,
        "sections": len(what_you_get), "words": word_count, "pages": estimated_pages,
        "tokens": tokens_used, "section_retries": retry_count, "ms": processing_ms,
    })

    return NarrationResult(
        session_id=session_id, model_used=_MODEL_DEEPSEEK, tier=tier_key,
        full_text=full_text, domain_sections={}, word_count=word_count,
        tokens_used=tokens_used, processing_ms=processing_ms,
        fallback_used=fallback_used, error=error, tool_type=tool_id,
        section_texts=section_texts, section_retry_count=retry_count,
        estimated_pages=estimated_pages,
    )

async def narrate_tool_async(
    tool_payload: Dict,
    use_opus:     bool = False,
    fallback:     bool = True,
) -> NarrationResult:
    """Async version of narrate_tool(). Sections narrate concurrently."""
    t0         = time.monotonic()
    session_id = tool_payload.get("session_id", "unknown")
    tier_key   = _extract_tier_key(tool_payload)
    tool_id    = tool_payload.get("tool_id", "")
    tool_name  = tool_payload.get("tool_name", "this reading")
    tool_price = float(tool_payload.get("tool_price", 29))
    what_you_get: List[str] = tool_payload.get("what_you_get", [])

    name           = tool_payload.get("user_name", "you")
    cultural_ctx   = tool_payload.get("cultural_context", "")
    narration_tone = tool_payload.get("narration_tone", "warm and direct")

    if not what_you_get:
        logger.warning(f"narrate_tool_async called with no what_you_get items [{tool_id}]")
        return await narrate_async(tool_payload, use_opus=use_opus, fallback=fallback)

    word_lo, word_hi = _words_per_section_for_price(tool_price)
    word_target = (word_lo + word_hi) // 2

    system = _system_prompt(cultural_ctx, narration_tone)
    shared_context = _build_shared_context(tool_payload)

    error = None
    fallback_used = False

    try:
        results = await asyncio.gather(*[
            _narrate_tool_section_async(
                item, i, len(what_you_get), tool_name, name,
                shared_context, system, word_target,
            )
            for i, item in enumerate(what_you_get, start=1)
        ])
    except Exception as e:
        error = str(e)
        logger.error(f"Async tool narration error [{tool_id}]: {e}")
        if fallback:
            fallback_used = True
            payload_for_fallback = dict(tool_payload)
            payload_for_fallback.setdefault("word_count_target", word_target * len(what_you_get))
            return await narrate_async(payload_for_fallback, use_opus=use_opus, fallback=True)
        results = []

    section_texts: Dict[str, str] = {}
    tokens_used = 0
    retry_count = 0
    for i, (text, tokens, retried) in enumerate(results, start=1):
        section_texts[f"section_{i}"] = text
        tokens_used += tokens
        if retried:
            retry_count += 1

    full_text = "\n\n".join(section_texts.values())
    word_count = len(full_text.split())
    estimated_pages = max(1, round(word_count / _WORDS_PER_PAGE))
    processing_ms = int((time.monotonic() - t0) * 1000)

    logger.info("Narrator.narrate_tool_async completed", extra={
        "session_id": session_id, "tool_id": tool_id, "tool_price": tool_price,
        "sections": len(what_you_get), "words": word_count, "pages": estimated_pages,
        "tokens": tokens_used, "section_retries": retry_count, "ms": processing_ms,
    })

    return NarrationResult(
        session_id=session_id, model_used=_MODEL_DEEPSEEK, tier=tier_key,
        full_text=full_text, domain_sections={}, word_count=word_count,
        tokens_used=tokens_used, processing_ms=processing_ms,
        fallback_used=fallback_used, error=error, tool_type=tool_id,
        section_texts=section_texts, section_retry_count=retry_count,
        estimated_pages=estimated_pages,
    )

# ---------------------------------------------------------------------------
# Prompt builders (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------
def _system_prompt(cultural_context: str, narration_tone: str) -> str:
    return f"""You are the narrator of a personalised life reading for KAYAL, a sophisticated synthesis platform.

Your role is to transform structured insight data into flowing, meaningful, deeply personalised prose.

VOICE AND TONE:
{narration_tone}

CULTURAL CONTEXT:
{cultural_context}

NARRATIVE ARC — every section and the reading as a whole must follow this structure:

1. SIGNIFICANCE  — Open by establishing why this dimension of life matters and what most people
                   get wrong or never understand about it. The first two sentences decide whether
                   the reader continues. A weak opening (name + number, generic statement) is a
                   desk rejection. A strong opening creates immediate relevance.

2. GAP           — Name what has been missing from this person's self-understanding in this domain.
                   Specific to their signals — not generic ("most people don't know themselves").

3. REVELATION    — Deliver what this synthesis specifically shows. Concrete. Personal.
                   Specific to this person's life — not the system or number that produced it.

4. IMPACT        — Land the real-world consequence. What changes because of this insight?
                   End every section here — never with a summary or restatement.

RULES — follow these precisely:
1. Write in second person ("you", "your") — direct, warm, personal
2. Never mention system names or numbers in the output.
   Do not say "astrology says", "the palm shows", "numerology indicates",
   "Life Path 5", "Personal Year 7", "Sun in Scorpio", "your Pinnacle",
   "your Destiny number", "your chart", "your Ascendant", "Saturn return".
   Instead say what it means: "the pattern that runs through your life is...",
   "the current chapter is asking for...", "the direction you are moving toward is...".
   The visitor must feel seen — not taught. The reading is revelation, not a report.
3. Never use esoteric vocabulary: no sephiroth, no chakra names in Sanskrit, no Kabbalistic terms,
   no Ba Zi terminology — translate everything into plain insight language
4. The temporal arc (past/present/future) should flow naturally in each domain — not labelled as
   "PAST:", "PRESENT:", "FUTURE:" but woven as a continuous narrative
5. Remedies should be presented as invitations, not prescriptions
6. Problems should be named clearly but framed as growth opportunities, not verdicts
7. Write with warmth and respect — you are speaking to a whole human being, not analysing a data set
8. Do not pad or repeat. Every sentence should add something new
9. Honour the word count target — not a strict limit but a guide for depth
10. Never use em-dashes (—) in your writing. Use commas (,) or periods (.) instead.

FORMAT:
- Start with a brief overall opening paragraph (2-3 sentences) that establishes significance
- Then a section for each domain provided
- Close with the timing and journey narrative
- End with the overall theme as a closing paragraph that lands — not summarises"""

def _domain_prompt_sonnet(domain_payloads, timing, journey, overall, name, word_target):
    domains_text = ""
    for dp in domain_payloads:
        domain_name = dp["domain"].replace("_", " ").title()
        domains_text += f"\n\n## {domain_name}\n"
        domains_text += f"Convergence: {dp['convergence_level']}\n"
        domains_text += f"Primary: {dp['primary_reading']}\n"
        if dp.get("supporting_points"):
            domains_text += f"Supporting: {' | '.join(dp['supporting_points'][:2])}\n"
        if dp.get("temporal"):
            t = dp["temporal"]
            domains_text += f"Past: {t['past']}\nPresent: {t['present']}\nFuture: {t['future']}\n"
        if dp.get("tension"):    domains_text += f"Tension: {dp['tension']}\n"
        if dp.get("resolution"): domains_text += f"Resolution: {dp['resolution']}\n"
        if dp.get("problem"):    domains_text += f"Challenge: {dp['problem']}\n"
        if dp.get("practical_solution"): domains_text += f"Practical path: {dp['practical_solution']}\n"
        if dp.get("remedy") and dp["remedy"].get("has_remedy"):
            r = dp["remedy"]
            domains_text += f"Spiritual practice: {r['title']}, {r['description'][:200]}\n"
            domains_text += f"How: {r['timing']} for {r['duration']}\n"
            if r.get("mantra_or_prayer"):
                domains_text += f"Practice: {r['mantra_or_prayer']}\n"
        if dp.get("timing"):      domains_text += f"Timing: {dp['timing']}\n"
        if dp.get("growth_edge"): domains_text += f"Growth edge: {dp['growth_edge']}\n"
        domains_text += f"Tone instruction: {dp['tone_instruction']}\n"

    return (
        f"Write a complete, flowing reading for {name} using the structured data below.\n\n"
        f"Target approximately {word_target} words total.\n"
        "Weave the temporal arc (past/present/future) naturally into each domain's narrative.\n"
        "Present spiritual practices as gentle invitations, not prescriptions.\n\n"
        f"STRUCTURED DATA:\n{domains_text}\n\n"
        f"TIMING CONTEXT:\n{timing}\n\n"
        f"JOURNEY NARRATIVE:\n{journey}\n\n"
        f"OVERALL THEME:\n{overall}\n\n"
        f"Write the complete reading now. Begin with {name}'s name."
    )

def _domain_prompt_haiku(domain, name):
    domain_name = domain["domain"].replace("_", " ").title()
    temporal_text = ""
    if domain.get("temporal"):
        t = domain["temporal"]
        temporal_text = f"\nPast pattern: {t['past']}\nPresent reality: {t['present']}\nFuture trajectory: {t['future']}"

    remedy_text = ""
    if domain.get("remedy") and domain["remedy"].get("has_remedy"):
        r = domain["remedy"]
        remedy_text = f"\nSpiritual practice: {r['title']}\nHow: {r['description'][:150]}\nTiming: {r['timing']}"

    problem_text = ""
    if domain.get("problem"):
        problem_text = f"\nChallenge identified: {domain['problem']}"
    if domain.get("practical_solution"):
        problem_text += f"\nPractical path: {domain['practical_solution'][:150]}"

    return (
        f"Write a warm, flowing paragraph about {name}'s {domain_name} life.\n\n"
        f"INSIGHT DATA:\nMain reading: {domain['primary_reading']}\n"
        f"{temporal_text}\n{problem_text}\n{remedy_text}\n"
        f"Growth edge: {domain.get('growth_edge', '')}\n"
        f"Tone: {domain['tone_instruction']}\n\n"
        "Write 120-180 words. Second person. No system names. Weave past/present/future naturally.\n"
        "If a spiritual practice is included, present it as a gentle invitation.\nBegin writing now:"
    )

# ---------------------------------------------------------------------------
# Output text cleaner — removes em-dashes and cleans punctuation
# ---------------------------------------------------------------------------
def _clean_output_text(text: str) -> str:
    """
    Clean output text by removing em-dashes and fixing punctuation artifacts.
    This is the final safety net before text is returned to the caller.
    """
    if not text:
        return text

    # ── Remove em-dashes and en-dashes ──────────────────────
    # Replace em-dash with comma + space
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    # ── Clean up punctuation artifacts ──────────────────────
    # Remove double commas
    text = re.sub(r',\s*,', ',', text)
    # Remove comma before period
    text = re.sub(r',\s*\.', '.', text)
    # Remove period before comma
    text = re.sub(r'\.\s*,', '.', text)
    # Remove comma at end of sentence
    text = re.sub(r',\s*\.', '.', text)
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r'\s+([,\.;:!?])', r'\1', text)
    # Clean up spaces after opening quotes
    text = re.sub(r'"\s+', '"', text)
    # Clean up spaces before closing quotes
    text = re.sub(r'\s+"', '"', text)
    # ── Remove double spaces ────────────────────────────────
    text = re.sub(r'\s+', ' ', text)
    # Remove any remaining double commas
    text = re.sub(r',\s*,', ',', text)

    # ── Strip leading/trailing whitespace ────────────────────
    text = text.strip()

    return text

# ---------------------------------------------------------------------------
# DeepSeek API callers (v3.1.0 — replaced Anthropic)
# ---------------------------------------------------------------------------
def _call_deepseek(
    messages: List[Dict],
    system: str,
    max_tokens: int,
    temperature: float = 0.7,
) -> Dict:
    """Call DeepSeek-V4 synchronously."""
    try:
        import httpx
    except ImportError:
        raise ImportError("httpx required. Install with: pip install httpx")

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set in environment")

    # DeepSeek uses OpenAI-compatible format — system prompt as first message
    openai_messages = [{"role": "system", "content": system}] + messages

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            _DEEPSEEK_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": _MODEL_DEEPSEEK,
                "messages": openai_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        )

        if response.status_code == 401:
            raise RuntimeError("DeepSeek API key invalid or missing. Check DEEPSEEK_API_KEY in .env")

        if not response.is_success:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text[:300])
            except Exception:
                err_msg = response.text[:300]
            raise RuntimeError(f"DeepSeek API {response.status_code}: {err_msg}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("DeepSeek API returned no choices")

        content = choices[0].get("message", {}).get("content", "")

        # Convert to Anthropic-compatible format for downstream compatibility
        return {
            "content": [{"type": "text", "text": content}],
            "usage": {
                "input_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "output_tokens": data.get("usage", {}).get("completion_tokens", 0),
            },
            "model": _MODEL_DEEPSEEK,
        }

async def _call_deepseek_async(
    messages: List[Dict],
    system: str,
    max_tokens: int,
    temperature: float = 0.7,
    stream: bool = False,
) -> Dict:
    """Call DeepSeek-V4 asynchronously."""
    try:
        import httpx
    except ImportError:
        raise ImportError("httpx required. Install with: pip install httpx")

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set in environment")

    openai_messages = [{"role": "system", "content": system}] + messages

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            _DEEPSEEK_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": _MODEL_DEEPSEEK,
                "messages": openai_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": stream,
            }
        )

        if not response.is_success:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text[:300])
            except Exception:
                err_msg = response.text[:300]
            raise RuntimeError(f"DeepSeek API {response.status_code}: {err_msg}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("DeepSeek API returned no choices")

        content = choices[0].get("message", {}).get("content", "")

        return {
            "content": [{"type": "text", "text": content}],
            "usage": {
                "input_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "output_tokens": data.get("usage", {}).get("completion_tokens", 0),
            },
            "model": _MODEL_DEEPSEEK,
        }

# Legacy function names — preserved for backward compatibility
async def _call_anthropic_async(messages, system, model, max_tokens, stream=False):
    """Legacy wrapper — now calls DeepSeek."""
    return await _call_deepseek_async(messages, system, max_tokens, stream=stream)

def _call_anthropic_sync(messages, system, model, max_tokens):
    """Legacy wrapper — now calls DeepSeek."""
    return _call_deepseek(messages, system, max_tokens)

def _extract_text(response: Dict) -> str:
    content = response.get("content", [])
    text = " ".join(block.get("text", "") for block in content if block.get("type") == "text").strip()
    # Clean em-dashes from extracted text immediately
    return _clean_output_text(text)

def _token_count(response: Dict) -> int:
    usage = response.get("usage", {})
    return usage.get("input_tokens", 0) + usage.get("output_tokens", 0)

def _word_to_tokens(word_count: int) -> int:
    return min(4096, int(word_count / 0.75) + 200)

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# v3.0.0 — Methodology label stripper (final safety net)
# ---------------------------------------------------------------------------
_METHODOLOGY_STRIP_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r'\bLife Path\s+\d+\b',          re.IGNORECASE), "your core pattern"),
    (re.compile(r'\bLife Path\s+number\s+\d+\b', re.IGNORECASE), "your core pattern"),
    (re.compile(r'\bPersonal Year\s+\d+\b',       re.IGNORECASE), "this current chapter"),
    (re.compile(r'\bPinnacle\s+\d+\b',            re.IGNORECASE), "this life chapter"),
    (re.compile(r'\bDestiny [Nn]umber\s+\d+\b',   re.IGNORECASE), "your life direction"),
    (re.compile(r'\bSoul Urge\s+\d+\b',           re.IGNORECASE), "your inner drive"),
    (re.compile(r'\bPersonality [Nn]umber\s+\d+\b', re.IGNORECASE), "how others experience you"),
    (re.compile(r'\bBirthday [Nn]umber\s+\d+\b',  re.IGNORECASE), "your natural gift"),
    (re.compile(r'\bMaster [Nn]umber\s+\d+\b',    re.IGNORECASE), "this heightened calling"),
    (re.compile(r'\b(Sun|Moon|Mars|Venus|Jupiter|Saturn|Mercury|Uranus|Neptune|Pluto)\s+in\s+[A-Z][a-z]+\b'), "this placement"),
    (re.compile(r'\b(your|the)\s+(Sun|Moon|Ascendant|Midheaven|North Node|South Node)\b', re.IGNORECASE), "this indicator"),
    (re.compile(r'\b(Saturn|Jupiter)\s+[Rr]eturn\b'), "this structural cycle"),
    (re.compile(r'\bVedic [Dd]asha\b'),            "the active cycle"),
    (re.compile(r'\b[A-Z][a-z]+ [Dd]asha\b'),     "the active cycle"),
    (re.compile(r'\b(Rahu|Ketu|Atmakaraka)\b',    re.IGNORECASE), "the soul indicator"),
    (re.compile(r'\b[Nn]umerology\s+(shows|reveals|indicates|suggests|points to)\b'), "the pattern reveals"),
    (re.compile(r'\b[Aa]strology\s+(shows|reveals|indicates|suggests|points to)\b'),  "the indicators reveal"),
    (re.compile(r'\b(your|the)\s+[Nn]umerology\b'), "the patterns"),
    (re.compile(r'\b(your|the)\s+(birth\s+|natal\s+|numerology\s+|composite\s+)?[Cc]hart\b', re.IGNORECASE), "the synthesis"),
    (re.compile(r'\baccording to (numerology|astrology|the chart|the reading|palmistry)\b', re.IGNORECASE), "the synthesis shows"),
    (re.compile(r'\bnumerologically speaking\b',  re.IGNORECASE), "structurally"),
    (re.compile(r'\bastrologically speaking\b',   re.IGNORECASE), "structurally"),
    (re.compile(r'\b(as an?|typical of|being an?)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)s?\b', re.IGNORECASE), "with this specific placement"),
    (re.compile(r'\b[Cc]haldean\b'), "this cross-check"),
    (re.compile(r'\b[Kk]armic\s+[Dd]ebt\s+[Nn]umber\s+\d+\b'), "this karmic pattern"),
    # Astrocartography-specific, added alongside relocation-power-map. The
    # shared context passed into the prompt is already translated into
    # plain language before the model ever sees it (see
    # _build_shared_context()'s astrocartography block), so these exist as
    # a genuine safety net, in case the model surfaces this vocabulary on
    # its own from training data, not because raw line-type labels are
    # ever deliberately fed into a prompt.
    (re.compile(r'\b(MC|IC|AC|DC)\s+line\b', re.IGNORECASE), "this signal"),
    (re.compile(r'\b(Midheaven|Ascendant|Descendant|Imum\s+Coeli)\s+line\b', re.IGNORECASE), "this signal"),
    (re.compile(r'\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Rahu)\s+line\b'), "this signal"),
    (re.compile(r'\b[Aa]strocartography\b'), "this location reading"),
    (re.compile(r'\b(relocation|relocated)\s+chart\b', re.IGNORECASE), "this reading"),
    (re.compile(r'\bplanetary\s+lines?\b', re.IGNORECASE), "location signals"),
]

def _strip_methodology_labels(text: str) -> str:
    """
    Final safety net — strip any system labels or numbers that survived the prompt constraints.
    Also removes em-dashes and cleans up punctuation.
    """
    if not text:
        return text

    # ── Remove em-dashes and en-dashes ──────────────────────
    # Replace em-dash with comma + space
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    # ── Clean up punctuation artifacts ──────────────────────
    # Remove double commas
    text = re.sub(r',\s*,', ',', text)
    # Remove comma before period
    text = re.sub(r',\s*\.', '.', text)
    # Remove period before comma
    text = re.sub(r'\.\s*,', '.', text)
    # Remove comma at end of sentence
    text = re.sub(r',\s*\.', '.', text)
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r'\s+([,\.;:!?])', r'\1', text)
    # Clean up spaces after opening quotes
    text = re.sub(r'"\s+', '"', text)
    # Clean up spaces before closing quotes
    text = re.sub(r'\s+"', '"', text)

    # ── Strip methodology labels ─────────────────────────────
    for pattern, replacement in _METHODOLOGY_STRIP_PATTERNS:
        original = text
        text = pattern.sub(replacement, text)
        if text != original:
            logger.debug(
                "Methodology label stripped from output",
                extra={"pattern": str(pattern.pattern)[:60], "replacement": replacement},
            )

    # ── Final cleanup ────────────────────────────────────────
    # Remove any remaining double spaces
    text = re.sub(r'\s+', ' ', text)
    # Remove any remaining double commas
    text = re.sub(r',\s*,', ',', text)
    # ── Clean up any remaining em-dashes that might have been missed ──
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    return text.strip()

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Opening sentence enforcement — used by narrate() and narrate_async()
# ---------------------------------------------------------------------------
_WEAK_OPENING_PATTERNS = [
    r"^your life path \d",
    r"^[a-z]+'s life path",
    r"^as a life path",
    r"^in numerology",
    r"^your sun sign",
    r"^born under",
    r"^your chart",
    r"^the chart",
    r"^according to",
    r"^based on",
    r"^this section",
    r"^in this reading",
    r"^life path \d",
    r"^personal year \d",
    r"^your personal year",
    r"^your destiny number",
    r"^your soul urge",
    r"^your pinnacle",
    r"^your numerology",
    r"^numerology (shows|suggests|indicates|reveals|points)",
    r"^astrology (shows|suggests|indicates|reveals|points)",
    r"^the numerology",
    r"^the astrology",
    r"^the palm (shows|reveals|indicates)",
    r"^palm reading",
    r"^the face (shows|reveals|indicates)",
    r"^facial analysis",
    r"^with (your|a) (sun|moon|mars|venus|jupiter|saturn|mercury) in",
    r"^your (sun|moon|mars|venus|jupiter|saturn|mercury) (is|in|placement)",
    r"^[a-z]+ (is a|is an) \d",
    r"^the synthesis (shows|reveals|indicates)",
    r"^this reading (shows|reveals|tells|indicates)",
]
_WEAK_OPENING_RE = re.compile("|".join(_WEAK_OPENING_PATTERNS), re.IGNORECASE)

def _check_opening_sentence(text: str) -> bool:
    """Return True if the opening sentence is strong (significance-first)."""
    first_sentence = text.split(".")[0].strip()
    return not bool(_WEAK_OPENING_RE.match(first_sentence))

# ---------------------------------------------------------------------------
# Generic narration entry point — used for every real tool purchase
# ---------------------------------------------------------------------------
def narrate(
    llm_payload:   Dict,
    use_opus:      bool = False,
    fallback:      bool = True,
) -> NarrationResult:
    """Generic narrator — used for every real tool purchase. Uses DeepSeek."""
    t0         = time.monotonic()
    session_id = llm_payload.get("session_id", "unknown")
    tier       = llm_payload.get("tier_description", "")
    tier_key   = _extract_tier_key(llm_payload)
    tool_type  = llm_payload.get("tool_type") or llm_payload.get("tool_id") or "reading"

    primary_model = _MODEL_DEEPSEEK

    name           = llm_payload.get("user_name", "you")
    cultural_ctx   = llm_payload.get("cultural_context", "")
    narration_tone = llm_payload.get("narration_tone", "warm and direct")
    word_target    = llm_payload.get("word_count_target", 2000)
    domains        = llm_payload.get("domains", [])
    timing_summary = llm_payload.get("timing_summary", "")
    journey        = llm_payload.get("journey_narrative", "")
    overall_theme  = llm_payload.get("overall_theme", "")

    system = _system_prompt(cultural_ctx, narration_tone)
    max_tokens = _word_to_tokens(word_target)

    karmic_preamble = ""
    if llm_payload.get("has_karmic_debts") and llm_payload.get("karmic_debt_summary"):
        karmic_preamble = f"\nKARMIC CONTEXT (weave this into spiritual/character sections naturally):\n{llm_payload['karmic_debt_summary']}\n"

    pinnacle_preamble = ""
    if llm_payload.get("pinnacle_summary"):
        pinnacle_preamble = f"\nLIFE CYCLE CONTEXT:\n{llm_payload['pinnacle_summary']}\n"

    fallback_used = False; full_text = ""; domain_sections: Dict[str, str] = {}
    tokens_used = 0; error = None; weak_opening_retried = False

    try:
        user_prompt = (
            karmic_preamble + pinnacle_preamble +
            _domain_prompt_sonnet(domains, timing_summary, journey, overall_theme, name, word_target)
        )

        response = _call_deepseek(
            messages=[{"role": "user", "content": user_prompt}],
            system=system,
            max_tokens=max_tokens,
        )
        full_text = _extract_text(response)
        tokens_used = _token_count(response)

        # Weak-opening retry — the reader decides whether to keep reading in the
        # first sentence, so a section that opens with a system label or number
        # gets one retry with a reinforced instruction before we accept it.
        if not _check_opening_sentence(full_text):
            logger.info(
                "Weak opening sentence detected — retrying with framing instruction",
                extra={"session_id": session_id, "opening": full_text[:80]},
            )
            weak_opening_retried = True
            retry_user_prompt = (
                user_prompt
                + "\n\nCRITICAL: Your previous opening was too weak, it led with a system name, "
                "a number label, or a methodology reference before establishing why this dimension "
                "of life matters to this specific person. "
                "Rewrite. Open with the SIGNIFICANCE: the cost, the problem, or the question "
                "that makes this reading urgent. The reader must feel 'this is about me' "
                "before they encounter any specific data. "
                "Do not begin with the person's name, any system label (Life Path, Personal Year, "
                "Sun sign, Pinnacle, Destiny number, Saturn return), any number, or any phrase "
                "that names the method rather than what it reveals. "
                "Open with the lived reality, the thing the person recognises before you explain "
                "anything about how you know it. "
                "Never use em-dashes (—). Use commas (,) instead."
            )
            try:
                retry_resp = _call_deepseek(
                    messages=[{"role": "user", "content": retry_user_prompt}],
                    system=system,
                    max_tokens=max_tokens,
                )
                retry_text = _extract_text(retry_resp)
                tokens_used += _token_count(retry_resp)
                if retry_text and len(retry_text) > 50:
                    full_text = retry_text
            except Exception as e:
                logger.warning(f"Opening sentence retry failed [{session_id}]: {e}")

        # Final safety net — strip any methodology labels or numbers that
        # survived the prompt constraints and the retry above.
        full_text = _strip_methodology_labels(full_text)
        domain_sections = _split_into_sections(full_text, domains)

    except Exception as e:
        error = str(e)
        logger.error(f"NarrationError primary model ({primary_model}): {e}")
        if fallback:
            fallback_used = True
            try:
                fp = _condensed_fallback_prompt(llm_payload)
                r = _call_deepseek(
                    messages=[{"role": "user", "content": fp}],
                    system=system,
                    max_tokens=1200,
                )
                full_text = _strip_methodology_labels(_extract_text(r))
                tokens_used = _token_count(r)
                error = None
            except Exception as e2:
                error = f"Primary: {error} | Fallback: {str(e2)}"
                full_text = _emergency_fallback(llm_payload)

    word_count = len(full_text.split()); processing_ms = int((time.monotonic() - t0) * 1000)

    logger.info("Narrator.narrate completed", extra={
        "session_id": session_id, "model": primary_model, "tier": tier_key,
        "tool_type": tool_type, "words": word_count, "tokens": tokens_used,
        "fallback": fallback_used, "weak_opening_retried": weak_opening_retried, "ms": processing_ms,
    })

    return NarrationResult(
        session_id=session_id, model_used=primary_model,
        tier=tier_key, full_text=full_text, domain_sections=domain_sections,
        word_count=word_count, tokens_used=tokens_used, processing_ms=processing_ms,
        fallback_used=fallback_used, error=error, tool_type=tool_type,
        weak_opening_retried=weak_opening_retried,
    )

async def narrate_async(
    llm_payload: Dict,
    use_opus:    bool = False,
    fallback:    bool = True,
) -> NarrationResult:
    """Async legacy narrate() — now uses DeepSeek."""
    t0            = time.monotonic()
    session_id    = llm_payload.get("session_id", "unknown")
    tier_key      = _extract_tier_key(llm_payload)
    tool_type     = llm_payload.get("tool_type") or llm_payload.get("tool_id") or "reading"

    primary_model = _MODEL_DEEPSEEK

    name           = llm_payload.get("user_name", "you")
    cultural_ctx   = llm_payload.get("cultural_context", "")
    narration_tone = llm_payload.get("narration_tone", "warm and direct")
    word_target    = llm_payload.get("word_count_target", 2000)
    domains        = llm_payload.get("domains", [])
    timing_summary = llm_payload.get("timing_summary", "")
    journey        = llm_payload.get("journey_narrative", "")
    overall_theme  = llm_payload.get("overall_theme", "")

    system    = _system_prompt(cultural_ctx, narration_tone)
    max_tokens = _word_to_tokens(word_target)

    karmic_preamble   = f"\nKARMIC CONTEXT:\n{llm_payload['karmic_debt_summary']}\n" if llm_payload.get("has_karmic_debts") else ""
    pinnacle_preamble = f"\nLIFE CYCLE:\n{llm_payload['pinnacle_summary']}\n"         if llm_payload.get("pinnacle_summary") else ""

    fallback_used = False; full_text = ""; domain_sections: Dict[str, str] = {}
    tokens_used = 0; error = None; weak_opening_retried = False

    try:
        user_prompt = karmic_preamble + pinnacle_preamble + _domain_prompt_sonnet(domains, timing_summary, journey, overall_theme, name, word_target)

        response = await _call_deepseek_async(
            messages=[{"role": "user", "content": user_prompt}],
            system=system,
            max_tokens=max_tokens,
        )
        full_text = _extract_text(response)
        tokens_used = _token_count(response)

        if not _check_opening_sentence(full_text):
            logger.info(
                "Weak opening sentence detected — retrying with framing instruction",
                extra={"session_id": session_id, "opening": full_text[:80]},
            )
            weak_opening_retried = True
            retry_user_prompt = (
                user_prompt
                + "\n\nCRITICAL: Your previous opening was too weak, it led with a system name, "
                "a number label, or a methodology reference before establishing why this dimension "
                "of life matters to this specific person. "
                "Rewrite. Open with the SIGNIFICANCE: the cost, the problem, or the question "
                "that makes this reading urgent. Never use em-dashes (—). Use commas (,) instead."
            )
            try:
                retry_resp = await _call_deepseek_async(
                    messages=[{"role": "user", "content": retry_user_prompt}],
                    system=system,
                    max_tokens=max_tokens,
                )
                retry_text = _extract_text(retry_resp)
                tokens_used += _token_count(retry_resp)
                if retry_text and len(retry_text) > 50:
                    full_text = retry_text
            except Exception as e:
                logger.warning(f"Opening sentence retry failed [{session_id}]: {e}")

        full_text = _strip_methodology_labels(full_text)
        domain_sections = _split_into_sections(full_text, domains)

    except Exception as e:
        error = str(e); logger.error(f"Async narration error ({primary_model}): {e}")
        if fallback:
            fallback_used = True
            try:
                r = await _call_deepseek_async(
                    messages=[{"role": "user", "content": _condensed_fallback_prompt(llm_payload)}],
                    system=system,
                    max_tokens=1200,
                )
                full_text = _strip_methodology_labels(_extract_text(r))
                tokens_used = _token_count(r)
                error = None
            except Exception as e2:
                full_text = _emergency_fallback(llm_payload)
                error = f"Primary: {error} | Fallback: {str(e2)}"

    return NarrationResult(
        session_id=session_id, model_used=primary_model,
        tier=tier_key, full_text=full_text, domain_sections=domain_sections,
        word_count=len(full_text.split()), tokens_used=tokens_used,
        processing_ms=int((time.monotonic() - t0) * 1000), fallback_used=fallback_used, error=error,
        tool_type=tool_type, weak_opening_retried=weak_opening_retried,
    )

# ---------------------------------------------------------------------------
# Utility helpers (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------
def _extract_tier_key(payload: Dict) -> str:
    desc = payload.get("tier_description", "").lower()
    if "complete four" in desc or "tier_4" in desc or "four-system" in desc: return "tier_4_full"
    elif "face and palm" in desc or "tier_3b" in desc: return "tier_3b_face_palm"
    elif "both palms" in desc or "tier_3_palm" in desc: return "tier_3_palm"
    elif "core with face" in desc or "tier_2_face" in desc: return "tier_2_face"
    elif "core with palm" in desc or "tier_2b" in desc: return "tier_2b_palm_only"
    return "tier_1_core"

def _split_into_sections(full_text: str, domains: List[Dict]) -> Dict[str, str]:
    sections: Dict[str, str] = {}
    paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
    for i, domain in enumerate(domains):
        sections[domain["domain"]] = paragraphs[i] if i < len(paragraphs) else ""
    return sections

def _condensed_fallback_prompt(payload: Dict) -> str:
    name    = payload.get("user_name", "you")
    domains = payload.get("domains", [])
    summaries = [f"{d['domain'].replace('_', ' ').title()}: {d['primary_reading'][:100]}" for d in domains[:5]]
    return (
        f"Write a warm, brief personal reading for {name} covering: " + " | ".join(summaries) +
        f"\nTiming: {payload.get('timing_summary', '')} \nOverall: {payload.get('overall_theme', '')} "
        "\n300-400 words. Second person. No system names. Warm and empowering. "
        "Never use em-dashes (—). Use commas (,) instead."
    )

def _emergency_fallback(payload: Dict) -> str:
    name  = payload.get("user_name", "you")
    theme = payload.get("overall_theme", "")
    return (
        f"Dear {name},\n\n{theme}\n\n"
        "Your complete reading has been prepared. "
        "Please try again in a moment to receive the full narration."
    )
