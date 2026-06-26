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
  parchment:   '#faf7f2',
  white:       '#ffffff',
  purple:      '#2d1b69',
  purpleMid:   '#4c2a9e',
  purpleLight: '#7c3aed',
  purplePale:  '#ede9ff',
  purpleFaint: 'rgba(124,58,237,0.08)',
  purpleBorder:'rgba(124,58,237,0.18)',
  gold:        '#b8943f',
  goldLight:   '#d4af6e',
  goldFaint:   'rgba(184,148,63,0.12)',
  goldBorder:  'rgba(184,148,63,0.28)',
  text:        '#1a1714',
  textSub:     '#6b6560',
  textFaint:   'rgba(26,23,20,0.36)',
  border:      'rgba(26,23,20,0.08)',
  serif:       'Georgia, "Times New Roman", serif',
  sans:        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

// ── Section config ────────────────────────────────────────────
const sectionConfig: Record<string, { gradient: string; accent: string; symbol: string }> = {
  'Before We Begin':           { gradient: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,        accent: C.purpleLight, symbol: '✦' },
  'Who You Are':               { gradient: `linear-gradient(135deg, #1e1b4b, #4c2a9e)`,                     accent: '#818cf8',     symbol: '◈' },
  'Your Greatest Gift':        { gradient: `linear-gradient(135deg, #78350f, ${C.gold})`,                   accent: C.gold,        symbol: '★' },
  'Your Core Challenge':       { gradient: `linear-gradient(135deg, #1e3a5f, #2563eb)`,                     accent: '#60a5fa',     symbol: '◇' },
  'Love and Connection':       { gradient: `linear-gradient(135deg, #7f1d1d, #dc2626)`,                     accent: '#f87171',     symbol: '♡' },
  'Money and Purpose':         { gradient: `linear-gradient(135deg, #064e3b, #059669)`,                     accent: '#34d399',     symbol: '◆' },
  'Right Now':                 { gradient: `linear-gradient(135deg, ${C.purpleMid}, #7c3aed)`,              accent: '#c084fc',     symbol: '○' },
  'Where This Is All Leading': { gradient: `linear-gradient(135deg, #1e1b4b, #312e81)`,                     accent: '#818cf8',     symbol: '∞' },
  'Your Verdict':              { gradient: `linear-gradient(135deg, ${C.purple}, ${C.gold})`,               accent: C.goldLight,   symbol: '✦' },
}

const defaultConfig = {
  gradient: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
  accent: C.purpleLight, symbol: '✦',
}

// ── Icon map ──────────────────────────────────────────────────
const iconMap: Record<string, any> = {
  Sparkles, Star, Heart, Compass, Moon, Infinity, Feather,
}

// ── Progress dots ─────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: 99,
            transition: 'all 0.4s',
            width:      i === current ? 20 : 6,
            height:     6,
            background: i < current
              ? C.gold
              : i === current
              ? C.purpleLight
              : 'rgba(26,23,20,0.12)',
          }}
        />
      ))}
    </div>
  )
}

