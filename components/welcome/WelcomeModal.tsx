'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Star, Heart, Compass, Moon, Infinity, Feather,
  ChevronRight, ChevronLeft, Play, Pause, Volume2, VolumeX,
  Share2, X, Check, Download, SkipForward,
} from 'lucide-react'
import type { WelcomeCard } from '@/lib/welcome/paragraph-library'

// ── Icon map ──────────────────────────────────────────────────
const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-5 h-5" />,
  Star:     <Star     className="w-5 h-5" />,
  Heart:    <Heart    className="w-5 h-5" />,
  Compass:  <Compass  className="w-5 h-5" />,
  Moon:     <Moon     className="w-5 h-5" />,
  Infinity: <Infinity className="w-5 h-5" />,
  Feather:  <Feather  className="w-5 h-5" />,
}

// ── Gradient per section ──────────────────────────────────────
const sectionGradients: Record<string, string> = {
  'Before We Begin':           'from-violet-600 to-purple-700',
  'Who You Are':               'from-indigo-600 to-violet-600',
  'Your Greatest Gift':        'from-amber-500 to-orange-500',
  'Your Core Challenge':       'from-slate-600 to-blue-700',
  'Love and Connection':       'from-rose-500 to-pink-600',
  'Money and Purpose':         'from-emerald-600 to-teal-600',
  'Right Now':                 'from-purple-600 to-violet-700',
  'Where This Is All Leading': 'from-indigo-500 to-purple-700',
  'Your Verdict':              'from-amber-600 to-rose-600',
}

