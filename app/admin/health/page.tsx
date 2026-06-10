// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Server,
  Database,
  Globe,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function AdminHealthPage() {
  const [refreshing, setRefreshing] = useState(false)

  const services = [
    {
      name: 'API Server',
      status: 'healthy',
      icon: Server,
      latency: '45ms',
      uptime: '99.9%'
    },
    {
      name: 'Database',
      status: 'healthy',
      icon: Database,
      latency: '12ms',
      uptime: '100%'
    },
    {
      name: 'CDN',
      status: 'healthy',
      icon: Globe,
      latency: '23ms',
      uptime: '99.8%'
    },
    {
      name: 'Auth Service',
      status: 'degraded',
      icon: Activity,
      latency: '234ms',
      uptime: '98.2%'
    },
    {
      name: 'Payment Gateway',
      status: 'healthy',
      icon: Activity,
      latency: '156ms',
      uptime: '99.5%'
    },
    {
      name: 'Email Service',
      status: 'down',
      icon: Activity,
      latency: 'N/A',
      uptime: '95.1%'
    }
  ]

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
      toast.success('Health check completed')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-serif">System Health</h1>
              <p className="text-sm text-neutral-500">Monitor your infrastructure</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Overall Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <p className="text-lg font-medium">Degraded</p>
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Services Healthy</p>
            <p className="text-2xl font-serif">4/6</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Avg Response Time</p>
            <p className="text-2xl font-serif">94ms</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Uptime (30d)</p>
            <p className="text-2xl font-serif">98.7%</p>
          </Card>
        </div>

        {/* Services Grid */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Services Status</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <div key={service.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-neutral-600" />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    {service.status === 'healthy' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {service.status === 'degraded' && (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    {service.status === 'down' && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-neutral-500">Latency</p>
                      <p className="font-medium">{service.latency}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Uptime</p>
                      <p className="font-medium">{service.uptime}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Recent Incidents */}
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-medium mb-4">Recent Incidents</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium">Email Service Degraded</p>
                <p className="text-sm text-neutral-600">High latency detected for 15 minutes</p>
                <p className="text-xs text-neutral-500 mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Database Optimized</p>
                <p className="text-sm text-neutral-600">Query performance improved by 45%</p>
                <p className="text-xs text-neutral-500 mt-1">5 hours ago</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}