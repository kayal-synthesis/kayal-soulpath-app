"""
Geo Service — KAYAL Synthesis Platform
========================================
Handles two distinct geolocation needs:

1. Birth location geocoding
   Input:  "Lagos, Nigeria" (string from onboarding)
   Output: GeoResult with lat/lon/timezone

2. Present location from IP
   Input:  Client IP address
   Output: GeoResult (city-level accuracy)
   Cost:   Free — uses ip-api.com (1,000 req/min free tier)
           Fallback to birth location if IP lookup fails

Birth location uses Nominatim (OpenStreetMap) — completely free,
no API key required. Rate limit: 1 request/second.

v2.0.0 changes:
  - BUG FIX: "Asia/Dhaka" appeared twice in _TZ_OFFSETS (duplicate key —
    Python silently discards the first). Removed duplicate.
  - BUG FIX: "America/Port_of_Spain" corrected to -4.0 (UTC-4 year-round,
    not -5.0 as in v1.0.0).
  - _TZ_OFFSETS: Africa/Kampala (+3), Africa/Dar_es_Salaam (+3),
    Africa/Douala (+1) added for East/Central African coverage.
  - async_geocode_birth_location(): async wrapper that runs the sync
    geocode_birth_location() in a thread pool executor, preventing
    the time.sleep() rate-limit call from blocking the FastAPI event loop.
  - async_get_location_from_ip(): same — async wrapper for the sync
    get_location_from_ip(). Both submit.py and any other async handler
    should use these async versions.
  - Version: 1.0.0 → 2.0.0

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not installed. Install with: pip install httpx")


# ---------------------------------------------------------------------------
# Output model (mirrors logic/models.py GeoLocation)
# ---------------------------------------------------------------------------

@dataclass
class GeoResult:
    """Resolved geographic location."""
    place_name:   str
    city:         str
    country:      str
    country_code: str
    latitude:     float
    longitude:    float
    timezone:     str
    utc_offset:   float
    source:       str     # "nominatim" | "ip_api" | "fallback"
    confidence:   float   # 0.0–1.0


# ---------------------------------------------------------------------------
# Known timezone → UTC offset mapping
# v2.0.0: duplicate Asia/Dhaka removed; Port_of_Spain corrected;
#         Africa/Kampala, Dar_es_Salaam, Douala added
# ---------------------------------------------------------------------------

_TZ_OFFSETS: Dict[str, float] = {
    # Africa
    "Africa/Lagos":         1.0,
    "Africa/Accra":         0.0,
    "Africa/Nairobi":       3.0,
    "Africa/Johannesburg":  2.0,
    "Africa/Cairo":         2.0,
    "Africa/Casablanca":    1.0,
    "Africa/Abidjan":       0.0,
    "Africa/Addis_Ababa":   3.0,
    "Africa/Kampala":       3.0,   # v2.0.0
    "Africa/Dar_es_Salaam": 3.0,   # v2.0.0
    "Africa/Douala":        1.0,   # v2.0.0 (Cameroon)
    # Asia
    "Asia/Kolkata":         5.5,
    "Asia/Karachi":         5.0,
    "Asia/Dhaka":           6.0,   # v2.0.0 BUG FIX: duplicate removed
    "Asia/Colombo":         5.5,
    "Asia/Dubai":           4.0,
    "Asia/Riyadh":          3.0,
    "Asia/Kuala_Lumpur":    8.0,
    "Asia/Singapore":       8.0,
    "Asia/Jakarta":         7.0,
    "Asia/Manila":          8.0,
    "Asia/Bangkok":         7.0,
    "Asia/Tokyo":           9.0,
    "Asia/Shanghai":        8.0,
    "Asia/Seoul":           9.0,
    # Americas
    "America/New_York":    -5.0,
    "America/Chicago":     -6.0,
    "America/Denver":      -7.0,
    "America/Los_Angeles": -8.0,
    "America/Toronto":     -5.0,
    "America/Vancouver":   -8.0,
    "America/Sao_Paulo":   -3.0,
    "America/Mexico_City": -6.0,
    "America/Bogota":      -5.0,
    "America/Lima":        -5.0,
    "America/Buenos_Aires":-3.0,
    "America/Jamaica":     -5.0,
    "America/Port_of_Spain":-4.0,  # v2.0.0 BUG FIX: was -5.0, correct is -4.0 (UTC-4 year-round)
    # Europe
    "Europe/London":        0.0,
    "Europe/Paris":         1.0,
    "Europe/Berlin":        1.0,
    "Europe/Madrid":        1.0,
    "Europe/Rome":          1.0,
    "Europe/Amsterdam":     1.0,
    "Europe/Moscow":        3.0,
    "Europe/Istanbul":      3.0,
    "Europe/Warsaw":        1.0,
    # Pacific / Oceania
    "Australia/Sydney":    10.0,
    "Australia/Melbourne": 10.0,
    "Pacific/Auckland":    12.0,
    # Middle East
    "Asia/Jerusalem":       2.0,
    "Asia/Beirut":          2.0,
    "Asia/Baghdad":         3.0,
    "Asia/Tehran":          3.5,
    "UTC":                  0.0,
}


def _tz_to_offset(timezone: str) -> float:
    """Get UTC offset for a timezone string."""
    if timezone in _TZ_OFFSETS:
        return _TZ_OFFSETS[timezone]
    try:
        import pytz
        from datetime import datetime
        tz     = pytz.timezone(timezone)
        offset = tz.utcoffset(datetime.now()).total_seconds() / 3600
        return offset
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Nominatim geocoding — sync (v1.0.0, preserved)
# ---------------------------------------------------------------------------

_NOMINATIM_CACHE:     Dict[str, Optional[GeoResult]] = {}
_LAST_NOMINATIM_CALL: float = 0.0


def geocode_birth_location(place_string: str) -> Optional[GeoResult]:
    """
    Geocode a birth location string using OpenStreetMap Nominatim.
    Free, no API key, 1 req/sec rate limit.

    SYNC — use async_geocode_birth_location() from async FastAPI handlers
    to avoid blocking the event loop on the time.sleep() rate-limit call.

    Args:
        place_string: e.g. "Lagos, Nigeria" or "Mumbai" or "Paris, France"

    Returns:
        GeoResult or None if geocoding fails
    """
    if not place_string or not place_string.strip():
        return None

    clean = place_string.strip().lower()
    if clean in _NOMINATIM_CACHE:
        return _NOMINATIM_CACHE[clean]

    if not HTTPX_AVAILABLE:
        logger.warning("httpx not available — cannot geocode birth location")
        return _fallback_geo(place_string)

    # Rate limit — Nominatim requires 1 req/sec
    global _LAST_NOMINATIM_CALL
    elapsed = time.time() - _LAST_NOMINATIM_CALL
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)   # sync sleep — run in executor from async context

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q":              place_string,
                    "format":         "json",
                    "limit":          1,
                    "addressdetails": 1,
                },
                headers={"User-Agent": "KAYAL-LifeOS/2.0 (contact@kayal.app)"},
            )
            _LAST_NOMINATIM_CALL = time.time()

            if response.status_code != 200:
                logger.warning(f"Nominatim returned {response.status_code}")
                return _fallback_geo(place_string)

            results = response.json()
            if not results:
                logger.warning(f"Nominatim found no results for: {place_string}")
                return _fallback_geo(place_string)

            r       = results[0]
            address = r.get("address", {})
            lat     = float(r["lat"])
            lon     = float(r["lon"])

            city = (
                address.get("city")    or
                address.get("town")    or
                address.get("village") or
                address.get("county")  or
                place_string.split(",")[0].strip()
            )
            country      = address.get("country", "")
            country_code = address.get("country_code", "").upper()
            timezone     = _get_timezone_from_coords(lat, lon) or "UTC"
            utc_offset   = _tz_to_offset(timezone)

            result = GeoResult(
                place_name   = place_string,
                city         = city,
                country      = country,
                country_code = country_code,
                latitude     = lat,
                longitude    = lon,
                timezone     = timezone,
                utc_offset   = utc_offset,
                source       = "nominatim",
                confidence   = 0.95,
            )
            _NOMINATIM_CACHE[clean] = result
            logger.info(f"Geocoded '{place_string}' → {city}, {country} ({lat:.3f}, {lon:.3f})")
            return result

    except Exception as e:
        logger.error(f"Nominatim geocoding failed for '{place_string}': {e}")
        return _fallback_geo(place_string)


# ---------------------------------------------------------------------------
# IP geolocation — sync (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def get_location_from_ip(ip_address: str) -> Optional[GeoResult]:
    """
    Detect present location from IP address using ip-api.com.
    Free tier: 1,000 requests/minute. No API key needed.

    SYNC — use async_get_location_from_ip() from async FastAPI handlers.

    Args:
        ip_address: Client IP (from request headers)

    Returns:
        GeoResult or None
    """
    if _is_private_ip(ip_address):
        logger.debug(f"Private IP ({ip_address}) — skipping geo lookup")
        return None

    if not HTTPX_AVAILABLE:
        return None

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"http://ip-api.com/json/{ip_address}",
                params={"fields": "status,country,countryCode,city,lat,lon,timezone,offset"},
            )
            if response.status_code != 200:
                return None

            data = response.json()
            if data.get("status") != "success":
                logger.warning(f"ip-api.com failed for {ip_address}: {data.get('message')}")
                return None

            timezone   = data.get("timezone", "UTC")
            utc_offset = data.get("offset", 0) / 3600.0

            result = GeoResult(
                place_name   = f"{data.get('city', '')}, {data.get('country', '')}",
                city         = data.get("city", ""),
                country      = data.get("country", ""),
                country_code = data.get("countryCode", ""),
                latitude     = float(data.get("lat", 0)),
                longitude    = float(data.get("lon", 0)),
                timezone     = timezone,
                utc_offset   = utc_offset,
                source       = "ip_api",
                confidence   = 0.75,
            )
            logger.info(
                f"IP geolocation: {ip_address} → "
                f"{result.city}, {result.country} ({result.timezone})"
            )
            return result

    except Exception as e:
        logger.error(f"IP geolocation failed for {ip_address}: {e}")
        return None


# ---------------------------------------------------------------------------
# v2.0.0 — Async wrappers
# Run the sync geocoding functions in a thread pool executor so they
# don't block the FastAPI event loop on httpx.Client or time.sleep().
# submit.py and any other async handler should use these.
# ---------------------------------------------------------------------------

async def async_geocode_birth_location(place_string: str) -> Optional[GeoResult]:
    """
    Async wrapper for geocode_birth_location().

    Runs the sync implementation in a thread pool executor so the
    time.sleep() rate-limit call does not block the FastAPI event loop.
    Use this from any async endpoint or background task.

    Args:
        place_string: e.g. "Lagos, Nigeria"

    Returns:
        GeoResult or None
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        functools.partial(geocode_birth_location, place_string),
    )


