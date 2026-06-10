'use client'
// app/start/[toolId]/page.tsx
// ─── Data collection before checkout ────────────────────────
// Writes to anonymousStore (same source purchase page reads from)
// + sessionStorage for partner data (partner tools only)
// ─── Compatibility calculator for requiresPartner tools ─────

import { useState, useEffect } from 'react'
import { useRouter }            from 'next/navigation'
import { useAnonymousStore }    from '@/lib/store/anonymousStore'

// ─────────────────────────────────────────────────────────────
// Domain colours — matches sales page
// ─────────────────────────────────────────────────────────────
const DS: Record<string,{accent:string;light:string;mid:string;pill:string}> = {
  love:           {accent:'#BE185D',light:'#FDF2F8',mid:'#FCE7F3',pill:'#FCE7F3'},
  wealth:         {accent:'#15803D',light:'#F0FDF4',mid:'#DCFCE7',pill:'#DCFCE7'},
  wellness:       {accent:'#6D28D9',light:'#F5F3FF',mid:'#EDE9FE',pill:'#EDE9FE'},
  'life-path':    {accent:'#C2410C',light:'#FFF7ED',mid:'#FFEDD5',pill:'#FFEDD5'},
  'oracle-temple':{accent:'#3730A3',light:'#EEF2FF',mid:'#E0E7FF',pill:'#E0E7FF'},
  'sacred-script':{accent:'#B91C1C',light:'#FEF2F2',mid:'#FEE2E2',pill:'#FEE2E2'},
  'time-keeper':  {accent:'#0F766E',light:'#F0FDFA',mid:'#CCFBF1',pill:'#CCFBF1'},
  voice:          {accent:'#5B21B6',light:'#F5F3FF',mid:'#EDE9FE',pill:'#EDE9FE'},
}
const DD = DS['oracle-temple']

// ─────────────────────────────────────────────────────────────
// Life Path calculation
// ─────────────────────────────────────────────────────────────
function calcLifePath(dob: string): number | null {
  if (!dob || dob.length < 8) return null
  const digits = dob.replace(/-/g,'').split('').map(Number)
  if (digits.some(isNaN)) return null
  let sum = digits.reduce((a,b)=>a+b,0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').map(Number).reduce((a,b)=>a+b,0)
  }
  return sum
}

const LP_NAMES: Record<number,string> = {
  1:'The Leader',2:'The Peacemaker',3:'The Creator',4:'The Builder',
  5:'The Freedom Seeker',6:'The Nurturer',7:'The Seeker',8:'The Powerhouse',
  9:'The Humanitarian',11:'The Illuminator',22:'The Master Builder',33:'The Master Teacher',
}

