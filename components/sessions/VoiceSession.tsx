'use client'

/**
 * components/sessions/VoiceSession.tsx  — v2
 * ============================================
 * Voice of Prophecy — live call interface.
 *
 * Layout (top → bottom, FIXED):
 *   [Synthesis badge]
 *   [Orb — centred, fills remaining space]
 *   [Status dot + label]
 *   [Timer bar — only when active]
 *   [Transcript — scrollable, max 3 visible]
 *   [Controls + hint — PINNED TO BOTTOM, never moves]
 *
 * The controls section uses flexShrink:0 and sits
 * at the bottom of a flex column — guaranteed fixed.
 */

import {
  useState, useEffect, useRef, useCallback
} from 'react'
import { useParams, useRouter }   from 'next/navigation'
import { useAuth }                from '@/lib/hooks/useAuth'
import { useThemeMode }           from '@/lib/hooks/useThemeMode'
import { getVoiceToolById }       from '@/lib/constants/voice-tools'
import type { VoiceTool }         from '@/lib/constants/voice-tools'
import ToolShell, {
  useToolShell,
  type ToolMeta,
  type AmbientState,
} from '@/components/tool-shell/ToolShell'
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Sparkles,
} from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const WS_BASE  = API_BASE.replace(/^http/, 'ws')

const TOOL_DOMAIN: Record<string,string> = {
  'oracle-voice-session':'all','oracle-deep-dive-session':'all',
  'love-oracle-session':'love','wealth-oracle-session':'wealth',
  'purpose-oracle-session':'purpose','daily-voice-briefing':'timing',
  'relationship-oracle-session':'love','spiritual-oracle-session':'spiritual',
  'crisis-oracle-session':'all','oracle-voice-unlimited':'all',
}

const DOMAIN_ACCENT: Record<string,string> = {
  love:'#d4856a',wealth:'#c9a96e',spiritual:'#a48ac4',
  health:'#7aaa8a',purpose:'#7a9ac4',timing:'#a0c49a',
  grief:'#8a9aaa',all:'#c9a96e',
}

type Phase = 'idle'|'checking'|'loading'|'connecting'|'ready'|'listening'|'thinking'|'speaking'|'ended'

interface Turn { id:string; role:'user'|'oracle'; text:string; timestamp:Date }
interface SynthCtx {
  first_name:string; full_name:string; birth_location:string|null;
  has_synthesis:boolean; pills:string[]; job_id:string|null; history_block:string;
}

