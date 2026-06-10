'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Mic, BookOpen, Clock, Crown, ArrowRight, Star, Sparkles } from 'lucide-react'

// ============================================================
// THE INNER SANCTUM — Premium Experience Section
// Four premium experiences above the standard domain tools.
// ============================================================

const STAGGER = 0.08

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * STAGGER }
  }),
}

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

const experiences = [
  {
    id: 'oracles-voice',
    name: "The Oracle's Voice",
    icon: Mic,
    emoji: '🎙️',
    tagline: 'Speak. Be heard. Receive your answer in real time.',
    desc: 'The only conversation where the voice on the other side already knows your complete blueprint before you say a word. Ask what you cannot ask anyone else, about your timing, your relationship, your purpose, your next move. The answer comes back specific to you, not to someone like you.',
    tools: 10,
    rating: 4.9,
    reviews: 2847,
    href: '/domain/voice-of-prophecy',
    tag: 'Live Voice',
    tagCls: 'bg-violet-100 text-violet-700',
    badgeCls: 'text-violet-600',
    gradient: 'from-violet-600 to-purple-700',
    glowColor: 'rgba(139,92,246,0.18)',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    price: 19,
    pricePeriod: '/session',
    type: 'subscription',
    stat: { value: '10', label: 'Voice experiences' },
  },
  {
    id: 'whispering-scroll',
    name: 'The Whispering Scroll',
    icon: BookOpen,
    emoji: '📜',
    tagline: 'Deep written dialogue. Your synthesis. Unlimited access.',
    desc: 'A scribe that holds everything known about your blueprint in permanent context. Every question you bring, about love, work, timing, or the pattern you cannot quite name, is answered from the complete picture of who you are. Not a search engine. A dialogue partner that already knows your full story.',
    tools: 10,
    rating: 4.9,
    reviews: 3124,
    href: '/domain/sacred-script',
    tag: 'Live Chat',
    tagCls: 'bg-amber-100 text-amber-700',
    badgeCls: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245,158,11,0.15)',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    price: 19,
    pricePeriod: '/month',
    type: 'subscription',
    stat: { value: '10', label: 'Chat experiences' },
  },
  {
    id: 'timekeepers-vault',
    name: "The Timekeeper's Vault",
    icon: Clock,
    emoji: '⏳',
    tagline: 'Wake every morning knowing what the day is asking of you.',
    desc: 'Most people live in permanent temporal confusion, making long-term moves in short-term cycles, resting when they should push, pushing when they should rest. The Vault maps your timing across five timescales so every decision lands in the right moment. Daily, monthly, quarterly, annual, and the nine-year arc that most people never see.',
    tools: 5,
    rating: 4.8,
    reviews: 1893,
    href: '/domain/eternal-clock',
    tag: 'Subscription',
    tagCls: 'bg-teal-100 text-teal-700',
    badgeCls: 'text-teal-600',
    gradient: 'from-teal-500 to-cyan-600',
    glowColor: 'rgba(20,184,166,0.15)',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    price: 19,
    pricePeriod: '/month',
    type: 'subscription',
    stat: { value: '5', label: 'Timing experiences' },
  },
  {
    id: 'grand-revelation',
    name: 'The Grand Revelation',
    icon: Crown,
    emoji: '👑',
    tagline: 'Every system. Every dimension. One complete portrait.',
    desc: 'The most thorough personal synthesis available anywhere. Every discipline, pattern analysis, sky map intelligence, physical structure reading, hand analysis, brought together and cross-referenced until only what every system confirms independently remains. The picture that emerges is not what any one discipline could produce. It is what they all agree on.',
    tools: 76,
    rating: 5.0,
    reviews: 1247,
    href: '/domain/omni-seer-sanctum',
    tag: 'Flagship',
    tagCls: 'bg-yellow-100 text-yellow-800',
    badgeCls: 'text-yellow-700',
    gradient: 'from-yellow-500 to-amber-600',
    glowColor: 'rgba(234,179,8,0.18)',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    price: 47,
    pricePeriod: '/report',
    type: 'report',
    stat: { value: '76', label: 'Deep synthesis tools' },
  },
]

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {rating.toFixed(1)} ({reviews.toLocaleString()})
      </span>
    </div>
  )
}

function ExperienceCard({ exp, index, isInView }: { exp: typeof experiences[0]; index: number; isInView: boolean }) {
  const Icon = exp.icon
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="group relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden
                 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${exp.glowColor}, 0 4px 16px rgba(0,0,0,0.08)` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
      onClick={() => { window.location.href = exp.href }}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${exp.gradient}`} />
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`${exp.iconBg} p-2.5 rounded-xl`}>
            <Icon className={`w-5 h-5 ${exp.iconColor}`} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exp.tagCls}`}>{exp.tag}</span>
            {exp.type === 'subscription' && <span className="text-[10px] text-gray-400 font-medium">Monthly</span>}
          </div>
        </div>
        <div className="mb-2">
          <span className="text-2xl leading-none mr-2">{exp.emoji}</span>
          <h3 className="inline font-bold text-gray-900 text-lg leading-tight">{exp.name}</h3>
        </div>
        <p className="text-xs font-medium text-gray-500 mb-3 italic">{exp.tagline}</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1 text-justify">{exp.desc}</p>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className={`text-2xl font-black ${exp.badgeCls}`}>{exp.stat.value}</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{exp.stat.label}</div>
          </div>
          <StarRating rating={exp.rating} reviews={exp.reviews} />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-400">From </span>
            <span className="text-xl font-black text-gray-900">${exp.price}</span>
            <span className="text-xs text-gray-400">{exp.pricePeriod}</span>
          </div>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r ${exp.gradient}
                        text-white text-xs font-bold shadow-sm hover:shadow-md hover:opacity-95
                        transition-all duration-200 group/btn`}
          >
            Explore
            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function InnerSanctum() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div variants={scaleIn} initial="hidden" animate={isInView ? 'visible' : 'hidden'} className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-full px-4 py-1.5 mb-4">
          <Crown className="w-3.5 h-3.5 text-yellow-600" />
          <span className="text-xs font-bold text-yellow-700 tracking-widest uppercase">Premium Experiences</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
          The Inner{' '}
          <span className="bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">Sanctum</span>
        </h2>
        <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
          Four premium experiences for those ready to go beyond a reading — into live dialogue,
          continuous guidance, and the complete four-system synthesis.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {experiences.map((exp, i) => (
          <ExperienceCard key={exp.id} exp={exp} index={i} isInView={isInView} />
        ))}
      </div>

      <motion.div custom={experiences.length} variants={fadeUp} initial="hidden" animate={isInView ? 'visible' : 'hidden'} className="mt-10 text-center">
        <p className="text-sm text-gray-400">
          All Inner Sanctum experiences include full access to your complete synthesis profile.{' '}
          <span className="text-gray-600 font-medium">Your chart is the context for every conversation, every forecast, and every report.</span>
        </p>
      </motion.div>
    </section>
  )
}