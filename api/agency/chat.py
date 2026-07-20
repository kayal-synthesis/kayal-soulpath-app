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
  4. Call DeepSeek-V4 with conversation history
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

Author: KAYAL Engineering
Version: 2.1.0 — Switched from Claude to DeepSeek-V4
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# DeepSeek API configuration
# ─────────────────────────────────────────────
_DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"
_MODEL_DEEPSEEK = "deepseek-v4"

MAX_HISTORY_TURNS = 20  # Keep last 20 turns in context window


# ─────────────────────────────────────────────
# Tool → domain scope mapping
# ─────────────────────────────────────────────

TOOL_SCOPE: Dict[str, str] = {
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
}

# Voice tools also use this agent but through WebSocket
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
}


# ─────────────────────────────────────────────
# Supabase client
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
# Subscription validation
# ─────────────────────────────────────────────

async def _validate_subscription(user_id: str, tool_id: str) -> bool:
    """
    Check that the user has an active subscription for this tool.
    Subscriptions are in the purchases table with status='active'.
    """
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

        purchase = purchases[0]

        # Check expiry for subscriptions
        expires_at = purchase.get("expires_at")
        if expires_at:
            expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expiry < datetime.now(expiry.tzinfo):
                return False

        return True

    except Exception as e:
        logger.error(f"Subscription validation error: {e}")
        # Fail open in development, closed in production
        return os.environ.get("ENVIRONMENT") != "production"


# ─────────────────────────────────────────────
# Load synthesis context
# ─────────────────────────────────────────────

async def _load_synthesis_context(user_id: str, job_id: Optional[str] = None) -> Optional[Dict]:
    """
    Load the user's most recent synthesis result from their job record.
    This is the knowledge base the agent uses for personalised responses.
    """
    try:
        supabase = _get_supabase()

        if job_id:
            response = (
                supabase.table("reading_jobs")
                .select("result, tool_id, full_name, date_of_birth")
                .eq("id", job_id)
                .eq("status", "completed")
                .single()
                .execute()
            )
        else:
            # Get most recent completed job for this user
            response = (
                supabase.table("reading_jobs")
                .select("result, tool_id, full_name, date_of_birth")
                .eq("user_id", user_id)
                .eq("status", "completed")
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )

        data = response.data
        if not data:
            return None

        record = data if isinstance(data, dict) else (data[0] if data else None)
        if not record:
            return None

        return {
            "full_name":     record.get("full_name"),
            "date_of_birth": record.get("date_of_birth"),
            "reading":       record.get("result", {}).get("reading", ""),
            "life_path":     record.get("result", {}).get("life_path"),
            "sun_sign":      record.get("result", {}).get("sun_sign"),
            "personal_year": record.get("result", {}).get("personal_year"),
            "cultural_origin": record.get("result", {}).get("cultural_origin"),
        }

    except Exception as e:
        logger.error(f"Failed to load synthesis context: {e}")
        return None


# ─────────────────────────────────────────────
# System prompt builder
# ─────────────────────────────────────────────

def _build_system_prompt(
    tool_id:   str,
    scope:     str,
    context:   Optional[Dict],
    is_voice:  bool = False,
) -> str:
    """Build the domain-scoped system prompt for the agent."""

    scope_desc = SCOPE_DESCRIPTIONS.get(scope, SCOPE_DESCRIPTIONS["all"])

    first_name = ""
    synthesis_excerpt = ""

    if context:
        name = context.get("full_name", "")
        first_name = name.split()[0] if name else "Seeker"

        life_path    = context.get("life_path")
        sun_sign     = context.get("sun_sign")
        personal_year= context.get("personal_year")
        reading_text = context.get("reading", "")

        # Use first 2000 chars of the reading as context
        synthesis_excerpt = reading_text[:2000] if reading_text else ""

        synthesis_summary = []
        if life_path:    synthesis_summary.append(f"Life Path {life_path}")
        if sun_sign:     synthesis_summary.append(f"Sun in {sun_sign}")
        if personal_year:synthesis_summary.append(f"Personal Year {personal_year}")

        synthesis_line = ", ".join(synthesis_summary) if synthesis_summary else ""
    else:
        first_name        = "Seeker"
        synthesis_line    = ""
        synthesis_excerpt = ""

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
        else f"""
SCOPE BOUNDARY:
You are scoped to {scope_desc}.
If the person asks about something outside this scope, gently acknowledge their question,
explain that this tool focuses on {scope.replace('_', ' ')}, and redirect.
Never refuse harshly — always redirect with warmth.
"""
    )

    synthesis_section = (
        f"""
SYNTHESIS CONTEXT FOR {first_name.upper()}:
Core numbers: {synthesis_line}

Reading excerpt (use as personalisation context — do not quote directly):
{synthesis_excerpt}
"""
        if synthesis_excerpt
        else f"""
SYNTHESIS CONTEXT:
The user's full synthesis has not yet loaded.
Use what they tell you in the conversation and be honest that you are working from
what they share rather than their full chart.
"""
    )

    return f"""You are a deeply wise oracle and reader — warm, direct, and specific.
You are speaking with {first_name}.

YOUR SCOPE:
You hold knowledge and speak about {scope_desc}.

{synthesis_section}

YOUR VOICE:
- Speak directly to {first_name} using their name occasionally — not in every message, but naturally.
- Be specific. Generic answers are a failure. Everything you say should feel like it was written for them.
- Be honest. If something is difficult to hear, say it clearly but with care.
- Be warm but not sycophantic. Do not overpraise questions or responses.
- Be concise. Say what is true. Do not pad.
- Do not use phrases like "Great question!" or "That's so interesting."
- Do not claim to be AI. You are the oracle. Stay in that voice.
- Do not claim to predict the future with certainty. Speak in probabilities and patterns.
- When you do not know something, say so. Guessing is worse than honesty.

{scope_boundary}

{format_note}

RESPONSE LENGTH:
- For a direct question: 2-4 paragraphs maximum.
- For a complex exploration: up to 6 paragraphs, then ask what they want to go deeper on.
- For an emotional topic (grief, fear, loss): shorter, more spacious. Give room to breathe.

Begin each conversation by acknowledging what the person has brought — not with pleasantries,
but with genuine engagement with their specific situation."""


