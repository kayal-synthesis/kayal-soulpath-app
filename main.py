"""
KAYAL Synthesis Engine v8.2.0
====================================================

v8.2.0 changes (on top of v8.1.2):
  - GET /guidance/daily  — personalised daily guidance card
                           params: dob, birth_time?, birth_location?, user_id?, name?
                           returns: BackendGuidance JSON matching DailyGuidance.tsx
                           delegates to api.daily.daily_card.handle_daily_guidance()
  - GET /guidance/pdf    — daily guidance PDF download
                           params: dob, birth_time?, birth_location?, user_id?, name?
                           returns: PDF bytes as StreamingResponse
                           delegates to api.daily.daily_card.handle_daily_pdf()
  - POST /welcome        — partner_name field added to WelcomeRequest
                           passes through to generate_welcome_reading()
                           Union Blueprint visitors receive compatibility-aware paragraph 6
  - /daily-card          — updated to call handle_daily_guidance() (universal day)
  - /daily-insight/{id}  — updated to call handle_daily_guidance() with profile data
  - geo_service import   — async_geocode_birth_location imported alongside sync version
  - Version: 8.1.2 → 8.2.0

v8.1.2 changes (on top of v8.1.1):
  - GET /api/reading/job/latest  — returns most recent completed job for a user
                                   merges analyses + palm_analyses tables
                                   falls back to legacy analyses table
                                   used by audio-page.tsx and chat-page.tsx
  - GET /api/subscription/tier   — returns subscription tier + active status
                                   for a user/tool combination
                                   used by session pages before opening mic/chat

All v8.1.1 endpoints preserved intact.

Author: KAYAL Engineering
Version: 8.2.0
"""

# ─────────────────────────────────────────────
# Stdlib
# ─────────────────────────────────────────────
import asyncio
import hashlib
import io
import json
import os
import random
import shutil
import tempfile
import uuid
import wave
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────
# Third-party
# ─────────────────────────────────────────────
import cv2
import numpy as np
import psycopg2
import requests
from dateutil import parser
from dotenv import load_dotenv
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import (
    JSONResponse,
    Response,
    StreamingResponse,
)
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel
from PIL import Image
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

load_dotenv()

import logging as _logging
logger = _logging.getLogger("kayal.main")


# ─────────────────────────────────────────────
# KAYAL synthesis engines
# ─────────────────────────────────────────────

try:
    from synthesis.face_engine import FaceEngine
    from synthesis.face_reader import FaceReader
    _FACE_ENGINE_AVAILABLE = True
except ImportError as _fe_err:
    _FACE_ENGINE_AVAILABLE = False
    print(f"⚠️  face_engine / face_reader not importable: {_fe_err}")

try:
    from synthesis.palm_engine import PalmEngine
    from synthesis.palm_reader import PalmReader
    _PALM_ENGINE_AVAILABLE = True
except ImportError as _pe_err:
    _PALM_ENGINE_AVAILABLE = False
    print(f"⚠️  palm_engine / palm_reader not importable: {_pe_err}")

try:
    from synthesis.synastry_engine import compute_synastry_profile
    from synthesis.synastry_reader import read_synastry
    _SYNASTRY_AVAILABLE = True
except ImportError as _se_err:
    _SYNASTRY_AVAILABLE = False
    print(f"⚠️  synastry_engine / synastry_reader not importable: {_se_err}")

try:
    from synthesis.numerology_engine import compute_numerology_profile
    from synthesis.numerology_reader import read_numerology
    _NUMEROLOGY_AVAILABLE = True
except ImportError as _ne_err:
    _NUMEROLOGY_AVAILABLE = False
    print(f"⚠️  numerology_engine / numerology_reader not importable: {_ne_err}")

try:
    from synthesis.astrology_engine import compute_western
    from synthesis.logic.astrology_selector import select_systems
    _ASTROLOGY_AVAILABLE = True
except ImportError as _ae_err:
    _ASTROLOGY_AVAILABLE = False
    print(f"⚠️  astrology_engine not importable: {_ae_err}")

try:
    from synthesis.logic import run_logic_engine
    from synthesis.logic.models import BirthData, GeoLocation, UserInput, ALL_DOMAINS
    _LOGIC_AVAILABLE = True
except ImportError as _le_err:
    _LOGIC_AVAILABLE = False
    print(f"⚠️  logic layer not importable: {_le_err}")

try:
    from delivery.llm_narrator import narrate
    _NARRATOR_AVAILABLE = True
except ImportError as _ln_err:
    _NARRATOR_AVAILABLE = False
    print(f"⚠️  llm_narrator not importable: {_ln_err}")

try:
    # v8.2.0: async_geocode_birth_location added — prevents time.sleep() blocking event loop
    from services.geo_service import (
        geocode_birth_location,
        async_geocode_birth_location,
        _fallback_geo,
        GeoResult,
    )
    _GEO_AVAILABLE = True
except ImportError as _geo_err:
    _GEO_AVAILABLE = False
    print(f"⚠️  services.geo_service not importable: {_geo_err}")

try:
    from api.welcome import generate_welcome_reading
    from api.tool_teaser import generate_tool_teaser
    _WELCOME_AVAILABLE = True
except ImportError:
    _WELCOME_AVAILABLE = False

try:
    # v8.2.0: updated to import new handler names from api.daily.daily_card
    from api.daily.daily_card import handle_daily_guidance, handle_daily_pdf
    _DAILY_AVAILABLE = True
except ImportError:
    _DAILY_AVAILABLE = False

try:
    from api.reading.submit import handle_add_purchase
    _PURCHASE_HANDLER_AVAILABLE = True
except ImportError:
    _PURCHASE_HANDLER_AVAILABLE = False

try:
    from api.agency.chat import handle_chat
    _AGENCY_CHAT_AVAILABLE = True
except ImportError:
    _AGENCY_CHAT_AVAILABLE = False

try:
    from api.agency.voice import handle_voice_websocket
    _AGENCY_VOICE_AVAILABLE = True
except ImportError:
    _AGENCY_VOICE_AVAILABLE = False

try:
    from api.subscription.cancel import handle_cancel, handle_reactivate
    _SUBSCRIPTION_AVAILABLE = True
except ImportError:
    _SUBSCRIPTION_AVAILABLE = False

try:
    from delivery.pdf_formatter import generate_pdf
    _PDF_AVAILABLE = True
except ImportError:
    _PDF_AVAILABLE = False

try:
    from free_reading_endpoint import router as _free_reading_router
    _FREE_READING_AVAILABLE = True
    print("✅ free_reading_endpoint loaded")
except ImportError as _fre_err:
    _FREE_READING_AVAILABLE = False
    _free_reading_router   = None
    print(f"⚠️  free_reading_endpoint not importable: {_fre_err}")


# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────
ENVIRONMENT   = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"
FRONTEND_URL  = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EXTRA_ORIGINS = [o.strip() for o in os.environ.get("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]
OLLAMA_URL    = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")

ALLOWED_ORIGINS = [
    "https://app.kayalsoulpath.com",
    "https://members.kayalsoulpath.com",
    "https://affiliate.kayalsoulpath.com",
    "https://admin.kayalsoulpath.com",
    "http://localhost:3000",
    "*",
]

# ─────────────────────────────────────────────
# Database — psycopg2
# ─────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise Exception(
        "DATABASE_URL environment variable not set. "
        "Please create a .env file with DATABASE_URL=postgresql://..."
    )


def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ─────────────────────────────────────────────
# Supabase client
# ─────────────────────────────────────────────
def _get_supabase():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None
        return create_client(url, key)
    except ImportError:
        return None



# ─────────────────────────────────────────────
# Database init
# ─────────────────────────────────────────────
def init_db():
    conn = get_db_connection()
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id      SERIAL PRIMARY KEY,
            token   TEXT UNIQUE NOT NULL,
            name    TEXT,
            age     INTEGER,
            gender  TEXT,
            created TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id               SERIAL PRIMARY KEY,
            token            TEXT NOT NULL,
            life_path        INTEGER,
            expression       INTEGER,
            soul_urge        INTEGER,
            personality      INTEGER,
            personal_year    INTEGER,
            personal_month   INTEGER,
            personal_day     INTEGER,
            current_pinnacle TEXT,
            sun_sign         TEXT,
            moon_sign        TEXT,
            rising_sign      TEXT,
            venus_sign       TEXT,
            mars_sign        TEXT,
            jupiter_sign     TEXT,
            saturn_sign      TEXT,
            face_shape       TEXT,
            face_archetype   TEXT,
            face_traits      TEXT,
            timestamp        TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS palm_analyses (
            id                  SERIAL PRIMARY KEY,
            token               TEXT NOT NULL,
            hand_shape          TEXT,
            hand_element        TEXT,
            ruling_planet       TEXT,
            life_line           TEXT,
            heart_line          TEXT,
            head_line           TEXT,
            fate_line           TEXT,
            thumb_type          TEXT,
            finger_proportions  TEXT,
            mounts              TEXT,
            marriage_lines      TEXT,
            children_lines      TEXT,
            timestamp           TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id         SERIAL PRIMARY KEY,
            token      TEXT NOT NULL,
            session_id TEXT,
            role       TEXT NOT NULL,
            content    TEXT,
            timestamp  TEXT
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_conversations_token   ON conversations(token)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id        SERIAL PRIMARY KEY,
            token     TEXT NOT NULL,
            message   TEXT,
            response  TEXT,
            timestamp TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS narrative_sessions (
            id         SERIAL PRIMARY KEY,
            token      TEXT NOT NULL,
            session_id TEXT,
            tool_id    TEXT,
            narrative  TEXT,
            timestamp  TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS palm_images (
            id              SERIAL PRIMARY KEY,
            token           TEXT NOT NULL,
            image_path      TEXT,
            thumbnail_path  TEXT,
            hand            TEXT,
            uploaded_at     TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS face_images (
            id              SERIAL PRIMARY KEY,
            token           TEXT NOT NULL,
            image_path      TEXT,
            thumbnail_path  TEXT,
            angle           TEXT,
            uploaded_at     TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS domains (
            id        SERIAL PRIMARY KEY,
            token     TEXT NOT NULL,
            domain_id INTEGER NOT NULL,
            unlocked  INTEGER DEFAULT 0,
            UNIQUE (token, domain_id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id           TEXT PRIMARY KEY,
            user_token   TEXT NOT NULL,
            tool_id      TEXT NOT NULL,
            status       TEXT NOT NULL DEFAULT 'pending',
            result       TEXT,
            error        TEXT,
            created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_token ON jobs(user_token)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status)")

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Database tables verified/created successfully")


# ─────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n{'='*70}")
    print("🚀 KAYAL SYNTHESIS ENGINE v8.2.0")
    print(f"{'='*70}")
    print(f"  Environment      : {ENVIRONMENT}")
    print(f"  Origins          : {ALLOWED_ORIGINS}")
    print(f"  Face engine      : {'✅' if _FACE_ENGINE_AVAILABLE else '❌ (run: pip install mediapipe)'}")
    print(f"  Palm engine      : {'✅' if _PALM_ENGINE_AVAILABLE else '❌ (run: pip install mediapipe)'}")
    print(f"  Numerology       : {'✅' if _NUMEROLOGY_AVAILABLE else '❌'}")
    print(f"  Astrology        : {'✅' if _ASTROLOGY_AVAILABLE else '❌ (check EPHE_PATH + .se1 files)'}")
    print(f"  Logic layer      : {'✅' if _LOGIC_AVAILABLE else '❌'}")
    print(f"  LLM narrator     : {'✅' if _NARRATOR_AVAILABLE else '❌ (check ANTHROPIC_API_KEY)'}")
    print(f"  Free reading API : {'✅' if _FREE_READING_AVAILABLE else '❌ (free_reading_endpoint.py missing)'}")

    init_db()

    sb = _get_supabase()
    if sb:
        try:
            sb.table("purchases").select("id").limit(1).execute()
            print("  Supabase         : ✅ connected")
        except Exception as e:
            print(f"  Supabase         : ⚠️  {e}")
    else:
        print("  Supabase         : ⚠️  not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY)")

    print(f"{'='*70}\n")
    yield
    print("KAYAL API shutting down")


# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(
    title    = "KAYAL Synthesis Engine",
    version  = "8.2.0",
    lifespan = lifespan,
    docs_url = None if IS_PRODUCTION else "/docs",
    redoc_url= None if IS_PRODUCTION else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers     = ["*"],
    allow_credentials = True,
    expose_headers    = ["X-Response-Text", "X-Session-ID", "X-Request-ID", "X-Response-Time"],
)

if IS_PRODUCTION:
    railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")
    if railway_domain:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[railway_domain, f"*.{railway_domain}", "*.railway.app"],
        )

if _free_reading_router is not None:
    app.include_router(_free_reading_router)

@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    import time
    request_id = str(uuid.uuid4())[:8]
    start      = time.monotonic()
    response   = await call_next(request)
    elapsed_ms = int((time.monotonic() - start) * 1000)
    response.headers["X-Request-ID"]    = request_id
    response.headers["X-Response-Time"] = f"{elapsed_ms}ms"
    return response


# ─────────────────────────────────────────────
# Static files + upload dirs
# ─────────────────────────────────────────────
UPLOAD_DIR    = Path("uploads")
PALM_DIR      = UPLOAD_DIR / "palm"
FACE_DIR      = UPLOAD_DIR / "face"
THUMBNAIL_DIR = UPLOAD_DIR / "thumbnails"

for _dir in [UPLOAD_DIR, PALM_DIR, FACE_DIR, THUMBNAIL_DIR]:
    _dir.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─────────────────────────────────────────────
# Whisper STT
# ─────────────────────────────────────────────
_WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "tiny")
print(f"🔄 Loading Whisper ({_WHISPER_MODEL_SIZE})...")
whisper_model = WhisperModel(_WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
print("✅ Whisper ready")


# ─────────────────────────────────────────────
# TTS — edge-tts primary, gTTS fallback
# ─────────────────────────────────────────────
async def text_to_speech(text: str, use_edge: bool = True) -> Optional[bytes]:
    if use_edge:
        try:
            import edge_tts
            voice = os.environ.get("EDGE_TTS_VOICE", "en-US-JennyNeural")
            communicate = edge_tts.Communicate(text=text, voice=voice, rate="-8%", pitch="+2Hz")
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])
            audio_bytes = audio_buffer.getvalue()
            if audio_bytes:
                return audio_bytes
        except ImportError:
            pass
        except Exception as e:
            print(f"⚠️ edge-tts error: {e} — falling back to gTTS")

    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="en", slow=False)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
            tts.save(f.name)
            with open(f.name, "rb") as af:
                audio_data = af.read()
        os.unlink(f.name)
        return audio_data
    except Exception as e:
        print(f"❌ TTS Error: {e}")
        return None


# ─────────────────────────────────────────────
# IP geolocation helpers
# ─────────────────────────────────────────────
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    return request.client.host


def geolocate_ip(ip: str) -> Optional[Dict]:
    try:
        resp = requests.get(f"https://ipapi.co/{ip}/json/", timeout=3)
        data = resp.json()
        if data.get("country_name"):
            return {
                "country":   data.get("country_name"),
                "city":      data.get("city"),
                "latitude":  data.get("latitude"),
                "longitude": data.get("longitude"),
                "timezone":  data.get("timezone"),
            }
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────
def generate_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()[:16]


def create_thumbnail(image_path: Path, size=(300, 300)) -> Path:
    thumbnail_path = THUMBNAIL_DIR / f"{image_path.stem}_thumb{image_path.suffix}"
    with Image.open(image_path) as img:
        img.thumbnail(size, Image.Resampling.LANCZOS)
        img.save(thumbnail_path, optimize=True, quality=85)
    return thumbnail_path


def calculate_age(birth_date_obj) -> int:
    today = datetime.now()
    age   = today.year - birth_date_obj.year
    if (today.month, today.day) < (birth_date_obj.month, birth_date_obj.day):
        age -= 1
    return age



# ─────────────────────────────────────────────
# Jenny / Ollama chat
# ─────────────────────────────────────────────
FAST_RESPONSES = [
    "I hear you!", "Tell me more!", "Go on...", "That's interesting!",
    "I'm listening.", "Oh really?", "That's cool!", "I see!",
    "Nice!", "Got it!", "Makes sense.", "Absolutely!",
    "For sure!", "Definitely!", "Right?", "Exactly!",
    "Totally!", "Same!", "Oh wow!", "No way!",
    "Seriously?", "That's wild!", "I love that!", "Good point!",
    "Fair enough!", "True true.", "You think so?", "How come?",
    "Why's that?", "What else?"
]
GREETING_RESPONSES = [
    "Hey there! How's your day going?",
    "Hi! So glad you're here. What's on your mind?",
    "Hello! I was just thinking about our last chat. How are you?",
    "Hey! You sound good today. What's new?",
    "Hi! I'm all ears. Tell me what's happening.",
]
HOW_ARE_YOU_RESPONSES = [
    "I'm doing really well, thanks for asking! How about you?",
    "Feeling great! Especially now that we're talking. You?",
    "I'm good! A little tired but happy to be here. How are you?",
    "Doing awesome! Your conversations always brighten my day. How are things?",
    "I'm wonderful! Thanks for checking in. How are you feeling?",
]
JENNY_RESPONSES = [
    "That's me! Jenny, your AI friend. So nice to talk with you!",
    "Yep, I'm Jenny! I love our conversations. What should we chat about?",
    "It's me, Jenny! I'm always here when you need someone to talk to.",
    "Jenny, at your service! How can I brighten your day today?",
]


async def get_jenny_response(text: str, session_id: str = None) -> str:
    try:
        health_check = requests.get("http://localhost:11434/api/tags", timeout=1)
        if health_check.status_code != 200:
            return random.choice(FAST_RESPONSES)
        models  = [m["name"] for m in health_check.json().get("models", [])]
        model   = "tinyllama:1.1b" if "tinyllama:1.1b" in models else (
                  "tinyllama:latest" if "tinyllama:latest" in models else "llama2:latest")
        timeout = 2 if "tinyllama" in model else 5
        text_lower = text.lower()
        if any(w in text_lower for w in ["hello", "hi", "hey", "howdy"]):
            return random.choice(GREETING_RESPONSES)
        if "how are you" in text_lower:
            return random.choice(HOW_ARE_YOU_RESPONSES)
        if any(w in text_lower for w in ["your name", "who are you", "jenny"]):
            return random.choice(JENNY_RESPONSES)
        if "thank" in text_lower:
            return random.choice(["You're welcome!", "Anytime!", "Happy to help!", "My pleasure!", "Of course!"])
        if any(w in text_lower for w in ["bye", "goodbye", "see you", "later"]):
            return random.choice(["Goodbye! Come back soon!", "See you later!", "Take care!", "Bye for now!", "Talk soon!"])
        prompt = f"User: {text}\nJenny (short reply, 5-10 words):"
        try:
            response = requests.post(OLLAMA_URL, json={
                "model": model, "prompt": prompt, "stream": False,
                "temperature": 0.9, "max_tokens": 15,
                "options": {"num_predict": 15, "top_k": 30, "top_p": 0.8, "repeat_penalty": 1.2},
            }, timeout=timeout)
            if response.status_code == 200:
                ai_response = response.json().get("response", "").strip()
                ai_response = ai_response.replace('"', "").replace("'", "")
                ai_response = ai_response.split("\n")[0][:100]
                return ai_response if len(ai_response) >= 5 else random.choice(FAST_RESPONSES)
        except requests.exceptions.Timeout:
            return random.choice(FAST_RESPONSES)
        except Exception as e:
            print(f"⚠️ AI generation error: {e}")
            return random.choice(FAST_RESPONSES)
    except Exception as e:
        print(f"❌ AI Error: {e}")
        return random.choice(FAST_RESPONSES)


# ─────────────────────────────────────────────
# Numerology helper functions
# ─────────────────────────────────────────────
def reduce_to_single(num: int, preserve_master: bool = True) -> int:
    master_numbers = [11, 22, 33]
    if preserve_master and num in master_numbers:
        return num
    while num > 9 and num not in master_numbers:
        num = sum(int(d) for d in str(num))
    return num


def calculate_life_path(birth_date: str) -> int:
    digits = [int(d) for d in birth_date if d.isdigit()]
    return reduce_to_single(sum(digits), preserve_master=True)


def calculate_personal_year(birth_month: int, birth_day: int, current_year: int) -> int:
    return reduce_to_single(
        reduce_to_single(birth_month, False) +
        reduce_to_single(birth_day, False) +
        reduce_to_single(current_year, False), False,
    )


def calculate_personal_month(personal_year: int, current_month: int) -> int:
    return reduce_to_single(
        reduce_to_single(personal_year, False) + reduce_to_single(current_month, False), False
    )


def calculate_personal_day(personal_month: int, current_day: int) -> int:
    return reduce_to_single(
        reduce_to_single(personal_month, False) + reduce_to_single(current_day, False), False
    )


def calculate_expression_number(name: str) -> int:
    chart = {c: i % 9 + 1 for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
    name  = name.upper().replace(" ", "").replace("-", "").replace("'", "")
    return reduce_to_single(sum(chart.get(c, 0) for c in name), True)


def calculate_soul_urge(name: str) -> int:
    chart  = {"A": 1, "E": 5, "I": 9, "O": 6, "U": 3, "Y": 7}
    name   = name.upper()
    vowels = [c for i, c in enumerate(name) if c in chart and not (c == "Y" and 0 < i < len(name) - 1)]
    total  = sum(chart.get(v, 0) for v in vowels)
    return reduce_to_single(total or 7, True)


def calculate_personality_number(name: str) -> int:
    chart      = {c: i % 9 + 1 for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
    consonants = set("BCDFGHJKLMNPQRSTVWXYZ")
    name       = name.upper().replace(" ", "").replace("-", "").replace("'", "")
    return reduce_to_single(sum(chart[c] for c in name if c in consonants and c in chart), True)


def calculate_pinnacles(birth_month: int, birth_day: int, birth_year: int) -> list:
    m  = reduce_to_single(birth_month, False)
    d  = reduce_to_single(birth_day, False)
    y  = reduce_to_single(birth_year, False)
    p1 = reduce_to_single(m + d, True)
    p2 = reduce_to_single(d + y, True)
    p3 = reduce_to_single(reduce_to_single(p1, False) + reduce_to_single(p2, False), True)
    p4 = reduce_to_single(m + y, True)
    return [p1, p2, p3, p4]


def calculate_pinnacle_ages(birth_month: int, birth_day: int, birth_year: int, current_age: int) -> dict:
    lp    = calculate_life_path(f"{birth_year}-{birth_month:02d}-{birth_day:02d}")
    lp_r  = reduce_to_single(lp, False)
    first = 36 - lp_r
    ranges = {
        "first":  {"start": 0,          "end": first},
        "second": {"start": first + 1,  "end": first + 10},
        "third":  {"start": first + 11, "end": first + 20},
        "fourth": {"start": first + 21, "end": 99},
    }
    current = next((n for n, a in ranges.items() if a["start"] <= current_age <= a["end"]), "first")
    return {"ranges": ranges, "current": current, "years_remaining": ranges[current]["end"] - current_age}


def calculate_challenges(birth_month: int, birth_day: int, birth_year: int) -> list:
    m  = reduce_to_single(birth_month, False)
    d  = reduce_to_single(birth_day, False)
    y  = reduce_to_single(birth_year, False)
    c1 = abs(m - d) or 9
    c2 = abs(d - y) or 9
    c3 = abs(c1 - c2) or 9
    c4 = abs(m - y) or 9
    return [c1, c2, c3, c4]


def calculate_karmic_lessons(name: str) -> list:
    chart   = {c: i % 9 + 1 for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}
    name    = name.upper().replace(" ", "").replace("-", "").replace("'", "")
    present = {chart[c] for c in name if c in chart}
    return sorted(set(range(1, 10)) - present)


def calculate_birthday_gift_challenge(birth_day: int) -> dict:
    if 1 <= birth_day <= 9:
        challenge = birth_day
    elif birth_day in [11, 22]:
        challenge = 0
    else:
        digits    = [int(d) for d in str(birth_day)]
        challenge = max(digits) - min(digits)
    return {"gift": {"number": 9 - challenge}, "challenge": {"number": challenge}}


def calculate_full_numerology(
    name: str, birth_day: int, birth_month: int, birth_year: int, current_age: int
) -> dict:
    lp   = calculate_life_path(f"{birth_year}-{birth_month:02d}-{birth_day:02d}")
    expr = calculate_expression_number(name)
    su   = calculate_soul_urge(name)
    pers = calculate_personality_number(name)
    now  = datetime.now()
    py   = calculate_personal_year(birth_month, birth_day, now.year)
    pm   = calculate_personal_month(py, now.month)
    pd   = calculate_personal_day(pm, now.day)
    pins = calculate_pinnacles(birth_month, birth_day, birth_year)
    page = calculate_pinnacle_ages(birth_month, birth_day, birth_year, current_age)
    chal = calculate_challenges(birth_month, birth_day, birth_year)
    karm = calculate_karmic_lessons(name)
    bday = calculate_birthday_gift_challenge(birth_day)
    return {
        "core":        {"life_path": lp, "expression": expr, "soul_urge": su, "personality": pers},
        "time_cycles": {"personal_year": py, "personal_month": pm, "personal_day": pd},
        "pinnacles":   {
            "first": pins[0], "second": pins[1], "third": pins[2], "fourth": pins[3],
            "ages":  page["ranges"], "current": page["current"],
            "years_remaining": page["years_remaining"],
        },
        "challenges":     {"first": chal[0], "second": chal[1], "third": chal[2], "fourth": chal[3]},
        "karmic_lessons": karm,
        "birthday":       {"day": birth_day, "gift": bday["gift"], "challenge": bday["challenge"]},
        "master_numbers": [n for n in [lp, expr, su, pers] + pins if n in [11, 22, 33]],
    }


# ─────────────────────────────────────────────
# Legacy OpenCV face analysis
# ─────────────────────────────────────────────
def _analyze_face_opencv(image_bytes: bytes) -> dict:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)

        gray       = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        brightness = int(np.mean(gray))
        contrast   = int(np.std(gray))
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))

        face_shape = "oval"; archetype = "The Leader"; traits = ["balanced", "adaptable", "strategic"]
        symmetry = 75; face_detected = False; face_position = None; face_count = 0
        forehead_lines = 0; brow_tension = False; jaw_tension = False; nasolabial_folds = False
        eye_depth = "almond"; nose_bridge = "straight"; lip_fullness = "full"
        chin_type = "rounded"; cheekbone_prominence = "moderate"

        if len(faces) > 0:
            face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = face
            face_count = len(faces); face_position = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
            face_detected = True; ar = w / h
            if ar > 0.95:
                face_shape, archetype, traits = "round", "The Harmonizer", ["approachable", "empathetic", "communicative"]
                cheekbone_prominence = "low"
            elif ar > 0.85:
                face_shape, archetype, traits = "oval", "The Leader", ["balanced", "adaptable", "strategic"]
                cheekbone_prominence = "moderate"
            else:
                face_shape, archetype, traits = "oblong", "The Thinker", ["analytical", "focused", "methodical"]
                cheekbone_prominence = "high"
            symmetry = min(90, 70 + (brightness % 20))
            roi = gray[y:y+h, x:x+w]
            if roi.shape[0] > 10 and roi.shape[1] > 10:
                if np.std(roi) > 50: brow_tension = True
                if w > 200:
                    forehead_lines = min(3, int(brightness / 50))
                    jaw_tension = True; nasolabial_folds = True
            eye_depth = "deep_set" if symmetry > 80 else "almond"
            lip_fullness = "full" if brightness > 100 else "thin"
            chin_type = "rounded" if face_shape == "oval" else "square"

        element_map = {"round": "earth", "square": "earth", "oval": "air", "oblong": "air", "heart": "fire"}
        return {
            "face_detected": face_detected, "face_count": face_count, "face_position": face_position,
            "face_shape": face_shape, "face_archetype": archetype, "face_traits": traits,
            "symmetry_score": symmetry, "brightness": brightness, "contrast": contrast, "confidence": 85,
            "forehead_lines": forehead_lines, "brow_tension": brow_tension, "jaw_tension": jaw_tension,
            "nasolabial_folds": nasolabial_folds, "eyes": eye_depth, "nose": nose_bridge,
            "mouth": "full_lips" if lip_fullness == "full" else "thin_lips",
            "chin": chin_type, "cheekbones": cheekbone_prominence,
            "element": element_map.get(face_shape, "water"),
        }
    except Exception as e:
        print(f"OpenCV face analysis error: {e}")
        return {
            "face_detected": False, "face_count": 0, "face_position": None,
            "face_shape": "oval", "face_archetype": "The Leader",
            "face_traits": ["balanced", "adaptable", "strategic"],
            "symmetry_score": 75, "brightness": 128, "contrast": 50, "confidence": 70,
            "forehead_lines": 0, "brow_tension": False, "jaw_tension": False,
            "nasolabial_folds": False, "eyes": "almond", "nose": "straight",
            "mouth": "full_lips", "chin": "rounded", "cheekbones": "moderate", "element": "earth",
        }


# ─────────────────────────────────────────────
# Shared helper: JSON-safe serialiser
# ─────────────────────────────────────────────
def _safe(obj):
    import dataclasses, enum
    if dataclasses.is_dataclass(obj):
        return {k: _safe(v) for k, v in dataclasses.asdict(obj).items()}
    if isinstance(obj, enum.Enum):
        return obj.value
    if isinstance(obj, (list, tuple)):
        return [_safe(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _safe(v) for k, v in obj.items()}
    try:
        if isinstance(obj, np.integer):  return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray):  return obj.tolist()
    except Exception:
        pass
    return obj


