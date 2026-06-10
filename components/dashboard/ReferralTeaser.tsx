'use client'

/**
 * components/dashboard/ReferralTeaser.tsx
 *
 * Premium redesign — Cormorant Garamond headlines, Inter body.
 * All 7 states:
 *   1. Not logged in          → join prompt
 *   2. Anonymous user         → quick join
 *   3. Logged in, no profile  → join prompt
 *   4. Registered, pending    → under review
 *   5. Approved, not activated→ points progress
 *   6. Activated              → full stats + link
 *   7. Loading                → skeleton
 *
 * Commission:
 *   Low ticket  ($19–$29) base 25% · Performance 30% · Strategic 35%
 *   High ticket ($37–$79) base 30% · Performance 35% · Strategic 40%
 *   First payout: 5 pts (low=1.0pt, high=1.5pt) · no minimum amount
 *   Recurring: $50 min · 15th monthly · 60-day cookie
 *   Inactivity: suspended 60d · deleted 90d
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { useAuth }           from '@/lib/hooks/useAuth'
import { createClient }      from '@/lib/supabase/client'
import { toast }             from 'sonner'

const AFFILIATE_BASE       = 'https://affiliate.kayalsoulpath.com'
const ACTIVATION_THRESHOLD = 5.0

function salePoints(price: number): number {
  return price >= 37 ? 1.5 : 1.0
}
function ptLabel(n: number): string {
  return n % 1 === 0 ? `${n}` : n.toFixed(1)
}

interface AffiliateProfile {
  referral_code:    string | null
  commission_rate:  number | null
  total_earned:     number
  pending_payout:   number
  approved:         boolean | null
  payout_activated: boolean | null
  total_sales:      number | null
  status:           string | null
}
interface SaleRecord { amount: number }
interface Props { userId?: string }

// ─── Shared styles ─────────────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  borderRadius:    '16px',
  padding:         '24px',
  color:           'white',
  fontFamily:      "'Inter', sans-serif",
  position:        'relative',
  overflow:        'hidden',
}

const PURPLE_BG: React.CSSProperties = {
  ...CARD_STYLE,
  background: 'linear-gradient(145deg, #4C1D95, #6D28D9, #7C3AED)',
}

const BLUE_BG: React.CSSProperties = {
  ...CARD_STYLE,
  background: 'linear-gradient(145deg, #1e3a5f, #185FA5, #378ADD)',
}

const GREEN_BG: React.CSSProperties = {
  ...CARD_STYLE,
  background: 'linear-gradient(145deg, #065F46, #059669, #10B981)',
}

const AMBER_BG: React.CSSProperties = {
  ...CARD_STYLE,
  background: 'linear-gradient(145deg, #78350F, #B45309, #D97706)',
}

function Badge({ dot, label, color = '#86EFAC' }: { dot?: string; label: string; color?: string }) {
  return (
    <div style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '6px',
      background:   'rgba(255,255,255,0.15)',
      border:       '1px solid rgba(255,255,255,0.25)',
      borderRadius: '999px',
      padding:      '4px 12px',
      fontSize:     '11px',
      letterSpacing:'0.08em',
      textTransform:'uppercase',
      marginBottom: '14px',
    }}>
      {dot !== undefined && (
        <span style={{ width:6, height:6, borderRadius:'50%', background: color, flexShrink:0 }} />
      )}
      {label}
    </div>
  )
}

function Headline({ children, size = 26 }: { children: React.ReactNode; size?: number }) {
  return (
    <h3 style={{
      fontFamily:   "'Cormorant Garamond', Georgia, serif",
      fontSize:     `${size}px`,
      fontWeight:   600,
      lineHeight:   1.15,
      marginBottom: '6px',
      letterSpacing:'-0.01em',
      color:        'white',
    }}>
      {children}
    </h3>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize:     '13px',
      color:        'rgba(255,255,255,0.65)',
      marginBottom: '18px',
      lineHeight:   1.55,
    }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ height:1, background:'rgba(255,255,255,0.12)', margin:'0 0 16px' }} />
}

function PrimaryBtn({ label, accentColor = '#6D28D9', onClick }: {
  label: string; accentColor?: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        width:          '100%',
        padding:        '13px',
        borderRadius:   '12px',
        background:     hov ? '#F5F3FF' : 'white',
        color:          accentColor,
        fontSize:       '14px',
        fontWeight:     500,
        border:         'none',
        cursor:         'pointer',
        marginBottom:   '10px',
        transition:     'background 0.15s',
        fontFamily:     "'Inter', sans-serif",
        letterSpacing:  '0.01em',
      }}
    >
      {label}
      <span style={{ marginLeft:'auto', fontSize:'14px' }}>→</span>
    </button>
  )
}

function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        width:          '100%',
        padding:        '13px',
        borderRadius:   '12px',
        background:     hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
        color:          'white',
        fontSize:       '14px',
        fontWeight:     500,
        border:         '1px solid rgba(255,255,255,0.2)',
        cursor:         'pointer',
        marginBottom:   '10px',
        transition:     'background 0.15s',
        fontFamily:     "'Inter', sans-serif",
      }}
    >
      {label}
      <span style={{ marginLeft:'auto' }}>→</span>
    </button>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      textAlign:     'center',
      fontSize:      '11px',
      color:         'rgba(255,255,255,0.4)',
      letterSpacing: '0.03em',
      marginTop:     '2px',
    }}>
      {children}
    </p>
  )
}

function TierPills() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'18px' }}>
      {[
        { pct:'25%', label:'Standard', sub:'from day 1', highlight: false },
        { pct:'30%', label:'Performance', sub:'10+ sales', highlight: true },
        { pct:'35%', label:'Strategic', sub:'platforms', highlight: false },
      ].map(tier => (
        <div key={tier.label} style={{
          background:  tier.highlight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)',
          border:      `1px solid ${tier.highlight ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.14)'}`,
          borderRadius:'12px',
          padding:     '10px 6px',
          textAlign:   'center',
        }}>
          <div style={{
            fontFamily:  "'Cormorant Garamond', Georgia, serif",
            fontSize:    '22px',
            fontWeight:  600,
            lineHeight:  1,
            marginBottom:'3px',
            color:       'white',
          }}>
            {tier.pct}
          </div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', letterSpacing:'0.04em', lineHeight:1.4 }}>
            {tier.label}<br/>{tier.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickPoints() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
      {[
        '5 pts activates first payout',
        '60-day cookie',
      ].map(txt => (
        <div key={txt} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'rgba(255,255,255,0.65)' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.35)', flexShrink:0 }} />
          {txt}
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ points, threshold }: { points: number; threshold: number }) {
  const pct = Math.min((points / threshold) * 100, 100)
  return (
    <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'rgba(255,255,255,0.6)', marginBottom:'8px' }}>
        <span>{ptLabel(points)} / {threshold} points</span>
        <span>{pct >= 100 ? '✅ Activated' : `${ptLabel(threshold - points)} pts to go`}</span>
      </div>
      <div style={{ height:'6px', background:'rgba(255,255,255,0.15)', borderRadius:'999px', overflow:'hidden' }}>
        <div style={{
          width:       `${pct}%`,
          height:      '100%',
          background:  'white',
          borderRadius:'999px',
          transition:  'width 1s ease',
        }} />
      </div>
      <div style={{ marginTop:'8px', fontSize:'11px', color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>
        Low-ticket ($19–$29) = 1.0 pt · 25% commission<br />
        High-ticket ($37–$79) = 1.5 pts · 30% commission
      </div>
    </div>
  )
}

function ReferralLinkBox({ link, onCopy, copied }: { link: string; onCopy: () => void; copied: boolean }) {
  return (
    <div style={{
      background:   'rgba(255,255,255,0.08)',
      border:       '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      padding:      '10px 12px',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
      marginBottom: '16px',
    }}>
      <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', flexShrink:0 }}>🔗</span>
      <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {link}
      </span>
      <button
        onClick={onCopy}
        style={{ background:'none', border:'none', cursor:'pointer', color: copied ? '#86EFAC' : 'rgba(255,255,255,0.5)', fontSize:'14px', flexShrink:0, padding:0 }}
      >
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

function StatGrid({ earned, pending }: { earned: number; pending: number }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
      {[
        { label:'Total Earned',   value:`$${earned.toFixed(2)}`  },
        { label:'Pending Payout', value:`$${pending.toFixed(2)}` },
      ].map(s => (
        <div key={s.label} style={{
          background:  'rgba(255,255,255,0.1)',
          border:      '1px solid rgba(255,255,255,0.15)',
          borderRadius:'12px',
          padding:     '12px',
          textAlign:   'center',
        }}>
          <div style={{
            fontFamily:  "'Cormorant Garamond', Georgia, serif",
            fontSize:    '22px',
            fontWeight:  600,
            color:       'white',
            marginBottom:'3px',
          }}>
            {s.value}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', letterSpacing:'0.04em' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
export const ReferralTeaser = ({ userId }: Props) => {
  const router                       = useRouter()
  const { user: anonymousUser }      = useAnonymousStore()
  const { user: authUser }           = useAuth()
  const [copied,       setCopied]    = useState(false)
  const [profile,      setProfile]   = useState<AffiliateProfile | null>(null)
  const [earnedPoints, setPoints]    = useState(0)
  const [loading,      setLoading]   = useState(false)
  const [ready,        setReady]     = useState(false)

  const effectiveUserId = userId ?? authUser?.id
  const isAnonymous     = !authUser && !!anonymousUser
  const isPaidMember    = !!authUser

  useEffect(() => {
    if (!effectiveUserId) { setReady(true); return }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: prof } = await supabase
          .from('affiliate_profiles')
          .select('referral_code,commission_rate,total_earned,pending_payout,approved,payout_activated,total_sales,status')
          .eq('user_id', effectiveUserId)
          .maybeSingle()
        if (cancelled) return
        setProfile(prof ?? null)
        if (prof && !prof.payout_activated) {
          const { data: sales } = await supabase
            .from('affiliate_conversions')
            .select('amount')
            .eq('affiliate_id', effectiveUserId)
            .eq('status', 'confirmed')
          if (!cancelled && sales) {
            setPoints((sales as SaleRecord[]).reduce((s, x) => s + salePoints(x.amount), 0))
          }
        }
      } catch {/**/} finally {
        if (!cancelled) { setLoading(false); setReady(true) }
      }
    }
    run()
    return () => { cancelled = true }
  }, [effectiveUserId])

  const referralLink = profile?.referral_code
    ? `${AFFILIATE_BASE}/ref/${profile.referral_code}` : null
  const isActivated  = !!(profile?.payout_activated)
  const rate         = profile?.commission_rate ?? 25
  const firstName    = authUser?.name?.split(' ')[0] ?? anonymousUser?.name?.split(' ')[0] ?? 'Seeker'

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('Affiliate link copied!')
  }

  // ── 7. Loading skeleton ───────────────────────────────────
  if (!ready || loading) return (
    <div style={{ ...PURPLE_BG, opacity:0.7 }}>
      <div style={{ height:16, background:'rgba(255,255,255,0.15)', borderRadius:8, width:'40%', marginBottom:14 }} />
      <div style={{ height:28, background:'rgba(255,255,255,0.12)', borderRadius:8, width:'70%', marginBottom:8 }} />
      <div style={{ height:14, background:'rgba(255,255,255,0.08)', borderRadius:8, width:'90%', marginBottom:20 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:64, background:'rgba(255,255,255,0.08)', borderRadius:12 }} />)}
      </div>
      <div style={{ height:46, background:'rgba(255,255,255,0.12)', borderRadius:12 }} />
    </div>
  )

  // ── 1. Not logged in ──────────────────────────────────────
  if (!isPaidMember && !isAnonymous) return (
    <div style={PURPLE_BG}>
      <Badge dot="" label="Open programme" color="#86EFAC" />
      <Headline>Refer & Earn<br />Up to 40%</Headline>
      <Sub>Share Kayal LifeOS and earn commission on every sale your audience makes — from day one.</Sub>
      <TierPills />
      <QuickPoints />
      <Divider />
      <PrimaryBtn label="Join Free — Start Earning" accentColor="#6D28D9" onClick={() => router.push('/member/referral/register')} />
      <Footer>No approval required &nbsp;·&nbsp; Commission on every referred sale</Footer>
    </div>
  )

  // ── 2. Anonymous user ─────────────────────────────────────
  if (isAnonymous) return (
    <div style={PURPLE_BG}>
      <Badge dot="" label="Open programme" color="#86EFAC" />
      <Headline>Welcome,<br />{firstName}</Headline>
      <Sub>Your details are saved. Create your affiliate account in seconds and start earning 25% from day one.</Sub>
      <TierPills />
      <Divider />
      <PrimaryBtn label="Create Affiliate Account" accentColor="#6D28D9" onClick={() => router.push('/member/referral/register')} />
      <Footer>Your onboarding info will be used &nbsp;·&nbsp; Takes 30 seconds</Footer>
    </div>
  )

  // ── 3. Not yet registered as affiliate ───────────────────
  if (!profile) return (
    <div style={PURPLE_BG}>
      <Badge dot="" label="Open programme" color="#86EFAC" />
      <Headline>Refer & Earn<br />Up to 40%</Headline>
      <Sub>Share Kayal LifeOS and earn commission on every sale your audience makes — from day one.</Sub>
      <TierPills />
      <QuickPoints />
      <Divider />
      <PrimaryBtn label="Join the Affiliate Programme" accentColor="#6D28D9" onClick={() => router.push('/member/referral/register')} />
      <Footer>No approval required &nbsp;·&nbsp; Commission on every referred sale</Footer>
    </div>
  )

  // ── 4. Registered, pending approval ──────────────────────
  if (!profile.approved) return (
    <div style={AMBER_BG}>
      <Badge dot="" label="Under review" color="#FCD34D" />
      <Headline>Almost There,<br />{firstName}</Headline>
      <Sub>Your affiliate account is being set up. This is an open programme — accounts activate automatically within 24 hours.</Sub>
      <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:12, padding:'14px', marginBottom:'18px', fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:1.6 }}>
        Questions? Contact us at <span style={{ color:'white', fontWeight:500 }}>contact@kayalsoulpath.com</span>
      </div>
      <Divider />
      <GhostBtn label="Review Programme Rules" onClick={() => router.push('/member/referral/rules')} />
      <Footer>Usually activated within 24 hours</Footer>
    </div>
  )

  // ── 5. Approved, not yet activated ───────────────────────
  if (!isActivated) return (
    <div style={BLUE_BG}>
      <Badge dot="" label="Working toward first payout" color="#FCD34D" />
      <Headline>Keep Going,<br />{firstName}</Headline>
      <Sub>Each sale earns points. Hit 5 points and your full balance is paid out — no minimum amount.</Sub>
      <ProgressBar points={earnedPoints} threshold={ACTIVATION_THRESHOLD} />
      {referralLink && <ReferralLinkBox link={referralLink} onCopy={handleCopy} copied={copied} />}
      <Divider />
      <PrimaryBtn label="View Full Dashboard" accentColor="#185FA5" onClick={() => router.push('/member/referral/dashboard')} />
      <Footer>{rate}% base rate &nbsp;·&nbsp; 60-day cookie &nbsp;·&nbsp; All purchase types tracked</Footer>
    </div>
  )

  // ── 6. Fully activated affiliate ─────────────────────────
  return (
    <div style={GREEN_BG}>
      <Badge dot="" label="Affiliate active" color="#86EFAC" />
      <Headline>Your Earnings,<br />{firstName}</Headline>
      <Sub>Keep sharing. Your commission grows with every referred sale your audience makes.</Sub>
      <StatGrid earned={profile.total_earned ?? 0} pending={profile.pending_payout ?? 0} />
      {referralLink && <ReferralLinkBox link={referralLink} onCopy={handleCopy} copied={copied} />}
      <Divider />
      <PrimaryBtn label="View Full Dashboard" accentColor="#065F46" onClick={() => router.push('/member/referral/dashboard')} />
      <Footer>{rate}% base rate &nbsp;·&nbsp; Paid 15th monthly &nbsp;·&nbsp; $50 recurring min</Footer>
    </div>
  )
}
