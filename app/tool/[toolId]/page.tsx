'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Star, Shield, ChevronDown, ChevronUp, CheckCircle,
  Clock, Users, Sparkles, ArrowRight, Heart, Eye, Zap,
  User, Camera, Compass, Moon, Feather, Infinity, Loader2,
} from 'lucide-react'
import styles from './toolPage.module.css'

import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniTools }         from '@/lib/constants/omni-seer-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const ALL_TOOLS = [
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
  ...omniTools, ...sacredScriptTools, ...timeKeeperTools, ...voiceTools,
]

const clean = (s?: string) =>
  s ? s.replace(/\u2014|\u2013/g, ',').trim() : ''

// ─── sanitize: replace forbidden methodology words ────────────────────────────
const SANITIZE_MAP: [RegExp, string][] = [
  [/\bnumerolog(?:y|ical|ist)\b/gi,     'pattern analysis'],
  [/\bastrol(?:ogy|ogical|oger)\b/gi,   'timing intelligence'],
  [/\bpalmist(?:ry)?\b/gi,              'physical markers reading'],
  [/\bMian Xiang\b/gi,                  'physical design reading'],
  [/\bphysiognom(?:y|ist|ic)\b/gi,      'physical design analysis'],
  [/\btarot\b/gi,                       'ancient wisdom reading'],
  [/\bhoroscope[s]?\b/gi,               'blueprint reading'],
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
]
function sanitize(text?: string): string {
  if (!text) return ''
  let r = clean(text)
  for (const [pat, rep] of SANITIZE_MAP) r = r.replace(pat, rep)
  return r
}

const DOMAIN_CONFIG: Record<string, {
  color: string; light: string; label: string; practitionerRate: string
}> = {
  love:            { color: '#BE185D', light: '#FDF2F8', label: 'Love and Relationships',    practitionerRate: '$150 to $300 per session' },
  wealth:          { color: '#15803D', light: '#F0FDF4', label: 'Wealth and Career',         practitionerRate: '$150 to $250 per session' },
  wellness:        { color: '#6D28D9', light: '#F5F3FF', label: 'Wellness and Spirituality', practitionerRate: '$120 to $280 per session' },
  'life-path':     { color: '#C2410C', light: '#FFF7ED', label: 'Life Path and Destiny',     practitionerRate: '$150 to $350 per session' },
  'oracle-temple': { color: '#3730A3', light: '#EEF2FF', label: 'Omni-Seer Sanctum',         practitionerRate: '$200 to $400 per session' },
  'sacred-script': { color: '#B91C1C', light: '#FEF2F2', label: 'Sacred Script',             practitionerRate: '$100 to $200 per session' },
  'time-keeper':   { color: '#0F766E', light: '#F0FDFA', label: 'Timekeeper Vault',          practitionerRate: '$120 to $250 per session' },
  voice:           { color: '#5B21B6', light: '#F5F3FF', label: 'Oracle Voice',              practitionerRate: '$150 to $300 per session' },
}
const getDomain  = (tool: any) => (tool.domain || tool.category || 'oracle-temple') as string
const getConfig  = (tool: any) => DOMAIN_CONFIG[getDomain(tool)] ?? DOMAIN_CONFIG['oracle-temple']

const PARTNER_TOOL_IDS = new Set([
  'twin-flame-verdict', 'compatibility-decoder', 'relationship-health-scan',
  'divorce-or-stay-reading', 'soulmate-compatibility-verdict',
  'professional-compatibility-scan',
])
// Tools needing a second person who is NOT a romantic partner
const SECONDARY_PERSON_IDS = new Set([
  'parent-child-mirror', 'family-blueprint',
])
const needsPartner = (tool: any): boolean =>
  tool.requiresPartner === true || tool.requires_partner === true || PARTNER_TOOL_IDS.has(tool.id)
const needsSecondPerson = (tool: any): boolean =>
  needsPartner(tool) || SECONDARY_PERSON_IDS.has(tool.id)
// Returns the correct label for the second person's details section
const getSecondPersonLabel = (tool: any): { section: string; name: string; dob: string; placeholder: string; notice: string } => {
  if (SECONDARY_PERSON_IDS.has(tool.id)) {
    const isFamily = tool.id === 'family-blueprint'
    const who = isFamily ? 'Family Member' : 'Child'
    return {
      section:     `${who} Details`,
      name:        `${who}'s full legal name`,
      dob:         `${who}'s date of birth`,
      placeholder: `${who}'s name as on birth certificate`,
      notice:      `This reading synthesises two blueprints. You will enter the ${who.toLowerCase()}'s details below.`,
    }
  }
  return {
    section:     'Partner Details',
    name:        'Partner full legal name',
    dob:         'Partner date of birth',
    placeholder: "Partner's name as on birth certificate",
    notice:      'This reading synthesises two complete blueprints. You will enter both sets of details below.',
  }
}

const SUBSCRIPTION_TOOL_IDS = new Set([
  'the-life-scribe','love-scribe','wealth-scribe','spiritual-scribe','health-scribe',
  'purpose-scribe','relationship-scribe','grief-scribe','parenting-scribe','business-scribe',
  'daily-personal-oracle','monthly-cycle-navigator','quarterly-destiny-pulse',
  'annual-arc-keeper','nine-year-arc-compass',
  'oracle-voice-session','oracle-deep-dive-session','love-oracle-session',
  'wealth-oracle-session','purpose-oracle-session','daily-voice-briefing',
  'relationship-oracle-session','spiritual-oracle-session','crisis-oracle-session',
  'oracle-voice-unlimited',
])
const isSubscription = (tool: any): boolean =>
  !!(tool.isSubscription) || !!(tool.is_subscription) || SUBSCRIPTION_TOOL_IDS.has(tool.id)

const ICON_MAP: Record<string, any> = {
  Star, Heart, Compass, Moon, Feather, Infinity, Sparkles,
}

const TESTIMONIALS: Record<string, { name: string; age: number; city: string; text: string }[]> = {
  love: [
    { name: 'Rachel',  age: 34, city: 'Austin, TX',      text: 'The reading named a specific relationship pattern I had never seen described anywhere. The way it pinpointed the exact Personal Year when that pattern first started was something no astrologer had ever done for me.' },
    { name: 'Priya',   age: 29, city: 'London, UK',      text: 'I have had astrology readings before. Nothing has ever been this specific. The love timing window section was accurate to within two weeks of a major shift in my relationship.' },
    { name: 'Amara',   age: 38, city: 'Toronto, CA',     text: 'What struck me was how precisely it described my emotional capacity. I had known this about myself for years and never been able to name it until I read this.' },
  ],
  wealth: [
    { name: 'James',   age: 41, city: 'New York, NY',    text: 'The income ceiling section was uncomfortable to read because it was accurate. It named the exact pattern that has kept me at the same income level for five years.' },
    { name: 'Sasha',   age: 33, city: 'Sydney, AU',      text: 'I was expecting generic advice. Instead I received a specific breakdown of why my current career path is misaligned with my wiring and what my chart shows about the timing for a transition.' },
    { name: 'David',   age: 45, city: 'Manchester, UK',  text: 'The synthesis of multiple disciplines was what made it different. A numerologist gave me one picture. An astrologer gave me another. This showed me how they connect.' },
  ],
  wellness: [
    { name: 'Lena',    age: 31, city: 'Berlin, DE',      text: 'The shadow reading named something I had been circling for years in therapy. One reading, twenty minutes, and the thing I could not articulate was right there in plain language.' },
    { name: 'Sofia',   age: 36, city: 'Los Angeles, CA', text: 'The ancestral wound section was the most accurate thing anyone has ever said to me about my family pattern. I sent it to my sister. She cried.' },
    { name: 'Yemi',    age: 28, city: 'Atlanta, GA',     text: 'I was skeptical about the vitality section. I am no longer skeptical. It described my energy pattern so precisely I had to re-read it twice.' },
  ],
  'life-path': [
    { name: 'Marcus',  age: 39, city: 'Dublin, IE',      text: 'The pinnacle reading put language to a transition I had been feeling but could not name. It told me exactly what this chapter of my life is asking for and how long I am in it.' },
    { name: 'Chioma',  age: 44, city: 'Houston, TX',     text: 'The nine-year cycle section was the most useful thing I have ever read about my own life. I could see every past cycle clearly once they were named.' },
    { name: 'Evan',    age: 32, city: 'Vancouver, CA',   text: 'The soul urge reading described the thing underneath everything I thought I wanted. I have been chasing the wrong version of my own desires for a decade.' },
  ],
  'oracle-temple': [
    { name: 'Aisha',   age: 35, city: 'Dubai, UAE',      text: 'The complete synthesis was worth every penny. It was the first reading that felt like it was about the whole of me, not just one dimension.' },
    { name: 'Tom',     age: 42, city: 'Edinburgh, UK',   text: 'I was not expecting the physical reading section to be accurate. It was the most accurate part of the entire report.' },
    { name: 'Mei',     age: 29, city: 'Singapore',       text: 'The synthesis of everything into one coherent picture is what no other platform does. I have tried four others. None of them came close.' },
  ],
  'sacred-script': [
    { name: 'Joelle',  age: 33, city: 'Paris, FR',       text: 'Having my full synthesis loaded as a permanent dialogue partner changed how I navigate every decision. It is like having a guide who already knows the full picture.' },
    { name: 'Kwame',   age: 38, city: 'Accra, GH',       text: 'The wealth scribe answered a question I had been sitting with for six months in about three minutes. The depth of context it carries is remarkable.' },
    { name: 'Nina',    age: 27, city: 'Stockholm, SE',   text: 'I use the love scribe more than I expected to. It holds context that no other tool does and the guidance it gives feels genuinely calibrated to me.' },
  ],
  'time-keeper': [
    { name: 'Omar',    age: 36, city: 'Toronto, CA',     text: 'The daily oracle is the first thing I check every morning. It consistently names the specific quality of energy I am moving through before I have had time to feel it myself.' },
    { name: 'Clara',   age: 41, city: 'Amsterdam, NL',   text: 'The monthly forecast was accurate for three months running before I stopped being surprised by it. The timing windows it identifies are genuinely useful.' },
    { name: 'Ryo',     age: 30, city: 'Tokyo, JP',       text: 'The annual arc gave me a framework for the year that I actually use. Every month I go back and check where I am meant to be. It has not been wrong once.' },
  ],
  voice: [
    { name: 'Grace',   age: 37, city: 'Lagos, NG',       text: 'The voice session felt like speaking to someone who had already read every relevant thing about my life. The depth of context it carried was unlike any consultation I have had.' },
    { name: 'Ben',     age: 43, city: 'Melbourne, AU',   text: 'I used the crisis session during a genuinely difficult moment. The guidance was grounded, specific, and did not feel generic. It knew my situation.' },
    { name: 'Zara',    age: 26, city: 'London, UK',      text: 'The purpose oracle session named the tension between what I am doing and what I am built for so precisely that I stopped the session to write it all down.' },
  ],
}
const getTestimonials = (tool: any) =>
  TESTIMONIALS[getDomain(tool)] ?? TESTIMONIALS['oracle-temple']