# ─────────────────────────────────────────────
# KAYAL timing theme lookups
# ─────────────────────────────────────────────
_PYV_THEMES = {
    1:"New beginnings — initiate what matters most",
    2:"Cooperation and patience — work with others",
    3:"Creative expression — express yourself",
    4:"Hard work and foundation building — build steadily",
    5:"Freedom and change — embrace the unexpected",
    6:"Service and responsibility — love and commitment",
    7:"Reflection and spiritual depth — go inward",
    8:"Achievement and material success — harvest time",
    9:"Completion and release — let go gracefully",
    11:"Spiritual awakening and illumination — heightened sensitivity",
    22:"Master builder year — grand work becomes possible",
    33:"Master teacher year — serve from love",
}
_MONTH_THEMES = {
    1:"New initiatives",2:"Cooperation",3:"Expression",
    4:"Discipline",5:"Change",6:"Love and harmony",
    7:"Reflection",8:"Achievement",9:"Completion",
}
_WEEK_THEMES = {
    1:"A week of new starts",2:"A week of partnership",3:"A week of expression",
    4:"A week of focused work",5:"A week of movement",6:"A week of care",
    7:"A week of reflection",8:"A week of power",9:"A week of endings",
    11:"A master week of heightened intuition",22:"A master week of building",
}
_DAY_THEMES = {
    1:"Independence and clarity",2:"Sensitivity and cooperation",
    3:"Joy and expression",4:"Discipline and focus",
    5:"Change and freedom",6:"Love and responsibility",
    7:"Solitude and insight",8:"Power and achievement",9:"Completion and wisdom",
    11:"Intuition and illumination",22:"Master builder energy",
}
def _pyv_theme(n): return _PYV_THEMES.get(n, "A year of significant development")
def _month_theme(n): b=n%9 or 9; return _MONTH_THEMES.get(b, "Monthly energy in transition")
def _week_theme(n): return _WEEK_THEMES.get(n if n in (11,22) else (n%9 or 9), "Weekly energy")
def _day_theme(n):  return _DAY_THEMES.get(n if n in (11,22) else (n%9 or 9), "Daily vibration")

_FACE_ARCHETYPE = {
    "oval":     "The Diplomat",
    "round":    "The Harmonizer",
    "square":   "The Builder",
    "heart":    "The Visionary",
    "oblong":   "The Thinker",
    "diamond":  "The Innovator",
    "triangle": "The Achiever",
    "unclear":  "The Seeker",
}


# ─────────────────────────────────────────────
# Face feature extractor
# ─────────────────────────────────────────────
def _face_summary_from_features(features, face_reading=None) -> dict:
    props = getattr(features, "proportions", None)
    sym   = getattr(features, "symmetry",    None)
    jaw   = getattr(features, "jaw",         None)
    cheeks= getattr(features, "cheeks",      None)
    nose  = getattr(features, "nose",        None)
    lips  = getattr(features, "lips",        None)
    brows = getattr(features, "brows",       None)
    fh    = getattr(features, "forehead",    None)
    leye  = getattr(features, "left_eye",    None)
    reye  = getattr(features, "right_eye",   None)
    skin  = getattr(features, "skin",        None)
    expr  = getattr(features, "expression",  None)
    aging = getattr(features, "aging_markers", None)

    def fv(obj, *attrs, default=None):
        for a in attrs:
            if obj is None: return default
            obj = getattr(obj, a, None)
        return obj if obj is not None else default

    def rv(obj, *attrs, default=0.0):
        val = fv(obj, *attrs, default=default)
        try: return round(float(val), 4)
        except: return default

    def sv(obj, *attrs):
        val = fv(obj, *attrs)
        if val is None: return None
        return val.value if hasattr(val, "value") else val

    shape_str = sv(features, "face_shape")

    summary = {
        "face_shape":        shape_str,
        "confidence":        rv(features, "confidence"),
        "image_quality":     sv(features, "image_quality"),
        "landmark_count":    fv(features, "landmark_count", default=0),
        "processing_ms":     fv(features, "processing_ms", default=0),
        "facial_thirds": {
            "upper": rv(props, "upper_third_ratio"),
            "middle":rv(props, "middle_third_ratio"),
            "lower": rv(props, "lower_third_ratio"),
        } if props else None,
        "facial_index":       rv(props, "facial_index"),
        "jaw_angle_deg":      rv(props, "gonial_angle_deg"),
        "forehead_ratio":     rv(props, "upper_third_ratio"),
        "nose_width_ratio":   rv(props, "nose_width_to_face"),
        "mouth_width_ratio":  rv(props, "mouth_width_to_face"),
        "intercanthal_ratio": rv(props, "intercanthal_ratio"),
        "eye_width_ratio":    rv(props, "eye_width_to_face"),
        "chin_height_ratio":  rv(props, "chin_height_ratio"),
        "philtrum_ratio":     rv(props, "philtrum_ratio"),
        "bilateral_symmetry": rv(sym, "overall"),
        "symmetry_zones": {
            "upper":  rv(sym, "upper_third"),
            "middle": rv(sym, "middle_third"),
            "lower":  rv(sym, "lower_third"),
        } if sym else None,
        "jaw_type":        sv(jaw,    "jawline_type"),
        "chin_shape":      sv(jaw,    "chin_shape"),
        "chin_projection": sv(jaw,    "chin_projection"),
        "cheekbone_pos":   sv(cheeks, "cheekbone_position"),
        "cheekbone_width": sv(cheeks, "cheekbone_width"),
        "nose_shape":      sv(nose,   "shape"),
        "lip_shape":       sv(lips,   "shape"),
        "lip_fullness":    sv(lips,   "lip_fullness"),
        "brow_shape":      sv(brows,  "shape"),
        "brow_arch":       sv(brows,  "arch_height"),
        "forehead_height": sv(fh,     "height"),
        "forehead_width":  sv(fh,     "width"),
        "left_eye_shape":  sv(leye,   "shape"),
        "right_eye_shape": sv(reye,   "shape"),
        "eye_tilt":        rv(leye,   "tilt_deg"),
        "eye_set":         sv(leye,   "set_position"),
        "skin_tone":       sv(skin,   "tone"),
        "skin_texture":    sv(skin,   "texture"),
        "skin_radiance":   sv(skin,   "radiance"),
        "expression":      sv(expr,   "dominant_signal"),
        "smile_present":   fv(expr,   "smile_present", default=False),
        "jaw_openness":    rv(expr,   "jaw_openness"),
        "raw_ratios":      fv(features, "raw_ratios", default={}),
    }

    if face_reading:
        _fs = getattr(face_reading, "face_shape", None)
        shape_val = sv(_fs, "shape") or shape_str or "unclear"
        summary["element"]            = fv(_fs, "element")
        summary["archetype"]          = _FACE_ARCHETYPE.get(shape_val, "The Seeker")
        summary["character_core"]     = fv(_fs, "character_core")
        summary["life_period"]        = fv(_fs, "life_period")
        summary["chinese_note"]       = fv(_fs, "chinese_note")
        summary["domain_signals"]     = fv(face_reading, "confirmed_signals", default={})
        summary["conflicting"]        = fv(face_reading, "conflicting_signals", default={})
        summary["dominant_themes"]    = fv(face_reading, "dominant_themes", default=[])
        summary["life_period_map"]    = fv(face_reading, "life_period_map", default={})
        summary["reading_confidence"] = round(float(getattr(face_reading, "overall_confidence", 0) or 0), 4)

    return summary


def _get_sun_sign(day: int, month: int) -> str:
    signs = [
        (1,19,"Capricorn"),(2,18,"Aquarius"),(3,20,"Pisces"),
        (4,19,"Aries"),(5,20,"Taurus"),(6,20,"Gemini"),
        (7,22,"Cancer"),(8,22,"Leo"),(9,22,"Virgo"),
        (10,22,"Libra"),(11,21,"Scorpio"),(12,21,"Sagittarius"),
        (12,31,"Capricorn"),
    ]
    for cm, cd, sign in signs:
        if month < cm or (month == cm and day <= cd):
            return sign
    return "Capricorn"


_MIDPOINT_PAIRS = [("Sun", "Moon"), ("Sun", "Venus"), ("Moon", "Venus"), ("Venus", "Mars"), ("Sun", "Mars")]


def _calculate_midpoints_and_antiscia(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict:
    """
    NEW — not present anywhere in astrology_engine.py, but the midpoint formula itself is
    copied verbatim from compute_composite_chart() ("mid = (lon_a + lon_b) / 2; if
    abs(lon_a - lon_b) > 180: mid = (mid + 180) % 360"), not invented — already proven
    correct in the live composite-chart code, just applied to planet pairs within one
    person's chart instead of the same planet across two people. Antiscia is the standard
    mirror-point formula (antiscion = (180 - longitude) % 360).

    Requires raw natal positions, which compute_western()/compute_astrology() compute
    internally but never return — so this calls _calculate_positions()/_julian_day()
    directly (both "private" by convention, still importable) rather than modifying
    astrology_engine.py's existing public API.
    """
    from synthesis.astrology_engine import _julian_day, _calculate_positions, _degree_to_sign

    try:
        birth_jd = _julian_day(year, month, day, hour, utc_offset)
        positions = _calculate_positions(birth_jd, use_sidereal=False)
    except Exception as e:
        print(f"⚠️ Midpoint/antiscia calculation failed: {e}")
        return {"midpoints": {}, "antiscia": {}}

    midpoints = {}
    for a, b in _MIDPOINT_PAIRS:
        if a not in positions or b not in positions:
            continue
        lon_a = positions[a]["longitude"]
        lon_b = positions[b]["longitude"]
        mid = (lon_a + lon_b) / 2
        if abs(lon_a - lon_b) > 180:
            mid = (mid + 180) % 360
        sign, deg, _ = _degree_to_sign(mid)
        midpoints[f"{a}/{b}"] = {"sign": sign, "degree": round(deg, 2)}

    antiscia = {}
    for planet, pos in positions.items():
        lon = pos.get("longitude")
        if lon is None:
            continue
        antiscion_lon = (180 - lon) % 360
        sign, deg, _ = _degree_to_sign(antiscion_lon)
        antiscia[planet] = {"sign": sign, "degree": round(deg, 2)}

    return {"midpoints": midpoints, "antiscia": antiscia}


# ---------------------------------------------------------------------------
# System selection — GENUINELY NEW. Nothing in astrology_engine.py, geo_service.py, or
# anywhere else picks Western vs. Vedic based on where someone is from or currently is —
# confirmed by reading every file available. compute_western()/compute_vedic()/
# compute_both() all already exist and work; this is the missing piece that decides which
# one to call, using country_code (already populated by geo_service.py's real Nominatim
# geocoding — geo_service.py itself never uses this field for anything).
#
# Rule: birth country in the Vedic/Jyotish tradition → compute_both() (richest reading —
# ancestral system plus Western for broader context). Currently living in one, but not born
# there → same. Neither → Western only, matching what's actually live today. This list is a
# reasonable starting point (South Asia plus places with large, sustained Vedic-tradition
# diaspora), not an authoritative or exhaustive cultural claim — easy to adjust the set of
# country codes below without touching anything else.
# ---------------------------------------------------------------------------

_VEDIC_TRADITION_COUNTRIES = {
    "IN", "NP", "LK", "BD", "BT",  # South Asia
    "MU", "FJ", "TT", "GY", "SR",  # large, sustained Vedic-tradition diaspora
}


def select_astrology_system(birth_country_code: str, present_country_code: str = "") -> str:
    """Returns 'western' or 'both' — never 'vedic' alone, since Western stays the baseline
    everyone gets today; Vedic is additive for the people it's actually relevant to."""
    birth_is_vedic = (birth_country_code or "").upper() in _VEDIC_TRADITION_COUNTRIES
    present_is_vedic = (present_country_code or "").upper() in _VEDIC_TRADITION_COUNTRIES
    return "both" if (birth_is_vedic or present_is_vedic) else "western"


# ---------------------------------------------------------------------------
# Asteroids — GENUINELY NEW, not present anywhere in astrology_engine.py's _PLANETS dict
# (confirmed: only the 10 classical bodies + Rahu). Requires seas_18.se1 in the ephemeris
# directory, which was tested directly against real Swiss Ephemeris calls before writing
# this — swe.calc_ut() for Chiron/Ceres/Pallas/Juno/Vesta all returned real, distinct,
# plausible longitudes for both a 2000 and a 2026 test date. If seas_18.se1 isn't actually
# present in EPHE_PATH on the server this runs on, each asteroid fails independently
# (caught below) rather than taking down the whole reading — same defensive pattern as
# every other addition in this file.
# ---------------------------------------------------------------------------

_ASTEROID_IDS = {"Chiron": 15, "Ceres": 17, "Pallas": 18, "Juno": 19, "Vesta": 20}


def _calculate_asteroids(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict:
    if not _ASTROLOGY_AVAILABLE:
        return {}
    import swisseph as swe
    from synthesis.astrology_engine import _julian_day, _degree_to_sign

    try:
        jd = _julian_day(year, month, day, hour, utc_offset)
    except Exception as e:
        print(f"⚠️ Asteroid calculation failed at Julian Day step: {e}")
        return {}

    asteroids = {}
    for name, body_id in _ASTEROID_IDS.items():
        try:
            result, flags = swe.calc_ut(jd, body_id)
            lon = result[0]
            sign, deg, _ = _degree_to_sign(lon)
            asteroids[name] = {"sign": sign, "degree": round(deg, 2), "retrograde": result[3] < 0}
        except Exception as e:
            print(f"⚠️ {name} calculation failed (likely missing seas_18.se1 on this server): {e}")

    return asteroids


def _build_geo_location(raw) -> "GeoLocation":
    if not _LOGIC_AVAILABLE:
        return None
    if isinstance(raw, GeoLocation):
        return raw
    if raw is None:
        return GeoLocation(
            place_name="Unknown", city="", country="", country_code="XX",
            latitude=0.0, longitude=0.0, timezone="UTC", utc_offset=0.0,
        )
    return GeoLocation(
        place_name   = getattr(raw, "place_name", "") or str(raw.get("place_name", "") if isinstance(raw, dict) else ""),
        city         = getattr(raw, "city", "")         or str(raw.get("city", "") if isinstance(raw, dict) else ""),
        country      = getattr(raw, "country", "")      or str(raw.get("country", "") if isinstance(raw, dict) else ""),
        country_code = getattr(raw, "country_code", "XX") or "XX",
        latitude     = float(getattr(raw, "latitude", 0.0) or (raw.get("latitude", 0.0) if isinstance(raw, dict) else 0.0)),
        longitude    = float(getattr(raw, "longitude", 0.0) or (raw.get("longitude", 0.0) if isinstance(raw, dict) else 0.0)),
        timezone     = getattr(raw, "timezone", "UTC")  or str(raw.get("timezone", "UTC") if isinstance(raw, dict) else "UTC"),
        utc_offset   = float(getattr(raw, "utc_offset", 0.0) or 0.0),
    )



# ══════════════════════════════════════════════
# ══  ENDPOINTS  ═══════════════════════════════
# ══════════════════════════════════════════════


@app.get("/")
async def root():
    return {
        "name":     "KAYAL Synthesis Engine",
        "version":  "8.2.0",
        "status":   "running",
        "pipeline": "KAYAL v8 full synthesis",
        "docs":     "/docs" if not IS_PRODUCTION else "disabled in production",
    }


@app.get("/health")
async def health():
    status: Dict[str, Any] = {}
    overall_ok = True

    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("SELECT 1"); cur.close(); conn.close()
        status["database"] = {"status": "connected"}
    except Exception as e:
        status["database"] = {"status": "error", "detail": str(e)}
        overall_ok = False

    try:
        sb = _get_supabase()
        if sb:
            sb.table("reading_jobs").select("id").limit(1).execute()
            status["supabase"] = {"status": "connected"}
        else:
            status["supabase"] = {
                "status": "not_configured",
                "note":   "Set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env",
            }
    except Exception as e:
        status["supabase"] = {"status": "error", "detail": str(e)}

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        status["anthropic"] = {"status": "missing", "detail": "ANTHROPIC_API_KEY not set — narration will fail"}
        overall_ok = False
    elif not anthropic_key.startswith("sk-ant-"):
        status["anthropic"] = {"status": "invalid_key_format"}
        overall_ok = False
    else:
        status["anthropic"] = {
            "status":       "key_present",
            "model_haiku":  "claude-haiku-4-5-20251001",
            "model_sonnet": "claude-sonnet-4-6",
        }

    try:
        import swisseph as swe
        ephe_path = os.environ.get(
            "EPHE_PATH",
            str(Path(__file__).parent / "data" / "ephemeris" / "ephe"),
        )
        se1_files = list(Path(ephe_path).glob("*.se1")) if Path(ephe_path).exists() else []
        if se1_files:
            swe.set_ephe_path(ephe_path)
            jd  = swe.julday(2000, 1, 1, 12.0)
            pos, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)
            status["swiss_ephemeris"] = {
                "status":    "loaded",
                "path":      ephe_path,
                "se1_files": len(se1_files),
                "smoke_test_sun_lon": round(pos[0], 4),
            }
        else:
            status["swiss_ephemeris"] = {
                "status": "missing_data_files",
                "path":   ephe_path,
                "fix":    (
                    "Run bash setup_ephemeris.sh — downloads .se1 files from astro.com. "
                    f"Then set EPHE_PATH={ephe_path} in your .env"
                ),
            }
            overall_ok = False
    except ImportError:
        status["swiss_ephemeris"] = {
            "status": "pyswisseph_not_installed",
            "fix":    "pip install pyswisseph",
        }
        overall_ok = False
    except Exception as e:
        status["swiss_ephemeris"] = {"status": "error", "detail": str(e)}
        overall_ok = False

    try:
        import mediapipe as mp
        status["mediapipe"] = {"status": "installed", "version": getattr(mp, "__version__", "unknown")}
    except ImportError:
        status["mediapipe"] = {"status": "not_installed", "fix": "pip install mediapipe"}
        overall_ok = False

    for label, flag in [
        ("face_engine",       _FACE_ENGINE_AVAILABLE),
        ("face_reader",       _FACE_ENGINE_AVAILABLE),
        ("palm_engine",       _PALM_ENGINE_AVAILABLE),
        ("palm_reader",       _PALM_ENGINE_AVAILABLE),
        ("numerology_engine", _NUMEROLOGY_AVAILABLE),
        ("astrology_engine",  _ASTROLOGY_AVAILABLE),
        ("logic_engine",      _LOGIC_AVAILABLE),
        ("llm_narrator",      _NARRATOR_AVAILABLE),
        ("free_reading_api",  _FREE_READING_AVAILABLE),
    ]:
        status[label] = {"status": "importable" if flag else "import_error"}
        if not flag and label != "free_reading_api":
            overall_ok = False

    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=1)
        models = [m["name"] for m in r.json().get("models", [])]
        status["ollama"] = {
            "status": "running" if r.status_code == 200 else "error",
            "models": models,
            "note":   "Optional — used for Jenny chat only, NOT for readings",
        }
    except Exception:
        status["ollama"] = {
            "status": "offline",
            "note":   "Optional — readings use Anthropic API, not Ollama",
        }

    return {
        "status":          "healthy" if overall_ok else "degraded",
        "version":         "8.2.0",
        "timestamp":       datetime.now().isoformat(),
        "environment":     ENVIRONMENT,
        "all_systems_go":  overall_ok,
        "subsystems":      status,
        "action_required": [
            k for k, v in status.items()
            if isinstance(v, dict) and v.get("status") in (
                "error", "missing", "not_installed", "import_error",
                "missing_data_files", "invalid_key_format", "pyswisseph_not_installed",
            )
        ],
    }


