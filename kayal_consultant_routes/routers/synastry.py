"""
Consultant-initiated Union Blueprint (synastry) generation.

Same `jobs`-table + BackgroundTasks pattern as readings.py. Unlike individual readings,
this is NOT a mirror of a confirmed-live route — no two-person generation route exists
anywhere in main.py. Built on synastry_engine.py / synastry_reader.py directly (real,
verified files) via synthesis_bridge.process_consultant_union_job(). Test this path
end-to-end before relying on it the way individual readings can already be relied on.
"""

import hashlib
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from ..deps import CurrentUser, get_current_user, get_db_connection
from ..synthesis_bridge import process_consultant_union_job

router = APIRouter(tags=["synastry"])

# "complete-union-blueprint" is the real tool_id from tool_registry.py, not a placeholder —
# using it means consultant-generated Union Blueprint jobs are tagged consistently with
# the actual product catalog, same as any purchase-flow job for this tool would be.


class GenerateSynastryRequest(BaseModel):
    client_a_id: str
    client_b_id: str


class GenerateSynastryResponse(BaseModel):
    job_id: str


@router.get("/synastry", response_model=dict)
def list_synastries(client_id: str | None = None, user: CurrentUser = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = "SELECT id, status, result, error, created_at, client_id, partner_client_id FROM jobs " \
                "WHERE consultant_id = %s AND source = 'consultant' AND tool_id = 'complete-union-blueprint'"
        params = [user.id]
        if client_id:
            query += " AND (client_id = %s OR partner_client_id = %s)"
            params += [client_id, client_id]
        query += " ORDER BY created_at DESC"
        cur.execute(query, params)
        return {"data": cur.fetchall()}
    finally:
        cur.close()
        conn.close()


@router.post("/synastry", response_model=GenerateSynastryResponse)
def generate_synastry(
    payload: GenerateSynastryRequest,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        client_a = _get_owned_client(cur, payload.client_a_id, user.id)
        client_b = _get_owned_client(cur, payload.client_b_id, user.id)

        job_id = hashlib.md5(
            f"{client_a['name']}{client_b['name']}union{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        cur.execute(
            """
            INSERT INTO jobs (id, user_token, tool_id, status, created_at,
                               consultant_id, client_id, partner_client_id, source)
            VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s)
            """,
            (job_id, f"consultant:{user.id}", "complete-union-blueprint", "pending",
             user.id, payload.client_a_id, payload.client_b_id, "consultant"),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

    background_tasks.add_task(process_consultant_union_job, job_id=job_id, client_a=client_a, client_b=client_b)
    return {"job_id": job_id}


@router.get("/synastry/job/{job_id}", response_model=dict)
def get_synastry_job(job_id: str, user: CurrentUser = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, status, result, error, created_at, client_id, partner_client_id "
            "FROM jobs WHERE id = %s AND consultant_id = %s",
            (job_id, user.id),
        )
        job = cur.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Synastry job not found")

        response = {
            "id": job["id"], "status": job["status"],
            "client_id": job["client_id"], "partner_client_id": job["partner_client_id"],
        }
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
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")
    return client
