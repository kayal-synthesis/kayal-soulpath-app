'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Star, Heart, Compass, Moon, Infinity, Feather,
  ChevronRight, ChevronLeft, Play, Pause, Volume2, VolumeX,
  Share2, X, Check, Download,
} from 'lucide-react'
import type { WelcomeCard } from '@/lib/welcome/paragraph-library'

// ── Design tokens ─────────────────────────────────────────────
const C = {
  parchment:    '#faf7f2',
  white:        '#ffffff',
  purple:       '#2d1b69',
  purpleMid:    '#4c2a9e',
  purpleLight:  '#7c3aed',
  purplePale:   '#f3f0ff',
  purpleFaint:  'rgba(124,58,237,0.07)',
  purpleBorder: 'rgba(124,58,237,0.18)',
  gold:         '#b8943f',
  goldLight:    '#d4af6e',
  goldFaint:    'rgba(184,148,63,0.1)',
  goldBorder:   'rgba(184,148,63,0.28)',
  text:         '#1a1714',
  textSub:      '#6b6560',
  textFaint:    'rgba(26,23,20,0.36)',
  border:       'rgba(26,23,20,0.08)',
  serif:        'Georgia, "Times New Roman", serif',
  sans:         '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

// ── Per-section gradient config ───────────────────────────────
const sectionConfig: Record<string, {
  gradient: string; accentColor: string; symbol: string; bgLight: string
}> = {
  'Before We Begin':           { gradient:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,    accentColor:C.purpleLight, symbol:'✦', bgLight:'#f3f0ff' },
  'Who You Are':               { gradient:`linear-gradient(135deg,#1e1b4b,#4c2a9e)`,                 accentColor:'#818cf8',     symbol:'◈', bgLight:'#eef2ff' },
  'Your Greatest Gift':        { gradient:`linear-gradient(135deg,#78350f,${C.gold})`,               accentColor:C.gold,        symbol:'★', bgLight:'#fffbeb' },
  'Your Core Challenge':       { gradient:`linear-gradient(135deg,#1e3a5f,#1d4ed8)`,                 accentColor:'#60a5fa',     symbol:'◇', bgLight:'#eff6ff' },
  'Love and Connection':       { gradient:`linear-gradient(135deg,#7f1d1d,#dc2626)`,                 accentColor:'#f87171',     symbol:'♡', bgLight:'#fff1f2' },
  'Money and Purpose':         { gradient:`linear-gradient(135deg,#064e3b,#059669)`,                 accentColor:'#34d399',     symbol:'◆', bgLight:'#ecfdf5' },
  'Right Now':                 { gradient:`linear-gradient(135deg,${C.purpleMid},#7c3aed)`,          accentColor:'#c084fc',     symbol:'○', bgLight:'#faf5ff' },
  'Where This Is All Leading': { gradient:`linear-gradient(135deg,#1e1b4b,#312e81)`,                 accentColor:'#818cf8',     symbol:'∞', bgLight:'#eef2ff' },
  'Your Verdict':              { gradient:`linear-gradient(135deg,${C.purple},${C.gold})`,            accentColor:C.goldLight,   symbol:'✦', bgLight:'#fffbeb' },
}

const defaultConfig = {
  gradient:    `linear-gradient(135deg,${C.purple},${C.purpleLight})`,
  accentColor: C.purpleLight,
  symbol:      '✦',
  bgLight:     '#f3f0ff',
}

// ── Icon map ──────────────────────────────────────────────────
const iconMap: Record<string, any> = {
  Sparkles, Star, Heart, Compass, Moon, Feather,
  Infinity: Infinity,
}

// ── Progress pills ────────────────────────────────────────────
function ProgressPills({
  total, current, accentColor,
}: { total: number; current: number; accentColor: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 5, borderRadius: 99,
            transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
            width:      i === current ? 22 : 5,
            background: i < current
              ? 'rgba(255,255,255,0.6)'
              : i === current
              ? C.white
              : 'rgba(255,255,255,0.22)',
            boxShadow: i === current ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ── Header icon button ────────────────────────────────────────
function HeaderBtn({
  onClick, title, active, children,
}: {
  onClick: () => void; title?: string; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width:30, height:30, borderRadius:8, border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        background: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.9)',
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

// ── Body icon button ──────────────────────────────────────────
function BodyBtn({
  onClick, title, active, activeColor, successGreen, children,
}: {
  onClick: () => void; title?: string
  active?: boolean; activeColor?: string; successGreen?: boolean
  children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:32, height:32, borderRadius:9, border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        background: successGreen && active
          ? 'rgba(21,128,61,0.1)'
          : active
          ? C.purpleFaint
          : hov ? 'rgba(26,23,20,0.06)' : 'transparent',
        color: successGreen && active
          ? '#15803d'
          : active
          ? (activeColor || C.purpleLight)
          : hov ? C.textSub : C.textFaint,
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────
interface WelcomeModalProps {
  isOpen:    boolean
  onClose:   () => void
  cards:     WelcomeCard[]
  firstName: string
  fullName:  string
}

export function WelcomeModal({
  isOpen, onClose, cards, firstName, fullName,
}: WelcomeModalProps) {
  const [current,    setCurrent]    = useState(0)
  const [direction,  setDirection]  = useState(1)
  const [isPlaying,  setIsPlaying]  = useState(false)
  const [isMuted,    setIsMuted]    = useState(false)
  const [shared,     setShared]     = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)
  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null)
  const scrollRef     = useRef<HTMLDivElement>(null)
  const autoPlayedRef = useRef<Set<number>>(new Set())

  const card    = cards[current]
  const isLast  = current === cards.length - 1
  const cfg     = sectionConfig[card?.section] || defaultConfig
  const IconComp = iconMap[card?.icon] || Sparkles

  // ── Inject CSS once ───────────────────────────────────────
  useEffect(() => {
    const id = 'kayal-modal-css'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes kayal-eq {
        from { transform: scaleY(0.15); opacity: 0.35; }
        to   { transform: scaleY(1);    opacity: 1;    }
      }
      @keyframes kayal-glow {
        0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); }
        50%      { box-shadow: 0 0 0 8px rgba(124,58,237,0); }
      }
      @keyframes kayal-orb {
        0%,100% { transform: translate(0,0) scale(1); }
        50%      { transform: translate(12px,-16px) scale(1.06); }
      }
      .kayal-scroll::-webkit-scrollbar { width: 3px; }
      .kayal-scroll::-webkit-scrollbar-track { background: transparent; }
      .kayal-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.18); border-radius: 3px; }
    `
    document.head.appendChild(s)
  }, [])

  // ── Wait for voices to be available ───────────────────────
  useEffect(() => {
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesReady(true)
      }
    }
    check()
    window.speechSynthesis?.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', check)
  }, [])

  // ── Stop on close ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis?.cancel()
      setIsPlaying(false)
      setCurrent(0)
      autoPlayedRef.current.clear()
    }
    return () => { window.speechSynthesis?.cancel() }
  }, [isOpen])

  // ── Scroll to top on card change ──────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [current])

  // ── Core speak function ───────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate  = 0.84
    u.pitch = 1.05
    u.volume = isMuted ? 0 : 1
    const voices    = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      (v.lang?.startsWith('en') && v.name.toLowerCase().includes('female'))
    )
    if (preferred) u.voice = preferred
    u.onstart = () => setIsPlaying(true)
    u.onend   = () => setIsPlaying(false)
    u.onerror = () => setIsPlaying(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }, [isMuted])

  // ── Auto-play from card 1 onward (once per card) ──────────
  useEffect(() => {
    if (!isOpen || !card || !voicesReady) return
    // Card 0 = "Before We Begin" — silence, let them read
    if (current === 0) return
    // Only auto-play each card once per session
    if (autoPlayedRef.current.has(current)) return
    autoPlayedRef.current.add(current)
    // Small delay so the card animation settles first
    const timer = setTimeout(() => {
      if (!isMuted) {
        speak(`${card.section}. ${card.paragraphs[0]} ${card.paragraphs.length > 1 ? card.paragraphs[1] : ''}`)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [current, isOpen, voicesReady, card, isMuted, speak])

  // ── Manual play/pause ─────────────────────────────────────
  const handlePlayPause = () => {
    if (!window.speechSynthesis) return
    if (isPlaying) {
      window.speechSynthesis.pause()
      setIsPlaying(false)
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPlaying(true)
    } else {
      speak(`${card.section}. ${card.paragraphs[0]} ${card.paragraphs.length > 1 ? card.paragraphs[1] : ''}`)
    }
  }

  const handleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    if (utteranceRef.current) utteranceRef.current.volume = next ? 0 : 1
    if (isPlaying && next) {
      window.speechSynthesis?.pause()
      setIsPlaying(false)
    }
  }

  const goNext = () => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
    if (current < cards.length - 1) {
      setDirection(1)
      setCurrent(c => c + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
    if (current > 0) {
      setDirection(-1)
      setCurrent(c => c - 1)
    }
  }

  const handleDownload = () => {
    const lines: string[] = [
      `KAYAL SoulPath — Personal Blueprint`,
      `For: ${fullName}`,
      `Date: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}`,
      '', `${'─'.repeat(56)}`,
      `This reading is shown only once inside the app.`,
      `Keep this file as your permanent personal reference.`,
      `${'─'.repeat(56)}`,
    ]
    cards.forEach((c, i) => {
      lines.push('', `${'═'.repeat(56)}`)
      lines.push(`${i + 1}. ${c.section.toUpperCase()}`)
      lines.push(`${'═'.repeat(56)}`, '')
      c.paragraphs.forEach(p => lines.push(p, ''))
    })
    lines.push(`${'─'.repeat(56)}`)
    lines.push(`© ${new Date().getFullYear()} KAYAL SoulPath Institute`)
    lines.push(`app.kayalsoulpath.com`)
    const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `KAYAL-Blueprint-${fullName.replace(/\s+/g,'-')}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  const handleShare = () => {
    const text = encodeURIComponent(
      `I just received my personal soul blueprint on KAYAL SoulPath and the reading is surprisingly accurate. Try yours at https://app.kayalsoulpath.com`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setShared(true)
    setTimeout(() => setShared(false), 3000)
  }

  if (!isOpen || !cards.length) return null

  return (
    <AnimatePresence>
      <motion.div
        key="kayal-backdrop"
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        transition={{ duration:0.25 }}
        style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'16px',
          background:'rgba(20,10,50,0.7)',
          backdropFilter:'blur(12px)',
        }}
      >
        <motion.div
          key="kayal-modal"
          initial={{ opacity:0, y:36, scale:0.95 }}
          animate={{ opacity:1, y:0,  scale:1    }}
          exit={{ opacity:0, y:36, scale:0.95 }}
          transition={{ type:'spring', damping:26, stiffness:300 }}
          style={{
            width:'100%', maxWidth:520,
            maxHeight:'94vh',
            display:'flex', flexDirection:'column',
            background:C.white,
            borderRadius:24,
            overflow:'hidden',
            boxShadow:[
              '0 48px 100px rgba(20,10,50,0.35)',
              '0 8px 24px rgba(20,10,50,0.15)',
              `0 0 0 1px rgba(124,58,237,0.12)`,
            ].join(', '),
          }}
        >

          {/* ── Gradient hero header ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${current}`}
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              exit={{ opacity:0 }}
              transition={{ duration:0.3 }}
              style={{
                background:    cfg.gradient,
                padding:       '18px 18px 0',
                flexShrink:    0,
                position:      'relative',
                overflow:      'hidden',
              }}
            >
              {/* Dot grid overlay */}
              <div style={{
                position:'absolute', inset:0,
                backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.07) 1px,transparent 0)',
                backgroundSize:'22px 22px',
                pointerEvents:'none',
              }} />

              {/* Glow orb */}
              <div style={{
                position:'absolute', width:180, height:180,
                borderRadius:'50%', top:'-50px', right:'-30px',
                background:'radial-gradient(circle,rgba(255,255,255,0.14) 0%,transparent 70%)',
                animation:'kayal-orb 8s ease-in-out infinite',
                pointerEvents:'none',
              }} />

              {/* Second orb bottom left */}
              <div style={{
                position:'absolute', width:120, height:120,
                borderRadius:'50%', bottom:10, left:'-20px',
                background:'radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%)',
                pointerEvents:'none',
              }} />

              {/* Controls row */}
              <div style={{
                display:'flex', alignItems:'center',
                justifyContent:'space-between',
                marginBottom:18, position:'relative', zIndex:2,
              }}>
                <ProgressPills
                  total={cards.length}
                  current={current}
                  accentColor={cfg.accentColor}
                />

                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <HeaderBtn onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Listen'} active={isPlaying}>
                    {isPlaying
                      ? <Pause  style={{ width:13, height:13 }} />
                      : <Play   style={{ width:13, height:13 }} />}
                  </HeaderBtn>
                  <HeaderBtn onClick={handleMute} title={isMuted ? 'Unmute' : 'Mute'} active={isMuted}>
                    {isMuted
                      ? <VolumeX style={{ width:13, height:13 }} />
                      : <Volume2 style={{ width:13, height:13 }} />}
                  </HeaderBtn>
                  <HeaderBtn onClick={handleDownload} title="Download reading" active={downloaded}>
                    {downloaded
                      ? <Check    style={{ width:13, height:13 }} />
                      : <Download style={{ width:13, height:13 }} />}
                  </HeaderBtn>
                  <HeaderBtn onClick={handleShare} title="Share with a friend" active={shared}>
                    {shared
                      ? <Check   style={{ width:13, height:13 }} />
                      : <Share2  style={{ width:13, height:13 }} />}
                  </HeaderBtn>
                  <div style={{ width:1, height:14, background:'rgba(255,255,255,0.22)', margin:'0 4px' }} />
                  <HeaderBtn onClick={onClose} title="Close">
                    <X style={{ width:13, height:13 }} />
                  </HeaderBtn>
                </div>
              </div>

              {/* Section title row */}
              <div style={{
                display:'flex', alignItems:'center', gap:14,
                paddingBottom:20, position:'relative', zIndex:2,
              }}>
                {/* Icon circle */}
                <div style={{
                  width:46, height:46, borderRadius:15, flexShrink:0,
                  background:'rgba(255,255,255,0.2)',
                  border:'1px solid rgba(255,255,255,0.28)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:C.white,
                  boxShadow:'0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
                  <IconComp style={{ width:20, height:20 }} />
                </div>

                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p style={{
                      fontSize:10, color:'rgba(255,255,255,0.6)',
                      margin:0, fontFamily:C.sans,
                      letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600,
                    }}>
                      {current + 1} of {cards.length}
                    </p>
                    {/* Auto-play indicator */}
                    {isPlaying && (
                      <div style={{
                        display:'flex', alignItems:'center', gap:3,
                        padding:'2px 7px', borderRadius:99,
                        background:'rgba(255,255,255,0.18)',
                        border:'1px solid rgba(255,255,255,0.25)',
                      }}>
                        <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:10 }}>
                          {[0.08, 0.18, 0.04, 0.14].map((delay, i) => (
                            <div key={i} style={{
                              width:2, height:'100%',
                              background:'rgba(255,255,255,0.9)',
                              borderRadius:2, transformOrigin:'bottom',
                              animation:`kayal-eq 0.45s ${delay}s ease-in-out infinite alternate`,
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize:9, color:'rgba(255,255,255,0.8)', fontFamily:C.sans, letterSpacing:'0.06em' }}>
                          AUDIO
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 style={{
                    fontSize:20, color:C.white, margin:0,
                    fontFamily:C.serif, fontWeight:400,
                    letterSpacing:'0.01em', lineHeight:1.2,
                    textShadow:'0 1px 8px rgba(0,0,0,0.2)',
                  }}>
                    {card?.section}
                  </h2>
                </div>
              </div>

              {/* Curved white scallop */}
              <div style={{
                height:24,
                background:C.white,
                borderRadius:'50% 50% 0 0 / 24px 24px 0 0',
                margin:'0 -1px',
                position:'relative', zIndex:2,
              }} />
            </motion.div>
          </AnimatePresence>

          {/* ── Content ── */}
          <div
            ref={scrollRef}
            className="kayal-scroll"
            style={{
              flex:1, overflowY:'auto',
              padding:'2px 22px 16px',
              background:C.white,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`cnt-${current}`}
                initial={{ opacity:0, y: direction > 0 ? 18 : -18 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y: direction > 0 ? -18 : 18 }}
                transition={{ duration:0.28, delay:0.05 }}
              >
                {card?.paragraphs.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity:0, y:8 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay:0.1 + i * 0.1 }}
                    style={{
                      margin:     i === 0 ? '0 0 20px' : '0',
                      fontFamily: C.serif,
                      fontSize:   15,
                      lineHeight: 2.0,
                      color:      C.text,
                      textAlign:  'justify',
                      letterSpacing:'0.012em',
                    }}
                  >
                    {para}
                  </motion.p>
                ))}

                {/* Card 0 hint — no auto-play, nudge them to continue */}
                {current === 0 && (
                  <motion.div
                    initial={{ opacity:0, y:6 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay:0.5 }}
                    style={{
                      marginTop:20, padding:'12px 16px', borderRadius:12,
                      background:C.purpleFaint, border:`1px solid ${C.purpleBorder}`,
                      display:'flex', alignItems:'center', gap:10,
                    }}
                  >
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0,
                      background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Volume2 style={{ width:13, height:13, color:C.white }} />
                    </div>
                    <p style={{
                      margin:0, fontSize:12, color:C.textSub,
                      fontFamily:C.sans, lineHeight:1.5,
                    }}>
                      Audio plays automatically from the next card. Tap Continue to begin your reading.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer ── */}
          <div style={{
            flexShrink:0,
            background:C.parchment,
            borderTop:`1px solid ${C.border}`,
          }}>
            {/* Nav row */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'12px 16px',
            }}>
              {/* Back */}
              <button
                onClick={goPrev}
                disabled={current === 0}
                style={{
                  width:42, height:42, borderRadius:12, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:C.white,
                  border:`1px solid ${C.border}`,
                  color: current === 0 ? C.textFaint : C.textSub,
                  cursor: current === 0 ? 'not-allowed' : 'pointer',
                  opacity: current === 0 ? 0.3 : 1,
                  transition:'all 0.2s',
                  boxShadow:'0 1px 4px rgba(26,23,20,0.06)',
                }}
              >
                <ChevronLeft style={{ width:17, height:17 }} />
              </button>

              {/* Continue / Begin */}
              <button
                onClick={goNext}
                style={{
                  flex:1, height:42, borderRadius:12,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  background:`linear-gradient(135deg,${C.purple},${C.purpleLight})`,
                  border:'none', cursor:'pointer',
                  color:C.white, fontSize:14, fontWeight:700,
                  fontFamily:C.sans, letterSpacing:'0.02em',
                  boxShadow:'0 4px 16px rgba(124,58,237,0.35)',
                  transition:'opacity 0.2s',
                }}
              >
                {isLast ? 'Begin My Journey' : (
                  <>Continue <ChevronRight style={{ width:16, height:16 }} /></>
                )}
              </button>
            </div>

            {/* Last card actions */}
            {isLast && (
              <div style={{ display:'flex', gap:8, padding:'0 16px 12px' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    flex:1, height:36, borderRadius:10,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    background: downloaded ? 'rgba(21,128,61,0.08)' : C.white,
                    border:`1px solid ${downloaded ? 'rgba(21,128,61,0.3)' : C.border}`,
                    color: downloaded ? '#15803d' : C.textSub,
                    fontSize:12, fontWeight:600, cursor:'pointer',
                    fontFamily:C.sans, transition:'all 0.2s',
                    boxShadow:'0 1px 4px rgba(26,23,20,0.06)',
                  }}
                >
                  {downloaded
                    ? <><Check    style={{ width:13, height:13 }} />Saved</>
                    : <><Download style={{ width:13, height:13 }} />Download</>}
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    flex:1, height:36, borderRadius:10,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    background: shared ? 'rgba(21,128,61,0.08)' : C.white,
                    border:`1px solid ${shared ? 'rgba(21,128,61,0.3)' : C.border}`,
                    color: shared ? '#15803d' : C.textSub,
                    fontSize:12, fontWeight:600, cursor:'pointer',
                    fontFamily:C.sans, transition:'all 0.2s',
                    boxShadow:'0 1px 4px rgba(26,23,20,0.06)',
                  }}
                >
                  {shared
                    ? <><Check  style={{ width:13, height:13 }} />Shared</>
                    : <><Share2 style={{ width:13, height:13 }} />Share</>}
                </button>
              </div>
            )}

            {/* Skip */}
            {!isLast && (
              <div style={{ textAlign:'center', paddingBottom:12 }}>
                <button
                  onClick={onClose}
                  style={{
                    fontSize:11, color:C.textFaint,
                    background:'none', border:'none', cursor:'pointer',
                    fontFamily:C.sans, letterSpacing:'0.04em',
                    transition:'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.textSub)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textFaint)}
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}