@app.post("/voice/transcribe")
async def transcribe_voice(audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes); tmp_path = tmp.name
        segments, info = whisper_model.transcribe(tmp_path, beam_size=1, language="en", vad_filter=True)
        text = " ".join(s.text for s in segments).strip()
        os.unlink(tmp_path)
        return {"success": True, "text": text or "Hello", "language": info.language}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/voice/chat")
async def voice_chat(
    request:    Request,
    text:       Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    user_token: Optional[str] = Form(None),
):
    try:
        if text is None:
            try:
                body = await request.json()
                text       = body.get("text", "")
                session_id = session_id or body.get("session_id")
                user_token = user_token or body.get("user_token")
            except Exception:
                text = ""

        text       = (text or "").strip()
        session_id = session_id or str(uuid.uuid4())
        token      = user_token

        if not text:
            return JSONResponse(status_code=400, content={"error": "No text provided"})
        response_text = await get_jenny_response(text, session_id)
        if token:
            try:
                conn = get_db_connection(); cur = conn.cursor()
                cur.execute(
                    "INSERT INTO users (token, name, created) VALUES (%s,%s,%s) ON CONFLICT (token) DO NOTHING",
                    (token, f"User_{token[-6:]}", datetime.now().isoformat())
                )
                cur.execute("INSERT INTO conversations (token,session_id,role,content,timestamp) VALUES (%s,%s,%s,%s,%s)",
                            (token, session_id, "user", text[:500], datetime.now().isoformat()))
                cur.execute("INSERT INTO conversations (token,session_id,role,content,timestamp) VALUES (%s,%s,%s,%s,%s)",
                            (token, session_id, "assistant", response_text[:500], datetime.now().isoformat()))
                conn.commit(); cur.close(); conn.close()
            except Exception as save_err:
                logger.warning(f"voice/chat save failed (non-fatal): {save_err}")
        audio_data = await text_to_speech(response_text)
        if audio_data:
            return Response(content=audio_data, media_type="audio/mpeg",
                            headers={"X-Response-Text": response_text, "X-Session-ID": session_id})
        return JSONResponse(status_code=200, content={"response": response_text, "audio": False})
    except Exception as e:
        print(f"❌ Voice chat error: {e}")
        return JSONResponse(status_code=200, content={"response": random.choice(FAST_RESPONSES)})


@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    audio_buffer = bytearray()
    try:
        await websocket.send_json({"type": "ready", "message": "Jenny is ready...", "session_id": session_id})
    except WebSocketDisconnect:
        return
    try:
        while True:
            try:
                message = await websocket.receive()
            except WebSocketDisconnect:
                return
            if "bytes" in message:
                audio_buffer.extend(message["bytes"])
                if len(audio_buffer) > 24000:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
                        with wave.open(f.name, "wb") as wav:
                            wav.setnchannels(1); wav.setsampwidth(2)
                            wav.setframerate(16000); wav.writeframes(audio_buffer)
                    try:
                        segs, _ = whisper_model.transcribe(f.name, beam_size=1, language="en", vad_filter=True)
                        text    = " ".join(s.text for s in segs).strip()
                        if text:
                            try:
                                await websocket.send_json({"type": "transcript", "text": text, "is_final": True, "session_id": session_id})
                            except WebSocketDisconnect:
                                return
                    except Exception as e:
                        print(f"❌ Transcribe error: {e}")
                    finally:
                        os.unlink(f.name)
                    audio_buffer = bytearray()
            elif "text" in message:
                try:
                    json_data = json.loads(message["text"])
                    if json_data.get("type") == "test":
                        await websocket.send_json({"type": "pong", "session_id": session_id})
                except Exception:
                    pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ WebSocket error: {e}")



@app.post("/detect-face")
async def detect_face(image: UploadFile = File(...)):
    image_bytes = await image.read()

    if not _FACE_ENGINE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error":   "MediaPipe not installed. Run: pip install mediapipe",
                "fix":     "bash install_missing.sh",
            }
        )

    features      = None
    extract_error = None
    try:
        fe       = FaceEngine()
        features = fe.extract(image_bytes)
        if features.error:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "stage":   "feature_extraction",
                    "error":   features.error,
                    "tip": (
                        "Upload a clear, well-lit, front-facing photo. "
                        "Ensure the face is not occluded. Minimum 480x480px recommended."
                    ),
                }
            )
    except Exception as e:
        extract_error = str(e)
        logger.error(f"FaceEngine.extract failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "stage":   "feature_extraction",
                "error":   extract_error,
                "windows_tip": (
                    "If you see a libprotobuf / CalculatorGraphConfig error, "
                    "run: pip install mediapipe==0.10.5 --force-reinstall"
                ),
            }
        )

    reading      = None
    reader_error = None
    try:
        reading = FaceReader().read(features)
    except Exception as e:
        reader_error = str(e)
        logger.warning(f"FaceReader.read failed: {e}")

    try:
        face_data = _face_summary_from_features(features, reading if not reader_error else None)
        face_data["face_detected"] = True
    except Exception as e:
        face_data = {"face_detected": True, "build_error": str(e), "raw": _safe(features)}

    physiognomy = None
    if reading and not reader_error:
        try:
            _fs   = getattr(reading, "face_shape", None)
            _expr = getattr(reading, "expression", None)
            _skin = getattr(reading, "skin",       None)
            _jaw  = getattr(reading, "jaw",        None)
            _nose = getattr(reading, "nose",       None)
            _chk  = getattr(reading, "cheeks",     None)
            _sym  = getattr(reading, "symmetry",   None)
            _age  = getattr(reading, "aging_markers", None)
            _shape_val = getattr(getattr(_fs, "shape", None), "value", "unclear")

            physiognomy = {
                "element":          getattr(_fs, "element",        None),
                "archetype":        _FACE_ARCHETYPE.get(_shape_val, "The Seeker"),
                "character_core":   getattr(_fs, "character_core", None),
                "life_period":      getattr(_fs, "life_period",    None),
                "ruling_planet":    getattr(_fs, "ruling_planet",  None),
                "chinese_note":     getattr(_fs, "chinese_note",   None),
                "vedic_note":       getattr(_fs, "vedic_note",     None),
                "western_note":     getattr(_fs, "western_note",   None),
                "domain_signals":   _safe(getattr(reading, "confirmed_signals",   {})),
                "conflicting":      _safe(getattr(reading, "conflicting_signals", {})),
                "dominant_themes":  getattr(reading, "dominant_themes", []),
                "life_period_map":  _safe(getattr(reading, "life_period_map", {})),
                "expression_signal":    getattr(getattr(_expr, "dominant_signal", None), "value", None),
                "habitual_expression":  getattr(_expr, "habitual_note", None),
                "vitality_signal":      getattr(getattr(_age, "vitality_signal", None), "value", None),
                "aging_timing_note":    getattr(_age, "timing_note", None),
                "nose_wealth_reading":  getattr(_nose, "observation", None) if _nose else None,
                "jaw_endurance":        face_data.get("jaw_type"),
                "cheekbone_authority":  face_data.get("cheekbone_pos"),
                "symmetry_score":       round(float(getattr(_sym, "overall_score", 0) or 0), 4) if _sym else None,
                "confidence": round(float(getattr(reading, "overall_confidence", 0) or 0), 4),
            }
        except Exception as e:
            physiognomy = {"build_error": str(e)}

    return {
        "success":       True,
        "face_features": face_data,
        "face_reading":  physiognomy,
        "reader_error":  reader_error,
        "note": "Feeds into full KAYAL synthesis via POST /api/reading/submit.",
    }


@app.post("/palm-diagnostic")
async def palm_diagnostic(palm_image: UploadFile = File(...), hand: str = Form("right")):
    if not _PALM_ENGINE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"success": False, "error": "MediaPipe not installed. Run: pip install mediapipe"}
        )
    try:
        image_bytes = await palm_image.read()
        pe    = PalmEngine()
        feats = pe.extract(image_bytes, hand_label=hand)
        if feats.error:
            return JSONResponse(status_code=422, content={
                "success": False,
                "error":   feats.error,
                "tip":     "Upload a clear, well-lit photo of an open palm, fingers together.",
            })

        reading = None
        reader_error = None
        try:
            reading = PalmReader().read(feats)
        except Exception as re:
            reader_error = str(re)

        def _gf(obj, attr, default=None):
            v = getattr(obj, attr, default)
            return v if v is not None else default
        def _rf(obj, attr, default=0.0):
            v = getattr(obj, attr, None)
            try: return round(float(v), 4) if v is not None else default
            except: return default

        try:
            features_data = {
                "hand_label":    _gf(feats, "hand_label", hand),
                "confidence":    _rf(feats, "confidence"),
                "hand_shape":    _safe(_gf(feats, "hand_shape")),
                "life_line":     _safe(_gf(feats, "life_line")),
                "heart_line":    _safe(_gf(feats, "heart_line")),
                "head_line":     _safe(_gf(feats, "head_line")),
                "fate_line":     _safe(_gf(feats, "fate_line")),
                "mount_venus":   _safe(_gf(feats, "mount_venus")),
                "mount_jupiter": _safe(_gf(feats, "mount_jupiter")),
                "mount_moon":    _safe(_gf(feats, "mount_moon")),
                "thumb":         _safe(_gf(feats, "thumb")),
                "skin":          _safe(_gf(feats, "skin")),
                "markings":      _safe(_gf(feats, "markings", [])),
            }
        except Exception as fe:
            features_data = {"build_error": str(fe), "raw": _safe(feats)}

        reading_data = None
        if reading and not reader_error:
            try:
                reading_data = {
                    "hand_label":        _gf(reading, "hand_label", hand),
                    "overall_confidence":_rf(reading, "overall_confidence"),
                    "hand_shape":        _safe(_gf(reading, "hand_shape")),
                    "life_line":         _safe(_gf(reading, "life_line")),
                    "heart_line":        _safe(_gf(reading, "heart_line")),
                    "head_line":         _safe(_gf(reading, "head_line")),
                    "fate_line":         _safe(_gf(reading, "fate_line")),
                    "mount_venus":       _safe(_gf(reading, "mount_venus")),
                    "mount_jupiter":     _safe(_gf(reading, "mount_jupiter")),
                    "mount_moon":        _safe(_gf(reading, "mount_moon")),
                }
            except Exception as re2:
                reading_data = {"build_error": str(re2)}

        return {
            "success":       True,
            "palm_features": features_data,
            "palm_reading":  reading_data,
            "reader_error":  reader_error,
            "note": "Upload right hand for dominant reading, left for potential/karmic reading.",
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "error":   str(e),
            "windows_tip": (
                "If you see a libprotobuf / CalculatorGraphConfig error, "
                "run: pip install mediapipe==0.10.5 --force-reinstall"
            ),
        })


