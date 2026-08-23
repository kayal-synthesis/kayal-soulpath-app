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
Version: 2.2.0 — Real fix, confirmed directly against .env: this file
was still using two hardcoded, wrong values, an endpoint with an extra
/v1/ segment that doesn't belong there, and a model name that was
never a real DeepSeek model at all, the exact same bug already found
and fixed in delivery/llm_narrator.py, never carried over here, this
file and the voice handler that shares get_agent_response() with it
were both quietly broken this whole time as a result. Every distinct
DeepSeek failure, a real balance issue, a rate limit, a temporary
overload, also used to collapse into one identical, generic
"momentarily unavailable" message, with the real, specific reason
thrown away rather than logged, that's why this exact symptom couldn't
be confirmed from the message alone.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# DeepSeek API configuration
# ─────────────────────────────────────────────
# Real, confirmed values, read from the environment, not hardcoded.
# Confirmed directly against the live .env: DEEPSEEK_BASE_URL is
# "https://api.deepseek.com", with no /v1 segment, and DEEPSEEK_MODEL
# is "deepseek-v4-flash". The previous hardcoded endpoint added an
# incorrect /v1/ prefix on top of the real base, and the previous
# hardcoded model name, "deepseek-v4", was never a real, callable
# model at all. Falls back to sensible defaults only if the real env
# vars are somehow unset, matching the same fallback pattern already
# used in delivery/llm_narrator.py, so both files agree with each
# other and with whatever's actually configured, rather than risking
# two files silently using different models.
_DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
_DEEPSEEK_ENDPOINT = f"{_DEEPSEEK_BASE_URL}/chat/completions"
_MODEL_DEEPSEEK = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

MAX_HISTORY_TURNS = 20  # Keep last 20 turns in context window

