// lib/pricing/getCountryFromRequest.ts
//
// Detects visitor country from the incoming request. Checks the common
// patterns across hosting platforms since the exact deployment target
// wasn't confirmed in this conversation, Vercel's built-in geo object
// first (if deployed there, this needs zero extra setup or API cost),
// then Cloudflare's header (if behind Cloudflare), then a generic
// x-country header some proxies/CDNs set. Returns null rather than a
// guess if none of these are present, callers should treat null as
// "unknown, default to full USD price," never assume a country.

import { NextRequest } from 'next/server'

export function getCountryFromRequest(request: NextRequest): string | null {
  // Vercel Edge/Middleware: request.geo.country, if this project is on
  // Vercel this is free and requires no extra API calls or setup at all.
  const vercelCountry = (request as any).geo?.country
  if (vercelCountry) return vercelCountry

  // Cloudflare's header, present automatically if traffic goes through
  // Cloudflare regardless of the origin host.
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') return cfCountry

  // A generic fallback some proxies/CDNs set, worth checking your
  // actual infrastructure for the real header name if neither of the
  // above apply.
  const genericCountry = request.headers.get('x-country') || request.headers.get('x-vercel-ip-country')
  if (genericCountry) return genericCountry

  return null
}