@app.post("/analyze-palm")
async def analyze_palm_endpoint(
    palm_image: UploadFile    = File(...),
    hand:       str           = Form("right"),
    token:      Optional[str] = Form(None),
):
    if hand not in ["left", "right", "dominant"]:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid hand: {hand}"})
    if not _PALM_ENGINE_AVAILABLE:
        return JSONResponse(
            status_code=503,
            content={"success": False, "error": "MediaPipe not installed. Run: pip install mediapipe"}
        )

    try:
        conn = get_db_connection(); cur = conn.cursor()
        if token and token not in ("0", "null", "undefined"):
            cur.execute("SELECT token, name FROM users WHERE token = %s", (token,))
            user = cur.fetchone()
            if not user:
                token = f"K{datetime.now().strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
                cur.execute("INSERT INTO users (token, name, created) VALUES (%s,%s,%s)",
                            (token, f"User_{token[-6:]}", datetime.now().isoformat()))
                conn.commit()
        else:
            token = f"K{datetime.now().strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
            cur.execute("INSERT INTO users (token, name, created) VALUES (%s,%s,%s)",
                        (token, f"User_{token[-6:]}", datetime.now().isoformat()))
            conn.commit()

        image_bytes = await palm_image.read()
        if len(image_bytes) < 100:
            cur.close(); conn.close()
            return JSONResponse(status_code=400, content={"success": False, "error": "Image too small"})

        pe    = PalmEngine()
        feats = pe.extract(image_bytes, hand_label=hand)
        if feats.error:
            cur.close(); conn.close()
            return JSONResponse(status_code=422, content={"success": False, "error": feats.error})

        reading  = PalmReader().read(feats)
        analysis = _safe(feats)
        report   = _safe(reading)

        _a   = analysis if isinstance(analysis, dict) else {}
        _hs  = _a.get("hand_shape") or {}
        hs   = _hs
        ln   = _a
        _hs_str = _hs.get("type", _hs.get("shape", str(_hs))) if isinstance(_hs, dict) else str(_hs or "unknown")
        cur.execute("""
            INSERT INTO palm_analyses
            (token, hand_shape, hand_element, ruling_planet,
             life_line, heart_line, head_line, fate_line,
             thumb_type, finger_proportions, mounts,
             marriage_lines, children_lines, timestamp)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            token,
            _hs_str,
            hs.get("element", "unknown") if isinstance(hs, dict) else "unknown",
            hs.get("ruling_planet", "unknown") if isinstance(hs, dict) else "unknown",
            json.dumps(ln.get("life_line",  {})) if isinstance(ln, dict) else "{}",
            json.dumps(ln.get("heart_line", {})) if isinstance(ln, dict) else "{}",
            json.dumps(ln.get("head_line",  {})) if isinstance(ln, dict) else "{}",
            json.dumps(ln.get("fate_line",  {})) if isinstance(ln, dict) else "{}",
            analysis.get("thumb_type", "average") if isinstance(analysis, dict) else "average",
            json.dumps(analysis.get("finger_proportions", {}) if isinstance(analysis, dict) else {}),
            json.dumps(analysis.get("mounts", {}) if isinstance(analysis, dict) else {}),
            json.dumps(analysis.get("marriage_lines", []) if isinstance(analysis, dict) else []),
            json.dumps(analysis.get("children_lines", []) if isinstance(analysis, dict) else []),
            datetime.now().isoformat(),
        ))
        conn.commit(); cur.close(); conn.close()

        return {"success": True, "analysis": analysis, "report": report, "token": token, "hand": hand}

    except Exception as e:
        print(f"❌ Palm endpoint error: {e}")
        import traceback; traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})



@app.post("/predict")
async def predict(
    full_name:      str               = Form(...),
    date_of_birth:  str               = Form(...),
    birth_time:     Optional[str]     = Form(None),
    birth_location: Optional[str]     = Form(None),
    gender:         Optional[str]     = Form(None),
    facial_image:   Optional[UploadFile] = File(None),
    palm_image:     Optional[UploadFile] = File(None),
):
    errors   = []
    warnings = []

    try:
        bd = parser.parse(date_of_birth)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date_of_birth: '{date_of_birth}'. Use YYYY-MM-DD.")

    birth_day = bd.day; birth_month = bd.month; birth_year = bd.year
    age       = calculate_age(bd)

    birth_hour = None; birth_minute = None; birth_hour_known = False
    if birth_time:
        try:
            bt = parser.parse(birth_time)
            birth_hour = bt.hour; birth_minute = bt.minute; birth_hour_known = True
        except Exception:
            warnings.append(f"Could not parse birth_time '{birth_time}' — proceeding without it.")

    face_bytes = await facial_image.read() if facial_image else None
    palm_bytes = await palm_image.read()   if palm_image   else None

    if not _LOGIC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Logic layer not available. Check /health for import errors."
        )

    birth_geo = None
    if _GEO_AVAILABLE and birth_location:
        try:
            raw = geocode_birth_location(birth_location)
            birth_geo = _build_geo_location(raw)
        except Exception:
            pass
    if birth_geo is None:
        birth_geo = _build_geo_location(
            _fallback_geo(birth_location or "Unknown") if _GEO_AVAILABLE else None
        )

    birth_data = BirthData(
        full_name        = full_name,
        day              = birth_day,
        month            = birth_month,
        year             = birth_year,
        hour             = birth_hour,
        minute           = birth_minute,
        hour_known       = birth_hour_known,
        birth_place      = birth_geo,
        present_location = birth_geo,
    )

    face_reading = None
    face_summary = None
    if face_bytes and _FACE_ENGINE_AVAILABLE:
        try:
            fe       = FaceEngine()
            features = fe.extract(face_bytes)
            if not features.error:
                face_reading = FaceReader().read(features)
                face_summary = _face_summary_from_features(features, face_reading)
            else:
                warnings.append(f"Face analysis: {features.error}")
        except Exception as e:
            warnings.append(f"Face analysis failed: {e}")
    elif face_bytes and not _FACE_ENGINE_AVAILABLE:
        warnings.append("MediaPipe not installed — face analysis skipped. Run: pip install mediapipe")

    palm_reading = None
    palm_summary = None
    if palm_bytes and _PALM_ENGINE_AVAILABLE:
        try:
            pe    = PalmEngine()
            pfeats = pe.extract(palm_bytes, hand_label="right")
            if not pfeats.error:
                palm_reading = PalmReader().read(pfeats)
                _hs      = getattr(pfeats, "hand_shape", None)
                _ll      = getattr(pfeats, "life_line",  None)
                _hl      = getattr(pfeats, "heart_line", None)
                _hdl     = getattr(pfeats, "head_line",  None)
                _fl      = getattr(pfeats, "fate_line",  None)
                _ll_len  = getattr(_ll, "length_pct", None) or getattr(_ll, "length", None)
                _pr_hs   = getattr(palm_reading, "hand_shape", None) if palm_reading else None
                _element = getattr(_pr_hs, "element",       None)
                _ruling  = getattr(_pr_hs, "ruling_planet",  None)
                _char    = getattr(_pr_hs, "character_core", None)
                _hs_str  = _hs.value if hasattr(_hs, "value") else str(_hs) if _hs else None
                palm_summary = {
                    "hand_shape":    _hs_str,
                    "element":       _element,
                    "ruling_planet": _ruling,
                    "character_core":_char,
                    "life_line":     _safe(_ll),
                    "heart_line":    _safe(_hl),
                    "head_line":     _safe(_hdl),
                    "fate_line":     _safe(_fl),
                    "life_line_length": round(float(_ll_len or 0), 4),
                    "mount_venus":   _safe(getattr(pfeats, "mount_venus",   None)),
                    "mount_jupiter": _safe(getattr(pfeats, "mount_jupiter", None)),
                    "mount_moon":    _safe(getattr(pfeats, "mount_moon",    None)),
                    "confidence":    round(float(getattr(pfeats, "confidence", 0) or 0), 4),
                    "hand_label":    getattr(pfeats, "hand_label", "right"),
                }
            else:
                warnings.append(f"Palm analysis: {pfeats.error}")
        except Exception as e:
            warnings.append(f"Palm analysis failed: {e}")
    elif palm_bytes and not _PALM_ENGINE_AVAILABLE:
        warnings.append("MediaPipe not installed — palm analysis skipped. Run: pip install mediapipe")

    user_input = UserInput(
        birth_data         = birth_data,
        face_reading       = face_reading,
        dominant_palm      = palm_reading,
        non_dominant_palm  = None,
        dual_palm          = None,
        requested_domains  = list(ALL_DOMAINS),
        include_remedies   = True,
        session_id         = f"PRED{datetime.now().strftime('%y%m%d%H%M%S')}",
    )

    num_profile = None
    num_signals = None
    if _NUMEROLOGY_AVAILABLE:
        try:
            from datetime import date as date_cls
            num_profile = compute_numerology_profile(birth_data, date_cls.today())
            num_reading = read_numerology(num_profile, birth_day)
            num_signals = {
                "system":  "pythagorean",
                "signals": num_reading.to_signal_list(),
            }
        except Exception as e:
            errors.append(f"Numerology failed: {e}")

    astro_primary = None
    astro_timing  = None
    if _ASTROLOGY_AVAILABLE:
        try:
            hour = (birth_hour or 12) + (birth_minute or 0) / 60.0
            astro_primary, astro_timing, _ = compute_western(
                birth_day, birth_month, birth_year, hour,
                birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                current_year=datetime.now().year,
            )
        except Exception as e:
            warnings.append(
                f"Swiss Ephemeris failed: {e} — reading will be numerology-only. "
                "Run bash setup_ephemeris.sh and set EPHE_PATH in .env"
            )
    else:
        warnings.append("Astrology engine not available — numerology-only reading.")

    llm_payload = None
    try:
        logic_result = run_logic_engine(
            user_input         = user_input,
            astrology_primary  = astro_primary,
            numerology_primary = num_signals,
            astrology_timing   = astro_timing,
            numerology_timing  = {
                "personal_year":        num_profile.personal_year,
                "personal_year_theme":  _pyv_theme(num_profile.personal_year),
                "personal_month":       num_profile.personal_month,
                "personal_month_theme": _month_theme(num_profile.personal_month),
                "personal_week":        num_profile.personal_week,
                "personal_week_theme":  _week_theme(num_profile.personal_week),
                "personal_day":         num_profile.personal_day,
                "personal_day_theme":   _day_theme(num_profile.personal_day),
            } if num_profile else None,
            vedic_chart        = None,
            current_year       = datetime.now().year,
        )
        if hasattr(logic_result, "error"):
            errors.append(f"Logic engine error: {logic_result.error}")
        else:
            llm_payload = logic_result.to_dict()
    except Exception as e:
        errors.append(f"Logic engine failed: {e}")

    narration_text  = None
    domain_sections = {}
    if llm_payload and _NARRATOR_AVAILABLE:
        try:
            result          = narrate(llm_payload, use_opus=False, fallback=True)
            narration_text  = result.full_text if result.full_text else None
            domain_sections = getattr(result, "domain_sections", {}) or {}
        except Exception as e:
            errors.append(f"Narration failed: {e}")
    elif not _NARRATOR_AVAILABLE:
        errors.append("LLM narrator not importable — check ANTHROPIC_API_KEY and llm_narrator.py")

    if not narration_text and num_profile:
        first_name = full_name.strip().split()[0] if full_name else "Seeker"
        lp         = num_profile.life_path
        py         = num_profile.personal_year
        sun        = _get_sun_sign(birth_day, birth_month) if birth_day and birth_month else "unknown"
        pinnacle   = getattr(num_profile.current_pinnacle, "number", None)
        py_label   = f"Master {py}" if py in (11,22,33) else str(py)
        pin_label  = f"Master {pinnacle}" if pinnacle in (11,22,33) else str(pinnacle) if pinnacle else "current"
        face_el    = face_summary.get("element") if face_summary else None
        palm_el    = palm_summary.get("element") if palm_summary else None
        multi_modal = f" Your face carries the {face_el} element. Your palm reveals the {palm_el} element." if face_el and palm_el else ""

        narration_text = (
            f"Dear {first_name},\n\n"
            f"Your Life Path {lp} marks you as someone whose path is defined by "
            f"{'freedom, adaptability, and the wisdom earned through experience' if lp==5 else 'the unique expression of your Life Path number'}. "
            f"Your Sun in {sun} adds its distinct energy to how you move through the world.{multi_modal}\n\n"
            f"You are currently in a Personal Year {py_label} — "
            f"{'a rare master builder year when grand work becomes genuinely possible' if py==22 else 'a year with its own specific momentum and meaning'}. "
            f"Your current Pinnacle {pin_label} defines the life chapter you are in right now.\n\n"
            f"Your complete synthesis — numerology, astrology"
            f"{', physiognomy' if face_summary else ''}"
            f"{', and palmistry' if palm_summary else ''}"
            f" — has been prepared. Add API credits at console.anthropic.com to receive the full narrated reading."
        )
        warnings.append("Narration used local fallback — add Anthropic credits for full Claude reading")

    token = f"K{datetime.now().strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (token, name, age, created) VALUES (%s,%s,%s,%s) ON CONFLICT (token) DO NOTHING",
            (token, full_name, age, datetime.now().isoformat())
        )
        if num_profile:
            try:
                cur.execute(
                    """INSERT INTO analyses
                       (token, life_path, soul_urge, personality,
                        personal_year, personal_month, personal_day,
                        face_shape, timestamp)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (
                        token,
                        num_profile.life_path,
                        num_profile.soul_urge,
                        num_profile.personality,
                        num_profile.personal_year,
                        num_profile.personal_month,
                        num_profile.personal_day,
                        face_summary.get("shape") if face_summary else None,
                        datetime.now().isoformat(),
                    )
                )
            except Exception as _db_col_err:
                logger.warning(f"analyses table schema mismatch (non-fatal): {_db_col_err}")
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        warnings.append(f"DB save warning: {e}")

    num_summary = None
    if num_profile:
        _cp = num_profile.current_pinnacle
        _cp_dict = None
        if _cp:
            _cp_dict = {
                "number":     getattr(_cp, "number", None),
                "start_age":  getattr(_cp, "start_age", None),
                "end_age":    getattr(_cp, "end_age", None),
                "theme":      getattr(_cp, "theme", None),
                "challenge":  getattr(_cp, "challenge", None),
                "is_master":  getattr(_cp, "number", 0) in (11, 22, 33),
                "is_current": True,
            }

        num_summary = {
            "core": {
                "life_path":           num_profile.life_path,
                "destiny":             num_profile.destiny,
                "soul_urge":           num_profile.soul_urge,
                "personality":         num_profile.personality,
                "birthday_gift":       getattr(num_profile, "birthday_gift", None),
                "birthday_challenge":  getattr(num_profile, "birthday_challenge", None),
                "is_life_path_master": getattr(num_profile, "is_life_path_master", False),
                "is_destiny_master":   getattr(num_profile, "is_destiny_master",   False),
            },
            "time_cycles": {
                "personal_year":        num_profile.personal_year,
                "personal_year_master": num_profile.personal_year in (11, 22, 33),
                "personal_month":       num_profile.personal_month,
                "personal_week":        num_profile.personal_week,
                "personal_week_master": num_profile.personal_week in (11, 22, 33),
                "personal_day":         num_profile.personal_day,
            },
            "pinnacles": {
                "current": _cp_dict,
                "all":     [
                    {
                        "number":    getattr(p, "number", None),
                        "start_age": getattr(p, "start_age", None),
                        "end_age":   getattr(p, "end_age", None),
                        "theme":     getattr(p, "theme", None),
                        "challenge": getattr(p, "challenge", None),
                    }
                    for p in (num_profile.pinnacles or [])
                ],
            },
            "karmic_debts": [_safe(k) for k in (num_profile.karmic_debts or [])],
        }

    astro_summary = None
    if astro_primary and isinstance(astro_primary, dict):
        signals = astro_primary.get("signals", [])
        planets = {
            s["feature"]: {
                "reading":    s.get("reading") or s.get("tone", ""),
                "domain":     s.get("domain", ""),
                "strength":   s.get("strength", ""),
                "tone":       s.get("tone", ""),
                "house":      s.get("house"),
                "retrograde": s.get("retrograde", False),
            }
            for s in signals
            if isinstance(s, dict) and s.get("feature")
        }
        astro_summary = {"system": astro_primary.get("system", "western"), "planets": planets}

    return {
        "success":    not bool(errors),
        "user_token": token,
        "session_id": f"PHY{datetime.now().strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}",
        "age":        age,
        "reading":          narration_text,
        "domain_sections":  domain_sections,
        "numerology":    num_summary,
        "astrology":     astro_summary,
        "face_analysis": face_summary,
        "palm_analysis": palm_summary,
        "pipeline": "kayal_v8_full_synthesis",
        "warnings": warnings,
        "errors":   errors,
        "note": (
            "Complete narrated reading delivered." if narration_text else
            "Narration not generated — check errors[] and warnings[]. "
            "Ensure ANTHROPIC_API_KEY is set and /health shows all_systems_go: true."
        ),
    }



