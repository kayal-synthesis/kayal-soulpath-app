from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_supabase

router = APIRouter(tags=["settings"])


class GeneralSettingsUpdate(BaseModel):
    company_name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


@router.get("/settings")
def get_settings(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("consultant_settings").select("*").eq("consultant_id", user.id).single().execute()
    return result.data or {}


@router.put("/settings")
def update_settings(payload: GeneralSettingsUpdate, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        sb.table("consultant_settings")
        .upsert({"consultant_id": user.id, **updates}, on_conflict="consultant_id")
        .execute()
    )
    return result.data[0]