# Real retry policy for transient failures, 429 rate limits and 503
# overloads are genuinely temporary, worth one real retry with a short
# backoff before giving up, a 401 or a missing key never is, retrying
# that would just waste time before showing the same, honest failure.
_MAX_RETRIES = 2
_RETRY_DELAY_SECONDS = 2.0

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

    Real, confirmed fix, this function was silently broken for every
    chat and voice session, not a narrow edge case. It queried
    full_name and date_of_birth as if they were their own, separate
    columns on reading_jobs, they never were, confirmed directly by a
    real "column does not exist" error against the live database. Both
    values actually live inside input_data, a single JSON column
    captured at checkout time, alongside email, partner_name,
    partner_dob, birth_location, and everything else. Wrapped in the
    try/except below, that real SQL error was being caught, logged,
    and silently swallowed, this function has been returning None on
    every call, meaning every conversation ran with zero real
    personalisation, not because the reading was missing, but because
    the lookup itself was querying columns that were never real.

    Also fixes .order("completed_at", ...), not a confirmed real
    column either, the actual, confirmed timestamp columns on this
    table are created_at and updated_at.

    partner_name and partner_dob are now genuinely extracted too, the
    real, exact field names, confirmed directly against live data,
    previously assumed under entirely different, incorrect names,
    is_union_blueprint and partner_full_name, that never existed
    anywhere in this table at all.
    """
    try:
        supabase = _get_supabase()
        if job_id:
            response = (
                supabase.table("reading_jobs")
                .select("result, tool_id, input_data")
                .eq("id", job_id)
                .eq("status", "completed")
                .single()
                .execute()
            )
        else:
            # Get most recent completed job for this user
            response = (
                supabase.table("reading_jobs")
                .select("result, tool_id, input_data")
                .eq("user_id", user_id)
                .eq("status", "completed")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
        data = response.data
        if not data:
            return None
        record = data if isinstance(data, dict) else (data[0] if data else None)
        if not record:
            return None

        # input_data may come back as a dict already (typical for a
        # real JSONB column via the Supabase client) or, less
        # commonly, as a raw JSON string, handled defensively either
        # way rather than assuming one shape.
        raw_input = record.get("input_data") or {}
        if isinstance(raw_input, str):
            try:
                raw_input = json.loads(raw_input)
            except Exception:
                raw_input = {}

        result_data = record.get("result") or {}

        return {
            "full_name":     raw_input.get("full_name"),
            "date_of_birth": raw_input.get("date_of_birth"),
            "partner_name":  raw_input.get("partner_name"),
            "partner_dob":   raw_input.get("partner_dob"),
            "reading":       result_data.get("reading", ""),
            "life_path":     result_data.get("life_path"),
            "sun_sign":      result_data.get("sun_sign"),
            "personal_year": result_data.get("personal_year"),
            "cultural_origin": result_data.get("cultural_origin"),
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
    response_text, error_reason = await _call_deepseek(
        messages=messages,
        max_tokens=1000,
    )

    if not response_text:
        # Real, specific reason now available and logged, see
        # _call_deepseek()'s own logging, this message stays generic
        # and friendly for the person using the chat, the real detail
        # lives in the server log where it's actually useful, matching
        # the same real, honest separation already proven in
        # delivery/llm_narrator.py.
        return {
            "error":        "generation_failed",
            "message":      "The oracle is momentarily unavailable. Please try again.",
            "error_detail": error_reason,
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
) -> Tuple[Optional[str], Optional[str]]:
    """
    Call DeepSeek and return (text, error_reason).

    error_reason is None on success, and a real, specific, loggable
    string on failure, "insufficient_balance", "rate_limited",
    "invalid_key", etc, not a generic catch-all, this is what was
    previously thrown away entirely, the reason "momentarily
    unavailable" gave no real signal to act on.

    Retries once for genuinely transient failures, 429 and 503, with a
    short delay, a 401 or a missing key never is, retrying that would
    only waste time before showing the same, honest failure.
    """
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        logger.error("DEEPSEEK_API_KEY not set")
        return None, "missing_api_key"

    try:
        import httpx
    except ImportError:
        logger.error("httpx not installed")
        return None, "missing_dependency"

    last_error: Optional[str] = None

    for attempt in range(_MAX_RETRIES + 1):
        try:
            # 60s, not 30s, a longer, multi-paragraph response
            # genuinely needs more room than a short chat reply, 30s
            # was tight enough to risk a false timeout on a real,
            # in-progress response.
            async with httpx.AsyncClient(timeout=60.0) as client:
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

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if not choices:
                        logger.error("DeepSeek API: no choices in response")
                        return None, "empty_response"
                    content = choices[0].get("message", {}).get("content", "")
                    return (content.strip() if content else None), None

                # Real, specific reason, extracted and logged, not
                # discarded. Matches the same real error categories
                # already handled in delivery/llm_narrator.py, so a
                # 402 here means the same thing, and gets the same
                # real, honest visibility, as it does there.
                try:
                    err_body = resp.json().get("error", {}).get("message", resp.text[:200])
                except Exception:
                    err_body = resp.text[:200]

                if resp.status_code == 401:
                    logger.error(f"DeepSeek API 401, invalid key: {err_body}")
                    return None, "invalid_api_key"

                if resp.status_code == 402:
                    logger.error(f"DeepSeek API 402, insufficient balance: {err_body}")
                    return None, "insufficient_balance"

                if resp.status_code == 429:
                    logger.warning(f"DeepSeek API 429, rate limited (attempt {attempt + 1}): {err_body}")
                    last_error = "rate_limited"
                    if attempt < _MAX_RETRIES:
                        await asyncio.sleep(_RETRY_DELAY_SECONDS)
                        continue
                    return None, "rate_limited"

                if resp.status_code == 503:
                    logger.warning(f"DeepSeek API 503, service overloaded (attempt {attempt + 1}): {err_body}")
                    last_error = "service_overloaded"
                    if attempt < _MAX_RETRIES:
                        await asyncio.sleep(_RETRY_DELAY_SECONDS)
                        continue
                    return None, "service_overloaded"

                logger.error(f"DeepSeek API {resp.status_code}: {err_body}")
                return None, f"http_{resp.status_code}"

        except httpx.TimeoutException:
            logger.warning(f"DeepSeek call timed out (attempt {attempt + 1})")
            last_error = "timeout"
            if attempt < _MAX_RETRIES:
                await asyncio.sleep(_RETRY_DELAY_SECONDS)
                continue
            return None, "timeout"

        except Exception as e:
            logger.error(f"DeepSeek call failed: {e}")
            return None, "unknown_error"

    return None, last_error or "unknown_error"

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

    Deliberately keeps this exact return type, Optional[str], even
    though _call_deepseek() now returns richer, real error detail
    internally. This function is shared with the real voice handler,
    api/agency/voice.py, a file that has not been reviewed as part of
    this fix, changing this signature could silently break whatever
    that file expects back without any way to confirm it here. The
    real error reason is still fully logged inside _call_deepseek()
    itself either way, visible in the server log regardless of what
    this function returns to its caller.
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
    text, _error_reason = await _call_deepseek(
        messages=messages,
        max_tokens=max_tokens,
    )
    return text