def process_reading_job(
    job_id:           str,
    full_name:        str,
    dob:              str,
    birth_time:       Optional[str],
    birth_location:   Optional[str],
    face_bytes:       Optional[bytes],
    palm_bytes:       Optional[bytes],
    tool_id:          str,
    user_question:    Optional[str],
    current_location: Optional[Dict],
    gender:           Optional[str],
    partner_name:      Optional[str] = None,
    partner_dob:       Optional[str] = None,
    palm_bytes_left:   Optional[bytes] = None,
    palm_bytes_right:  Optional[bytes] = None,
    dominant_hand:     Optional[str] = None,
):
    print(f"🚀 Starting job {job_id} for tool '{tool_id}'")
    conn = get_db_connection(); cur = conn.cursor()

    try:
        cur.execute("UPDATE jobs SET status='processing' WHERE id=%s", (job_id,))
        conn.commit()

        from datetime import date as date_cls
        from dateutil import parser as dparser

        bd = dparser.parse(dob)

        geo_raw = None
        if _GEO_AVAILABLE and birth_location:
            try:
                geo_raw = geocode_birth_location(birth_location)
            except Exception:
                pass
        birth_geo = _build_geo_location(
            geo_raw if geo_raw else (_fallback_geo(birth_location or "Unknown") if _GEO_AVAILABLE else None)
        )

        present_geo = birth_geo
        if _GEO_AVAILABLE and current_location:
            try:
                present_geo = GeoLocation(
                    place_name   = current_location.get("city", "Unknown"),
                    city         = current_location.get("city", ""),
                    country      = current_location.get("country", ""),
                    country_code = "XX",
                    latitude     = float(current_location.get("latitude", 0.0) or 0.0),
                    longitude    = float(current_location.get("longitude", 0.0) or 0.0),
                    timezone     = current_location.get("timezone", "UTC") or "UTC",
                    utc_offset   = 0.0,
                )
            except Exception:
                pass

        birth_data = BirthData(
            full_name        = full_name,
            day              = bd.day,
            month            = bd.month,
            year             = bd.year,
            hour             = None,
            minute           = None,
            hour_known       = False,
            birth_place      = birth_geo,
            present_location = present_geo,
        )

        face_reading = None
        if face_bytes and _FACE_ENGINE_AVAILABLE:
            try:
                fe    = FaceEngine()
                feats = fe.extract(face_bytes)
                if not feats.error:
                    face_reading = FaceReader().read(feats)
            except Exception as e:
                print(f"⚠️ Job {job_id}: face analysis failed: {e}")

        # Dual-palm path (palm_image_left / palm_image_right from the frontend) takes priority
        # over the older single palm_bytes param, which is kept only for any other caller still
        # sending just one palm. Which palm is "dominant" now comes from dominant_hand — matching
        # the handedness question tool-hand-map.html already asks before its own dual-palm
        # upload (selectHand('right'|'left')) — rather than assuming right-handedness, which the
        # purchase page doesn't currently ask about at all. Defaults to "right" only when
        # dominant_hand isn't supplied, for backward compatibility with any caller that doesn't
        # send it yet.
        dominant_hand_norm = (dominant_hand or "right").strip().lower()
        dominant_palm     = None
        non_dominant_palm = None
        if (palm_bytes_left or palm_bytes_right) and _PALM_ENGINE_AVAILABLE:
            try:
                pe = PalmEngine()
                dom_bytes = palm_bytes_right if dominant_hand_norm == "right" else palm_bytes_left
                pas_bytes = palm_bytes_left  if dominant_hand_norm == "right" else palm_bytes_right
                if dom_bytes:
                    dfeats = pe.extract(dom_bytes, hand_label=dominant_hand_norm)
                    if not dfeats.error:
                        dominant_palm = PalmReader().read(dfeats)
                if pas_bytes:
                    pas_hand = "left" if dominant_hand_norm == "right" else "right"
                    pfeats = pe.extract(pas_bytes, hand_label=pas_hand)
                    if not pfeats.error:
                        non_dominant_palm = PalmReader().read(pfeats)
            except Exception as e:
                print(f"⚠️ Job {job_id}: dual palm analysis failed: {e}")
        elif palm_bytes and _PALM_ENGINE_AVAILABLE:
            try:
                pe     = PalmEngine()
                pfeats = pe.extract(palm_bytes, hand_label=dominant_hand_norm)
                if not pfeats.error:
                    dominant_palm = PalmReader().read(pfeats)
            except Exception as e:
                print(f"⚠️ Job {job_id}: palm analysis failed: {e}")

        num_profile  = compute_numerology_profile(birth_data, date_cls.today())
        num_reading  = read_numerology(num_profile, bd.day)
        num_signals  = {"system": "pythagorean", "signals": num_reading.to_signal_list()}

        hour = birth_data.birth_datetime.hour + birth_data.birth_datetime.minute / 60.0

        # NEW: pick Western-only vs. Western+Vedic based on birth/present country —
        # see select_astrology_system()'s docstring for the rule and why this was missing.
        astrology_system = select_astrology_system(
            getattr(birth_geo, "country_code", ""), getattr(present_geo, "country_code", "")
        )

        if astrology_system == "both" and _ASTROLOGY_AVAILABLE:
            try:
                from synthesis.astrology_engine import compute_both
                western_signals, vedic_signals, astro_timing, vedic_chart = compute_both(
                    bd.day, bd.month, bd.year, hour,
                    birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                    current_year=datetime.now().year,
                )
                astro_primary = {
                    "system": "both",
                    "signals": western_signals["signals"] + vedic_signals["signals"],
                }
            except Exception as e:
                print(f"⚠️ Job {job_id}: compute_both failed, falling back to Western only: {e}")
                astro_primary, astro_timing, vedic_chart = compute_western(
                    bd.day, bd.month, bd.year, hour,
                    birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                    current_year=datetime.now().year,
                )
        else:
            astro_primary, astro_timing, vedic_chart = compute_western(
                bd.day, bd.month, bd.year, hour,
                birth_geo.latitude, birth_geo.longitude, birth_geo.utc_offset,
                current_year=datetime.now().year,
            )

        # ── Union Blueprint / partner path ──────────────────────────────────────────
        # partner_name + partner_dob present (sent by the frontend for requires_partner
        # tools, e.g. complete-union-blueprint) → run two-person synastry instead of the
        # single-person synthesis below. NOTE: the frontend only collects partner name +
        # DOB today, not partner birth time/location — so the partner's astrology runs on
        # an "Unknown" fallback location (0,0 coordinates), which is a real accuracy limit
        # worth fixing on the frontend later (add partner birth time/location fields),
        # not something this patch can improve on its own.
        if partner_name and partner_dob and _SYNASTRY_AVAILABLE:
            try:
                pbd = dparser.parse(partner_dob)
                partner_geo = _build_geo_location(_fallback_geo("Unknown") if _GEO_AVAILABLE else None)
                partner_birth_data = BirthData(
                    full_name=partner_name, day=pbd.day, month=pbd.month, year=pbd.year,
                    hour=None, minute=None, hour_known=False,
                    birth_place=partner_geo, present_location=partner_geo,
                )
                partner_num_profile = compute_numerology_profile(partner_birth_data, date_cls.today())

                partner_hour = partner_birth_data.birth_datetime.hour + partner_birth_data.birth_datetime.minute / 60.0

                synastry_profile = compute_synastry_profile(
                    day_a=bd.day, month_a=bd.month, year_a=bd.year, hour_a=hour,
                    lat_a=birth_geo.latitude, lon_a=birth_geo.longitude, utc_a=birth_geo.utc_offset,
                    day_b=pbd.day, month_b=pbd.month, year_b=pbd.year, hour_b=partner_hour,
                    lat_b=partner_geo.latitude, lon_b=partner_geo.longitude, utc_b=partner_geo.utc_offset,
                    system="western",
                    person_a_label=full_name, person_b_label=partner_name,
                    numerology_lp_a=num_profile.life_path, numerology_lp_b=partner_num_profile.life_path,
                )
                synastry_reading = read_synastry(synastry_profile)
                narration = narrate(synastry_reading.to_dict(), use_opus=False)

                result = {
                    "reading":         narration.full_text,
                    "domain_sections": narration.domain_sections,
                    "life_path":       num_profile.life_path,
                    "personal_year":   num_profile.personal_year,
                    "sun_sign":        _get_sun_sign(bd.day, bd.month),
                    "compatibility_percentages": {
                        "overall":            synastry_profile.compatibility.overall,
                        "love":               synastry_profile.compatibility.love,
                        "career":             synastry_profile.compatibility.career,
                        "wealth":             synastry_profile.compatibility.wealth,
                        "health":             synastry_profile.compatibility.health,
                        "spiritual":          synastry_profile.compatibility.spiritual,
                        "children_forecast":  synastry_profile.compatibility.children_forecast,
                        "character":          synastry_profile.compatibility.character,
                    },
                    "union_remedies":  synastry_profile.union_remedies,
                    "generated_at":    datetime.utcnow().isoformat(),
                    "pipeline":        "kayal_v8_production_union",
                }

                cur.execute(
                    "UPDATE jobs SET status='completed', result=%s, completed_at=NOW() WHERE id=%s",
                    (json.dumps(result), job_id)
                )
                conn.commit()
                print(f"✅ Job {job_id} completed (union)")
                return
            except Exception as e:
                print(f"⚠️ Job {job_id}: synastry path failed, falling back to individual reading: {e}")
                # Falls through to the individual-reading path below rather than failing the
                # whole job — a degraded single-person reading beats no reading at all.

        # ── Individual reading path (unchanged) ─────────────────────────────────────
        user_input = UserInput(
            birth_data         = birth_data,
            face_reading       = face_reading,
            dominant_palm      = dominant_palm,
            non_dominant_palm  = non_dominant_palm,
            dual_palm          = None,
            requested_domains  = list(ALL_DOMAINS),
            include_remedies   = True,
            session_id         = job_id,
        )

        logic_result = run_logic_engine(
            user_input         = user_input,
            astrology_primary  = astro_primary,
            numerology_primary = num_signals,
            astrology_timing   = astro_timing,
            numerology_timing  = {
                "personal_year":        num_profile.personal_year,
                "personal_year_theme":  _pyv_theme(num_profile.personal_year),
                "personal_month":       num_profile.personal_month,
                "personal_month_theme": _month_theme(num_profile.personal_month),
                "personal_week":        num_profile.personal_week,
                "personal_week_theme":  _week_theme(num_profile.personal_week),
                "personal_day":         num_profile.personal_day,
                "personal_day_theme":   _day_theme(num_profile.personal_day),
            },
            vedic_chart        = vedic_chart,
            current_year       = datetime.now().year,
        )

        if hasattr(logic_result, "error"):
            raise RuntimeError(f"Logic engine error: {logic_result.error}")

        narration = narrate(logic_result.to_dict(), use_opus=False)

        # astro_timing already contains transits/arabic_parts/progressions/stelliums —
        # compute_western() computes all four on every call, but until now nothing ever
        # stored them past this point. Surfacing what's already correctly computed here,
        # not adding new astronomical calculations.
        midpoint_data = _calculate_midpoints_and_antiscia(bd.day, bd.month, bd.year, hour, birth_geo.utc_offset)
        asteroids = _calculate_asteroids(bd.day, bd.month, bd.year, hour, birth_geo.utc_offset)

        result = {
            "reading":          narration.full_text,
            "domain_sections":  narration.domain_sections,
            "life_path":        num_profile.life_path,
            "personal_year":    num_profile.personal_year,
            "sun_sign":         _get_sun_sign(bd.day, bd.month),
            "generated_at":     datetime.utcnow().isoformat(),
            "pipeline":         "kayal_v8_production",
            # Already computed inside compute_western() every time — previously discarded
            # after being fed to the narrator. Now actually stored.
            "current_transits": astro_timing.get("current_transits", []),
            "arabic_parts":     astro_timing.get("arabic_parts", {}),
            "progressions":     astro_timing.get("progressions", {}),
            "stelliums":        astro_timing.get("stelliums", []),
            # Genuinely new calculations — see _calculate_midpoints_and_antiscia's docstring.
            "midpoints":        midpoint_data["midpoints"],
            "antiscia":         midpoint_data["antiscia"],
            # NEW: which system(s) actually ran — see select_astrology_system()'s docstring.
            "astrology_system_used": astrology_system,
            "vedic_chart":      vedic_chart,
            # Genuinely new — requires seas_18.se1 in the ephemeris directory. Empty dict
            # if that file isn't present on this server, not an error.
            "asteroids":        asteroids,
        }

        cur.execute(
            "UPDATE jobs SET status='completed', result=%s, completed_at=NOW() WHERE id=%s",
            (json.dumps(result), job_id)
        )
        conn.commit()
        print(f"✅ Job {job_id} completed")

    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        import traceback; traceback.print_exc()
        cur.execute("UPDATE jobs SET status='failed', error=%s WHERE id=%s", (str(e), job_id))
        conn.commit()
    finally:
        cur.close(); conn.close()


@app.post("/api/reading/submit")
async def submit_reading(
    request:          Request,
    background_tasks: BackgroundTasks,
    full_name:        str  = Form(...),
    date_of_birth:    str  = Form(...),
    tool_id:          str  = Form(...),
    user_token:       str  = Form(...),
    birth_time:       Optional[str]        = Form(None),
    birth_location:   Optional[str]        = Form(None),
    facial_image:     Optional[UploadFile] = File(None),
    palm_image:       Optional[UploadFile] = File(None),
    palm_image_left:  Optional[UploadFile] = File(None),
    palm_image_right: Optional[UploadFile] = File(None),
    partner_name:     Optional[str]        = Form(None),
    partner_dob:      Optional[str]        = Form(None),
    dominant_hand:    Optional[str]        = Form(None),
    user_question:    Optional[str]        = Form(None),
    gender:           Optional[str]        = Form(None),
):
    client_ip        = get_client_ip(request)
    current_location = geolocate_ip(client_ip)
    face_bytes       = await facial_image.read()     if facial_image     else None
    palm_bytes       = await palm_image.read()       if palm_image       else None
    palm_bytes_left  = await palm_image_left.read()  if palm_image_left  else None
    palm_bytes_right = await palm_image_right.read() if palm_image_right else None

    job_id = hashlib.md5(
        f"{full_name}{date_of_birth}{tool_id}{datetime.now().isoformat()}".encode()
    ).hexdigest()[:16]

    conn = get_db_connection(); cur = conn.cursor()
    cur.execute(
        "INSERT INTO jobs (id, user_token, tool_id, status, created_at) VALUES (%s,%s,%s,%s,NOW())",
        (job_id, user_token, tool_id, "pending")
    )
    conn.commit(); cur.close(); conn.close()

    background_tasks.add_task(
        process_reading_job,
        job_id            = job_id,
        full_name         = full_name,
        dob               = date_of_birth,
        birth_time        = birth_time,
        birth_location    = birth_location,
        face_bytes        = face_bytes,
        palm_bytes        = palm_bytes,
        tool_id           = tool_id,
        user_question     = user_question,
        current_location  = current_location,
        gender            = gender,
        partner_name      = partner_name,
        partner_dob       = partner_dob,
        palm_bytes_left   = palm_bytes_left,
        palm_bytes_right  = palm_bytes_right,
        dominant_hand     = dominant_hand,
    )
    return {"job_id": job_id, "status": "pending"}


