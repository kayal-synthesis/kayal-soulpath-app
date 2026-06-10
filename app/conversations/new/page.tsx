'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { voiceTools } from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { ChevronRight, Clock, Star } from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

const TOOL_DOMAIN: Record<string,string> = {
  'oracle-voice-session':'all','oracle-deep-dive-session':'all',
  'love-oracle-session':'love','wealth-oracle-session':'wealth',
  'purpose-oracle-session':'purpose','daily-voice-briefing':'timing',
  'relationship-oracle-session':'love','spiritual-oracle-session':'spiritual',
  'crisis-oracle-session':'all','oracle-voice-unlimited':'all',
  'the-life-scribe':'all','love-scribe':'love','wealth-scribe':'wealth',
  'spiritual-scribe':'spiritual','health-scribe':'health','purpose-scribe':'purpose',
  'relationship-scribe':'love','grief-scribe':'grief','parenting-scribe':'all','business-scribe':'wealth',
}
const ACCENT: Record<string,string> = {
  love:'#d4856a',wealth:'#c9a96e',spiritual:'#a48ac4',
  health:'#7aaa8a',purpose:'#7a9ac4',timing:'#a0c49a',grief:'#8a9aaa',all:'#c9a96e',
}
function ac(id:string){ return ACCENT[TOOL_DOMAIN[id]??'all']??'#c9a96e' }

async function checkSub(userId:string, toolId:string): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/api/subscription/tier?user_id=${userId}&tool_id=${toolId}`)
    if (!r.ok) return false
    return (await r.json()).active === true
  } catch { return false }
}

function ToolCard({ tool, route }: { tool:any; route:string }) {
  const router = useRouter()
  const [hov, setHov] = useState(false)
  const a = ac(tool.id)
  return (
    <button
      onClick={() => router.push(route)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex',alignItems:'center',gap:14,width:'100%',
        padding:'14px 16px',borderRadius:16,marginBottom:8,
        background:hov?`${a}0e`:'rgba(255,255,255,0.022)',
        border:`1px solid ${hov?`${a}30`:'rgba(255,255,255,0.06)'}`,
        cursor:'pointer',textAlign:'left',transition:'all 0.15s',
      }}
    >
      <div style={{width:46,height:46,borderRadius:'50%',background:`${a}12`,border:`1px solid ${a}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
        {tool.emoji}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:15,fontWeight:400,color:'rgba(239,230,214,0.88)'}}>
            {tool.name}
          </p>
          {tool.isBestSeller&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:999,background:`${a}18`,color:a,fontFamily:"'Cormorant SC',Georgia,serif",letterSpacing:'0.08em',textTransform:'uppercase'}}>Best Seller</span>}
          {tool.isNew&&!tool.isBestSeller&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:999,background:'rgba(164,138,196,0.14)',color:'#a48ac4',fontFamily:"'Cormorant SC',Georgia,serif",letterSpacing:'0.08em',textTransform:'uppercase'}}>New</span>}
        </div>
        <p style={{fontFamily:"'EB Garamond',Georgia,serif",fontSize:11,color:'rgba(106,96,86,0.75)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          {tool.tagline}
        </p>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
          {tool.sessionDurationMinutes&&<span style={{display:'flex',alignItems:'center',gap:3}}><Clock style={{width:9,height:9,color:'rgba(106,96,86,0.5)'}}/><span style={{fontSize:9,color:'rgba(106,96,86,0.55)'}}>{tool.id==='oracle-voice-unlimited'?'Unlimited':`${tool.sessionDurationMinutes} min`}</span></span>}
          {tool.limits?.messagesPerMonth&&<span style={{fontSize:9,color:'rgba(106,96,86,0.55)'}}>{tool.limits.messagesPerMonth} msg/mo</span>}
          {tool.rating&&<span style={{display:'flex',alignItems:'center',gap:3}}><Star style={{width:9,height:9,color:a,fill:a}}/><span style={{fontSize:9,color:'rgba(106,96,86,0.55)'}}>{tool.rating}</span></span>}
          <span style={{fontSize:9,color:`${a}80`,fontFamily:"'Cormorant SC',Georgia,serif",letterSpacing:'0.04em'}}>${tool.price}/mo</span>
        </div>
      </div>
      <ChevronRight style={{width:16,height:16,color:hov?a:'rgba(106,96,86,0.3)',flexShrink:0}}/>
    </button>
  )
}

