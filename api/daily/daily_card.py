"""
Daily Guidance API — KAYAL Synthesis Platform
===============================================
Two endpoints consumed by the DailyGuidance frontend component:

GET /guidance/daily
  Query params: dob, birth_time?, birth_location?, user_id?
  Returns: BackendGuidance JSON — exactly what DailyGuidance.tsx expects:
    personal_day, vibration ("High"|"Medium"|"Low"), vibration_meaning,
    energy_level (1–5), energy_description, insight_message,
    moon_phase, universal_day, recommended_tools[], personal_year

GET /guidance/pdf
  Query params: dob, birth_time?, birth_location?, user_id?, name?
  Returns: PDF bytes — downloaded by DailyGuidance.tsx as
    "KAYAL-Daily-Guidance-{date}.pdf"

Response caching:
  Results are cached in Supabase daily_guidance table (keyed by
  user+date or dob+date) so multiple dashboard loads in one day
  do not re-generate or re-call Claude.

Vibration mapping:
  Personal Day 1,3,5,8     → "High"    (action, expression, change, achievement)
  Personal Day 2,6,9       → "Medium"  (cooperation, nurturing, completion)
  Personal Day 4,7,11,22   → "Low"     (grounding, reflection, deep work)
  Master Days (11,22,33)   → "High"    (elevated intensity)

Recommended tools:
  High  → oracle-temple, wellness prioritised (>50% of slots)
  Medium→ love, life-path prioritised
  Low   → wellness, voice, sacred-script prioritised

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

import io
import logging
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
_API_VERSION        = "2023-06-01"
MODEL_HAIKU         = "claude-haiku-4-5-20251001"


# ─────────────────────────────────────────────
# Numerology helpers
# ─────────────────────────────────────────────

def _reduce(n: int) -> int:
    if n in (11, 22, 33): return n
    while n > 9:
        n = sum(int(d) for d in str(n))
        if n in (11, 22, 33): return n
    return n

def _personal_year(day: int, month: int, year: int) -> int:
    uy = _reduce(sum(int(d) for d in str(year)))
    return _reduce(day + month + uy)

def _personal_month(py: int, month: int) -> int:
    return _reduce(py + month)

def _personal_day(pm: int, day: int) -> int:
    return _reduce(pm + day)

def _universal_day(year: int, month: int, day: int) -> int:
    return _reduce(sum(int(d) for d in f"{day:02d}{month:02d}{year:04d}"))


# ─────────────────────────────────────────────
# Vibration mapping
# ─────────────────────────────────────────────

_VIBRATION_MAP: Dict[int, str] = {
    1: "High", 2: "Medium", 3: "High", 4: "Low",
    5: "High", 6: "Medium", 7: "Low",  8: "High",
    9: "Medium", 11: "High", 22: "High", 33: "High",
}

_ENERGY_LEVEL_MAP: Dict[int, int] = {
    1: 5, 2: 2, 3: 4, 4: 2, 5: 4,
    6: 3, 7: 1, 8: 5, 9: 3, 11: 5, 22: 4, 33: 4,
}

_ENERGY_DESCRIPTION_MAP: Dict[int, str] = {
    1:  "Peak energy all day — especially 9 AM – 1 PM",
    2:  "Steady, receptive energy — best from 10 AM – 12 PM",
    3:  "Creative surge from 11 AM – 3 PM",
    4:  "Disciplined energy — best in morning hours",
    5:  "Variable — peaks mid-afternoon, 2 PM – 5 PM",
    6:  "Warm, relational energy — best in evening",
    7:  "Quiet inner energy — peak clarity after 7 PM",
    8:  "Executive energy — strongest 9 AM – 2 PM",
    9:  "Reflective energy — best from 3 PM onward",
    11: "Heightened sensitivity all day — peak at twilight",
    22: "High-build energy — best in structured morning work",
    33: "Compassionate energy — strongest when giving",
}

_VIBRATION_MEANING_MAP: Dict[str, str] = {
    "High":   "Your energy is amplified today. Intentions land with greater force — both the helpful and the unhelpful ones.",
    "Medium": "A stable, even field today. What you tend to grows steadily. Consistency counts more than intensity.",
    "Low":    "A day for depth over breadth. The quieter the approach, the more accurate the signal.",
}

_INSIGHT_MESSAGES: Dict[str, str] = {
    "High":   "High-vibration days attract aligned opportunities. Stay open to what approaches you today.",
    "Medium": "Medium days favour patience and steady investment. The compound interest of consistent action.",
    "Low":    "Low-vibration days are the soil of future highs. What you release today makes space for what is coming.",
}


# ─────────────────────────────────────────────
# Moon phase (approximate — no astronomy library)
# ─────────────────────────────────────────────

_MOON_PHASES = [
    "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
    "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
]

def _approx_moon_phase(year: int, month: int, day: int) -> str:
    """Approximate moon phase — accurate to ±1 day."""
    # Known new moon: Jan 1 2000 (Julian Day 2451545)
    jd     = 367*year - (7*(year+(month+9)//12))//4 + (275*month)//9 + day + 1721013.5
    cycle  = (jd - 2451549.5) % 29.53
    idx    = int(cycle / 29.53 * 8) % 8
    return _MOON_PHASES[idx]


# ─────────────────────────────────────────────
# Recommended tools by vibration and personal day
# ─────────────────────────────────────────────

_RECOMMENDED_TOOLS: Dict[str, List[str]] = {
    "High": [
        "full-soul-portrait", "complete-wealth-synthesis", "annual-destiny-forecast",
        "calling-decoder", "founder-type-reading", "spiritual-gifts-reading",
    ],
    "Medium": [
        "love-timing-forecast", "life-path-deep-dive", "soul-contract-reading",
        "nine-year-cycle-reading", "relationship-karma-synthesis", "pinnacle-reading",
    ],
    "Low": [
        "shadow-work-reading", "past-life-reading", "chakra-blueprint",
        "the-life-scribe", "oracle-voice-session", "dark-night-navigator",
    ],
}

def _get_recommended_tools(
    vibration:   str,
    personal_day: int,
    personal_year: int,
) -> List[str]:
    """Return 4–6 tool IDs recommended for today's vibration."""
    base = _RECOMMENDED_TOOLS.get(vibration, _RECOMMENDED_TOOLS["Medium"]).copy()
    # Enrich for specific personal day patterns
    if personal_day in (1, 8):
        base.insert(0, "wealth-blueprint-reading")
    elif personal_day in (2, 6):
        base.insert(0, "love-timing-forecast")
    elif personal_day in (7, 11):
        base.insert(0, "chakra-blueprint")
    elif personal_day == 9:
        base.insert(0, "shadow-work-reading")
    # Personal year enrichment
    if personal_year in (1, 5):
        base.append("career-pivot-reading")
    elif personal_year in (8, 22):
        base.append("income-ceiling-breaker")
    return list(dict.fromkeys(base))[:6]   # dedupe, keep 6


