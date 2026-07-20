"""
Reuses the real, already-verified DeepSeek integration from delivery/llm_narrator.py
(_call_deepseek_async — same function your reading narration already depends on in
production) instead of writing a second, parallel DeepSeek client. Same endpoint, same
auth, same error handling.
"""

import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CONSULTANT_ASSISTANT_SYSTEM_PROMPT = """You are the KAYAL Consultant Platform's assistant — \
you help spiritual practice consultants think through their clients' numerology, astrology, \
and reading history, draft check-in messages, and prepare for sessions.

You are talking to the CONSULTANT, not the client. Be direct, practical, and grounded — this \
is a working tool for a professional, not a reading delivered to an end client. When client \
context is provided below, use it; when it isn't, answer generally and say so if the question \
genuinely needs client specifics you don't have."""

VOICE_INTENT_SYSTEM_PROMPT = """You parse short spoken or typed commands from a spiritual \
practice consultant into structured intent. Respond with ONLY a JSON object, no other text, \
matching exactly this shape:

{"intent": "schedule_session" | "add_note" | "look_up_client" | "unknown", \
"client_name": string or null, "date": string or null (ISO 8601 if a date/time was mentioned), \
"duration_minutes": number or null, "note_text": string or null, "confidence": number 0-1}

If the command doesn't clearly match one of the known intents, use "unknown" and set other \
fields to null. Do not invent information that wasn't in the command."""


async def ask_assistant(question: str, client_context: Optional[Dict[str, Any]] = None) -> str:
    from delivery.llm_narrator import _call_deepseek_async

    context_block = ""
    if client_context:
        context_block = (
            f"\n\nContext on the client being discussed:\n"
            f"Name: {client_context.get('name')}\n"
            f"Life Path: {client_context.get('life_path')}, "
            f"Destiny: {client_context.get('destiny')}, "
            f"Sun Sign: {client_context.get('sun_sign')}\n"
            f"Status: {client_context.get('status')}\n"
            f"Consultant's notes on file: {client_context.get('notes') or '(none)'}\n"
        )

    result = await _call_deepseek_async(
        messages=[{"role": "user", "content": question + context_block}],
        system=CONSULTANT_ASSISTANT_SYSTEM_PROMPT,
        max_tokens=800,
        temperature=0.6,
    )
    return result["content"][0]["text"]


async def parse_voice_command(command: str) -> Dict[str, Any]:
    from delivery.llm_narrator import _call_deepseek_async

    result = await _call_deepseek_async(
        messages=[{"role": "user", "content": command}],
        system=VOICE_INTENT_SYSTEM_PROMPT,
        max_tokens=200,
        temperature=0.1,
    )
    raw = result["content"][0]["text"].strip()

    # DeepSeek occasionally wraps JSON in a markdown code fence despite instructions — strip it.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Voice intent parse failed, raw response: {raw!r}")
        parsed = {
            "intent": "unknown", "client_name": None, "date": None,
            "duration_minutes": None, "note_text": None, "confidence": 0.0,
        }
    return parsed
