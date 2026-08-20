'use client'
/**
 * components/sessions/ChatSession.tsx  — v2
 * ==========================================
 * Sacred Script — premium messaging interface.
 * 16px message text, frosted glass bubbles,
 * full light/dark mode, domain glow background.
 *
 * v2.1, real bug fix, the fallback below pointed at localhost, the
 * same category of bug already found and fixed across several files
 * tonight. Both actual endpoint calls in this file, /api/reading/job/
 * latest and /agency/chat, were already checked directly against
 * main.py's real, current routes and confirmed exact matches, nothing
 * else needed changing here, the real crash this file was hitting
 * earlier came from lib/constants/sacred-script-tools.ts missing
 * getLimitStatus, getResponseDepthInstruction, getMemoryInstruction,
 * and the limits field entirely, already fixed separately.
 */
import {
  useState, useEffect, useRef, useCallback
} from 'react'
import { useParams, useRouter }            from 'next/navigation'
import { useAuth }                         from '@/lib/hooks/useAuth'
import { useThemeMode }                    from '@/lib/hooks/useThemeMode'
import { getSacredScriptToolById }         from '@/lib/constants/sacred-script-tools'
import {
  getLimitStatus,
  getResponseDepthInstruction,
  getMemoryInstruction,
  type SacredScriptTool,
} from '@/lib/constants/sacred-script-tools'
import ToolShell, {
  useToolShell,
  type ToolMeta,
} from '@/components/tool-shell/ToolShell'
import {
  Send, Sparkles, Copy, Check,
  RotateCcw, Bookmark, AlertTriangle, Lock, RefreshCw,
} from 'lucide-react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.kayalsoulpath.com').replace(/\/$/, '')

const TOOL_SCOPE: Record<string,string> = {
  'the-life-scribe':'all','love-scribe':'love','wealth-scribe':'wealth',
  'spiritual-scribe':'spiritual','health-scribe':'health','purpose-scribe':'purpose',
  'relationship-scribe':'love','grief-scribe':'grief',
  'parenting-scribe':'all','business-scribe':'wealth',
}
const DOMAIN_ACCENT: Record<string,string> = {
  love:'#d4856a',wealth:'#c9a96e',spiritual:'#a48ac4',
  health:'#7aaa8a',purpose:'#7a9ac4',timing:'#a0c49a',
  grief:'#8a9aaa',all:'#c9a96e',
}
const QUICK_PROMPTS: Record<string,string[]> = {
  'the-life-scribe':     ['What does my chart say right now?','What pattern keeps returning?','What does my Personal Year ask?','What is the most important move?'],
  'love-scribe':         ['What is my love pattern?','Why does the same pain return?','What does my Venus placement mean?','When does my love window open?'],
  'wealth-scribe':       ['What is my income ceiling?','What is my wealth channel?','Is now the time to move?','What does my Founder Archetype say?'],
  'spiritual-scribe':    ['What stage am I in?','What shadow is active now?','What practice does my tradition suggest?','What are my spiritual gifts?'],
  'health-scribe':       ['What does my constitution need?','Why is my energy low?','What to avoid this season?','What does my vitality pattern say?'],
  'purpose-scribe':      ['What am I here to do?','What does this Pinnacle ask?','What is blocking my calling?','What is my next step?'],
  'relationship-scribe': ['What is the root of our conflict?','What does the karmic contract say?',"What does my partner's chart need?",'Where is this heading?'],
  'grief-scribe':        ['How does my chart process loss?','Where am I in grief?','What practice helps now?','What is beneath this grief?'],
  'parenting-scribe':    ["What does my child's chart need?",'Why do we have this conflict?','What communication do they need?','What milestone is coming?'],
  'business-scribe':     ['Is now the right time to launch?','What business model fits my chart?','What is my Founder Archetype?','What is my highest leverage move?'],
}

