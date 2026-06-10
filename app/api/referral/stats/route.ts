import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const month = searchParams.get('month') || new Date().getMonth() + 1
  const year = searchParams.get('year') || new Date().getFullYear()

  // TODO: Get sales count for this user in current month
  const monthlySales = 42 // Example

  // Calculate commission rate based on monthly sales
  const getCommissionRate = (sales: number): number => {
    if (sales < 5) return 0 // Doesn't qualify
    if (sales <= 30) return 0.10 // 10%
    if (sales <= 50) return 0.15 // 15%
    return 0.20 // 20%
  }

  const commissionRate = getCommissionRate(monthlySales)
  const qualifies = monthlySales >= 5

  return NextResponse.json({
    monthlySales,
    commissionRate,
    qualifies,
    nextTier: monthlySales < 5 ? 5 - monthlySales :
              monthlySales < 31 ? 31 - monthlySales :
              monthlySales < 51 ? 51 - monthlySales : 0,
    nextTierRate: monthlySales < 5 ? '10%' :
                  monthlySales < 31 ? '15%' :
                  monthlySales < 51 ? '20%' : 'Max'
  })
}