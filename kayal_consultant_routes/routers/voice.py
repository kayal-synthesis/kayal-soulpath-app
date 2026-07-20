"""
Voice commands — real DeepSeek-V4 intent parsing now (see deepseek_bridge.py), with actual
execution for the one intent that's safe and clearly scoped to automate: scheduling a
session. Other recognized intents (add_note, look_up_client) are parsed and returned but
not yet auto-executed — safer to have a human confirm those than silently act on them,
and "recognized but not automated" is an honest place to stop rather than half-wiring
actions I can't verify against your real data model.

/voice/conversations and /voice/notes return empty lists, not errors — they describe a
full audio recording/playback feature (recording_url, transcription, playback state) that
needs actual audio storage infrastructure (a Storage bucket, an upload/recording UI, a
transcription service) nothing in this project has specified yet. Returning empty here is
honest; querying a table that nothing will ever write into would just be theater.
"""

import uuid
from datetime import datetime, timezone
from difflib import SequenceMatcher

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_supabase
from ..deepseek_bridge import parse_voice_command

router = APIRouter(tags=["voice"])


class VoiceCommandRequest(BaseModel):
    command: str


def _best_client_match(clients: list[dict], name: str) -> dict | None:
    if not name or not clients:
        return None
    name_lower = name.lower()
    best, best_score = None, 0.0
    for c in clients:
        score = SequenceMatcher(None, name_lower, c["name"].lower()).ratio()
        if name_lower in c["name"].lower():
            score = max(score, 0.9)
        if score > best_score:
            best, best_score = c, score
    return best if best_score >= 0.6 else None


@router.post("/voice/command")
async def handle_voice_command(payload: VoiceCommandRequest, user: CurrentUser = Depends(get_current_user)):
    parsed = await parse_voice_command(payload.command)
    sb = get_supabase()

    response = {
        "command": payload.command,
        "intent": parsed.get("intent", "unknown"),
        "parameters": parsed,
        "executed": False,
        "message": None,
    }

    if parsed.get("intent") == "schedule_session" and parsed.get("client_name"):
        clients = sb.table("clients").select("*").eq("consultant_id", user.id).execute().data
        match = _best_client_match(clients, parsed["client_name"])

        if not match:
            response["message"] = f"Couldn't find a client matching \"{parsed['client_name']}\"."
        elif not parsed.get("date"):
            response["message"] = f"Found {match['name']}, but couldn't work out when — try including a specific date and time."
        else:
            try:
                session_date = datetime.fromisoformat(parsed["date"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                response["message"] = f"Found {match['name']}, but couldn't parse \"{parsed['date']}\" as a date/time."
            else:
                row = {
                    "id": str(uuid.uuid4()),
                    "client_id": match["id"],
                    "consultant_id": user.id,
                    "session_type": "followup",
                    "session_date": session_date.isoformat(),
                    "duration": parsed.get("duration_minutes") or 60,
                    "status": "scheduled",
                    "notes": f"Scheduled via voice command: \"{payload.command}\"",
                    "insights": [],
                    "action_items": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                sb.table("consultant_sessions").insert(row).execute()
                response["executed"] = True
                response["message"] = f"Scheduled a session with {match['name']}."

    elif parsed.get("intent") == "unknown":
        response["message"] = "Didn't recognize that as a command I can act on yet."
    else:
        response["message"] = f"Recognized this as \"{parsed.get('intent')}\", but that action isn't automated yet — noted here for now."

    return response


@router.get("/voice/conversations", response_model=dict)
def list_conversations(user: CurrentUser = Depends(get_current_user)):
    return {"data": []}


@router.get("/voice/notes", response_model=dict)
def list_voice_notes(user: CurrentUser = Depends(get_current_user)):
    return {"data": []}