// ─────────────────────────────────────────────────────────────
// Compatibility matrix
// ─────────────────────────────────────────────────────────────
function getCompatibility(lp1: number, lp2: number) {
  const a = Math.min(lp1,lp2), b = Math.max(lp1,lp2)
  const key = `${a}-${b}`
  const map: Record<string,{score:number;type:string;col:string;headline:string;body:string}> = {
    '1-1':{score:72,type:'Mirror Union',col:'#6366F1',headline:'Two leaders who must learn to follow each other',body:'Powerful chemistry and strong mutual respect. The challenge is ego. Both are wired to lead. When each learns to step back, this becomes a highly driven and accomplished partnership.'},
    '1-2':{score:81,type:'Harvest Union',col:'#15803D',headline:'The natural leader meets their greatest support',body:'One of the most harmonious combinations. The 1 provides direction and momentum; the 2 provides the emotional intelligence that turns vision into reality.'},
    '1-3':{score:78,type:'Growth Partnership',col:'#C2410C',headline:'Creative fire meets focused drive',body:'Exciting and dynamic. The 1 brings ambition; the 3 brings joy and creative magnetism. The challenge is that the 3 may not meet the 1\'s standards for consistency.'},
    '1-4':{score:65,type:'Growth Partnership',col:'#C2410C',headline:'Ambition meets foundation — friction before harmony',body:'The 1 wants to move fast; the 4 wants to build right. Frustrating in the short term but potentially one of the most productive long-term combinations when both values are respected.'},
    '1-5':{score:70,type:'Growth Partnership',col:'#C2410C',headline:'Two free spirits who challenge each other',body:'High energy, lots of movement, mutual respect for independence. Strong when both have space to operate independently.'},
    '1-6':{score:76,type:'Harvest Union',col:'#15803D',headline:'The achiever meets the heart',body:'The 1 is driven by ambition; the 6 by love and responsibility. They complement beautifully when the 1 appreciates warmth and the 6 allows the 1 their independence.'},
    '1-7':{score:68,type:'Growth Partnership',col:'#C2410C',headline:'Action meets reflection — an unlikely depth',body:'The 1 acts; the 7 thinks. Frustrating on the surface, profoundly enriching when each appreciates what the other carries.'},
    '1-8':{score:74,type:'Harvest Union',col:'#15803D',headline:'Power meets power — mutual recognition',body:'Two of the most driven numbers. High respect, high competition. This combination builds empires when their goals align.'},
    '1-9':{score:73,type:'Growth Partnership',col:'#C2410C',headline:'Personal ambition meets universal purpose',body:'The 1 is focused on achievement; the 9 on meaning. Beautiful when the 1 learns from the 9\'s perspective.'},
    '2-2':{score:79,type:'Mirror Union',col:'#6366F1',headline:'Two hearts that deeply understand each other',body:'Deep emotional attunement and genuine care. The challenge is making decisions — both avoid conflict so naturally that important conversations never happen.'},
    '2-3':{score:85,type:'Harvest Union',col:'#15803D',headline:'Joy meets depth — a genuinely happy combination',body:'The 2 provides emotional steadiness; the 3 provides lightness and warmth. One of the more naturally joyful combinations with real staying power.'},
    '2-4':{score:77,type:'Harvest Union',col:'#15803D',headline:'Security meets stability — built to last',body:'Both value loyalty and consistency. The 2 brings emotional attunement; the 4 brings practical reliability. Not flashy, genuinely strong.'},
    '2-5':{score:61,type:'Karmic Bond',col:'#BE185D',headline:'Freedom meets attachment — the central tension',body:'The 2 needs deep connection; the 5 needs freedom. There is real attraction here but also real incompatibility in core needs. Grows through honest negotiation.'},
    '2-6':{score:88,type:'Harvest Union',col:'#15803D',headline:'The most naturally harmonious combination',body:'Both are oriented toward love, care, and harmony. The 2 brings sensitivity; the 6 brings nurturing and responsibility. Consistently loving.'},
    '2-7':{score:72,type:'Growth Partnership',col:'#C2410C',headline:'The heart meets the mind',body:'The 2 leads with feeling; the 7 with thought. When the 7 lets the 2 in and the 2 respects the 7\'s need for solitude, this is a profound pairing.'},
    '2-8':{score:69,type:'Growth Partnership',col:'#C2410C',headline:'Care meets ambition — a learning curve',body:'The 2 wants emotional intimacy; the 8 wants achievement. The 8 must learn that emotional availability is not weakness.'},
    '2-9':{score:80,type:'Harvest Union',col:'#15803D',headline:'Two givers who must learn to receive',body:'Both are oriented toward others. Deep mutual understanding. The challenge is that neither naturally prioritises their own needs.'},
    '3-3':{score:74,type:'Mirror Union',col:'#6366F1',headline:'Pure creative energy — brilliant and unstable',body:'Enormous fun and genuine creative output. The risk is that neither provides the grounding the other needs.'},
    '3-4':{score:67,type:'Growth Partnership',col:'#C2410C',headline:'Spontaneity meets structure — constant negotiation',body:'The 3 wants to play; the 4 wants to plan. When both understand what the other is protecting, this becomes highly functional.'},
    '3-5':{score:82,type:'Harvest Union',col:'#15803D',headline:'Two of the most alive combinations possible',body:'Joy, variety, communication, adventure. Both love life and express it freely. Must consciously build roots.'},
    '3-6':{score:76,type:'Harvest Union',col:'#15803D',headline:'Creative warmth meets loving stability',body:'The 3 brings lightness; the 6 brings warmth and care. One of the better combinations for family life.'},
    '3-7':{score:63,type:'Karmic Bond',col:'#BE185D',headline:'The social one meets the solitary one',body:'The 3 draws energy from people; the 7 recovers in solitude. Requires genuine curiosity about the other\'s world.'},
    '3-8':{score:71,type:'Growth Partnership',col:'#C2410C',headline:'Expression meets ambition — a productive tension',body:'The 3 brings creativity and social ease; the 8 brings drive and strategy. Formidable when they combine their gifts.'},
    '3-9':{score:84,type:'Harvest Union',col:'#15803D',headline:'Two hearts built to give to the world',body:'The 3 expresses; the 9 serves. Both bring genuine warmth. High natural compatibility with a shared sense of what life is for.'},
    '4-4':{score:75,type:'Mirror Union',col:'#6366F1',headline:'Two builders building together',body:'Reliable, consistent, and quietly powerful. The risk is rigidity. Intentional spontaneity is the prescription.'},
    '4-5':{score:58,type:'Karmic Bond',col:'#BE185D',headline:'The most challenging natural tension in numerology',body:'The 4 needs security and solid foundations; the 5 needs freedom and change. A map of what must be consciously navigated.'},
    '4-6':{score:82,type:'Harvest Union',col:'#15803D',headline:'Two of the most family-oriented numbers',body:'Both value commitment and home. The 4 builds the foundation; the 6 fills it with love. Genuinely stable long-term.'},
    '4-7':{score:76,type:'Harvest Union',col:'#15803D',headline:'The practical meets the profound',body:'The 4 provides the structure the 7 needs; the 7 provides the depth the 4 secretly craves. Quietly one of the strongest partnerships.'},
    '4-8':{score:78,type:'Harvest Union',col:'#15803D',headline:'Two of the most powerful builders in numerology',body:'Both oriented toward achievement and leaving something real behind. High productivity and genuine respect.'},
    '4-9':{score:66,type:'Growth Partnership',col:'#C2410C',headline:'Practical meets philosophical — a necessary friction',body:'The 4 focuses on the concrete; the 9 on the universal. Requires each to genuinely value what the other carries.'},
    '5-5':{score:71,type:'Mirror Union',col:'#6366F1',headline:'Two free spirits — exhilarating and unstable',body:'Maximum freedom and excitement. The question is whether it can sustain itself long enough to become a foundation.'},
    '5-6':{score:64,type:'Karmic Bond',col:'#BE185D',headline:'Freedom meets responsibility — a core tension',body:'The 5 resists being needed; the 6 is built to be needed. This relationship teaches both what they most resist.'},
    '5-7':{score:73,type:'Growth Partnership',col:'#C2410C',headline:'Two independent minds — mutual respect is the key',body:'Both are fiercely independent in different ways. When each respects the other\'s need for space, this works quietly well.'},
    '5-8':{score:69,type:'Growth Partnership',col:'#C2410C',headline:'Freedom meets control — power dynamics matter',body:'The 8 wants to direct; the 5 cannot be directed. High friction unless the 8 expresses power through achievement rather than control.'},
    '5-9':{score:77,type:'Harvest Union',col:'#15803D',headline:'Two seekers with different maps',body:'The 5 seeks experience; the 9 seeks meaning. Natural mutual understanding with enough difference to keep things interesting.'},
    '6-6':{score:80,type:'Mirror Union',col:'#6366F1',headline:'Two nurturers who must be nurtured',body:'Deeply caring and genuinely loving. The risk is that both give so much to others there is nothing left for each other.'},
    '6-7':{score:65,type:'Growth Partnership',col:'#C2410C',headline:'The heart meets the hermit',body:'The 6 expresses love through presence; the 7 needs solitude to feel whole. The 6 must not take withdrawal personally.'},
    '6-8':{score:72,type:'Growth Partnership',col:'#C2410C',headline:'Love meets ambition — a negotiation of priorities',body:'The 6 prioritises relationship and home; the 8 prioritises achievement. When the 8 understands the 6\'s world is their foundation, this is strong.'},
    '6-9':{score:86,type:'Harvest Union',col:'#15803D',headline:'Two of the most loving numbers in combination',body:'Both oriented toward care and contributing something meaningful. Deep natural affinity with a shared sense of what love is for.'},
    '7-7':{score:73,type:'Mirror Union',col:'#6366F1',headline:'Two seekers in profound understanding',body:'Nobody understands a 7 like another 7. Deep intellectual rapport. The risk is that two 7s forget to connect with each other.'},
    '7-8':{score:67,type:'Growth Partnership',col:'#C2410C',headline:'Wisdom meets power — mutual respect is everything',body:'The 7 has insights the 8 needs; the 8 has the capacity to bring the 7\'s insights into the world.'},
    '7-9':{score:81,type:'Harvest Union',col:'#15803D',headline:'Two of the most spiritually oriented numbers',body:'Both are seekers. The 7 seeks truth; the 9 seeks service. A naturally profound combination.'},
    '8-8':{score:70,type:'Mirror Union',col:'#6366F1',headline:'Two powerhouses — magnificent or combustible',body:'When their goals align, one of the most achieving combinations. When they compete, it is exhausting for everyone.'},
    '8-9':{score:74,type:'Growth Partnership',col:'#C2410C',headline:'Power meets purpose — a meaningful tension',body:'The 8 wants achievement; the 9 wants meaning. The 9 teaches the 8 that power is most valuable in service of something larger.'},
    '9-9':{score:79,type:'Mirror Union',col:'#6366F1',headline:'Two old souls who recognise each other',body:'Deep mutual understanding and a shared sense of what life is for. Must be intentional about receiving, not just giving.'},
  }
  return map[key] ?? {
    score: Math.abs(lp1-lp2)<=2?76:Math.abs(lp1-lp2)<=4?68:63,
    type:'Growth Partnership', col:'#C2410C',
    headline:`Life Path ${lp1} meets Life Path ${lp2}`,
    body:'This combination carries its own unique dynamic. The full reading maps the specific compatibility pattern, the area of strongest natural harmony, and the area requiring the most conscious navigation.',
  }
}

