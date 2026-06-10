'use client'

import { Card } from '@/components/ui/Card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mon', clicks: 4, signups: 2 },
  { name: 'Tue', clicks: 7, signups: 3 },
  { name: 'Wed', clicks: 5, signups: 2 },
  { name: 'Thu', clicks: 9, signups: 4 },
  { name: 'Fri', clicks: 12, signups: 5 },
  { name: 'Sat', clicks: 8, signups: 3 },
  { name: 'Sun', clicks: 6, signups: 2 },
]

export const ReferralChart = () => {
  return (
    <Card>
      <h3 className="text-lg font-medium mb-4">Weekly Performance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="clicks" stroke="#5D3FD3" strokeWidth={2} />
            <Line type="monotone" dataKey="signups" stroke="#D4AF37" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}