'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Link2, Copy, Check, Share2, ExternalLink,
  Camera, Sparkles, Flame, ChevronDown, ChevronUp,
  Search, Filter, X, DollarSign, Users, MousePointer,
  Percent, Edit, Trash2, Plus, Loader2, Eye,
  Clock, Headphones, MessageCircle, BarChart,
  TrendingUp, Award, Gift, RefreshCw, Globe,
  Smartphone, Laptop, Tablet, Calendar,
  Activity, Target, Zap, Star, Crown
} from 'lucide-react'

interface Tool {
  id: string
  name: string
  emoji: string
  category: string
  price: number
  commission: number
  requiresImage: boolean
  requiresImageType?: string
  isPopular: boolean
  isNew: boolean
  description: string
}

interface Domain {
  id: string
  name: string
  icon: string
  color: string
  tools: Tool[]
  count: number
}

interface AffiliateLink {
  id: string
  name: string
  tool_id: string
  tool_name: string
  tool_emoji: string
  domain_id: string
  destination_url: string
  short_url: string
  utm_campaign?: string
  utm_source?: string
  utm_medium?: string
  clicks: number
  unique_clicks: number
  conversions: number
  earnings: number
  status: 'active' | 'paused' | 'archived'
  created_at: string
  last_used: string | null
}

interface ProfessionalLinkManagerProps {
  affiliateId: string
  domains: Domain[]
  onLinkCreated?: () => void
}

