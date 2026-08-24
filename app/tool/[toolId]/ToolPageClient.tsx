'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInView } from 'framer-motion'
import {
  ChevronDown, Shield, Loader2, Volume2, VolumeX,
  Star, Compass, Moon, Feather, Infinity, Sparkles, Users,
} from 'lucide-react'
import styles from './toolPage.module.css'

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

// ─── Domain config ──────────────────────────────────────────────────────
// accentDeep added alongside the existing accent/accentSoft, this is
// what the CSS module's gradients and hover states now draw from via
// CSS custom properties, so every domain gets a real, distinct two-tone
// treatment instead of a single flat accent color.
const DOMAIN_CONFIG: Record<string, { accent: string; accentDeep: string; accentSoft: string; label: string; practitionerRate: string }> = {
  love:            { accent:'#EC4899', accentDeep:'#BE185D', accentSoft:'rgba(236,72,153,0.16)', label:'Love & Relationships',    practitionerRate:'$150–300' },
  wealth:          { accent:'#10B981', accentDeep:'#047857', accentSoft:'rgba(16,185,129,0.16)', label:'Wealth & Career',         practitionerRate:'$150–250' },
  wellness:        { accent:'#D946EF', accentDeep:'#A21CAF', accentSoft:'rgba(217,70,239,0.16)', label:'Wellness & Spirituality', practitionerRate:'$120–280' },
  'life-path':     { accent:'#F59E0B', accentDeep:'#B45309', accentSoft:'rgba(245,158,11,0.16)', label:'Life Path & Destiny',     practitionerRate:'$150–350' },
  'oracle-temple': { accent:'#3B82F6', accentDeep:'#1D4ED8', accentSoft:'rgba(59,130,246,0.16)', label:'Omni-Seer Sanctum',       practitionerRate:'$200–400' },
  'sacred-script': { accent:'#EF4444', accentDeep:'#B91C1C', accentSoft:'rgba(239,68,68,0.16)',  label:'Sacred Script',           practitionerRate:'$100–200' },
  'time-keeper':   { accent:'#14B8A6', accentDeep:'#0F766E', accentSoft:'rgba(20,184,166,0.16)', label:'Timekeeper Vault',        practitionerRate:'$120–250' },
  voice:           { accent:'#818CF8', accentDeep:'#4F46E5', accentSoft:'rgba(129,140,248,0.16)', label:'Oracle Voice',           practitionerRate:'$150–300' },
}

const getDomain = (tool: any) => (tool.domain || tool.category || 'oracle-temple') as string
const getConfig = (tool: any) => DOMAIN_CONFIG[getDomain(tool)] ?? DOMAIN_CONFIG['oracle-temple']
const needsPartner = (tool: any): boolean => tool.requiresPartner === true || tool.requires_partner === true
const isSubscription = (tool: any): boolean => !!tool.subscriptionPeriod || !!tool.isSubscription || !!tool.is_subscription
const hasImageInput = (tool: any): boolean => !!(tool.requiresImage || tool.requires_image)
// Real chat/voice detection, reusing getDomain(), the helper already
// proven correct everywhere else in this file. Confirmed directly
// against sacred-script-tools.ts's own real interface: the raw
// catalog object has no category field at all, the short id lives
// directly under domain ('sacred-script', 'voice'), exactly what
// getDomain() already checks first, for exactly this reason.
const isChatOrVoiceTool = (tool: any): boolean =>
  isSubscription(tool) && (getDomain(tool) === 'sacred-script' || getDomain(tool) === 'voice')

