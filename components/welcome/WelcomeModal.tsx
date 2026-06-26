'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Star, Heart, Compass, Moon, Infinity, Feather,
  ChevronRight, ChevronLeft, Play, Pause, Volume2, VolumeX,
  Share2, X, Check, Download,
} from 'lucide-react'
import type { WelcomeCard } from '@/lib/welcome/paragraph-library'

const T = {
  bg:         '#faf7f2',
  surface:    '#ffffff',
  surfaceAlt: '#f5f1ea',
  border:     'rgba(184,148,63,0.25)',
  borderSub:  'rgba(26,23,20,0.08)',
  gold:       '#b8943f',
  goldDark:   '#8b6e2e',
  goldFaint:  'rgba(184,148,63,0.1)',
  goldBorder: 'rgba(184,148,63,0.3)',
  text:       '#1a1714',
  textSub:    '#6b6560',
  textFaint:  'rgba(26,23,20,0.35)',
  serif:      'Georgia, "Times New Roman", serif',
  sans:       '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4" />,
  Star:     <Star     className="w-4 h-4" />,
  Heart:    <Heart    className="w-4 h-4" />,
  Compass:  <Compass  className="w-4 h-4" />,
  Moon:     <Moon     className="w-4 h-4" />,
  Infinity: <Infinity className="w-4 h-4" />,
  Feather:  <Feather  className="w-4 h-4" />,
}

function ProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 2, borderRadius: 1,
            background: i < current
              ? T.gold
              : i === current
              ? 'rgba(184,148,63,0.45)'
              : T.borderSub,
            transition: 'background 0.4s',
          }}
        />
      ))}
    </div>
  )
}