# ─────────────────────────────────────────────
# Claude Haiku narration
# ─────────────────────────────────────────────

async def _narrate_guidance(
    name:         str,
    personal_day: int,
    vibration:    str,
    personal_year:int,
    moon_phase:   str,
) -> Dict[str, str]:
    """
    Generate personalised vibration_meaning and insight_message via Claude Haiku.
    Returns dict with "vibration_meaning" and "insight_message" keys.
    Falls back to template values if API call fails.
    """
    prompt = (
        f"Write two SHORT sentences for {name.split()[0]}'s daily guidance card:\n\n"
        f"Today's data:\n"
        f"  Personal Day: {personal_day}\n"
        f"  Vibration: {vibration}\n"
        f"  Personal Year: {personal_year}\n"
        f"  Moon Phase: {moon_phase}\n\n"
        f"Return ONLY a JSON object with exactly two keys:\n"
        f'{{"vibration_meaning": "One sentence about today\'s {vibration} energy — specific to Day {personal_day}. '
        f'Direct. No generic advice.", '
        f'"insight_message": "One sentence: social resonance or collective wisdom about this vibration. '
        f'Warm, not salesy."}}\n\n'
        f"No preamble. JSON only."
    )

    try:
        import httpx
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                _ANTHROPIC_ENDPOINT,
                headers={
                    "Content-Type":      "application/json",
                    "anthropic-version": _API_VERSION,
                    "x-api-key":         api_key,
                },
                json={
                    "model":      MODEL_HAIKU,
                    "max_tokens": 200,
                    "system":     "You respond only with valid JSON objects as instructed. No other text.",
                    "messages":   [{"role": "user", "content": prompt}],
                },
            )
        if resp.is_success:
            import json, re
            raw  = " ".join(
                b.get("text", "") for b in resp.json().get("content", [])
                if b.get("type") == "text"
            )
            raw  = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
            data = json.loads(raw)
            return {
                "vibration_meaning": data.get("vibration_meaning", ""),
                "insight_message":   data.get("insight_message",   ""),
            }
    except Exception as e:
        logger.warning(f"Haiku narration failed: {e}")

    # Template fallback
    return {
        "vibration_meaning": _VIBRATION_MEANING_MAP.get(vibration, ""),
        "insight_message":   _INSIGHT_MESSAGES.get(vibration, ""),
    }


# ─────────────────────────────────────────────
# Supabase helpers
# ─────────────────────────────────────────────

def _get_supabase():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    return create_client(url, key)

