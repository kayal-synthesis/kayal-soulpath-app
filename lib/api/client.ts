import axios from 'axios'

// v1.1, real bug fix, the fallback below pointed at 127.0.0.1, your
// own local machine, not the real, public backend, the same category
// of bug already found and fixed across lib/api.ts, context.ts, and
// several component files tonight. Now that .env.local correctly sets
// NEXT_PUBLIC_API_URL, this should never actually trigger in
// production, fixed anyway to match the same safe pattern used
// consistently everywhere else.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.kayalsoulpath.com'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token interceptor (safe for server-side)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const storage = localStorage.getItem('kayal-storage')
    if (storage) {
      try {
        const { state } = JSON.parse(storage)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (e) {
        // Silent fail - no client functions
      }
    }
  }
  return config
})

// Remove any toast or client-side error handlers from interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just log, don't show toasts
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)
