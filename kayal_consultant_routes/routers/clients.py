from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import CurrentUser, get_current_user, get_supabase
from ..models.client import Client, ClientFormData, ClientNote, ClientNoteCreate, ClientUpdate

router = APIRouter(tags=["clients"])


def _calculate_client_numbers(payload: ClientFormData) -> dict:
    """
    Placeholder. Your existing backend already has numerology/astrology calculation logic
    (referenced in your project as synthesis/logic/esoteric/) — call that here instead of this stub.
    Must return every numeric/sign field the `Client` model expects (life_path, destiny, sun_sign, etc.)
    """
    raise NotImplementedError(
        "Wire this up to your existing numerology/astrology calculation modules before using this route."
    )


@router.get("/clients", response_model=dict)
def list_clients(
    status: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("clients").select("*", count="exact").eq("consultant_id", user.id)

    if status:
        query = query.eq("status", status)
    if search:
        query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%")

    query = query.order(sort_by, desc=(sort_order == "desc"))
    start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    result = query.execute()
    return {"data": result.data, "total": result.count, "page": page, "pageSize": pageSize}


@router.post("/clients", response_model=Client)
def create_client(payload: ClientFormData, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()

    # TODO: replace _calculate_client_numbers with a call into your real calculation modules.
    calculated = _calculate_client_numbers(payload)

    row = {
        "id": str(uuid.uuid4()),
        "consultant_id": user.id,
        **payload.model_dump(mode="json"),
        **calculated,
        "status": "onboarding",
        "onboarding_completed": False,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("clients").insert(row).execute()
    return result.data[0]


@router.get("/clients/{client_id}", response_model=Client)
def get_client(client_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("clients")
        .select("*")
        .eq("id", client_id)
        .eq("consultant_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
    return result.data


@router.put("/clients/{client_id}", response_model=Client)
def update_client(client_id: str, payload: ClientUpdate, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        sb.table("clients")
        .update(updates)
        .eq("id", client_id)
        .eq("consultant_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
    return result.data[0]


@router.delete("/clients/{client_id}", status_code=204)
def delete_client(client_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("clients").delete().eq("id", client_id).eq("consultant_id", user.id).execute()


@router.get("/clients/{client_id}/notes", response_model=list[ClientNote])
def get_client_notes(client_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    _assert_owns_client(sb, client_id, user.id)
    result = (
        sb.table("client_notes")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/clients/{client_id}/notes", response_model=ClientNote)
def add_client_note(client_id: str, payload: ClientNoteCreate, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    _assert_owns_client(sb, client_id, user.id)
    row = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "content": payload.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("client_notes").insert(row).execute()
    return result.data[0]


@router.get("/clients/{client_id}/timeline")
def get_client_timeline(client_id: str, user: CurrentUser = Depends(get_current_user)):
    """
    Merges readings, sessions, and synastry reports into one chronological feed.
    Adjust table/column names to match your schema.
    """
    sb = get_supabase()
    _assert_owns_client(sb, client_id, user.id)

    readings = sb.table("readings").select("id, domain, completed_at").eq("client_id", client_id).execute().data
    sessions = sb.table("consultant_sessions").select("id, session_type, session_date").eq("client_id", client_id).execute().data

    events = [
        {"id": r["id"], "label": f"{r['domain']} reading completed", "date": r["completed_at"]} for r in readings
    ] + [
        {"id": s["id"], "label": f"{s['session_type']} session", "date": s["session_date"]} for s in sessions
    ]
    events.sort(key=lambda e: e["date"], reverse=True)
    return {"data": events}


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
