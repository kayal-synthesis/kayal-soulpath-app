// lib/pricing/getCountryFromRequest.ts
//
// Detects visitor country from the incoming request.
//
// v2: the original version only checked Vercel's geo object and
// Cloudflare's cf-ipcountry header, both of which require that specific
// platform sitting in front of the app. Confirmed this project deploys
// by uploading directly to a Hetzner server with no CDN or reverse proxy
// providing either of those, so both checks were silently returning
// null on every single request, every visitor fell back to plain USD
// regardless of where they actually were.
//
// The fix: fall back to ip-api.com, a real, free, infrastructure-
// independent geolocation service (1,000 req/min free tier, no API key)
// that only needs the visitor's raw IP address, nothing platform-
// specific. This mirrors get_location_from_ip() in the Python backend's
// geo_service.py exactly, same service, same fields, same private-IP
// handling, so both halves of the app now agree on how this works
// rather than using two different approaches.

import { NextRequest } from 'next/server'

const PRIVATE_IP_PREFIXES = [
  '127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.',
  '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
  '172.29.', '172.30.', '172.31.', '::1', 'localhost',
]

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PREFIXES.some(p => ip.startsWith(p))
}

// Same priority order as get_client_ip() in geo_service.py: Cloudflare's
// header first if present, then the standard x-forwarded-for chain any
// reverse proxy sets, then x-real-ip, so this stays correct whether or
// not Cloudflare is ever added later.
function getClientIp(request: NextRequest): string | null {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return null
}

// ip-api.com lookup, matching geo_service.py's get_location_from_ip()
// exactly: same fields requested, same 5-second-class timeout, same
// "status !== success" failure handling. A short in-memory cache per IP
// keeps this from re-querying the same visitor's IP on every request
// within a session, ip-api's free tier is generous but not unlimited.
const ipCountryCache = new Map<string, { code: string; expires: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

async function lookupCountryFromIp(ip: string): Promise<string | null> {
  const cached = ipCountryCache.get(ip)
  if (cached && cached.expires > Date.now()) return cached.code

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!res.ok) return null

    const data = await res.json()
    if (data.status !== 'success' || !data.countryCode) return null

    ipCountryCache.set(ip, { code: data.countryCode, expires: Date.now() + CACHE_TTL_MS })
    return data.countryCode
  } catch {
    // Network error, timeout, or ip-api.com unreachable, fail closed to
    // null, callers already treat null as "unknown, default to USD."
    return null
  }
}

export async function getCountryFromRequest(request: NextRequest): Promise<string | null> {
  // Vercel Edge/Middleware: request.geo.country, free and automatic if
  // this project ever moves there, checked first since it costs nothing
  // when present.
  const vercelCountry = (request as any).geo?.country
  if (vercelCountry) return vercelCountry

  // Cloudflare's header, present automatically if traffic goes through
  // Cloudflare regardless of the origin host.
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') return cfCountry

  // Generic proxy header, in case some other CDN sets this.
  const genericCountry = request.headers.get('x-country') || request.headers.get('x-vercel-ip-country')
  if (genericCountry) return genericCountry

  // Real fallback for a direct-to-server deployment with none of the
  // above: look the visitor's IP up ourselves, the same way the Python
  // backend already does.
  const clientIp = getClientIp(request)
  if (clientIp && !isPrivateIp(clientIp)) {
    const ipCountry = await lookupCountryFromIp(clientIp)
    if (ipCountry) return ipCountry
  }

  return null
}
