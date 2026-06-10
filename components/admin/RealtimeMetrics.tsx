'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Clock,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Zap,
  Award,
  Gift,
  ShoppingCart,
  UserPlus,
  MessageCircle,
  Eye,
  Download,
  Upload,
  Mail,
  Bell,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Play,
  Pause,
  StopCircle
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts'

export interface Metric {
  id: string
  label: string
  value: number | string
  change?: number
  icon?: React.ReactNode
  color?: string
  trend?: 'up' | 'down' | 'neutral'
  format?: 'number' | 'currency' | 'percentage' | 'time'
}

export interface RealtimeMetricsProps {
  /**
   * Metrics to display
   */
  metrics?: Metric[]
  
  /**
   * Chart data
   */
  chartData?: any[]
  
  /**
   * Chart type
   */
  chartType?: 'line' | 'area' | 'bar' | 'pie'
  
  /**
   * Chart title
   */
  chartTitle?: string
  
  /**
   * Chart height
   */
  chartHeight?: number
  
  /**
   * Auto-refresh interval (ms)
   */
  refreshInterval?: number
  
  /**
   * On refresh callback
   */
  onRefresh?: () => Promise<void>
  
  /**
   * Whether auto-refresh is enabled
   */
  autoRefresh?: boolean
  
  /**
   * On auto-refresh toggle
   */
  onAutoRefreshToggle?: (enabled: boolean) => void
  
  /**
   * Time range
   */
  timeRange?: 'realtime' | 'today' | 'week' | 'month' | 'year'
  
  /**
   * On time range change
   */
  onTimeRangeChange?: (range: string) => void
  
  /**
   * Last updated timestamp
   */
  lastUpdated?: Date
  
  /**
   * Loading state
   */
  isLoading?: boolean
  
  /**
   * Error state
   */
  error?: string
  
  /**
   * On retry callback
   */
  onRetry?: () => void
  
  /**
   * Additional className
   */
  className?: string
}

const formatValue = (value: number | string, format?: string) => {
  if (typeof value === 'string') return value
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'percentage':
      return `${value}%`
    case 'time':
      const minutes = Math.floor(value as number / 60)
      const seconds = (value as number) % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}

const COLORS = ['#5D3FD3', '#D4AF37', '#2E5C4E', '#B65F4A', '#4A6FA5', '#7A5AF5', '#E5C87B', '#6B6258']

