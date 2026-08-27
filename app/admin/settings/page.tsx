// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Settings,
  User,
  Shield,
  Bell,
  Globe,
  Database,
  Mail,
  CreditCard,
  Key,
  Smartphone,
  Laptop,
  Moon,
  Sun,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Palette,
  Link,
  Webhook,
  Clock,
  Download,
  Upload,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Code,
  Terminal,
  FileText,
  HelpCircle,
  LogOut,
  Camera  // ← Added missing Camera import
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface AdminSettings {
  profile: {
    name: string
    email: string
    phone: string
    avatar: string | null
    timezone: string
    language: string
    twoFactorEnabled: boolean
  }
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    passwordPolicy: {
      minLength: number
      requireNumbers: boolean
      requireSymbols: boolean
      requireUppercase: boolean
    }
    ipWhitelist: string[]
    mfaRequired: boolean
  }
  notifications: {
    emailAlerts: boolean
    securityAlerts: boolean
    marketingEmails: boolean
    systemUpdates: boolean
    affiliateUpdates: boolean
    paymentNotifications: boolean
    userSignups: boolean
    fraudAlerts: boolean
  }
  system: {
    siteName: string
    siteUrl: string
    supportEmail: string
    maintenanceMode: boolean
    debugMode: boolean
    cacheEnabled: boolean
    maintenanceMessage: string
    timezone: string
    dateFormat: string
  }
  integrations: {
    stripe:    { enabled: boolean }
    mailgun:   { enabled: boolean }
    recaptcha: { enabled: boolean }
    google:    { enabled: boolean }
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    primaryColor: string
    sidebarCollapsed: boolean
    denseMode: boolean
    animations: boolean
  }
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'system' | 'integrations' | 'appearance'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState<AdminSettings>({
    profile: {
      name: '',
      email: '',
      phone: '',
      avatar: null,
      timezone: 'America/New_York',
      language: 'en',
      twoFactorEnabled: false
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireNumbers: true,
        requireSymbols: true,
        requireUppercase: true
      },
      ipWhitelist: [],
      mfaRequired: false
    },
    notifications: {
      emailAlerts: true,
      securityAlerts: true,
      marketingEmails: false,
      systemUpdates: true,
      affiliateUpdates: true,
      paymentNotifications: true,
      userSignups: true,
      fraudAlerts: true
    },
    system: {
      siteName: 'Admin Dashboard',
      siteUrl: '',
      supportEmail: '',
      maintenanceMode: false,
      debugMode: false,
      cacheEnabled: true,
      maintenanceMessage: 'Site is under maintenance. Please check back later.',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    integrations: {
      stripe:    { enabled: false },
      mailgun:   { enabled: false },
      recaptcha: { enabled: false },
      google:    { enabled: false }
    },
    appearance: {
      theme: 'system',
      primaryColor: '#3b82f6',
      sidebarCollapsed: false,
      denseMode: false,
      animations: true
    }
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Fetch admin profile
        const { data: profile } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', user.id)
          .single()

        // Fetch system settings
        const { data: systemSettings } = await supabase
          .from('system_settings')
          .select('*')
          .single()

        if (profile) {
          setSettings(prev => ({
            ...prev,
            profile: {
              name: profile.name || '',
              email: user.email || '',
              phone: profile.phone || '',
              avatar: profile.avatar || null,
              timezone: profile.timezone || 'America/New_York',
              language: profile.language || 'en',
              twoFactorEnabled: profile.two_factor_enabled || false
            },
            // Real, previously never-saved preferences, now loaded
            // from admin_users, falling back to the existing defaults
            // only when genuinely never saved before.
            notifications: profile.notification_preferences || prev.notifications,
            appearance: profile.appearance_preferences || prev.appearance,
          }))
        }

        if (systemSettings) {
          setSettings(prev => ({
            ...prev,
            system: {
              siteName: systemSettings.site_name || 'Admin Dashboard',
              siteUrl: systemSettings.site_url || '',
              supportEmail: systemSettings.support_email || '',
              maintenanceMode: systemSettings.maintenance_mode || false,
              debugMode: systemSettings.debug_mode || false,
              cacheEnabled: systemSettings.cache_enabled || true,
              maintenanceMessage: systemSettings.maintenance_message || 'Site is under maintenance. Please check back later.',
              timezone: systemSettings.timezone || 'UTC',
              dateFormat: systemSettings.date_format || 'MM/DD/YYYY'
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Update profile
        const { error: profileError } = await supabase
          .from('admin_users')
          .update({
            name: settings.profile.name,
            phone: settings.profile.phone,
            timezone: settings.profile.timezone,
            language: settings.profile.language,
            two_factor_enabled: settings.profile.twoFactorEnabled,
            // Real, genuine save for these two, previously the tab
            // appeared to save successfully, real toast and all, but
            // silently discarded everything the moment the page
            // refreshed, nothing anywhere actually wrote it down.
            notification_preferences: settings.notifications,
            appearance_preferences: settings.appearance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (profileError) throw profileError

        // Update system settings
        const { error: systemError } = await supabase
          .from('system_settings')
          .upsert({
            site_name: settings.system.siteName,
            site_url: settings.system.siteUrl,
            support_email: settings.system.supportEmail,
            maintenance_mode: settings.system.maintenanceMode,
            debug_mode: settings.system.debugMode,
            cache_enabled: settings.system.cacheEnabled,
            maintenance_message: settings.system.maintenanceMessage,
            timezone: settings.system.timezone,
            date_format: settings.system.dateFormat,
            updated_at: new Date().toISOString()
          })

        if (systemError) throw systemError

        // Log the change
        await supabase
          .from('admin_logs')
          .insert({
            admin_id: user.id,
            action: 'settings_updated',
            details: { tab: activeTab },
            created_at: new Date().toISOString()
          })

        toast.success('Settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-gray-500">Configure your admin panel and system preferences</p>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Settings Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'system', label: 'System', icon: Globe },
          { id: 'integrations', label: 'Integrations', icon: Database },
          { id: 'appearance', label: 'Appearance', icon: Palette }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                  {settings.profile.name.charAt(0).toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
                  <Camera className="w-3 h-3" />
                </button>
              </div>
              <div>
                <h3 className="font-medium text-lg">{settings.profile.name}</h3>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input
                  value={settings.profile.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, name: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={settings.profile.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={settings.profile.phone}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, phone: e.target.value }
                  })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <select
                  value={settings.profile.timezone}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, timezone: e.target.value }
                  })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={settings.profile.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    profile: { ...settings.profile, language: e.target.value }
                  })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
                <Input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
                <Input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, maxLoginAttempts: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Password Policy</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordPolicy.requireNumbers}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        passwordPolicy: {
                          ...settings.security.passwordPolicy,
                          requireNumbers: e.target.checked
                        }
                      }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Require numbers</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordPolicy.requireSymbols}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        passwordPolicy: {
                          ...settings.security.passwordPolicy,
                          requireSymbols: e.target.checked
                        }
                      }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Require symbols</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordPolicy.requireUppercase}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        passwordPolicy: {
                          ...settings.security.passwordPolicy,
                          requireUppercase: e.target.checked
                        }
                      }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Require uppercase letters</span>
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={settings.security.mfaRequired}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, mfaRequired: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Require MFA for all admin users</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">IP Whitelist</label>
              <textarea
                value={settings.security.ipWhitelist.join('\n')}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                  }
                })}
                rows={3}
                className="w-full p-2 border rounded-lg font-mono text-sm"
                placeholder="192.168.1.1&#10;10.0.0.0/24"
              />
              <p className="text-xs text-gray-500 mt-1">One IP or CIDR per line</p>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border">
                <div>
                  <p className="font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-500">
                    Receive {key.toLowerCase().replace('alerts', '')} notifications
                  </p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        [key]: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">System Configuration</h2>
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site Name</label>
                <Input
                  value={settings.system.siteName}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, siteName: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site URL</label>
                <Input
                  value={settings.system.siteUrl}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, siteUrl: e.target.value }
                  })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Email</label>
                <Input
                  type="email"
                  value={settings.system.supportEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, supportEmail: e.target.value }
                  })}
                  placeholder="support@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <select
                  value={settings.system.timezone}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, timezone: e.target.value }
                  })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Format</label>
                <select
                  value={settings.system.dateFormat}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, dateFormat: e.target.value }
                  })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Disable public access to the site</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.system.maintenanceMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, maintenanceMode: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>
              
              {settings.system.maintenanceMode && (
                <div className="pl-8">
                  <label className="block text-sm font-medium mb-1">Maintenance Message</label>
                  <Input
                    value={settings.system.maintenanceMessage}
                    onChange={(e) => setSettings({
                      ...settings,
                      system: { ...settings.system, maintenanceMessage: e.target.value }
                    })}
                  />
                </div>
              )}

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Debug Mode</p>
                  <p className="text-sm text-gray-500">Show detailed error messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.system.debugMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, debugMode: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Enable Cache</p>
                  <p className="text-sm text-gray-500">Improve performance with caching</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.system.cacheEnabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, cacheEnabled: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Integrations Settings */}
      {activeTab === 'integrations' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Integrations</h2>
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 max-w-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Real, live API keys and webhook secrets are configured directly in your hosting
              environment's environment variables, not here. This page never displays, accepts,
              or generates real credentials, only whether a given integration is currently
              enabled for this admin panel's own reference.
            </p>
          </div>
          <div className="space-y-4 max-w-2xl">
            {[
              { key: 'stripe',    icon: CreditCard, color: 'text-blue-600',   name: 'Stripe',     desc: 'Payment processing, configured via STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET' },
              { key: 'mailgun',   icon: Mail,        color: 'text-purple-600', name: 'Mailgun',    desc: 'Email service, configured via your email provider\'s own environment variables' },
              { key: 'recaptcha', icon: Shield,       color: 'text-green-600', name: 'reCAPTCHA',  desc: 'Bot protection, configured via RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET_KEY' },
              { key: 'google',    icon: Globe,        color: 'text-red-600',  name: 'Google',      desc: 'OAuth & social login, configured via GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' },
            ].map(({ key, icon: Icon, color, name, desc }) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <h3 className="font-medium">{name}</h3>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.integrations as any)[key].enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          [key]: { enabled: e.target.checked }
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Appearance Settings */}
      {activeTab === 'appearance' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select
                value={settings.appearance.theme}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, theme: e.target.value as any }
                })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.appearance.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, primaryColor: e.target.value }
                  })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={settings.appearance.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, primaryColor: e.target.value }
                  })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Sidebar Collapsed</p>
                  <p className="text-sm text-gray-500">Start with sidebar minimized</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.sidebarCollapsed}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, sidebarCollapsed: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Dense Mode</p>
                  <p className="text-sm text-gray-500">Show more content with compact layout</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.denseMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, denseMode: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Animations</p>
                  <p className="text-sm text-gray-500">Enable UI animations and transitions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.animations}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, animations: e.target.checked }
                  })}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