def _cache_key(user_id: Optional[str], dob: str, today_str: str) -> Dict:
    if user_id:
        return {"user_id": user_id, "card_date": today_str}
    return {"dob": dob, "card_date": today_str}


# ─────────────────────────────────────────────
# GET /guidance/daily — main handler
# ─────────────────────────────────────────────

async def handle_daily_guidance(
    dob:            str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
    user_id:        Optional[str] = None,
    name:           str           = "",
) -> Dict[str, Any]:
    """
    Return today's personalised daily guidance.
    Response shape matches DailyGuidance.tsx BackendGuidance interface exactly.

    Args:
        dob:            "YYYY-MM-DD" (required)
        birth_time:     "HH:MM" (optional)
        birth_location: "City, Country" (optional)
        user_id:        Supabase user ID (optional — enables caching per user)
        name:           Full name (optional — personalises Haiku narration)

    Returns:
        {
            personal_day, vibration, vibration_meaning, energy_level,
            energy_description, insight_message, moon_phase, universal_day,
            recommended_tools, personal_year, generated_for
        }
    """
    if not dob:
        return {"error": "dob is required (YYYY-MM-DD)"}

    today     = date.today()
    today_str = today.isoformat()

    # ── Parse DOB ────────────────────────────
    try:
        bd = datetime.strptime(dob, "%Y-%m-%d")
        b_day, b_month, b_year = bd.day, bd.month, bd.year
    except ValueError:
        return {"error": f"Invalid dob format: {dob}"}

    # ── Check cache ───────────────────────────
    try:
        supabase = _get_supabase()
        ck       = _cache_key(user_id, dob, today_str)
        query    = supabase.table("daily_guidance").select("*")
        for k, v in ck.items():
            query = query.eq(k, v)
        cached = query.limit(1).execute()
        if cached.data:
            return cached.data[0].get("guidance_json", {})
    except Exception as e:
        logger.warning(f"Cache read failed: {e}")

    # ── Compute numbers ───────────────────────
    py   = _personal_year(b_day, b_month, today.year)
    pm   = _personal_month(py, today.month)
    pd   = _personal_day(pm, today.day)
    ud   = _universal_day(today.year, today.month, today.day)

    vibration         = _VIBRATION_MAP.get(pd, "Medium")
    energy_level      = _ENERGY_LEVEL_MAP.get(pd, 3)
    energy_description= _ENERGY_DESCRIPTION_MAP.get(pd, "Steady energy throughout the day")
    moon_phase        = _approx_moon_phase(today.year, today.month, today.day)
    recommended       = _get_recommended_tools(vibration, pd, py)

    # ── Narrate via Haiku ─────────────────────
    display_name = name or (user_id and "Friend") or "Friend"
    narrated     = await _narrate_guidance(display_name, pd, vibration, py, moon_phase)

    # ── Assemble response ─────────────────────
    guidance: Dict[str, Any] = {
        "personal_day":       pd,
        "vibration":          vibration,
        "vibration_meaning":  narrated.get("vibration_meaning") or _VIBRATION_MEANING_MAP.get(vibration, ""),
        "energy_level":       energy_level,
        "energy_description": energy_description,
        "insight_message":    narrated.get("insight_message")   or _INSIGHT_MESSAGES.get(vibration, ""),
        "moon_phase":         moon_phase,
        "universal_day":      ud,
        "recommended_tools":  recommended,
        "personal_year":      py,
        "generated_for":      display_name,
    }

    # ── Cache result ──────────────────────────
    try:
        supabase = _get_supabase()
        record   = {
            "card_date":    today_str,
            "dob":          dob,
            "personal_day": pd,
            "vibration":    vibration,
            "guidance_json":guidance,
        }
        if user_id:
            record["user_id"] = user_id
        supabase.table("daily_guidance").insert(record).execute()
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")

    return guidance


# ─────────────────────────────────────────────
# GET /guidance/pdf — PDF download handler
# ─────────────────────────────────────────────

