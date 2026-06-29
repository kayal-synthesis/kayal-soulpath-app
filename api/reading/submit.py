"""
Reading API — KAYAL Synthesis Platform
========================================
Two endpoints:

POST /reading/submit
  Accepts multipart/form-data from your purchase.tsx
  Geocodes birth location + detects present location from IP
  Creates a job record in Supabase
  Triggers the background worker
  Returns { job_id }

GET /reading/job/{job_id}
  Returns current job status and result
  Called every 3 seconds by your dashboard polling loop
  Returns { status, result? }

Job status lifecycle:
  pending    → Worker has not picked up yet
  processing → Worker is running synthesis
  completed  → Result is ready
  failed     → Something went wrong

v3.0.0 — async geocoding fix:
  - handle_reading_submit() is async but was calling geocode_birth_location()
    and get_location_from_ip() (both sync, use httpx.Client + time.sleep()).
    This blocked the FastAPI event loop on every submission.
  - Import swapped to async_geocode_birth_location() and
    async_get_location_from_ip() from geo_service.py v2.0.0.
  - Both call sites now use await.
  - Version: 2.0.0 → 3.0.0

v2.0.0 additions:
  - Union Blueprint ($397) routing:
      "complete-union-blueprint" and "kayal-union-blueprint" tool IDs
      now accepted and routed to synthesis_scope="union"
  - TOOL_DOMAIN_MAP and TOOL_TYPE_MAP: "union" category added
  - TOOL_REGISTRY: flagship tool IDs added (individual + union)
  - handle_reading_submit(): extracts partner form data fields:
      partner_full_name, partner_date_of_birth, partner_birth_time,
      partner_birth_location — geocoded to partner_birth_geo
  - job_record: 5 new partner fields + is_union_blueprint flag
  - synthesis_scope = "union" for Union Blueprint jobs
  - _is_union_blueprint() helper
  - READING_JOBS_SCHEMA: partner columns + is_union_blueprint column

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Tool category → synthesis scope mapping
# ─────────────────────────────────────────────

TOOL_DOMAIN_MAP: Dict[str, str] = {
    "love":           "love",
    "career":         "career",
    "wealth":         "wealth",
    "spiritual":      "spiritual",
    "health":         "health",
    "life-path":      "character",
    "oracle-temple":  "all",           # Full multi-domain synthesis
    "time-keeper":    "timing",
    "voice":          "all",
    "sacred-script":  "all",
    # v2.0.0
    "union":          "all",           # Union Blueprint: full synthesis + synastry
}

TOOL_TYPE_MAP: Dict[str, str] = {
    "voice":          "audio",
    "oracle-temple":  "report",
    "time-keeper":    "reading",
    "love":           "report",
    "career":         "report",
    "wealth":         "report",
    "spiritual":      "report",
    "health":         "report",
    "life-path":      "report",
    "sacred-script":  "chat",
    # v2.0.0
    "union":          "report",        # Union Blueprint produces a PDF report
}


# ─────────────────────────────────────────────
# Supabase client helper (v1.0.0, preserved)
# ─────────────────────────────────────────────

def _get_supabase():
    """Get Supabase client. Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars."""
    try:
        from supabase import create_client
        import os
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise EnvironmentError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return create_client(url, key)
    except ImportError:
        raise ImportError("supabase-py not installed. Run: pip install supabase")


# ─────────────────────────────────────────────
# v2.0.0 — Union Blueprint helper
# ─────────────────────────────────────────────

def _is_union_blueprint(tool_id: str) -> bool:
    """
    Return True if this tool_id is a Union Blueprint ($397) job.
    Union Blueprint jobs require partner data and use run_union_engine().
    """
    category = _infer_category(tool_id)
    return category == "union"


# ─────────────────────────────────────────────
# POST /reading/submit (v2.0.0 — partner data added)
# ─────────────────────────────────────────────

async def handle_reading_submit(
    form_data:      Dict[str, Any],
    files:          Dict[str, bytes],
    client_ip:      str,
    request_headers:Dict[str, str],
) -> Dict[str, Any]:
    """
    Handle reading job submission from purchase.tsx.

    v2.0.0: Extracts and geocodes partner data fields for Union Blueprint jobs.
    Partner fields (all optional for Individual Blueprint):
        partner_full_name, partner_date_of_birth,
        partner_birth_time, partner_birth_location

    Args:
        form_data:       Parsed multipart form fields
        files:           Uploaded image files {field_name: bytes}
        client_ip:       Client IP for present location detection
        request_headers: Request headers for IP extraction

    Returns:
        {"job_id": str} on success
        {"error": str}  on failure
    """
    from services.geo_service import (
        async_geocode_birth_location,   # v3.0.0 — async wrapper prevents event loop blocking
        async_get_location_from_ip,     # v3.0.0 — async wrapper prevents event loop blocking
        get_client_ip,
        geo_result_to_geolocation,
    )

    # ── Extract Person A form fields (v1.0.0, preserved) ────────────────
    full_name      = form_data.get("full_name",      "").strip()
    date_of_birth  = form_data.get("date_of_birth",  "").strip()
    birth_time     = form_data.get("birth_time",     "").strip() or None
    birth_location = form_data.get("birth_location", "").strip() or None
    tool_id        = form_data.get("tool_id",        "").strip()
    gender         = form_data.get("gender",         "").strip() or None
    user_token     = form_data.get("user_token",     "").strip()

    if not full_name or not date_of_birth or not tool_id:
        return {"error": "full_name, date_of_birth, and tool_id are required"}

    # ── v2.0.0 — Extract Person B (partner) fields ──────────────────────
    is_union = _is_union_blueprint(tool_id)

    partner_full_name     = form_data.get("partner_full_name",     "").strip() or None
    partner_date_of_birth = form_data.get("partner_date_of_birth", "").strip() or None
    partner_birth_time    = form_data.get("partner_birth_time",    "").strip() or None
    partner_birth_location= form_data.get("partner_birth_location","").strip() or None

    # Validate partner data for Union Blueprint
    if is_union:
        if not partner_full_name or not partner_date_of_birth:
            return {
                "error": (
                    "Union Blueprint requires partner data. "
                    "partner_full_name and partner_date_of_birth are required."
                )
            }
        logger.info(
            f"Union Blueprint job submitted: {full_name} & {partner_full_name}"
        )

    # ── Geocode Person A birth location (v3.0.0: async — no longer blocks event loop)
    birth_geo = None
    if birth_location:
        birth_geo = await async_geocode_birth_location(birth_location)
    if not birth_geo:
        from services.geo_service import _fallback_geo
        birth_geo = _fallback_geo(birth_location or "Unknown")

    # ── v2.0.0 — Geocode Person B birth location (v3.0.0: async) ───────
    partner_birth_geo = None
    if is_union and partner_birth_location:
        try:
            partner_birth_geo = await async_geocode_birth_location(partner_birth_location)
            if not partner_birth_geo:
                from services.geo_service import _fallback_geo
                partner_birth_geo = _fallback_geo(partner_birth_location)
        except Exception as e:
            logger.warning(f"Partner geocoding failed: {e} — using fallback")
            from services.geo_service import _fallback_geo
            partner_birth_geo = _fallback_geo(partner_birth_location)
    elif is_union and not partner_birth_location:
        # Partner location not provided — use Person A's birth location as fallback
        partner_birth_geo = birth_geo
        logger.info("Partner birth location not provided — using Person A location as fallback")

    # ── Present location from IP (v3.0.0: async — no longer blocks event loop)
    real_ip     = get_client_ip(request_headers)
    present_geo = await async_get_location_from_ip(real_ip)
    if not present_geo:
        present_geo = birth_geo
        logger.info("IP geolocation failed — using birth location as present location")

    # ── Store images in Supabase Storage (v1.0.0, preserved) ────────────
    stored_images: Dict[str, str] = {}
    job_id = str(uuid.uuid4())
    supabase = _get_supabase()

    for field_name, file_bytes in files.items():
        if not file_bytes:
            continue
        file_path = f"readings/{job_id}/{field_name}.jpg"
        try:
            supabase.storage.from_("reading-images").upload(
                file_path, file_bytes, {"content-type": "image/jpeg"}
            )
            stored_images[field_name] = file_path
            logger.info(f"Stored image: {file_path}")
        except Exception as e:
            logger.error(f"Failed to store image {field_name}: {e}")

    # ── Determine synthesis scope ────────────────────────────────────────
    category       = _infer_category(tool_id)
    synthesis_scope = "union" if is_union else TOOL_DOMAIN_MAP.get(category, "all")

    # ── Create job record (v2.0.0 — partner fields added) ───────────────
    job_record = {
        # Person A fields (v1.0.0)
        "id":             job_id,
        "status":         "pending",
        "tool_id":        tool_id,
        "tool_category":  category,
        "full_name":      full_name,
        "date_of_birth":  date_of_birth,
        "birth_time":     birth_time,
        "birth_location": birth_location,
        "gender":         gender,
        "user_token":     user_token,
        "birth_geo":      geo_result_to_geolocation(birth_geo),
        "present_geo":    geo_result_to_geolocation(present_geo),
        "image_paths":    stored_images,
        "synthesis_scope":synthesis_scope,
        "created_at":     datetime.utcnow().isoformat(),
        "updated_at":     datetime.utcnow().isoformat(),
        "result":         None,
        "error":          None,
        # v2.0.0 Partner / Union Blueprint fields
        "is_union_blueprint":     is_union,
        "partner_full_name":      partner_full_name,
        "partner_date_of_birth":  partner_date_of_birth,
        "partner_birth_time":     partner_birth_time,
        "partner_birth_location": partner_birth_location,
        "partner_birth_geo": (
            geo_result_to_geolocation(partner_birth_geo)
            if partner_birth_geo else None
        ),
    }

    try:
        supabase.table("reading_jobs").insert(job_record).execute()
        logger.info(
            f"Created {'union' if is_union else 'individual'} reading job: "
            f"{job_id} for tool: {tool_id}"
        )
    except Exception as e:
        logger.error(f"Failed to create job record: {e}")
        return {"error": "Failed to create reading job. Please try again."}

    return {"job_id": job_id}


# ─────────────────────────────────────────────
# GET /reading/job/{job_id} (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def handle_job_status(job_id: str) -> Dict[str, Any]:
    """
    Return current job status.
    Called every 3 seconds by your dashboard polling loop.
    """
    if not job_id:
        return {"error": "job_id is required"}

    try:
        supabase = _get_supabase()
        response = (
            supabase.table("reading_jobs")
            .select("status, result, error, created_at, updated_at")
            .eq("id", job_id)
            .single()
            .execute()
        )

        if not response.data:
            return {"error": "Job not found", "status": "failed"}

        job       = response.data
        status    = job.get("status", "pending")
        result    = job.get("result")
        job_error = job.get("error")

        response_body: Dict[str, Any] = {"status": status}

        if status == "completed" and result:
            response_body["result"] = result
        elif status == "failed":
            response_body["error"] = job_error or "Reading generation failed"

        return response_body

    except Exception as e:
        logger.error(f"Error fetching job status for {job_id}: {e}")
        return {"status": "pending"}


# ─────────────────────────────────────────────
# POST /user/add-purchase (v1.0.0, preserved)
# ─────────────────────────────────────────────

async def handle_add_purchase(body: Dict[str, Any]) -> Dict[str, Any]:
    """Register a completed purchase in the Supabase purchases table."""
    required = ["userId", "toolId", "toolName", "toolType"]
    for field in required:
        if not body.get(field):
            return {"error": f"{field} is required"}

    user_id        = body["userId"]
    tool_id        = body["toolId"]
    tool_name      = body["toolName"]
    tool_type      = body["toolType"]
    category       = body.get("category", "universal")
    destination    = body.get("destination", "report")
    emoji          = body.get("emoji", "📦")
    price          = float(body.get("price", 0))
    original_price = float(body.get("originalPrice", price))
    coupon_code    = body.get("couponCode")
    expires_at     = body.get("expires_at")
    images         = body.get("images", {})
    purchase_date  = body.get("purchaseDate", datetime.utcnow().isoformat())
    job_id         = body.get("job_id")

    purchase_record = {
        "user_id":        user_id,
        "tool_id":        tool_id,
        "tool_name":      tool_name,
        "tool_type":      tool_type,
        "category":       category,
        "destination":    destination,
        "emoji":          emoji,
        "price":          price,
        "original_price": original_price,
        "coupon_code":    coupon_code,
        "purchase_date":  purchase_date,
        "expires_at":     expires_at,
        "images":         images,
        "status":         "active",
        "auto_renew":     bool(expires_at),
        "job_id":         job_id,
        "created_at":     datetime.utcnow().isoformat(),
    }

    try:
        supabase = _get_supabase()
        supabase.table("purchases").insert(purchase_record).execute()
        logger.info(f"Purchase registered: {tool_id} for user {user_id}")

        if job_id:
            supabase.table("reading_jobs").update({
                "user_id":    user_id,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", job_id).execute()

        return {"success": True, "tool_id": tool_id}

    except Exception as e:
        logger.error(f"Failed to register purchase: {e}")
        return {"error": "Failed to register purchase"}


# ─────────────────────────────────────────────
# Tool registry (v2.0.0 — flagship IDs + union IDs added)
# ─────────────────────────────────────────────

TOOL_REGISTRY: Dict[str, str] = {

    # ── v2.0.0 KAYAL FLAGSHIP PRODUCTS ───────────────────────────────────
    "individual-life-blueprint": "oracle-temple",  # $297 — full individual synthesis
    "kayal-life-blueprint":      "oracle-temple",  # Alt ID for $297
    "complete-union-blueprint":  "union",          # $397 — two-person synastry reading
    "kayal-union-blueprint":     "union",          # Alt ID for $397

    # ── LOVE & RELATIONSHIPS ──────────────────
    "soulmate-arrival-window":    "love",
    "relationship-mirror":        "love",
    "heartbreak-decoder":         "love",
    "attraction-blueprint":       "love",
    "twin-flame-truth":           "love",
    "marriage-oracle":            "love",
    "love-language-revelation":   "love",
    "karmic-love-debt":           "love",
    "compatibility-verdict":      "love",
    "love-timing-map":            "love",
    "past-life-love-story":       "love",
    "love-unblocking":            "love",

    # ── WEALTH & CAREER ───────────────────────
    "wealth-blueprint":           "wealth",
    "calling-decoder":            "wealth",
    "money-wound-reading":        "wealth",
    "entrepreneurship-oracle":    "wealth",
    "income-ceiling-breaker":     "wealth",
    "leadership-signature":       "wealth",
    "promotion-window":           "wealth",
    "financial-future-map":       "wealth",
    "abundance-frequency-audit":  "wealth",
    "dharmic-wealth-path":        "wealth",
    "collaboration-oracle":       "wealth",
    "legacy-reading":             "wealth",

    # ── WELLNESS & SPIRITUALITY ───────────────
    "constitutional-portrait":      "spiritual",
    "vitality-code":                "spiritual",
    "shadow-self-reading":          "spiritual",
    "ancestral-pattern-reading":    "spiritual",
    "awakening-stage-map":          "spiritual",
    "spiritual-gifts-reading":      "spiritual",
    "dark-night-navigator":         "spiritual",
    "energy-body-reading":          "health",
    "mental-health-astrology":      "health",
    "prayer-practice-prescription": "spiritual",
    "grief-loss-map":               "spiritual",
    "purpose-activation-reading":   "spiritual",

    # ── LIFE PATH & DESTINY ───────────────────
    "soul-contract-reading":          "life-path",
    "life-path-deep-dive":            "life-path",
    "pinnacle-prophecy":              "life-path",
    "karmic-debt-reading":            "life-path",
    "nine-year-cycle-reading":        "life-path",
    "destiny-number-reading":         "life-path",
    "past-life-reading":              "life-path",
    "master-number-reading":          "life-path",
    "name-vibration-reading":         "life-path",
    "second-half-reading":            "life-path",
    "complete-numerology-portrait":   "life-path",
    "full-soul-portrait":             "oracle-temple",

    # ── FEATURED COLLECTIONS ──────────────────
    "oracles-voice":      "voice",
    "whispering-scroll":  "sacred-script",
    "timekeepers-vault":  "time-keeper",
    "grand-revelation":   "oracle-temple",
}


# ─────────────────────────────────────────────
# Helpers (v1.0.0, preserved + union keyword added)
# ─────────────────────────────────────────────

def _infer_category(tool_id: str) -> str:
    """
    Return the synthesis category for a tool_id.

    v2.0.0: "union" keyword added to keyword scan fallback.
    Lookup order:
      1. Exact TOOL_REGISTRY match — always wins
      2. Prefix match against TOOL_DOMAIN_MAP keys
      3. Keyword scan
      4. Default: "oracle-temple"
    """
    if tool_id in TOOL_REGISTRY:
        return TOOL_REGISTRY[tool_id]

    tool_id_lower = tool_id.lower()

    for category in TOOL_DOMAIN_MAP:
        if tool_id_lower.startswith(category):
            logger.warning(
                f"tool_id '{tool_id}' not in TOOL_REGISTRY — "
                f"resolved via prefix to '{category}'. Add it to TOOL_REGISTRY."
            )
            return category

    _keywords = {
        "union":      "union",       # v2.0.0
        "partner":    "union",       # v2.0.0 — "partner-reading" etc.
        "couple":     "union",       # v2.0.0 — "couple-blueprint" etc.
        "synastry":   "union",       # v2.0.0 — "synastry-reading" etc.
        "love":       "love",
        "career":     "career",
        "wealth":     "wealth",
        "spiritual":  "spiritual",
        "health":     "health",
        "life":       "life-path",
        "oracle":     "oracle-temple",
        "time":       "time-keeper",
        "voice":      "voice",
        "sacred":     "sacred-script",
        "soul":       "life-path",
        "destiny":    "life-path",
        "karmic":     "life-path",
        "numerology": "life-path",
        "pinnacle":   "life-path",
        "money":      "wealth",
        "income":     "wealth",
        "financial":  "wealth",
        "shadow":     "spiritual",
        "ancestral":  "spiritual",
        "awakening":  "spiritual",
        "grief":      "spiritual",
        "purpose":    "spiritual",
        "vitality":   "health",
    }
    for kw, cat in _keywords.items():
        if kw in tool_id_lower:
            logger.warning(
                f"tool_id '{tool_id}' not in TOOL_REGISTRY — "
                f"resolved via keyword '{kw}' to '{cat}'. Add it to TOOL_REGISTRY."
            )
            return cat

    logger.error(
        f"tool_id '{tool_id}' could not be categorised — "
        f"defaulting to 'oracle-temple'. Add it to TOOL_REGISTRY."
    )
    return "oracle-temple"


# ─────────────────────────────────────────────
# Supabase schema (v2.0.0 — partner columns added)
# ─────────────────────────────────────────────

READING_JOBS_SCHEMA = """
-- Run this in your Supabase SQL editor to create / update the reading_jobs table
-- v2.0.0: adds partner columns and is_union_blueprint flag

