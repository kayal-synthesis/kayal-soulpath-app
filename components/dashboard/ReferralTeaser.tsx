'use client'

import { useState, useEffect } from 'react'
import { useRouter }         from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { useAuth }           from '@/lib/hooks/useAuth'
import { createClient }      from '@/lib/supabase/client'
import { toast }             from 'sonner'

const AFFILIATE_BASE       = 'https://affiliate.kayalsoulpath.com'
const ACTIVATION_THRESHOLD = 5.0

function salePoints(price: number): number { return price >= 37 ? 1.5 : 1.0 }
function ptLabel(n: number): string { return n % 1 === 0 ? `${n}` : n.toFixed(1) }

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

const CARD: React.CSSProperties = {
  borderRadius: '16px',
  padding: '20px',
  color: 'white',
  fontFamily: "'Inter', sans-serif",
  position: 'relative',
  overflow: 'hidden',
}

const PURPLE: React.CSSProperties = { ...CARD, background: 'linear-gradient(145deg, #4C1D95, #7C3AED)' }
const BLUE:   React.CSSProperties = { ...CARD, background: 'linear-gradient(145deg, #1e3a5f, #378ADD)' }
const GREEN:  React.CSSProperties = { ...CARD, background: 'linear-gradient(145deg, #065F46, #10B981)' }
const AMBER:  React.CSSProperties = { ...CARD, background: 'linear-gradient(145deg, #78350F, #D97706)' }

function Btn({ label, ghost, accent = '#6D28D9', onClick }: { label: string; ghost?: boolean; accent?: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '11px', borderRadius: '10px', fontSize: '13px',
        fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '6px', border: ghost ? '1px solid rgba(255,255,255,0.2)' : 'none',
        background: ghost ? (hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)') : (hov ? '#F5F3FF' : 'white'),
        color: ghost ? 'white' : accent,
        fontFamily: "'Inter', sans-serif", transition: 'background 0.15s',
      }}
    >
      {label} <span style={{ marginLeft: 'auto' }}>→</span>
    </button>
  )
}

function MiniTiers() {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
      {[['25%', 'Standard'], ['30%', 'Performance'], ['35%', 'Strategic']].map(([pct, label]) => (
        <div key={label} style={{
          flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px', padding: '8px 4px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 600, color: 'white' }}>{pct}</div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ points, threshold }: { points: number; threshold: number }) {
  const pct = Math.min((points / threshold) * 100, 100)
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
        <span>{ptLabel(points)} / {threshold} pts</span>
        <span>{pct >= 100 ? '✅ Ready' : `${ptLabel(threshold - points)} to go`}</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'white', borderRadius: '999px', transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function LinkBox({ link, onCopy, copied }: { link: string; onCopy: () => void; copied: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center',
      gap: '8px', marginBottom: '12px',
    }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
      <button onClick={onCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#86EFAC' : 'rgba(255,255,255,0.5)', fontSize: '14px', padding: 0 }}>
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  )
}

function StatRow({ earned, pending }: { earned: number; pending: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
      {[['Total Earned', `$${earned.toFixed(2)}`], ['Pending', `$${pending.toFixed(2)}`]].map(([label, value]) => (
        <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 600, color: 'white' }}>{value}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

export const ReferralTeaser = ({ userId }: Props) => {
  const router                  = useRouter()
  const { user: anonymousUser } = useAnonymousStore()
  const { user: authUser }      = useAuth()
  const [copied,  setCopied]    = useState(false)
  const [profile, setProfile]   = useState<AffiliateProfile | null>(null)
  const [points,  setPoints]    = useState(0)
  const [loading, setLoading]   = useState(false)
  const [ready,   setReady]     = useState(false)

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
          if (!cancelled && sales) setPoints((sales as SaleRecord[]).reduce((s, x) => s + salePoints(x.amount), 0))
        }
      } catch {/**/} finally {
        if (!cancelled) { setLoading(false); setReady(true) }
      }
    }
    run()
    return () => { cancelled = true }
  }, [effectiveUserId])

  const referralLink = profile?.referral_code ? `${AFFILIATE_BASE}/ref/${profile.referral_code}` : null
  const isActivated  = !!(profile?.payout_activated)
  const rate         = profile?.commission_rate ?? 25
  const firstName    = authUser?.name?.split(' ')[0] ?? anonymousUser?.name?.split(' ')[0] ?? 'Seeker'

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied!')
  }

  if (!ready || loading) return (
    <div style={{ ...PURPLE, opacity: 0.7 }}>
      <div style={{ height: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 8, width: '40%', marginBottom: 10 }} />
      <div style={{ height: 24, background: 'rgba(255,255,255,0.12)', borderRadius: 8, width: '70%', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 52, background: 'rgba(255,255,255,0.08)', borderRadius: 10 }} />)}
      </div>
      <div style={{ height: 40, background: 'rgba(255,255,255,0.12)', borderRadius: 10 }} />
    </div>
  )

  if (!isPaidMember && !isAnonymous) return (
    <div style={PURPLE}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Affiliate Programme</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Earn Up to 40%</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: 1.5 }}>Share KAYAL and earn commission on every sale from day one.</p>
      <MiniTiers />
      <Btn label="Join Free, Start Earning" accent="#6D28D9" onClick={() => router.push('/member/referral/register')} />
    </div>
  )

  if (isAnonymous) return (
    <div style={PURPLE}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Affiliate Programme</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Hi, {firstName}</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: 1.5 }}>Create your affiliate account and start earning 25% from day one.</p>
      <MiniTiers />
      <Btn label="Create Affiliate Account" accent="#6D28D9" onClick={() => router.push('/member/referral/register')} />
    </div>
  )

  if (!profile) return (
    <div style={PURPLE}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Affiliate Programme</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Earn Up to 40%</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: 1.5 }}>Share KAYAL and earn commission on every sale from day one.</p>
      <MiniTiers />
      <Btn label="Join the Programme" accent="#6D28D9" onClick={() => router.push('/member/referral/register')} />
    </div>
  )

  if (!profile.approved) return (
    <div style={AMBER}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Under Review</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Almost There, {firstName}</h3>
      {/* Was "Your account activates automatically within 24 hours", true
          for Standard tier but not for Strategic, which is genuinely
          by-application and reviewed manually, no guaranteed timeframe.
          This can't easily tell which tier someone applied for at this
          point, so it stays honest for both rather than promising a
          specific window that may not hold for everyone who sees it. */}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: 1.5 }}>Your application is being reviewed. We will notify you the moment it's approved.</p>
      <Btn label="Review Programme Rules" ghost onClick={() => router.push('/member/referral/rules')} />
    </div>
  )

  if (!isActivated) return (
    <div style={BLUE}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>First Payout Progress</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Keep Going, {firstName}</h3>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', lineHeight: 1.5 }}>Hit 5 points and your balance is paid out instantly.</p>
      <ProgressBar points={points} threshold={ACTIVATION_THRESHOLD} />
      {referralLink && <LinkBox link={referralLink} onCopy={handleCopy} copied={copied} />}
      <Btn label="View Dashboard" accent="#185FA5" onClick={() => router.push('/member/referral/dashboard')} />
    </div>
  )

  return (
    <div style={GREEN}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Affiliate Active</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>Your Earnings, {firstName}</h3>
      <StatRow earned={profile.total_earned ?? 0} pending={profile.pending_payout ?? 0} />
      {referralLink && <LinkBox link={referralLink} onCopy={handleCopy} copied={copied} />}
      <Btn label="View Full Dashboard" accent="#065F46" onClick={() => router.push('/member/referral/dashboard')} />
    </div>
  )
}
