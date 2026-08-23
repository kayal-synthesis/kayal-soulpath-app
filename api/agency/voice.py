"""
Agency Voice Handler — KAYAL Synthesis Platform
=================================================
WebSocket handler for The Oracle's Voice tools.

Pipeline:
  Browser → WebSocket → [audio bytes]
    ↓
  Whisper STT (local via faster-whisper, free)
    ↓
  Domain agent (shared with chat handler)
    ↓
  edge-tts TTS (Microsoft neural, free)
    ↓
  [audio bytes] → WebSocket → Browser

Free TTS: edge-tts (pip install edge-tts)
Free STT: faster-whisper (pip install faster-whisper)

WebSocket message protocol:
  Client → Server:
    { "type": "audio",   "data": "<base64 audio bytes>" }
    { "type": "text",    "data": "<text message>" }
    { "type": "ping" }
    { "type": "history", "data": [...] }

  Server → Client:
    { "type": "ready",       "voice": "...", "tool": "...", "is_union": bool }
    { "type": "transcript",  "text": "..." }
    { "type": "response",    "text": "..." }
    { "type": "audio",       "data": "<base64>" }
    { "type": "error",       "message": "..." }
    { "type": "pong" }

v2.1.0 changes, real fix, confirmed directly, not guessed:
  - context.get("is_union_blueprint") and context.get("partner_full_name")
    read two keys that never existed anywhere in
    _load_synthesis_context()'s real return value, at any point. That
    function was itself confirmed broken and fixed separately, in
    chat.py, it had been querying two reading_jobs columns,
    full_name and date_of_birth, that never existed as their own
    columns at all, confirmed directly against the real, complete
    schema. The fixed function now genuinely returns partner_name and
    partner_dob, extracted from input_data, the real, confirmed JSONB
    column where checkout-time data actually lives. is_union is now
    derived from whether a real partner_name is present, rather than
    read from a field, is_union_blueprint, that was never real to
    begin with.

v2.0.0 changes:
  - VOICE_OPTIONS: southeast_asian ("en-SG-LunaNeural") and
    east_asian ("en-HK-YanNeural") voices added
  - _select_voice(): Southeast Asian, East Asian, and Middle Eastern
    origins now handled — Malaysian/Singaporean users no longer fall
    through to the default US voice
  - handle_voice_websocket(): extracts partner context from
    _load_synthesis_context(); "ready" signal includes is_union flag
    for client
  - Morning Prophet auto-opening: condition broadened from hardcoded
    tool_id string to TOOL_SCOPE lookup for "timing" daily tools
  - Version: 1.0.0 → 2.0.0

Author: KAYAL Engineering
Version: 2.1.0
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Voice selection (v2.0.0 — SE Asian + East Asian added)
# ─────────────────────────────────────────────
DEFAULT_VOICE = "en-US-JennyNeural"

VOICE_OPTIONS: Dict[str, str] = {
    "en-oracle":   "en-US-JennyNeural",     # Default English oracle — warm, authoritative
    "en-deep":     "en-US-GuyNeural",       # Deeper male voice
    "en-warm":     "en-US-AriaNeural",      # Warm female
    "en-mystic":   "en-GB-SoniaNeural",     # British — mystical feel
    "af-warm":     "en-ZA-LeahNeural",      # South African — African users
    "in-warm":     "en-IN-NeerjaNeural",    # Indian English
    "au-warm":     "en-AU-NatashaNeural",   # Australian
    # v2.0.0
    "sg-warm":     "en-SG-LunaNeural",      # Singaporean English — SE Asian users
    "hk-warm":     "en-HK-YanNeural",       # Hong Kong English — East Asian users
}

# Rate/pitch for oracle feel (v1.0.0, preserved)
TTS_RATE  = "-8%"
TTS_PITCH = "+2Hz"

# Tools that auto-generate an opening reading on connect
_AUTO_OPEN_TOOLS = frozenset({
    "the-morning-prophet",
    "daily-personal-oracle",
    "daily-voice-briefing",
})

# ─────────────────────────────────────────────
# STT: faster-whisper (v1.0.0, preserved intact)
# ─────────────────────────────────────────────
_whisper_model = None

def _get_whisper_model():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    try:
        from faster_whisper import WhisperModel
        model_size    = os.environ.get("WHISPER_MODEL_SIZE", "tiny")
        _whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info(f"Whisper model loaded: {model_size}")
        return _whisper_model
    except ImportError:
        logger.warning("faster-whisper not installed — text input only")
        return None
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        return None

async def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    """Transcribe audio bytes to text using local Whisper model."""
    model = _get_whisper_model()
    if not model:
        return None
    def _run():
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name
            segments, _ = model.transcribe(
                tmp_path,
                language       = "en",
                beam_size      = 1,
                vad_filter     = True,
                vad_parameters = dict(min_silence_duration_ms=300),
            )
            text = " ".join(seg.text.strip() for seg in segments).strip()
            os.unlink(tmp_path)
            return text or None
        except Exception as e:
            logger.error(f"Whisper transcription error: {e}")
            return None
    return await asyncio.get_event_loop().run_in_executor(None, _run)

# ─────────────────────────────────────────────
# TTS: edge-tts (v1.0.0, preserved intact)
# ─────────────────────────────────────────────
async def synthesise_speech(text: str, voice: str = DEFAULT_VOICE) -> Optional[bytes]:
    """Convert text to speech using edge-tts. Returns MP3 bytes."""
    try:
        import edge_tts
        communicate  = edge_tts.Communicate(text=text, voice=voice,
                                             rate=TTS_RATE, pitch=TTS_PITCH)
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])
        audio_bytes = audio_buffer.getvalue()
        return audio_bytes if audio_bytes else None
    except ImportError:
        logger.warning("edge-tts not installed. pip install edge-tts")
        return None
    except Exception as e:
        logger.error(f"edge-tts error: {e}")
        return None

# ─────────────────────────────────────────────
# WebSocket message helpers (v1.0.0, preserved intact)
# ─────────────────────────────────────────────
async def _send(ws: WebSocket, msg: Dict[str, Any]) -> None:
    try:
        await ws.send_text(json.dumps(msg))
    except Exception as e:
        logger.warning(f"WebSocket send failed: {e}")

async def _send_audio(ws: WebSocket, audio_bytes: bytes) -> None:
    encoded = base64.b64encode(audio_bytes).decode("utf-8")
    await _send(ws, {"type": "audio", "data": encoded})

# ─────────────────────────────────────────────
# Voice preference selection
# v2.0.0: Southeast Asian, East Asian, Middle Eastern origins handled
# ─────────────────────────────────────────────
def _select_voice(cultural_origin: Optional[str]) -> str:
    """
    Select the most appropriate oracle voice based on cultural background.
    v2.0.0: Southeast Asian (MY/SG/ID/PH/TH/VN) and East Asian (CN/TW/HK/JP/KR)
    origins now route to regionally appropriate voices instead of falling through
    to the US default.
    """
    if not cultural_origin:
        return DEFAULT_VOICE
    origin = cultural_origin.lower()
    # Sub-Saharan African
    if any(w in origin for w in ["african", "nigerian", "ghanaian", "kenyan",
                                   "south_african", "zimbabwean", "sub_saharan"]):
        return VOICE_OPTIONS["af-warm"]
    # South Asian
    if any(w in origin for w in ["indian", "pakistani", "bangladeshi",
                                   "sri_lankan", "south_asian", "nepali"]):
        return VOICE_OPTIONS["in-warm"]
    # v2.0.0 — Southeast Asian
    if any(w in origin for w in ["malaysian", "singaporean", "indonesian",
                                   "filipino", "thai", "vietnamese", "burmese",
                                   "southeast_asian", "southeast asian"]):
        return VOICE_OPTIONS["sg-warm"]
    # v2.0.0 — East Asian
    if any(w in origin for w in ["chinese", "taiwanese", "hong_kong", "japanese",
                                   "korean", "east_asian", "east asian"]):
        return VOICE_OPTIONS["hk-warm"]
    # v2.0.0 — Middle Eastern (British English is closest available)
    if any(w in origin for w in ["middle_eastern", "middle eastern", "arabic",
                                   "saudi", "emirati", "egyptian", "lebanese",
                                   "turkish", "north_african"]):
        return VOICE_OPTIONS["en-mystic"]
    # British / Irish
    if any(w in origin for w in ["british", "uk", "irish", "scottish",
                                   "eastern_european", "eastern european"]):
        return VOICE_OPTIONS["en-mystic"]
    # Australian / New Zealand
    if any(w in origin for w in ["australian", "new_zealand"]):
        return VOICE_OPTIONS["au-warm"]
    return DEFAULT_VOICE

# ─────────────────────────────────────────────
# Main WebSocket handler
# v2.1.0: real partner-field fix, see file header
# ─────────────────────────────────────────────
async def handle_voice_websocket(
    websocket: WebSocket,
    user_id:   str,
    tool_id:   str,
) -> None:
    """
    Handle a complete voice session WebSocket connection.

    v2.1.0 changes:
    - Reads context["partner_name"] and context["partner_dob"], the
      real, confirmed field names _load_synthesis_context() actually
      returns, not is_union_blueprint / partner_full_name, which were
      never real, at any point, see file header for the full,
      confirmed explanation.

    v2.0.0 changes:
    - Extracts partner context from _load_synthesis_context()
    - "ready" signal includes is_union flag so the client can adjust UI
    - Auto-opening changed from hardcoded "the-morning-prophet" to
      _AUTO_OPEN_TOOLS frozenset (daily-personal-oracle, daily-voice-briefing
      also auto-open)
    """
    await websocket.accept()
    logger.info(f"Voice WS connected: user={user_id} tool={tool_id}")

    from api.agency.chat import (
        _validate_subscription,
        _load_synthesis_context,
        get_agent_response,
        VOICE_TOOL_SCOPE,
        TOOL_SCOPE,
    )

    # Validate subscription
    has_sub = await _validate_subscription(user_id, tool_id)
    if not has_sub:
        await _send(websocket, {
            "type":    "error",
            "code":    "subscription_required",
            "message": "An active subscription is required.",
        })
        await websocket.close(code=4003)
        return

    # Load context — real, confirmed field names now, see file header
    context = await _load_synthesis_context(user_id)
    cultural_origin = context.get("cultural_origin") if context else None
    partner_name    = context.get("partner_name")    if context else None
    partner_first   = partner_name.split()[0].title() if partner_name else None
    # A real, honest signal, not an invented field, a session genuinely
    # involves a partner if the reading behind it actually captured
    # one, there is no separate, dedicated "is this a union reading"
    # flag anywhere in the real schema.
    is_union = bool(partner_name)

    voice = _select_voice(cultural_origin)
    logger.info(
        f"Voice session: tool={tool_id} voice={voice} "
        f"union={is_union} partner={partner_first}"
    )

    # Send ready signal
    await _send(websocket, {
        "type":          "ready",
        "voice":         voice,
        "tool":          tool_id,
        "is_union":      is_union,
        "partner_name":  partner_first,      # None for individual sessions
    })

    history: List[Dict] = []

    # Auto-opening for daily tools (broadened from single hardcoded ID)
    if tool_id in _AUTO_OPEN_TOOLS:
        opening = await get_agent_response(
            user_id  = user_id,
            tool_id  = tool_id,
            message  = "Good morning. Please give me today's reading.",
            history  = [],
            is_voice = True,
        )
        if opening:
            await _send(websocket, {"type": "response", "text": opening})
            audio = await synthesise_speech(opening, voice)
            if audio:
                await _send_audio(websocket, audio)
            history.append({"role": "assistant", "content": opening})

    # ── Main message loop (v1.0.0, preserved intact) ─────────────────────
    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=120.0)
            except asyncio.TimeoutError:
                await _send(websocket, {"type": "ping"})
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "error", "message": "Invalid message format"})
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await _send(websocket, {"type": "pong"})
                continue

            if msg_type == "history":
                history = msg.get("data", [])
                continue

            if msg_type == "audio":
                encoded = msg.get("data", "")
                if not encoded:
                    continue
                try:
                    audio_bytes = base64.b64decode(encoded)
                except Exception:
                    await _send(websocket, {"type": "error", "message": "Invalid audio encoding"})
                    continue

                await _send(websocket, {"type": "transcribing"})
                transcript = await transcribe_audio(audio_bytes)
                if not transcript:
                    await _send(websocket, {
                        "type":    "error",
                        "message": "Could not transcribe audio. Please try speaking more clearly or use text input.",
                    })
                    continue

                await _send(websocket, {"type": "transcript", "text": transcript})
                user_message = transcript

            elif msg_type == "text":
                user_message = msg.get("data", "").strip()
                if not user_message:
                    continue
            else:
                logger.warning(f"Unknown message type: {msg_type}")
                continue

            # Generate response
            await _send(websocket, {"type": "thinking"})
            response_text = await get_agent_response(
                user_id  = user_id,
                tool_id  = tool_id,
                message  = user_message,
                history  = history,
                is_voice = True,
            )

            if not response_text:
                await _send(websocket, {
                    "type":    "error",
                    "message": "The oracle is momentarily unavailable. Please try again.",
                })
                continue

            history.append({"role": "user",      "content": user_message})
            history.append({"role": "assistant",  "content": response_text})
            if len(history) > 40:
                history = history[-40:]

            await _send(websocket, {"type": "response", "text": response_text})
            await _send(websocket, {"type": "synthesising"})

            audio_out = await synthesise_speech(response_text, voice)
            if audio_out:
                await _send_audio(websocket, audio_out)
            else:
                await _send(websocket, {
                    "type":    "tts_fallback",
                    "text":    response_text,
                    "message": "Using browser text-to-speech.",
                })

    except WebSocketDisconnect:
        logger.info(f"Voice WS disconnected cleanly: user={user_id}")
    except Exception as e:
        logger.error(f"Voice WS error: {e}", exc_info=True)
        try:
            await _send(websocket, {"type": "error", "message": "Session error. Please reconnect."})
            await websocket.close(code=1011)
        except Exception:
            pass