const uid  = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`
const fmt  = (s:number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

async function loadSynthesis(userId:string, domain:string, signal?:AbortSignal): Promise<SynthCtx> {
  const empty: SynthCtx = { first_name:'Seeker',full_name:'',birth_location:null,has_synthesis:false,pills:[],job_id:null,history_block:'' }
  try {
    const res = await fetch(`${API_BASE}/api/reading/job/latest?user_id=${userId}`,{ signal })
    if (!res.ok) return empty
    const data = await res.json(); if (!data?.result) return empty
    const r=data.result, num=r.numerology??{}, cyc=num.time_cycles??{}
    const fullName=r.full_name??'', firstName=fullName.split(' ')[0]||'Seeker'
    const pills:string[]=[]
    const lp=r.life_path??num.core?.life_path??null; if(lp) pills.push(`LP ${lp}`)
    const sun=r.sun_sign??null; if(sun) pills.push(`☉ ${sun}`)
    const py=r.personal_year??cyc.personal_year??null; if(py) pills.push(`PY ${py}`)
    const pin=num.pinnacles?.current?.number??null; if(pin) pills.push(`Pinnacle ${pin}`)
    const face=r.face_archetype??r.face_analysis?.archetype??null; if(face) pills.push(face)
    const palm=r.palm_element??r.palm_analysis?.element??null; if(palm) pills.push(`Palm · ${palm}`)
    const loc=r.birth_location??null
    const bl=typeof loc==='object'?loc?.place_name??loc?.city??null:loc
    const lines=[
      `KAYAL SYNTHESIS — ${fullName}`,
      `Life Path: ${lp??'?'} · Sun: ${sun??'?'} · PY: ${py??'?'}`,
      r.reading?r.reading.slice(0,3000):'',
      'Respond in natural spoken sentences. No bullet points. Specific to this person.',
    ].filter(Boolean)
    return { first_name:firstName,full_name:fullName,birth_location:bl,has_synthesis:true,pills,job_id:data.id??null,history_block:lines.join('\n') }
  } catch(e:any){ if(e?.name==='AbortError') throw e; return empty }
}

// ─────────────────────────────────────────────────────────────
// Waveform — radial bars around the orb
// ─────────────────────────────────────────────────────────────
function Waveform({ accent, state }: { accent:string; state:AmbientState }) {
  const ref=useRef<HTMLCanvasElement>(null), frame=useRef(0), t=useRef(0)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!
    const h=accent.replace('#','')
    const ar=parseInt(h.slice(0,2),16),ag=parseInt(h.slice(2,4),16),ab=parseInt(h.slice(4,6),16)
    const draw=()=>{
      frame.current=requestAnimationFrame(draw)
      const W=c.offsetWidth||240,H=c.offsetHeight||240
      c.width=W; c.height=H; ctx.clearRect(0,0,W,H)
      if(state==='idle') return
      t.current+=state==='speaking'?.1:state==='listening'?.075:.05
      const cx=W/2,cy=H/2,base=62
      const bars=state==='speaking'?44:state==='listening'?36:26
      for(let i=0;i<bars;i++){
        const angle=(i/bars)*Math.PI*2
        const amp=state==='speaking'?20:state==='listening'?14:8
        const h2=amp*Math.abs(Math.sin(t.current*2.2+i*.42))+2
        ctx.beginPath()
        ctx.moveTo(cx+Math.cos(angle)*base,cy+Math.sin(angle)*base)
        ctx.lineTo(cx+Math.cos(angle)*(base+h2),cy+Math.sin(angle)*(base+h2))
        ctx.strokeStyle=`rgba(${ar},${ag},${ab},${state==='speaking'?.75:state==='listening'?.58:.38})`
        ctx.lineWidth=state==='speaking'?2.8:2.2
        ctx.lineCap='round'
        ctx.stroke()
      }
    }
    draw()
    return ()=>cancelAnimationFrame(frame.current)
  },[accent,state])
  return <canvas ref={ref} style={{position:'absolute',width:240,height:240,left:'50%',top:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
}

// ─────────────────────────────────────────────────────────────
// Oracle orb
// ─────────────────────────────────────────────────────────────
function OracleOrb({ emoji, accent, phase, isDark }: { emoji:string;accent:string;phase:Phase;isDark:boolean }) {
  const state: AmbientState = phase==='speaking'?'speaking':phase==='thinking'?'thinking':phase==='listening'?'listening':'idle'

  const orbBg =
    phase==='speaking'  ? `radial-gradient(circle at 35% 30%, ${accent}30, ${accent}08)` :
    phase==='thinking'  ? 'radial-gradient(circle at 35% 30%, rgba(139,124,200,0.28), rgba(139,124,200,0.06))' :
    phase==='listening' ? 'radial-gradient(circle at 35% 30%, rgba(74,155,142,0.28), rgba(74,155,142,0.06))' :
    isDark
      ? `radial-gradient(circle at 35% 30%, ${accent}18, ${accent}05)`
      : `radial-gradient(circle at 35% 30%, ${accent}12, ${accent}03)`

  const borderCol =
    phase==='speaking'  ? `${accent}55` :
    phase==='thinking'  ? 'rgba(139,124,200,0.5)' :
    phase==='listening' ? 'rgba(74,155,142,0.5)' :
    `${accent}35`

  const shadow =
    phase==='speaking'  ? `0 0 60px ${accent}28, 0 0 120px ${accent}12` :
    phase==='thinking'  ? '0 0 50px rgba(139,124,200,0.22)' :
    phase==='listening' ? '0 0 40px rgba(74,155,142,0.2)' :
    isDark ? `0 0 30px ${accent}14` : 'none'

  return (
    <div style={{position:'relative',width:240,height:240,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Waveform accent={accent} state={state}/>
      {/* Outer ring */}
      <div style={{position:'absolute',width:168,height:168,borderRadius:'50%',border:`1px solid ${phase==='listening'?'rgba(74,155,142,0.4)':phase==='speaking'?`${accent}35`:`${accent}18`}`,animation:phase==='listening'?'spin 5s linear infinite':'none',transition:'border-color 0.5s'}}/>
      {/* Mid ring */}
      <div style={{position:'absolute',width:138,height:138,borderRadius:'50%',border:`1px solid ${borderCol}`,transition:'border-color 0.5s'}}/>
      {/* Core orb */}
      <div style={{
        width:110,height:110,borderRadius:'50%',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:'44px',background:orbBg,
        border:`1.5px solid ${borderCol}`,
        boxShadow:shadow,
        transition:'all 0.5s',position:'relative',zIndex:1,
      }}>
        {emoji}
        {phase==='speaking'&&(
          <div style={{position:'absolute',inset:0,borderRadius:'50%',background:`radial-gradient(circle,${accent}18,transparent 70%)`,animation:'pulseSpeaking .95s ease-in-out infinite alternate'}}/>
        )}
      </div>
      {/* Listening ripples */}
      {phase==='listening'&&[0,700,1400].map(d=>(
        <div key={d} style={{position:'absolute',width:110,height:110,borderRadius:'50%',border:`1px solid ${accent}50`,animation:`ripple 2.2s ${d}ms ease-out infinite`}}/>
      ))}
      <style>{`
        @keyframes ripple{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}
        @keyframes pulseSpeaking{from{transform:scale(.91);opacity:.4}to{transform:scale(1.22);opacity:.9}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Inner session
// ─────────────────────────────────────────────────────────────
function VoiceInner({ toolId, tool }: { toolId:string; tool:VoiceTool }) {
  const { user, isLoading:authLoading, isAuthenticated } = useAuth()
  const router   = useRouter()
  const shell    = useToolShell()
  const { isDark } = useThemeMode()
  const domain   = TOOL_DOMAIN[toolId]??'all'
  const accent   = DOMAIN_ACCENT[domain]??'#c9a96e'
  const d        = (light:string,dark:string) => isDark?dark:light

  const [phase,      setPhase]      = useState<Phase>('idle')
  const [synthesis,  setSynthesis]  = useState<SynthCtx|null>(null)
  const [turns,      setTurns]      = useState<Turn[]>([])
  const [elapsed,    setElapsed]    = useState(0)
  const [isMuted,    setIsMuted]    = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string|null>(null)
  const [limitHit,   setLimitHit]   = useState(false)
  const [sessionId]                 = useState(()=>crypto.randomUUID())

  const wsRef          = useRef<WebSocket|null>(null)
  const recorderRef    = useRef<MediaRecorder|null>(null)
  const chunksRef      = useRef<Blob[]>([])
  const streamRef      = useRef<MediaStream|null>(null)
  const audioCtxRef    = useRef<AudioContext|null>(null)
  const timerRef       = useRef<NodeJS.Timeout|null>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const isRecRef       = useRef(false)
  const lockRef        = useRef(false)
  const phaseRef       = useRef<Phase>('idle')
  const turnsRef       = useRef<Turn[]>([])
  const synthRef       = useRef<SynthCtx|null>(null)

  useEffect(()=>{phaseRef.current=phase},[phase])
  useEffect(()=>{turnsRef.current=turns},[turns])
  useEffect(()=>{synthRef.current=synthesis},[synthesis])

  useEffect(()=>{
    const map:Record<Phase,AmbientState>={idle:'idle',checking:'idle',loading:'idle',connecting:'idle',ready:'idle',listening:'listening',thinking:'thinking',speaking:'speaking',ended:'idle'}
    shell.setAmbientState(map[phase]??'idle')
  },[phase])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[turns])

  useEffect(()=>{
    if(!user?.id) return
    const ctrl=new AbortController(); let cancelled=false
    loadSynthesis(user.id,domain,ctrl.signal).then(s=>{if(!cancelled)setSynthesis(s)}).catch(()=>{})
    return()=>{cancelled=true;ctrl.abort()}
  },[user?.id,domain])

  useEffect(()=>{
    const active=['ready','listening','thinking','speaking'].includes(phase)
    if(!active) return
    timerRef.current=setInterval(()=>{
      setElapsed(prev=>{
        const next=prev+1
        if(tool.id!=='oracle-voice-unlimited'){
          const limit=(tool.sessionDurationMinutes??999)*60
          if(next>=limit){setLimitHit(true);endSession()}
        }
        return next
      })
    },1000)
    return()=>{if(timerRef.current)clearInterval(timerRef.current)}
  },[phase])

  useEffect(()=>()=>cleanupAll(),[])

  const cleanupAll=useCallback(()=>{
    if(timerRef.current) clearInterval(timerRef.current)
    if(recorderRef.current?.state==='recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t=>t.stop())
    if(wsRef.current?.readyState===WebSocket.OPEN) wsRef.current.close()
    if(audioCtxRef.current?.state!=='closed') audioCtxRef.current?.close()
    isRecRef.current=false; lockRef.current=false
  },[])

  const playAudio=useCallback(async(b64:string)=>{
    if(speakerOff){if(phaseRef.current!=='ended')setPhase('listening');return}
    try{
      const ctx=audioCtxRef.current
      if(!ctx||ctx.state==='closed'){setPhase('listening');return}
      if(ctx.state==='suspended') await ctx.resume()
      const raw=atob(b64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0))
      const buf=await ctx.decodeAudioData(bytes.buffer)
      const src=ctx.createBufferSource(); src.buffer=buf; src.connect(ctx.destination); src.start(0)
      src.onended=()=>{if(phaseRef.current!=='ended')setPhase('listening')}
    }catch{if(phaseRef.current!=='ended')setPhase('listening')}
  },[speakerOff])

  const addTurn=useCallback((role:Turn['role'],text:string)=>{
    setTurns(prev=>[...prev,{id:uid(),role,text,timestamp:new Date()}])
  },[])

  const buildHistory=useCallback(()=>{
    const syn=synthRef.current
    const history=[]
    if(syn?.history_block) history.push({role:'assistant',content:syn.history_block})
    for(const t of turnsRef.current) history.push({role:t.role==='oracle'?'assistant':'user',content:t.text})
    return history
  },[])

  const startRecording=useCallback(async()=>{
    if(isRecRef.current||!streamRef.current) return
    isRecRef.current=true; chunksRef.current=[]
    const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm'
    const rec=new MediaRecorder(streamRef.current,{mimeType:mime})
    rec.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}
    rec.onstop=async()=>{
      isRecRef.current=false
      if(!chunksRef.current.length) return
      const ws=wsRef.current; if(!ws||ws.readyState!==WebSocket.OPEN) return
      const blob=new Blob(chunksRef.current,{type:mime})
      const buf=await blob.arrayBuffer()
      ws.send(JSON.stringify({type:'audio',data:btoa(String.fromCharCode(...new Uint8Array(buf)))}))
      setPhase('thinking')
    }
    rec.start(); recorderRef.current=rec; setPhase('listening')
  },[])

  const stopRecording=useCallback(()=>{if(recorderRef.current?.state==='recording')recorderRef.current.stop()},[])

  const handlePTTStart=useCallback(()=>{const p=phaseRef.current;if(p==='ready'||p==='listening')startRecording()},[startRecording])
  const handlePTTEnd=useCallback(()=>{if(isRecRef.current)stopRecording()},[stopRecording])

  const endSession=useCallback(()=>{
    if(wsRef.current?.readyState===WebSocket.OPEN) wsRef.current.send(JSON.stringify({type:'end_session'}))
    cleanupAll(); setPhase('ended')
  },[cleanupAll])

  const openWS=useCallback((userId:string)=>{
    const ws=new WebSocket(`${WS_BASE}/agency/voice/${domain}?session_id=${sessionId}&user_id=${userId}&subscription_tier=voice_access`)
    wsRef.current=ws
    ws.onopen=()=>ws.send(JSON.stringify({type:'history',data:buildHistory()}))
    ws.onmessage=async ev=>{
      try{
        const msg=JSON.parse(ev.data as string)
        switch(msg.type){
          case 'ready': setPhase('ready'); await startRecording(); break
          case 'ping': ws.send(JSON.stringify({type:'pong'})); break
          case 'transcribing': case 'thinking': setPhase('thinking'); break
          case 'transcript': if(msg.text?.trim()) addTurn('user',msg.text.trim()); break
          case 'synthesising': setPhase('speaking'); break
          case 'response': if(msg.text?.trim()) addTurn('oracle',msg.text.trim()); setPhase('speaking'); break
          case 'audio': if(msg.data) await playAudio(msg.data); break
          case 'audio_complete': if(phaseRef.current!=='ended') setPhase('listening'); break
          case 'tts_fallback':
            if(msg.text&&!speakerOff){const u=new SpeechSynthesisUtterance(msg.text);u.rate=.88;u.pitch=1.02;u.onend=()=>{if(phaseRef.current!=='ended')setPhase('listening')};window.speechSynthesis.speak(u)}
            else{if(phaseRef.current!=='ended')setPhase('listening')}
            break
          case 'session_ended': endSession(); break
          case 'error': setErrorMsg(msg.message??'An error occurred.'); if(phaseRef.current!=='ended')setPhase('idle'); lockRef.current=false; break
        }
      }catch{/**/}
    }
    ws.onerror=()=>{setErrorMsg('Connection error. Please try again.');setPhase('idle');lockRef.current=false}
    ws.onclose=ev=>{
      if(phaseRef.current!=='ended'&&phaseRef.current!=='idle'&&ev.code!==4003)
        setTimeout(()=>{if(phaseRef.current!=='ended')openWS(userId)},2000)
      else lockRef.current=false
    }
  },[domain,sessionId,buildHistory,startRecording,addTurn,playAudio,speakerOff,endSession])

  const startSession=async()=>{
    if(lockRef.current) return; lockRef.current=true
    if(authLoading){lockRef.current=false;return}
    if(!isAuthenticated||!user?.id){setErrorMsg('Please sign in.');router.push('/auth/login');lockRef.current=false;return}
    setErrorMsg(null); setPhase('loading')
    if(!synthRef.current?.has_synthesis){const syn=await loadSynthesis(user.id,domain);setSynthesis(syn)}
    if(audioCtxRef.current&&audioCtxRef.current.state!=='closed'){try{await audioCtxRef.current.close()}catch{};audioCtxRef.current=null}
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
    if(wsRef.current?.readyState===WebSocket.OPEN){wsRef.current.close();wsRef.current=null}
    setPhase('connecting')
    let stream:MediaStream
    try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,sampleRate:16000},video:false});streamRef.current=stream}
    catch{setErrorMsg('Microphone access required.');setPhase('idle');lockRef.current=false;return}
    try{audioCtxRef.current=new AudioContext()}catch{/**/}
    openWS(user.id)
  }

  const toggleMute=useCallback(()=>{streamRef.current?.getAudioTracks().forEach(t=>{t.enabled=isMuted});setIsMuted(p=>!p)},[isMuted])

  const isActive=['ready','listening','thinking','speaking'].includes(phase)
  const isUnlimited=tool.id==='oracle-voice-unlimited'
  const limitSecs=(tool.sessionDurationMinutes??20)*60
  const limitPct=isUnlimited?0:Math.min((elapsed/limitSecs)*100,100)
  const remaining=isUnlimited?null:Math.max(limitSecs-elapsed,0)

  const dotColour=phase==='speaking'?accent:phase==='thinking'?'#8b7cc8':phase==='listening'?'#4a9b8e':d('rgba(0,0,0,0.2)','rgba(255,255,255,0.2)')

  const phaseLabel:Record<Phase,string>={
    idle:'Ready to begin',checking:'Checking…',loading:'Loading your synthesis…',
    connecting:'Connecting to oracle…',ready:'Hold to speak',listening:'Listening…',
    thinking:'Oracle is thinking…',speaking:'Oracle is speaking',ended:'Session complete',
  }

  // ── Session ended ──────────────────────────────────────────
  if(phase==='ended') return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',gap:20,overflowY:'auto'}}>
      <div style={{fontSize:52}}>{tool.emoji}</div>
      <div style={{textAlign:'center'}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,fontWeight:400,color:d('rgba(30,22,12,0.88)','rgba(239,230,214,0.9)'),marginBottom:6}}>{limitHit?'Session complete':'Session ended'}</h2>
        <p style={{fontSize:13,letterSpacing:'0.06em',textTransform:'uppercase',color:d('rgba(0,0,0,0.35)','rgba(255,255,255,0.3)')}}>{fmt(elapsed)} · {turns.length} exchanges{synthesis?.first_name?` · ${synthesis.first_name}`:''}</p>
      </div>
      {turns.length>0&&(
        <div style={{width:'100%',maxWidth:440,maxHeight:180,overflowY:'auto',borderRadius:16,padding:'14px 16px',background:d('rgba(255,255,255,0.6)','rgba(255,255,255,0.04)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.08)')}`,backdropFilter:'blur(12px)'}}>
          <p style={{fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.22)'),marginBottom:10}}>Transcript</p>
          {turns.map(t_=>(
            <div key={t_.id} style={{fontSize:14,lineHeight:1.65,marginBottom:8,fontFamily:"'EB Garamond',Georgia,serif"}}>
              <span style={{fontWeight:600,color:t_.role==='oracle'?accent:d('rgba(0,0,0,0.45)','rgba(255,255,255,0.4)')}}>{t_.role==='oracle'?tool.name:(synthesis?.first_name??'You')}:</span>{' '}
              <span style={{color:d('rgba(30,22,12,0.72)','rgba(180,168,152,0.78)')}}>{t_.text.length>100?t_.text.slice(0,100)+'…':t_.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',gap:10,width:'100%',maxWidth:440}}>
        {[['New session',()=>{setPhase('idle');setTurns([]);setElapsed(0);setLimitHit(false);setErrorMsg(null)}],['Dashboard',()=>router.push('/member/dashboard')]].map(([label,fn]:any)=>(
          <button key={label} onClick={fn} style={{flex:1,padding:'13px',borderRadius:16,fontSize:14,cursor:'pointer',background:d('rgba(255,255,255,0.55)','rgba(255,255,255,0.05)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.09)')}`,color:d('rgba(30,22,12,0.75)','rgba(200,190,170,0.78)'),fontFamily:"'Cormorant Garamond',Georgia,serif",backdropFilter:'blur(10px)'}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Main ───────────────────────────────────────────────────
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>

      {/* Synthesis badge */}
      <div style={{padding:'12px 16px 8px',flexShrink:0}}>
        {synthesis?.has_synthesis?(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:14,background:isDark?`${accent}0e`:`${accent}0a`,border:`1px solid ${accent}20`,backdropFilter:'blur(10px)',flexWrap:'wrap'}}>
            <Sparkles style={{width:13,height:13,color:accent,flexShrink:0}}/>
            <span style={{fontSize:13,color:`${accent}cc`,flex:1,fontFamily:"'EB Garamond',Georgia,serif"}}>{synthesis.first_name}{synthesis.birth_location?` · ${synthesis.birth_location}`:''}</span>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
              {synthesis.pills.slice(0,5).map(p=>(
                <span key={p} style={{fontSize:12,padding:'2px 8px',borderRadius:999,background:`${accent}10`,color:`${accent}cc`,border:`1px solid ${accent}1e`}}>{p}</span>
              ))}
              <button onClick={()=>setSpeakerOff(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',display:'flex',alignItems:'center',marginLeft:4}}>
                {speakerOff?<VolumeX style={{width:14,height:14,color:'rgba(180,84,84,0.7)'}}/>:<Volume2 style={{width:14,height:14,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.3)')}}/>}
              </button>
            </div>
          </div>
        ):(
          <div style={{padding:'8px 14px',borderRadius:12,background:isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)',border:`1px solid ${d('rgba(0,0,0,0.08)','rgba(255,255,255,0.07)')}`,textAlign:'center',backdropFilter:'blur(8px)'}}>
            <p style={{fontSize:14,color:d('rgba(0,0,0,0.38)','rgba(255,255,255,0.32)')}}>{authLoading?'Loading…':'Complete a reading for a personalised session'}</p>
          </div>
        )}
      </div>

      {/* Oracle stage — fills remaining space */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 24px',gap:14,minHeight:0}}>

        <OracleOrb emoji={tool.emoji} accent={accent} phase={phase} isDark={isDark}/>

        {/* Status */}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:dotColour,boxShadow:isActive?`0 0 7px ${dotColour}`:'none',transition:'all 0.4s',flexShrink:0}}/>
          <span style={{fontSize:14,letterSpacing:'0.05em',textTransform:'uppercase',color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.38)')}}>{phaseLabel[phase]}</span>
        </div>

        {/* Progress bar */}
        {isActive&&!isUnlimited&&(
          <div style={{width:'100%',maxWidth:320}}>
            <div style={{height:2,borderRadius:1,overflow:'hidden',background:d('rgba(0,0,0,0.1)','rgba(255,255,255,0.08)'),marginBottom:5}}>
              <div style={{height:'100%',width:`${limitPct}%`,borderRadius:1,background:limitPct>85?'linear-gradient(90deg,rgba(180,84,84,0.6),rgba(180,84,84,0.9))':`linear-gradient(90deg,${accent}50,${accent}90)`,transition:'width 1s linear'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.28)')}}>
              <span style={{fontFamily:'monospace'}}>{fmt(elapsed)}</span>
              <span>{tool.sessionDurationMinutes} min</span>
              <span style={{fontFamily:'monospace',color:limitPct>85?'rgba(180,84,84,0.75)':undefined}}>{remaining!==null?fmt(remaining):'∞'}</span>
            </div>
          </div>
        )}

        {/* Transcript */}
        {turns.length>0&&(
          <div style={{width:'100%',maxWidth:440,maxHeight:130,overflowY:'auto',scrollbarWidth:'none',display:'flex',flexDirection:'column',gap:8}}>
            {turns.map(t_=>(
              <div key={t_.id} style={{display:'flex',gap:8,justifyContent:t_.role==='user'?'flex-end':'flex-start',alignItems:'flex-end'}}>
                {t_.role==='oracle'&&<div style={{width:22,height:22,borderRadius:'50%',background:`${accent}14`,border:`1px solid ${accent}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,marginBottom:2}}>{tool.emoji}</div>}
                <div style={{maxWidth:'78%',padding:'9px 13px',borderRadius:14,fontSize:15,lineHeight:1.6,fontFamily:"'EB Garamond',Georgia,serif",
                  background: t_.role==='oracle'
                    ? d('rgba(255,255,255,0.72)','rgba(255,255,255,0.06)')
                    : d(`${accent}14`,'rgba(70,55,110,0.45)'),
                  border:`1px solid ${t_.role==='oracle'?d('rgba(0,0,0,0.08)',`${accent}14`):d(`${accent}20`,'rgba(110,90,170,0.2)')}`,
                  color:t_.role==='oracle'?d('rgba(30,22,12,0.88)','rgba(218,206,190,0.92)'):d('rgba(50,30,10,0.85)','rgba(200,188,222,0.88)'),
                  borderBottomLeftRadius:t_.role==='oracle'?4:14,
                  borderBottomRightRadius:t_.role==='user'?4:14,
                  backdropFilter:'blur(10px)',
                  boxShadow: t_.role==='oracle'&&!isDark?'0 1px 5px rgba(0,0,0,0.07)':undefined,
                }}>
                  {t_.text}
                </div>
                {t_.role==='user'&&<div style={{width:22,height:22,borderRadius:'50%',background:d('rgba(0,0,0,0.08)','rgba(100,90,130,0.25)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(100,90,130,0.22)')}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,marginBottom:2,color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.35)')}}>{(synthesis?.first_name?.[0]??'Y').toUpperCase()}</div>}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        )}

        {/* Pre-session text */}
        {phase==='idle'&&!errorMsg&&turns.length===0&&(
          <p style={{fontSize:15,lineHeight:1.7,textAlign:'center',maxWidth:380,color:d('rgba(80,65,45,0.65)','rgba(154,140,122,0.68)'),fontFamily:"'EB Garamond',Georgia,serif"}}>{tool.hook}</p>
        )}
      </div>

      {/* Error */}
      {errorMsg&&(
        <div style={{margin:'0 16px 8px',padding:'10px 16px',borderRadius:14,background:'rgba(180,84,84,0.09)',border:'1px solid rgba(180,84,84,0.22)',color:'rgba(180,84,84,0.88)',fontSize:14,textAlign:'center',flexShrink:0,backdropFilter:'blur(8px)'}}>
          {errorMsg}
        </div>
      )}

      {/* ── CONTROLS — PINNED TO BOTTOM, NEVER MOVES ── */}
      <div style={{
        padding:        '0 24px 32px',
        flexShrink:     0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            14,
      }}>

        {/* Idle — begin */}
        {phase==='idle'&&(
          <button onClick={startSession} style={{
            width:'100%',maxWidth:380,padding:'16px',borderRadius:22,
            fontSize:16,fontWeight:600,cursor:'pointer',
            background:`linear-gradient(135deg,${accent}ee,${accent}99)`,
            border:'none',color:isDark?'#1a1200':'#2a1800',
            letterSpacing:'0.06em',
            fontFamily:"'Cormorant Garamond',Georgia,serif",
            boxShadow:`0 6px 32px ${accent}28`,
            transition:'all 0.2s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.boxShadow=`0 8px 40px ${accent}40`)}
          onMouseLeave={e=>(e.currentTarget.style.boxShadow=`0 6px 32px ${accent}28`)}>
            Begin Session
          </button>
        )}

        {/* Loading */}
        {['checking','loading','connecting'].includes(phase)&&(
          <p style={{fontSize:13,letterSpacing:'0.08em',textTransform:'uppercase',color:d('rgba(0,0,0,0.38)','rgba(255,255,255,0.35)')}}>
            {phaseLabel[phase as Phase]}
          </p>
        )}

        {/* Active controls */}
        {isActive&&(
          <>
            <div style={{display:'flex',alignItems:'center',gap:28}}>

              {/* Mute */}
              <button onClick={toggleMute} style={{
                width:50,height:50,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',transition:'all 0.15s',
                background:isMuted?'rgba(180,84,84,0.14)':d('rgba(0,0,0,0.08)','rgba(255,255,255,0.08)'),
                border:`1.5px solid ${isMuted?'rgba(180,84,84,0.35)':d('rgba(0,0,0,0.14)','rgba(255,255,255,0.14)')}`,
                backdropFilter:'blur(10px)',
              }}>
                {isMuted?<MicOff style={{width:19,height:19,color:'rgba(180,84,84,0.8)'}}/>:<Mic style={{width:19,height:19,color:d('rgba(0,0,0,0.45)','rgba(255,255,255,0.5)')}}/>}
              </button>

              {/* PTT */}
              <button
                onPointerDown={e=>{e.preventDefault();handlePTTStart()}}
                onPointerUp={e=>{e.preventDefault();handlePTTEnd()}}
                onPointerCancel={e=>{e.preventDefault();handlePTTEnd()}}
                disabled={isMuted||phase==='thinking'||phase==='speaking'}
                style={{
                  width:76,height:76,borderRadius:'50%',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all 0.25s',
                  background:
                    phase==='listening'?'radial-gradient(circle at 35% 30%,rgba(74,155,142,0.28),rgba(74,155,142,0.07))':
                    phase==='thinking' ?d('rgba(0,0,0,0.07)','rgba(255,255,255,0.05)'):
                    phase==='speaking' ?`radial-gradient(circle at 35% 30%,${accent}22,${accent}06)`:
                    d('rgba(0,0,0,0.07)','rgba(255,255,255,0.07)'),
                  border:`2px solid ${phase==='listening'?'#4a9b8e':phase==='thinking'?'#8b7cc8':phase==='speaking'?accent:d('rgba(0,0,0,0.18)','rgba(255,255,255,0.18)')}`,
                  boxShadow:phase==='listening'?'0 0 32px rgba(74,155,142,0.25)':phase==='speaking'?`0 0 32px ${accent}22`:'none',
                  opacity:(isMuted||phase==='thinking'||phase==='speaking')?0.32:1,
                  cursor:(isMuted||phase==='thinking'||phase==='speaking')?'not-allowed':'pointer',
                  backdropFilter:'blur(12px)',
                }}>
                <Mic style={{width:28,height:28,color:phase==='listening'?'#4a9b8e':phase==='thinking'?'#8b7cc8':phase==='speaking'?accent:d('rgba(0,0,0,0.5)','rgba(255,255,255,0.55)'),transition:'color 0.25s'}}/>
              </button>

              {/* End */}
              <button onClick={endSession} style={{
                width:50,height:50,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',
                background:'rgba(180,84,84,0.12)',
                border:'1.5px solid rgba(180,84,84,0.3)',
                backdropFilter:'blur(10px)',
                transition:'all 0.15s',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(180,84,84,0.2)')}
              onMouseLeave={e=>(e.currentTarget.style.background='rgba(180,84,84,0.12)')}>
                <PhoneOff style={{width:19,height:19,color:'rgba(180,84,84,0.78)'}}/>
              </button>
            </div>

            {/* Hint — directly below controls, at the very bottom */}
            <p style={{
              fontSize:13,letterSpacing:'0.05em',textTransform:'uppercase',
              color:
                phase==='listening'?'#4a9b8e':
                phase==='thinking' ?'#8b7cc8':
                phase==='speaking' ?accent:
                d('rgba(0,0,0,0.32)','rgba(255,255,255,0.32)'),
              transition:'color 0.4s',
            }}>
              {phase==='listening'?'Recording · release when done':
               phase==='thinking' ?'Oracle is responding…':
               phase==='speaking' ?'Oracle is speaking':
               'Hold to speak · release to send'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────
export default function VoiceSession() {
  const params = useParams()
  const toolId = params.toolId as string
  const tool   = getVoiceToolById(toolId)

  if(!tool) return(
    <div style={{minHeight:'100vh',background:'#0d0b0f',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(154,140,122,0.5)',fontFamily:'Georgia,serif'}}>
      <p>Tool not found: <strong>{toolId}</strong></p>
    </div>
  )

  const toolMeta: ToolMeta = {
    id:tool.id, name:tool.name, emoji:tool.emoji, tagline:tool.tagline,
    domain:TOOL_DOMAIN[toolId]??'all', type:'voice', price:tool.price,
  }

  return(
    <ToolShell tool={toolMeta} isVoice={true}>
      <VoiceInner toolId={toolId} tool={tool as VoiceTool}/>
    </ToolShell>
  )
}
