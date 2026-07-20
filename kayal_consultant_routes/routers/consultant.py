"""
AI assistant for consultants — real DeepSeek-V4 calls now, reusing the exact same
_call_deepseek_async function your reading narration already depends on in production
(delivery/llm_narrator.py), not a separate integration.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_supabase
from ..deepseek_bridge import ask_assistant

router = APIRouter(tags=["consultant"])


class AskRequest(BaseModel):
    question: str
    client_id: str | None = None


class AskResponse(BaseModel):
    id: str
    question: str
    answer: str
    client_id: str | None = None
    created_at: str


@router.post("/consultant/ask", response_model=AskResponse)
async def ask_assistant_route(payload: AskRequest, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()

    client_context = None
    if payload.client_id:
        client = (
            sb.table("clients")
            .select("*")
            .eq("id", payload.client_id)
            .eq("consultant_id", user.id)
            .single()
            .execute()
        )
        if not client.data:
            raise HTTPException(status_code=404, detail="Client not found")
        client_context = client.data

    try:
        answer = await ask_assistant(payload.question, client_context)
    except RuntimeError as e:
        # DEEPSEEK_API_KEY missing/invalid, or DeepSeek API error — surface clearly rather
        # than silently returning a fake answer.
        raise HTTPException(status_code=502, detail=f"Assistant unavailable: {e}")

    row = {
        "id": str(uuid.uuid4()),
        "consultant_id": user.id,
        "client_id": payload.client_id,
        "question": payload.question,
        "answer": answer,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("consultant_questions").insert(row).execute()
    return result.data[0]


@router.get("/consultant/questions", response_model=dict)
def list_questions(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("consultant_questions")
        .select("*")
        .eq("consultant_id", user.id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"data": result.data}


@router.post("/consultant/questions/{question_id}/save")
def save_insight(question_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = (
        sb.table("consultant_questions")
        .update({"saved": True})
        .eq("id", question_id)
        .eq("consultant_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Question not found")
    return result.data[0]