function IconBtn({
  onClick, title, active, activeColor, children,
}: {
  onClick: () => void; title?: string; active?: boolean
  activeColor?: string; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        background: active
          ? T.goldFaint
          : hovered
          ? 'rgba(26,23,20,0.05)'
          : 'transparent',
        color: active
          ? (activeColor || T.gold)
          : hovered
          ? T.textSub
          : T.textFaint,
        transition: 'all 0.18s',
      }}
    >
      {children}
    </button>
  )
}

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

  const card   = cards[current]
  const isLast = current === cards.length - 1

  // Inject animation CSS once
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
    `
    document.head.appendChild(s)
  }, [])

  // Stop audio on close
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis?.cancel()
      setIsPlaying(false)
    }
    return () => { window.speechSynthesis?.cancel() }
  }, [isOpen])

  // Stop audio on card change
  useEffect(() => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }, [current])

  const playCard = useCallback(() => {
    if (!window.speechSynthesis || !card) return
    window.speechSynthesis.cancel()
    const text = `${card.section}. ${card.paragraphs[0]} ${card.paragraphs[1]}`
    const u    = new SpeechSynthesisUtterance(text)
    u.rate     = 0.84
    u.pitch    = 1.05
    u.volume   = isMuted ? 0 : 1
    const voices    = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      (v.lang?.startsWith('en') && v.name.toLowerCase().includes('female'))
    )
    if (preferred) u.voice = preferred
    u.onend   = () => setIsPlaying(false)
    u.onerror = () => setIsPlaying(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
    setIsPlaying(true)
  }, [card, isMuted])

  const handlePlayPause = () => {
    if (!window.speechSynthesis) return
    if (isPlaying) {
      window.speechSynthesis.pause()
      setIsPlaying(false)
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPlaying(true)
    } else {
      playCard()
    }
  }

  const handleMute = () => {
    setIsMuted(m => !m)
    if (utteranceRef.current) utteranceRef.current.volume = isMuted ? 1 : 0
  }

  const goNext = () => {
    if (current < cards.length - 1) {
      setDirection(1)
      setCurrent(c => c + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (current > 0) {
      setDirection(-1)
      setCurrent(c => c - 1)
    }
  }

  const handleDownload = () => {
    const lines: string[] = [
      `KAYAL SoulPath — Personal Blueprint`,
      `For: ${fullName}`,
      `Date: ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })}`,
      ``,
      `${'─'.repeat(56)}`,
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
    a.href     = url
    a.download = `KAYAL-Blueprint-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        transition={{ duration: 0.28 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          background: 'rgba(26,23,20,0.55)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          key="kayal-modal"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          style={{
            width: '100%', maxWidth: 500,
            maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 32px 64px rgba(26,23,20,0.18), 0 2px 8px rgba(26,23,20,0.08)',
          }}
        >

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px 12px',
            borderBottom: `1px solid ${T.borderSub}`,
            flexShrink: 0,
            background: T.bg,
          }}>
            <ProgressBar total={cards.length} current={current} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <IconBtn
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause' : 'Listen to this section'}
                active={isPlaying}
              >
                {isPlaying
                  ? <Pause  className="w-3.5 h-3.5" />
                  : <Play   className="w-3.5 h-3.5" />}
              </IconBtn>
              <IconBtn onClick={handleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted
                  ? <VolumeX className="w-3.5 h-3.5" />
                  : <Volume2 className="w-3.5 h-3.5" />}
              </IconBtn>
              <IconBtn
                onClick={handleDownload}
                title="Download your reading"
                active={downloaded}
                activeColor="#15803d"
              >
                {downloaded
                  ? <Check     className="w-3.5 h-3.5" />
                  : <Download  className="w-3.5 h-3.5" />}
              </IconBtn>
              <IconBtn
                onClick={handleShare}
                title="Share with a friend"
                active={shared}
                activeColor="#15803d"
              >
                {shared
                  ? <Check   className="w-3.5 h-3.5" />
                  : <Share2  className="w-3.5 h-3.5" />}
              </IconBtn>
              <div style={{
                width: 1, height: 14,
                background: T.borderSub,
                margin: '0 3px',
              }} />
              <IconBtn onClick={onClose} title="Close">
                <X className="w-3.5 h-3.5" />
              </IconBtn>
            </div>
          </div>

          {/* Section header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hdr-${current}`}
              initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '16px 20px 12px',
                flexShrink: 0,
                background: T.surface,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  border: `1px solid ${T.goldBorder}`,
                  background: T.goldFaint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.gold, flexShrink: 0,
                }}>
                  {iconMap[card?.icon] || <Sparkles className="w-4 h-4" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: 10, color: T.gold,
                    margin: '0 0 3px',
                    fontFamily: T.sans,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    {current + 1} of {cards.length}
                  </p>
                  <h2 style={{
                    fontSize: 19, color: T.text,
                    margin: 0,
                    fontFamily: T.serif,
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                    lineHeight: 1.25,
                  }}>
                    {card?.section}
                  </h2>
                </div>
              </div>

              {/* Gold hairline divider */}
              <div style={{
                marginTop: 14, height: 1,
                background: `linear-gradient(90deg, ${T.goldBorder}, transparent)`,
              }} />
            </motion.div>
          </AnimatePresence>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 20px 16px',
            scrollbarWidth: 'thin',
            scrollbarColor: `${T.borderSub} transparent`,
            background: T.surface,
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`cnt-${current}`}
                initial={{ opacity: 0, y: direction > 0 ? 14 : -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -14 : 14 }}
                transition={{ duration: 0.26, delay: 0.04 }}
              >
                {card?.paragraphs.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.1 }}
                    style={{
                      margin: i === 0 ? '0 0 20px' : '0',
                      fontFamily: T.serif,
                      fontSize: 15,
                      lineHeight: 2.0,
                      color: T.text,
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
                      marginTop: 16,
                    }}
                  >
                    <div style={{
                      display: 'flex', gap: 2.5,
                      alignItems: 'flex-end', height: 14,
                    }}>
                      {[0.1, 0.22, 0.05, 0.17].map((delay, i) => (
                        <div key={i} style={{
                          width: 2.5, height: '100%',
                          background: T.gold,
                          borderRadius: 2,
                          transformOrigin: 'bottom',
                          animation: `kayal-eq 0.48s ${delay}s ease-in-out infinite alternate`,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 11, color: T.gold,
                      fontFamily: T.sans, letterSpacing: '0.06em',
                    }}>
                      Listening
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${T.borderSub}`,
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
            background: T.bg,
          }}>
            <button
              onClick={goPrev}
              disabled={current === 0}
              style={{
                width: 40, height: 40,
                borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: `1px solid ${T.borderSub}`,
                color: current === 0 ? T.textFaint : T.textSub,
                cursor: current === 0 ? 'not-allowed' : 'pointer',
                opacity: current === 0 ? 0.35 : 1,
                transition: 'all 0.2s',
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>

            <button
              onClick={goNext}
              style={{
                flex: 1, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: T.gold,
                border: 'none', cursor: 'pointer',
                color: '#faf7f2',
                fontSize: 14, fontWeight: 700,
                fontFamily: T.sans, letterSpacing: '0.02em',
                boxShadow: '0 2px 10px rgba(184,148,63,0.3)',
                transition: 'opacity 0.2s',
              }}
            >
              {isLast ? (
                'Begin My Journey'
              ) : (
                <>
                  Continue
                  <ChevronRight style={{ width: 15, height: 15 }} />
                </>
              )}
            </button>
          </div>

          {/* Last card — download and share */}
          {isLast && (
            <div style={{
              display: 'flex', gap: 10,
              padding: '0 16px 14px',
              flexShrink: 0,
              background: T.bg,
            }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1, height: 36, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: downloaded ? 'rgba(21,128,61,0.08)' : 'transparent',
                  border: `1px solid ${downloaded ? 'rgba(21,128,61,0.3)' : T.borderSub}`,
                  color: downloaded ? '#15803d' : T.textSub,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: T.sans, transition: 'all 0.2s',
                }}
              >
                {downloaded
                  ? <><Check    style={{ width: 12, height: 12 }} />Saved</>
                  : <><Download style={{ width: 12, height: 12 }} />Download</>}
              </button>
              <button
                onClick={handleShare}
                style={{
                  flex: 1, height: 36, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: shared ? 'rgba(21,128,61,0.08)' : 'transparent',
                  border: `1px solid ${shared ? 'rgba(21,128,61,0.3)' : T.borderSub}`,
                  color: shared ? '#15803d' : T.textSub,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: T.sans, transition: 'all 0.2s',
                }}
              >
                {shared
                  ? <><Check  style={{ width: 12, height: 12 }} />Shared</>
                  : <><Share2 style={{ width: 12, height: 12 }} />Share</>}
              </button>
            </div>
          )}

          {/* Skip link */}
          {!isLast && (
            <div style={{
              textAlign: 'center',
              paddingBottom: 14,
              flexShrink: 0,
              background: T.bg,
            }}>
              <button
                onClick={onClose}
                style={{
                  fontSize: 11, color: T.textFaint,
                  background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: T.sans,
                  letterSpacing: '0.04em',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = T.textSub)}
                onMouseLeave={e => (e.currentTarget.style.color = T.textFaint)}
              >
                Skip for now
              </button>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}