function Section({ emoji, title, subtitle, accent, children }: any) {
  return (
    <>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'24px 20px 12px'}}>
        <div style={{width:42,height:42,borderRadius:'50%',background:`${accent}12`,border:`1px solid ${accent}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{emoji}</div>
        <div>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:400,color:'rgba(239,230,214,0.88)',lineHeight:1.2}}>{title}</p>
          <p style={{fontFamily:"'EB Garamond',Georgia,serif",fontSize:11,color:`${accent}80`,marginTop:2}}>{subtitle}</p>
        </div>
      </div>
      <div style={{padding:'0 16px'}}>{children}</div>
    </>
  )
}

export default function NewConversationPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [purchasedVoice, setPurchasedVoice] = useState<typeof voiceTools>([])
  const [purchasedChat, setPurchasedChat] = useState<typeof sacredScriptTools>([])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user?.id) { setChecking(false); return }
    Promise.all([
      Promise.all(voiceTools.map(t => checkSub(user.id, t.id).then(a => ({ t, a })))),
      Promise.all(sacredScriptTools.map(t => checkSub(user.id, t.id).then(a => ({ t, a })))),
    ]).then(([v, c]) => {
      setPurchasedVoice(v.filter(r => r.a).map(r => r.t))
      setPurchasedChat(c.filter(r => r.a).map(r => r.t))
      setChecking(false)
    })
  }, [user?.id, isAuthenticated, isLoading])

  const base = { minHeight:'100vh', background:'#0d0b0f', fontFamily:"'EB Garamond',Georgia,serif" }

  if (!isLoading && !isAuthenticated) return (
    <div style={{...base,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
      <p style={{fontSize:13,color:'rgba(106,96,86,0.6)'}}>Sign in to see your sessions</p>
      <button onClick={()=>router.push('/auth/login')} style={{padding:'10px 24px',borderRadius:12,background:'rgba(201,169,110,0.1)',border:'1px solid rgba(201,169,110,0.2)',color:'rgba(201,169,110,0.8)',cursor:'pointer',fontFamily:"'Cormorant SC',Georgia,serif",fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Sign In</button>
    </div>
  )

  if (checking) return (
    <div style={{...base,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(106,96,86,0.5)',fontFamily:"'Cormorant SC',Georgia,serif"}}>Loading your tools…</p>
    </div>
  )

  if (purchasedVoice.length===0 && purchasedChat.length===0) return (
    <div style={{...base,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'40px 24px',textAlign:'center'}}>
      <div style={{fontSize:40}}>🔮</div>
      <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:400,color:'rgba(239,230,214,0.75)'}}>No active subscriptions</p>
      <p style={{fontSize:13,color:'rgba(106,96,86,0.6)',maxWidth:280,lineHeight:1.6}}>Subscribe to a tool to begin your first session.</p>
      <button onClick={()=>router.push('/home')} style={{padding:'10px 24px',borderRadius:12,background:'rgba(201,169,110,0.1)',border:'1px solid rgba(201,169,110,0.2)',color:'rgba(201,169,110,0.8)',cursor:'pointer',fontFamily:"'Cormorant SC',Georgia,serif",fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase'}}>Dashboard</button>
    </div>
  )

  return (
    <div style={{...base,paddingBottom:48}}>
      <div style={{padding:'28px 20px 4px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <h1 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,fontWeight:400,color:'rgba(239,230,214,0.88)',marginBottom:4}}>New Session</h1>
        <p style={{fontSize:12,color:'rgba(106,96,86,0.55)'}}>Your active tools</p>
      </div>

      {purchasedVoice.length>0&&(
        <Section emoji="🎙️" title="Voice of Prophecy" subtitle="Live voice sessions" accent="#c9a96e">
          {purchasedVoice.map(t=><ToolCard key={t.id} tool={t} route={`/domain/voice-of-prophecy/${t.id}`}/>)}
        </Section>
      )}

      {purchasedVoice.length>0&&purchasedChat.length>0&&(
        <div style={{margin:'16px 20px',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)'}}/>
      )}

      {purchasedChat.length>0&&(
        <Section emoji="📜" title="Sacred Script" subtitle="Text chat sessions" accent="#b8966a">
          {purchasedChat.map(t=><ToolCard key={t.id} tool={t} route={`/domain/sacred-script/${t.id}`}/>)}
        </Section>
      )}
    </div>
  )
}
