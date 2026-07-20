from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, get_current_user, get_supabase
from ..models.misc import Session, SessionFormData, SessionUpdate

router = APIRouter(tags=["sessions"])


@router.get("/sessions", response_model=dict)
def list_sessions(
    client_id: str | None = None,
    status: str | None = None,
    user: CurrentUser = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("consultant_sessions").select("*").eq("consultant_id", user.id)
    if client_id:
        query = query.eq("client_id", client_id)
    if status:
        query = query.eq("status", status)
    result = query.order("session_date", desc=True).execute()
    return {"data": result.data}


@router.get("/sessions/upcoming", response_model=dict)
def list_upcoming_sessions(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    result = (
        sb.table("consultant_sessions")
        .select("*")
        .eq("consultant_id", user.id)
        .gte("session_date", now)
        .order("session_date", desc=False)
        .limit(10)
        .execute()
    )
    return {"data": result.data}


@router.post("/sessions", response_model=Session)
def create_session(payload: SessionFormData, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    _assert_owns_client(sb, payload.client_id, user.id)

    row = {
        "id": str(uuid.uuid4()),
        "consultant_id": user.id,
        **payload.model_dump(mode="json"),
        "status": "scheduled",
        "notes": payload.notes or "",
        "insights": [],
        "action_items": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("consultant_sessions").insert(row).execute()
    return result.data[0]


@router.get("/sessions/{session_id}", response_model=Session)
def get_session(session_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("consultant_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("consultant_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data


@router.put("/sessions/{session_id}", response_model=Session)
def update_session(session_id: str, payload: SessionUpdate, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True, mode="json").items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        sb.table("consultant_sessions")
        .update(updates)
        .eq("id", session_id)
        .eq("consultant_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]


def _assert_owns_client(sb, client_id: str, consultant_id: str) -> None:
    result = (
        sb.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("consultant_id", consultant_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
