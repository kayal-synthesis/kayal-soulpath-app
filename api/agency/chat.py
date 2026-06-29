"""
Agency Chat Handler — KAYAL Synthesis Platform
================================================
Handles text conversations for Sacred-Script (Whispering Scroll) tools.

Each chat tool is scoped to a specific domain — the agent stays within
that domain and uses the user's synthesis result as its knowledge base.

Flow:
  1. Validate user has active subscription for this tool
  2. Load user's synthesis result (from their job record)
  3. Build domain-scoped system prompt with synthesis context
  4. Call Claude Sonnet with conversation history
  5. Return assistant response + scope flag

Domain scoping:
  love-correspondent     → love domain only
  wealth-scribe          → wealth domain only
  inner-work-companion   → wellness/psychology
  timing-correspondent   → timing/cycles
  ancestral-scribe       → ancestral/lineage
  purpose-dialogue       → purpose/spirituality
  grief-companion        → grief/emotional support
  health-scribe          → health/constitution
  life-scribe            → all domains (full spectrum)
  full-synthesis-scribe  → all domains + cross-system

v2.0.0 changes:
  - CRITICAL BUG FIX: _call_claude() was missing "x-api-key" header
    → every API call was returning 401. Fixed.
  - TOOL_SCOPE: flagship products added (individual-life-blueprint,
    complete-union-blueprint, kayal-life-blueprint, kayal-union-blueprint)
  - SCOPE_DESCRIPTIONS: "union" key added
  - _load_synthesis_context(): now fetches is_union_blueprint and
    partner_full_name from the job record
  - _build_system_prompt(): union-aware branch added — when the job is a
    Union Blueprint, partner name and compatibility context are included
    in the synthesis_section block
  - Version: 1.0.0 → 2.0.0

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
_API_VERSION        = "2023-06-01"
MODEL_SONNET        = "claude-sonnet-4-6"
MODEL_HAIKU         = "claude-haiku-4-5-20251001"

MAX_HISTORY_TURNS = 20


# ─────────────────────────────────────────────
# Tool → domain scope mapping (v2.0.0 — flagship products added)
# ─────────────────────────────────────────────

TOOL_SCOPE: Dict[str, str] = {
    # Sacred-Script tools (v1.0.0, preserved)
    "the-life-scribe":           "all",
    "the-love-correspondent":    "love",
    "the-wealth-scribe":         "wealth",
    "the-inner-work-companion":  "wellness",
    "the-timing-correspondent":  "timing",
    "the-ancestral-scribe":      "ancestral",
    "the-purpose-dialogue":      "purpose",
    "the-grief-companion":       "grief",
    "the-health-scribe":         "health",
    "the-full-synthesis-scribe": "all",
    # Subscription tool IDs from TOOL_REGISTRY (v1.0.0, preserved)
    "the-life-scribe":           "all",
    "love-scribe":               "love",
    "wealth-scribe":             "wealth",
    "spiritual-scribe":          "spiritual",
    "health-scribe":             "health",
    "purpose-scribe":            "purpose",
    "relationship-scribe":       "love",
    "grief-scribe":              "grief",
    "parenting-scribe":          "all",
    "business-scribe":           "wealth",
    # v2.0.0 — flagship product IDs
    "individual-life-blueprint": "all",
    "kayal-life-blueprint":      "all",
    "complete-union-blueprint":  "union",
    "kayal-union-blueprint":     "union",
}

VOICE_TOOL_SCOPE: Dict[str, str] = {
    "the-destiny-speaker":       "all",
    "the-love-oracle":           "love",
    "the-wealth-oracle":         "wealth",
    "the-morning-prophet":       "timing",
    "the-soul-mirror":           "wellness",
    "the-decision-oracle":       "all",
    "the-spiritual-compass":     "spiritual",
    "the-relationship-mediator": "love",
    "the-full-spectrum-oracle":  "all",
    "the-timing-oracle":         "timing",
    # Voice subscription IDs
    "oracle-voice-session":       "all",
    "oracle-deep-dive-session":   "all",
    "love-oracle-session":        "love",
    "wealth-oracle-session":      "wealth",
    "purpose-oracle-session":     "purpose",
    "daily-voice-briefing":       "timing",
    "relationship-oracle-session":"love",
    "spiritual-oracle-session":   "spiritual",
    "crisis-oracle-session":      "all",
    "oracle-voice-unlimited":     "all",
}

SCOPE_DESCRIPTIONS: Dict[str, str] = {
    "love":       "love, relationships, attraction, compatibility, soulmates, marriage, heartbreak, and karmic love patterns",
    "wealth":     "wealth, career, income, financial patterns, entrepreneurship, dharmic wealth, and professional purpose",
    "wellness":   "psychological patterns, shadow work, emotional healing, constitutional health, and inner development",
    "timing":     "timing cycles, personal years, pinnacles, planetary seasons, and the optimal timing for decisions",
    "ancestral":  "ancestral patterns, lineage healing, family dynamics, and the patterns inherited from your lineage",
    "purpose":    "life purpose, dharma, calling, soul contract, spiritual gifts, and the meaning beneath your life's arc",
    "grief":      "grief, loss, healing, emotional processing, and the specific needs of your grief process",
    "health":     "constitutional health, Ayurvedic and Chinese medicine profiles, vitality, and health patterns",
    "spiritual":  "spiritual awakening, spiritual gifts, practices, past lives, and your specific spiritual path",
    "all":        "all domains of your life — love, career, wealth, health, spirituality, timing, purpose, and character",
    # v2.0.0
    "union":      "the complete union reading — compatibility, relationship dynamics, shared destiny, and what this connection is for at a soul level",
}


# ─────────────────────────────────────────────
# Supabase client (v1.0.0, preserved)
# ─────────────────────────────────────────────

def _get_supabase():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        return create_client(url, key)
    except ImportError:
        raise ImportError("pip install supabase")


# ─────────────────────────────────────────────
# Subscription validation (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def _validate_subscription(user_id: str, tool_id: str) -> bool:
    """Check that the user has an active subscription for this tool."""
    try:
        supabase = _get_supabase()
        response = (
            supabase.table("purchases")
            .select("id, status, expires_at")
            .eq("user_id", user_id)
            .eq("tool_id", tool_id)
            .eq("status", "active")
            .execute()
        )
        purchases = response.data or []
        if not purchases:
            return False
        purchase   = purchases[0]
        expires_at = purchase.get("expires_at")
        if expires_at:
            expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expiry < datetime.now(expiry.tzinfo):
                return False
        return True
    except Exception as e:
        logger.error(f"Subscription validation error: {e}")
        return os.environ.get("ENVIRONMENT") != "production"


# ─────────────────────────────────────────────
# Load synthesis context
# v2.0.0: fetches is_union_blueprint and partner_full_name
# ─────────────────────────────────────────────

async def _load_synthesis_context(
    user_id: str,
    job_id:  Optional[str] = None,
) -> Optional[Dict]:
    """
    Load the user's most recent synthesis result from their job record.

    v2.0.0: also fetches is_union_blueprint and partner_full_name so the
    system prompt can include partner context for Union Blueprint jobs.
    """
    try:
        supabase = _get_supabase()
        select_cols = (
            "result, tool_id, full_name, date_of_birth,"
            "is_union_blueprint, partner_full_name"   # v2.0.0
        )

        if job_id:
            response = (
                supabase.table("reading_jobs")
                .select(select_cols)
                .eq("id", job_id)
                .eq("status", "completed")
                .single()
                .execute()
            )
        else:
            response = (
                supabase.table("reading_jobs")
                .select(select_cols)
                .eq("user_id", user_id)
                .eq("status", "completed")
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )

        data   = response.data
        record = data if isinstance(data, dict) else (data[0] if data else None)
        if not record:
            return None

        result = record.get("result") or {}
        return {
            "full_name":      record.get("full_name"),
            "date_of_birth":  record.get("date_of_birth"),
            "reading":        result.get("reading", ""),
            "life_path":      result.get("life_path"),
            "sun_sign":       result.get("sun_sign"),
            "personal_year":  result.get("personal_year"),
            "cultural_origin":result.get("cultural_origin"),
            # v2.0.0
            "is_union_blueprint": record.get("is_union_blueprint", False),
            "partner_full_name":  record.get("partner_full_name"),
            "compatibility_percentages": result.get("compatibility_percentages"),
        }

    except Exception as e:
        logger.error(f"Failed to load synthesis context: {e}")
        return None


# ─────────────────────────────────────────────
# System prompt builder
# v2.0.0: union-aware synthesis_section
# ─────────────────────────────────────────────

def _build_system_prompt(
    tool_id:   str,
    scope:     str,
    context:   Optional[Dict],
    is_voice:  bool = False,
) -> str:
    """
    Build the domain-scoped system prompt for the agent.

    v2.0.0: when context.is_union_blueprint=True, the synthesis_section
    includes partner name and available compatibility % scores.
    """
    scope_desc = SCOPE_DESCRIPTIONS.get(scope, SCOPE_DESCRIPTIONS["all"])

    first_name        = "Seeker"
    synthesis_excerpt = ""
    synthesis_summary = []
    is_union          = False
    partner_first     = None

    if context:
        name       = context.get("full_name", "")
        first_name = name.split()[0].title() if name else "Seeker"
        is_union   = context.get("is_union_blueprint", False)

        partner_name = context.get("partner_full_name", "")
        if partner_name:
            partner_first = partner_name.split()[0].title()

        life_path     = context.get("life_path")
        sun_sign      = context.get("sun_sign")
        personal_year = context.get("personal_year")
        reading_text  = context.get("reading", "")
        synthesis_excerpt = reading_text[:2000] if reading_text else ""

        if life_path:     synthesis_summary.append(f"Life Path {life_path}")
        if sun_sign:      synthesis_summary.append(f"Sun in {sun_sign}")
        if personal_year: synthesis_summary.append(f"Personal Year {personal_year}")

    synthesis_line = ", ".join(synthesis_summary) if synthesis_summary else ""

    # v2.0.0 — union-aware synthesis section
    if is_union and partner_first:
        compat = context.get("compatibility_percentages") or {}
        compat_lines = ""
        if compat:
            compat_lines = "\nCompatibility scores (reference when relevant):\n" + "\n".join(
                f"  {k.replace('_', ' ').title()}: {round(v):.0f}%"
                for k, v in compat.items()
                if isinstance(v, (int, float))
            )
        synthesis_section = (
            f"\nUNION BLUEPRINT CONTEXT — {first_name.upper()} & {partner_first.upper()}:\n"
            f"Core numbers: {synthesis_line}\n"
            f"This is a Union Blueprint reading for {first_name} and {partner_first}.\n"
            f"When the person asks about compatibility, the relationship, or 'us', "
            f"draw from the union reading. All compatibility assessments are expressed "
            f"as percentages — never as binary 'compatible/not compatible' verdicts."
            f"{compat_lines}\n\n"
            f"Reading excerpt (use for personalisation — do not quote directly):\n"
            f"{synthesis_excerpt}\n"
        )
    elif synthesis_excerpt:
        synthesis_section = (
            f"\nSYNTHESIS CONTEXT FOR {first_name.upper()}:\n"
            f"Core numbers: {synthesis_line}\n\n"
            f"Reading excerpt (use as personalisation context — do not quote directly):\n"
            f"{synthesis_excerpt}\n"
        )
    else:
        synthesis_section = (
            f"\nSYNTHESIS CONTEXT:\n"
            "The user's full synthesis has not yet loaded. "
            "Use what they tell you in the conversation and be honest that you are working from "
            "what they share rather than their full chart.\n"
        )

    format_note = (
        "Respond in natural spoken sentences — no bullet points, no headers, no markdown. "
        "Your response will be converted to speech."
        if is_voice else
        "You may use paragraph breaks for readability. "
        "Do not use bullet points unless the person explicitly requests a list. "
        "Write as a reader speaking, not as a document."
    )

    scope_boundary = (
        ""
        if scope == "all"
        else (
            f"\nSCOPE BOUNDARY:\n"
            f"You are scoped to {scope_desc}.\n"
            f"If the person asks about something outside this scope, gently acknowledge their question,\n"
            f"explain that this tool focuses on {scope.replace('_', ' ')}, and redirect.\n"
            f"Never refuse harshly — always redirect with warmth.\n"
        )
    )

    return (
        f"You are a deeply wise oracle and reader — warm, direct, and specific.\n"
        f"You are speaking with {first_name}.\n\n"
        f"YOUR SCOPE:\n"
        f"You hold knowledge and speak about {scope_desc}.\n"
        f"{synthesis_section}\n"
        f"YOUR VOICE:\n"
        f"- Speak directly to {first_name} using their name occasionally — not in every message, but naturally.\n"
        f"- Be specific. Generic answers are a failure. Everything you say should feel like it was written for them.\n"
        f"- Be honest. If something is difficult to hear, say it clearly but with care.\n"
        f"- Be warm but not sycophantic. Do not overpraise questions or responses.\n"
        f"- Be concise. Say what is true. Do not pad.\n"
        f"- Do not use phrases like \"Great question!\" or \"That's so interesting.\"\n"
        f"- Do not claim to be AI. You are the oracle. Stay in that voice.\n"
        f"- Do not claim to predict the future with certainty. Speak in probabilities and patterns.\n"
        f"- When you do not know something, say so. Guessing is worse than honesty.\n"
        f"{scope_boundary}\n"
        f"{format_note}\n\n"
        f"RESPONSE LENGTH:\n"
        f"- For a direct question: 2-4 paragraphs maximum.\n"
        f"- For a complex exploration: up to 6 paragraphs, then ask what they want to go deeper on.\n"
        f"- For an emotional topic (grief, fear, loss): shorter, more spacious. Give room to breathe.\n\n"
        f"Begin each conversation by acknowledging what the person has brought — not with pleasantries,\n"
        f"but with genuine engagement with their specific situation."
    )


# ─────────────────────────────────────────────
# Main chat handler (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def handle_chat(
    user_id: str,
    tool_id: str,
    message: str,
    history: List[Dict],
    job_id:  Optional[str] = None,
) -> Dict[str, Any]:
    """
    Handle a single chat turn.

    Args:
        user_id: Supabase user ID
        tool_id: The sacred-script tool ID (e.g. "the-love-correspondent")
        message: The user's current message
        history: Previous conversation turns [{role, content}, ...]
        job_id:  Optional — link to specific synthesis job

    Returns:
        {
            "response":  str,
            "in_scope":  bool,
            "tool_id":   str,
        }
    """
    has_sub = await _validate_subscription(user_id, tool_id)
    if not has_sub:
        return {
            "error":   "subscription_required",
            "message": "An active subscription is required to use this tool.",
        }

    scope   = TOOL_SCOPE.get(tool_id) or VOICE_TOOL_SCOPE.get(tool_id) or "all"
    context = await _load_synthesis_context(user_id, job_id)

    system_prompt = _build_system_prompt(
        tool_id  = tool_id,
        scope    = scope,
        context  = context,
        is_voice = False,
    )

    trimmed  = history[-(MAX_HISTORY_TURNS * 2):]
    messages = trimmed + [{"role": "user", "content": message}]

    response_text = await _call_claude(
        system   = system_prompt,
        messages = messages,
        model    = MODEL_SONNET,
    )

    if not response_text:
        return {
            "error":   "generation_failed",
            "message": "The oracle is momentarily unavailable. Please try again.",
        }

    in_scope = not any(
        phrase in response_text.lower()
        for phrase in ["outside the scope", "focuses on", "redirect"]
    )

    return {
        "response": response_text,
        "in_scope": in_scope,
        "tool_id":  tool_id,
    }


# ─────────────────────────────────────────────
# Claude API call
# v2.0.0 BUG FIX: "x-api-key" header was missing — caused 401 on every call
# ─────────────────────────────────────────────

async def _call_claude(
    system:     str,
    messages:   List[Dict],
    model:      str = MODEL_SONNET,
    max_tokens: int = 1000,
) -> Optional[str]:
    """Call Claude and return text response."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _ANTHROPIC_ENDPOINT,
                headers={
                    "Content-Type":      "application/json",
                    "anthropic-version": _API_VERSION,
                    "x-api-key":         os.environ.get("ANTHROPIC_API_KEY", ""),  # v2.0.0 FIX
                },
                json={
                    "model":      model,
                    "max_tokens": max_tokens,
                    "system":     system,
                    "messages":   messages,
                },
            )
            if resp.status_code != 200:
                logger.error(f"Claude API {resp.status_code}: {resp.text[:200]}")
                return None
            data    = resp.json()
            content = data.get("content", [])
            return " ".join(
                b.get("text", "") for b in content if b.get("type") == "text"
            ).strip()
    except Exception as e:
        logger.error(f"Claude call failed: {e}")
        return None


# ─────────────────────────────────────────────
# Shared response generator — used by voice handler (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def get_agent_response(
    user_id:  str,
    tool_id:  str,
    message:  str,
    history:  List[Dict],
    job_id:   Optional[str] = None,
    is_voice: bool = False,
) -> Optional[str]:
    """
    Shared response generation used by both chat and voice handlers.
    Returns raw text only.
    """
    scope   = TOOL_SCOPE.get(tool_id) or VOICE_TOOL_SCOPE.get(tool_id) or "all"
    context = await _load_synthesis_context(user_id, job_id)

    system   = _build_system_prompt(
        tool_id  = tool_id,
        scope    = scope,
        context  = context,
        is_voice = is_voice,
    )
    trimmed  = history[-(MAX_HISTORY_TURNS * 2):]
    messages = trimmed + [{"role": "user", "content": message}]

    return await _call_claude(
        system     = system,
        messages   = messages,
        model      = MODEL_SONNET,
        max_tokens = 350 if is_voice else 1000,
    )