// ─────────────────────────────────────────────────────────────
// Message limit storage
// ─────────────────────────────────────────────────────────────
interface MsgRecord { count:number; resetDate:string; nextReset:string }
function getRecord(uid:string,tid:string):MsgRecord{
  try{
    const raw=localStorage.getItem(`kayal_msg_${uid}_${tid}`)
    if(!raw) return newRec()
    const r:MsgRecord=JSON.parse(raw)
    if(new Date()>=new Date(r.nextReset)){const n=newRec(r.nextReset);saveRec(uid,tid,n);return n}
    return r
  }catch{return newRec()}
}
function newRec(from?:string):MsgRecord{
  const s=from?new Date(from):new Date(),n=new Date(s);n.setMonth(n.getMonth()+1)
  return{count:0,resetDate:s.toISOString().slice(0,10),nextReset:n.toISOString().slice(0,10)}
}
function saveRec(uid:string,tid:string,r:MsgRecord){try{localStorage.setItem(`kayal_msg_${uid}_${tid}`,JSON.stringify(r))}catch{/**/}}
function incRec(uid:string,tid:string):MsgRecord{const r=getRecord(uid,tid);r.count++;saveRec(uid,tid,r);return r}
function fmtDate(iso:string):string{return new Date(iso).toLocaleDateString('en-US',{month:'long',day:'numeric'})}

// ─────────────────────────────────────────────────────────────
// Synthesis
// ─────────────────────────────────────────────────────────────
interface SynthCtx{first_name:string;full_name:string;birth_location:string|null;has_synthesis:boolean;has_face:boolean;has_palm:boolean;pills:string[];job_id:string|null;history_block:string}
async function loadSynthesis(userId:string,tool:SacredScriptTool,signal?:AbortSignal):Promise<SynthCtx>{
  const scope=TOOL_SCOPE[tool.id]??'all'
  const empty:SynthCtx={first_name:'Seeker',full_name:'',birth_location:null,has_synthesis:false,has_face:false,has_palm:false,pills:[],job_id:null,history_block:''}
  try{
    const res=await fetch(`${API_BASE}/api/reading/job/latest?user_id=${userId}`,{signal})
    if(!res.ok) return empty
    const data=await res.json(); if(!data?.result) return empty
    const r=data.result,num=r.numerology??{},cyc=num.time_cycles??{}
    const fullName=r.full_name??'',firstName=fullName.split(' ')[0]||'Seeker'
    const lp=r.life_path??num.core?.life_path??null,su=r.soul_urge??num.core?.soul_urge??null
    const sun=r.sun_sign??null,py=r.personal_year??cyc.personal_year??null
    const pm=r.personal_month??cyc.personal_month??null,pin=num.pinnacles?.current?.number??null
    const hasFace=!!(r.face_analysis?.archetype||r.face_archetype)
    const hasPalm=!!(r.palm_analysis?.element||r.palm_element)
    const face=r.face_archetype??r.face_analysis?.archetype??null
    const palm=r.palm_element??r.palm_analysis?.element??null
    const loc=r.birth_location??null
    const bl=typeof loc==='object'?loc?.place_name??loc?.city??null:loc
    const pills:string[]=[]
    if(lp)pills.push(`Life Path ${lp}`)
    if(su)pills.push(`Soul ${su}`)
    if(sun)pills.push(`☉ ${sun}`)
    if(py)pills.push(`PY ${py}`)
    if(pm)pills.push(`PM ${pm}`)
    if(pin)pills.push(`Pinnacle ${pin}`)
    if(hasFace&&face)pills.push(face)
    if(hasPalm&&palm)pills.push(`Palm · ${palm}`)
    const lines=[
      `KAYAL SYNTHESIS — ${fullName}`,`Tool: ${tool.name} ($${tool.price}/mo)`,'',
      `Name: ${fullName}`,
      data.date_of_birth?`DOB: ${data.date_of_birth}`:'',
      bl?`Location: ${bl}`:'','',
      lp?`Life Path: ${lp}${[11,22,33].includes(lp)?' ✦':''}`:'',
      su?`Soul Urge: ${su}`:'',
      sun?`Sun: ${sun}`:'',r.moon_sign?`Moon: ${r.moon_sign}`:'',r.rising_sign?`Rising: ${r.rising_sign}`:'','',
      'TIMING:',
      py?`Personal Year ${py}: ${cyc.personal_year_theme??''}`:'',
      pm?`Personal Month ${pm}: ${cyc.personal_month_theme??''}`:'',
      pin?`Pinnacle ${pin}: ${num.pinnacles?.current?.theme??''}`:'','',
      !hasFace&&!hasPalm?'No face or palm reading. Do not reference physical features.':'',
      hasFace&&face?`Face: ${face}`:'', hasPalm&&palm?`Palm: ${palm}`:'','',
    ]
    const ds=r.domain_sections??{}
    if(tool.limits.synthesisScope==='domain-only'){
      const sec=ds[scope]??ds[scope.replace('-','_')]??null
      if(sec)lines.push(`${scope.toUpperCase()} DOMAIN:`,sec.slice(0,2500),'')
    }else{
      if(r.reading)lines.push('FULL SYNTHESIS:',r.reading.slice(0,4500),'')
      for(const[dom,text]of Object.entries(ds))if(text&&typeof text==='string')lines.push(`${dom.toUpperCase()}:`,(text as string).slice(0,800),'')
    }
    lines.push('INSTRUCTIONS:',`First name: ${firstName}. Use naturally.`,'Every response must be specific to this person.',
      tool.limits.domainScope.includes('all')?'All domains in scope.':`Domain scope: ${tool.limits.domainScope.join(', ')} only.`,'',
      getResponseDepthInstruction(tool),getMemoryInstruction(tool),'',
      'Write in paragraphs. No bullets unless asked. No headers. Speak as the scribe.',
    )
    return{first_name:firstName,full_name:fullName,birth_location:bl,has_synthesis:true,has_face:hasFace,has_palm:hasPalm,pills,job_id:data.id??null,history_block:lines.filter(Boolean).join('\n')}
  }catch(e:any){if(e?.name==='AbortError')throw e;return empty}
}
function saveInsight(content:string,tool:SacredScriptTool,sessionId:string|null){
  try{
    const saved=JSON.parse(localStorage.getItem('kayal_saved_insights')??'[]')
    saved.unshift({id:`${Date.now()}`,content,source_tool:tool.name,tool_emoji:tool.emoji,domain:TOOL_SCOPE[tool.id]??'all',type:'insight',session_id:sessionId,saved_at:new Date().toISOString()})
    localStorage.setItem('kayal_saved_insights',JSON.stringify(saved.slice(0,200)))
  }catch{/**/}
}
interface Turn{id:string;role:'user'|'scribe';content:string;timestamp:Date;streaming?:boolean;out_of_scope?:boolean;redirect?:string}

