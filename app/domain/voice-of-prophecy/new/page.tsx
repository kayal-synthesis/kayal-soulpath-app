'use client'

/**
 * app/domain/voice-of-prophecy/new/page.tsx
 *
 * Shows only the Voice of Prophecy tools the user has purchased.
 * Has nothing to do with Sacred Script.
 * Routes to /domain/voice-of-prophecy/[toolId]
 */

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { useAuth }             from '@/lib/hooks/useAuth'
import { voiceTools }          from '@/lib/constants/voice-tools'
import { ChevronRight, Clock, Star, ArrowLeft } from 'lucide-react'

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '')

const DOMAIN_ACCENT: Record<string, string> = {
  love:'#d4856a', wealth:'#c9a96e', spiritual:'#a48ac4',
  health:'#7aaa8a', purpose:'#7a9ac4', timing:'#a0c49a',
  grief:'#8a9aaa', all:'#c9a96e',
}

const TOOL_DOMAIN: Record<string, string> = {
  'oracle-voice-session':'all','oracle-deep-dive-session':'all',
  'love-oracle-session':'love','wealth-oracle-session':'wealth',
  'purpose-oracle-session':'purpose','daily-voice-briefing':'timing',
  'relationship-oracle-session':'love','spiritual-oracle-session':'spiritual',
  'crisis-oracle-session':'all','oracle-voice-unlimited':'all',
}

