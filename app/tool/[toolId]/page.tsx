'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Star, Shield, ChevronDown, ChevronUp, CheckCircle,
  Clock, Users, Sparkles, Eye, User, Camera,
  Compass, Moon, Feather, Infinity, Loader2, Volume2, VolumeX,
} from 'lucide-react'
import styles from './toolPage.module.css'

import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const ALL_TOOLS = [
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
  ...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools,
  ...sacredScriptTools, ...timeKeeperTools, ...voiceTools,
]

const clean = (s?: string) => (s ? s.trim() : '')

// ─── sanitize: replace forbidden methodology words ─────────────────────────
const SANITIZE_MAP: [RegExp, string][] = [
  [/\bnumerolog(?:y|ical|ist)\b/gi,     'pattern analysis'],
  [/\bastrol(?:ogy|ogical|oger)\b/gi,   'timing intelligence'],
  [/\bpalmist(?:ry)?\b/gi,              'physical markers reading'],
  [/\bMian Xiang\b/gi,                  'physical design reading'],
  [/\bphysiognom(?:y|ist|ic)\b/gi,      'physical design analysis'],
  [/\btarot\b/gi,                       'ancient wisdom reading'],
  [/\bhoroscope[s]?\b/gi,               'blueprint reading'],
  [/\bnatal charts?\b/gi,               'your blueprint'],
  [/\bbirth charts?\b/gi,               'your blueprint'],
  [/\bvedic\b/gi,                       'classical'],
  [/\bchakra[s]?\b/gi,                  'energy centre'],
  [/\btransit[s]?\b/gi,                 'timing cycle'],
  [/\bnatal\b/gi,                       'birth'],
  [/\bsynastry\b/gi,                    'blueprint comparison'],
  [/\bfour pillars\b/gi,                'classical timing analysis'],
  [/\bba[zs]i\b/gi,                     'classical timing framework'],
  [/\bi ching\b/gi,                     'ancient wisdom system'],
  [/\bfeng shui\b/gi,                   'environmental intelligence'],
  [/\bhuman design\b/gi,                'blueprint system'],
  [/\bLife Path(?:\s+\d+)?\b/gi,             'your core pattern'],
  [/\bPersonal Year(?:\s+\d+)?\b/gi,         'this current chapter'],
  [/\bPinnacle(?:\s+\d+)?\b/gi,              'this life chapter'],
  [/\bDestiny [Nn]umber(?:\s+\d+)?\b/gi,     'your life direction'],
  [/\bSoul Urge(?:\s+\d+)?\b/gi,             'your inner drive'],
  [/\bMaster [Nn]umber(?:\s+\d+)?\b/gi,      'this elevated calling'],
  [/\bPersonality [Nn]umber(?:\s+\d+)?\b/gi, 'how others experience you'],
  [/\bBirthday [Nn]umber(?:\s+\d+)?\b/gi,    'your natural gift'],
  [/\b(Sun|Moon|Mars|Venus|Jupiter|Saturn|Mercury)\s+in\s+[A-Z][a-z]+\b/g, 'this placement'],
  [/\bSaturn [Rr]eturn\b/gi,            'this structural cycle'],
  [/\bJupiter [Rr]eturn\b/gi,           'this expansion cycle'],
  [/\b(Rahu|Ketu|Atmakaraka)\b/gi,      'the soul indicator'],
  [/\bhouse placements?\b/gi,           'life areas'],
  [/\bcharts?\b/gi,                     'blueprint'], // catch-all, must stay last
]
function sanitize(text?: string): string {
  if (!text) return ''
  let r = clean(text)
  for (const [pat, rep] of SANITIZE_MAP) r = r.replace(pat, rep)
  return r
}

