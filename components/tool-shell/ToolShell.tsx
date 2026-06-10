'use client'

/**
 * components/tool-shell/ToolShell.tsx  — v3
 * ==========================================
 * Domain backgrounds — each domain gets its own atmospheric canvas:
 *
 *   Dark mode:
 *     - Deep mineral base (domain-temperature shifted)
 *     - Layered radial glow from centre — domain accent colour
 *     - Sacred geometry: rings + radial lines + domain symbol
 *       love      → vesica piscis (two overlapping circles)
 *       wealth    → fibonacci spiral arcs
 *       spiritual → star of david
 *       purpose   → compass rose
 *       grief     → crescent arc
 *       health    → caduceus circles
 *       timing    → sun wheel
 *       all/voice → concentric mandala
 *     - Twinkling stars in upper field
 *     - Floating particles in domain accent colour
 *     - Bottom vignette — depth and focus
 *     - Corner edge darkening — frames the content
 *
 *   Light mode:
 *     - Warm parchment base (domain-temperature shifted)
 *     - Soft domain-colour radial warmth from above
 *     - Same sacred geometry, lower opacity
 *     - Top brightness — sunrise light
 *     - Particles at reduced opacity
 *
 * The canvas is always behind content.
 * Everything else (panel, top bar, bubbles) is frosted glass over it.
 */

import {
  useState, useEffect, useRef,
  useCallback, createContext, useContext,
} from 'react'
import { useRouter }    from 'next/navigation'
import { useAuth }      from '@/lib/hooks/useAuth'
import { useThemeMode } from '@/lib/hooks/useThemeMode'
import {
  getDomainAccent,
  TOOL_DOMAIN_MAP,
} from '@/lib/hooks/useDomainTheme'
import {
  Plus, Home, User, Bookmark,
  MessageSquare, Menu, X,
  Sun, Moon, ChevronLeft,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
export interface ToolShellCtx {
  toolId:          string
  toolName:        string
  toolEmoji:       string
  domain:          string
  accent:          string
  sessionId:       string | null
  setSessionId:    (id: string) => void
  panelOpen:       boolean
  setPanelOpen:    (v: boolean) => void
  turnCount:       number
  setTurnCount:    (fn: (c: number) => number) => void
  ambientState:    AmbientState
  setAmbientState: (s: AmbientState) => void
  loadedHistory:   HistoryTurn[]
  setLoadedHistory:(h: HistoryTurn[]) => void
  isDark:          boolean
}

export type AmbientState = 'idle'|'listening'|'thinking'|'speaking'|'typing'
export interface HistoryTurn { role:'user'|'assistant'; content:string }

const Ctx = createContext<ToolShellCtx | null>(null)
export function useToolShell(): ToolShellCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToolShell must be inside ToolShell')
  return c
}

export interface ToolMeta {
  id:string; name:string; emoji:string; tagline:string;
  domain:string; type:'chat'|'voice'; price:number;
}

interface Session {
  session_id:string; last_message:string;
  message_count:number; updated_at:string;
}

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

