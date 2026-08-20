'use client'
/**
 * app/(app)/conversations/page.tsx
 * ==================================
 * All conversations — text and voice sessions.
 * Grouped by recency, filterable by domain.
 * Each card shows the last message, domain colour,
 * and time since last activity.
 *
 * v1.1, two real bug fixes, confirmed directly against main.py's
 * actual, current route list:
 *   1. The fallback API address still pointed at localhost, the same
 *      category of bug already found and fixed across several files
 *      tonight.
 *   2. The conversations endpoint was missing the /api prefix
 *      main.py's real route actually uses, /api/user/{token}/
 *      conversations exists, /user/{token}/conversations doesn't, the
 *      same bug already found once in ToolShell.tsx, showing up here
 *      independently since this page calls the same endpoint on its
 *      own. Without it this page would silently show zero
 *      conversations, wrapped in an existing try/catch, no crash,
 *      just an empty list where real history should be.
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter }                         from 'next/navigation'
import { useAuth }                           from '@/lib/hooks/useAuth'
import {
  Search, Mic, MessageSquare,
  Clock, ChevronRight, Filter,
  Plus, Sparkles
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Conversation {
  session_id:    string
  tool_id:       string
  tool_name:     string
  tool_emoji:    string
  domain:        string
  type:          'chat' | 'voice'
  last_message:  string
  last_role:     'user' | 'assistant'
  message_count: number
  updated_at:    string
  is_unread:     boolean
}
type FilterDomain = 'all' | 'love' | 'wealth' | 'spiritual' | 'health' | 'purpose' | 'voice'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com').replace(/\/$/, '')

const DOMAIN_COLOUR: Record<string, string> = {
  love:           '#d4856a',
  wealth:         '#b8966a',
  spiritual:      '#9a8ac4',
  health:         '#7aaa8a',
  purpose:        '#7a9ac4',
  voice:          '#c9a96e',
  'sacred-script':'#b8966a',
  'time-keeper':  '#a8c4a0',
  all:            '#c9a96e',
}
const DOMAIN_FILTERS: { id: FilterDomain; label: string; emoji: string }[] = [
  { id: 'all',      label: 'All',      emoji: '✦' },
  { id: 'love',     label: 'Love',     emoji: '💕' },
  { id: 'wealth',   label: 'Wealth',   emoji: '💰' },
  { id: 'purpose',  label: 'Purpose',  emoji: '🧭' },
  { id: 'spiritual',label: 'Spirit',   emoji: '🕯️' },
  { id: 'health',   label: 'Health',   emoji: '⚕️' },
  { id: 'voice',    label: 'Voice',    emoji: '🎙️' },
]

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `${days}d`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const week  = today - 6 * 86400000
  const groups: Record<string, Conversation[]> = {
    'Today':      [],
    'This week':  [],
    'Earlier':    [],
  }
  for (const c of conversations) {
    const t = new Date(c.updated_at).getTime()
    if (t >= today)     groups['Today'].push(c)
    else if (t >= week) groups['This week'].push(c)
    else                groups['Earlier'].push(c)
  }
  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, v]) => v.length > 0)
  )
}

// ─────────────────────────────────────────────────────────────
// Conversation card
// ─────────────────────────────────────────────────────────────
function ConversationCard({
  conv,
  onClick,
}: {
  conv: Conversation
  onClick: () => void
}) {
  const dc = DOMAIN_COLOUR[conv.domain] ?? '#c9a96e'
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 text-left group"
      style={{
        borderBottom: '1px solid var(--rim)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--depth)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Tool icon */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base"
        style={{
          background: `${dc}12`,
          border:     `1px solid ${dc}22`,
        }}
      >
        {conv.tool_emoji}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p
            className="text-xs truncate"
            style={{
              color:      conv.is_unread ? 'var(--text-parchment)' : 'var(--text-vellum)',
              fontWeight: conv.is_unread ? 500 : 400,
            }}
          >
            {conv.tool_name}
          </p>
          {conv.type === 'voice' && (
            <Mic className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--text-void)' }} />
          )}
          {conv.is_unread && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: dc }}
            />
          )}
        </div>
        <p
          className="text-[10px] truncate"
          style={{ color: 'var(--text-stone)' }}
        >
          {conv.last_role === 'assistant' ? '' : 'You: '}
          {conv.last_message || 'Start of session'}
        </p>
      </div>
      {/* Meta */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-void)' }}>
          {timeAgo(conv.updated_at)}
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-label tracking-widest uppercase"
          style={{
            background: `${dc}12`,
            color:      `${dc}88`,
          }}
        >
          {conv.message_count}
        </span>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function ConversationsPage() {
  const router   = useRouter()
  const { user } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filtered,      setFiltered]      = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [query,         setQuery]         = useState('')
  const [domain,        setDomain]        = useState<FilterDomain>('all')

  // ── Load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const res  = await fetch(`${API}/api/user/${user.id}/conversations`)
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        // Group raw messages into sessions
        const sessionMap: Record<string, any> = {}
        for (const msg of (data.conversations ?? [])) {
          const sid = msg.session_id ?? msg.id
          if (!sessionMap[sid]) {
            sessionMap[sid] = {
              session_id:    sid,
              tool_id:       msg.tool_id       ?? 'unknown',
              tool_name:     msg.tool_name     ?? 'Session',
              tool_emoji:    msg.tool_emoji    ?? '📜',
              domain:        msg.domain        ?? 'all',
              type:          msg.session_type  ?? 'chat',
              last_message:  msg.content       ?? '',
              last_role:     msg.role          ?? 'assistant',
              message_count: 1,
              updated_at:    msg.timestamp     ?? new Date().toISOString(),
              is_unread:     msg.role === 'assistant',
            }
          } else {
            sessionMap[sid].message_count++
            if (msg.timestamp > sessionMap[sid].updated_at) {
              sessionMap[sid].updated_at   = msg.timestamp
              sessionMap[sid].last_message = msg.content ?? ''
              sessionMap[sid].last_role    = msg.role ?? 'assistant'
            }
          }
        }
        const convList = Object.values(sessionMap)
          .sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at)) as Conversation[]
        setConversations(convList)
        setFiltered(convList)
      } catch { /* non-fatal */ }
      setLoading(false)
    }
    load()
  }, [user?.id])

  // ── Filter ────────────────────────────────────────────────
  useEffect(() => {
    let result = conversations
    if (domain !== 'all') {
      result = result.filter(c =>
        c.domain === domain ||
        (domain === 'voice' && c.type === 'voice')
      )
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        c.tool_name.toLowerCase().includes(q) ||
        c.last_message.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [conversations, domain, query])

  const grouped = groupByDate(filtered)

  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-2xl mx-auto"
      style={{ fontFamily: 'var(--font-body)', minHeight: '100vh' }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-5 pt-6 pb-4"
        style={{
          background:     'var(--abyss)',
          borderBottom:   '1px solid var(--rim)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
          >
            Conversations
          </h1>
          <button
            onClick={() => router.push('/conversations/new')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'var(--gold-surface)',
              border:     '1px solid var(--gold-border)',
              color:      'var(--gold)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-glow)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold-surface)')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
          style={{ background: 'var(--depth)', border: '1px solid var(--rim)' }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-void)' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{
              color:           'var(--text-vellum)',
              caretColor:      'var(--gold)',
              fontFamily:      'var(--font-body)',
            }}
          />
        </div>
        {/* Domain filters */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {DOMAIN_FILTERS.map(f => {
            const isActive = domain === f.id
            const dc = DOMAIN_COLOUR[f.id] ?? 'var(--gold)'
            return (
              <button
                key={f.id}
                onClick={() => setDomain(f.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap transition-all font-label tracking-widest uppercase"
                style={{
                  background: isActive ? `${dc}18` : 'var(--depth)',
                  color:      isActive ? dc       : 'var(--text-void)',
                  border:     `1px solid ${isActive ? `${dc}30` : 'var(--rim)'}`,
                }}
              >
                <span>{f.emoji}</span>
                {f.label}
              </button>
            )
          })}
        </div>
      </div>
      {/* ── Body ─────────────────────────────────────────── */}
      <div>
        {loading ? (
          <div className="px-5 py-6 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 rounded w-1/3" />
                  <div className="skeleton h-2.5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center space-y-4 animate-fade-up">
            <div className="text-4xl">📜</div>
            <p className="text-sm" style={{ color: 'var(--text-stone)' }}>
              {query || domain !== 'all'
                ? 'No conversations match this filter'
                : 'No conversations yet'}
            </p>
            {!query && domain === 'all' && (
              <button
                onClick={() => router.push('/conversations/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-label tracking-widest uppercase transition-all"
                style={{ background: 'var(--gold-surface)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Start First Session
              </button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([label, convs]) => (
            <div key={label}>
              {/* Group header */}
              <div
                className="px-5 py-2"
                style={{ borderBottom: '1px solid var(--rim)' }}
              >
                <span
                  className="text-[9px] tracking-widest uppercase font-label"
                  style={{ color: 'var(--text-void)' }}
                >
                  {label}
                </span>
              </div>
              {/* Conversations */}
              {convs.map(conv => (
                <ConversationCard
                  key={conv.session_id}
                  conv={conv}
                  onClick={() => router.push(`/conversations/${conv.session_id}`)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