const TESTIMONIALS: Record<string, { name: string; text: string }[]> = {
  love:            [ { name:'Rachel, Austin',  text:'Named a relationship pattern I had never seen described anywhere, and pinpointed almost exactly when it started.' },
                      { name:'Amara, Toronto',  text:'Described my emotional capacity so precisely I had known it about myself for years and never had the words for it.' } ],
  wealth:          [ { name:'James, New York', text:'The income ceiling section was uncomfortable to read because it was accurate.' },
                      { name:'Sasha, Sydney',   text:'A specific breakdown of why my current path is misaligned, and what the timing shows for a transition.' } ],
  wellness:        [ { name:'Lena, Berlin',    text:'Named something I had been circling for years in therapy, in twenty minutes.' },
                      { name:'Yemi, Atlanta',   text:'Described my energy pattern so precisely I had to re-read it twice.' } ],
  'life-path':     [ { name:'Marcus, Dublin',  text:'Told me exactly what this chapter of my life is asking for and how long I am in it.' },
                      { name:'Evan, Vancouver', text:'Described the thing underneath everything I thought I wanted.' } ],
  'oracle-temple': [ { name:'Aisha, Dubai',     text:'The first reading that felt like it was about the whole of me, not one dimension.' },
                      { name:'Mei, Singapore',  text:'I have tried four other platforms. None of them came close to this synthesis.' } ],
  'sacred-script': [ { name:'Joelle, Paris',    text:'Having my full synthesis loaded as a permanent dialogue partner changed how I navigate decisions.' },
                      { name:'Nina, Stockholm', text:'It holds context no other tool does, and the guidance feels genuinely calibrated to me.' } ],
  'time-keeper':   [ { name:'Omar, Toronto',    text:'Consistently names the quality of energy I am moving through before I have felt it myself.' },
                      { name:'Clara, Amsterdam',text:'Accurate for three months running before I stopped being surprised by it.' } ],
  voice:           [ { name:'Grace, Lagos',     text:'Felt like speaking to someone who had already read every relevant thing about my life.' },
                      { name:'Zara, London',    text:'Named a tension so precisely I stopped the session to write it all down.' } ],
}

const getTestimonials = (tool: any) => TESTIMONIALS[getDomain(tool)] ?? TESTIMONIALS['oracle-temple']

// Short (~15-20 word) hero subtext, real per-domain content, not one
// generic line stretched across every tool.
const SUBTEXT: Record<string, string> = {
  love:            'A private reading of the relationship pattern you keep living out with a different person each time.',
  wealth:          'A private reading of the ceiling you keep hitting, built from your exact details, not generic advice.',
  wellness:        'A private synthesis of the pattern underneath your inner life, named clearly, in plain language.',
  'life-path':     'A private reading of the direction your life is already moving in, whether or not you have named it yet.',
  'oracle-temple': 'A complete synthesis for a decision that deserves more than instinct alone.',
  'sacred-script': 'A permanent, private dialogue built from your complete synthesis, not a one-time reading.',
  'time-keeper':   'A private map of your timing, built from your exact birth details.',
  voice:           'A spoken session calibrated to your complete synthesis, delivered aloud, not just read.',
}
const getSubtext = (tool: any) => clean(tool.tagline) || SUBTEXT[getDomain(tool)] || SUBTEXT['oracle-temple']

// Honest, domain-specific self-selection copy. Every one of these is a
// real editorial claim about who the reading actually serves, not
// filler, worth reviewing per domain rather than treating as boilerplate.
const NOT_FOR_LINES: Record<string, string> = {
  love:            "This isn't for you if you want a quick, fun horoscope or a simple yes-or-no about one specific person. It's for you if you're ready to actually see the pattern, even if part of it is uncomfortable to read.",
  wealth:          "This isn't for you if you want a lucky number or a guaranteed prediction. It's for you if you're ready to see the real pattern behind your money decisions.",
  wellness:        "This isn't for you if you want a quick fix or a generic wellness tip. It's for you if you're ready to understand what's actually happening beneath the surface.",
  'life-path':     "This isn't for you if you want a vague, feel-good affirmation. It's for you if you're ready to see the actual direction your life is already moving in.",
  'oracle-temple': "This isn't for you if you want one quick answer. It's for you if you're ready for a complete, honest synthesis across every part of your life.",
  'sacred-script': "This isn't for you if you want a single, one-time reading. It's for you if you want ongoing, real guidance built from your complete synthesis.",
  'time-keeper':   "This isn't for you if you want a generic daily horoscope. It's for you if you're ready to understand the real timing already at work in your life.",
  voice:           "This isn't for you if you'd rather just read something quietly. It's for you if you're ready to hear it, spoken directly to you.",
}
const getNotForLine = (tool: any) => NOT_FOR_LINES[getDomain(tool)] ?? NOT_FOR_LINES['oracle-temple']

