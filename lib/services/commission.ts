interface CommissionTier {
  min: number
  max: number
  rate: number
}

const TIERS: CommissionTier[] = [
  { min: 5, max: 20, rate: 0.10 },
  { min: 21, max: 50, rate: 0.15 },
  { min: 51, max: Infinity, rate: 0.20 }
]

export function calculateCommission(referrals: number, purchaseAmount: number): number {
  const tier = TIERS.find(t => referrals >= t.min && referrals <= t.max)
  const rate = tier ? tier.rate : 0
  return purchaseAmount * rate
}

export function canWithdraw(referrals: number, pendingCommission: number): boolean {
  return referrals >= 5 && pendingCommission > 0
}

export function getNextPayoutDate(): Date {
  const now = new Date()
  const nextPayout = new Date(now)
  
  // Payout on 1st and 15th of each month
  if (now.getDate() < 15) {
    nextPayout.setDate(15)
  } else {
    nextPayout.setMonth(now.getMonth() + 1)
    nextPayout.setDate(1)
  }
  
  return nextPayout
}

export function formatPayoutDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}