function ago(ts:string):string {
  const m=Math.floor((Date.now()-new Date(ts).getTime())/60000)
  if(m<1) return 'now'; if(m<60) return `${m}m`
  const h=Math.floor(m/60); if(h<24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

// ─────────────────────────────────────────────────────────────
// Domain config
// ─────────────────────────────────────────────────────────────
const DOMAIN_CFG: Record<string,{darkBg:string;lightBg:string;accent:[number,number,number]}> = {
  love:     { darkBg:'#110a09', lightBg:'#f8ede8', accent:[212,133,106] },
  wealth:   { darkBg:'#0f0c07', lightBg:'#f7f0e0', accent:[201,169,110] },
  spiritual:{ darkBg:'#09080f', lightBg:'#ede8f8', accent:[164,138,196] },
  health:   { darkBg:'#090f0a', lightBg:'#e8f5ec', accent:[122,170,138] },
  purpose:  { darkBg:'#08090f', lightBg:'#e8ecf7', accent:[122,154,196] },
  grief:    { darkBg:'#0a0b0e', lightBg:'#eaecf4', accent:[138,154,170] },
  timing:   { darkBg:'#0a0f09', lightBg:'#ebf4e8', accent:[160,196,154] },
  all:      { darkBg:'#0d0b0f', lightBg:'#f5f0e8', accent:[201,169,110] },
  voice:    { darkBg:'#0f0c07', lightBg:'#f7f0e0', accent:[201,169,110] },
}

function getDomainCfg(domain:string) {
  return DOMAIN_CFG[domain] ?? DOMAIN_CFG['all']
}

// ─────────────────────────────────────────────────────────────
// Domain background canvas
// ─────────────────────────────────────────────────────────────
interface DomainCanvasProps {
  domain:    string
  state:     AmbientState
  isDark:    boolean
}

function DomainCanvas({ domain, state, isDark }: DomainCanvasProps) {
  const ref    = useRef<HTMLCanvasElement>(null)
  const frameR = useRef(0)
  const dataR  = useRef<{
    pts:  Array<{x:number;y:number;vx:number;vy:number;r:number;op:number;ph:number;spd:number}>
    stars:Array<{x:number;y:number;r:number;op:number;tw:number;ph:number}>
    t:    number
  } | null>(null)

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cfg = getDomainCfg(domain)
    const [ar,ag,ab] = cfg.accent

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || 400
      canvas.height = canvas.offsetHeight || 900
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    // Init particle data once
    if (!dataR.current) {
      dataR.current = {
        pts: Array.from({length:65}, () => ({
          x:  Math.random() * 1200,
          y:  Math.random() * 900,
          vx: (Math.random() - .5) * .38,
          vy: (Math.random() - .5) * .38,
          r:  Math.random() * 1.5 + .3,
          op: Math.random() * .32 + .05,
          ph: Math.random() * Math.PI * 2,
          spd:Math.random() * .016 + .004,
        })),
        stars: Array.from({length:40}, () => ({
          x:  Math.random() * 1200,
          y:  Math.random() * 500,
          r:  Math.random() * .9 + .2,
          op: Math.random() * .55 + .1,
          tw: Math.random() * .018 + .004,
          ph: Math.random() * Math.PI * 2,
        })),
        t: 0,
      }
    }

    const speedMult = () =>
      state === 'speaking'  ? 3.0 :
      state === 'listening' ? 2.2 :
      state === 'thinking'  ? 1.6 :
      state === 'typing'    ? 1.3 : .75

    const draw = () => {
      frameR.current = requestAnimationFrame(draw)
      const d = dataR.current!
      const W = canvas.width, H = canvas.height
      const cx = W * .5
      const cy = isDark ? H * .36 : H * .38
      const sm = speedMult()
      d.t += .007 * sm

      ctx.clearRect(0, 0, W, H)

      // 1. Base colour
      ctx.fillStyle = isDark ? cfg.darkBg : cfg.lightBg
      ctx.fillRect(0, 0, W, H)

      // 2. Atmospheric radial glow — outer haze
      const glowIntensity =
        state === 'speaking'  ? (isDark ? .22 : .14) :
        state === 'listening' ? (isDark ? .17 : .10) :
        state === 'thinking'  ? (isDark ? .15 : .09) :
        (isDark ? .10 : .07)

      const glowSize = state === 'speaking' ? W*.95 : state === 'listening' ? W*.85 : W*.75

      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
      g1.addColorStop(0,   `rgba(${ar},${ag},${ab},${glowIntensity * 1.8})`)
      g1.addColorStop(.35, `rgba(${ar},${ag},${ab},${glowIntensity})`)
      g1.addColorStop(.7,  `rgba(${ar},${ag},${ab},${glowIntensity * .3})`)
      g1.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)

      if (isDark) {
        // 3a. Inner bright core — speaking pulses
        const coreIntensity = .14 + (state === 'speaking' ? Math.sin(d.t * 3) * .08 : 0)
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * .32)
        g2.addColorStop(0,   `rgba(${ar},${ag},${ab},${coreIntensity})`)
        g2.addColorStop(.6,  `rgba(${ar},${ag},${ab},0)`)
        ctx.fillStyle = g2
        ctx.fillRect(0, 0, W, H)

        // 3b. Bottom depth vignette
        const g3 = ctx.createLinearGradient(0, H * .5, 0, H)
        g3.addColorStop(0, 'rgba(0,0,0,0)')
        g3.addColorStop(1, 'rgba(0,0,0,0.62)')
        ctx.fillStyle = g3
        ctx.fillRect(0, 0, W, H)

        // 3c. Edge darkening
        const g4 = ctx.createRadialGradient(cx, H*.5, 0, cx, H*.5, W*.72)
        g4.addColorStop(.55, 'rgba(0,0,0,0)')
        g4.addColorStop(1,   'rgba(0,0,0,0.42)')
        ctx.fillStyle = g4
        ctx.fillRect(0, 0, W, H)
      } else {
        // Light mode: top brightness — sunrise warmth
        const g2 = ctx.createLinearGradient(0, 0, 0, H * .45)
        g2.addColorStop(0,   'rgba(255,255,255,0.42)')
        g2.addColorStop(1,   'rgba(255,255,255,0)')
        ctx.fillStyle = g2
        ctx.fillRect(0, 0, W, H)
      }

      const baseOpacity = isDark ? 1 : .55

      // 4. Sacred geometry — concentric rings
      const rings = [W*.14, W*.26, W*.38, W*.52, W*.68]
      rings.forEach((r, i) => {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(.07 - i * .012) * baseOpacity})`
        ctx.lineWidth = .5
        ctx.stroke()
      })

      // 5. Sacred geometry — radial spokes
      const spokeCount = 12
      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2
        const innerR = W * .06, outerR = W * .68
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${.04 * baseOpacity})`
        ctx.lineWidth = .4
        ctx.stroke()
      }

      // 6. Domain symbol — slowly rotates
      const rot = d.t * .08
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)

      const symOp = (.12 - (state === 'speaking' ? .04 : 0)) * baseOpacity
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},${symOp})`
      ctx.lineWidth = .6

      if (domain === 'love') {
        // Vesica piscis
        const r2 = W * .14
        ctx.beginPath(); ctx.arc(-r2*.48, 0, r2, 0, Math.PI*2); ctx.stroke()
        ctx.beginPath(); ctx.arc( r2*.48, 0, r2, 0, Math.PI*2); ctx.stroke()

      } else if (domain === 'wealth') {
        // Fibonacci spiral — arcs
        const sizes = [W*.03,W*.05,W*.08,W*.13,W*.21,W*.34]
        let ox=0,oy=0
        sizes.forEach((r2, i) => {
          ctx.beginPath()
          ctx.arc(ox, oy, r2, (i%4)*(Math.PI*.5), ((i%4)+1)*(Math.PI*.5))
          ctx.stroke()
          const a = ((i%4)+1)*(Math.PI*.5)
          ox += Math.cos(a)*r2; oy += Math.sin(a)*r2
        })

      } else if (domain === 'spiritual') {
        // Star of David — two interlocking triangles
        const R = W * .15
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath()
          for (let i = 0; i < 3; i++) {
            const a = (i/3)*Math.PI*2 + (pass ? Math.PI : 0)
            const x = Math.cos(a)*R, y = Math.sin(a)*R
            i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
          }
          ctx.closePath(); ctx.stroke()
        }

      } else if (domain === 'health') {
        // Caduceus circles — two interweaving loops
        const R = W * .1
        for (let i = 0; i < 4; i++) {
          const a = (i/4)*Math.PI*2
          ctx.beginPath()
          ctx.arc(Math.cos(a)*R*.6, Math.sin(a)*R*.6, R*.55, 0, Math.PI*2)
          ctx.stroke()
        }

      } else if (domain === 'purpose') {
        // Compass rose — 8 directional spokes with circles at tips
        const R = W * .15
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(a)*R, Math.sin(a)*R)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(Math.cos(a)*R, Math.sin(a)*R, W*.02, 0, Math.PI*2)
          ctx.stroke()
        }

      } else if (domain === 'grief') {
        // Crescent — two offset circles
        const R = W * .13
        ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI*.65, Math.PI*.65); ctx.stroke()
        ctx.beginPath(); ctx.arc(R*.38, 0, R*.8, Math.PI*.4, Math.PI*1.6); ctx.stroke()

      } else if (domain === 'timing') {
        // Sun wheel — 8 rays with outer ring
        const R = W * .14, innerR = W * .05
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2); ctx.stroke()
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2
          ctx.beginPath()
          ctx.moveTo(Math.cos(a)*innerR, Math.sin(a)*innerR)
          ctx.lineTo(Math.cos(a)*R, Math.sin(a)*R)
          ctx.stroke()
        }

      } else {
        // All/voice — concentric mandala with 6-fold symmetry
        const R = W * .13
        for (let i = 0; i < 6; i++) {
          const a = (i/6)*Math.PI*2
          ctx.beginPath()
          ctx.arc(Math.cos(a)*R*.55, Math.sin(a)*R*.55, R*.5, 0, Math.PI*2)
          ctx.stroke()
        }
      }

      ctx.restore()

      // 7. Twinkling stars — dark mode only
      if (isDark) {
        d.stars.forEach(s => {
          s.ph += s.tw * sm
          const alpha = s.op * (.45 + .55*Math.sin(s.ph))
          ctx.beginPath(); ctx.arc(s.x % W, s.y % H, s.r, 0, Math.PI*2)
          ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill()
        })
      }

      // 8. Floating particles — react to state
      const opMult = isDark ? 1 : .5
      d.pts.forEach(p => {
        p.ph += p.spd * sm
        p.x += p.vx * sm; p.y += p.vy * sm
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const alpha = p.op * (.4 + .6*Math.sin(p.ph)) * opMult * (state==='speaking'?1.4:1)
        const r2    = p.r * (state === 'speaking' ? 1.5 : 1)
        ctx.beginPath(); ctx.arc(p.x, p.y, r2, 0, Math.PI*2)
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`; ctx.fill()
      })

      // 9. Connecting lines — only when active
      if (state !== 'idle') {
        const thresh = state === 'speaking' ? 88 : 68
        for (let i = 0; i < d.pts.length; i++) {
          for (let j = i + 1; j < d.pts.length; j++) {
            const p = d.pts[i], q = d.pts[j]
            const dx = p.x - q.x, dy = p.y - q.y
            const dist = Math.sqrt(dx*dx + dy*dy)
            if (dist < thresh) {
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
              ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(.03*(1-dist/thresh)*sm*opMult).toFixed(3)})`
              ctx.lineWidth = .4; ctx.stroke()
            }
          }
        }
      }
    }

    draw()
    return () => { cancelAnimationFrame(frameR.current); ro.disconnect() }
  }, [domain, state, isDark])

  return (
    <canvas
      ref={ref}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────
function Panel({
  tool, accent, sessions, activeId, savedCount,
  onNew, onSelect, onNav, onClose, isDark, onThemeToggle,
}: {
  tool:ToolMeta; accent:string; sessions:Session[]; activeId:string|null;
  savedCount:number; onNew:()=>void; onSelect:(id:string)=>void;
  onNav:(href:string)=>void; onClose:()=>void; isDark:boolean; onThemeToggle:()=>void;
}) {
  const today = sessions.filter(s => Date.now() - new Date(s.updated_at).getTime() < 86400000)
  const older = sessions.filter(s => Date.now() - new Date(s.updated_at).getTime() >= 86400000)
  const d = (l:string,dk:string) => isDark ? dk : l

  return (
    <div style={{
      width:'240px', height:'100%', display:'flex', flexDirection:'column',
      background:     d('rgba(245,240,232,0.9)','rgba(13,11,15,0.88)'),
      backdropFilter: 'blur(32px)', WebkitBackdropFilter:'blur(32px)',
      borderRight:    `1px solid ${d('rgba(0,0,0,0.1)',`${accent}18`)}`,
    }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'18px 14px 14px', borderBottom:`1px solid ${d('rgba(0,0,0,0.08)',`${accent}14`)}`, flexShrink:0 }}>
        <div style={{ width:46,height:46,borderRadius:'50%',background:`${accent}14`,border:`1.5px solid ${accent}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0 }}>
          {tool.emoji}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:'14px',fontWeight:600,fontFamily:"'Cormorant Garamond',Georgia,serif",color:d('rgba(30,22,12,0.9)','rgba(239,230,214,0.92)'),overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>
            {tool.name}
          </p>
          <p style={{ fontSize:'11px',color:`${accent}99`,marginTop:'2px' }}>
            {tool.type==='voice'?'Voice Oracle':'Sacred Scribe'}
          </p>
        </div>
        <button onClick={onClose} style={{ width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:d('rgba(0,0,0,0.06)','rgba(255,255,255,0.06)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.1)')}`,cursor:'pointer',flexShrink:0 }}>
          <ChevronLeft style={{ width:12,height:12,color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.4)') }}/>
        </button>
      </div>

      {/* New session */}
      <div style={{ padding:'12px 12px 6px', flexShrink:0 }}>
        <button onClick={onNew}
          style={{ display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'10px 14px',borderRadius:'14px',background:`${accent}14`,border:`1px solid ${accent}28`,cursor:'pointer',transition:'all 0.15s',fontFamily:"'Cormorant Garamond',Georgia,serif" }}
          onMouseEnter={e=>(e.currentTarget.style.background=`${accent}22`)}
          onMouseLeave={e=>(e.currentTarget.style.background=`${accent}14`)}>
          <Plus style={{ width:15,height:15,color:accent,flexShrink:0 }}/>
          <span style={{ fontSize:'14px',color:accent,fontWeight:500 }}>
            {tool.type==='voice'?'New Session':'New Chat'}
          </span>
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex:1,overflowY:'auto',padding:'4px 10px',scrollbarWidth:'thin',scrollbarColor:`${accent}18 transparent` }}>
        {sessions.length > 0 && (
          <>
            <p style={{ fontSize:'10px',letterSpacing:'0.08em',textTransform:'uppercase',color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.22)'),padding:'8px 4px 4px' }}>Recent</p>
            {today.length > 0 && <p style={{ fontSize:'11px',color:d('rgba(0,0,0,0.25)','rgba(255,255,255,0.2)'),padding:'2px 4px 3px' }}>Today</p>}
            {today.map(s => <SessionRow key={s.session_id} session={s} active={activeId===s.session_id} accent={accent} isDark={isDark} onClick={()=>onSelect(s.session_id)}/>)}
            {older.length > 0 && today.length > 0 && <p style={{ fontSize:'11px',color:d('rgba(0,0,0,0.22)','rgba(255,255,255,0.18)'),padding:'8px 4px 3px' }}>Earlier</p>}
            {older.slice(0,8).map(s => <SessionRow key={s.session_id} session={s} active={activeId===s.session_id} accent={accent} isDark={isDark} onClick={()=>onSelect(s.session_id)}/>)}
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ height:1,margin:'0 14px',background:d('rgba(0,0,0,0.08)',`${accent}12`),flexShrink:0 }}/>

      {/* Nav */}
      <div style={{ padding:'8px 10px', flexShrink:0 }}>
        {[
          { icon:Bookmark, label:savedCount>0?`Saved (${savedCount})`:'Saved', href:'/saved' },
          { icon:Home,     label:'Dashboard', href:'/member/dashboard' },
          { icon:User,     label:'Profile',   href:'/profile' },
        ].map(item => (
          <button key={item.href} onClick={()=>onNav(item.href)}
            style={{ display:'flex',alignItems:'center',gap:'10px',width:'100%',padding:'9px 10px',borderRadius:'12px',background:'transparent',border:'none',cursor:'pointer',transition:'background 0.12s',marginBottom:'2px' }}
            onMouseEnter={e=>(e.currentTarget.style.background=d('rgba(0,0,0,0.06)','rgba(255,255,255,0.06)'))}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <item.icon style={{ width:15,height:15,color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.38)'),flexShrink:0 }}/>
            <span style={{ fontSize:'14px',color:d('rgba(30,22,12,0.65)','rgba(180,168,152,0.72)'),fontFamily:"'EB Garamond',Georgia,serif" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <div style={{ padding:'6px 12px 16px', flexShrink:0 }}>
        <button onClick={onThemeToggle}
          style={{ display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',borderRadius:'12px',width:'100%',background:d('rgba(0,0,0,0.05)','rgba(255,255,255,0.05)'),border:`1px solid ${d('rgba(0,0,0,0.08)','rgba(255,255,255,0.08)')}`,cursor:'pointer',transition:'all 0.15s' }}>
          {isDark?<Sun style={{width:14,height:14,color:'rgba(201,169,110,0.75)'}}/>:<Moon style={{width:14,height:14,color:'rgba(138,96,48,0.75)'}}/>}
          <span style={{ fontSize:'13px',color:d('rgba(30,22,12,0.55)','rgba(180,168,152,0.65)') }}>
            {isDark?'Light mode':'Dark mode'}
          </span>
        </button>
      </div>
    </div>
  )
}

function SessionRow({ session, active, accent, isDark, onClick }: {
  session:Session; active:boolean; accent:string; isDark:boolean; onClick:()=>void
}) {
  const [hov, setHov] = useState(false)
  const d = (l:string,dk:string) => isDark?dk:l
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex',alignItems:'center',gap:'8px',width:'100%',padding:'7px 8px',borderRadius:'10px',marginBottom:'2px',background:active?`${accent}14`:hov?d('rgba(0,0,0,0.05)','rgba(255,255,255,0.05)'):'transparent',border:`1px solid ${active?`${accent}24`:'transparent'}`,borderLeft:`2px solid ${active?accent:'transparent'}`,paddingLeft:active?'6px':'8px',cursor:'pointer',textAlign:'left',transition:'all 0.1s' }}>
      <MessageSquare style={{ width:11,height:11,color:active?accent:d('rgba(0,0,0,0.25)','rgba(255,255,255,0.22)'),flexShrink:0 }}/>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ fontSize:'12px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',lineHeight:1.3,color:active?d('rgba(30,22,12,0.88)','rgba(239,230,214,0.88)'):d('rgba(30,22,12,0.5)','rgba(180,168,152,0.55)') }}>
          {session.last_message.slice(0,32)||'New session'}{session.last_message.length>32?'…':''}
        </p>
        <p style={{ fontSize:'10px',color:d('rgba(0,0,0,0.25)','rgba(255,255,255,0.2)'),marginTop:'1px' }}>
          {ago(session.updated_at)} · {session.message_count}
        </p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// ToolShell — main export
// ─────────────────────────────────────────────────────────────
interface Props {
  tool:ToolMeta; children:React.ReactNode; isVoice?:boolean;
  onSessionChange?:(id:string,history:HistoryTurn[])=>void; onNewSession?:()=>void;
}

export default function ToolShell({ tool, children, isVoice=false, onSessionChange, onNewSession }: Props) {
  const router           = useRouter()
  const { user }         = useAuth()
  const { isDark, toggle } = useThemeMode()

  const domain = (TOOL_DOMAIN_MAP[tool.id] ?? 'all') as string
  const accent = getDomainAccent(domain)

  const [panelOpen,     setPanelOpen]     = useState(true)
  const [isMobile,      setIsMobile]      = useState(false)
  const [sessions,      setSessions]      = useState<Session[]>([])
  const [sessionId,     setSessionId]     = useState<string|null>(null)
  const [savedCount,    setSavedCount]    = useState(0)
  const [ambientState,  setAmbientState]  = useState<AmbientState>('idle')
  const [turnCount,     setTurnCount]     = useState(0)
  const [loadedHistory, setLoadedHistory] = useState<HistoryTurn[]>([])
  const [mounted,       setMounted]       = useState(false)

  useEffect(() => {
    const check = () => { const m=window.innerWidth<768; setIsMobile(m); if(m) setPanelOpen(false) }
    check(); window.addEventListener('resize',check); return()=>window.removeEventListener('resize',check)
  },[])

  useEffect(() => { setTimeout(()=>setMounted(true),80) },[])

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const res=await fetch(`${API}/user/${user.id}/conversations`); if(!res.ok) return
        const data=await res.json()
        const map: Record<string,any>={}
        for (const msg of (data.conversations??[])) {
          const sid=msg.session_id; if(!sid||(msg.tool_id&&msg.tool_id!==tool.id)) continue
          if(!map[sid]) map[sid]={session_id:sid,last_message:msg.content??'',message_count:1,updated_at:msg.timestamp??new Date().toISOString()}
          else { map[sid].message_count++; if(msg.timestamp>map[sid].updated_at){map[sid].updated_at=msg.timestamp;map[sid].last_message=msg.content??''} }
        }
        const list=(Object.values(map) as Session[]).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,20)
        setSessions(list); if(list.length>0&&!sessionId) setSessionId(list[0].session_id)
      } catch {/**/}
    }
    load()
  },[user?.id,tool.id,turnCount])

  useEffect(() => {
    try {
      const saved=JSON.parse(localStorage.getItem('kayal_saved_insights')??'[]')
      setSavedCount(saved.filter((x:any)=>x.source_tool===tool.name).length)
    } catch {/**/}
  },[tool.name,turnCount])

  const handleNew=useCallback(()=>{
    setSessionId(crypto.randomUUID()); setLoadedHistory([])
    onNewSession?.(); if(isMobile) setPanelOpen(false)
  },[isMobile,onNewSession])

  const handleSelect=useCallback(async(sid:string)=>{
    setSessionId(sid); if(isMobile) setPanelOpen(false)
    if(onSessionChange&&user?.id){
      try{
        const res=await fetch(`${API}/user/${user.id}/conversations?session_id=${sid}`)
        if(res.ok){const data=await res.json();const hist=(data.conversations??[]).map((c:any)=>({role:c.role==='user'?'user':'assistant',content:c.content??''}));setLoadedHistory(hist);onSessionChange(sid,hist)}
      }catch{/**/}
    }
  },[isMobile,onSessionChange,user?.id])

  const handleNav=useCallback((href:string)=>{
    if(isVoice&&['listening','speaking','thinking'].includes(ambientState)){if(!window.confirm('End voice session and navigate away?'))return}
    router.push(href)
  },[router,isVoice,ambientState])

  const ctx: ToolShellCtx = {
    toolId:tool.id,toolName:tool.name,toolEmoji:tool.emoji,domain,accent,
    sessionId,setSessionId,panelOpen,setPanelOpen,
    turnCount,setTurnCount,ambientState,setAmbientState,
    loadedHistory,setLoadedHistory,isDark,
  }

  const d = (l:string,dk:string) => isDark?dk:l

  const dotColour =
    ambientState==='speaking' ?accent:ambientState==='thinking'?'#8b7cc8':
    ambientState==='listening'?'#4a9b8e':ambientState==='typing'?accent:
    d('rgba(0,0,0,0.2)','rgba(255,255,255,0.2)')

  const stateLabel =
    ambientState==='idle'?'Ready':ambientState==='listening'?'Listening…':
    ambientState==='thinking'?'Thinking…':ambientState==='speaking'?'Speaking':
    ambientState==='typing'?'Typing…':'Ready'

  return (
    <Ctx.Provider value={ctx}>
      <div style={{
        height:'100dvh', display:'flex', overflow:'hidden',
        background: isDark ? getDomainCfg(domain).darkBg : getDomainCfg(domain).lightBg,
        fontFamily:"'EB Garamond',Georgia,serif",
        opacity: mounted ? 1 : 0,
        transition:'opacity 0.3s ease',
        position:'relative',
      }}>

        {/* ── Domain background canvas ── */}
        <div style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }}>
          <DomainCanvas domain={domain} state={ambientState} isDark={isDark}/>
        </div>

        {/* ── Mobile overlay ── */}
        {isMobile&&panelOpen&&(
          <div onClick={()=>setPanelOpen(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:40,backdropFilter:'blur(4px)' }}/>
        )}

        {/* ── Panel ── */}
        <div style={{
          position:   isMobile?'fixed':'relative',
          left:0,top:0,bottom:0,
          zIndex:     isMobile?50:'auto',
          width:      panelOpen?'240px':'0px',
          overflow:   'hidden',
          transition: 'width 0.25s ease',
          flexShrink: 0,
        }}>
          {panelOpen&&(
            <Panel tool={tool} accent={accent} sessions={sessions} activeId={sessionId}
              savedCount={savedCount} onNew={handleNew} onSelect={handleSelect}
              onNav={handleNav} onClose={()=>setPanelOpen(false)}
              isDark={isDark} onThemeToggle={toggle}/>
          )}
        </div>

        {/* ── Main content ── */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0,position:'relative',zIndex:1 }}>

          {/* Top bar — frosted glass */}
          <div style={{
            display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',
            background:   d('rgba(245,240,232,0.6)','rgba(13,11,15,0.6)'),
            backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            borderBottom: `1px solid ${d('rgba(0,0,0,0.08)',`${accent}14`)}`,
            flexShrink:0,
          }}>

            {/* Panel toggle */}
            <button onClick={()=>setPanelOpen(p=>!p)}
              style={{ width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:`${accent}14`,border:`1.5px solid ${accent}28`,cursor:'pointer',flexShrink:0,transition:'all 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background=`${accent}22`)}
              onMouseLeave={e=>(e.currentTarget.style.background=`${accent}14`)}>
              {panelOpen?<X style={{width:14,height:14,color:accent}}/>:<Menu style={{width:14,height:14,color:accent}}/>}
            </button>

            {/* Tool name + state */}
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:'16px',fontWeight:600,fontFamily:"'Cormorant Garamond',Georgia,serif",color:d('rgba(30,22,12,0.9)','rgba(239,230,214,0.92)'),overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>
                {tool.name}
              </p>
              <div style={{ display:'flex',alignItems:'center',gap:'6px',marginTop:'2px' }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:dotColour,boxShadow:ambientState!=='idle'?`0 0 6px ${dotColour}`:'none',transition:'all 0.4s',flexShrink:0 }}/>
                <span style={{ fontSize:'11px',letterSpacing:'0.04em',color:d('rgba(0,0,0,0.35)','rgba(255,255,255,0.3)') }}>{stateLabel}</span>
              </div>
            </div>

            {/* New session */}
            <button onClick={handleNew} title={tool.type==='voice'?'New session':'New chat'}
              style={{ width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:d('rgba(0,0,0,0.06)','rgba(255,255,255,0.06)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.1)')}`,cursor:'pointer',flexShrink:0,transition:'all 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background=`${accent}14`)}
              onMouseLeave={e=>(e.currentTarget.style.background=d('rgba(0,0,0,0.06)','rgba(255,255,255,0.06)'))}>
              <Plus style={{ width:14,height:14,color:d('rgba(0,0,0,0.45)','rgba(255,255,255,0.45)') }}/>
            </button>

            {/* Theme toggle */}
            <button onClick={toggle} title={isDark?'Light mode':'Dark mode'}
              style={{ width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:d('rgba(0,0,0,0.06)','rgba(255,255,255,0.06)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.1)')}`,cursor:'pointer',flexShrink:0 }}>
              {isDark?<Sun style={{width:14,height:14,color:'rgba(201,169,110,0.7)'}}/>:<Moon style={{width:14,height:14,color:'rgba(138,96,48,0.7)'}}/>}
            </button>
          </div>

          {/* Session content */}
          <div style={{ flex:1,overflow:'hidden',position:'relative' }}>
            {children}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  )
}

export { type ToolMeta, type HistoryTurn, type AmbientState }
