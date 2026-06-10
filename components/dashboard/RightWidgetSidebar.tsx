'use client'

import { EnrollConsultWidget }  from './EnrollConsultWidget'
import { ReferralTeaser }       from './ReferralTeaser'
import { SeekersCommunity }     from './SeekersCommunity'
import { RecentArticles }       from './RecentArticles'
import { CouponWidgets }        from './CouponWidgets'
import { MemberCouponWidget }   from './MemberCouponWidget'
import { DailyGuidance }        from './DailyGuidance'

interface RightWidgetSidebarProps {
  referralData: {
    clicks:    number
    earnings:  number
    referrals: number
  }
  userId?:        string
  userPurchases?: any[]
  dashboardType?: 'main' | 'member' | 'referral'
  userContext?:   {
    name?:         string   // display name
    dob?:          string   // YYYY-MM-DD
    birthTime?:    string   // HH:MM
    birthLocation?: string  // city, country
    personalDay?:  number   // pre-calculated in member-dashboard.tsx
    userId?:       string
  }
}

export function RightWidgetSidebar({
  referralData,
  userId,
  userPurchases  = [],
  dashboardType  = 'main',
  userContext,
}: RightWidgetSidebarProps) {

  // Greeting + date/time strings
  const now      = new Date()
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const date     = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const time     = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">

      {/* ── Daily Guidance — only shown on member dashboard when user is known ── */}
      {userId && dashboardType === 'member' && (
        <DailyGuidance
          userName={userContext?.name || 'Seeker'}
          greeting={greeting}
          date={date}
          time={time}
          personalDay={userContext?.personalDay ?? 5}
          userId={userId}
          dob={userContext?.dob}
          birthTime={userContext?.birthTime}
          birthLocation={userContext?.birthLocation}
        />
      )}

      {userId && dashboardType === 'member' && (
        <MemberCouponWidget
          userId={userId}
          purchaseCount={userPurchases.length}
        />
      )}

      {userId && dashboardType === 'main' && (
        <CouponWidgets
          userId={userId}
          purchaseCount={userPurchases.length}
          dashboardType="main"
        />
      )}

      {userId && dashboardType === 'referral' && (
        <CouponWidgets
          userId={userId}
          purchaseCount={userPurchases.length}
          dashboardType="referral"
        />
      )}

      <EnrollConsultWidget />
      <ReferralTeaser data={referralData} />
      <SeekersCommunity />
      <RecentArticles />
    </div>
  )
}