export const RealtimeMetrics = ({
  metrics = [],
  chartData = [],
  chartType = 'line',
  chartTitle = 'Real-time Analytics',
  chartHeight = 300,
  refreshInterval = 30000,
  onRefresh,
  autoRefresh = true,
  onAutoRefreshToggle,
  timeRange = 'realtime',
  onTimeRangeChange,
  lastUpdated,
  isLoading = false,
  error,
  onRetry,
  className
}: RealtimeMetricsProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localMetrics, setLocalMetrics] = useState(metrics)
  const [localChartData, setLocalChartData] = useState(chartData)

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const interval = setInterval(async () => {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, onRefresh])

  // Update local state when props change
  useEffect(() => {
    setLocalMetrics(metrics)
  }, [metrics])

  useEffect(() => {
    setLocalChartData(chartData)
  }, [chartData])

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const timeRangeOptions = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'year', label: 'Last 12 months' }
  ]

  const renderChart = () => {
    if (!localChartData.length) return null

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ReLineChart data={localChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(localChartData[0])
                .filter(key => key !== 'name')
                .map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
            </ReLineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={localChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(localChartData[0])
                .filter(key => key !== 'name')
                .map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={localChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(localChartData[0])
                .filter(key => key !== 'name')
                .map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[index % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RePieChart>
              <Pie
                data={localChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {localChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">{chartTitle}</h3>
          {lastUpdated && (
            <p className="text-xs text-neutral-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange?.(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => onAutoRefreshToggle?.(!autoRefresh)}
            className={cn(
              'p-2 rounded-lg transition',
              autoRefresh ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-600'
            )}
            title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
          >
            <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-neutral-100 rounded-lg transition"
            title="Refresh now"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
            {onRetry && (
              <Button size="xs" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Metrics grid */}
      {localMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {localMetrics.map((metric) => (
            <div
              key={metric.id}
              className="p-4 bg-neutral-50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-500">{metric.label}</span>
                {metric.icon && (
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', metric.color)}>
                    {metric.icon}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-serif">
                  {formatValue(metric.value, metric.format)}
                </span>
                {metric.change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs',
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {metric.trend === 'up' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ height: chartHeight }}>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType + timeRange}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderChart()}
          </motion.div>
        </AnimatePresence>
      )}
    </Card>
  )
}

// Live user counter
export const LiveUserCounter = ({ 
  count = 0,
  previousCount = 0,
  className 
}: { count: number; previousCount?: number; className?: string }) => {
  const change = count - previousCount
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-5 h-5 text-primary-600" />
        <h4 className="font-medium">Live Users</h4>
        <Badge variant={trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'default'} size="sm">
          {change > 0 ? '+' : ''}{change}
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-serif"
        >
          {count}
        </motion.span>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-neutral-500">Active now</span>
        </div>
      </div>
    </Card>
  )
}

// Revenue stream
export const RevenueStream = ({
  current,
  previous,
  target,
  className
}: {
  current: number
  previous: number
  target: number
  className?: string
}) => {
  const progress = (current / target) * 100
  const change = ((current - previous) / previous) * 100

  return (
    <Card className={cn('p-4', className)}>
      <h4 className="font-medium mb-3">Revenue Stream</h4>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Current</span>
          <span className="font-medium">${current.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Previous</span>
          <span>${previous.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Target</span>
          <span>${target.toLocaleString()}</span>
        </div>
        <div className="pt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {change > 0 ? (
            <ArrowUp className="w-4 h-4 text-green-600" />
          ) : (
            <ArrowDown className="w-4 h-4 text-red-600" />
          )}
          <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-neutral-500 text-xs ml-1">vs previous</span>
        </div>
      </div>
    </Card>
  )
}

// Traffic sources
export const TrafficSources = ({
  sources,
  className
}: {
  sources: Array<{ name: string; value: number; color: string }>
  className?: string
}) => {
  const total = sources.reduce((acc, s) => acc + s.value, 0)

  return (
    <Card className={cn('p-4', className)}>
      <h4 className="font-medium mb-3">Traffic Sources</h4>
      <div className="space-y-3">
        {sources.map((source) => {
          const percentage = (source.value / total) * 100
          return (
            <div key={source.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{source.name}</span>
                <span className="font-medium">{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: source.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Device breakdown
export const DeviceBreakdown = ({
  devices,
  className
}: {
  devices: Array<{ type: string; count: number; percentage: number }>
  className?: string
}) => {
  return (
    <Card className={cn('p-4', className)}>
      <h4 className="font-medium mb-3">Devices</h4>
      <div className="space-y-3">
        {devices.map((device) => (
          <div key={device.type} className="flex items-center gap-3">
            {device.type === 'desktop' && <Laptop className="w-4 h-4 text-neutral-500" />}
            {device.type === 'mobile' && <Smartphone className="w-4 h-4 text-neutral-500" />}
            {device.type === 'tablet' && <Tablet className="w-4 h-4 text-neutral-500" />}
            <span className="flex-1 text-sm">{device.type}</span>
            <span className="text-sm font-medium">{device.percentage}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Activity feed
export interface Activity {
  id: string
  type: 'user' | 'purchase' | 'subscription' | 'chat' | 'referral'
  user: string
  action: string
  target?: string
  amount?: number
  timestamp: Date
  icon?: React.ReactNode
  metadata?: Record<string, any>
}

export const ActivityFeed = ({
  activities,
  maxItems = 10,
  showViewAll = true,
  onViewAll,
  onItemClick,
  className
}: {
  activities: Activity[]
  maxItems?: number
  showViewAll?: boolean
  onViewAll?: () => void
  onItemClick?: (activity: Activity) => void
  className?: string
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserPlus className="w-4 h-4 text-green-600" />
      case 'purchase': return <ShoppingCart className="w-4 h-4 text-blue-600" />
      case 'subscription': return <Award className="w-4 h-4 text-purple-600" />
      case 'chat': return <MessageCircle className="w-4 h-4 text-indigo-600" />
      case 'referral': return <Gift className="w-4 h-4 text-yellow-600" />
      default: return <Activity className="w-4 h-4 text-neutral-600" />
    }
  }

  const formatTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Live Activity</h4>
        {showViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {activities.slice(0, maxItems).map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start gap-3 p-2 hover:bg-neutral-50 rounded-lg transition cursor-pointer"
              onClick={() => onItemClick?.(activity)}
            >
              <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                {activity.icon || getIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span>{' '}
                  {activity.action}
                  {activity.target && (
                    <span className="font-medium"> {activity.target}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(activity.timestamp)}</span>
                  {activity.amount && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">${activity.amount}</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}