async def handle_daily_pdf(
    dob:            str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
    user_id:        Optional[str] = None,
    name:           str           = "",
) -> bytes:
    """
    Generate a daily guidance PDF.
    Called by DailyGuidance.tsx Download PDF button.
    Returns PDF bytes.
    """
    # Fetch (or generate) today's guidance data
    guidance = await handle_daily_guidance(dob, birth_time, birth_location, user_id, name)
    if "error" in guidance:
        return _plain_text_pdf("KAYAL Daily Guidance", "Unable to generate your daily guidance PDF.")

    today     = date.today()
    pd        = guidance.get("personal_day", 0)
    vibration = guidance.get("vibration", "")
    meaning   = guidance.get("vibration_meaning", "")
    energy    = guidance.get("energy_description", "")
    insight   = guidance.get("insight_message", "")
    moon      = guidance.get("moon_phase", "")
    py        = guidance.get("personal_year", 0)
    recs      = guidance.get("recommended_tools", [])
    display   = name or guidance.get("generated_for", "")

    title    = f"KAYAL Daily Guidance — {today.strftime('%B %d, %Y')}"
    tool_str = "\n".join(f"  • {t.replace('-', ' ').title()}" for t in recs[:4])

    full_text = (
        f"Personal Day: {pd} ({vibration} Vibration)\n"
        f"Personal Year: {py}\n"
        f"Moon Phase: {moon}\n\n"
        f"{meaning}\n\n"
        f"Energy Pattern:\n{energy}\n\n"
        f"Today's Insight:\n{insight}\n\n"
        f"Tools Aligned With Today's Vibration:\n{tool_str}\n\n"
        f"This guidance was generated for {display} on {today.strftime('%B %d, %Y')}.\n"
        f"KAYAL Synthesis Platform · kayal.app"
    )

    try:
        return _generate_pdf_bytes(title, full_text, today.strftime("%B %d, %Y"), pd, vibration)
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        return _plain_text_pdf(title, full_text)


# ─────────────────────────────────────────────
# PDF generation (reportlab)
# ─────────────────────────────────────────────

_ACCENT_COLOURS = {
    "High":   (0.969, 0.620, 0.043),   # Amber #F59E0B
    "Medium": (0.655, 0.545, 0.988),   # Violet #A78BFA
    "Low":    (0.384, 0.212, 0.651),   # Indigo #6366F1
}

def _generate_pdf_bytes(
    title:    str,
    body:     str,
    date_str: str,
    pd:       int,
    vibration:str,
) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles   import ParagraphStyle
    from reportlab.lib          import colors
    from reportlab.platypus     import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums    import TA_CENTER, TA_JUSTIFY
    import io as _io

    buf    = _io.BytesIO()
    pw, ph = A4

    acc_rgb = _ACCENT_COLOURS.get(vibration, (0.384, 0.212, 0.651))
    navy    = colors.Color(0.118, 0.118, 0.227)
    acc     = colors.Color(*acc_rgb)
    gold    = colors.Color(0.831, 0.686, 0.216)
    body_c  = colors.Color(0.15, 0.15, 0.20)
    med     = colors.Color(0.4, 0.4, 0.45)

    def _on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(navy)
        canvas.rect(0, ph - 8, pw, 8, fill=1, stroke=0)
        canvas.setFillColor(gold)
        canvas.rect(0, ph - 10, pw, 2, fill=1, stroke=0)
        canvas.setFillColor(med)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(60, 28, "KAYAL Synthesis Platform")
        canvas.drawCentredString(pw / 2, 28, f"Page {doc.page}")
        canvas.drawRightString(pw - 60, 28, date_str)
        canvas.setStrokeColor(gold); canvas.setLineWidth(0.5)
        canvas.line(60, 40, pw - 60, 40)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=60, rightMargin=60, topMargin=80, bottomMargin=80,
        onFirstPage=_on_page, onLaterPages=_on_page,
    )

    s_title = ParagraphStyle("DT", fontName="Helvetica-Bold", fontSize=20,
                              textColor=navy, alignment=TA_CENTER, spaceAfter=4)
    s_sub   = ParagraphStyle("DS", fontName="Helvetica", fontSize=11,
                              textColor=med, alignment=TA_CENTER, spaceAfter=16)
    s_body  = ParagraphStyle("DB", fontName="Helvetica", fontSize=11,
                              textColor=body_c, alignment=TA_JUSTIFY,
                              spaceAfter=10, leading=18)

    story = [
        Paragraph(title, s_title),
        HRFlowable(width="50%", thickness=1.5, color=acc, hAlign="CENTER", spaceAfter=8),
        Paragraph(f"Personal Day {pd} · {vibration} Vibration · {date_str}", s_sub),
    ]
    for line in body.split("\n"):
        line = line.strip()
        if line:
            story.append(Paragraph(
                line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"),
                s_body,
            ))
        else:
            story.append(Spacer(1, 6))

    doc.build(story)
    return buf.getvalue()


def _plain_text_pdf(title: str, body: str) -> bytes:
    """Minimal fallback PDF if reportlab unavailable."""
    content = f"{title}\n{'=' * len(title)}\n\n{body}"
    pdf = (
        f"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        f"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n"
        f"   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        f"4 0 obj\n<< /Length {len(content) + 50} >>\nstream\n"
        f"BT /F1 11 Tf 60 730 Td ({title[:60]}) Tj ET\nendstream\nendobj\n"
        f"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        f"xref\n0 6\n0000000000 65535 f\n"
        f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF"
    )
    return pdf.encode("latin-1", errors="replace")