const HOOKS: Record<string, string> = {
  love:            'If you keep finding yourself in the same relationship dynamic with a different person, this reading identifies the specific pattern, why it formed, and when your chart opens for something different.',
  wealth:          'If you have worked hard for years and still feel like something invisible is keeping you below the level you know you are capable of, this reading shows exactly where that ceiling is in your blueprint.',
  wellness:        'If you have tried every framework for self-understanding and still feel like something essential is missing, this is the synthesis that brings the full picture together.',
  'life-path':     'If the path you are on feels like it belongs to someone else, this reading shows what you were actually built for and where you are in the larger arc of your life.',
  'oracle-temple': 'If you are navigating a significant decision and want clarity that goes deeper than logic or instinct alone, this is the synthesis that sees the full picture.',
  'sacred-script': 'If you need a space to ask the questions you cannot ask anywhere else, this scribe holds your complete blueprint in permanent context.',
  'time-keeper':   'If timing has always been your blind spot, decisions at the wrong moment and cycles that repeat, this is the map that changes that.',
  voice:           'If you want to hear your synthesis spoken rather than read it, this session delivers guidance calibrated to your complete blueprint.',
}
const getHook = (tool: any) =>
  clean(tool.hook) || HOOKS[getDomain(tool)] || HOOKS['oracle-temple']

const WHO_FOR: Record<string, string[]> = {
  love: [
    'You keep ending up in the same relationship dynamic with a different person and you cannot figure out why.',
    'You are single and doing the inner work but the right connection still has not arrived.',
    'You are in a relationship that feels good but not quite right and you want clarity.',
    'You have had readings before that felt generic. You want something that names the actual pattern.',
  ],
  wealth: [
    'You have worked hard for years and still feel like something invisible is keeping you below the level you know you are capable of.',
    'You have changed jobs, industries, or strategies and the same ceiling keeps appearing.',
    'You feel called to something specific but cannot get clarity on whether it is realistic.',
    'You want to understand the timing, not just what to do but when your chart opens for the move.',
  ],
  wellness: [
    'You have tried multiple frameworks for self-understanding and still feel like something essential is missing.',
    'You go through periods of clarity followed by periods of complete disconnection from yourself.',
    'The external markers of your life look fine. The internal experience is more complicated.',
    'You want a map of your actual inner wiring, not a generalised personality type.',
  ],
  'life-path': [
    'The path you are on feels like it belongs to someone else and you do not know how to name that clearly.',
    'You have a sense of what you are meant for but cannot reconcile it with the practical reality of your life.',
    'You keep making decisions that look correct from the outside but feel wrong from the inside.',
    'You want to understand the arc of your life, not just where you are now but the larger pattern it is part of.',
  ],
  default: [
    'You have tried to understand yourself through standard frameworks and find they only capture part of the picture.',
    'You are navigating a significant decision or transition and want clarity that goes deeper than logic.',
    'You have a sense of what is true about your situation but cannot yet see the full shape of it.',
    'You want a synthesis, not one perspective but the intersection of what multiple disciplines confirm about the same question.',
  ],
}
const getWhoFor = (tool: any) =>
  WHO_FOR[getDomain(tool)] ?? WHO_FOR.default

const BASE_FAQ = [
  {
    q: 'How is this different from a free horoscope or generic report?',
    a: 'Most readings use a single input such as your sun sign or birth date and produce a templated result that could apply to millions of people. Every KAYAL reading is generated from multiple disciplines working together. The specificity comes from the intersection of what all of them confirm about the same question.',
  },
  {
    q: 'Do I need to know anything about astrology or numerology?',
    a: 'No. The reading is written in plain language. It tells you what the synthesis found, not how the methodology works. No prior knowledge is needed.',
  },
  {
    q: 'Why do you collect birth time and place?',
    a: 'Birth time enables full chart analysis including house placements specific to your domain of focus. Birth place calibrates the chart to your exact location. Both significantly increase precision. An approximate time is still useful if you do not know the exact time.',
  },
  {
    q: 'Is my personal information private?',
    a: 'Your birth details and personal information are used solely to generate your reading. They are never shared with third parties and are not used for marketing. Your reading is private and accessible only to you.',
  },
  {
    q: 'I have had readings before that felt generic. What makes this different?',
    a: 'Generality comes from relying on a single discipline. When only your birth date is used, the result is one of a small number of possible outputs. KAYAL generates readings from the intersection of multiple disciplines producing an output specific to your exact birth details, name, time, and place.',
  },
  {
    q: 'What if my reading does not resonate?',
    a: 'If your reading does not feel specific to your actual life pattern, contact us within 7 days for a full refund. We have this policy because we have not yet needed to honour it.',
  },
]

// ─── Per-domain atmospheric backgrounds ──────────────────────────────────────
const DOMAIN_ATMOS: Record<string, { hero: string; accent: string }> = {
  love: {
    hero:   'radial-gradient(ellipse 70% 55% at 88% 8%,  #FDF2F8 0%, transparent 60%), radial-gradient(ellipse 45% 40% at 8% 88%,  #FDF2F8AA 0%, transparent 55%), radial-gradient(ellipse 35% 30% at 45% 55%, #FDF2F866 0%, transparent 50%)',
    accent: '#FDF2F8',
  },
  wealth: {
    hero:   'radial-gradient(ellipse 75% 50% at 95% 5%,  #F0FDF4 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 2%  95%, #F0FDF4AA 0%, transparent 55%), radial-gradient(ellipse 55% 35% at 50% 65%, #F0FDF466 0%, transparent 50%)',
    accent: '#F0FDF4',
  },
  wellness: {
    hero:   'radial-gradient(ellipse 65% 60% at 90% 10%, #F5F3FF 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 5%  85%, #F5F3FFAA 0%, transparent 55%), radial-gradient(ellipse 40% 45% at 55% 50%, #F5F3FF66 0%, transparent 50%)',
    accent: '#F5F3FF',
  },
  'life-path': {
    hero:   'radial-gradient(ellipse 70% 55% at 92% 12%, #FFF7ED 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 6%  90%, #FFF7EDAA 0%, transparent 55%), radial-gradient(ellipse 50% 35% at 40% 60%, #FFF7ED66 0%, transparent 50%)',
    accent: '#FFF7ED',
  },
  'oracle-temple': {
    hero:   'radial-gradient(ellipse 68% 55% at 85% 8%,  #EEF2FF 0%, transparent 60%), radial-gradient(ellipse 42% 45% at 10% 88%, #EEF2FFAA 0%, transparent 55%), radial-gradient(ellipse 38% 40% at 50% 55%, #EEF2FF66 0%, transparent 50%)',
    accent: '#EEF2FF',
  },
  'sacred-script': {
    hero:   'radial-gradient(ellipse 70% 50% at 90% 10%, #FEF2F2 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 5%  88%, #FEF2F2AA 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 48% 58%, #FEF2F266 0%, transparent 50%)',
    accent: '#FEF2F2',
  },
  'time-keeper': {
    hero:   'radial-gradient(ellipse 72% 55% at 88% 6%,  #F0FDFA 0%, transparent 60%), radial-gradient(ellipse 48% 42% at 8%  90%, #F0FDFAAA 0%, transparent 55%), radial-gradient(ellipse 42% 38% at 52% 60%, #F0FDFA66 0%, transparent 50%)',
    accent: '#F0FDFA',
  },
  voice: {
    hero:   'radial-gradient(ellipse 65% 60% at 88% 8%,  #F5F3FF 0%, transparent 60%), radial-gradient(ellipse 45% 48% at 5%  88%, #F5F3FFAA 0%, transparent 55%), radial-gradient(ellipse 40% 38% at 48% 55%, #F5F3FF66 0%, transparent 50%)',
    accent: '#F5F3FF',
  },
}
const getAtmos = (domain: string) => DOMAIN_ATMOS[domain] ?? DOMAIN_ATMOS['oracle-temple']

// ─── Animation ease ───────────────────────────────────────────────────────────
const E: [number, number, number, number] = [0.22, 1, 0.36, 1]
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const cardVariant = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: E } },
}