export function ProfessionalLinkManager({ affiliateId, domains, onLinkCreated }: ProfessionalLinkManagerProps) {
  const supabase = createClient()
  
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [campaign, setCampaign] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedDomains, setExpandedDomains] = useState<string[]>([])

  // Fetch links
  useEffect(() => {
    fetchLinks()
  }, [affiliateId])

  const fetchLinks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error fetching links:', error)
    } finally {
      setLoading(false)
    }
  }

  const createLink = async () => {
    if (!selectedTool || !linkName) return

    setCreating(true)
    try {
      const baseUrl = window.location.origin
      let destinationUrl = `${baseUrl}/purchase/${selectedTool.id}?ref=${affiliateId}`

      if (campaign) destinationUrl += `&utm_campaign=${encodeURIComponent(campaign)}`
      if (source) destinationUrl += `&utm_source=${encodeURIComponent(source)}`
      if (medium) destinationUrl += `&utm_medium=${encodeURIComponent(medium)}`

      const { error } = await supabase
        .from('affiliate_links')
        .insert({
          affiliate_id: affiliateId,
          name: linkName,
          tool_id: selectedTool.id,
          tool_name: selectedTool.name,
          tool_emoji: selectedTool.emoji,
          domain_id: selectedDomain,
          destination_url: destinationUrl,
          short_url: destinationUrl,
          utm_campaign: campaign || null,
          utm_source: source || null,
          utm_medium: medium || null,
          status: 'active',
          created_at: new Date().toISOString()
        })

      if (error) throw error

      await fetchLinks()
      onLinkCreated?.()
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating link:', error)
      alert('Failed to create link')
    } finally {
      setCreating(false)
    }
  }

  const updateLinkStatus = async (linkId: string, newStatus: 'active' | 'paused' | 'archived') => {
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .update({ status: newStatus })
        .eq('id', linkId)

      if (error) throw error
      await fetchLinks()
    } catch (error) {
      console.error('Error updating link:', error)
    }
  }

  const deleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('affiliate_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error
      await fetchLinks()
    } catch (error) {
      console.error('Error deleting link:', error)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const resetForm = () => {
    setSelectedTool(null)
    setSelectedDomain(null)
    setLinkName('')
    setCampaign('')
    setSource('')
    setMedium('')
  }

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev =>
      prev.includes(domainId)
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    )
  }

  const getLinksForTool = (toolId: string) => {
    return links.filter(link => link.tool_id === toolId)
  }

  const filteredDomains = domains
    .map(domain => ({
      ...domain,
      tools: domain.tools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(domain => domain.tools.length > 0 || searchQuery === '')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Total Links</p>
              <p className="text-2xl font-bold text-primary-600">{links.length}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Total Clicks</p>
              <p className="text-2xl font-bold">
                {links.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Conversions</p>
              <p className="text-2xl font-bold text-green-600">
                {links.reduce((sum, l) => sum + l.conversions, 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Total Earned</p>
              <p className="text-2xl font-bold text-amber-600">
                ${links.reduce((sum, l) => sum + l.earnings, 0).toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tools and domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button
          onClick={() => setExpandedDomains(domains.map(d => d.id))}
          variant="outline"
          className="sm:w-auto"
        >
          Expand All
        </Button>
        <Button
          onClick={() => setExpandedDomains([])}
          variant="outline"
          className="sm:w-auto"
        >
          Collapse All
        </Button>
        <Button
          onClick={fetchLinks}
          variant="outline"
          className="sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Domains Grid */}
      <div className="space-y-4">
        {filteredDomains.map((domain) => {
          const isExpanded = expandedDomains.includes(domain.id)
          const domainLinks = links.filter(l => l.domain_id === domain.id)

          return (
            <Card key={domain.id} className="overflow-hidden">
              {/* Domain Header */}
              <div
                onClick={() => toggleDomain(domain.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-2xl`}>
                    {domain.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{domain.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                      <span>{domain.tools.length} tools</span>
                      <span>•</span>
                      <span>{domainLinks.length} active links</span>
                      {domainLinks.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">
                            ${domainLinks.reduce((sum, l) => sum + l.earnings, 0).toFixed(2)} earned
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  )}
                </div>
              </div>

              {/* Tools List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t"
                  >
                    <div className="divide-y">
                      {domain.tools.map((tool) => {
                        const toolLinks = getLinksForTool(tool.id)

                        return (
                          <div key={tool.id} className="p-4 hover:bg-neutral-50 transition">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl">{tool.emoji}</span>
                                  <h4 className="font-medium">{tool.name}</h4>
                                  {tool.isPopular && (
                                    <Badge variant="secondary" size="sm" className="bg-amber-100 text-amber-700">
                                      <Flame className="w-3 h-3 mr-1" />
                                      Popular
                                    </Badge>
                                  )}
                                  {tool.isNew && (
                                    <Badge variant="secondary" size="sm" className="bg-green-100 text-green-700">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      New
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 mb-3">
                                  <span className="text-primary-600 font-medium">${tool.price}</span>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-green-600">{tool.commission}% commission</span>
                                  {tool.requiresImage && (
                                    <>
                                      <span className="text-neutral-300">•</span>
                                      <span className="text-amber-600 flex items-center gap-1">
                                        <Camera className="w-4 h-4" />
                                        Requires {tool.requiresImageType === 'both' ? 'Face + Palms' : 
                                                  tool.requiresImageType === 'face' ? 'Face' : 'Palms'}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Existing Links */}
                                {toolLinks.length > 0 && (
                                  <div className="space-y-2 mt-3">
                                    {toolLinks.map((link) => (
                                      <div key={link.id} className="bg-primary-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{link.name}</span>
                                            <Badge 
                                              variant={link.status === 'active' ? 'primary' : 'secondary'} 
                                              size="sm"
                                            >
                                              {link.status}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => copyToClipboard(link.destination_url, link.id)}
                                              className="p-1 hover:bg-white rounded"
                                              title="Copy link"
                                            >
                                              {copiedId === link.id ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                            <a
                                              href={link.destination_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-1 hover:bg-white rounded"
                                              title="Open link"
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          </div>
                                        </div>

                                        <code className="block text-xs bg-white p-2 rounded mb-2 font-mono truncate">
                                          {link.short_url}
                                        </code>

                                        <div className="flex items-center gap-4 text-xs">
                                          <span className="flex items-center gap-1">
                                            <MousePointer className="w-3 h-3" />
                                            {link.clicks}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {link.unique_clicks}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {link.conversions}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            ${link.earnings}
                                          </span>
                                          {link.clicks > 0 && (
                                            <span className="flex items-center gap-1">
                                              <Percent className="w-3 h-3" />
                                              {((link.conversions / link.clicks) * 100).toFixed(1)}%
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary-200">
                                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <Calendar className="w-3 h-3" />
                                            Created: {new Date(link.created_at).toLocaleDateString()}
                                          </div>
                                          <select
                                            value={link.status}
                                            onChange={(e) => updateLinkStatus(link.id, e.target.value as any)}
                                            className="text-xs border rounded p-1 bg-white"
                                          >
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="archived">Archived</option>
                                          </select>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              <div className="ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTool(tool)
                                    setSelectedDomain(domain.id)
                                    setLinkName(`${tool.name} Link`)
                                    setShowCreateModal(true)
                                  }}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create Link
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )
        })}
      </div>

      {/* Create Link Modal */}
      <AnimatePresence>
        {showCreateModal && selectedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false)
              resetForm()
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl max-w-lg w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif">Create Affiliate Link</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Tool Preview */}
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <span className="text-3xl">{selectedTool.emoji}</span>
                  <div>
                    <p className="font-medium">{selectedTool.name}</p>
                    <p className="text-sm text-primary-600">
                      ${selectedTool.price} • {selectedTool.commission}% commission
                    </p>
                  </div>
                </div>

                {/* Link Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Link Name *</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g., Facebook Campaign"
                  />
                </div>

                {/* UTM Parameters */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tracking Parameters (Optional)</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={campaign}
                      onChange={(e) => setCampaign(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Campaign (e.g., spring_sale)"
                    />
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Source (e.g., facebook)"
                    />
                    <input
                      type="text"
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Medium (e.g., cpc, social)"
                    />
                  </div>
                </div>

                {/* Requirements Alert */}
                {selectedTool.requiresImage && (
                  <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
                    <Camera className="w-4 h-4 inline mr-2" />
                    This tool requires {selectedTool.requiresImageType === 'both' ? 'face and palm photos' : 
                                      selectedTool.requiresImageType === 'face' ? 'a face photo' : 'palm photos'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={createLink}
                    disabled={creating || !linkName}
                    className="flex-1"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}