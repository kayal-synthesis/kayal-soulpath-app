// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Globe,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Copy,
  ExternalLink,
  Trash2,
  Settings,
  Shield,
  Clock,
  Server,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  HelpCircle,
  Calendar,  // ← Added missing Calendar import
  Users      // ← Added missing Users import for line 552
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Domain {
  id: string
  domain: string
  status: 'active' | 'pending' | 'failed' | 'verifying'
  verified_at: string | null
  ssl_status: 'active' | 'pending' | 'failed' | 'issuing'
  dns_records: Array<{
    type: string
    name: string
    value: string
    ttl?: number
    status: 'ok' | 'pending' | 'error'
    error?: string
  }>
  created_at: string
  user_id: string | null
  users?: {
    email: string
    full_name: string | null
  }
}

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const { data } = await supabase
        .from('domains')
        .select(`
          *,
          users (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (data) {
        setDomains(data)
      }
    } catch (error) {
      console.error('Error fetching domains:', error)
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async () => {
    if (!newDomain) return
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('domains')
        .insert({
          domain: newDomain,
          status: 'pending',
          ssl_status: 'pending',
          dns_records: [
            { type: 'A', name: '@', value: '178.105.92.171', status: 'pending' }
          ],
          created_at: new Date().toISOString(),
          user_id: user?.id
        })

      if (error) throw error

      toast.success('Domain added successfully')
      setShowAddDomain(false)
      setNewDomain('')
      fetchDomains()
    } catch (error) {
      toast.error('Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId)
    try {
      const target = domains.find(d => d.id === domainId)
      if (!target) return

      const res = await fetch('/api/admin/domains/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domainId, domain: target.domain }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Verification failed')
        return
      }

      if (data.overallStatus === 'active') {
        toast.success('Domain verified, DNS and SSL both genuinely active')
      } else if (data.dnsError) {
        toast.error(data.dnsError)
      } else if (data.sslStatus === 'failed') {
        toast.error('DNS is correct, but SSL isn\'t responding yet, this can take a few minutes after DNS first propagates')
      } else {
        toast.info('Verification ran, status still pending')
      }

      fetchDomains()
    } catch (error: any) {
      toast.error(error.message || 'Verification failed')
    } finally {
      setVerifying(null)
    }
  }

  const refreshDNS = async (domainId: string) => {
    setRefreshing(domainId)
    try {
      const target = domains.find(d => d.id === domainId)
      if (!target) return

      const res = await fetch('/api/admin/domains/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ domainId, domain: target.domain }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Refresh failed')
        return
      }

      toast.success(`DNS refreshed, resolves to ${data.resolvedIps?.join(', ') || 'nothing'}`)
      fetchDomains()
    } catch (error: any) {
      toast.error(error.message || 'Refresh failed')
    } finally {
      setRefreshing(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Copied to clipboard')
  }

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return
    
    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId)

      if (error) throw error

      toast.success('Domain deleted')
      fetchDomains()
    } catch (error) {
      toast.error('Failed to delete domain')
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'success'
      case 'pending':
      case 'verifying':
      case 'issuing': return 'warning'
      case 'failed':
      case 'error': return 'danger'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return CheckCircle
      case 'pending':
      case 'verifying':
      case 'issuing': return Clock
      case 'failed':
      case 'error': return AlertTriangle
      default: return HelpCircle
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
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Domains</h1>
            <p className="text-sm text-gray-500">Manage your custom domains and SSL certificates</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDomain(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Add Domain Modal */}
      <AnimatePresence>
        {showAddDomain && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add New Domain</h2>
              <div className="flex gap-4">
                <Input
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addDomain} disabled={!newDomain}>
                  Add
                </Button>
                <Button variant="outline" onClick={() => setShowAddDomain(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter your domain name without http:// or https://
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Domains List */}
      <div className="space-y-4">
        {domains.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No domains yet</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first domain to get started</p>
            <Button onClick={() => setShowAddDomain(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </Card>
        ) : (
          domains.map((domain) => {
            const StatusIcon = getStatusIcon(domain.status)
            const SSLIcon = getStatusIcon(domain.ssl_status)
            
            return (
              <Card key={domain.id} className="p-6 hover:shadow-lg transition">
                {/* Domain Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{domain.domain}</h3>
                      <Badge variant={getStatusColor(domain.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {domain.status}
                      </Badge>
                      <Badge variant={getStatusColor(domain.ssl_status)}>
                        <SSLIcon className="w-3 h-3 mr-1" />
                        SSL: {domain.ssl_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {domain.verified_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Verified {new Date(domain.verified_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Added {new Date(domain.created_at).toLocaleDateString()}
                      </span>
                      {domain.users && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {domain.users.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {domain.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => verifyDomain(domain.id)}
                        disabled={verifying === domain.id}
                      >
                        {verifying === domain.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Shield className="w-4 h-4 mr-2" />
                        )}
                        Verify
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refreshDNS(domain.id)}
                      disabled={refreshing === domain.id}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${refreshing === domain.id ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteDomain(domain.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* DNS Records */}
                <div>
                  <h4 className="text-sm font-medium mb-3">DNS Records</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Type</th>
                          <th className="text-left py-2">Name</th>
                          <th className="text-left py-2">Value</th>
                          <th className="text-left py-2">TTL</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {domain.dns_records.map((record, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2 font-mono">{record.type}</td>
                            <td className="py-2 font-mono">{record.name}</td>
                            <td className="py-2 font-mono text-xs max-w-xs truncate">
                              {record.value}
                            </td>
                            <td className="py-2">{record.ttl || 3600}</td>
                            <td className="py-2">
                              {record.status === 'ok' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {record.status === 'pending' && (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              )}
                              {record.status === 'error' && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  <span className="text-xs text-red-600">{record.error}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2">
                              <button
                                onClick={() => copyToClipboard(record.value, `${domain.id}-${index}`)}
                                className="p-1 hover:bg-gray-200 rounded transition"
                                title="Copy to clipboard"
                              >
                                {copied === `${domain.id}-${index}` ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SSL Certificate Info */}
                {domain.ssl_status === 'active' && (
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <Lock className="w-4 h-4" />
                      SSL Certificate Active
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Server className="w-4 h-4" />
                      Issued by Let's Encrypt
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      Expires in 89 days
                    </span>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Documentation Link */}
      <div className="mt-8 text-center">
        <Button variant="link" onClick={() => window.open('https://example.com/docs/domains', '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Read the domains documentation
        </Button>
      </div>
    </div>
  )
}