// ─────────────────────────────────────────────────────────────
// Limit banner
// ─────────────────────────────────────────────────────────────
function LimitBanner({status,remaining,graceRemaining,nextReset,accent,tool,isDark,onUpsell}:{status:'warning'|'grace'|'blocked';remaining:number;graceRemaining:number;nextReset:string;accent:string;tool:SacredScriptTool;isDark:boolean;onUpsell:()=>void}){
  const d=(l:string,dk:string)=>isDark?dk:l
  if(status==='blocked')return(
    <div style={{margin:'8px 14px',padding:'14px 16px',borderRadius:16,background:'rgba(180,84,84,0.09)',border:'1px solid rgba(180,84,84,0.22)',backdropFilter:'blur(10px)',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Lock style={{width:14,height:14,color:'rgba(180,84,84,0.78)',flexShrink:0}}/><p style={{fontSize:15,fontFamily:"'Cormorant Garamond',Georgia,serif",color:d('rgba(30,22,12,0.85)','rgba(239,230,214,0.85)')}}>Monthly limit reached</p></div>
      <p style={{fontSize:14,color:d('rgba(80,65,45,0.7)','rgba(154,140,122,0.72)'),lineHeight:1.6,marginBottom:10}}>All {tool.limits.messagesPerMonth} messages used. Resets on <span style={{color:accent}}>{fmtDate(nextReset)}</span>.</p>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><RefreshCw style={{width:12,height:12,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.3)')}}/><span style={{fontSize:13,color:d('rgba(0,0,0,0.35)','rgba(255,255,255,0.3)')}}>Resets {fmtDate(nextReset)}</span></div>
        {tool.upsell&&<button onClick={onUpsell} style={{padding:'6px 14px',borderRadius:10,background:`${accent}14`,border:`1px solid ${accent}28`,color:accent,fontSize:13,cursor:'pointer',fontFamily:"'Cormorant SC',Georgia,serif",letterSpacing:'0.06em',textTransform:'uppercase'}}>Upgrade — ${tool.upsell.price}/mo</button>}
      </div>
    </div>
  )
  if(status==='grace')return(
    <div style={{margin:'6px 14px',padding:'10px 14px',borderRadius:12,background:'rgba(180,84,84,0.07)',border:'1px solid rgba(180,84,84,0.18)',display:'flex',alignItems:'center',gap:8,flexShrink:0,backdropFilter:'blur(8px)'}}>
      <AlertTriangle style={{width:13,height:13,color:'rgba(180,84,84,0.75)',flexShrink:0}}/>
      <p style={{fontSize:14,color:'rgba(180,84,84,0.85)',flex:1}}>Limit reached · <strong>{graceRemaining} grace {graceRemaining===1?'message':'messages'} remaining</strong> · Resets {fmtDate(nextReset)}</p>
      {tool.upsell&&<button onClick={onUpsell} style={{fontSize:13,color:'rgba(180,84,84,0.75)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline',whiteSpace:'nowrap'}}>Upgrade</button>}
    </div>
  )
  return(
    <div style={{margin:'6px 14px',padding:'10px 14px',borderRadius:12,background:`${accent}09`,border:`1px solid ${accent}1c`,display:'flex',alignItems:'center',gap:8,flexShrink:0,backdropFilter:'blur(8px)'}}>
      <AlertTriangle style={{width:13,height:13,color:accent,flexShrink:0}}/>
      <p style={{fontSize:14,color:`${accent}cc`,flex:1}}><strong>{remaining} {remaining===1?'message':'messages'} remaining</strong> this month · Resets {fmtDate(nextReset)}</p>
      {tool.upsell&&<button onClick={onUpsell} style={{fontSize:13,color:accent,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',whiteSpace:'nowrap'}}>Upgrade</button>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Chat inner
// ─────────────────────────────────────────────────────────────
function ChatInner({toolId,tool}:{toolId:string;tool:SacredScriptTool}){
  const{user,isLoading:authLoading,isAuthenticated}=useAuth()
  const router=useRouter()
  const shell=useToolShell()
  const{isDark}=useThemeMode()
  const scope=TOOL_SCOPE[toolId]??'all'
  const accent=DOMAIN_ACCENT[scope]??'#c9a96e'
  const d=(l:string,dk:string)=>isDark?dk:l
  const[synthesis,setSynthesis]=useState<SynthCtx|null>(null)
  const[turns,setTurns]=useState<Turn[]>([])
  const[input,setInput]=useState('')
  const[isSending,setIsSending]=useState(false)
  const[isIniting,setIsIniting]=useState(true)
  const[errorMsg,setErrorMsg]=useState<string|null>(null)
  const[copiedId,setCopiedId]=useState<string|null>(null)
  const[savedId,setSavedId]=useState<string|null>(null)
  const[msgRecord,setMsgRecord]=useState<MsgRecord|null>(null)
  const bottomRef=useRef<HTMLDivElement>(null)
  const inputRef=useRef<HTMLTextAreaElement>(null)
  const turnsRef=useRef<Turn[]>([])
  const synthRef=useRef<SynthCtx|null>(null)
  useEffect(()=>{turnsRef.current=turns},[turns])
  useEffect(()=>{synthRef.current=synthesis},[synthesis])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[turns])
  useEffect(()=>{if(!user?.id)return;setMsgRecord(getRecord(user.id,toolId))},[user?.id,toolId])
  useEffect(()=>{
    if(authLoading)return
    if(!isAuthenticated||!user?.id){setIsIniting(false);return}
    const ctrl=new AbortController();let cancelled=false
    loadSynthesis(user.id,tool,ctrl.signal).then(syn=>{
      if(cancelled)return
      setSynthesis(syn)
      setTurns([{id:'welcome',role:'scribe',content:syn.has_synthesis?`Your synthesis is loaded, ${syn.first_name}. ${tool.tagline} — ask me anything.`:`${tool.tagline} — ask me anything.`,timestamp:new Date()}])
      setIsIniting(false)
    }).catch(err=>{if(cancelled||err?.name==='AbortError')return;setIsIniting(false)})
    return()=>{cancelled=true;ctrl.abort()}
  },[user?.id,authLoading,isAuthenticated])
  useEffect(()=>{
    if(shell.loadedHistory.length===0)return
    const loaded:Turn[]=shell.loadedHistory.filter(h=>!(h.role==='assistant'&&h.content.includes('KAYAL SYNTHESIS'))).map(h=>({id:`${Date.now()}-${Math.random()}`,role:h.role==='user'?'user':'scribe',content:h.content,timestamp:new Date()}))
    if(loaded.length>0)setTurns(loaded)
  },[shell.loadedHistory])
  const limitStatus=msgRecord?getLimitStatus(tool,msgRecord.count):null
  const isBlocked=limitStatus?.status==='blocked'
  const handleSend=useCallback(async(override?:string)=>{
    const message=(override??input).trim()
    if(!message||isSending||!user?.id)return
    if(!isAuthenticated){setErrorMsg('Please sign in.');router.push('/auth/login');return}
    if(isBlocked)return
    setInput('');setErrorMsg(null);setIsSending(true)
    shell.setAmbientState('thinking')
    const newRec=incRec(user.id,toolId);setMsgRecord(newRec)
    const uid_=`${Date.now()}-${Math.random().toString(36).slice(2,7)}`
    const scribeId=`${Date.now()+1}-${Math.random().toString(36).slice(2,7)}`
    setTurns(prev=>[...prev,{id:uid_,role:'user',content:message,timestamp:new Date()}])
    setTurns(prev=>[...prev,{id:scribeId,role:'scribe',content:'',timestamp:new Date(),streaming:true}])
    try{
      const syn=synthRef.current
      const history:Array<{role:string;content:string}>=[]
      if(syn?.history_block)history.push({role:'assistant',content:syn.history_block})
      for(const t_ of turnsRef.current){if(t_.streaming||!t_.content.trim())continue;history.push({role:t_.role==='user'?'user':'assistant',content:t_.content})}
      history.push({role:'user',content:message})
      const res=await fetch(`${API_BASE}/agency/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id,tool_id:toolId,message,history,job_id:syn?.job_id??null})})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.detail??`Error ${res.status}`)}
      const result=await res.json()
      if('error' in result){
        setTurns(prev=>prev.map(t_=>t_.id===scribeId?{...t_,content:result.message,streaming:false}:t_))
        setErrorMsg(result.message)
      }else{
        const full=result.response;let displayed=''
        const reveal=()=>{
          if(displayed.length<full.length){
            displayed=full.slice(0,Math.min(displayed.length+14,full.length))
            setTurns(prev=>prev.map(t_=>t_.id===scribeId?{...t_,content:displayed,streaming:true}:t_))
            requestAnimationFrame(reveal)
          }else{
            setTurns(prev=>prev.map(t_=>t_.id===scribeId?{...t_,content:full,streaming:false,out_of_scope:!result.in_scope,redirect:result.redirect}:t_))
            shell.setTurnCount(c=>c+1)
          }
        }
        requestAnimationFrame(reveal)
      }
    }catch(e:any){
      setTurns(prev=>prev.map(t_=>t_.id===scribeId?{...t_,content:'The scribe is momentarily unavailable. Please try again.',streaming:false}:t_))
      setErrorMsg(e.message)
    }finally{setIsSending(false);shell.setAmbientState('idle');setTimeout(()=>inputRef.current?.focus(),80)}
  },[input,isSending,user?.id,toolId,isAuthenticated,router,shell,isBlocked])
  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}
  const handleCopy=useCallback((id:string,text:string)=>{navigator.clipboard.writeText(text);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000)},[])
  const handleSave=useCallback((id:string,text:string)=>{saveInsight(text,tool,shell.sessionId);setSavedId(id);setTimeout(()=>setSavedId(null),2000);shell.setTurnCount(c=>c+1)},[tool,shell])
  const handleClear=useCallback(()=>{const syn=synthRef.current;setTurns([{id:`${Date.now()}`,role:'scribe',content:syn?.has_synthesis?`Your synthesis is still loaded, ${syn.first_name}. What else would you like to explore?`:'New conversation started.',timestamp:new Date()}]);setErrorMsg(null)},[])
  const prompts=QUICK_PROMPTS[toolId]??QUICK_PROMPTS['the-life-scribe']
  if(!authLoading&&!isAuthenticated)return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',gap:16}}>
      <div style={{fontSize:48}}>{tool.emoji}</div>
      <p style={{fontSize:22,fontFamily:"'Cormorant Garamond',Georgia,serif",color:d('rgba(30,22,12,0.85)','rgba(239,230,214,0.88)'),textAlign:'center'}}>Sign in to continue</p>
      <button onClick={()=>router.push('/auth/login')} style={{padding:'13px 30px',borderRadius:16,background:accent,color:'#1a1200',fontSize:15,cursor:'pointer',border:'none',fontFamily:"'Cormorant SC',Georgia,serif",letterSpacing:'0.06em',textTransform:'uppercase',boxShadow:`0 4px 20px ${accent}28`}}>Sign In</button>
    </div>
  )
  if(authLoading||isIniting)return(
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
      <div style={{fontSize:42}}>{tool.emoji}</div>
      <p style={{fontSize:13,letterSpacing:'0.08em',textTransform:'uppercase',color:`${accent}88`}}>Loading your synthesis…</p>
    </div>
  )
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Synthesis badge */}
      <div style={{padding:'10px 14px 6px',flexShrink:0}}>
        {synthesis?.has_synthesis?(
          <div style={{padding:'9px 14px',borderRadius:14,background:isDark?`${accent}0d`:`${accent}0a`,border:`1px solid ${accent}1e`,backdropFilter:'blur(12px)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <Sparkles style={{width:13,height:13,color:accent,flexShrink:0}}/>
              <span style={{fontSize:14,color:`${accent}cc`,flex:1,fontFamily:"'EB Garamond',Georgia,serif"}}>{synthesis.first_name}{synthesis.birth_location?` · ${synthesis.birth_location}`:''}</span>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {msgRecord&&limitStatus&&<span style={{fontSize:12,color:limitStatus.status==='blocked'?'rgba(180,84,84,0.75)':limitStatus.status==='warning'?`${accent}99`:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.22)'),fontFamily:'monospace'}}>{msgRecord.count}/{tool.limits.messagesPerMonth}</span>}
                <span style={{fontSize:12,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.22)')}}>${tool.price}/mo</span>
                <button onClick={handleClear} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center'}}><RotateCcw style={{width:13,height:13,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.25)')}}/></button>
              </div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {synthesis.pills.map(p=><span key={p} style={{fontSize:13,padding:'2px 9px',borderRadius:999,background:`${accent}10`,color:`${accent}cc`,border:`1px solid ${accent}1e`}}>{p}</span>)}
            </div>
          </div>
        ):(
          <div style={{padding:'8px 14px',borderRadius:12,background:d('rgba(0,0,0,0.04)','rgba(255,255,255,0.04)'),border:`1px solid ${d('rgba(0,0,0,0.08)','rgba(255,255,255,0.07)')}`,textAlign:'center',backdropFilter:'blur(8px)'}}>
            <p style={{fontSize:14,color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.32)')}}>Complete a reading for a fully personalised session</p>
          </div>
        )}
      </div>
      {/* Limit banner */}
      {limitStatus&&limitStatus.status!=='ok'&&msgRecord&&(
        <LimitBanner status={limitStatus.status} remaining={limitStatus.remaining} graceRemaining={limitStatus.graceRemaining} nextReset={msgRecord.nextReset} accent={accent} tool={tool} isDark={isDark} onUpsell={()=>router.push(`/domain/sacred-script/${tool.upsell?.id}`)}/>
      )}
      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:14,minHeight:0,scrollbarWidth:'thin',scrollbarColor:`${accent}18 transparent`}}>
        {turns.map(turn=>(
          <div key={turn.id} style={{display:'flex',gap:9,justifyContent:turn.role==='user'?'flex-end':'flex-start',alignItems:'flex-end'}}>
            {turn.role==='scribe'&&<div style={{width:30,height:30,borderRadius:'50%',background:`${accent}0e`,border:`1px solid ${accent}1e`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,marginBottom:2}}>{tool.emoji}</div>}
            <div style={{maxWidth:'78%'}}>
              <div style={{
                padding:'11px 15px',borderRadius:18,fontSize:16,lineHeight:1.68,
                fontFamily:"'EB Garamond',Georgia,serif",
                ...(turn.role==='scribe'?{
                  background:   d('rgba(255,255,255,0.82)','rgba(255,255,255,0.07)'),
                  border:       `1px solid ${d('rgba(0,0,0,0.08)',`${accent}14`)}`,
                  color:        d('rgba(30,22,12,0.88)','rgba(218,206,190,0.94)'),
                  borderBottomLeftRadius:4,
                  backdropFilter:'blur(14px)',
                  boxShadow:    !isDark?'0 2px 8px rgba(0,0,0,0.07)':undefined,
                }:{
                  background:   d(`${accent}16`,'rgba(70,55,110,0.5)'),
                  border:       `1px solid ${d(`${accent}24`,'rgba(110,90,170,0.22)')}`,
                  color:        d('rgba(50,30,10,0.88)','rgba(200,188,222,0.92)'),
                  borderBottomRightRadius:4,
                  backdropFilter:'blur(14px)',
                }),
              }}>
                {turn.streaming?(
                  <>{turn.content}<span style={{display:'inline-block',width:2,height:18,marginLeft:3,borderRadius:1,verticalAlign:'middle',background:accent,opacity:.6,animation:'blink .9s ease-in-out infinite'}}/></>
                ):turn.content}
              </div>
              {turn.out_of_scope&&turn.redirect&&(
                <div style={{marginTop:6,padding:'8px 13px',borderRadius:12,background:d('rgba(0,0,0,0.04)','rgba(255,255,255,0.04)'),border:`1px solid ${accent}14`,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,backdropFilter:'blur(8px)'}}>
                  <span style={{fontSize:14,color:d('rgba(0,0,0,0.45)','rgba(154,140,122,0.58)')}}>Better explored with a different scribe</span>
                  <button onClick={()=>router.push(`/domain/sacred-script/${turn.redirect}`)} style={{fontSize:13,color:accent,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',whiteSpace:'nowrap'}}>Switch</button>
                </div>
              )}
              {!turn.streaming&&(
                <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4,paddingLeft:2,opacity:0,transition:'opacity 0.15s'}} className="msg-actions">
                  <span style={{fontSize:12,color:d('rgba(0,0,0,0.25)','rgba(255,255,255,0.22)'),fontFamily:'monospace'}}>{turn.timestamp.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                  {turn.role==='scribe'&&(
                    <>
                      <button onClick={()=>handleCopy(turn.id,turn.content)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',display:'flex',alignItems:'center'}}>
                        {copiedId===turn.id?<Check style={{width:13,height:13,color:accent}}/>:<Copy style={{width:13,height:13,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.28)')}}/>}
                      </button>
                      <button onClick={()=>handleSave(turn.id,turn.content)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',display:'flex',alignItems:'center'}}>
                        <Bookmark style={{width:13,height:13,color:savedId===turn.id?accent:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.28)'),fill:savedId===turn.id?accent:'none'}}/>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {turn.role==='user'&&<div style={{width:30,height:30,borderRadius:'50%',background:d('rgba(0,0,0,0.08)','rgba(100,90,130,0.25)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(100,90,130,0.22)')}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,flexShrink:0,marginBottom:2,color:d('rgba(0,0,0,0.42)','rgba(255,255,255,0.38)')}}>{(synthesis?.first_name?.[0]??'Y').toUpperCase()}</div>}
          </div>
        ))}
        {isSending&&(
          <div style={{display:'flex',gap:9,alignItems:'flex-end'}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:`${accent}0e`,border:`1px solid ${accent}1e`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{tool.emoji}</div>
            <div style={{padding:'12px 16px',borderRadius:18,borderBottomLeftRadius:4,background:d('rgba(255,255,255,0.82)','rgba(255,255,255,0.07)'),border:`1px solid ${d('rgba(0,0,0,0.08)',`${accent}14`)}`,backdropFilter:'blur(14px)'}}>
              <div style={{display:'flex',gap:5,alignItems:'center',height:20}}>
                {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:'50%',background:accent,opacity:.45,animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Quick prompts */}
      {!isSending&&turns.length<=2&&!isBlocked&&(
        <div style={{padding:'0 14px 6px',display:'flex',gap:6,overflowX:'auto',flexShrink:0,scrollbarWidth:'none'}}>
          {prompts.map(p=>(
            <button key={p} onClick={()=>handleSend(p)} style={{padding:'7px 13px',borderRadius:999,fontSize:14,whiteSpace:'nowrap',flexShrink:0,cursor:'pointer',transition:'all 0.12s',background:d('rgba(0,0,0,0.05)','rgba(255,255,255,0.05)'),border:`1px solid ${d('rgba(0,0,0,0.1)','rgba(255,255,255,0.09)')}`,color:d('rgba(30,22,12,0.6)','rgba(180,168,152,0.65)'),fontFamily:"'EB Garamond',Georgia,serif",backdropFilter:'blur(8px)'}}
              onMouseEnter={e=>{e.currentTarget.style.color=accent;e.currentTarget.style.borderColor=`${accent}28`}}
              onMouseLeave={e=>{e.currentTarget.style.color=d('rgba(30,22,12,0.6)','rgba(180,168,152,0.65)');e.currentTarget.style.borderColor=d('rgba(0,0,0,0.1)','rgba(255,255,255,0.09)')}}>
              {p}
            </button>
          ))}
        </div>
      )}
      {errorMsg&&!isSending&&(
        <div style={{margin:'0 14px 6px',padding:'10px 16px',borderRadius:14,background:'rgba(180,84,84,0.09)',border:'1px solid rgba(180,84,84,0.2)',color:'rgba(180,84,84,0.88)',fontSize:14,textAlign:'center',flexShrink:0,backdropFilter:'blur(8px)'}}>{errorMsg}</div>
      )}
      {/* Input */}
      <div style={{padding:'4px 14px 18px',flexShrink:0}}>
        {isBlocked?(
          <div style={{padding:'14px',borderRadius:18,textAlign:'center',background:d('rgba(0,0,0,0.04)','rgba(255,255,255,0.04)'),border:`1px solid ${d('rgba(0,0,0,0.08)','rgba(255,255,255,0.07)')}`,backdropFilter:'blur(10px)'}}>
            <p style={{fontSize:14,color:d('rgba(0,0,0,0.4)','rgba(255,255,255,0.32)'),marginBottom:2}}>Monthly limit reached</p>
            <p style={{fontSize:13,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.24)')}}>{msgRecord?fmtDate(msgRecord.nextReset):'your billing date'}</p>
          </div>
        ):(
          <div style={{borderRadius:22,background:d('rgba(255,255,255,0.75)','rgba(255,255,255,0.06)'),border:`1px solid ${isSending?`${accent}24`:d('rgba(0,0,0,0.1)','rgba(255,255,255,0.1)')}`,backdropFilter:'blur(16px)',boxShadow:!isDark?'0 2px 12px rgba(0,0,0,0.08)':undefined,transition:'border-color 0.2s'}}>
            <textarea ref={inputRef} value={input} onChange={e=>{setInput(e.target.value);shell.setAmbientState(e.target.value?'typing':'idle')}} onKeyDown={handleKeyDown} onBlur={()=>{if(!isSending)shell.setAmbientState('idle')}} placeholder={`Write to ${tool.name}…`} disabled={isSending} rows={1}
              style={{width:'100%',background:'transparent',padding:'13px 50px 11px 16px',fontSize:16,lineHeight:1.62,fontFamily:"'EB Garamond',Georgia,serif",color:d('rgba(30,22,12,0.88)','rgba(218,206,188,0.9)'),resize:'none',outline:'none',border:'none',minHeight:48,maxHeight:160,overflowY:'auto',scrollbarWidth:'none',caretColor:accent}}
              onInput={e=>{const el=e.currentTarget;el.style.height='auto';el.style.height=`${Math.min(el.scrollHeight,160)}px`}}
            />
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2px 12px 12px'}}>
              <span style={{fontSize:13,color:d('rgba(0,0,0,0.3)','rgba(255,255,255,0.24)')}}>{input.length>0?`${input.length} chars`:'Enter to send · Shift+Enter for new line'}</span>
              <button onClick={()=>handleSend()} disabled={!input.trim()||isSending} style={{width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:input.trim()&&!isSending?`linear-gradient(135deg,${accent}ee,${accent}99)`:'transparent',border:`1px solid ${input.trim()&&!isSending?'transparent':d('rgba(0,0,0,0.12)','rgba(255,255,255,0.12)')}`,cursor:input.trim()&&!isSending?'pointer':'default',opacity:(!input.trim()||isSending)?0.3:1,transition:'all 0.15s',boxShadow:input.trim()&&!isSending?`0 2px 10px ${accent}28`:undefined}}>
                <Send style={{width:14,height:14,color:input.trim()&&!isSending?'#1a1200':d('rgba(0,0,0,0.4)','rgba(255,255,255,0.38)')}}/>
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        .msg-actions:hover{opacity:1!important}
        div:hover>.msg-actions{opacity:1!important}
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────
export default function ChatSession() {
  const params=useParams()
  const toolId=params.toolId as string
  const tool=getSacredScriptToolById(toolId)
  if(!tool)return(
    <div style={{minHeight:'100vh',background:'#0d0b0f',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(154,140,122,0.5)',fontFamily:'Georgia,serif'}}>
      <p>Tool not found: <strong>{toolId}</strong></p>
    </div>
  )
  const toolMeta:ToolMeta={id:tool.id,name:tool.name,emoji:tool.emoji,tagline:tool.tagline,domain:TOOL_SCOPE[toolId]??'all',type:'chat',price:tool.price}
  return(
    <ToolShell tool={toolMeta} isVoice={false}>
      <ChatInner toolId={toolId} tool={tool}/>
    </ToolShell>
  )
}