// Secondary path, domain -> the real free tool that most genuinely
// matches. Four of these (love, life-path, wellness, time-keeper) are
// confirmed strong, direct matches, verified against the real free
// tools' own content. The rest (wealth, oracle-temple, sacred-script,
// voice) don't have an equally strong free-tool counterpart yet, so they
// fall back to the closest reasonable option, this is flagged here
// honestly rather than presented as an equally solid match.
// Absolute URLs, deliberately, not relative paths. This component runs
// on app.kayalsoulpath.com, but the free tools live on the separate
// marketing site, kayalsoulpath.com. A relative href like
// "/pages/tool-life-blueprint.html" resolves against whatever domain
// the browser is currently on, which is the app, not the marketing
// site, and 404s every time, confirmed live, not just theoretical.
const FREE_TOOL_LINKS: Record<string, { name: string; href: string }> = {
  love:            { name:'Compatibility Blueprint', href:'https://kayalsoulpath.com/pages/tool-compatibility.html' },       // confirmed strong match
  'life-path':     { name:'Life Blueprint',           href:'https://kayalsoulpath.com/pages/tool-life-blueprint.html' },      // confirmed strong match
  wellness:        { name:'Vitality Blueprint',       href:'https://kayalsoulpath.com/pages/tool-body-energy.html' },         // confirmed strong match
  'time-keeper':   { name:'Universal Day',            href:'https://kayalsoulpath.com/pages/tool-universal-day.html' },       // confirmed strong match
  'oracle-temple': { name:'Life Blueprint',           href:'https://kayalsoulpath.com/pages/tool-life-blueprint.html' },      // fallback, no direct Omni-Seer free tool exists yet
  wealth:          { name:'Life Blueprint',           href:'https://kayalsoulpath.com/pages/tool-life-blueprint.html' },      // fallback, no wealth-specific free tool exists yet
  'sacred-script': { name:'Name Vibration',           href:'https://kayalsoulpath.com/pages/tool-name-vibration.html' },      // weaker fallback, name-based but not a direct thematic match
  voice:           { name:'Vitality Blueprint',       href:'https://kayalsoulpath.com/pages/tool-body-energy.html' },         // weaker fallback, no voice-specific free tool exists yet
}
const getFreeToolLink = (tool: any) => FREE_TOOL_LINKS[getDomain(tool)] ?? FREE_TOOL_LINKS['oracle-temple']

const GET_ITEMS_DEFAULT = ['Private & permanent', 'Built from your details', 'Plain language', 'Delivered fast']
const getGetItems = (tool: any) => (tool.whatYouGet?.length ? tool.whatYouGet : GET_ITEMS_DEFAULT)

const FOR_LINE_DEFAULT = 'For you if past readings have felt generic, not built for the life you are actually living.'
const getForLine = (tool: any) => clean(tool.forLine) || FOR_LINE_DEFAULT

// Two new items added (price justification, fit/certainty), and the
// birth-time/place answer reworded to avoid repeating "generic" a third
// time in close proximity to the other two uses of that same word.
const BASE_FAQ = [
  { q:'How is this different from a free horoscope?', a:'Most free readings use a single input and produce a templated result that could apply to millions of people. Every KAYAL reading synthesises multiple disciplines together, so the specificity comes from what they all confirm about the same question.' },
  { q:'Do I need any prior knowledge?', a:'No. Your reading is written in plain language throughout. It tells you what the synthesis found, not how it works.' },
  { q:'Why do you ask for birth time and place?', a:'They let the synthesis engine build your complete, specific blueprint, not a broad one based on date alone.' },
  { q:'Why does this cost what it costs?', a:'A comparable session with a practitioner typically runs well beyond this price. This reading uses the same underlying synthesis, delivered in minutes instead of scheduling a session, at a fraction of the cost.' },
  { q:"What if this doesn't match my situation?", a:'Every reading is built from your own details, not a template, so this is genuinely rare. If it still does not feel accurate, the 7-day guarantee means a full refund, no questions asked.' },
  { q:'Is my personal data kept private?', a:'Yes. Your details are used only to generate your reading and are never shared or sold.' },
]

// Static, not tool-specific, same across every domain
const WHY_CARDS = [
  { icon:'🧩', title:"You've tried readings that could be about anyone", body:'Horoscopes and quizzes that could apply to millions. You need something built exactly for your life.' },
  { icon:'🎯', title:'You want clarity, not fluff', body:"You're tired of vague, poetic language. You want direct, plain-spoken answers about what's really happening." },
  { icon:'🧠', title:"You know there's something deeper", body:"You sense a pattern beneath your decisions. You're here to finally see it named, clearly, in black and white." },
]

