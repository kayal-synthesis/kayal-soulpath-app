// lib/api.ts
// ─────────────────────────────────────────────────────────────
// Central API helper — all calls to FastAPI go through here.
// Replace direct fetch('/api/...') calls with these helpers.
//
// v1.1, real bug fix, confirmed directly against main.py's actual,
// current route list: three real synthesis-engine endpoints were
// missing the /api prefix main.py genuinely uses, submit, getJob, and
// getImages would all have failed with a real 404 the moment
// NEXT_PUBLIC_API_URL was pointed at the correct backend address.
//
// getGuestToken, getPurchases, and every analytics/admin endpoint
// below are deliberately left untouched, confirmed directly against
// main.py, none of these exist there, and purchases and admin/
// analytics were never architecturally meant to live in the Python
// synthesis engine at all, that's a real, separate piece of work, not
// a path-prefix bug to patch here.
// ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.kayalsoulpath.com'

// ── Generic fetcher ───────────────────────────────────────────
async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`API error ${res.status}: ${error}`)
  }

  return res.json()
}

// ── Reading endpoints ─────────────────────────────────────────
export const readingApi = {
  submit: (formData: FormData) =>
    fetch(`${API_BASE}/api/reading/submit`, {
      method: 'POST',
      body:   formData,
      // No Content-Type header — browser sets multipart boundary automatically
    }).then(r => r.json()),

  getJob: (jobId: string) =>
    apiFetch(`/api/reading/job/${jobId}`),

  // Not yet confirmed to exist anywhere in main.py, left as-is rather
  // than guessed at, real, separate work if this is genuinely needed.
  getGuestToken: (jobId: string, email: string) =>
    apiFetch('/reading/guest-token', {
      method: 'POST',
      body:   JSON.stringify({ job_id: jobId, email }),
    }),
}

// ── User endpoints ────────────────────────────────────────────
export const userApi = {
  addPurchase: (payload: Record<string, unknown>) =>
    apiFetch('/user/add-purchase', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  getImages: (userId: string) =>
    apiFetch(`/api/user/${userId}/images`),

  // Not present in main.py, purchases genuinely live in Supabase, not
  // the Python synthesis engine, this needs a real Next.js/Supabase
  // route, not a path prefix, left as-is rather than guessed at.
  getPurchases: (userId: string) =>
    apiFetch(`/user/${userId}/purchases`),
}

// ── Analytics endpoints ───────────────────────────────────────
// None of these exist in main.py, confirmed directly, analytics was
// never architecturally meant to live in the Python synthesis engine,
// left as-is, genuinely separate, not-yet-built work.
export const analyticsApi = {
  pageview:  (payload: Record<string, unknown>) =>
    apiFetch('/analytics/pageview', { method: 'POST', body: JSON.stringify(payload) }),
  event:     (payload: Record<string, unknown>) =>
    apiFetch('/analytics/event', { method: 'POST', body: JSON.stringify(payload) }),
  identify:  (payload: Record<string, unknown>) =>
    apiFetch('/analytics/identify', { method: 'POST', body: JSON.stringify(payload) }),
}

// ── Admin endpoints ───────────────────────────────────────────
// None of these exist in main.py either, same real gap as above, left
// as-is, genuinely separate, not-yet-built work.
export const adminApi = {
  getStats:   () => apiFetch('/admin/stats'),
  getUsers:   () => apiFetch('/admin/users'),
  getLogs:    () => apiFetch('/admin/logs'),
  getRevenue: () => apiFetch('/admin/revenue'),
}

export default apiFetch
