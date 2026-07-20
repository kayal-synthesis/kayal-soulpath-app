"""
Shared dependencies for the KAYAL Consultant Platform routes.

Auth model: the frontend sends `Authorization: Bearer <supabase_access_token>` on every request
(set up in lib/api/client.ts). We verify that token against Supabase's JWT secret, then use the
service-role client for the actual query — the JWT verification is what enforces "who is this",
app-level `.eq("consultant_id", ...)` filters enforce "what can they see".

TWO database access paths, matching main.py's own pattern exactly (it uses both too):
  - get_supabase() — Supabase client, for the NEW tables this platform created
    (clients, sessions, invoices, etc. — see 01_schema.sql), which live in Supabase with RLS.
  - get_db_connection() — raw psycopg2 against DATABASE_URL, for the REAL, confirmed-live
    `jobs` table that main.py's actual /api/reading/submit and /api/reading routes use.
    reading_jobs (Supabase-hosted, used by submit.py/reading_worker.py) turned out not to be
    wired into any live route — jobs is the one that's actually running in production.
"""

import os
from functools import lru_cache

import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
# NOTE: main.py's own _get_supabase() reads this as SUPABASE_SERVICE_KEY, not
# SUPABASE_SERVICE_ROLE_KEY — matching that exact name here rather than introducing
# a second env var for the same secret.
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")  # found in Supabase dashboard > API settings

DATABASE_URL = os.environ["DATABASE_URL"]  # same connection string main.py already uses

security = HTTPBearer()


@lru_cache
def get_supabase() -> Client:
    """Service-role client — bypasses RLS. Only ever used server-side, after auth verification below."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_db_connection():
    """Raw psycopg2 connection — identical pattern to main.py's get_db_connection().
    Used for the `jobs` table specifically, since that's managed outside Supabase's
    client/RLS layer (created via main.py's own init_db(), not a Supabase migration)."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    role: str = "consultant"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return CurrentUser(
        id=payload["sub"],
        email=payload.get("email"),
        role=payload.get("user_metadata", {}).get("role", "consultant"),
    )