async def async_get_location_from_ip(ip_address: str) -> Optional[GeoResult]:
    """
    Async wrapper for get_location_from_ip().

    Runs the sync httpx.Client call in a thread pool executor so it
    does not block the FastAPI event loop.
    Use this from any async endpoint or background task.

    Args:
        ip_address: Client IP extracted from request headers

    Returns:
        GeoResult or None
    """
    if _is_private_ip(ip_address):
        return None
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        functools.partial(get_location_from_ip, ip_address),
    )


# ---------------------------------------------------------------------------
# Request header IP extraction (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def get_client_ip(request_headers: Dict[str, str]) -> str:
    """
    Extract real client IP from request headers.
    Handles Cloudflare, nginx proxy, and direct connections.
    """
    cf_ip = request_headers.get("cf-connecting-ip", "")
    if cf_ip:
        return cf_ip.strip()
    x_forwarded = request_headers.get("x-forwarded-for", "")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    x_real_ip = request_headers.get("x-real-ip", "")
    if x_real_ip:
        return x_real_ip.strip()
    return request_headers.get("remote-addr", "127.0.0.1")


# ---------------------------------------------------------------------------
# Timezone from coordinates (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def _get_timezone_from_coords(lat: float, lon: float) -> Optional[str]:
    """Get IANA timezone from lat/lon using timezonefinder."""
    try:
        from timezonefinder import TimezoneFinder
        tf = TimezoneFinder()
        return tf.timezone_at(lat=lat, lng=lon)
    except ImportError:
        offset_hours = round(lon / 15)
        offset_hours = max(-12, min(14, offset_hours))
        if offset_hours == 0:
            return "UTC"
        sign = "+" if offset_hours > 0 else "-"
        return f"Etc/GMT{sign}{abs(offset_hours)}"
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Private IP check (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def _is_private_ip(ip: str) -> bool:
    """Check if IP is private/local."""
    private_prefixes = (
        "127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.",
        "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
        "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
        "172.29.", "172.30.", "172.31.", "::1", "localhost",
    )
    return any(ip.startswith(p) for p in private_prefixes)


# ---------------------------------------------------------------------------
# Fallback GeoResult (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def _fallback_geo(place_string: str) -> GeoResult:
    """
    Fallback geo result when geocoding fails.
    Returns a minimal result using the place string.
    """
    parts   = place_string.split(",")
    city    = parts[0].strip() if parts else place_string
    country = parts[-1].strip() if len(parts) > 1 else ""
    return GeoResult(
        place_name   = place_string,
        city         = city,
        country      = country,
        country_code = "XX",
        latitude     = 0.0,
        longitude    = 0.0,
        timezone     = "UTC",
        utc_offset   = 0.0,
        source       = "fallback",
        confidence   = 0.20,
    )


# ---------------------------------------------------------------------------
# Convert GeoResult → logic/models.py GeoLocation dict (v1.0.0, preserved)
# ---------------------------------------------------------------------------

def geo_result_to_geolocation(geo: GeoResult) -> Dict[str, Any]:
    """
    Convert GeoResult to the dict format that matches
    logic/models.py GeoLocation dataclass.
    Used when constructing BirthData for the synthesis engine.
    """
    return {
        "place_name":   geo.place_name,
        "city":         geo.city,
        "country":      geo.country,
        "country_code": geo.country_code,
        "latitude":     geo.latitude,
        "longitude":    geo.longitude,
        "timezone":     geo.timezone,
        "utc_offset":   geo.utc_offset,
    }