// ── CSS injected once for animations ─────────────────────────
const ANIMATION_CSS = `
@keyframes equalizer {
  from { transform: scaleY(0.3); }
  to   { transform: scaleY(1); }
}
@keyframes kayal-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.15); }
}
`

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-0.5 rounded-full flex-1 transition-all duration-500"
          style={{
            background: i < current
              ? 'rgba(255,255,255,0.7)'
              : i === current
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(255,255,255,0.15)',
            transform: i === current ? 'scaleY(2)' : 'scaleY(1)',
          }}
        />
      ))}
    </div>
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
  const [current,   setCurrent]   = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted,   setIsMuted]   = useState(false)
  const [shared,    setShared]    = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const card = cards[current]
  const isLast = current === cards.length - 1

  // Inject animation CSS once
  useEffect(() => {
    if (document.getElementById('kayal-welcome-css')) return
    const style = document.createElement('style')
    style.id = 'kayal-welcome-css'
    style.textContent = ANIMATION_CSS
    document.head.appendChild(style)
  }, [])

  // Stop audio on close
  useEffect(() => {
    if (!isOpen) { window.speechSynthesis?.cancel(); setIsPlaying(false) }
    return () => { window.speechSynthesis?.cancel() }
  }, [isOpen])

  // Stop audio when card changes
  useEffect(() => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
  }, [current])

  const playCard = useCallback(() => {
    if (!window.speechSynthesis || !card) return
    window.speechSynthesis.cancel()
    const text = `${card.section}. ${card.paragraphs[0]} ${card.paragraphs[1]}`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate   = 0.84
    utterance.pitch  = 1.05
    utterance.volume = isMuted ? 0 : 1
    const voices    = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Google UK English Female') ||
      (v.lang === 'en-GB' && v.name.toLowerCase().includes('female'))
    )
    if (preferred) utterance.voice = preferred
    utterance.onend   = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
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

  const handleSkip = () => onClose()

  const handleShare = () => {
    const text = encodeURIComponent(
      `I just discovered my personal soul blueprint on KAYAL LifeOS and the reading is surprisingly accurate. Try yours: https://app.kayalsoulpath.com`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setShared(true)
    setTimeout(() => setShared(false), 3000)
  }

  const handleDownload = () => {
    const lines: string[] = [
      `KAYAL LifeOS — Personal Soul Blueprint`,
      `For: ${fullName}`,
      `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      ``,
      `${'─'.repeat(60)}`,
      `IMPORTANT: This reading is shown only once in the app.`,
      `Keep this file as your permanent reference.`,
      `${'─'.repeat(60)}`,
      ``,
    ]

    cards.forEach((c, i) => {
      lines.push(``)
      lines.push(`${'═'.repeat(60)}`)
      lines.push(`${i + 1}. ${c.section.toUpperCase()}`)
      lines.push(`${'═'.repeat(60)}`)
      lines.push(``)
      lines.push(c.paragraphs[0])
      lines.push(``)
      lines.push(c.paragraphs[1])
    })

    lines.push(``)
    lines.push(`${'─'.repeat(60)}`)
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

  const gradient = sectionGradients[card?.section] || 'from-violet-600 to-indigo-600'

  if (!isOpen || !cards.length) return null

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        style={{ background: 'rgba(4,2,18,0.94)', backdropFilter: 'blur(20px)' }}
      >
        <motion.div
          key="welcome-card"
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full flex flex-col rounded-3xl overflow-hidden"
          style={{
            maxWidth:   '520px',
            maxHeight:  '94vh',
            background: 'linear-gradient(160deg, #110828 0%, #0a1228 50%, #0d0820 100%)',
            border:     '1px solid rgba(139,92,246,0.2)',
            boxShadow:  '0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(109,40,217,0.08)',
          }}
        >
          {/* ── Top bar ── */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 flex-shrink-0">
            <ProgressBar total={cards.length} current={current} />
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause reading' : 'Listen to this section'}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: isPlaying ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
                  color: isPlaying ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                }}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>

              {/* Mute */}
              <button
                onClick={handleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                title="Download your reading"
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: downloaded ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                  color: downloaded ? '#4ade80' : 'rgba(255,255,255,0.4)',
                }}
              >
                {downloaded ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                title="Share with a friend"
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: shared ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                  color: shared ? '#4ade80' : 'rgba(255,255,255,0.4)',
                }}
              >
                {shared ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              </button>

              {/* Close */}
              <button
                onClick={handleSkip}
                title="Skip for now"
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all ml-0.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Section header ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`header-${current}`}
              initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
              transition={{ duration: 0.22 }}
              className="px-5 pt-2 pb-3 flex-shrink-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white flex-shrink-0 shadow-lg`}
                >
                  {iconMap[card?.icon] || <Sparkles className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold tracking-widest uppercase mb-0.5"
                    style={{ color: 'rgba(167,139,250,0.65)' }}
                  >
                    {current + 1} of {cards.length}
                  </p>
                  <h2
                    className="text-lg font-serif text-white leading-tight truncate"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {card?.section}
                  </h2>
                </div>
              </div>
              <div
                className="mt-3 h-px"
                style={{
                  background: `linear-gradient(90deg, rgba(139,92,246,0.5), transparent)`,
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* ── Content ── */}
          <div
            className="flex-1 overflow-y-auto px-5 pb-3"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${current}`}
                initial={{ opacity: 0, y: direction > 0 ? 14 : -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -14 : 14 }}
                transition={{ duration: 0.28, delay: 0.04 }}
                className="space-y-4"
              >
                {card?.paragraphs.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    style={{
                      color:      'rgba(255,255,255,0.76)',
                      fontFamily: 'Georgia, serif',
                      fontSize:   '14.5px',
                      lineHeight: '1.9',
                      textAlign:  'justify',
                      margin:     0,
                    }}
                  >
                    {para}
                  </motion.p>
                ))}

                {/* Audio indicator */}
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <div className="flex gap-0.5 items-end" style={{ height: 14 }}>
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          style={{
                            width:           3,
                            height:          '100%',
                            background:      '#8b5cf6',
                            borderRadius:    2,
                            transformOrigin: 'bottom',
                            animation:       `equalizer 0.5s ${i * 0.1}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(139,92,246,0.7)' }}>
                      Listening
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation ── */}
          <div
            className="px-4 py-3.5 flex items-center gap-2.5 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
          >
            {/* Back */}
            <button
              onClick={goPrev}
              disabled={current === 0}
              className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all disabled:opacity-20 flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border:     '1px solid rgba(255,255,255,0.08)',
                color:      'rgba(255,255,255,0.6)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next / Begin */}
            <button
              onClick={goNext}
              className="flex-1 h-10 flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{
                background: `linear-gradient(135deg, #6d28d9, #4338ca)`,
                boxShadow:  '0 4px 20px rgba(109,40,217,0.3)',
              }}
            >
              {isLast ? (
                'Begin My Journey'
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* ── Skip link ── */}
          {!isLast && (
            <div className="pb-3 text-center flex-shrink-0">
              <button
                onClick={handleSkip}
                className="text-xs transition-all"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ── Last card actions ── */}
          {isLast && (
            <div className="px-4 pb-4 flex gap-2 flex-shrink-0">
              <button
                onClick={handleDownload}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: downloaded ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                  color:      downloaded ? '#4ade80' : 'rgba(255,255,255,0.5)',
                }}
              >
                {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                {downloaded ? 'Saved' : 'Download'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: shared ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.08)',
                  color:      shared ? '#4ade80' : 'rgba(255,255,255,0.5)',
                }}
              >
                {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {shared ? 'Shared' : 'Share'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}