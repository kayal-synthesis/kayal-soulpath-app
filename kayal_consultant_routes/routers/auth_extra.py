"""
Login, logout, and session checks go straight through supabase-js on the frontend (see
lib/stores/authStore.ts) — those never hit this backend at all.

Signup and password reset go through here instead, because signup also needs to create a
`consultants` profile row (name, company) alongside the Supabase Auth user, which the anon-key
client-side signUp() call can't do on its own without extra round trips.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from ..deps import get_supabase

router = APIRouter(tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    company: str | None = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ConfirmResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


@router.post("/auth/signup")
def signup(payload: SignupRequest):
    sb = get_supabase()

    auth_result = sb.auth.admin.create_user(
        {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": payload.name, "role": "consultant"},
        }
    )
    if not auth_result.user:
        raise HTTPException(status_code=400, detail="Could not create account")

    sb.table("consultants").insert(
        {
            "id": auth_result.user.id,
            "name": payload.name,
            "email": payload.email,
            "company": payload.company,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()

    return {"id": auth_result.user.id, "email": payload.email}


@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest):
    sb = get_supabase()
    # Sends Supabase's built-in reset email; the link lands on /reset-password/confirm (or wherever
    # your Supabase project's redirect URL is configured) which then calls confirm_reset_password below.
    sb.auth.reset_password_for_email(payload.email)
    return {"status": "sent"}


@router.post("/auth/reset-password/confirm")
def confirm_reset_password(payload: ConfirmResetPasswordRequest):
    # NOTE: Supabase's password-recovery flow normally has the user land on a page already carrying
    # a valid session (from the recovery link) and call `supabase.auth.updateUser()` directly —
    # that's usually simpler than round-tripping through a custom backend endpoint like this one.
    # This route is here because the frontend's reset-password page calls the custom API; if you'd
    # rather use Supabase's native flow, that page can call `supabase.auth.updateUser()` instead and
    # this endpoint becomes unnecessary.
    raise HTTPException(
        status_code=501,
        detail="Wire this up to Supabase's password recovery flow, or switch the frontend to call "
        "supabase.auth.updateUser() directly from the reset-password page.",
    )