// ── Small icon button ─────────────────────────────────────────
function IconBtn({
  onClick, title, active, activeColor, successColor, children,
}: {
  onClick: () => void; title?: string
  active?: boolean; activeColor?: string; successColor?: string
  children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 9, border: 'none', cursor: 'pointer',
        background: active
          ? (successColor ? 'rgba(21,128,61,0.1)' : C.purpleFaint)
          : hov ? 'rgba(26,23,20,0.06)' : 'transparent',
        color: active
          ? (successColor || activeColor || C.purpleLight)
          : hov ? C.textSub : C.textFaint,
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)

  const card    = cards[current]
  const isLast  = current === cards.length - 1
  const config  = sectionConfig[card?.section] || defaultConfig
  const IconComp = iconMap[card?.icon] || Sparkles

  // Inject CSS
  useEffect(() => {
    const id = 'kayal-modal-css'
    if (document.getElementById(id)) return
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes kayal-eq {
        from { transform: scaleY(0.2); opacity: 0.4; }
        to   { transform: scaleY(1);   opacity: 1;   }
      }
      @keyframes kayal-pulse-dot {
        0%, 100% { opacity: 0.4; transform: scale(0.85); }
        50%       { opacity: 1;   transform: scale(1.15); }
      }
      @keyframes kayal-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      .kayal-modal-scroll::-webkit-scrollbar { width: 3px; }
      .kayal-modal-scroll::-webkit-scrollbar-track { background: transparent; }
      .kayal-modal-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.2); border-radius: 3px; }
    `
    document.head.appendChild(s)
  }, [])

  // Stop audio on close / unmount
  useEffect(() => {
    if (!isOpen) { window.speechSynthesis?.cancel(); setIsPlaying(false) }
    return () => { window.speechSynthesis?.cancel() }
  }, [isOpen])

  // Stop audio and scroll top on card change
  useEffect(() => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [current])

  const playCard = useCallback(() => {
    if (!window.speechSynthesis || !card) return
    window.speechSynthesis.cancel()
    const text = `${card.section}. ${card.paragraphs[0]} ${card.paragraphs[1]}`
    const u    = new SpeechSynthesisUtterance(text)
    u.rate = 0.84; u.pitch = 1.05; u.volume = isMuted ? 0 : 1
    const voices    = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      (v.lang?.startsWith('en') && v.name.toLowerCase().includes('female'))
    )
    if (preferred) u.voice = preferred
    u.onend = () => setIsPlaying(false)
    u.onerror = () => setIsPlaying(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
    setIsPlaying(true)
  }, [card, isMuted])

  const handlePlayPause = () => {
    if (!window.speechSynthesis) return
    if (isPlaying) { window.speechSynthesis.pause(); setIsPlaying(false) }
    else if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); setIsPlaying(true) }
    else playCard()
  }

  const handleMute = () => {
    setIsMuted(m => !m)
    if (utteranceRef.current) utteranceRef.current.volume = isMuted ? 1 : 0
  }

  const goNext = () => {
    if (current < cards.length - 1) { setDirection(1); setCurrent(c => c + 1) }
    else onClose()
  }

  const goPrev = () => {
    if (current > 0) { setDirection(-1); setCurrent(c => c - 1) }
  }

  const handleDownload = () => {
    const lines: string[] = [
      `KAYAL SoulPath — Personal Blueprint`,
      `For: ${fullName}`,
      `Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      ``, `${'─'.repeat(56)}`,
      `This reading is shown only once inside the app.`,
      `Keep this file as your permanent personal reference.`,
      `${'─'.repeat(56)}`,
    ]
    cards.forEach((c, i) => {
      lines.push(``, `${'═'.repeat(56)}`)
      lines.push(`${i + 1}. ${c.section.toUpperCase()}`)
      lines.push(`${'═'.repeat(56)}`, ``)
      lines.push(c.paragraphs[0], ``, c.paragraphs[1])
    })
    lines.push(``, `${'─'.repeat(56)}`)
    lines.push(`© ${new Date().getFullYear()} KAYAL SoulPath Institute`)
    lines.push(`app.kayalsoulpath.com`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `KAYAL-Blueprint-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          background: 'rgba(20,10,50,0.65)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <motion.div
          key="kayal-modal"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{ opacity: 0, y: 32, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            width: '100%', maxWidth: 520,
            maxHeight: '94vh',
            display: 'flex', flexDirection: 'column',
            background: C.white,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: [
              '0 48px 96px rgba(20,10,50,0.28)',
              '0 8px 24px rgba(20,10,50,0.12)',
              `0 0 0 1px rgba(124,58,237,0.1)`,
            ].join(', '),
          }}
        >

          {/* ── Hero header — gradient per section ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: config.gradient,
                padding: '20px 20px 0',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle pattern overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)`,
                backgroundSize: '24px 24px',
                pointerEvents: 'none',
              }} />

              {/* Glow orb */}
              <div style={{
                position: 'absolute', width: 200, height: 200,
                borderRadius: '50%', top: '-60px', right: '-40px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Top controls row */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16, position: 'relative', zIndex: 2,
              }}>
                <ProgressDots total={cards.length} current={current} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Play */}
                  <button
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Listen to this section'}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isPlaying ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)', transition: 'all 0.18s',
                    }}
                  >
                    {isPlaying
                      ? <Pause  style={{ width: 13, height: 13 }} />
                      : <Play   style={{ width: 13, height: 13 }} />}
                  </button>
                  {/* Mute */}
                  <button
                    onClick={handleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.75)', transition: 'all 0.18s',
                    }}
                  >
                    {isMuted
                      ? <VolumeX style={{ width: 13, height: 13 }} />
                      : <Volume2 style={{ width: 13, height: 13 }} />}
                  </button>
                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    title="Download your reading"
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: downloaded ? 'rgba(134,239,172,0.25)' : 'rgba(255,255,255,0.12)',
                      color: downloaded ? '#86efac' : 'rgba(255,255,255,0.75)',
                      transition: 'all 0.18s',
                    }}
                  >
                    {downloaded
                      ? <Check     style={{ width: 13, height: 13 }} />
                      : <Download  style={{ width: 13, height: 13 }} />}
                  </button>
                  {/* Share */}
                  <button
                    onClick={handleShare}
                    title="Share with a friend"
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: shared ? 'rgba(134,239,172,0.25)' : 'rgba(255,255,255,0.12)',
                      color: shared ? '#86efac' : 'rgba(255,255,255,0.75)',
                      transition: 'all 0.18s',
                    }}
                  >
                    {shared
                      ? <Check   style={{ width: 13, height: 13 }} />
                      : <Share2  style={{ width: 13, height: 13 }} />}
                  </button>
                  <div style={{
                    width: 1, height: 14,
                    background: 'rgba(255,255,255,0.2)',
                    margin: '0 3px',
                  }} />
                  {/* Close */}
                  <button
                    onClick={onClose}
                    title="Close"
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)', transition: 'all 0.18s',
                    }}
                  >
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>

              {/* Section icon + title */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingBottom: 20, position: 'relative', zIndex: 2,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.white,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  <IconComp style={{ width: 20, height: 20 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.6)',
                    margin: '0 0 3px', fontFamily: C.sans,
                    letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    {current + 1} of {cards.length}
                  </p>
                  <h2 style={{
                    fontSize: 20, color: C.white, margin: 0,
                    fontFamily: C.serif, fontWeight: 400,
                    letterSpacing: '0.01em', lineHeight: 1.2,
                  }}>
                    {card?.section}
                  </h2>
                </div>
              </div>

              {/* Curved bottom edge */}
              <div style={{
                height: 20, background: C.white,
                borderRadius: '50% 50% 0 0 / 20px 20px 0 0',
                margin: '0 -1px', position: 'relative', zIndex: 2,
              }} />
            </motion.div>
          </AnimatePresence>

          {/* ── Content area ── */}
          <div
            ref={scrollRef}
            className="kayal-modal-scroll"
            style={{
              flex: 1, overflowY: 'auto',
              padding: '4px 22px 16px',
              background: C.white,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`cnt-${current}`}
                initial={{ opacity: 0, y: direction > 0 ? 16 : -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -16 : 16 }}
                transition={{ duration: 0.28, delay: 0.05 }}
              >
                {card?.paragraphs.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    style={{
                      margin: i === 0 ? '0 0 20px' : '0',
                      fontFamily: C.serif,
                      fontSize: 15,
                      lineHeight: 2.0,
                      color: C.text,
                      textAlign: 'justify',
                      letterSpacing: '0.012em',
                    }}
                  >
                    {para}
                  </motion.p>
                ))}

                {/* Audio playing indicator */}
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginTop: 16, padding: '8px 12px', borderRadius: 10,
                      background: C.purpleFaint,
                      border: `1px solid ${C.purpleBorder}`,
                      display: 'inline-flex',
                    }}
                  >
                    <div style={{
                      display: 'flex', gap: 2.5,
                      alignItems: 'flex-end', height: 14,
                    }}>
                      {[0.1, 0.22, 0.05, 0.17].map((delay, i) => (
                        <div key={i} style={{
                          width: 2.5, height: '100%',
                          background: C.purpleLight,
                          borderRadius: 2,
                          transformOrigin: 'bottom',
                          animation: `kayal-eq 0.48s ${delay}s ease-in-out infinite alternate`,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 11, color: C.purpleLight,
                      fontFamily: C.sans, letterSpacing: '0.05em', fontWeight: 500,
                    }}>
                      Listening
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation footer ── */}
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${C.border}`,
            background: C.parchment,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Back */}
              <button
                onClick={goPrev}
                disabled={current === 0}
                style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  color: current === 0 ? C.textFaint : C.textSub,
                  cursor: current === 0 ? 'not-allowed' : 'pointer',
                  opacity: current === 0 ? 0.35 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 4px rgba(26,23,20,0.06)',
                }}
              >
                <ChevronLeft style={{ width: 17, height: 17 }} />
              </button>

              {/* Continue / Begin */}
              <button
                onClick={goNext}
                style={{
                  flex: 1, height: 42, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                  border: 'none', cursor: 'pointer',
                  color: C.white,
                  fontSize: 14, fontWeight: 700,
                  fontFamily: C.sans, letterSpacing: '0.02em',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                  transition: 'opacity 0.2s',
                }}
              >
                {isLast ? (
                  'Begin My Journey'
                ) : (
                  <>
                    Continue
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </>
                )}
              </button>
            </div>

            {/* Last card — download and share row */}
            {isLast && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={handleDownload}
                  style={{
                    flex: 1, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: downloaded ? 'rgba(21,128,61,0.08)' : C.white,
                    border: `1px solid ${downloaded ? 'rgba(21,128,61,0.3)' : C.border}`,
                    color: downloaded ? '#15803d' : C.textSub,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: C.sans, transition: 'all 0.2s',
                    boxShadow: '0 1px 4px rgba(26,23,20,0.06)',
                  }}
                >
                  {downloaded
                    ? <><Check    style={{ width: 13, height: 13 }} />Saved</>
                    : <><Download style={{ width: 13, height: 13 }} />Download</>}
                </button>
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: shared ? 'rgba(21,128,61,0.08)' : C.white,
                    border: `1px solid ${shared ? 'rgba(21,128,61,0.3)' : C.border}`,
                    color: shared ? '#15803d' : C.textSub,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: C.sans, transition: 'all 0.2s',
                    boxShadow: '0 1px 4px rgba(26,23,20,0.06)',
                  }}
                >
                  {shared
                    ? <><Check  style={{ width: 13, height: 13 }} />Shared</>
                    : <><Share2 style={{ width: 13, height: 13 }} />Share</>}
                </button>
              </div>
            )}

            {/* Skip link */}
            {!isLast && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    fontSize: 11, color: C.textFaint,
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: C.sans,
                    letterSpacing: '0.04em', transition: 'color 0.2s',
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