// ─────────────────────────────────────────────────────────────
// Tool meta — read from sessionStorage (set by sales page)
// or built from toolId
// ─────────────────────────────────────────────────────────────
interface ToolMeta {
  id:string; name:string; emoji:string; domain:string; price:number
  requiresPartner:boolean; requiresImage:boolean
  isSubscription:boolean; deliveryMinutes:number
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function StartPage({ params }: { params: { toolId: string } }) {
  const router        = useRouter()
  const toolId        = params.toolId

  // anonymousStore — purchase page reads from the same store
  const { user: anonymousUser, setAnonymousUser } = useAnonymousStore()

  const [tool,   setTool]   = useState<ToolMeta|null>(null)
  const [step,   setStep]   = useState<1|2>(1)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)

  // Your details
  const [name,         setName]         = useState('')
  const [dob,          setDob]          = useState('')
  const [birthTime,    setBirthTime]    = useState('')
  const [birthCity,    setBirthCity]    = useState('')
  const [birthCountry, setBirthCountry] = useState('')

  // Partner details
  const [partnerName, setPartnerName] = useState('')
  const [partnerDob,  setPartnerDob]  = useState('')

  // Live LP numbers
  const myLP      = calcLifePath(dob)
  const partnerLP = calcLifePath(partnerDob)
  const compat    = myLP && partnerLP ? getCompatibility(myLP, partnerLP) : null

