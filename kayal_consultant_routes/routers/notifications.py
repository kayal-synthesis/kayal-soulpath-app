from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, get_current_user, get_supabase
from ..models.misc import Notification

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=dict)
def list_notifications(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("consultant_notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"data": result.data}


@router.put("/notifications/{notification_id}/read", response_model=Notification)
def mark_notification_read(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("consultant_notifications")
        .update({"read": True, "read_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", notification_id)
        .eq("recipient_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result.data[0]