// ─── Domain config — dark-purple base, 3 of 8 accents shifted off purple so
// they read as distinct against the new purple-black page background
// (see the domain-accent review: wellness/oracle-temple/voice were all
// shades of purple and would have blended into the base). ────────────────
const DOMAIN_CONFIG: Record<string, { accent: string; accentSoft: string; label: string; practitionerRate: string }> = {
  love:            { accent: '#EC4899', accentSoft: 'rgba(236,72,153,0.16)', label: 'Love & Relationships',    practitionerRate: '$150–300' },
  wealth:          { accent: '#10B981', accentSoft: 'rgba(16,185,129,0.16)', label: 'Wealth & Career',         practitionerRate: '$150–250' },
  wellness:        { accent: '#D946EF', accentSoft: 'rgba(217,70,239,0.16)', label: 'Wellness & Spirituality', practitionerRate: '$120–280' },
  'life-path':     { accent: '#F59E0B', accentSoft: 'rgba(245,158,11,0.16)', label: 'Life Path & Destiny',     practitionerRate: '$150–350' },
  'oracle-temple': { accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.16)', label: 'Omni-Seer Sanctum',       practitionerRate: '$200–400' },
  'sacred-script': { accent: '#EF4444', accentSoft: 'rgba(239,68,68,0.16)',  label: 'Sacred Script',           practitionerRate: '$100–200' },
  'time-keeper':   { accent: '#14B8A6', accentSoft: 'rgba(20,184,166,0.16)', label: 'Timekeeper Vault',        practitionerRate: '$120–250' },
  voice:           { accent: '#818CF8', accentSoft: 'rgba(129,140,248,0.16)', label: 'Oracle Voice',           practitionerRate: '$150–300' },
}
const getDomain = (tool: any) => (tool.domain || tool.category || 'oracle-temple') as string
const getConfig = (tool: any) => DOMAIN_CONFIG[getDomain(tool)] ?? DOMAIN_CONFIG['oracle-temple']

// Both flags now read the real per-tool fields directly (requiresPartner,
// subscriptionPeriod) as the single source of truth, rather than a
// separately-maintained id list here that could drift out of sync with the
// actual data files — same reasoning as the domainColors fix in colors.ts.
const needsPartner = (tool: any): boolean =>
  tool.requiresPartner === true || tool.requires_partner === true

const isSubscription = (tool: any): boolean =>
  !!tool.subscriptionPeriod || !!tool.isSubscription || !!tool.is_subscription

const TESTIMONIALS: Record<string, { name: string; text: string }[]> = {
  love:            [ { name: 'Rachel, Austin',  text: 'Named a relationship pattern I had never seen described anywhere, and pinpointed almost exactly when it started.' },
                      { name: 'Amara, Toronto',  text: 'Described my emotional capacity so precisely I had known it about myself for years and never had the words for it.' } ],
  wealth:          [ { name: 'James, New York', text: 'The income ceiling section was uncomfortable to read because it was accurate.' },
                      { name: 'Sasha, Sydney',   text: 'A specific breakdown of why my current path is misaligned, and what the timing shows for a transition.' } ],
  wellness:        [ { name: 'Lena, Berlin',    text: 'Named something I had been circling for years in therapy, in twenty minutes.' },
                      { name: 'Yemi, Atlanta',   text: 'Described my energy pattern so precisely I had to re-read it twice.' } ],
  'life-path':     [ { name: 'Marcus, Dublin',  text: 'Told me exactly what this chapter of my life is asking for and how long I am in it.' },
                      { name: 'Evan, Vancouver', text: 'Described the thing underneath everything I thought I wanted.' } ],
  'oracle-temple': [ { name: 'Aisha, Dubai',     text: 'The first reading that felt like it was about the whole of me, not one dimension.' },
                      { name: 'Mei, Singapore',  text: 'I have tried four other platforms. None of them came close to this synthesis.' } ],
  'sacred-script': [ { name: 'Joelle, Paris',    text: 'Having my full synthesis loaded as a permanent dialogue partner changed how I navigate decisions.' },
                      { name: 'Nina, Stockholm', text: 'It holds context no other tool does, and the guidance feels genuinely calibrated to me.' } ],
  'time-keeper':   [ { name: 'Omar, Toronto',    text: 'Consistently names the quality of energy I am moving through before I have felt it myself.' },
                      { name: 'Clara, Amsterdam',text: 'Accurate for three months running before I stopped being surprised by it.' } ],
  voice:           [ { name: 'Grace, Lagos',     text: 'Felt like speaking to someone who had already read every relevant thing about my life.' },
                      { name: 'Zara, London',    text: 'Named a tension so precisely I stopped the session to write it all down.' } ],
}
const getTestimonials = (tool: any) => TESTIMONIALS[getDomain(tool)] ?? TESTIMONIALS['oracle-temple']