// ─── CountUp ─────────────────────────────────────────────────────────────────
function CountUp({ target, suffix = '', duration = 1200, style = {} as React.CSSProperties }: {
  target: number; suffix?: string; duration?: number; style?: React.CSSProperties;
}) {
  const ref    = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref as any, { once: true })
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let c = 0
    const steps = 60, inc = target / steps, ms = duration / steps
    const t = setInterval(() => {
      c += inc
      if (c >= target) { setCount(target); clearInterval(t) }
      else setCount(Math.floor(c))
    }, ms)
    return () => clearInterval(t)
  }, [inView, target, duration])
  return <span ref={ref} style={style}>{count}{suffix}</span>
}

// ─── FocusInput ───────────────────────────────────────────────────────────────
function FocusInput({ type = 'text', value, onChange, placeholder, accentColor, icon: IconComp }: {
  type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; accentColor: string; icon?: any;
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {IconComp && (
        <IconComp style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          width: 15, height: 15, pointerEvents: 'none',
          color: focused ? accentColor : '#a8a29e',
        }} />
      )}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className={styles.formInput}
        style={{
          paddingLeft: IconComp ? 38 : undefined,
          borderColor: focused ? accentColor : undefined,
          boxShadow:   focused ? `0 0 0 3px ${accentColor}18` : undefined,
          background:  focused ? 'white' : undefined,
        }}
      />
    </div>
  )
}