async function checkSub(userId: string, toolId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/subscription/tier?user_id=${userId}&tool_id=${toolId}`)
    if (!res.ok) return false
    const d = await res.json()
    return d.active === true
  } catch { return false }
}

export default function NewVoiceSessionPage() {
  const router   = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [tools,    setTools]    = useState<typeof voiceTools>([])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user?.id) { setChecking(false); return }
    Promise.all(
      voiceTools.map(t => checkSub(user.id, t.id).then(active => ({ t, active })))
    ).then(results => {
      setTools(results.filter(r => r.active).map(r => r.t))
      setChecking(false)
    })
  }, [user?.id, isAuthenticated, isLoading])

  if (!isLoading && !isAuthenticated) {
    return (
      <div style={centreStyle}>
        <p style={mutedText}>Sign in to continue</p>
        <button onClick={() => router.push('/auth/login')} style={btnStyle('#c9a96e')}>
          Sign In
        </button>
      </div>
    )
  }

  if (checking) {
    return (
      <div style={centreStyle}>
        <p style={{ ...mutedText, animation:'pulse 1.5s ease-in-out infinite' }}>
          Loading your tools…
        </p>
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <div style={{ ...centreStyle, gap:16, textAlign:'center', padding:'40px 24px' }}>
        <div style={{ fontSize:40 }}>🎙️</div>
        <p style={{
          fontFamily:"'Cormorant Garamond',Georgia,serif",
          fontSize:'20px', color:'rgba(239,230,214,0.75)', fontWeight:400,
        }}>
          No Voice of Prophecy tools
        </p>
        <p style={{ ...mutedText, maxWidth:260, lineHeight:1.6 }}>
          You have not subscribed to any voice oracle tools yet.
        </p>
        <button onClick={() => router.push('/domain/voice-of-prophecy')} style={btnStyle('#c9a96e')}>
          Browse Voice Tools
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'radial-gradient(ellipse at 50% 0%, #110e06 0%, #0d0b0f 60%)',
      fontFamily:"'EB Garamond',Georgia,serif",
      paddingBottom:'48px',
    }}>
      {/* Header */}
      <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.back()} style={backBtn}>
          <ArrowLeft style={{ width:12, height:12 }} /> Back
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:12 }}>
          <div style={orbStyle('#c9a96e', 42)}>🎙️</div>
          <div>
            <h1 style={pageTitle}>Voice of Prophecy</h1>
            <p style={{ fontSize:11, color:'rgba(201,169,110,0.6)', fontFamily:"'EB Garamond',Georgia,serif" }}>
              Your active voice sessions
            </p>
          </div>
        </div>
      </div>

      {/* Tool list */}
      <div style={{ padding:'16px 16px 0' }}>
        {tools.map(tool => {
          const dc = DOMAIN_ACCENT[TOOL_DOMAIN[tool.id] ?? 'all'] ?? '#c9a96e'
          return (
            <ToolRow
              key={tool.id}
              tool={tool}
              accent={dc}
              onClick={() => router.push(`/domain/voice-of-prophecy/${tool.id}`)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ToolRow({ tool, accent, onClick }: { tool: any; accent: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:14, width:'100%',
        padding:'14px 16px', borderRadius:16, marginBottom:8,
        background: hov ? `${accent}0e` : 'rgba(255,255,255,0.022)',
        border:`1px solid ${hov ? `${accent}30` : 'rgba(255,255,255,0.06)'}`,
        cursor:'pointer', textAlign:'left', transition:'all 0.15s',
      }}
    >
      <div style={orbStyle(accent, 46)}>{tool.emoji}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
          <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:15, fontWeight:400, color:'rgba(239,230,214,0.88)' }}>
            {tool.name}
          </p>
          {tool.isBestSeller && <Badge label="Best Seller" accent={accent} />}
          {tool.isNew && !tool.isBestSeller && <Badge label="New" accent="#a48ac4" />}
        </div>
        <p style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:11, color:'rgba(106,96,86,0.75)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {tool.tagline}
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
          {tool.sessionDurationMinutes && (
            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
              <Clock style={{ width:9, height:9, color:'rgba(106,96,86,0.5)' }} />
              <span style={{ fontSize:9, color:'rgba(106,96,86,0.55)' }}>
                {tool.id === 'oracle-voice-unlimited' ? 'Unlimited' : `${tool.sessionDurationMinutes} min`}
              </span>
            </span>
          )}
          {tool.rating && (
            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
              <Star style={{ width:9, height:9, color:accent, fill:accent }} />
              <span style={{ fontSize:9, color:'rgba(106,96,86,0.55)' }}>{tool.rating}</span>
            </span>
          )}
          <span style={{ fontSize:9, color:`${accent}80`, fontFamily:"'Cormorant SC',Georgia,serif", letterSpacing:'0.04em' }}>
            ${tool.price}/mo
          </span>
        </div>
      </div>
      <ChevronRight style={{ width:16, height:16, color: hov ? accent : 'rgba(106,96,86,0.3)', flexShrink:0, transition:'color 0.15s' }} />
    </button>
  )
}

function Badge({ label, accent }: { label:string; accent:string }) {
  return (
    <span style={{
      fontSize:8, padding:'1px 6px', borderRadius:999,
      background:`${accent}18`, color:accent,
      fontFamily:"'Cormorant SC',Georgia,serif",
      letterSpacing:'0.08em', textTransform:'uppercase' as const,
    }}>
      {label}
    </span>
  )
}

// Shared styles
const centreStyle: React.CSSProperties = {
  minHeight:'100vh', background:'#0d0b0f',
  display:'flex', flexDirection:'column',
  alignItems:'center', justifyContent:'center',
  fontFamily:"'EB Garamond',Georgia,serif", gap:12,
}
const mutedText: React.CSSProperties = {
  fontSize:13, color:'rgba(106,96,86,0.6)',
  fontFamily:"'EB Garamond',Georgia,serif",
}
const backBtn: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:5,
  fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
  color:'rgba(106,96,86,0.5)', fontFamily:"'Cormorant SC',Georgia,serif",
  background:'none', border:'none', cursor:'pointer', padding:0,
}
const pageTitle: React.CSSProperties = {
  fontFamily:"'Cormorant Garamond',Georgia,serif",
  fontSize:22, fontWeight:400, color:'rgba(239,230,214,0.88)', lineHeight:1.2,
}
function orbStyle(accent: string, size: number): React.CSSProperties {
  return {
    width:size, height:size, borderRadius:'50%',
    background:`${accent}12`, border:`1px solid ${accent}22`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize: size > 40 ? 20 : 22, flexShrink:0,
  }
}
function btnStyle(accent: string): React.CSSProperties {
  return {
    padding:'10px 24px', borderRadius:12,
    background:`${accent}10`, border:`1px solid ${accent}20`,
    color:`${accent}cc`, cursor:'pointer',
    fontFamily:"'Cormorant SC',Georgia,serif",
    fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase' as const,
  }
}