const HOOKS: Record<string, string> = {
  love:            'A private reading of the relationship pattern you keep repeating, showing exactly where it opens for something different.',
  wealth:          'A private reading of the ceiling you keep hitting, showing exactly where your blueprint says it lifts.',
  wellness:        'A private synthesis of the pattern underneath your inner life, named clearly, in plain language.',
  'life-path':     'A private reading of the direction your life is already moving in, whether or not you have named it yet.',
  'oracle-temple': 'A complete synthesis for a decision that deserves more than instinct alone.',
  'sacred-script': 'A permanent, private dialogue built from your complete synthesis.',
  'time-keeper':   'A private map of your timing, built from your exact details.',
  voice:           'A spoken session calibrated to your complete synthesis.',
}
const getHook = (tool: any) => clean(tool.hook) || HOOKS[getDomain(tool)] || HOOKS['oracle-temple']

const GET_ITEMS_DEFAULT = ['Private & permanent', 'Built from your details', 'Plain language', 'Delivered fast']
const getGetItems = (tool: any) => (tool.whatYouGet?.length ? tool.whatYouGet : GET_ITEMS_DEFAULT)

const FOR_LINE_DEFAULT = 'For you if past readings have felt generic, not built for the life you are actually living.'
const getForLine = (tool: any) => clean(tool.forLine) || FOR_LINE_DEFAULT

const BASE_FAQ = [
  { q: 'How is this different from a free horoscope?', a: 'Most free readings use a single input and produce a templated result that could apply to millions of people. Every KAYAL reading synthesises multiple disciplines together, so the specificity comes from what they all confirm about the same question.' },
  { q: 'Do I need any prior knowledge?', a: 'No. Your reading is written in plain language throughout. It tells you what the synthesis found, not how it works.' },
  { q: 'Why do you ask for birth time and place?', a: 'They let the synthesis engine build your complete, specific blueprint rather than a generic one based on date alone.' },
  { q: 'Is my personal data kept private?', a: 'Yes. Your details are used only to generate your reading and are never shared or sold.' },
  { q: 'What if the reading does not resonate?', a: 'We offer a 7 day guarantee. If your reading does not feel accurate, contact us and we will make it right.' },
]

const E: [number, number, number, number] = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: E } } }