  // ── On mount: pre-fill from anonymousStore or sessionStorage ──
  useEffect(()=>{
    // Load tool meta from sessionStorage (set by sales page CTA)
    const storedMeta = sessionStorage.getItem(`kayal_tool_${toolId}`)
    if (storedMeta) {
      setTool(JSON.parse(storedMeta))
    } else {
      // Fallback: minimal meta
      setTool({
        id:toolId, name:toolId.replace(/-/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
        emoji:'🔮', domain:'oracle-temple', price:0,
        requiresPartner:false, requiresImage:false,
        isSubscription:false, deliveryMinutes:20,
      })
    }

    // Pre-fill from anonymousStore if already set (returning user)
    if (anonymousUser?.name)         setName(anonymousUser.name)
    if (anonymousUser?.dob)          setDob(anonymousUser.dob)
    if (anonymousUser?.birthTime)    setBirthTime(anonymousUser.birthTime)
    if (anonymousUser?.birthLocation) {
      const parts = anonymousUser.birthLocation.split(',')
      if (parts[0]) setBirthCity(parts[0].trim())
      if (parts[1]) setBirthCountry(parts[1].trim())
    }

    // Also check sessionStorage for any previously entered data
    const saved = sessionStorage.getItem(`kayal_reading_${toolId}`)
    if (saved) {
      const d = JSON.parse(saved)
      if (!anonymousUser?.name   && d.name)        setName(d.name)
      if (!anonymousUser?.dob    && d.dob)         setDob(d.dob)
      if (d.birthTime)                             setBirthTime(d.birthTime)
      if (d.birthCity)                             setBirthCity(d.birthCity)
      if (d.birthCountry)                          setBirthCountry(d.birthCountry)
      if (d.partnerName)                           setPartnerName(d.partnerName)
      if (d.partnerDob)                            setPartnerDob(d.partnerDob)
    }
  },[toolId, anonymousUser])

  if (!tool) return null

  const ds = DS[tool.domain] ?? DD
  const T  = {h:'#0F172A',b:'#334155',m:'#64748B',l:'#94A3B8'}
  const birthLocation = [birthCity, birthCountry].filter(Boolean).join(', ')
  const totalSteps    = tool.requiresPartner ? 2 : 1

  // ── Validation ────────────────────────────────────────────
  function validate(forStep: 1|2) {
    const e: Record<string,string> = {}
    if (forStep === 1) {
      if (!name.trim()) e.name = 'Your full legal name is required'
      if (!dob)         e.dob  = 'Your date of birth is required'
    }
    if (forStep === 2 && tool.requiresPartner) {
      if (!partnerName.trim()) e.partnerName = "Partner's full name is required"
      if (!partnerDob)         e.partnerDob  = "Partner's date of birth is required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Save to anonymousStore + sessionStorage then proceed ──
  function handleStep1() {
    if (!validate(1)) return
    setSaving(true)

    // ── Write to anonymousStore ──────────────────────────────
    // setAnonymousUser sets the full user object.
    // hasCompletedOnboarding() returns !!user so this call
    // automatically satisfies the purchase page's onboarding check.
    setAnonymousUser({
      sessionId:     anonymousUser?.sessionId
                       || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name:          name.trim(),
      dob,
      birthTime:     birthTime     || undefined,
      birthLocation: birthLocation || undefined,
      email:         anonymousUser?.email,
      receiveUpdates:anonymousUser?.receiveUpdates,
      firstVisit:    anonymousUser?.firstVisit    || new Date(),
      lastVisit:     new Date(),
      visitCount:    (anonymousUser?.visitCount   || 0) + 1,
      viewedTools:   anonymousUser?.viewedTools   || [],
    })

    // ── Write to sessionStorage as backup ────────────────────
    const data = {
      toolId, name:name.trim(), dob, birthTime, birthCity, birthCountry,
      savedAt: new Date().toISOString(),
    }
    sessionStorage.setItem(`kayal_reading_${toolId}`, JSON.stringify(data))

    setSaving(false)

    if (tool.requiresPartner) {
      setStep(2)
      window.scrollTo({top:0,behavior:'smooth'})
    } else {
      router.push(`/purchase/${toolId}`)
    }
  }

  function handleStep2() {
    if (!validate(2)) return
    setSaving(true)

    // ── Save partner data to sessionStorage ──────────────────
    // (anonymousStore only holds one person's data)
    const existing = JSON.parse(sessionStorage.getItem(`kayal_reading_${toolId}`) || '{}')
    const data = {
      ...existing,
      partnerName: partnerName.trim(),
      partnerDob,
      compatScore: compat?.score,
      compatType:  compat?.type,
    }
    sessionStorage.setItem(`kayal_reading_${toolId}`, JSON.stringify(data))

    setSaving(false)
    router.push(`/purchase/${toolId}`)
  }

  // ── Shared styles ─────────────────────────────────────────
  const inputStyle = (field:string):React.CSSProperties => ({
    width:'100%',padding:'11px 14px',borderRadius:8,fontSize:14,color:T.h,
    border:`1.5px solid ${errors[field]?'#EF4444':'#E2E8F0'}`,
    background:'#fff',outline:'none',
    fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    boxSizing:'border-box',
  })
  const label:React.CSSProperties = {display:'block',fontSize:13,fontWeight:600,color:T.b,marginBottom:6}
  const hint:React.CSSProperties  = {margin:'4px 0 0',fontSize:11,color:T.l,lineHeight:1.5}
  const err:React.CSSProperties   = {margin:'4px 0 0',fontSize:12,color:'#EF4444'}

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        input:focus,select:focus{
          border-color:${ds.accent}!important;
          box-shadow:0 0 0 3px ${ds.accent}18;
          outline:none;
        }
        .fade{animation:fi .4s ease both}
        @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .score-bar{transition:width 1s ease}
      `}</style>

      <main style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:T.h}}>

        {/* ── NAV ─────────────────────────────────────────── */}
        <nav style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(14px)',borderBottom:'1px solid #E2E8F0',position:'sticky',top:0,zIndex:50}}>
          <div style={{maxWidth:660,margin:'0 auto',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <a href={`/tool/${toolId}`} style={{display:'flex',alignItems:'center',gap:6,textDecoration:'none',fontSize:13,color:T.m}}>
              ← Back
            </a>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <span>{tool.emoji}</span>
              <span style={{fontFamily:'Georgia,serif',fontSize:13,color:T.h,fontWeight:400}}>{tool.name}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:14,fontWeight:800,color:ds.accent}}>${tool.price}{tool.isSubscription?'/mo':''}</span>
            </div>
          </div>
        </nav>

        <div style={{maxWidth:580,margin:'0 auto',padding:'32px 20px 80px'}}>

          {/* ── PROGRESS ──────────────────────────────────── */}
          <div style={{display:'flex',alignItems:'center',marginBottom:32}}>
            {(tool.requiresPartner?['Your Details','Partner Details','Checkout']:['Your Details','Checkout']).map((label,i)=>{
              const n       = i+1
              const isStep  = n <= totalSteps
              const active  = n === step
              const done    = n < step
              const isLast  = i === (tool.requiresPartner?2:1)
              return(
                <div key={n} style={{display:'flex',alignItems:'center',flex:isLast?0:1}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{
                      width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,fontWeight:700,transition:'all .25s ease',
                      background: done?ds.accent:active?ds.accent:'#E2E8F0',
                      color: done||active?'#fff':T.l,
                    }}>{done?'✓':n}</div>
                    <span style={{fontSize:10,fontWeight:600,color:active?ds.accent:T.l,whiteSpace:'nowrap' as const}}>{label}</span>
                  </div>
                  {!isLast&&<div style={{flex:1,height:2,margin:'0 6px 18px',background:done?ds.accent:'#E2E8F0',transition:'background .3s ease'}}/>}
                </div>
              )
            })}
          </div>

          {/* ══ STEP 1 — YOUR DETAILS ═══════════════════════ */}
          {step===1&&(
            <div className="fade">
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,.05)'}}>

                {/* Header */}
                <div style={{padding:'18px 22px',borderBottom:'1px solid #F1F5F9',background:ds.light}}>
                  <h1 style={{fontFamily:'Georgia,serif',fontSize:20,fontWeight:400,color:T.h,margin:'0 0 3px'}}>
                    Your Reading Details
                  </h1>
                  <p style={{fontSize:12,color:T.m,margin:0}}>
                    Used to calculate your personalised reading. Never shared.
                  </p>
                </div>

                <div style={{padding:'22px'}}>

                  {/* Required */}
                  <p style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:ds.accent,margin:'0 0 14px'}}>Required</p>

                  {/* Full name */}
                  <div style={{marginBottom:16}}>
                    <label style={label}>
                      Full legal name <span style={{color:'#EF4444'}}>*</span>
                    </label>
                    <input
                      type="text" value={name}
                      onChange={e=>setName(e.target.value)}
                      placeholder="As written on your birth certificate or official ID"
                      style={inputStyle('name')}
                    />
                    {errors.name&&<p style={err}>{errors.name}</p>}
                    <p style={hint}>Used for your numerology profile. Must be your birth name, not a nickname or married name.</p>
                  </div>

                  {/* Date of birth */}
                  <div style={{marginBottom:22}}>
                    <label style={label}>
                      Date of birth <span style={{color:'#EF4444'}}>*</span>
                    </label>
                    <input
                      type="date" value={dob}
                      onChange={e=>setDob(e.target.value)}
                      style={inputStyle('dob')}
                    />
                    {errors.dob&&<p style={err}>{errors.dob}</p>}
                    {myLP&&(
                      <div style={{marginTop:8,display:'inline-flex',alignItems:'center',gap:6,background:ds.pill,border:`1px solid ${ds.accent}22`,borderRadius:8,padding:'4px 10px'}}>
                        <span style={{fontSize:12,color:ds.accent,fontWeight:700}}>Life Path {myLP}</span>
                        <span style={{fontSize:11,color:T.m}}>· {LP_NAMES[myLP]??`The ${myLP}`}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{height:1,background:'#F1F5F9',margin:'0 0 18px'}}/>
                  <p style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:T.l,margin:'0 0 14px'}}>Optional — improves accuracy significantly</p>

                  {/* Time of birth */}
                  <div style={{marginBottom:16}}>
                    <label style={label}>Time of birth</label>
                    <input
                      type="time" value={birthTime}
                      onChange={e=>setBirthTime(e.target.value)}
                      style={inputStyle('')}
                    />
                    <p style={hint}>Even an approximate time (morning / afternoon / evening) meaningfully improves the astrological calculation. Leave blank if unknown.</p>
                  </div>

                  {/* Place of birth */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:6}}>
                    <div>
                      <label style={label}>City of birth</label>
                      <input type="text" value={birthCity} onChange={e=>setBirthCity(e.target.value)} placeholder="e.g. Lagos" style={inputStyle('')}/>
                    </div>
                    <div>
                      <label style={label}>Country of birth</label>
                      <input type="text" value={birthCountry} onChange={e=>setBirthCountry(e.target.value)} placeholder="e.g. Nigeria" style={inputStyle('')}/>
                    </div>
                  </div>
                  <p style={{...hint,marginBottom:24}}>Used for geographic coordinates in the astrological calculation.</p>

                  {/* CTA */}
                  <button
                    onClick={handleStep1}
                    disabled={saving}
                    style={{
                      width:'100%',padding:'13px',borderRadius:10,
                      background:ds.accent,color:'#fff',border:'none',
                      fontSize:15,fontWeight:700,cursor:'pointer',
                      opacity:saving?0.7:1,
                    }}
                  >
                    {saving
                      ? 'Saving...'
                      : tool.requiresPartner
                        ? 'Continue to Partner Details →'
                        : 'Continue to Secure Checkout →'
                    }
                  </button>
                  <p style={{textAlign:'center' as const,fontSize:11,color:T.l,marginTop:8}}>
                    🔒 Your data is encrypted and never shared with third parties
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 2 — PARTNER DETAILS + COMPATIBILITY ════ */}
          {step===2&&tool.requiresPartner&&(
            <div className="fade">
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 16px rgba(0,0,0,.05)',marginBottom:16}}>

                <div style={{padding:'18px 22px',borderBottom:'1px solid #F1F5F9',background:ds.light}}>
                  <h1 style={{fontFamily:'Georgia,serif',fontSize:20,fontWeight:400,color:T.h,margin:'0 0 3px'}}>
                    Partner Details
                  </h1>
                  <p style={{fontSize:12,color:T.m,margin:0}}>Enter your partner's details to generate the compatibility reading.</p>
                </div>

                <div style={{padding:'22px'}}>
                  <p style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:ds.accent,margin:'0 0 14px'}}>Required</p>

                  {/* Partner name */}
                  <div style={{marginBottom:16}}>
                    <label style={label}>Partner's full name <span style={{color:'#EF4444'}}>*</span></label>
                    <input
                      type="text" value={partnerName}
                      onChange={e=>setPartnerName(e.target.value)}
                      placeholder="Their full legal name"
                      style={inputStyle('partnerName')}
                    />
                    {errors.partnerName&&<p style={err}>{errors.partnerName}</p>}
                  </div>

                  {/* Partner DOB */}
                  <div style={{marginBottom:20}}>
                    <label style={label}>Partner's date of birth <span style={{color:'#EF4444'}}>*</span></label>
                    <input
                      type="date" value={partnerDob}
                      onChange={e=>setPartnerDob(e.target.value)}
                      style={inputStyle('partnerDob')}
                    />
                    {errors.partnerDob&&<p style={err}>{errors.partnerDob}</p>}
                    {partnerLP&&(
                      <div style={{marginTop:8,display:'inline-flex',alignItems:'center',gap:6,background:ds.pill,border:`1px solid ${ds.accent}22`,borderRadius:8,padding:'4px 10px'}}>
                        <span style={{fontSize:12,color:ds.accent,fontWeight:700}}>Life Path {partnerLP}</span>
                        <span style={{fontSize:11,color:T.m}}>· {LP_NAMES[partnerLP]??`The ${partnerLP}`}</span>
                      </div>
                    )}
                  </div>

                  {/* ── LIVE COMPATIBILITY CALCULATOR ──────── */}
                  {compat&&myLP&&partnerLP&&(
                    <div style={{background:ds.light,border:`1.5px solid ${ds.accent}28`,borderRadius:12,padding:'18px',marginBottom:20}}>
                      <p style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase' as const,color:ds.accent,margin:'0 0 14px'}}>
                        Compatibility Preview
                      </p>

                      {/* Avatar row */}
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                        <div style={{flex:1,textAlign:'center' as const}}>
                          <div style={{width:40,height:40,borderRadius:'50%',background:ds.pill,border:`2px solid ${ds.accent}35`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:ds.accent,margin:'0 auto 5px'}}>
                            {name.charAt(0).toUpperCase()||'?'}
                          </div>
                          <p style={{margin:0,fontSize:12,fontWeight:600,color:T.h}}>{name.split(' ')[0]||'You'}</p>
                          <p style={{margin:0,fontSize:10,color:T.m}}>LP {myLP}</p>
                        </div>

                        <div style={{textAlign:'center' as const,padding:'0 4px'}}>
                          <div style={{fontSize:18,color:ds.accent,lineHeight:1}}>⟷</div>
                          <div style={{marginTop:5,background:ds.accent,color:'#fff',borderRadius:10,padding:'2px 8px',fontSize:12,fontWeight:800}}>{compat.score}%</div>
                        </div>

                        <div style={{flex:1,textAlign:'center' as const}}>
                          <div style={{width:40,height:40,borderRadius:'50%',background:ds.pill,border:`2px solid ${ds.accent}35`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:ds.accent,margin:'0 auto 5px'}}>
                            {partnerName.charAt(0).toUpperCase()||'?'}
                          </div>
                          <p style={{margin:0,fontSize:12,fontWeight:600,color:T.h}}>{partnerName.split(' ')[0]||'Partner'}</p>
                          <p style={{margin:0,fontSize:10,color:T.m}}>LP {partnerLP}</p>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div style={{background:'#E2E8F0',borderRadius:99,height:7,marginBottom:12,overflow:'hidden'}}>
                        <div className="score-bar" style={{height:'100%',borderRadius:99,background:ds.accent,width:`${compat.score}%`}}/>
                      </div>

                      {/* Type + headline */}
                      <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,flexWrap:'wrap' as const}}>
                        <span style={{
                          background:`${compat.col}12`,border:`1px solid ${compat.col}25`,
                          color:compat.col,borderRadius:20,padding:'2px 9px',
                          fontSize:11,fontWeight:700,whiteSpace:'nowrap' as const,flexShrink:0,
                        }}>{compat.type}</span>
                        <p style={{margin:0,fontSize:13,fontWeight:600,color:T.h,lineHeight:1.4}}>{compat.headline}</p>
                      </div>
                      <p style={{margin:0,fontSize:13,color:T.m,lineHeight:1.65}}>{compat.body}</p>

                      <p style={{margin:'10px 0 0',fontSize:11,color:T.l,fontStyle:'italic' as const}}>
                        Your full reading includes 6-domain compatibility scoring, the karmic contract between you, and a detailed navigation guide for this specific relationship.
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleStep2}
                    disabled={saving}
                    style={{width:'100%',padding:'13px',borderRadius:10,background:ds.accent,color:'#fff',border:'none',fontSize:15,fontWeight:700,cursor:'pointer',opacity:saving?0.7:1}}
                  >
                    {saving ? 'Saving...' : 'Continue to Secure Checkout →'}
                  </button>
                  <p style={{textAlign:'center' as const,fontSize:11,color:T.l,marginTop:8}}>
                    🔒 Your data is encrypted and never shared
                  </p>
                </div>
              </div>

              <div style={{textAlign:'center' as const}}>
                <button onClick={()=>setStep(1)} style={{fontSize:13,color:T.m,background:'none',border:'none',cursor:'pointer'}}>
                  ← Back to your details
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
