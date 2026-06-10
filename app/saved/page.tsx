'use client'

/**
 * app/(app)/saved/page.tsx
 * ==========================
 * Saved insights and full session transcripts.
 * Organised by domain, searchable, copyable.
 *
 * Saves stored in localStorage + Supabase (synced).
 * Structure: { id, content, source_tool, domain, saved_at, tags }
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter }                         from 'next/navigation'
import { useAuth }                           from '@/lib/hooks/useAuth'
import {
  Bookmark, Search, Copy, Check,
  Trash2, Filter, ChevronDown,
  BookOpen, Mic, ExternalLink
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface SavedInsight {
  id:          string
  content:     string
  source_tool: string
  tool_emoji:  string
  domain:      string
  type:        'insight' | 'transcript'
  session_id?: string
  saved_at:    string
  tags:        string[]
}

type SortOrder = 'newest' | 'oldest' | 'domain'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const DOMAIN_COLOUR: Record<string, string> = {
  love:      '#d4856a', wealth:    '#b8966a',
  spiritual: '#9a8ac4', health:    '#7aaa8a',
  purpose:   '#7a9ac4', voice:     '#c9a96e',
  timing:    '#a8c4a0', grief:     '#8a9aaa',
  all:       '#c9a96e',
}

const DOMAIN_LIST = ['all','love','wealth','spiritual','health','purpose','voice','timing','grief']

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const STORAGE_KEY = 'kayal_saved_insights'

function loadSaved(): SavedInsight[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function deleteSaved(id: string): SavedInsight[] {
  const saved = loadSaved().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return saved
}

// ─────────────────────────────────────────────────────────────
// Insight card
// ─────────────────────────────────────────────────────────────
function InsightCard({
  insight,
  onDelete,
  onCopy,
  onOpen,
  copied,
}: {
  insight: SavedInsight
  onDelete: (id: string) => void
  onCopy:   (id: string, content: string) => void
  onOpen:   (insight: SavedInsight) => void
  copied:   string | null
}) {
  const dc = DOMAIN_COLOUR[insight.domain] ?? '#c9a96e'
  const [expanded, setExpanded] = useState(false)
  const preview = insight.content.slice(0, 180)
  const isTruncated = insight.content.length > 180

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-150"
      style={{ background: 'var(--depth)', border: `1px solid ${dc}14` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{insight.tool_emoji}</span>
          <div>
            <p className="text-[10px] tracking-widest uppercase font-label"
              style={{ color: dc }}>
              {insight.source_tool}
            </p>
            <p className="text-[9px]" style={{ color: 'var(--text-void)' }}>
              {formatDate(insight.saved_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onCopy(insight.id, insight.content)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-void)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
          >
            {copied === insight.id
              ? <Check className="w-3 h-3" />
              : <Copy  className="w-3 h-3" />}
          </button>
          {insight.session_id && (
            <button
              onClick={() => onOpen(insight)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-void)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => onDelete(insight.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-void)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#b45454')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-vellum)', fontFamily: 'var(--font-body)' }}
      >
        {expanded ? insight.content : preview}
        {isTruncated && !expanded && '…'}
      </p>

      {isTruncated && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="mt-2 flex items-center gap-1 text-[10px] tracking-widest uppercase font-label transition-colors"
          style={{ color: 'var(--text-void)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-stone)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-void)')}
        >
          {expanded ? 'Show less' : 'Read more'}
          <ChevronDown
            className="w-3 h-3 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}

      {/* Tags */}
      {insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {insight.tags.map(tag => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-label tracking-widest uppercase"
              style={{
                background: `${dc}10`,
                color:      `${dc}80`,
                border:     `1px solid ${dc}18`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function SavedPage() {
  const router   = useRouter()
  const { user } = useAuth()

  const [insights,  setInsights]  = useState<SavedInsight[]>([])
  const [filtered,  setFiltered]  = useState<SavedInsight[]>([])
  const [query,     setQuery]     = useState('')
  const [domain,    setDomain]    = useState('all')
  const [sort,      setSort]      = useState<SortOrder>('newest')
  const [copiedId,  setCopiedId]  = useState<string | null>(null)
  const [typeFilter,setTypeFilter]= useState<'all' | 'insight' | 'transcript'>('all')

  // ── Load from localStorage ────────────────────────────────
  useEffect(() => {
    setInsights(loadSaved())
  }, [])

  // ── Filter + sort ─────────────────────────────────────────
  useEffect(() => {
    let result = insights

    if (domain !== 'all') {
      result = result.filter(i => i.domain === domain)
    }
    if (typeFilter !== 'all') {
      result = result.filter(i => i.type === typeFilter)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(i =>
        i.content.toLowerCase().includes(q) ||
        i.source_tool.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    result = [...result].sort((a, b) => {
      if (sort === 'newest')  return b.saved_at.localeCompare(a.saved_at)
      if (sort === 'oldest')  return a.saved_at.localeCompare(b.saved_at)
      return a.domain.localeCompare(b.domain)
    })

    setFiltered(result)
  }, [insights, domain, query, sort, typeFilter])

  const handleDelete = useCallback((id: string) => {
    setInsights(deleteSaved(id))
  }, [])

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleOpen = useCallback((insight: SavedInsight) => {
    if (insight.session_id) {
      router.push(`/conversations/${insight.session_id}`)
    }
  }, [router])

  // Group by domain for domain sort
  const groupedByDomain = sort === 'domain'
    ? filtered.reduce((acc, i) => {
        const key = i.domain || 'other'
        if (!acc[key]) acc[key] = []
        acc[key].push(i)
        return acc
      }, {} as Record<string, SavedInsight[]>)
    : null

  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-2xl mx-auto"
      style={{ fontFamily: 'var(--font-body)', minHeight: '100vh' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-5 pt-6 pb-4"
        style={{ background: 'var(--abyss)', borderBottom: '1px solid var(--rim)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-parchment)' }}
          >
            Saved
          </h1>
          <span
            className="text-[10px] tracking-widest uppercase font-label px-2 py-1 rounded-full"
            style={{ background: 'var(--surface)', color: 'var(--text-stone)', border: '1px solid var(--rim)' }}
          >
            {insights.length} saved
          </span>
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
            placeholder="Search saved insights…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-vellum)', caretColor: 'var(--gold)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {/* Type filter */}
          {(['all','insight','transcript'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] tracking-widest uppercase font-label transition-all"
              style={{
                background: typeFilter === t ? 'var(--gold-surface)' : 'var(--depth)',
                color:      typeFilter === t ? 'var(--gold)'         : 'var(--text-void)',
                border:     `1px solid ${typeFilter === t ? 'var(--gold-border)' : 'var(--rim)'}`,
              }}
            >
              {t === 'all' ? 'All' : t === 'insight' ? '✦ Insights' : '📋 Transcripts'}
            </button>
          ))}

          <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--rim)' }} />

          {/* Sort */}
          {(['newest','oldest','domain'] as SortOrder[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] tracking-widest uppercase font-label transition-all"
              style={{
                background: sort === s ? 'var(--surface)' : 'transparent',
                color:      sort === s ? 'var(--text-scroll)' : 'var(--text-void)',
                border:     `1px solid ${sort === s ? 'var(--rim)' : 'transparent'}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 animate-fade-up">
            <Bookmark className="w-10 h-10 mx-auto" style={{ color: 'var(--text-void)' }} />
            <p className="text-sm" style={{ color: 'var(--text-stone)' }}>
              {query || domain !== 'all' || typeFilter !== 'all'
                ? 'Nothing matches this filter'
                : 'Nothing saved yet'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-void)' }}>
              Tap the bookmark icon on any oracle message to save it here
            </p>
          </div>
        ) : sort === 'domain' && groupedByDomain ? (
          Object.entries(groupedByDomain).map(([dom, items]) => {
            const dc = DOMAIN_COLOUR[dom] ?? '#c9a96e'
            return (
              <div key={dom} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[9px] tracking-widest uppercase font-label"
                    style={{ color: dc }}
                  >
                    {dom}
                  </span>
                  <div className="flex-1 h-px" style={{ background: `${dc}20` }} />
                  <span className="text-[9px]" style={{ color: 'var(--text-void)' }}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map(insight => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      onOpen={handleOpen}
                      copied={copiedId}
                    />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="space-y-3">
            {filtered.map((insight, i) => (
              <div key={insight.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <InsightCard
                  insight={insight}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onOpen={handleOpen}
                  copied={copiedId}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