const ICON_MAP: Record<string, any> = { Star, Compass, Moon, Feather, Infinity, Sparkles, Users }

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref as any, { once: true })
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let c = 0
    const steps = 60, inc = target / steps
    const t = setInterval(() => { c += inc; if (c >= target) { setCount(target); clearInterval(t) } else setCount(Math.floor(c)) }, 1200 / steps)
    return () => clearInterval(t)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className={styles.faqQText}>{q}</span>
        {open ? <ChevronUp size={16} style={{ color: '#d4af6e', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'rgba(26,23,20,0.35)', flexShrink: 0 }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <p className={styles.faqA}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function ToolPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toolId = params.toolId as string
  const tool = ALL_TOOLS.find((t: any) => t.id === toolId) as any
  const refCode = searchParams.get('ref') || ''

  const [teaserName, setTeaserName] = useState('')
  const [teaserDob, setTeaserDob] = useState('')
  const [teaserTime, setTeaserTime] = useState('')
  const [teaserPlace, setTeaserPlace] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerDob, setPartnerDob] = useState('')
  const [teaserLoading, setTeaserLoading] = useState(false)
  const [teaserParagraphs, setTeaserParagraphs] = useState<any[]>([])
  const [teaserCtaText, setTeaserCtaText] = useState('')
  const [teaserError, setTeaserError] = useState('')
  const [teaserShown, setTeaserShown] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const teaserResultRef = useRef<HTMLDivElement>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Affiliate click tracking — unchanged real feature, kept as-is
  useEffect(() => {
    if (!refCode || !tool) return
    sessionStorage.setItem('kayal_affiliate_ref', refCode)
    const expires = new Date()
    expires.setDate(expires.getDate() + 60)
    document.cookie = `kayal_ref=${refCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    fetch('/api/affiliate/track-click', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: refCode, tool_id: toolId, page: window.location.pathname }),
    }).catch(() => {})
  }, [refCode, toolId, tool])

  useEffect(() => {
    if (teaserShown && teaserResultRef.current) {
      setTimeout(() => teaserResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [teaserShown])

  if (!tool) {
    return (
      <div className={styles.page} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(26,23,20,0.5)', marginBottom: 16 }}>Tool not found.</p>
          <button onClick={() => router.push('/dashboard')} className={styles.ctaLink}>Back to dashboard</button>
        </div>
      </div>
    )
  }

  const cfg = getConfig(tool)
  const isPartner = needsPartner(tool)
  const isSub = isSubscription(tool)
  const deliveryMins = tool.deliveryMinutes || 15
  const price = tool.price ?? 29
  const headline = sanitize(tool.headline || tool.name)
  // Hero subhead uses tagline (short, one line) — hook stays reserved for
  // fuller-context surfaces like tool listing cards, which want a paragraph.
  // Fallback order stays short-to-short: only reaches for the paragraph hook
  // if literally nothing else is set.
  const heroSub = sanitize(clean(tool.tagline) || HOOKS[getDomain(tool)] || getHook(tool))
  const hasHeroImage = tool.heroImageStyle !== 'none'

  const speakTeaser = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const text = teaserParagraphs.map(p => `${p.title}. ${p.content}`).join('. ')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.onend = () => setAudioPlaying(false)
    utterance.onerror = () => setAudioPlaying(false)
    window.speechSynthesis.speak(utterance)
    setAudioPlaying(true)
  }
  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setAudioPlaying(false)
  }

  const handleCTA = () => {
    sessionStorage.setItem('kayal_selected_tool', JSON.stringify({
      id: tool.id, name: tool.name, price, domain: getDomain(tool),
      requiresPartner: isPartner, requiresImage: !!(tool.requiresImage || tool.requires_image), refCode: refCode || null,
    }))
    router.push(`/start/${tool.id}`)
  }

  // Real teaser call — see tool_teaser.py (generate_tool_teaser). Adjust the
  // URL if your API is proxied differently than a Next.js /api route.
  const handleTeaserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teaserName.trim() || !teaserDob) {
      setTeaserError('Please enter your name and date of birth.')
      return
    }
    if (isPartner && (!partnerName.trim() || !partnerDob)) {
      setTeaserError('Please enter your partner details for this reading.')
      return
    }
    setTeaserError('')
    setTeaserLoading(true)
    try {
      const res = await fetch('/api/tool-teaser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teaserName.trim(), dob: teaserDob, tool_id: tool.id,
          birth_time: teaserTime || null, birth_location: teaserPlace || null,
          partner_name: isPartner ? partnerName.trim() : null,
          session_id: sessionStorage.getItem('kayal_session_id') || '0',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error || !data.paragraphs?.length) {
        setTeaserError('We could not generate your preview right now. Please try again.')
        return
      }
      setTeaserParagraphs(data.paragraphs)
      setTeaserCtaText(data.cta_text || (isSub ? `Begin ${teaserName.split(' ')[0]}'s subscription` : `Get ${teaserName.split(' ')[0]}'s full reading`))
      setTeaserShown(true)
    } catch {
      setTeaserError('Something went wrong. Please try again.')
    } finally {
      setTeaserLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* NAV — static logo (this component only ever renders a tool page,
          never the homepage; the animated .logoAnimated variant belongs on
          the homepage component, not here) */}
      <nav className={styles.topNav}>
        <span className={styles.playfair} style={{ fontSize: '1rem', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className={styles.logo}>KAYAL</span>
          <span className={styles.logoSub}>LifeOS</span>
        </span>
        <button onClick={handleCTA} className={styles.navCta}>Begin</button>
      </nav>

      {/* 1 — HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGlowGold} />
        <div className={styles.heroGlowDomain} style={{ background: `radial-gradient(circle, ${cfg.accentSoft} 0%, transparent 70%)` }} />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow} style={{ color: cfg.accent }}>{cfg.label}</span>
          <h1 className={styles.heroTitle}>{headline}</h1>
          <p className={styles.heroSub}>{heroSub}</p>
          <div className={styles.heroCtaRow}>
            <button onClick={handleCTA} className={styles.ctaBtn}>Begin your reading &middot; ${price}</button>
            <button onClick={() => document.getElementById('teaser')?.scrollIntoView({ behavior: 'smooth' })} className={styles.ctaLink}>
              Try it free
            </button>
          </div>
        </div>
      </section>

      {hasHeroImage && (
        <div className={styles.heroImageWrap}>
          <div className={styles.heroImageZone}>
            <div
              className={styles.heroImgLayer}
              style={{ backgroundImage: `url(/images/tools/${tool.id}.webp), linear-gradient(160deg, #4c2a9e 0%, #2d1b69 55%, #1a1136 100%)` }}
            />
          </div>
        </div>
      )}

      <hr className={styles.goldRule} />

      {/* 2 — TEASER */}
      <section id="teaser" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: '#7c3aed' }}>Try it first</span>
            <h2 className={styles.sectionTitle}>See a real preview</h2>
            <p className={styles.sectionSub}>On your details. Under a minute.</p>
          </div>

          <div className={styles.teaserCard}>
            <div className={styles.teaserGlow} style={{ background: `radial-gradient(circle, ${cfg.accentSoft} 0%, transparent 70%)` }} />

            {!teaserShown ? (
              <form onSubmit={handleTeaserSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full name</label>
                  <input className={styles.formInput} value={teaserName} onChange={e => setTeaserName(e.target.value)} placeholder="As on your birth certificate" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Date of birth</label>
                  <input type="date" className={styles.formInput} value={teaserDob} onChange={e => setTeaserDob(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.75rem' }}>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label className={styles.formLabel}>Birth time (optional)</label>
                    <input type="time" className={styles.formInput} value={teaserTime} onChange={e => setTeaserTime(e.target.value)} />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <label className={styles.formLabel}>Birth place (optional)</label>
                    <input className={styles.formInput} value={teaserPlace} onChange={e => setTeaserPlace(e.target.value)} placeholder="City, Country" />
                  </div>
                </div>
                {isPartner && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className={styles.formDivider}>Partner details</div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Partner full name</label>
                      <input className={styles.formInput} value={partnerName} onChange={e => setPartnerName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Partner date of birth</label>
                      <input type="date" className={styles.formInput} value={partnerDob} onChange={e => setPartnerDob(e.target.value)} />
                    </div>
                  </div>
                )}
                {teaserError && <div className={styles.formError}>{teaserError}</div>}
                <button type="submit" disabled={teaserLoading} className={`${styles.teaserBtn} ${styles.ctaBtnFull}`}>
                  {teaserLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Show my preview'}
                </button>
                <p className={styles.teaserHint}>Used only to generate your preview. Never stored or shared.</p>
              </form>
            ) : (
              <div ref={teaserResultRef}>
                <div className={styles.audioRow}>
                  <p style={{ flex: 1, fontSize: '0.76rem', color: 'rgba(26,23,20,0.6)', margin: 0 }}>Prefer to listen?</p>
                  <button onClick={audioPlaying ? stopAudio : speakTeaser} className={`${styles.audioBtn} ${audioPlaying ? styles.audioBtnActive : ''}`}>
                    {audioPlaying ? <><VolumeX size={13} /> Stop</> : <><Volume2 size={13} /> Listen</>}
                  </button>
                </div>
                <div className={styles.teaserResult}>
                  {teaserParagraphs.map((p, i) => {
                    const Icon = ICON_MAP[p.icon] || Sparkles
                    return (
                      <div key={i} className={styles.teaserPara}>
                        <div className={styles.teaserParaIcon}><Icon size={15} /></div>
                        <div>
                          <p className={styles.teaserParaTitle}>{sanitize(p.title)}</p>
                          <p className={styles.teaserParaBody}>{sanitize(p.content)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className={styles.teaserCutoff}>This preview is less than 10% of your full reading.</p>
                <button onClick={handleCTA} className={`${styles.ctaBtn} ${styles.ctaBtnFull}`}>
                  {teaserCtaText || `Get my full reading · $${price}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className={styles.goldRule} />

      {/* 3 — WHAT YOU GET */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: cfg.accent }}>What you get</span>
            <h2 className={styles.sectionTitle}>A complete synthesis</h2>
          </div>
          <div className={styles.getList}>
            {getGetItems(tool).map((item: string, i: number) => (
              <div key={i} className={styles.getItem}>
                <span className={styles.getDot} style={{ background: cfg.accent }} />
                <span>{sanitize(item)}</span>
              </div>
            ))}
          </div>
          <p className={styles.forLine}>{sanitize(getForLine(tool))}</p>
          {(tool.guidanceText) && (
            <div className={styles.guidanceCallout}>
              <span className={styles.guidanceLabel}>Included</span>
              <p>{sanitize(tool.guidanceText)}</p>
            </div>
          )}
        </div>
      </section>

      <hr className={styles.goldRule} />

      {/* 4 — HOW IT WORKS */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: '#7c3aed' }}>How it works</span>
            <h2 className={styles.sectionTitle}>Three steps</h2>
          </div>
          <div className={styles.stepsRow}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <div className={styles.stepTitle}>Enter your details</div>
              <div className={styles.stepBody}>Under 2 minutes</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <div className={styles.stepTitle}>Reading generates</div>
              <div className={styles.stepBody}>~{deliveryMins} minutes</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <div className={styles.stepTitle}>{isSub ? 'Scribe activates' : 'Receive it, private'}</div>
              <div className={styles.stepBody}>Instant access</div>
            </div>
          </div>
        </div>
      </section>

      <hr className={styles.goldRule} />

      {/* 5 — PROOF */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: cfg.accent }}>Proof</span>
            <h2 className={styles.sectionTitle}>What others found</h2>
          </div>
          <div>
            {getTestimonials(tool).map((t, i) => (
              <div key={i} className={styles.quoteCard}>
                <p className={styles.quoteText}>&ldquo;{sanitize(t.text)}&rdquo;</p>
                <p className={styles.quoteName}>{t.name}</p>
              </div>
            ))}
            {(tool.sampleExcerpt || tool.sample_excerpt) && (
              <div className={styles.sampleCard}>
                <p className={styles.sampleLabel}>From a real reading</p>
                <p className={styles.sampleText}>&ldquo;{sanitize(tool.sampleExcerpt || tool.sample_excerpt)}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className={styles.goldRule} />

      {/* 6 — FAQ */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: '#7c3aed' }}>Questions</span>
            <h2 className={styles.sectionTitle}>Before you begin</h2>
          </div>
          <div className={styles.faqList}>
            {BASE_FAQ.map((item, i) => <FAQItem key={i} q={sanitize(item.q)} a={sanitize(item.a)} />)}
          </div>
        </div>
      </section>

      <hr className={styles.goldRule} />

      {/* 7 — PRICING + GUARANTEE + TRUST (merged) */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow} style={{ color: cfg.accent }}>{isSub ? 'Monthly subscription' : 'Start today'}</span>
            <h2 className={styles.sectionTitle}>Your reading is ready</h2>
          </div>
          <div className={styles.priceCard}>
            <div className={styles.priceCardGlow} />
            <p className={styles.priceCompare}>Practitioner: {cfg.practitionerRate}</p>
            <div className={styles.priceNum}>$<CountUp target={price} />{isSub && <span className={styles.pricePeriod}>/mo</span>}</div>
            <p className={styles.priceNote}>{isSub ? 'Renews monthly. Cancel any time.' : 'One-time. Instant private access.'}</p>
            <div className={styles.includedList}>
              {[
                'Complete synthesis, specific to your details',
                'Private delivery, accessible only to you',
                isSub ? 'Ongoing access, permanent context' : `Delivered in ${deliveryMins} minutes`,
                isPartner ? 'Two-person synthesis included' : null,
                (tool.requiresImage || tool.requires_image) ? 'Physical analysis, upload after payment' : null,
              ].filter(Boolean).map((item, i) => (
                <div key={i} className={styles.includedItem}>
                  <CheckCircle size={14} style={{ color: cfg.accent, flexShrink: 0, marginTop: 2 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={handleCTA} className={`${styles.ctaBtn} ${styles.ctaBtnFull}`}>Begin your reading</button>
            <p className={styles.guaranteeLine}>
              <Shield size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              7-day guarantee. Not accurate? Full refund.
            </p>
          </div>

          <p className={styles.trustNote}>
            Synthesis method developed by <a href="/about" className={styles.trustLink}>Victor Hayford Samson</a>, credentialed through Ajdur Ruwhaaniy International.
          </p>
          <div className={styles.statRow}>
            <div><div className={styles.statNum}><CountUp target={2400} suffix="+" /></div><div className={styles.statLabel}>Delivered</div></div>
            <div><div className={styles.statNum}>{deliveryMins} min</div><div className={styles.statLabel}>Avg. delivery</div></div>
            <div><div className={styles.statNum}>100%</div><div className={styles.statLabel}>Private</div></div>
          </div>
        </div>
      </section>

      {/* 8 — FINAL CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaGlow} />
        <div className={styles.container} style={{ position: 'relative' }}>
          <h2 className={styles.finalTitle}>Ready to see it?</h2>
          <p className={styles.finalSub}>Private, specific, yours to keep.</p>
          <button onClick={handleCTA} className={styles.ctaBtn}>Begin your reading &middot; ${price}</button>
        </div>
      </section>

      {/* Sticky mobile bar */}
      <div className={styles.stickyBar}>
        <div className={styles.stickyInner}>
          <div className={styles.stickyText}>
            <p className={styles.stickyName}>{tool.name}</p>
            <p className={styles.stickyPrice}>${price}{isSub ? '/mo' : ''}</p>
          </div>
          <button onClick={handleCTA} className={styles.stickyBtn}>Get reading</button>
        </div>
      </div>
    </div>
  )
}