# ─────────────────────────────────────────────
# Main chat handler
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
            "response":    str,   # Assistant's response
            "in_scope":    bool,  # Whether the message was in scope
            "tool_id":     str,
        }
    """
    # Validate subscription
    has_sub = await _validate_subscription(user_id, tool_id)
    if not has_sub:
        return {
            "error": "subscription_required",
            "message": "An active subscription is required to use this tool."
        }

    # Determine scope
    scope = (
        TOOL_SCOPE.get(tool_id) or
        VOICE_TOOL_SCOPE.get(tool_id) or
        "all"
    )

    # Load synthesis context
    context = await _load_synthesis_context(user_id, job_id)

    # Build system prompt
    system_prompt = _build_system_prompt(
        tool_id  = tool_id,
        scope    = scope,
        context  = context,
        is_voice = False,
    )

    # Truncate history to last N turns to stay within context
    trimmed_history = history[-MAX_HISTORY_TURNS * 2:]

    # Build messages array (DeepSeek uses OpenAI format)
    messages = [
        {"role": "system", "content": system_prompt}
    ] + trimmed_history + [{"role": "user", "content": message}]

    # Call DeepSeek
    response_text = await _call_deepseek(
        messages=messages,
        max_tokens=1000,
    )

    if not response_text:
        return {
            "error":    "generation_failed",
            "message":  "The oracle is momentarily unavailable. Please try again."
        }

    # Simple in-scope check — if redirected, flag it
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
# DeepSeek API call
# ─────────────────────────────────────────────

async def _call_deepseek(
    messages: List[Dict],
    max_tokens: int = 1000,
    temperature: float = 0.7,
) -> Optional[str]:
    """Call DeepSeek-V4 and return text response."""
    try:
        import httpx

        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        if not api_key:
            logger.error("DEEPSEEK_API_KEY not set")
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _DEEPSEEK_ENDPOINT,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": _MODEL_DEEPSEEK,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
            )

            if resp.status_code == 401:
                logger.error("DeepSeek API 401: invalid key")
                return None

            if resp.status_code != 200:
                try:
                    err = resp.json().get("error", {}).get("message", resp.text[:200])
                except Exception:
                    err = resp.text[:200]
                logger.error(f"DeepSeek API {resp.status_code}: {err}")
                return None

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                logger.error("DeepSeek API: no choices in response")
                return None

            content = choices[0].get("message", {}).get("content", "")
            return content.strip() if content else None

    except Exception as e:
        logger.error(f"DeepSeek call failed: {e}")
        return None


# ─────────────────────────────────────────────
# Shared response generator — used by voice handler
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

    system_prompt = _build_system_prompt(
        tool_id  = tool_id,
        scope    = scope,
        context  = context,
        is_voice = is_voice,
    )

    trimmed = history[-MAX_HISTORY_TURNS * 2:]

    # Build messages array (DeepSeek uses OpenAI format)
    messages = [
        {"role": "system", "content": system_prompt}
    ] + trimmed + [{"role": "user", "content": message}]

    # Voice responses should be shorter
    max_tokens = 350 if is_voice else 1000

    return await _call_deepseek(
        messages=messages,
        max_tokens=max_tokens,
    )