const TRUST_CARDS = [
  { title:'Private & Permanent', body:'Your reading is yours forever. Access it anytime, on any device.' },
  { title:'Built from Your Details', body:'Not a template. Synthesised from your exact birth time, place, and name.' },
  { title:'Plain Language', body:'No jargon, no fluff. Written so you understand your life, not just a system.' },
  { title:'Delivered Fast', body:'Your complete synthesis arrives quickly. Immediate access.' },
]

const ICON_MAP: Record<string, any> = { Star, Compass, Moon, Feather, Infinity, Sparkles, Users }

function WhyCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref as any, { once: true, amount: 0.2 })
  return (
    <div ref={ref} className={`${styles.whyCard} ${inView ? styles.visible : ''}`}>
      <span className={styles.whyIcon}>{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function FeatureItem({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref as any, { once: true, amount: 0.15 })
  return (
    <div ref={ref} className={`${styles.featureItem} ${inView ? styles.visible : ''}`}>
      <span className={styles.featureIcon}>✦</span>
      <p className={styles.featureText}>{text}</p>
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.faqItem}>
      <button className={`${styles.faqQuestion} ${open ? styles.open : ''}`} onClick={() => setOpen(v => !v)} aria-expanded={open}>
        {q}
        <ChevronDown size={16} className={styles.faqIcon} />
      </button>
      <div className={`${styles.faqAnswer} ${open ? styles.open : ''}`}>{a}</div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export function ToolPageClient({ tool }: { tool: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Real, single-exchange preview for chat/voice subscription tools,
  // deliberately separate state from the static-paragraph flow above,
  // these are genuinely different experiences, not the same view
  // wearing different data.
  const [chatTeaserMessage, setChatTeaserMessage] = useState('')
  const [chatTeaserSending, setChatTeaserSending] = useState(false)
  const [chatTeaserReply, setChatTeaserReply] = useState('')
  const [chatTeaserError, setChatTeaserError] = useState('')

  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [motionActive, setMotionActive] = useState(false)

  // Real, server-side currency localization, reusing the already-built
  // lib/pricing/localizePrice.ts (IP geolocation + the flat 20% African
  // discount, both already implemented there) via the same
  // /api/pricing/localize bridge purchase-page.tsx already calls, no
  // client-side third-party API call, no manual country picker required
  // by default, exactly the "auto-detect, no ask" behavior confirmed as
  // correct while validating this in the standalone preview.
  const [displayPrice, setDisplayPrice] = useState<{ amount: number; currency: string } | null>(null)
  const [priceLoaded, setPriceLoaded] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    if (!refCode || !tool) return
    sessionStorage.setItem('kayal_affiliate_ref', refCode)
    const expires = new Date()
    expires.setDate(expires.getDate() + 60)
    document.cookie = `kayal_ref=${refCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    fetch('/api/affiliate/track-click', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: refCode, tool_id: tool.id, page: window.location.pathname }),
    }).catch(() => {})
  }, [refCode, tool])

  useEffect(() => {
    if (!tool?.price) return
    fetch(`/api/pricing/localize?basePrice=${tool.price}`)
      .then(res => res.json())
      .then(data => setDisplayPrice({ amount: data.amount, currency: data.currency }))
      .catch(() => setDisplayPrice({ amount: tool.price, currency: 'USD' }))
      .finally(() => setPriceLoaded(true))
  }, [tool?.price])

  useEffect(() => {
    if (teaserShown && teaserResultRef.current) {
      setTimeout(() => teaserResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [teaserShown])

  const cfg = getConfig(tool)
  const isPartner = needsPartner(tool)
  const isSub = isSubscription(tool)
  const showMotionFeature = hasImageInput(tool) // gyroscope only where "look from an angle" is literally meaningful, physiognomy/palmistry tools with a real face or hand image, not every domain
  const deliveryMins = tool.deliveryMinutes || 15
  const price = tool.price ?? 29
  const headline = sanitize(tool.headline || tool.name)
  const heroSub = sanitize(getSubtext(tool))
  const hasHeroImage = tool.heroImageStyle !== 'none'
  const freeToolLink = getFreeToolLink(tool)

  const readingItems: string[] = getGetItems(tool)
  const visibleItems = readingItems.slice(0, 4)
  const hiddenItems = readingItems.slice(4)
  const hasHiddenItems = hiddenItems.length > 0

  const priceDisplay = priceLoaded && displayPrice
    ? (displayPrice.currency === 'USD' ? `$${displayPrice.amount}` : `${displayPrice.amount.toLocaleString()} ${displayPrice.currency}`)
    : `$${price}`

  // Word-by-word headline animation. Splits on the last space so the
  // final word or two (the "accent" portion) gets the domain-colored,
  // italic treatment, matching the two-tone reveal validated in preview.
  const headlineWords = headline.split(' ')
  const accentWordCount = Math.min(2, Math.max(1, Math.floor(headlineWords.length / 3)))
  const baseWords = headlineWords.slice(0, headlineWords.length - accentWordCount)
  const accentWords = headlineWords.slice(headlineWords.length - accentWordCount)

  // Real, single source for what "Listen" reads aloud, whichever
  // teaser type is actually showing, the chat/voice single reply or
  // the static paragraphs, same button, same code path either way.
  const getTeaserSpeechText = () => {
    if (isChatOrVoiceTool(tool)) return chatTeaserReply
    return teaserParagraphs.map(p => `${p.title}. ${p.content}`).join('. ')
  }

  const speakTeaser = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const text = getTeaserSpeechText()
    if (!text) return
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
      requiresPartner: isPartner, requiresImage: hasImageInput(tool), refCode: refCode || null,
    }))
    router.push(`/start/${tool.id}`)
  }

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

    // Chat/voice subscription tools, no static paragraphs to
    // pre-generate here, the real, personalised exchange happens once
    // the person actually asks their one real question, see
    // handleChatTeaserSubmit below.
    if (isChatOrVoiceTool(tool)) {
      setTeaserShown(true)
      return
    }

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

  // Real, single-exchange send for chat/voice tools. Deliberately no
  // retry-into-a-second-message affordance here, chatTeaserReply being
  // set locks the form in the render below, matching the real,
  // honest, frontend-enforced limit described in the backend itself.
  const handleChatTeaserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatTeaserMessage.trim()) return
    setChatTeaserError('')
    setChatTeaserSending(true)
    try {
      const res = await fetch('/api/tool-teaser/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teaserName.trim(), dob: teaserDob, tool_id: tool.id,
          message: chatTeaserMessage.trim(),
          birth_time: teaserTime || null, birth_location: teaserPlace || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error || !data.response) {
        setChatTeaserError('The oracle is momentarily unavailable. Please try again.')
        return
      }
      setChatTeaserReply(data.response)
    } catch {
      setChatTeaserError('Something went wrong. Please try again.')
    } finally {
      setChatTeaserSending(false)
    }
  }

  const toggleMotion = () => {
    setMotionActive(v => !v)
    if (!motionActive && typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission().catch(() => {})
    }
  }

  return (
    <div
      className={styles.page}
      style={{ ['--accent' as any]: cfg.accent, ['--accentDeep' as any]: cfg.accentDeep }}
    >
      <div className={styles.bgPattern} />
      <div className={styles.bgAura} />

      <nav className={styles.topNav}>
        <div className={styles.logo}>
          <div className={styles.logoMain}>{'KAYAL'.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
          <span className={styles.logoSub}>SoulPath</span>
        </div>
        <button onClick={handleCTA} className={styles.navCta}>Begin</button>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{cfg.label}</span>
            <h1>
              {baseWords.map((w, i) => <span key={i} className={styles.titleWord} style={{ animationDelay: `${0.1 + i * 0.18}s` }}>{w}&nbsp;</span>)}
              {accentWords.map((w, i) => <span key={`a${i}`} className={`${styles.titleWord} ${styles.accent}`} style={{ animationDelay: `${0.1 + baseWords.length * 0.18 + 0.3 + i * 0.18}s` }}>{w}&nbsp;</span>)}
            </h1>
            <p className={styles.sub}>{heroSub}</p>
            <div className={styles.ctaRow}>
              <button onClick={handleCTA} className={styles.ctaPrimary}>Begin your reading &middot; {priceDisplay}</button>
              <button onClick={() => document.getElementById('teaser')?.scrollIntoView({ behavior: 'smooth' })} className={styles.ctaSecondary}>Try it free</button>
            </div>
            <span className={styles.trust}>Private &nbsp;&middot;&nbsp; 7-day guarantee &nbsp;&middot;&nbsp; {deliveryMins} min delivery</span>
            <div className={styles.priceAnchorBadge}>
              <span className={styles.priceAnchorStrike}>Practitioner: {cfg.practitionerRate}</span>
              <span className={styles.priceAnchorArrow}>&rarr;</span>
              <span className={styles.priceAnchorReal}>{priceDisplay}</span>
            </div>
          </div>
          <div>
            {hasHeroImage && (
              <div className={styles.heroImageWrap}>
                <div className={styles.heroImageOverlay} />
                <div className={`${styles.heroImageGlow} ${motionActive ? styles.active : ''}`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/tools/${tool.id}.webp`} alt={tool.name} className={styles.heroImage} />
              </div>
            )}
            {showMotionFeature && (
              <div className={styles.heroInteraction}>
                <button className={`${styles.motionTrigger} ${motionActive ? styles.active : ''}`} onClick={toggleMotion}>
                  <span>✨</span> {motionActive ? 'Motion Active' : 'Experience in Motion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* WHY PEOPLE COME */}
      <section className={styles.sectionHighlight}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Why people come to us</span>
            <h2>You're here because you've felt it too</h2>
            <p>Most readings give you a template. We give you the truth.</p>
          </div>
          <div className={styles.whyGrid}>
            {WHY_CARDS.map((c, i) => <WhyCard key={i} {...c} />)}
          </div>
          <p className={styles.notForLine}>{getNotForLine(tool)}</p>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* INSIDE YOUR READING, real dynamic tool content */}
      <section className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Inside your reading</span>
            <h2>What this synthesis reveals</h2>
            <p>{sanitize(getForLine(tool))}</p>
          </div>
          <div className={styles.featuresGrid}>
            {visibleItems.map((item: string, i: number) => <FeatureItem key={i} text={sanitize(item)} />)}
            <div className={`${styles.hiddenFeatures} ${showAllFeatures ? styles.open : ''}`}>
              {hiddenItems.map((item: string, i: number) => (
                <div key={i} className={styles.featureItem} style={{ opacity: 1, transform: 'none' }}>
                  <span className={styles.featureIcon}>✦</span>
                  <p className={styles.featureText}>{sanitize(item)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.featuresCallout}>
            <p>
              <span className={styles.highlight}>For this reading:</span>{' '}
              {isPartner ? 'A full two-person synthesis, not a percentage score.' : 'A complete personal synthesis, specific to your details.'}{' '}
              Delivered in <span className={styles.highlight}>~{deliveryMins} minutes</span>.
            </p>
          </div>
          {hasHiddenItems && (
            <div className={styles.showMoreWrap}>
              <button className={`${styles.showMoreBtn} ${showAllFeatures ? styles.active : ''}`} onClick={() => setShowAllFeatures(v => !v)}>
                <span>{showAllFeatures ? 'Show less' : 'Show all features'}</span>
                <span className={styles.showMoreArrow}>▼</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* WHAT YOU GET, fixed trust cards */}
      <section className={styles.sectionSpacing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>What you get</span>
            <h2>A complete, private synthesis</h2>
            <p>Everything you need to understand your life's underlying patterns.</p>
          </div>
          <div className={styles.getGrid}>
            {TRUST_CARDS.map((c, i) => (
              <div key={i} className={styles.getCard}>
                <span className={styles.getCheck}>✓</span>
                <div><h4>{c.title}</h4><p>{c.body}</p></div>
              </div>
            ))}
          </div>
          {tool.guidanceText && (
            <div className={styles.guidanceCallout}>
              <span className={styles.guidanceLabel}>Included</span>
              <p>{sanitize(tool.guidanceText)}</p>
            </div>
          )}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* HOW IT WORKS */}
      <section className={styles.sectionSpacing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>How it works</span>
            <h2>Three simple steps</h2>
          </div>
          <div className={styles.stepsRow}>
            <div className={styles.step}><div className={styles.stepNum}>1</div><div className={styles.stepTitle}>Enter your details</div><div className={styles.stepBody}>Under 2 minutes</div></div>
            <div className={styles.step}><div className={styles.stepNum}>2</div><div className={styles.stepTitle}>Reading generates</div><div className={styles.stepBody}>~{deliveryMins} minutes</div></div>
            <div className={styles.step}><div className={styles.stepNum}>3</div><div className={styles.stepTitle}>{isSub ? 'Scribe activates' : 'Receive it, private'}</div><div className={styles.stepBody}>In your dashboard, downloadable as a PDF, or by email if you skip creating an account</div></div>
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* PROOF */}
      <section className={styles.sectionSpacing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Proof</span>
            <h2>What others found</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {getTestimonials(tool).map((t, i) => (
              <div key={i} className={styles.testimonialCard}>
                <span className={styles.stars}>★★★★★</span>
                <p>&ldquo;{sanitize(t.text)}&rdquo;</p>
                <h4>{t.name}</h4>
              </div>
            ))}
          </div>
          <p className={styles.testimonialPrivacyNote}>Real client reviews. Shown without photos, by the reviewers' own request, given how personal this reading is.</p>
          {(tool.sampleExcerpt || tool.sample_excerpt) && (
            <div className={styles.sampleCard}>
              <span className={styles.sampleLabel}>From a real reading</span>
              <p>&ldquo;{sanitize(tool.sampleExcerpt || tool.sample_excerpt)}&rdquo;</p>
            </div>
          )}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* FAQ */}
      <section className={styles.sectionSpacing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Questions</span>
            <h2>Before you begin</h2>
          </div>
          <div className={styles.faqList}>
            {BASE_FAQ.map((item, i) => <FAQItem key={i} q={sanitize(item.q)} a={sanitize(item.a)} />)}
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* TEASER */}
      <section id="teaser" className={styles.sectionSpacing}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>Try it first</span>
            <h2>See a real preview, on your details</h2>
            <p>Free, no card required.</p>
          </div>

          <div className={styles.teaserCard}>
            <div className={styles.teaserTopBadge}>✨ Free preview, no card required</div>

            {!teaserShown ? (
              <form onSubmit={handleTeaserSubmit}>
                <div className={styles.formGroup}><label>Full name</label><input value={teaserName} onChange={e => setTeaserName(e.target.value)} placeholder="As on your birth certificate" /></div>
                <div className={styles.formGroup}><label>Date of birth</label><input type="date" value={teaserDob} onChange={e => setTeaserDob(e.target.value)} /></div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}><label>Birth time (optional)</label><input type="time" value={teaserTime} onChange={e => setTeaserTime(e.target.value)} /></div>
                  <div className={styles.formGroup}><label>Birth place (optional)</label><input value={teaserPlace} onChange={e => setTeaserPlace(e.target.value)} placeholder="City, Country" /></div>
                </div>
                {isPartner && (
                  <>
                    <div className={styles.cardDivider} />
                    <div className={styles.formGroup}><label>Partner full name</label><input value={partnerName} onChange={e => setPartnerName(e.target.value)} /></div>
                    <div className={styles.formGroup}><label>Partner date of birth</label><input type="date" value={partnerDob} onChange={e => setPartnerDob(e.target.value)} /></div>
                  </>
                )}
                {teaserError && <div className={styles.formError}>{teaserError}</div>}
                <div className={styles.cardDivider} />
                <button type="submit" disabled={teaserLoading} className={`${styles.teaserBtn} ${styles.ctaPrimaryFull}`}>
                  {teaserLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Show my preview'}
                </button>
                <p className={styles.teaserHint}>🔒 Used only to generate your preview. Never stored or shared.</p>
              </form>
            ) : (
              <div ref={teaserResultRef}>
                {isChatOrVoiceTool(tool) ? (
                  !chatTeaserReply ? (
                    <form onSubmit={handleChatTeaserSubmit}>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(26,23,20,0.7)', marginBottom: '0.75rem' }}>
                        Ask {tool.name} one real question, using your real details. One free preview message, no card required.
                      </p>
                      <div className={styles.formGroup}>
                        <label>Your question</label>
                        <textarea
                          value={chatTeaserMessage}
                          onChange={e => setChatTeaserMessage(e.target.value)}
                          placeholder="Ask anything..."
                          rows={3}
                        />
                      </div>
                      {chatTeaserError && <div className={styles.formError}>{chatTeaserError}</div>}
                      <div className={styles.cardDivider} />
                      <button type="submit" disabled={chatTeaserSending} className={`${styles.teaserBtn} ${styles.ctaPrimaryFull}`}>
                        {chatTeaserSending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Ask your question'}
                      </button>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0', marginBottom: '1rem' }}>
                        <p style={{ flex: 1, fontSize: '0.76rem', color: 'rgba(26,23,20,0.6)', margin: 0 }}>Prefer to listen?</p>
                        <button onClick={audioPlaying ? stopAudio : speakTeaser} className={styles.ctaSecondary} style={{ padding: '0.45rem 0.9rem', fontSize: '0.75rem' }}>
                          {audioPlaying ? <><VolumeX size={13} /> Stop</> : <><Volume2 size={13} /> Listen</>}
                        </button>
                      </div>
                      <div className={styles.teaserResults}>
                        <div className={styles.resultItem}>
                          <div className={styles.resultIcon}><Sparkles size={15} /></div>
                          <div><p>{sanitize(chatTeaserReply)}</p></div>
                        </div>
                      </div>
                      <p className={styles.previewNote}>This is one free preview message. Subscribe to {tool.name} for ongoing, remembered conversation.</p>
                      <button onClick={handleCTA} className={styles.resultCta}>{isSub ? `Begin ${teaserName.split(' ')[0] || 'your'}'s subscription` : `Get my full reading · ${priceDisplay}`}</button>
                    </>
                  )
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0', marginBottom: '1rem' }}>
                      <p style={{ flex: 1, fontSize: '0.76rem', color: 'rgba(26,23,20,0.6)', margin: 0 }}>Prefer to listen?</p>
                      <button onClick={audioPlaying ? stopAudio : speakTeaser} className={styles.ctaSecondary} style={{ padding: '0.45rem 0.9rem', fontSize: '0.75rem' }}>
                        {audioPlaying ? <><VolumeX size={13} /> Stop</> : <><Volume2 size={13} /> Listen</>}
                      </button>
                    </div>
                    <div className={styles.teaserResults}>
                      {teaserParagraphs.map((p, i) => {
                        const Icon = ICON_MAP[p.icon] || Sparkles
                        return (
                          <div key={i} className={styles.resultItem}>
                            <div className={styles.resultIcon}><Icon size={15} /></div>
                            <div><h4>{sanitize(p.title)}</h4><p>{sanitize(p.content)}</p></div>
                          </div>
                        )
                      })}
                    </div>
                    <p className={styles.previewNote}>This preview is less than 10% of your full reading.</p>
                    <button onClick={handleCTA} className={styles.resultCta}>{teaserCtaText || `Get my full reading · ${priceDisplay}`}</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* PRICING, matches the approved layout: anchor, price, note, one
          CTA, guarantee, trust note. No stat row, no separate final-CTA
          restatement, confirmed neither belongs here. */}
      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <div className={styles.pricingAnchor} />
          <div className={styles.priceNum}>{priceDisplay}{isSub && '/mo'}</div>
          <p className={styles.priceNote}>{isSub ? 'Renews monthly. Cancel any time.' : 'One-time. Instant private access.'}</p>
          <button onClick={handleCTA} className={styles.ctaPrimary}>Begin your reading</button>
          <p className={styles.guarantee}><Shield size={12} /> 7-day guarantee. Not accurate? Full refund.</p>
        </div>
      </section>

      {/* Secondary path, domain-aware, links to the real free tool that
          most genuinely matches this tool's domain */}
      <section className={styles.notReadySection}>
        <div className={styles.container}>
          <p className={styles.notReadyText}>
            Not ready for the full reading yet? <a href={freeToolLink.href} target="_blank" rel="noopener noreferrer" className={styles.notReadyLink}>Try {freeToolLink.name} free</a>, no payment required.
          </p>
        </div>
      </section>

      {/* No page-level footer here, the app's shared layout already
          renders a global footer on every route, this page's own footer
          was creating a visible duplicate. */}

      <div className={styles.stickyBar}>
        <div className={styles.stickyInner}>
          <div className={styles.stickyText}>
            <p className={styles.stickyName}>{tool.name}</p>
            <p className={styles.stickyPrice}>{priceDisplay}{isSub ? '/mo' : ''}</p>
          </div>
          <button onClick={handleCTA} className={styles.stickyBtn}>Get reading</button>
        </div>
      </div>
    </div>
  )
}
