import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_supabase

router = APIRouter(tags=["video"])


class CreateVideoCallRequest(BaseModel):
    client_id: str
    session_id: str | None = None
    scheduled_at: str | None = None


@router.get("/video/calls", response_model=dict)
def list_video_calls(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("video_calls")
        .select("*")
        .eq("consultant_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data}


@router.post("/video/create")
def create_video_call(payload: CreateVideoCallRequest, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()

    # TODO: this is where you'd call your video provider's API (e.g. Daily.co, Twilio Video,
    # LiveKit) to actually create a room. Not specified in the original brief — pick a provider
    # and swap this stub for the real room-creation call.
    room_id = str(uuid.uuid4())

    row = {
        "id": str(uuid.uuid4()),
        "consultant_id": user.id,
        "client_id": payload.client_id,
        "session_id": payload.session_id,
        "room_id": room_id,
        "room_name": f"kayal-{room_id[:8]}",
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("video_calls").insert(row).execute()
    return result.data[0]


@router.get("/video/calls/{call_id}")
def get_video_call(call_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("video_calls")
        .select("*")
        .eq("id", call_id)
        .eq("consultant_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video call not found")
    return result.data