@app.get("/api/reading/job/{job_id}")
async def get_job_status(job_id: str):
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT status, result, error FROM jobs WHERE id=%s", (job_id,))
    job = cur.fetchone()
    cur.close(); conn.close()

    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    response: Dict[str, Any] = {"status": job["status"]}
    if job["status"] == "completed":
        try:    response["result"] = json.loads(job["result"])
        except: response["result"] = job["result"]
    if job["status"] == "failed" and job["error"]:
        response["error"] = job["error"]
    return response



# ─────────────────────────────────────────────────────────────
# NEW v8.1.2 — Latest completed job for a user
# ─────────────────────────────────────────────────────────────
@app.get("/api/reading/job/latest")
async def get_latest_job(user_id: str):
    """
    Return the most recently completed synthesis job for a user.
    Merges jobs + analyses + palm_analyses into one object.
    Falls back to legacy analyses table for older users.
    """
    if not user_id or user_id in ("null", "undefined", ""):
        return JSONResponse(
            status_code=400,
            content={"error": "user_id is required"}
        )

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # Primary: jobs table (new synthesis pipeline)
        cur.execute(
            """
            SELECT id, user_token, tool_id, status, result,
                   created_at, completed_at
            FROM   jobs
            WHERE  user_token = %s
              AND  status     = 'completed'
            ORDER  BY completed_at DESC
            LIMIT  1
            """,
            (user_id,)
        )
        job = cur.fetchone()

        if job:
            try:
                result = json.loads(job["result"]) if job["result"] else {}
            except Exception:
                result = {}

            # Enrich with analyses table
            analysis  = None
            palm_data = None

            try:
                cur.execute(
                    """
                    SELECT life_path, soul_urge, personality,
                           personal_year, personal_month, personal_day,
                           sun_sign, moon_sign, rising_sign, venus_sign,
                           face_shape, face_archetype
                    FROM   analyses
                    WHERE  token = %s
                    ORDER  BY timestamp DESC
                    LIMIT  1
                    """,
                    (user_id,)
                )
                analysis = cur.fetchone()
            except Exception as e:
                logger.warning(f"analyses fetch (non-fatal): {e}")

            try:
                cur.execute(
                    """
                    SELECT hand_shape, hand_element, ruling_planet,
                           life_line, heart_line, fate_line
                    FROM   palm_analyses
                    WHERE  token = %s
                    ORDER  BY timestamp DESC
                    LIMIT  1
                    """,
                    (user_id,)
                )
                palm_data = cur.fetchone()
            except Exception as e:
                logger.warning(f"palm_analyses fetch (non-fatal): {e}")

            cur.close()
            conn.close()

            # Merge — setdefault keeps job result values primary
            if analysis:
                result.setdefault("life_path",      analysis["life_path"])
                result.setdefault("soul_urge",      analysis["soul_urge"])
                result.setdefault("personal_year",  analysis["personal_year"])
                result.setdefault("personal_month", analysis["personal_month"])
                result.setdefault("personal_day",   analysis["personal_day"])
                result.setdefault("sun_sign",       analysis["sun_sign"])
                result.setdefault("face_archetype", analysis["face_archetype"])

            if palm_data:
                result.setdefault("palm_element", palm_data["hand_element"])
                result.setdefault("palm_shape",   palm_data["hand_shape"])

            return {
                "id":           job["id"],
                "tool_id":      job["tool_id"],
                "status":       "completed",
                "result":       result,
                "completed_at": str(job["completed_at"]) if job["completed_at"] else None,
            }

        # Fallback: legacy analyses table
        cur.execute(
            """
            SELECT life_path, soul_urge, personality,
                   personal_year, personal_month, personal_day,
                   sun_sign, moon_sign, rising_sign, venus_sign,
                   face_shape, face_archetype, timestamp
            FROM   analyses
            WHERE  token = %s
            ORDER  BY timestamp DESC
            LIMIT  1
            """,
            (user_id,)
        )
        legacy = cur.fetchone()
        cur.close()
        conn.close()

        if legacy:
            return {
                "id":      None,
                "tool_id": "legacy",
                "status":  "completed",
                "result": {
                    "life_path":     legacy["life_path"],
                    "soul_urge":     legacy["soul_urge"],
                    "personal_year": legacy["personal_year"],
                    "personal_month":legacy["personal_month"],
                    "personal_day":  legacy["personal_day"],
                    "sun_sign":      legacy["sun_sign"],
                    "face_archetype":legacy["face_archetype"],
                },
                "completed_at": legacy["timestamp"],
            }

        return JSONResponse(
            status_code=404,
            content={"error": "No completed synthesis found for this user"}
        )

    except Exception as e:
        logger.error(f"get_latest_job error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": str(e)})