// ─── FAQItem — EXACT from original ───────────────────────────────────────────
function FAQItem({ q, a, color }: { q: string; a: string; color: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-neutral-50 transition"
      >
        <span className="text-sm font-medium text-neutral-800 pr-4">{q}</span>
        {open
          ? <ChevronUp   className="w-4 h-4 flex-shrink-0" style={{ color }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0 text-neutral-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 text-sm text-neutral-600 leading-relaxed bg-white border-t border-neutral-100">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── TeaserCard — EXACT from original ────────────────────────────────────────
function TeaserCard({ para }: { para: any }) {
  const Icon = ICON_MAP[para.icon] || Sparkles
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-4 p-4 rounded-xl border ${para.bg} ${para.border}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${para.iconBg}`}>
        <Icon className="w-4 h-4 text-neutral-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-800 mb-1">{para.title}</p>
        <p className="text-sm text-neutral-600 leading-relaxed">{para.content}</p>
      </div>
    </motion.div>
  )
}

// ─── VideoEmbed — resolves YouTube or Vimeo URL to embed src ─────────────────
function VideoEmbed({ url, color }: { url: string; color: string }) {
  const getEmbedSrc = (raw: string): string => {
    // YouTube — handle youtu.be, watch?v=, embed/ variants
    const ytShort   = raw.match(/youtu\.be\/([^?&]+)/)
    const ytWatch   = raw.match(/[?&]v=([^&]+)/)
    const ytEmbed   = raw.match(/youtube\.com\/embed\/([^?&]+)/)
    const ytId      = (ytShort || ytWatch || ytEmbed)?.[1]
    if (ytId) return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&color=white`
    // Vimeo
    const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?byline=0&portrait=0&title=0`
    // Already an embed URL — use as-is
    return raw
  }

  const src = getEmbedSrc(url)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9
        borderRadius: 18,
        overflow: 'hidden',
        background: '#1c1917',
        boxShadow: `0 8px 40px ${color}30, 0 2px 12px rgba(0,0,0,0.18)`,
        border: `2px solid ${color}22`,
      }}
    >
      <iframe
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 16,
        }}
        title="Product overview video"
        loading="lazy"
      />
    </motion.div>
  )
}

// ─── ShimmerBtn — CTA button with subtle shimmer sweep ───────────────────────
function ShimmerBtn({ children, onClick, className, style, whileHover, whileTap }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
  style?: React.CSSProperties; whileHover?: any; whileTap?: any;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`${className ?? ''} kayal-btn-glow`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      whileHover={whileHover}
      whileTap={whileTap}
    >
      {children}
      <span className="kayal-btn-shimmer" aria-hidden="true" />
    </motion.button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ToolSalesPage() {
  const params        = useParams()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const toolId        = params.toolId as string
  const tool          = ALL_TOOLS.find(t => t.id === toolId) as any
  const refCode       = searchParams.get('ref') || ''

  const [teaserName,       setTeaserName]      = useState('')
  const [teaserDob,        setTeaserDob]        = useState('')
  const [teaserTime,       setTeaserTime]       = useState('')
  const [teaserPlace,      setTeaserPlace]      = useState('')
  const [partnerName,      setPartnerName]      = useState('')
  const [partnerDob,       setPartnerDob]       = useState('')
  const [teaserLoading,    setTeaserLoading]    = useState(false)
  const [teaserParagraphs, setTeaserParagraphs] = useState<any[]>([])
  const [teaserCtaText,    setTeaserCtaText]    = useState('')
  const [teaserError,      setTeaserError]      = useState('')
  const [teaserShown,      setTeaserShown]      = useState(false)
  const teaserResultRef = useRef<HTMLDivElement>(null)

  const [founderImgError, setFounderImgError] = useState(false)

  const heroRef                           = useRef<HTMLElement>(null)
  const [stickyVisible, setStickyVisible] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // ── Affiliate click tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (!refCode) return

    // Store ref in sessionStorage so purchase page can attribute conversion
    sessionStorage.setItem('kayal_affiliate_ref', refCode)

    // Also store in cookie for 60-day window
    const expires = new Date()
    expires.setDate(expires.getDate() + 60)
    document.cookie = `kayal_ref=${refCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`

    // Track the click — increment clicks on the affiliate_links row
    const trackClick = async () => {
      try {
        await fetch('/api/affiliate/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref:     refCode,
            tool_id: toolId,
            page:    window.location.pathname,
          }),
        })
      } catch {
        // Silent fail — tracking should never break the page
      }
    }
    trackClick()
  }, [refCode, toolId])

  // Reset teaser state whenever the tool changes (client-side navigation guard)
  useEffect(() => {
    setTeaserName('')
    setTeaserDob('')
    setTeaserTime('')
    setTeaserPlace('')
    setPartnerName('')
    setPartnerDob('')
    setTeaserLoading(false)
    setTeaserParagraphs([])
    setTeaserCtaText('')
    setTeaserError('')
    setTeaserShown(false)
  }, [toolId])

  useEffect(() => {
    if (teaserShown && teaserResultRef.current) {
      setTimeout(() => {
        teaserResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }, [teaserShown])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const handleCTA = () => {
    if (!tool) return
    sessionStorage.setItem('kayal_selected_tool', JSON.stringify({
      id:              tool.id,
      name:            tool.name,
      price:           tool.price,
      emoji:           tool.emoji || '🔮',
      domain:          getDomain(tool),
      requiresPartner: needsPartner(tool),
      requiresImage:   !!(tool.requiresImage || tool.requires_image),
      refCode:         refCode || null,
    }))
    router.push(`/start/${tool.id}`)
  }

  const handleTeaserSubmit = async () => {
    if (!teaserName.trim() || !teaserDob) {
      setTeaserError('Please enter your name and date of birth to see your preview.')
      return
    }
    if (needsPartner(tool) && (!partnerName.trim() || !partnerDob)) {
      setTeaserError('Please enter your partner details for this compatibility reading.')
      return
    }
    setTeaserError('')
    setTeaserLoading(true)
    try {
      const res = await fetch('/api/tool-teaser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           teaserName.trim(),
          dob:            teaserDob,
          tool_id:        tool.id,
          birth_time:     teaserTime  || null,
          birth_location: teaserPlace || null,
          partner_name:   partnerName || null,
          session_id:     sessionStorage.getItem('kayal_session_id') || '0',
        }),
      })
      const data = await res.json()
      if (data.error) {
        setTeaserError('We could not generate your preview right now. Please try again.')
        return
      }
      setTeaserParagraphs(data.paragraphs || [])
      setTeaserCtaText(
        data.cta_text ||
        (isSubscription(tool)
          ? `Begin ${teaserName.split(' ')[0]}'s Subscription`
          : `Get ${teaserName.split(' ')[0]}'s Full Reading`)
      )
      setTeaserShown(true)
      sessionStorage.setItem('kayal_teaser_data', JSON.stringify({
        name:          teaserName.trim(),
        dob:           teaserDob,
        birthTime:     teaserTime  || '',
        birthLocation: teaserPlace || '',
        partnerName:   partnerName || '',
        partnerDob:    partnerDob  || '',
      }))
    } catch (err) {
      setTeaserError('Something went wrong. Please try again.')
    } finally {
      setTeaserLoading(false)
    }
  }

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-neutral-400 mb-4">Tool not found.</p>
          <button onClick={() => router.push('/dashboard')} className="text-sm underline text-neutral-500">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const cfg          = getConfig(tool)
  const testimonials = getTestimonials(tool)
  const hook         = getHook(tool)
  const whoFor       = getWhoFor(tool)
  const isPartner    = needsSecondPerson(tool)
  const secondLabel  = getSecondPersonLabel(tool)
  const isSub        = isSubscription(tool)
  const price        = tool.price ?? 29
  const headline     = clean(tool.name)
  const tagline      = sanitize(tool.tagline || tool.description || '')
  const whatYouGet: string[] = tool.whatYouGet || tool.what_you_get || []
  const deliveryMins = tool.deliveryMinutes || tool.delivery_minutes || 20
  const videoUrl     = tool.videoUrl || tool.video_url || null

  const domain = getDomain(tool)
  const atmos  = getAtmos(domain)

  const ctaLabel     = needsPartner(tool) ? 'Begin Our Reading'  : 'Begin My Reading'
  const ctaLabelFull = needsPartner(tool)
    ? `Begin Our Reading \u2014 $${price}${isSub ? '/mo' : ''}`
    : `Begin My Reading \u2014 $${price}${isSub ? '/mo' : ''}`

  const SP  = '3.5rem 0'
  const SPB: React.CSSProperties = { padding: SP, borderBottom: '1px solid #e8e3dc' }

  return (
    <div className={styles.page}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Core animations ─────────────────────────── */
        @keyframes kayalAmbientPulse {
          0%,100% { opacity: 0.22; }
          50%     { opacity: 0.55; }
        }
        @keyframes kayalFloat {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-9px); }
        }

        /* Floating orb — large soft blur blob */
        @keyframes kayalOrb {
          0%   { transform: translate(0px, 0px)   scale(1);    opacity: 0.18; }
          33%  { transform: translate(40px,-30px)  scale(1.08); opacity: 0.28; }
          66%  { transform: translate(-25px, 20px) scale(0.94); opacity: 0.2;  }
          100% { transform: translate(0px, 0px)   scale(1);    opacity: 0.18; }
        }
        /* Second orb — offset phase */
        @keyframes kayalOrb2 {
          0%   { transform: translate(0px, 0px)    scale(1);    opacity: 0.14; }
          33%  { transform: translate(-35px, 25px) scale(1.06); opacity: 0.24; }
          66%  { transform: translate(30px,-20px)  scale(0.96); opacity: 0.16; }
          100% { transform: translate(0px, 0px)    scale(1);    opacity: 0.14; }
        }
        /* Third orb — slow drift */
        @keyframes kayalOrb3 {
          0%   { transform: translate(0px, 0px)    scale(1);    opacity: 0.10; }
          50%  { transform: translate(20px, 35px)  scale(1.12); opacity: 0.18; }
          100% { transform: translate(0px, 0px)    scale(1);    opacity: 0.10; }
        }

        /* SVG arc slow rotation */
        @keyframes kayalRotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes kayalRotateRev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }

        /* Dot-grid slow pan */
        @keyframes kayalDotPan {
          0%   { background-position: 0px 0px; }
          100% { background-position: 26px 26px; }
        }

        /* Gold shimmer sweep across rule */
        @keyframes kayalGoldShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 300% center; }
        }

        /* Particle float — each particle gets its own delay via nth-child */
        @keyframes kayalParticle {
          0%   { transform: translateY(0px)   opacity: 0;   }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-120px); opacity: 0; }
        }

        /* Section background slow scroll */
        @keyframes kayalBgScroll {
          0%   { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        /* Gentle pulse ring on hero emoji */
        @keyframes kayalRingPulse {
          0%,100% { transform: scale(1);    opacity: 0; }
          50%     { transform: scale(1.7);  opacity: 0.2; }
        }

        .kayal-ambient-pulse { animation: kayalAmbientPulse 7s ease-in-out infinite; }
        .kayal-float         { animation: kayalFloat 3.2s ease-in-out infinite; }

        /* Orb blobs */
        .kayal-orb {
          position: absolute; border-radius: 50%;
          filter: blur(60px); pointer-events: none;
        }
        .kayal-orb-1 { animation: kayalOrb  14s ease-in-out infinite; }
        .kayal-orb-2 { animation: kayalOrb2 18s ease-in-out infinite; }
        .kayal-orb-3 { animation: kayalOrb3 22s ease-in-out infinite; }

        /* Rotating SVG rings */
        .kayal-ring-rotate-cw  { transform-origin: center; animation: kayalRotateSlow 60s linear infinite; }
        .kayal-ring-rotate-ccw { transform-origin: center; animation: kayalRotateRev  45s linear infinite; }

        /* Animated dot grid */
        .kayal-dots-anim {
          background-image: radial-gradient(circle, rgba(0,0,0,0.044) 1px, transparent 1px);
          background-size: 26px 26px;
          animation: kayalDotPan 8s linear infinite;
        }

        /* Animated gold rule */
        .kayal-gold-rule-anim {
          width: 100%; height: 1px; border: none; margin: 0;
          background: linear-gradient(
            90deg,
            transparent 0%, #D4AF7A33 10%, #B8975A 30%,
            #F0D898 50%, #B8975A 70%, #D4AF7A33 90%, transparent 100%
          );
          background-size: 300% 100%;
          animation: kayalGoldShimmer 4s ease-in-out infinite;
        }

        /* Pulse ring behind emoji */
        .kayal-emoji-ring {
          position: absolute; border-radius: 50%;
          pointer-events: none;
          animation: kayalRingPulse 3s ease-out infinite;
        }

        /* Subtle dot grid */
        .kayal-dots {
          background-image: radial-gradient(circle, rgba(0,0,0,0.048) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        /* Diagonal hairlines */
        .kayal-lines {
          background-image: repeating-linear-gradient(
            -52deg,
            transparent 0px, transparent 22px,
            rgba(0,0,0,0.018) 22px, rgba(0,0,0,0.018) 23px
          );
        }
        /* Gold shimmer rule */
        .kayal-gold-rule {
          width: 100%; height: 1px; border: none; margin: 0;
          background: linear-gradient(
            90deg,
            transparent 0%, #D4AF7A44 15%, #B8975A 35%,
            #E2C88A 50%, #B8975A 65%, #D4AF7A44 85%, transparent 100%
          );
        }
        /* Hero corner bracket ornaments */
        .kayal-corner-ornament { position: relative; }
        .kayal-corner-ornament::before,
        .kayal-corner-ornament::after {
          content: ''; position: absolute;
          width: 32px; height: 32px;
          opacity: 0.22; pointer-events: none;
        }
        .kayal-corner-ornament::before {
          top: 0; left: 0;
          border-top: 1.5px solid #B8975A;
          border-left: 1.5px solid #B8975A;
        }
        .kayal-corner-ornament::after {
          bottom: 0; right: 0;
          border-bottom: 1.5px solid #B8975A;
          border-right: 1.5px solid #B8975A;
        }
        /* Eyebrow pill badge */
        .kayal-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          border-radius: 100px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 0.85rem;
          border: 1px solid transparent;
        }
        /* Section symbol above headings */
        .kayal-section-symbol {
          font-size: 1.75rem;
          display: block;
          text-align: center;
          margin-bottom: 0.5rem;
          line-height: 1;
        }
        /* Animated underline on section titles */
        .kayal-title-underline {
          display: inline-block;
          position: relative;
        }
        .kayal-title-underline::after {
          content: '';
          position: absolute;
          bottom: -6px; left: 50%;
          transform: translateX(-50%);
          width: 40px; height: 2px;
          border-radius: 2px;
          background: #B8975A;
          opacity: 0.7;
        }
        /* Lively card icon ring */
        .kayal-icon-ring {
          width: 52px; height: 52px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          margin-bottom: 1rem;
        }
        /* Quote mark for testimonials */
        .kayal-quote-mark {
          font-family: Georgia, serif;
          font-size: 5rem;
          line-height: 0.75;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: block;
          opacity: 0.15;
        }
        /* Stat card gradient */
        .kayal-stat-card {
          border-radius: 20px;
          padding: 1.75rem 1.25rem;
          text-align: center;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
        }
        .kayal-stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          opacity: 0.07;
        }

        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }

        /* ── CTA shimmer sweep ───────────────────────── */
        @keyframes kayalBtnShimmer {
          0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          8%   { opacity: 1; }
          60%  { transform: translateX(220%) skewX(-18deg); opacity: 0; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        @keyframes kayalBtnGlow {
          0%,100% { box-shadow: 0 6px 24px rgba(0,0,0,0.16); }
          50%     { box-shadow: 0 8px 32px rgba(0,0,0,0.26), 0 0 0 3px rgba(255,255,255,0.12); }
        }
        .kayal-btn-shimmer {
          position: absolute;
          top: 0; left: 0;
          width: 45%; height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.18) 40%,
            rgba(255,255,255,0.32) 50%,
            rgba(255,255,255,0.18) 60%,
            transparent 100%
          );
          animation: kayalBtnShimmer 3.6s ease-in-out infinite;
          pointer-events: none;
          border-radius: inherit;
        }
        .kayal-btn-glow {
          animation: kayalBtnGlow 3.6s ease-in-out infinite;
        }
      ` }} />

      {/* STICKY HEADER */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            className={styles.topNav} style={{ position: 'fixed' }}
            initial={{ y: -64, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }} transition={{ duration: 0.28, ease: E }}
          >
            <div className={styles.navLogo}>
              <span className={styles.navMark}>{tool.emoji || '🔮'}</span>
              {headline}
            </div>
            <div className={styles.navRight}>
              <div className={styles.navStars}>★★★★★ <span>2,400+ readings</span></div>
              <ShimmerBtn
                whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
                onClick={handleCTA} className={styles.navCta} style={{ background: cfg.color }}
              >
                Begin &mdash; ${price}{isSub ? '/mo' : ''}
              </ShimmerBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A — DOMAIN COLOUR BAR */}
      <div style={{ height: 4, width: '100%', background: cfg.color }} />

      {/* B — HERO */}
      <section ref={heroRef} className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.heroOverlay} />

          {/* Atmospheric colour wash — breathing pulse */}
          <div className="kayal-ambient-pulse" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: atmos.hero,
          }} />

          {/* Animated dot grid — slow pan */}
          <div className="kayal-dots-anim" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.45,
          }} />

          {/* Orb 1 — large, top-left quadrant */}
          <div className="kayal-orb kayal-orb-1" style={{
            width: 520, height: 520,
            top: '-15%', left: '-10%',
            background: cfg.color,
            opacity: 0.18,
          }} />

          {/* Orb 2 — medium, bottom-right */}
          <div className="kayal-orb kayal-orb-2" style={{
            width: 380, height: 380,
            bottom: '-10%', right: '-8%',
            background: cfg.color,
            opacity: 0.14,
          }} />

          {/* Orb 3 — small, mid-left */}
          <div className="kayal-orb kayal-orb-3" style={{
            width: 260, height: 260,
            top: '30%', left: '5%',
            background: `#B8975A`,
            opacity: 0.10,
          }} />

          {/* Giant watermark glyph */}
          <div style={{
            position: 'absolute', right: '-4%', bottom: '-8%',
            fontSize: 'clamp(280px, 38vw, 520px)',
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
            color: cfg.color, opacity: 0.03,
            fontFamily: 'Georgia, serif', fontWeight: 700,
          }}>
            {tool.emoji || '◎'}
          </div>

          {/* Top-left arc rings — counter-clockwise rotation */}
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', top: '-5%', left: '-5%', width: '45%', maxWidth: 360, pointerEvents: 'none' }}
            viewBox="0 0 360 360" fill="none"
          >
            <circle className="kayal-ring-rotate-ccw" cx="0" cy="0" r="300"
              stroke={cfg.color} strokeWidth="0.8" strokeOpacity="0.09"
              strokeDasharray="6 14" />
            <circle className="kayal-ring-rotate-cw" cx="0" cy="0" r="230"
              stroke={cfg.color} strokeWidth="0.6" strokeOpacity="0.07"
              strokeDasharray="3 18" />
            <circle cx="0" cy="0" r="160"
              stroke={cfg.color} strokeWidth="0.5" strokeOpacity="0.05" />
          </svg>

          {/* Bottom-right arc rings — clockwise */}
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', bottom: '-8%', right: '-6%', width: '35%', maxWidth: 280, pointerEvents: 'none' }}
            viewBox="0 0 280 280" fill="none"
          >
            <circle className="kayal-ring-rotate-cw" cx="280" cy="280" r="240"
              stroke={cfg.color} strokeWidth="0.8" strokeOpacity="0.08"
              strokeDasharray="5 16" />
            <circle className="kayal-ring-rotate-ccw" cx="280" cy="280" r="170"
              stroke={cfg.color} strokeWidth="0.6" strokeOpacity="0.06"
              strokeDasharray="3 12" />
          </svg>

          {/* Centre radial glow — very subtle */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%', height: '70%',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${cfg.color}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        </div>
        <div className={`${styles.heroInner} kayal-corner-ornament`}>

          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: E }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
              {/* Pulse ring behind emoji */}
              <div className="kayal-emoji-ring" style={{
                width: 72, height: 72,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${cfg.color}`,
              }} />
              <span className="kayal-float" style={{ display: 'block', fontSize: 44, position: 'relative', zIndex: 1 }}>
                {tool.emoji || '🔮'}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: E }}
            className={styles.domainCrumb} style={{ color: cfg.color, marginBottom: '0.5rem' }}
          >
            {cfg.label}
          </motion.div>

          {/* Tool name — elegant serif H1, the primary product identifier */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: E }}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(1.512rem, 2.76vw, 2.376rem)',
              fontWeight: 700,
              color: '#1c1917',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: '1rem',
              textAlign: 'center',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {headline}
          </motion.h1>

          {/* Hook — refined italic subheading, sets up the emotional case */}
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: E }}
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
              fontStyle: 'italic',
              color: '#57534e',
              lineHeight: 1.7,
              maxWidth: 900,
              margin: '0 auto',
              marginBottom: tagline ? '0.75rem' : '1.75rem',
              textAlign: 'center',
            }}
          >
            {hook}
          </motion.p>

          {tagline && (
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38, ease: E }}
              className={styles.heroTagline} style={{ marginBottom: '1.75rem' }}
            >
              {tagline}
            </motion.p>
          )}

          {isPartner && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38, ease: E }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                maxWidth: 540, margin: '0 auto 1.5rem',
                padding: '0.75rem 1.25rem', borderRadius: 14,
                background: cfg.light, border: `1px solid ${cfg.color}30`,
              }}
            >
              <Users style={{ width: 15, height: 15, flexShrink: 0, color: cfg.color }} />
              <p style={{ fontSize: '0.85rem', color: cfg.color, margin: 0 }}>
                {secondLabel.notice}
              </p>
            </motion.div>
          )}

          {(tool.requiresImage || tool.requires_image) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38, ease: E }}
              className={styles.requireBar}
              style={{ margin: '0 auto 1.5rem', maxWidth: 540, borderRadius: 14 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera style={{ width: 14, height: 14, flexShrink: 0 }} />
                Physical analysis is included. You will upload your photo after payment.
              </span>
            </motion.div>
          )}

          {/* CTA — no price shown here */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.44, ease: E }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}
          >
            <ShimmerBtn
              whileHover={{ scale: 1.025, boxShadow: `0 10px 32px ${cfg.color}40` }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA} className={styles.ctaBtn} style={{ background: cfg.color }}
            >
              {ctaLabel}
            </ShimmerBtn>
          </motion.div>

          {/* Social proof — live urgency line */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.52 }}
            style={{ fontSize: '0.82rem', color: '#57534e', textAlign: 'center', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 0 2px #bbf7d080' }} />
            2,400+ readings delivered — yours generates in ~{deliveryMins} minutes.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.54 }}
            className={styles.trustStrip}
          >
            Secure checkout &middot; Instant access &middot; Private and confidential
          </motion.p>

          {/* Try free first — scrolls to teaser form */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.64 }}
            style={{ textAlign: 'center', marginTop: '0.75rem' }}
          >
            <button
              onClick={() => document.querySelector('.' + styles.teaserSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: cfg.color, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3, padding: 0, fontWeight: 600 }}
            >
              Not sure yet? Try it free first ↓
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.62, ease: E }}
            className={styles.heroRating} style={{ marginTop: '1.5rem' }}
          >
            <div className={styles.stars}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} style={{ width: 13, height: 13, fill: '#d97706', color: '#d97706' }} />
              ))}
              <span className={styles.ratingText}>
                {(tool.reviewCount || tool.review_count)
                  ? `${(tool.reviewCount || tool.review_count).toLocaleString()} readings delivered`
                  : '2,400 readings delivered'}
                {tool.rating ? ` \u00b7 ${tool.rating} out of 5` : ''}
                {` \u00b7 ~${deliveryMins} min delivery`}
              </span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* B.5 — HERO VIDEO — only renders when tool.videoUrl is set */}
      {videoUrl && (
        <>
          <hr className="kayal-gold-rule-anim" />
          <section style={{ background: '#ffffff', padding: '2.5rem 0', borderBottom: '1px solid #e8e3dc', position: 'relative', overflow: 'hidden' }}>
            <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25 }} />
            <div className={styles.container}>
              <div className={styles.sectionHeader} style={{ marginBottom: '1.5rem' }}>
                <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
                  Overview
                </span>
                <div className="kayal-section-symbol" style={{ color: cfg.color }}>▶</div>
                <h2 className={`${styles.sectionTitle} kayal-title-underline`}>
                  See how this reading works
                </h2>
              </div>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <VideoEmbed url={videoUrl} color={cfg.color} />
                <p style={{
                  textAlign: 'center', fontSize: '0.8rem', color: '#78716c',
                  marginTop: '0.875rem', fontStyle: 'italic',
                }}>
                  {deliveryMins}-minute delivery &middot; Specific to your exact details &middot; Private and confidential
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Gold rule */}
      <hr className="kayal-gold-rule-anim" />

      {/* C — TEASER */}
      <section className={styles.teaserSection} style={{ background: atmos.accent, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-lines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="kayal-orb kayal-orb-3" style={{ width: 340, height: 340, top: '-18%', right: '-8%', background: cfg.color, opacity: 0.07, filter: 'blur(72px)' }} />
        <div className="kayal-orb kayal-orb-1" style={{ width: 220, height: 220, bottom: '-12%', left: '-5%', background: '#B8975A', opacity: 0.05, filter: 'blur(60px)' }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              Free Preview
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>◎</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>
              See what this reading already shows about you
            </h2>
            <p className={styles.sectionSub} style={{ marginTop: '0.875rem' }}>
              Generated from your real birth data. No two previews are the same.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, ease: E }}
            className={styles.teaserBox} style={{ borderTop: `4px solid ${cfg.color}` }}
          >
            <AnimatePresence mode="wait">

              {!teaserShown && (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.teaserForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Your full legal name</label>
                    <FocusInput type="text" value={teaserName} onChange={e => setTeaserName(e.target.value)} placeholder="As it appears on your birth certificate" accentColor={cfg.color} icon={User} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date of birth</label>
                    <FocusInput type="date" value={teaserDob} onChange={e => setTeaserDob(e.target.value)} accentColor={cfg.color} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label className={styles.formLabel}>Birth time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <FocusInput type="time" value={teaserTime} onChange={e => setTeaserTime(e.target.value)} accentColor={cfg.color} />
                    </div>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label className={styles.formLabel}>Birth place <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <FocusInput type="text" value={teaserPlace} onChange={e => setTeaserPlace(e.target.value)} placeholder="City, Country" accentColor={cfg.color} />
                    </div>
                  </div>
                  {isPartner && (
                    <div style={{ marginTop: '1rem' }}>
                      <div className={styles.formDivider}>{secondLabel.section}</div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{secondLabel.name}</label>
                        <FocusInput type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder={secondLabel.placeholder} accentColor={cfg.color} icon={Users} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>{secondLabel.dob}</label>
                        <FocusInput type="date" value={partnerDob} onChange={e => setPartnerDob(e.target.value)} accentColor={cfg.color} />
                      </div>
                    </div>
                  )}
                  {teaserError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ padding: '0.7rem 1rem', borderRadius: 12, marginBottom: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.84rem', color: '#B91C1C' }}>
                      {teaserError}
                    </motion.div>
                  )}
                  <motion.button
                    whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
                    onClick={handleTeaserSubmit} disabled={teaserLoading}
                    className={styles.teaserBtn} style={{ background: cfg.color }}
                  >
                    {teaserLoading
                      ? <span className={styles.teaserLoading}><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />Generating your preview&hellip;</span>
                      : 'See What This Already Reveals About You'
                    }
                  </motion.button>

                  {/* Hint pills — preview of what the teaser will show */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.875rem', marginBottom: '0.25rem' }}>
                    {['Pattern revealed', 'Timing shown', 'Path identified'].map(hint => (
                      <span key={hint} style={{
                        padding: '0.3rem 0.85rem', borderRadius: '2rem',
                        background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                        color: cfg.color, textTransform: 'uppercase',
                      }}>{hint}</span>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.7rem', color: '#a8a29e', textAlign: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
                    Your details generate this preview only. Never stored or shared.
                  </p>
                </motion.div>
              )}

              {teaserShown && (
                <motion.div key="result" ref={teaserResultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.teaserOutput}>
                  <p style={{ fontSize: '0.82rem', color: '#78716c', marginBottom: '1rem' }}>
                    Reading preview generated for <strong style={{ color: '#1c1917' }}>{teaserName.split(' ')[0]}</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {teaserParagraphs.map((para: any, i: number) => (
                      <TeaserCard key={i} para={para} />
                    ))}
                  </div>
                  <div className={styles.teaserOutputCta}>
                    <p className={styles.teaserCutoff}>This preview is less than 10% of what your full reading contains.</p>
                    <motion.button
                      whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
                      onClick={handleCTA} className={styles.teaserGetBtn} style={{ background: cfg.color }}
                    >
                      {teaserCtaText
                        ? `${teaserCtaText} \u2014 $${price}${isSub ? '/month' : ''}`
                        : `Get My Full Reading \u2014 $${price}${isSub ? '/month' : ''}`}
                    </motion.button>
                  </div>
                  <button
                    onClick={() => { setTeaserShown(false); setTeaserParagraphs([]) }}
                    style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#a8a29e', textDecoration: 'underline', marginTop: '1rem', padding: '0.5rem' }}
                  >
                    Update my details
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* D — HERO IMAGE */}
      <div className={styles.container} style={{ padding: '0 1.5rem 3rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: E }}
          style={{ borderRadius: 18, overflow: 'hidden', background: atmos.accent, maxHeight: 'clamp(216px, 42vw, 504px)' }}
        >
          <Image
            src={`/images/tools/${tool.id}.webp`}
            alt={tool.name}
            width={1100}
            height={600}
            style={{ width: '100%', height: 'clamp(216px, 42vw, 504px)', objectFit: 'contain', display: 'block', background: atmos.accent }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </motion.div>
      </div>

      <hr className="kayal-gold-rule-anim" />

      {/* D.5 — WHAT HAPPENS AFTER YOU BEGIN */}
      <section style={{ background: '#ffffff', padding: SP, borderBottom: '1px solid #e8e3dc', position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              What Happens Next
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>◎</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>What happens after you begin</h2>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: 860, margin: '0 auto' }}>
            {[
              { step: '01', title: 'Enter your details', body: `Your name, date of birth, birth time, and place. This takes under two minutes and is the only input required.`, timing: 'Under 2 min' },
              { step: '02', title: 'Your reading generates', body: `Our synthesis engine runs your details through multiple disciplines simultaneously. Everything is processed privately and built specifically for you.`, timing: `~${deliveryMins} minutes` },
              { step: '03', title: 'You receive your reading', body: `Your complete synthesis is delivered to your account — private, permanent, and specific to your exact details. Nothing templated. Nothing generic.`, timing: 'Instant access' },
            ].map((item, i) => (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: E } } }}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
                style={{ background: '#faf8f4', borderRadius: 18, padding: '1.75rem', border: '1px solid #e8e3dc', borderTop: `4px solid ${cfg.color}`, position: 'relative', overflow: 'hidden' }}>
                {/* Step number watermark */}
                <div style={{ position: 'absolute', top: -4, right: 12, fontFamily: 'Georgia, serif', fontSize: '4.5rem', fontWeight: 800, color: cfg.color, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>
                  {item.step}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.875rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, boxShadow: `0 2px 8px ${cfg.color}40` }}>
                    {item.step}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.color, background: `${cfg.color}14`, padding: '2px 10px', borderRadius: '2rem' }}>{item.timing}</span>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.5rem', lineHeight: 1.3 }}>{item.title}</p>
                <p style={{ fontSize: '0.86rem', color: '#78716c', lineHeight: 1.65, margin: 0 }}>{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* E — WHO THIS READING IS FOR */}
      <section className={styles.problemSection} style={{ ...SPB, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.45 }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              Is This For You
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>✦</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>
              This reading is for you if&hellip;
            </h2>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className={styles.problemGrid}>
            {whoFor.map((line, i) => (
              <motion.div key={i} variants={cardVariant}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '1.25rem 1.5rem', borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid #e8e3dc',
                  borderLeft: `4px solid ${cfg.color}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.22s ease',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `${cfg.color}18`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginTop: 1,
                }}>
                  <CheckCircle style={{ width: 14, height: 14, color: cfg.color }} />
                </div>
                <p style={{ fontSize: '0.9rem', color: '#44403c', lineHeight: 1.6, margin: 0 }}>{line}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* F — WHAT YOU RECEIVE */}
      <section className={styles.whatSection} style={{ ...SPB, background: atmos.accent, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4 }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              What&apos;s Included
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>◎</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>What you receive</h2>
            <p className={styles.sectionSub} style={{ marginTop: '0.875rem' }}>
              Every section is specific to your exact birth details &mdash; not a templated output.
            </p>
          </div>
          {whatYouGet.length > 0 ? (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className={styles.whatGrid}>
              {whatYouGet.map((item: string, i: number) => (
                <motion.div key={i} variants={cardVariant}
                  whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.09)' }}
                  style={{
                    background: '#ffffff', borderRadius: 16,
                    border: '1px solid #e8e3dc',
                    borderTop: `4px solid ${cfg.color}`,
                    padding: '1.5rem', display: 'flex',
                    flexDirection: 'column', gap: 12,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="kayal-icon-ring" style={{ background: `${cfg.color}15`, width: 44, height: 44, marginBottom: 0 }}>
                    <CheckCircle style={{ width: 18, height: 18, color: cfg.color }} />
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#44403c', lineHeight: 1.65, margin: 0 }}>{sanitize(item)}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className={styles.whatCard} style={{ maxWidth: 560, margin: '0 auto' }}>
              <p>A complete personalised synthesis covering every relevant dimension of your question, delivered privately.</p>
            </div>
          )}
          {(tool.guidanceText || tool.guidance_text) && (
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, ease: E }}
              style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1.25rem 1.5rem', borderRadius: 14, background: 'white', border: `1px solid ${cfg.color}20` }}>
              <Sparkles style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2, color: cfg.color }} />
              <div>
                {(tool.guidanceType || tool.guidance_type) && (
                  <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, marginBottom: 4 }}>
                    {(tool.guidanceType || tool.guidance_type) === 'spiritual-remedy'   && 'Spiritual remedy included'}
                    {(tool.guidanceType || tool.guidance_type) === 'practical-solution' && 'Practical guidance included'}
                    {(tool.guidanceType || tool.guidance_type) === 'daily-guidance'     && 'Ongoing guidance included'}
                  </p>
                )}
                <p style={{ fontSize: '0.88rem', color: '#44403c', lineHeight: 1.65, margin: 0 }}>
                  {sanitize(tool.guidanceText || tool.guidance_text)}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* G — WHY KAYAL IS DIFFERENT */}
      <section className={styles.differenceSection} style={{ ...SPB, background: `${cfg.color}08`, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-lines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="kayal-orb kayal-orb-1" style={{ width: 400, height: 400, top: '-20%', right: '-10%', background: cfg.color, opacity: 0.07, filter: 'blur(80px)' }} />
        <div className="kayal-orb kayal-orb-2" style={{ width: 280, height: 280, bottom: '-15%', left: '-5%',  background: cfg.color, opacity: 0.05, filter: 'blur(70px)' }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              Why This Is Different
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>◈</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>What makes this different</h2>
            <p className={styles.sectionSub} style={{ marginTop: '0.875rem' }}>
              There is no shortage of readings available online. Here is why this one is not like the others.
            </p>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className={styles.differenceGrid}>
            {[
              { sym: '◎', title: 'We give you a truth, not a type.',          body: 'A type tells you what category you belong to. A truth tells you what is actually happening in your specific life, at this specific moment, with the specific pattern you are living through.' },
              { sym: '✦', title: 'We name what it reveals, not the system.',   body: 'You will never see methodology jargon in your reading. What you will see is what is true about you, named clearly, in plain language.' },
              { sym: '◈', title: 'We synthesise the complete picture.',        body: 'Every discipline sees something real. The problem is each one sees only part of the whole. KAYAL shows you the full shape, not a fragment of it.' },
              { sym: '⟡', title: 'A reading built entirely around you.',       body: 'No generic archetypes. No templated forecasts. The output is a synthesis that could only exist for your exact details, at your exact timing.' },
            ].map((card, i) => (
              <motion.div key={i} variants={cardVariant}
                whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
                style={{
                  background: '#ffffff', borderRadius: 20,
                  padding: '1.75rem',
                  border: '1px solid #e8e3dc',
                  borderTop: `4px solid ${cfg.color}`,
                  boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', gap: 14,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Faint watermark glyph */}
                <div style={{
                  position: 'absolute', bottom: -10, right: 8,
                  fontSize: '5rem', lineHeight: 1, color: cfg.color,
                  opacity: 0.04, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none',
                }}>
                  {card.sym}
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0a)`,
                  border: `1px solid ${cfg.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', color: cfg.color,
                }}>
                  {card.sym}
                </div>
                <div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: '#1c1917', marginBottom: 8, lineHeight: 1.35 }}>
                    {card.title}
                  </p>
                  <p style={{ fontSize: '0.88rem', color: '#78716c', lineHeight: 1.65, margin: 0 }}>{card.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* G.5 — MID-PAGE SECOND CTA NUDGE */}
      <div style={{ background: `${cfg.color}06`, padding: '2rem 0', borderBottom: '1px solid #e8e3dc', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, ease: E }}>
          <p style={{ fontSize: '0.88rem', color: '#78716c', marginBottom: '1rem', fontStyle: 'italic' }}>
            Want to see what this reading reveals before you commit?
          </p>
          <motion.button
            whileHover={{ background: cfg.color, color: 'white', borderColor: cfg.color }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { document.querySelector('.' + styles.teaserSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.75rem 2rem', borderRadius: '3rem',
              background: 'transparent', border: `2px solid ${cfg.color}`,
              color: cfg.color, fontSize: '0.9rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.22s', letterSpacing: '0.01em',
            }}
          >
            Get your free preview ↓
          </motion.button>
        </motion.div>
      </div>

      {/* H — WHY TRUST US */}
      <section className={styles.trustSection} style={{ ...SPB, background: atmos.accent, borderTop: 'none', position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35 }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              About This Platform
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>⟡</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>Built from a gap no one was filling</h2>
          </div>
          <div style={{ maxWidth: 820, margin: '0 auto 3rem', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, ease: E }}
              style={{ width: 96, height: 96, borderRadius: '50%', margin: '0 auto 1rem', border: `3px solid ${cfg.color}40`, overflow: 'hidden', position: 'relative', background: cfg.light, boxShadow: `0 4px 20px ${cfg.color}30` }}
            >
              {/* Fallback icon — always behind */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.light, zIndex: 0 }}>
                <User style={{ width: 36, height: 36, color: cfg.color }} />
              </div>
              {/* Founder photo — renders on top, hidden on error */}
              {!founderImgError && (
                <Image
                  src="/images/creator/founder.webp"
                  alt="Victor Hayford Samson"
                  width={96} height={96}
                  className="object-cover w-full h-full"
                  style={{ position: 'relative', zIndex: 1, borderRadius: '50%' }}
                  onError={() => setFounderImgError(true)}
                />
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.4, delay: 0.15, ease: E }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>Victor Hayford Samson</p>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: cfg.color, marginBottom: '1.25rem' }}>
                Founder, KAYAL LifeOS
              </p>
              {[
                'I spent years sitting with practitioners of ancient reading traditions that most people in the West have never encountered. Each one was precise. Each one was partial. A numerologist would name a pattern I recognised immediately — and then stop at the edge of what their system could see. An astrologer would reach further — and stop at a different edge. The disciplines were not in conflict. They were each holding one face of the same shape, and no one was assembling the whole thing.',
                'KAYAL exists because that assembly is what actually helps people. Not another single-discipline reading dressed up in new language — but a genuine synthesis where multiple independent systems are brought to bear on the same question until only the findings they agree on remain. That convergence is where the precision lives. It is also where the trust comes from.',
              ].map((p, idx) => (
                <p key={idx} style={{ fontSize: '0.9rem', color: '#44403c', lineHeight: 1.8, marginBottom: '1rem', textAlign: 'center' }}>{p}</p>
              ))}
            </motion.div>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className={styles.trustGrid}>
            {[
              { icon: '📖', value: <CountUp target={2400} suffix="+" style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 700, color: cfg.color }} />, sub: 'Readings delivered' },
              { icon: '🛡', value: <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 700, color: cfg.color }}>7 days</span>, sub: 'Money-back guarantee' },
              { icon: '⚡', value: <CountUp target={20} suffix=" min" style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 700, color: cfg.color }} />, sub: 'Average delivery' },
              { icon: '🔒', value: <span style={{ fontFamily: 'Georgia,serif', fontSize: '1.6rem', fontWeight: 700, color: cfg.color }}>100%</span>, sub: 'Private, never shared' },
            ].map((stat, i) => (
              <motion.div key={i} variants={cardVariant}
                whileHover={{ y: -5, boxShadow: '0 14px 36px rgba(0,0,0,0.10)' }}
                style={{
                  borderRadius: 20, padding: '1.75rem 1.25rem',
                  textAlign: 'center', position: 'relative', overflow: 'hidden',
                  background: '#ffffff',
                  border: `1.5px solid ${cfg.color}22`,
                  boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                }}
              >
                {/* Subtle gradient wash */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 20,
                  background: `linear-gradient(145deg, ${cfg.color}0c 0%, transparent 60%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem', position: 'relative' }}>{stat.icon}</div>
                <div style={{ marginBottom: 6, position: 'relative' }}>{stat.value}</div>
                <p style={{ position: 'relative', fontSize: '0.82rem', color: '#78716c' }}>{stat.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* I — HOW THE SYNTHESIS WORKS */}
      <section className={styles.howSection} style={{ ...SPB, background: `${cfg.color}06`, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />
        <div className="kayal-orb kayal-orb-2" style={{ width: 500, height: 500, top: '-25%', left: '-15%',    background: cfg.color, opacity: 0.06, filter: 'blur(90px)' }} />
        <div className="kayal-orb kayal-orb-3" style={{ width: 320, height: 320, bottom: '-18%', right: '-10%', background: cfg.color, opacity: 0.05, filter: 'blur(80px)' }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              The Method
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>☽</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>How the synthesis works</h2>
            <p className={styles.sectionSub} style={{ marginTop: '0.875rem' }}>
              KAYAL runs every reading through multiple private intelligence processes.
              The result is a convergence of every relevant intelligence, synthesised into one coherent picture.
            </p>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer}
            className={styles.howGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', maxWidth: '100%' }}>
            {[
              { glyph: '◎', title: 'Pattern Analysis',    body: 'The recurring structures in your blueprint that single-discipline readings never surface, named precisely so you can finally see the full shape of what keeps appearing in your life.' },
              { glyph: '☽', title: 'Timing Intelligence', body: 'Your current cycle, your active pinnacle, and the specific windows ahead when movement is most supported, and when stillness is what your blueprint actually requires.' },
              { glyph: '◇', title: 'Physical Markers',    body: 'What your physical design confirms about your tendencies, your capacity, and the patterns already visible in how you are built, adding a dimension no purely numerical system can provide.' },
              { glyph: '✦', title: 'Path Forward',        body: 'Not just what the synthesis finds, but what to do about it. A specific remedy, practice, or guidance drawn from the full picture, tailored to where you actually are right now.' },
            ].map((card, i) => (
              <motion.div key={i} variants={cardVariant}
                whileHover={{ y: -5, boxShadow: '0 14px 36px rgba(0,0,0,0.09)' }}
                style={{
                  background: '#ffffff', borderRadius: 20, padding: '1.75rem',
                  border: '1px solid #e8e3dc',
                  borderTop: `4px solid ${cfg.color}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${cfg.color}20, ${cfg.color}08)`,
                  border: `1px solid ${cfg.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: cfg.color, flexShrink: 0,
                }}>
                  {card.glyph}
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>{card.title}</p>
                <p style={{ fontSize: '0.85rem', color: '#78716c', lineHeight: 1.65, margin: 0 }}>{card.body}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, ease: E }}
            className={styles.whyNowInner} style={{ margin: '2rem auto 0', borderLeftColor: cfg.color }}>
            <Clock style={{ width: 22, height: 22, flexShrink: 0, color: cfg.color }} />
            <div>
              <p className={styles.whyNowTitle}>The same depth. A fraction of the cost.</p>
              <p className={styles.whyNowText}>
                A private session covering this domain with a qualified practitioner costs{' '}
                <strong>{cfg.practitionerRate}</strong>. This reading delivers equivalent depth, privately,
                in {deliveryMins} minutes, at <strong style={{ color: cfg.color }}>${price}{isSub ? '/mo' : ''}</strong>.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* J — TESTIMONIALS */}
      <section className={styles.testimonialSection} style={{ ...SPB, background: atmos.accent, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-lines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="kayal-orb kayal-orb-2" style={{ width: 360, height: 360, top: '-15%', left: '-8%',   background: cfg.color, opacity: 0.08, filter: 'blur(75px)' }} />
        <div className="kayal-orb kayal-orb-3" style={{ width: 240, height: 240, bottom: '-10%', right: '-5%', background: '#B8975A',  opacity: 0.06, filter: 'blur(65px)' }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              What Others Found
            </span>
            <div className="kayal-section-symbol" style={{ color: '#d97706' }}>★</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>What others have found</h2>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className={styles.testimonialGrid}>
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={cardVariant}
                whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
                style={{
                  background: '#ffffff', borderRadius: 20, padding: '1.75rem',
                  border: '1px solid #e8e3dc',
                  borderTop: `4px solid ${cfg.color}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 0,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Corner accent */}
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 60, height: 60,
                  background: `linear-gradient(225deg, ${cfg.color}12, transparent 60%)`,
                  borderRadius: '0 20px 0 60px',
                }} />
                {/* Stars */}
                <div style={{ display: 'flex', gap: 2, marginBottom: '0.75rem' }}>
                  {[1,2,3,4,5].map(s => <Star key={s} style={{ width: 13, height: 13, fill: '#d97706', color: '#d97706' }} />)}
                </div>
                {/* Giant quote mark */}
                <span className="kayal-quote-mark" style={{ color: cfg.color }}>&ldquo;</span>
                {/* Quote text */}
                <p style={{
                  fontFamily: 'Georgia, serif', fontSize: '0.93rem', fontStyle: 'italic',
                  color: '#44403c', lineHeight: 1.75, flex: 1, marginBottom: '1.25rem',
                }}>
                  {t.text}
                </p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: '1rem', borderTop: '1px solid #f0ece6' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`,
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.88rem', fontWeight: 700,
                    boxShadow: `0 2px 8px ${cfg.color}40`,
                  }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>{t.name}, {t.age}</p>
                    <p style={{ fontSize: '0.75rem', color: '#a8a29e', margin: 0 }}>{t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* FAQ — moved before Pricing so objections are resolved before the price is shown */}
      <section className={styles.faqSection} style={{ padding: SP, position: 'relative', overflow: 'hidden' }}>
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4 }} />
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              Questions
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>◇</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>Common questions</h2>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }} className={styles.faqList}>
            {BASE_FAQ.map((item, i) => (
              <motion.div key={i}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: E } } }}
                className={styles.faqItem}>
                <FAQItem q={item.q} a={item.a} color={cfg.color} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* K — PRICING */}
      <section style={{ background: '#ffffff', ...SPB }}>
        <div className={styles.container}>
          <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
            <span className="kayal-eyebrow-pill" style={{ background: `${cfg.color}18`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              {isSub ? 'Monthly Subscription' : 'Complete Synthesis Reading'}
            </span>
            <div className="kayal-section-symbol" style={{ color: cfg.color }}>✦</div>
            <h2 className={`${styles.sectionTitle} kayal-title-underline`}>Start today</h2>
          </div>
          {/* Urgency strip — honest availability signal */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.4, ease: E }}
            style={{ maxWidth: 520, margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#57534e' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 0 2px #bbf7d080' }} />
              Readings open now
            </span>
            <span style={{ width: 1, height: 14, background: '#e8e3dc', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', color: '#78716c' }}>
              Delivers in ~{deliveryMins} min &middot; Price subject to change
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: E }}
            style={{ maxWidth: 520, margin: '0 auto', borderRadius: 22, border: `2px solid ${cfg.color}33`, overflow: 'hidden' }}
          >
            <div style={{ background: cfg.light, padding: '2.25rem 2rem', textAlign: 'center' }}>
              {/* Price anchor — practitioner cost shown first */}
              <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.8rem', color: '#a8a29e', textDecoration: 'line-through', letterSpacing: '0.01em' }}>
                  Practitioner: {cfg.practitionerRate}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffffff', background: cfg.color, padding: '2px 8px', borderRadius: '2rem' }}>
                  vs this
                </span>
              </div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(3rem,8vw,4rem)', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                $<CountUp target={price} duration={1200} />
              </div>
              {isSub && <p style={{ fontSize: '0.88rem', color: '#78716c', margin: '4px 0 0' }}>/month</p>}
              <p style={{ fontSize: '0.78rem', color: '#78716c', marginTop: 8 }}>
                {isSub ? 'Renews monthly. Cancel any time.' : 'One-time. Instant private access.'}
              </p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.75rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a8a29e', marginBottom: '1rem' }}>Included</p>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                {([
                  'Complete multi-discipline synthesis specific to your exact details',
                  'Private delivery — accessible only to you',
                  isSub ? 'Ongoing access — your synthesis in permanent context' : `Delivered in ${deliveryMins} minutes`,
                  isPartner ? 'Two-person synthesis — both blueprints mapped and compared' : null,
                  (tool.requiresImage || tool.requires_image) ? 'Physical analysis included — upload after payment' : null,
                ] as (string | null)[]).filter(Boolean).map((item, i) => (
                  <motion.div key={i}
                    variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: E } } }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2, color: cfg.color }} />
                    <span style={{ fontSize: '0.87rem', color: '#44403c' }}>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.9rem 1.1rem', borderRadius: 12, background: cfg.light, marginBottom: '1.25rem' }}>
                <Sparkles style={{ width: 13, height: 13, flexShrink: 0, marginTop: 2, color: cfg.color }} />
                <p style={{ fontSize: '0.8rem', color: '#78716c', lineHeight: 1.65, margin: 0 }}>
                  A private session covering this domain costs <strong style={{ color: '#1c1917' }}>{cfg.practitionerRate}</strong>.
                  This delivers equivalent depth, privately, in {deliveryMins} minutes.
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ShimmerBtn
                  whileHover={{ scale: 1.025, boxShadow: `0 10px 32px ${cfg.color}40` }} whileTap={{ scale: 0.97 }}
                  onClick={handleCTA} className={styles.ctaBtn} style={{ background: cfg.color, width: '100%', borderRadius: 14 }}>
                  {ctaLabelFull}
                </ShimmerBtn>
                <p style={{ fontSize: '0.7rem', color: '#a8a29e', marginTop: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Shield style={{ width: 11, height: 11 }} />Secure</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye style={{ width: 11, height: 11 }} />Private</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle style={{ width: 11, height: 11 }} />7-day guarantee</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* L — GUARANTEE */}
      <section style={{ background: atmos.accent, padding: '3rem 0', borderBottom: '1px solid #e8e3dc' }}>
        <div className={styles.container}>
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, ease: E }}
            className={styles.whyNowInner} style={{ margin: '0 auto', borderLeftColor: cfg.color }}>
            <motion.div initial={{ opacity: 0, scale: 0.7, rotate: -30 }} whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: E }} className={styles.whyNowIcon}>
              <Shield style={{ width: 26, height: 26, color: cfg.color }} />
            </motion.div>
            <div>
              <p className={styles.whyNowTitle}>7-Day Specificity Guarantee</p>
              <p className={styles.whyNowText}>
                If your reading does not feel specific to your actual life pattern, not vague and not generic,
                contact us within 7 days and we will refund in full. We have this policy because we have not
                yet needed to honour it.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="kayal-gold-rule-anim" />

      {/* N — FINAL CTA */}
      <section className={styles.finalCta} style={{ background: atmos.accent, position: 'relative', overflow: 'hidden' }}>
        {/* Dot texture */}
        <div className="kayal-dots-anim" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />
        {/* Centred radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${cfg.color}12, transparent 70%)`,
        }} />
        {/* Animated rotating rings */}
        <svg aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: 700, pointerEvents: 'none' }} viewBox="0 0 700 700" fill="none">
          <circle className="kayal-ring-rotate-cw" cx="350" cy="350" r="320"
            stroke={cfg.color} strokeWidth="0.8" strokeOpacity="0.07" strokeDasharray="8 16" />
          <circle className="kayal-ring-rotate-ccw" cx="350" cy="350" r="260"
            stroke={cfg.color} strokeWidth="0.6" strokeOpacity="0.06" strokeDasharray="4 20" />
          <circle cx="350" cy="350" r="200"
            stroke={cfg.color} strokeWidth="0.5" strokeOpacity="0.04" />
        </svg>
        {/* Background orbs */}
        <div className="kayal-orb kayal-orb-1" style={{ width: 450, height: 450, top: '-20%', left: '-12%',   background: cfg.color, opacity: 0.09, filter: 'blur(80px)' }} />
        <div className="kayal-orb kayal-orb-3" style={{ width: 300, height: 300, bottom: '-15%', right: '-8%', background: '#B8975A',  opacity: 0.07, filter: 'blur(70px)' }} />
        <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.4, ease: E }}>
            <span className="kayal-float" style={{ display: 'block', fontSize: 48, marginBottom: '1rem' }}>
              {tool.emoji || '🔮'}
            </span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.45, delay: 0.08, ease: E }}
            className={styles.finalTitle}>
            {isPartner ? 'Ready to see your synthesis?' : 'Ready to see your blueprint?'}
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.4, delay: 0.16, ease: E }}
            className={styles.finalSub}>
            Your reading is synthesised individually from your exact details. Not a template.
            Not an archetype. A picture that could only exist for you.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: 0.24, ease: E }}>
            <ShimmerBtn
              whileHover={{ scale: 1.025, boxShadow: `0 10px 36px ${cfg.color}44` }} whileTap={{ scale: 0.97 }}
              onClick={handleCTA} className={styles.finalBtn} style={{ background: cfg.color }}>
              {ctaLabelFull}
            </ShimmerBtn>
          </motion.div>
          <p className={styles.finalTrust}>
            <Shield style={{ width: 11, height: 11, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Secure checkout &middot; Private &middot; 7-day guarantee
          </p>
        </div>
      </section>

      {/* MOBILE BOTTOM BAR — fixed, shown only on mobile via stickyBar CSS class */}
      <div className={styles.stickyBar}>
        <div className={styles.stickyInner}>
          <div>
            <p className={styles.stickyName}>{headline}</p>
            <p className={styles.stickyPrice}>${price}{isSub ? '/mo' : ''} &middot; ~{deliveryMins} min delivery</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <ShimmerBtn
              onClick={handleCTA}
              className={styles.stickyBtn}
              style={{ background: cfg.color }}
              whileHover={{ opacity: 0.88 }}
              whileTap={{ scale: 0.97 }}
            >
              {ctaLabel}
            </ShimmerBtn>
            <button
              onClick={() => document.querySelector('.' + styles.teaserSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: cfg.color, textDecoration: 'underline', textDecorationStyle: 'dotted', padding: 0, textUnderlineOffset: 2 }}
            >
              Try free first ↓
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
