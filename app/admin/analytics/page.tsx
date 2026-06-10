// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const COLORS = ['#5D3FD3', '#D4AF37', '#2E5C4E', '#B65F4A', '#4A6FA5']

const revenueData = [
  { month: 'Jan', revenue: 45000, subscriptions: 12000, oneTime: 33000 },
  { month: 'Feb', revenue: 52000, subscriptions: 14000, oneTime: 38000 },
  { month: 'Mar', revenue: 58000, subscriptions: 16000, oneTime: 42000 },
  { month: 'Apr', revenue: 63000, subscriptions: 18000, oneTime: 45000 },
  { month: 'May', revenue: 72000, subscriptions: 21000, oneTime: 51000 },
  { month: 'Jun', revenue: 81000, subscriptions: 24000, oneTime: 57000 },
]

const userData = [
  { month: 'Jan', total: 8200, new: 1200 },
  { month: 'Feb', total: 9500, new: 1300 },
  { month: 'Mar', total: 11200, new: 1700 },
  { month: 'Apr', total: 12800, new: 1600 },
  { month: 'May', total: 14700, new: 1900 },
  { month: 'Jun', total: 17000, new: 2300 },
]

const deviceData = [
  { name: 'Desktop', value: 45 },
  { name: 'Mobile', value: 42 },
  { name: 'Tablet', value: 13 },
]

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('revenue')

  const tabs = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'users', label: 'Users' },
    { id: 'engagement', label: 'Engagement' },
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-serif">Analytics</h1>
              <p className="text-sm text-neutral-500">Track your business performance</p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Revenue</p>
            <p className="text-2xl font-serif">$187,234</p>
            <p className="text-xs text-green-600">+18% vs last month</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Active Users</p>
            <p className="text-2xl font-serif">8,234</p>
            <p className="text-xs text-green-600">+12% vs last month</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Conversion Rate</p>
            <p className="text-2xl font-serif">5.2%</p>
            <p className="text-xs text-green-600">+2.1% vs last month</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Avg. Order Value</p>
            <p className="text-2xl font-serif">$47</p>
            <p className="text-xs text-green-600">+5% vs last month</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Revenue Chart */}
        {activeTab === 'revenue' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Revenue Trends</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="subscriptions" fill="#5D3FD3" />
                  <Bar dataKey="oneTime" fill="#D4AF37" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Users Chart */}
        {activeTab === 'users' && (
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">User Growth</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#5D3FD3" strokeWidth={2} />
                  <Line type="monotone" dataKey="new" stroke="#D4AF37" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Engagement Chart */}
        {activeTab === 'engagement' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Device Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Engagement Metrics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-neutral-500">Avg. Session Duration</p>
                  <p className="text-2xl font-serif">4m 32s</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Bounce Rate</p>
                  <p className="text-2xl font-serif">32%</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Pages per Session</p>
                  <p className="text-2xl font-serif">4.2</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}