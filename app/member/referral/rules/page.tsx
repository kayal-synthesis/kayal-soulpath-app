'use client'

import { Card } from '@/components/ui/Card'
import {
  Gift, Target, DollarSign, Shield, Clock,
  RefreshCw, AlertCircle, TrendingUp, CheckCircle,
  Award, UserX, Zap,
} from 'lucide-react'

export default function ReferralRulesPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-full mb-4">
            <Gift className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-3xl font-serif mb-3">Affiliate Programme Rules</h1>
          <p className="text-neutral-500 max-w-xl mx-auto text-sm">
            Kayal SoulPath Institute · app.kayalsoulpath.com · affiliate.kayalsoulpath.com
          </p>
        </div>

        <div className="space-y-6">

          {/* Commission Structure */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Commission Structure
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              Commission rate is determined by the tool price sold, not just your tier. Higher-priced tools earn higher base rates automatically.
            </p>

            {/* Base rates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-bold tracking-widest uppercase text-blue-500 mb-1">Low Ticket</p>
                <p className="text-3xl font-bold text-blue-700 mb-1">25%</p>
                <p className="text-xs text-blue-600">Tools priced $19 – $29</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs font-bold tracking-widest uppercase text-purple-500 mb-1">High Ticket</p>
                <p className="text-3xl font-bold text-purple-700 mb-1">30%</p>
                <p className="text-xs text-purple-600">Tools priced $37 – $79</p>
              </div>
            </div>

            {/* Bonus tiers */}
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="font-semibold text-green-800">Performance Bonus</p>
                    <p className="text-xs text-green-600">10+ qualifying sales in any rolling 30-day window · Auto-applied · No application required</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-green-700">+5%</p>
                    <p className="text-xs text-green-500">on all sales</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-100 rounded p-2 text-center text-green-800">
                    Low-ticket → <strong>30%</strong>
                  </div>
                  <div className="bg-green-100 rounded p-2 text-center text-green-800">
                    High-ticket → <strong>35%</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="font-semibold text-amber-800">Strategic Tier</p>
                    <p className="text-xs text-amber-600">Platform owners, influencers, content creators · By application · Negotiable to 40%+ based on volume</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-amber-700">+10%</p>
                    <p className="text-xs text-amber-500">on all sales</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-amber-100 rounded p-2 text-center text-amber-800">
                    Low-ticket → <strong>35%</strong>
                  </div>
                  <div className="bg-amber-100 rounded p-2 text-center text-amber-800">
                    High-ticket → <strong>40%</strong>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2">Apply via contact@kayalsoulpath.com</p>
              </div>
            </div>

            {/* Full rate table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-neutral-700 border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="text-left p-2 rounded-tl-lg">Tier</th>
                    <th className="text-center p-2">Low-ticket ($19–$29)</th>
                    <th className="text-center p-2 rounded-tr-lg">High-ticket ($37–$79)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {[
                    { tier: 'Standard',    low: '25%', high: '30%' },
                    { tier: 'Performance', low: '30%', high: '35%' },
                    { tier: 'Strategic',   low: '35%', high: '40%' },
                  ].map(row => (
                    <tr key={row.tier}>
                      <td className="p-2 font-medium">{row.tier}</td>
                      <td className="p-2 text-center font-bold text-primary-600">{row.low}</td>
                      <td className="p-2 text-center font-bold text-primary-600">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-neutral-400">
              Commission is calculated on the net sale amount after any applicable discounts. Applies to one-time purchases, subscription activations, upsells, and course purchases within the 60-day cookie window.
            </p>
          </Card>

          {/* First Payout Activation */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              First Payout Activation
            </h2>
            <p className="text-neutral-600 text-sm mb-4">
              Your first payout is activated once you reach <strong>5 points</strong>. There is no minimum amount — your full earned balance is paid on activation.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <p className="text-xs font-bold tracking-widest uppercase text-blue-500 mb-1">Low Ticket</p>
                <p className="text-3xl font-bold text-blue-700 mb-1">1.0</p>
                <p className="text-xs text-blue-600">point per sale</p>
                <p className="text-xs text-blue-400 mt-1">$19 – $29 tools</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-center">
                <p className="text-xs font-bold tracking-widest uppercase text-purple-500 mb-1">High Ticket</p>
                <p className="text-3xl font-bold text-purple-700 mb-1">1.5</p>
                <p className="text-xs text-purple-600">points per sale</p>
                <p className="text-xs text-purple-400 mt-1">$37 – $79 tools</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-3">
              <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-2">Examples</p>
              <div className="space-y-1.5 text-sm text-indigo-800">
                {[
                  ['5 low-ticket sales',   '5.0 pts', true],
                  ['4 high-ticket sales',  '6.0 pts', true],
                  ['2 high + 2 low',       '5.0 pts', true],
                  ['4 low + 1 high',       '5.5 pts', true],
                  ['1 high + 3 low',       '4.5 pts — not yet', false],
                ].map(([label, pts, ok]) => (
                  <div key={label as string} className="flex justify-between">
                    <span>{label as string}</span>
                    <span className={`font-semibold ${ok ? 'text-green-700' : 'text-amber-600'}`}>
                      {ok ? '✅ ' : ''}{pts as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700">
              <strong>No minimum amount for first payout.</strong> Once you hit 5 points, your full earned balance is paid within 7 working days regardless of amount.
            </div>
          </Card>

          {/* Recurring Payout */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-600" />
              Recurring Payout Schedule
            </h2>
            <ul className="space-y-3 text-neutral-600 text-sm">
              {[
                { icon: CheckCircle, color: 'text-green-500', text: <><strong>Recurring minimum:</strong> $50 — balances below this roll to the following month</> },
                { icon: RefreshCw,   color: 'text-green-500', text: <><strong>Payment date:</strong> 15th of every month (commissions from the prior month)</> },
                { icon: DollarSign,  color: 'text-green-500', text: <><strong>Payment methods:</strong> PayPal or international bank transfer</> },
                { icon: AlertCircle, color: 'text-amber-500', text: <><strong>Refund reversals:</strong> Commissions on refunded purchases within the 7-day guarantee window are deducted in the same payment period</> },
              ].map(({ icon: Icon, color, text }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-700">
              <strong>Example:</strong> You activate your first payout on 3rd January with $23.75 earned. That full amount is paid within 7 working days. All subsequent commissions earned in January are paid on 15th February — provided the balance is $50 or more.
            </div>
          </Card>

          {/* Cookie & Tracking */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Cookie Window & Tracking
            </h2>
            <ul className="space-y-3 text-neutral-600 text-sm">
              {[
                { icon: CheckCircle, color: 'text-green-500', text: <><strong>60-day cookie:</strong> Any purchase made within 60 days of a visitor clicking your affiliate link earns you commission — including upsells, subscriptions, and future tool purchases</> },
                { icon: CheckCircle, color: 'text-green-500', text: <><strong>All purchase types tracked:</strong> One-time tools, monthly subscriptions, voice sessions, courses, and consultations all generate commission within the window</> },
                { icon: AlertCircle, color: 'text-amber-500', text: <><strong>Self-referrals not permitted:</strong> Purchasing through your own affiliate link results in commission forfeiture and account review</> },
              ].map(({ icon: Icon, color, text }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Account Activity Policy */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
              <UserX className="w-5 h-5 text-primary-600" />
              Account Activity Policy
            </h2>
            <ul className="space-y-3 text-neutral-600 text-sm">
              {[
                { icon: Clock,       color: 'text-amber-500', text: <><strong>60 days of inactivity:</strong> Account is suspended. Your referral link is deactivated. Any unpaid balance is held pending reactivation.</> },
                { icon: AlertCircle, color: 'text-red-500',   text: <><strong>90 days of inactivity:</strong> Account and all associated data are permanently deleted from the platform.</> },
                { icon: RefreshCw,   color: 'text-green-500', text: <><strong>Reactivation:</strong> If suspended but not yet deleted, contact contact@kayalsoulpath.com to reactivate before the 90-day mark.</> },
              ].map(({ icon: Icon, color, text }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${color} mt-0.5 flex-shrink-0`} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
              <strong>Activity</strong> is defined as at least one referred click or confirmed sale within the 60-day window. Logging into the dashboard alone does not count as activity.
            </div>
          </Card>

          {/* Performance Tier Upgrade */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              Performance Tier Upgrade
            </h2>
            <p className="text-neutral-600 text-sm mb-4">
              The Performance bonus of +5% is automatic and permanent once triggered — it does not reset monthly. The trigger is 10 or more qualifying sales in any rolling 30-day window.
            </p>
            <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800">
              <strong>Example:</strong> You generate 10 sales between 5th and 25th February. Your commission rate upgrades permanently — low-ticket tools go from 25% to 30%, high-ticket from 30% to 35%. You are notified by email on the day the upgrade triggers.
            </div>
          </Card>

          {/* Prohibited Methods */}
          <Card className="p-6">
            <h2 className="text-xl font-serif mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              Prohibited Promotional Methods
            </h2>
            <ul className="space-y-2 text-neutral-600 text-sm">
              {[
                'Bidding on KAYAL or Kayal SoulPath Institute branded keywords in paid ads without written approval',
                'Sending unsolicited bulk email or spam with affiliate links',
                'Making false or exaggerated claims about the platform or readings',
                'Cookie stuffing or forced clicks — fraudulent attribution results in permanent ban',
                'Failing to disclose your affiliate relationship to your audience (required by FTC, ASA, and equivalent regulators)',
                'Self-referrals — purchasing through your own affiliate link',
                'Promoting on adult, gambling, or hate-content platforms',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-xs text-red-700">
              Violation results in immediate account suspension and forfeiture of unpaid commissions.
            </div>
          </Card>

          {/* Programme Flexibility */}
          <Card className="p-6 border-amber-200 bg-amber-50">
            <h2 className="text-xl font-serif mb-3 flex items-center gap-2 text-amber-800">
              <Shield className="w-5 h-5" />
              Programme Flexibility
            </h2>
            <p className="text-amber-700 text-sm mb-3">
              Kayal SoulPath Institute reserves the right to modify these terms with 30 days notice. We believe in rewarding our top affiliates and may introduce special bonuses, seasonal promotions, and performance incentives.
            </p>
            <p className="text-sm text-amber-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Questions? <a href="mailto:contact@kayalsoulpath.com" className="underline font-medium ml-1">contact@kayalsoulpath.com</a>
            </p>
          </Card>

        </div>
      </div>
    </div>
  )
}
