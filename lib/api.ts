// lib/api.ts
// ─────────────────────────────────────────────────────────────
// Central API helper — all calls to FastAPI go through here.
// Replace direct fetch('/api/...') calls with these helpers.
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
    fetch(`${API_BASE}/reading/submit`, {
      method: 'POST',
      body:   formData,
      // No Content-Type header — browser sets multipart boundary automatically
    }).then(r => r.json()),

  getJob: (jobId: string) =>
    apiFetch(`/reading/job/${jobId}`),

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
    apiFetch(`/user/${userId}/images`),

  getPurchases: (userId: string) =>
    apiFetch(`/user/${userId}/purchases`),
}

// ── Analytics endpoints ───────────────────────────────────────
export const analyticsApi = {
  pageview:  (payload: Record<string, unknown>) =>
    apiFetch('/analytics/pageview', { method: 'POST', body: JSON.stringify(payload) }),

  event:     (payload: Record<string, unknown>) =>
    apiFetch('/analytics/event', { method: 'POST', body: JSON.stringify(payload) }),

  identify:  (payload: Record<string, unknown>) =>
    apiFetch('/analytics/identify', { method: 'POST', body: JSON.stringify(payload) }),
}

// ── Admin endpoints ───────────────────────────────────────────
export const adminApi = {
  getStats:   () => apiFetch('/admin/stats'),
  getUsers:   () => apiFetch('/admin/users'),
  getLogs:    () => apiFetch('/admin/logs'),
  getRevenue: () => apiFetch('/admin/revenue'),
}

export default apiFetch