# ─────────────────────────────────────────────────────────────
# NEW v8.1.2 — Subscription tier for a user + tool
# ─────────────────────────────────────────────────────────────
@app.get("/api/subscription/tier")
async def get_subscription_tier(user_id: str, tool_id: str):
    """
    Return the subscription tier and active status for a user/tool pair.
    Returns permissive tier in development when Supabase is not configured.
    """
    if not user_id or not tool_id:
        return {"tier": "free", "active": False, "expires_at": None}

    try:
        sb = _get_supabase()
        if not sb:
            if not IS_PRODUCTION:
                return {"tier": "voice_access", "active": True, "expires_at": None}
            return {"tier": "free", "active": False, "expires_at": None}

        resp = (
            sb.table("purchases")
            .select("id, status, expires_at, subscription_tier, tool_id")
            .eq("user_id", user_id)
            .eq("tool_id", tool_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        purchases = resp.data or []
        if not purchases:
            return {"tier": "free", "active": False, "expires_at": None}

        purchase   = purchases[0]
        expires_at = purchase.get("expires_at")

        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expiry < datetime.now(expiry.tzinfo):
                    return {"tier": "free", "active": False, "expires_at": expires_at}
            except Exception:
                pass

        tier = purchase.get("subscription_tier") or "voice_access"
        return {"tier": tier, "active": True, "expires_at": expires_at}

    except Exception as e:
        logger.error(f"get_subscription_tier error: {e}")
        if not IS_PRODUCTION:
            return {"tier": "voice_access", "active": True, "expires_at": None}
        return {"tier": "free", "active": False, "expires_at": None}


@app.post("/api/reading")
async def create_reading(
    request:          Request,
    full_name:        str  = Form(...),
    date_of_birth:    str  = Form(...),
    tool_id:          str  = Form(...),
    birth_time:       Optional[str]        = Form(None),
    birth_location:   Optional[str]        = Form(None),
    facial_image:     Optional[UploadFile] = File(None),
    palm_image:       Optional[UploadFile] = File(None),
    palm_image_left:  Optional[UploadFile] = File(None),
    palm_image_right: Optional[UploadFile] = File(None),
    partner_name:     Optional[str]        = Form(None),
    partner_dob:      Optional[str]        = Form(None),
    dominant_hand:    Optional[str]        = Form(None),
    user_question:    Optional[str]        = Form(None),
    gender:           Optional[str]        = Form(None),
):
    client_ip        = get_client_ip(request)
    current_location = geolocate_ip(client_ip)
    face_bytes       = await facial_image.read()     if facial_image     else None
    palm_bytes       = await palm_image.read()       if palm_image       else None
    palm_bytes_left  = await palm_image_left.read()  if palm_image_left  else None
    palm_bytes_right = await palm_image_right.read() if palm_image_right else None

    job_id = hashlib.md5(
        f"{full_name}{date_of_birth}{tool_id}{datetime.now().isoformat()}".encode()
    ).hexdigest()[:16]

    conn = get_db_connection(); cur = conn.cursor()
    cur.execute(
        "INSERT INTO jobs (id, user_token, tool_id, status, created_at) VALUES (%s,%s,%s,%s,NOW())",
        (job_id, "sync_user", tool_id, "pending")
    )
    conn.commit(); cur.close(); conn.close()

    process_reading_job(
        job_id=job_id, full_name=full_name, dob=date_of_birth,
        birth_time=birth_time, birth_location=birth_location,
        face_bytes=face_bytes, palm_bytes=palm_bytes,
        tool_id=tool_id, user_question=user_question,
        current_location=current_location, gender=gender,
        partner_name=partner_name, partner_dob=partner_dob,
        palm_bytes_left=palm_bytes_left, palm_bytes_right=palm_bytes_right,
        dominant_hand=dominant_hand,
    )

    conn2 = get_db_connection(); cur2 = conn2.cursor()
    cur2.execute("SELECT status, result, error FROM jobs WHERE id=%s", (job_id,))
    job = cur2.fetchone(); cur2.close(); conn2.close()

    if job and job["status"] == "completed" and job["result"]:
        try:    return json.loads(job["result"])
        except: return {"reading": job["result"]}
    else:
        detail = job["error"] if job and job["error"] else "Unknown synthesis error"
        raise HTTPException(status_code=500, detail=detail)


@app.get("/reading/pdf/{job_id}")
async def reading_pdf(job_id: str):
    if not _PDF_AVAILABLE:
        raise HTTPException(status_code=501, detail="PDF formatter not yet built (delivery/pdf_formatter.py)")

    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT status, result FROM jobs WHERE id=%s", (job_id,))
    job = cur.fetchone(); cur.close(); conn.close()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=404, detail="Reading not yet complete")

    try:
        result = json.loads(job["result"])
    except Exception:
        raise HTTPException(status_code=500, detail="Could not parse reading result")

    try:
        pdf_bytes = await generate_pdf(
            job_id    = job_id,
            tool_name = result.get("tool_name", "Your Reading"),
            reading   = result.get("reading", ""),
            sections  = result.get("domain_sections", {}),
            life_path = result.get("life_path"),
            sun_sign  = result.get("sun_sign"),
            generated = result.get("generated_at", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    filename = f"KAYAL_Reading_{job_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type = "application/pdf",
        headers    = {"Content-Disposition": f'attachment; filename="{filename}"'},
    )



@app.post("/api/user/upload-palm")
async def upload_palm_image(token: str = Form(...), image: UploadFile = File(...), hand: str = Form(...)):
    try:
        if hand not in ["left", "right", "dominant"]:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid hand"})
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE token=%s", (token,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse(status_code=404, content={"success": False, "error": "User not found"})
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            cur.close(); conn.close()
            return JSONResponse(status_code=400, content={"success": False, "error": "Image too large (max 10MB)"})
        file_hash = generate_file_hash(image_bytes)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename  = f"{token}_{hand}_{timestamp}_{file_hash}.jpg"
        file_path = PALM_DIR / filename
        file_path.write_bytes(image_bytes)
        thumb     = create_thumbnail(file_path)
        cur.execute("SELECT id FROM palm_images WHERE token=%s", (token,))
        if cur.fetchone():
            cur.execute("UPDATE palm_images SET image_path=%s,thumbnail_path=%s,hand=%s,uploaded_at=%s WHERE token=%s",
                        (str(file_path), str(thumb), hand, datetime.now().isoformat(), token))
        else:
            cur.execute("INSERT INTO palm_images (token,image_path,thumbnail_path,hand,uploaded_at) VALUES (%s,%s,%s,%s,%s)",
                        (token, str(file_path), str(thumb), hand, datetime.now().isoformat()))
        conn.commit(); cur.close(); conn.close()
        return {"success": True, "data": {"image_url": f"/uploads/palm/{filename}",
                "thumbnail_url": f"/uploads/thumbnails/{thumb.name}", "hand": hand}}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/user/upload-face")
async def upload_face_image(token: str = Form(...), image: UploadFile = File(...), angle: str = Form(...)):
    try:
        if angle not in ["front", "left", "right", "profile"]:
            return JSONResponse(status_code=400, content={"success": False, "error": "Invalid angle"})
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE token=%s", (token,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return JSONResponse(status_code=404, content={"success": False, "error": "User not found"})
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            cur.close(); conn.close()
            return JSONResponse(status_code=400, content={"success": False, "error": "Image too large (max 10MB)"})
        file_hash = generate_file_hash(image_bytes)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename  = f"{token}_{angle}_{timestamp}_{file_hash}.jpg"
        file_path = FACE_DIR / filename
        file_path.write_bytes(image_bytes)
        thumb     = create_thumbnail(file_path)
        cur.execute("SELECT id FROM face_images WHERE token=%s", (token,))
        if cur.fetchone():
            cur.execute("UPDATE face_images SET image_path=%s,thumbnail_path=%s,angle=%s,uploaded_at=%s WHERE token=%s",
                        (str(file_path), str(thumb), angle, datetime.now().isoformat(), token))
        else:
            cur.execute("INSERT INTO face_images (token,image_path,thumbnail_path,angle,uploaded_at) VALUES (%s,%s,%s,%s,%s)",
                        (token, str(file_path), str(thumb), angle, datetime.now().isoformat()))
        conn.commit(); cur.close(); conn.close()
        return {"success": True, "data": {"image_url": f"/uploads/face/{filename}",
                "thumbnail_url": f"/uploads/thumbnails/{thumb.name}", "angle": angle}}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/user/{token}/images")
async def get_user_images(token: str):
    try:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute("SELECT image_path,thumbnail_path,hand,uploaded_at FROM palm_images WHERE token=%s", (token,))
        palm = cur.fetchone()
        cur.execute("SELECT image_path,thumbnail_path,angle,uploaded_at FROM face_images WHERE token=%s", (token,))
        face = cur.fetchone()
        cur.close(); conn.close()
        return {
            "success": True,
            "palm": {"url": f"/uploads/palm/{Path(palm['image_path']).name}",
                     "thumbnail": f"/uploads/thumbnails/{Path(palm['thumbnail_path']).name}",
                     "hand": palm["hand"], "uploaded_at": palm["uploaded_at"]} if palm else None,
            "face": {"url": f"/uploads/face/{Path(face['image_path']).name}",
                     "thumbnail": f"/uploads/thumbnails/{Path(face['thumbnail_path']).name}",
                     "angle": face["angle"], "uploaded_at": face["uploaded_at"]} if face else None,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.delete("/api/user/{token}/images/{image_type}")
async def delete_user_image(token: str, image_type: str):
    if image_type not in ["palm", "face"]:
        return JSONResponse(status_code=400, content={"success": False, "error": "Must be 'palm' or 'face'"})
    try:
        table = f"{image_type}_images"
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(f"SELECT image_path,thumbnail_path FROM {table} WHERE token=%s", (token,))
        row = cur.fetchone()
        if row:
            for p in [row["image_path"], row["thumbnail_path"]]:
                try:
                    if os.path.exists(p): os.remove(p)
                except Exception: pass
            cur.execute(f"DELETE FROM {table} WHERE token=%s", (token,))
            conn.commit()
        cur.close(); conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/chat")
async def chat_message(message: str = Form(...), userId: str = Form(...), audio: Optional[UploadFile] = File(None)):
    try:
        name     = "there"
        analysis = None
        palm     = None
        history  = []

        try:
            conn = get_db_connection(); cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE token=%s", (userId,))
            user = cur.fetchone()
            if user:
                name = user["name"].split()[0] if user.get("name") else "there"
                try:
                    cur.execute("""
                        SELECT life_path,soul_urge,personality,personal_year,personal_month,personal_day,
                               sun_sign,moon_sign,rising_sign,face_shape,face_archetype
                        FROM analyses WHERE token=%s ORDER BY timestamp DESC LIMIT 1
                    """, (userId,))
                    analysis = cur.fetchone()
                except Exception:
                    pass
                try:
                    cur.execute("SELECT hand_shape,hand_element,ruling_planet FROM palm_analyses WHERE token=%s ORDER BY timestamp DESC LIMIT 1", (userId,))
                    palm = cur.fetchone()
                except Exception:
                    pass
                try:
                    cur.execute("SELECT role,content FROM conversations WHERE token=%s ORDER BY timestamp DESC LIMIT 5", (userId,))
                    history = cur.fetchall() or []
                except Exception:
                    pass
            cur.close(); conn.close()
        except Exception as db_err:
            logger.warning(f"Chat: DB lookup failed for {userId}: {db_err}")

        transcribed_text = message
        if audio:
            audio_bytes = await audio.read()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(audio_bytes); tmp_path = tmp.name
            segs, _ = whisper_model.transcribe(tmp_path, beam_size=1, language="en", vad_filter=True)
            transcribed_text = " ".join(s.text for s in segs).strip() or message
            os.unlink(tmp_path)

        history_text = "\n".join(f"{h['role']}: {h['content']}" for h in reversed(history))
        ctx_parts    = [f"User's name: {name}"]
        if analysis:
            for k, v in analysis.items():
                if v and k not in ("id", "token", "timestamp"): ctx_parts.append(f"{k}: {v}")
        if palm:
            for k, v in palm.items():
                if v and k not in ("id", "token", "timestamp"): ctx_parts.append(f"{k}: {v}")
        context = ". ".join(ctx_parts) + "."
        prompt  = f"Context: {context}\nPrevious:\n{history_text}\nUser: {transcribed_text}\nJenny (friendly, wise, short):"

        try:
            response = requests.post(OLLAMA_URL, json={
                "model": "tinyllama:1.1b", "prompt": prompt, "stream": False,
                "temperature": 0.8, "max_tokens": 70,
            }, timeout=3)
            ai_response = response.json().get("response", "").strip() if response.status_code == 200 else random.choice(FAST_RESPONSES)
        except Exception:
            ai_response = random.choice(FAST_RESPONSES)

        audio_url = None
        if len(ai_response) > 20:
            audio_data = await text_to_speech(ai_response)
            if audio_data:
                audio_filename = f"chat_{uuid.uuid4().hex}.mp3"
                audio_path = f"static/audio/{audio_filename}"
                with open(audio_path, "wb") as f: f.write(audio_data)
                audio_url = f"/static/audio/{audio_filename}"

        session_id = f"CHAT{datetime.now().strftime('%y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        try:
            conn2 = get_db_connection(); cur2 = conn2.cursor()
            cur2.execute(
                "INSERT INTO users (token, name, created) VALUES (%s, %s, %s) ON CONFLICT (token) DO NOTHING",
                (userId, name if name != "there" else f"User_{userId[-6:]}", datetime.now().isoformat())
            )
            cur2.execute("INSERT INTO conversations (token,session_id,role,content,timestamp) VALUES (%s,%s,%s,%s,%s)",
                         (userId, session_id, "user", transcribed_text[:500], datetime.now().isoformat()))
            cur2.execute("INSERT INTO conversations (token,session_id,role,content,timestamp) VALUES (%s,%s,%s,%s,%s)",
                         (userId, session_id, "assistant", ai_response[:500], datetime.now().isoformat()))
            try:
                cur2.execute("INSERT INTO chat_history (token,message,response,timestamp) VALUES (%s,%s,%s,%s)",
                             (userId, transcribed_text[:500], ai_response[:500], datetime.now().isoformat()))
            except Exception:
                pass
            conn2.commit(); cur2.close(); conn2.close()
        except Exception as save_err:
            logger.warning(f"Chat: conversation save failed (non-fatal): {save_err}")

        return {"success": True, "message": ai_response, "audioUrl": audio_url,
                "transcribedText": transcribed_text if audio else None, "session_id": session_id}
    except Exception as e:
        print(f"❌ Chat error: {e}")
        import traceback; traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/chat/history")
async def get_chat_history(userId: str, limit: int = 50):
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT * FROM conversations WHERE token=%s ORDER BY timestamp DESC LIMIT %s", (userId, limit))
    convs = cur.fetchall()
    cur.close(); conn.close()
    messages = [{"id": c["id"], "content": c["content"],
                 "sender": "user" if c["role"] == "user" else "ai",
                 "timestamp": c["timestamp"]} for c in reversed(convs)]
    return {"success": True, "messages": messages}


@app.post("/api/chat/stream")
async def stream_chat(data: dict):
    message = data.get("message"); userId = data.get("userId")
    if not message or not userId:
        return JSONResponse(status_code=400, content={"error": "Missing message or userId"})
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE token=%s", (userId,))
    user = cur.fetchone(); cur.close(); conn.close()
    name = user["name"].split()[0] if user and user["name"] else "there"

    async def generate():
        prompt = f"User {name} says: {message}\nJenny (short, friendly response):"
        try:
            response = requests.post(OLLAMA_URL, json={
                "model": "tinyllama:1.1b", "prompt": prompt, "stream": True,
                "temperature": 0.8, "max_tokens": 30,
            }, stream=True, timeout=3)
            for line in response.iter_lines():
                if line:
                    try:
                        d = json.loads(line)
                        if "response" in d: yield d["response"]
                    except Exception: continue
        except Exception:
            yield f" {random.choice(FAST_RESPONSES)}"

    return StreamingResponse(generate(), media_type="text/plain")


@app.delete("/api/chat/history")
async def clear_chat_history(data: dict):
    userId = data.get("userId")
    if not userId:
        return JSONResponse(status_code=400, content={"error": "Missing userId"})
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("DELETE FROM conversations WHERE token=%s", (userId,))
    cur.execute("DELETE FROM chat_history WHERE token=%s", (userId,))
    conn.commit(); cur.close(); conn.close()
    return {"success": True}


@app.get("/user/{token}/history")
async def get_user_history(token: str):
    conn = get_db_connection(); cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE token=%s", (token,))
    user = cur.fetchone()
    cur.execute("SELECT * FROM analyses WHERE token=%s ORDER BY timestamp DESC", (token,))
    analyses = cur.fetchall()
    cur.execute("SELECT * FROM palm_analyses WHERE token=%s ORDER BY timestamp DESC", (token,))
    palm_analyses = cur.fetchall()
    cur.execute("SELECT * FROM narrative_sessions WHERE token=%s ORDER BY timestamp DESC", (token,))
    narrative_sessions = cur.fetchall()
    cur.close(); conn.close()

    analyses_list = []
    for a in analyses:
        a_dict = dict(a)
        if a_dict.get("face_traits"):
            try:    a_dict["face_traits"] = json.loads(a_dict["face_traits"])
            except: a_dict["face_traits"] = ["balanced", "adaptable", "strategic"]
        analyses_list.append(a_dict)

    return {
        "success":            True,
        "user":               dict(user) if user else None,
        "analyses":           analyses_list,
        "palm_analyses":      [dict(p) for p in palm_analyses],
        "narrative_sessions": [dict(n) for n in narrative_sessions],
    }


@app.get("/user/{token}/conversations")
async def get_conversations(token: str, session_id: Optional[str] = None):
    conn = get_db_connection(); cur = conn.cursor()
    if session_id:
        cur.execute("SELECT * FROM conversations WHERE token=%s AND session_id=%s ORDER BY timestamp ASC", (token, session_id))
    else:
        cur.execute("SELECT * FROM conversations WHERE token=%s ORDER BY timestamp DESC LIMIT 50", (token,))
    chats = cur.fetchall()
    cur.close(); conn.close()
    return {"success": True, "conversations": [dict(c) for c in chats]}


@app.post("/domain/{domain_id}/unlock")
async def unlock_domain(domain_id: int, data: dict):
    token = data.get("user_token")
    if token and domain_id in [2, 3, 4, 5]:
        conn = get_db_connection(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO domains (token,domain_id,unlocked) VALUES (%s,%s,1) "
            "ON CONFLICT (token,domain_id) DO UPDATE SET unlocked=1",
            (token, domain_id)
        )
        conn.commit(); cur.close(); conn.close()
        domain_names = {2: "Energy & Health", 3: "Work & Wealth", 4: "Relationships", 5: "Time & Cycles"}
        return {"success": True, "domain_id": domain_id,
                "domain_title": domain_names.get(domain_id, f"Domain {domain_id}"), "unlocked": True}
    return {"success": False}


@app.post("/payment/premium")
async def premium(data: dict):
    token = data.get("user_token")
    if token:
        conn = get_db_connection(); cur = conn.cursor()
        for d in [2, 3, 4, 5]:
            cur.execute(
                "INSERT INTO domains (token,domain_id,unlocked) VALUES (%s,%s,1) "
                "ON CONFLICT (token,domain_id) DO UPDATE SET unlocked=1",
                (token, d)
            )
        conn.commit(); cur.close(); conn.close()
        return {"success": True, "tier": "premium", "unlocked_domains": [2, 3, 4, 5],
                "message": "Premium activated! All domains unlocked."}
    return {"success": False}



# ══════════════════════════════════════════════
# ══  NEW PLATFORM ENDPOINTS  ══════════════════
# ══════════════════════════════════════════════


class WelcomeRequest(BaseModel):
    name:           str
    dob:            str
    birth_time:     Optional[str] = None
    birth_location: Optional[str] = None
    session_id:     str
    partner_name:   Optional[str] = None   # v8.2.0 — Union Blueprint visitors

@app.post("/welcome")
async def welcome_endpoint(body: WelcomeRequest):
    if not _WELCOME_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.welcome not yet built")
    try:
        return await generate_welcome_reading(
            name=body.name, dob=body.dob,
            birth_time=body.birth_time, birth_location=body.birth_location,
            session_id=body.session_id,
            partner_name=body.partner_name,   # v8.2.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tool-teaser")
async def tool_teaser_endpoint(
    name:           str           = Form(...),
    dob:            str           = Form(...),
    tool_id:        str           = Form(...),
    birth_time:     Optional[str] = Form(None),
    birth_location: Optional[str] = Form(None),
    partner_name:   Optional[str] = Form(None),   # v8.2.0
    session_id:     str           = Form("0"),
):
    result = await generate_tool_teaser(
        name           = name,
        dob            = dob,
        tool_id        = tool_id,
        birth_time     = birth_time,
        birth_location = birth_location,
        partner_name   = partner_name,   # v8.2.0
        session_id     = session_id,
    )
    return result


# ─────────────────────────────────────────────
# v8.2.0 — Daily Guidance endpoints
# Frontend DailyGuidance.tsx calls GET /guidance/daily and GET /guidance/pdf
# ─────────────────────────────────────────────

@app.get("/guidance/daily")
async def guidance_daily(
    dob:            str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
    user_id:        Optional[str] = None,
    name:           Optional[str] = None,
):
    """
    Personalised daily guidance matching DailyGuidance.tsx BackendGuidance interface.
    Returns: personal_day, vibration ("High"|"Medium"|"Low"), vibration_meaning,
             energy_level (1-5), energy_description, insight_message, moon_phase,
             universal_day, recommended_tools[], personal_year, generated_for
    """
    if not _DAILY_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.daily.daily_card not available")
    try:
        return await handle_daily_guidance(
            dob=dob, birth_time=birth_time, birth_location=birth_location,
            user_id=user_id, name=name or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/guidance/pdf")
async def guidance_pdf(
    dob:            str,
    birth_time:     Optional[str] = None,
    birth_location: Optional[str] = None,
    user_id:        Optional[str] = None,
    name:           Optional[str] = None,
):
    """
    Daily guidance PDF download.
    Called by DailyGuidance.tsx Download PDF button.
    Returns PDF bytes as attachment: KAYAL-Daily-Guidance-{date}.pdf
    """
    if not _DAILY_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.daily.daily_card not available")
    try:
        from datetime import date as _date
        pdf_bytes = await handle_daily_pdf(
            dob=dob, birth_time=birth_time, birth_location=birth_location,
            user_id=user_id, name=name or "",
        )
        filename = f"KAYAL-Daily-Guidance-{_date.today().strftime('%Y-%m-%d')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type = "application/pdf",
            headers    = {"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/daily-card")
async def daily_card():
    # v8.2.0: proxies to handle_daily_guidance() with today as the universal day
    if not _DAILY_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.daily.daily_card not available")
    from datetime import date as _date
    try:
        return await handle_daily_guidance(
            dob=_date.today().strftime("%Y-%m-%d"), user_id=None, name="Universal",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DailyInsightRequest(BaseModel):
    name:           str
    dob:            str
    birth_time:     Optional[str] = None
    birth_location: Optional[str] = None

@app.post("/daily-insight/{user_id}")
async def daily_insight(user_id: str, body: DailyInsightRequest):
    # v8.2.0: proxies to handle_daily_guidance() with profile data
    if not _DAILY_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.daily.daily_card not available")
    try:
        return await handle_daily_guidance(
            dob=body.dob, birth_time=body.birth_time,
            birth_location=body.birth_location, user_id=user_id, name=body.name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PurchaseBody(BaseModel):
    userId:        str
    toolId:        str
    toolName:      str
    toolType:      str
    category:      Optional[str]  = "universal"
    destination:   Optional[str]  = "report"
    emoji:         Optional[str]  = "📦"
    price:         float
    originalPrice: Optional[float] = None
    couponCode:    Optional[str]  = None
    name:          Optional[str]  = None
    email:         Optional[str]  = None
    expires_at:    Optional[str]  = None
    images:        Optional[Dict[str, str]] = None
    purchaseDate:  Optional[str]  = None
    job_id:        Optional[str]  = None

@app.post("/user/add-purchase")
async def add_purchase(body: PurchaseBody):
    if not _PURCHASE_HANDLER_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.reading.submit not yet built")
    try:
        result = await handle_add_purchase(body.model_dump())
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    tool_id: str
    message: str
    history: List[ChatMessage] = []
    job_id:  Optional[str]    = None

@app.post("/agency/chat")
async def agency_chat(body: ChatRequest):
    if not _AGENCY_CHAT_AVAILABLE:
        raise HTTPException(status_code=503, detail="agency/chat not yet built")
    try:
        result = await handle_chat(
            user_id=body.user_id, tool_id=body.tool_id,
            message=body.message, history=[m.model_dump() for m in body.history],
            job_id=body.job_id,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/agency/voice/{user_id}/{tool_id}")
async def agency_voice(websocket: WebSocket, user_id: str, tool_id: str):
    if not _AGENCY_VOICE_AVAILABLE:
        await websocket.close(code=1013, reason="agency/voice not yet built")
        return
    try:
        await handle_voice_websocket(websocket, user_id, tool_id)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ Voice WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


class CancelRequest(BaseModel):
    userId:   str
    toolId:   str
    reason:   Optional[str] = None
    feedback: Optional[str] = None

class ReactivateRequest(BaseModel):
    userId: str
    toolId: str

@app.post("/subscription/cancel")
async def cancel_subscription(body: CancelRequest):
    if not _SUBSCRIPTION_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.subscription.cancel not yet built")
    try:
        result = await handle_cancel(body.userId, body.toolId, body.reason, body.feedback)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/subscription/cancel")
async def reactivate_subscription(body: ReactivateRequest):
    if not _SUBSCRIPTION_AVAILABLE:
        raise HTTPException(status_code=503, detail="api.subscription.cancel not yet built")
    try:
        result = await handle_reactivate(body.userId, body.toolId)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host      = "127.0.0.1",
        port      = int(os.environ.get("PORT", 8000)),
        reload    = not IS_PRODUCTION,
        log_level = "info",
    )
