"""
Consultant-initiated reading generation.

Rewritten to match what's actually confirmed live in main.py (v8.2.0, confirmed running
on the server): the `jobs` table via raw psycopg2, processed by a FastAPI BackgroundTask
(same execution model as /api/reading/submit), not the reading_jobs/reading_worker.py
pipeline, which turned out not to be wired into any live route.

Domain scope is NOT selectable here — main.py's process_reading_job() always runs full
"all domains" synthesis, so this matches that rather than offering a picker the real
engine doesn't support.
"""

import hashlib
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile

from ..deps import CurrentUser, get_current_user, get_db_connection
from ..synthesis_bridge import process_consultant_reading_job

router = APIRouter(tags=["readings"])


from pydantic import BaseModel


class GenerateReadingResponse(BaseModel):
    job_id: str


@router.get("/readings", response_model=dict)
def list_readings(client_id: str, user: CurrentUser = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _assert_owns_client(cur, client_id, user.id)
        cur.execute(
            """
            SELECT id, status, result, error, created_at, completed_at
            FROM jobs
            WHERE client_id = %s AND source = 'consultant'
            ORDER BY created_at DESC
            """,
            (client_id,),
        )
        return {"data": cur.fetchall()}
    finally:
        cur.close()
        conn.close()


@router.post("/readings", response_model=GenerateReadingResponse)
async def generate_reading(
    background_tasks: BackgroundTasks,
    client_id:         str  = Form(...),
    face_image:        UploadFile | None = File(None),
    left_palm_image:   UploadFile | None = File(None),
    right_palm_image:  UploadFile | None = File(None),
    dominant_hand:     str | None        = Form(None),
    reading_focus:     str | None        = Form(None),
    user: CurrentUser = Depends(get_current_user),
):
    face_bytes             = await face_image.read()       if face_image       else None
    left_palm_bytes        = await left_palm_image.read()  if left_palm_image  else None
    right_palm_bytes       = await right_palm_image.read() if right_palm_image else None

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        client = _get_owned_client(cur, client_id, user.id)

        job_id = hashlib.md5(
            f"{client['name']}{client['birth_date']}consultant{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        cur.execute(
            """
            INSERT INTO jobs (id, user_token, tool_id, status, created_at, consultant_id, client_id, source)
            VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s)
            """,
            (job_id, f"consultant:{user.id}", "consultant-session", "pending", user.id, client_id, "consultant"),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

    background_tasks.add_task(
        process_consultant_reading_job,
        job_id=job_id,
        client=client,
        face_bytes=face_bytes,
        palm_bytes_left=left_palm_bytes,
        palm_bytes_right=right_palm_bytes,
        dominant_hand=dominant_hand,
        reading_focus=reading_focus,
    )
    return {"job_id": job_id}


@router.get("/readings/job/{job_id}", response_model=dict)
def get_reading_job(job_id: str, user: CurrentUser = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, status, result, error, created_at, completed_at, client_id "
            "FROM jobs WHERE id = %s AND consultant_id = %s",
            (job_id, user.id),
        )
        job = cur.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Reading job not found")

        response = {"id": job["id"], "status": job["status"], "client_id": job["client_id"]}
        if job["status"] == "completed" and job["result"]:
            import json
            response["result"] = json.loads(job["result"]) if isinstance(job["result"], str) else job["result"]
        if job["status"] == "failed" and job["error"]:
            response["error"] = job["error"]
        return response
    finally:
        cur.close()
        conn.close()


def _get_owned_client(cur, client_id: str, consultant_id: str) -> dict:
    cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (client_id, consultant_id))
    client = cur.fetchone()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _assert_owns_client(cur, client_id: str, consultant_id: str) -> None:
    _get_owned_client(cur, client_id, consultant_id)