CREATE TABLE IF NOT EXISTS reading_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tool_id          TEXT NOT NULL,
  tool_category    TEXT,
  full_name        TEXT NOT NULL,
  date_of_birth    TEXT NOT NULL,
  birth_time       TEXT,
  birth_location   TEXT,
  gender           TEXT,
  user_id          UUID REFERENCES auth.users(id),
  user_token       TEXT,
  birth_geo        JSONB,
  present_geo      JSONB,
  image_paths      JSONB DEFAULT '{}',
  synthesis_scope  TEXT DEFAULT 'all',
  result           JSONB,
  error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,

  -- v2.0.0: Union Blueprint columns
  is_union_blueprint     BOOLEAN DEFAULT FALSE,
  partner_full_name      TEXT,
  partner_date_of_birth  TEXT,
  partner_birth_time     TEXT,
  partner_birth_location TEXT,
  partner_birth_geo      JSONB
);

-- Indexes (v1.0.0)
CREATE INDEX IF NOT EXISTS idx_reading_jobs_status
  ON reading_jobs (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reading_jobs_user
  ON reading_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_jobs_token
  ON reading_jobs (user_token, created_at DESC);

-- v2.0.0: Index for Union Blueprint worker polling
CREATE INDEX IF NOT EXISTS idx_reading_jobs_union
  ON reading_jobs (is_union_blueprint, status, created_at ASC)
  WHERE is_union_blueprint = TRUE;

-- RLS
ALTER TABLE reading_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own jobs"
  ON reading_jobs FOR SELECT
  USING (auth.uid() = user_id OR user_token = current_setting('app.user_token', true));

CREATE POLICY "Service role full access"
  ON reading_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- v2.0.0: Migration for existing tables (run if table already exists)
-- ALTER TABLE reading_jobs
--   ADD COLUMN IF NOT EXISTS is_union_blueprint     BOOLEAN DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS partner_full_name      TEXT,
--   ADD COLUMN IF NOT EXISTS partner_date_of_birth  TEXT,
--   ADD COLUMN IF NOT EXISTS partner_birth_time     TEXT,
--   ADD COLUMN IF NOT EXISTS partner_birth_location TEXT,
--   ADD COLUMN IF NOT EXISTS partner_birth_geo      JSONB;

-- CREATE INDEX IF NOT EXISTS idx_reading_jobs_union
--   ON reading_jobs (is_union_blueprint, status, created_at ASC)
--   WHERE is_union_blueprint = TRUE;
"""
