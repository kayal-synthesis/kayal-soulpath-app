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
  Search, X, DollarSign, Users, MousePointer,
  Percent, Edit, Trash2, Plus, Loader2, Eye,
  Clock, Headphones, MessageCircle, BarChart,
  TrendingUp, Award, Gift, Filter, RefreshCw,
  Globe, Smartphone, Laptop, Tablet
} from 'lucide-react'
import { domains, domainDestinations, overallStats } from '@/lib/tools/all-tools-index'

interface AffiliateLink {
  id: string
  name: string
  affiliate_id: string
  link_type: 'general' | 'tool_specific' | 'campaign'
  tool_id: string | null
  domain_id: string | null
  destination_url: string
  short_url: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  custom_parameters: any
  clicks: number
  unique_clicks: number
  conversions: number
  earnings: number
  status: 'active' | 'paused' | 'archived'
  tags: string[]
  created_at: string
  last_used: string | null
}

interface ProductionLinkManagerProps {
  affiliateId: string
  onGenerateLink?: (toolId: string, toolName: string, domainId: string) => void
}

export function ProductionLinkManager({ affiliateId, onGenerateLink }: ProductionLinkManagerProps) {
  const supabase = createClient()
  
  const [expandedDomains, setExpandedDomains] = useState<string[]>(['oracle-temple'])
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)
  const [selectedDomain, setSelectedDomain] = useState<any>(null)
  const [linkName, setLinkName] = useState('')
  const [campaign, setCampaign] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<'domains' | 'links'>('domains')
  const [sortBy, setSortBy] = useState<'date' | 'clicks' | 'earnings'>('date')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')

  // Fetch affiliate links
  const fetchAffiliateLinks = async () => {
    try {
      setRefreshing(true)
      
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setAffiliateLinks(data || [])
    } catch (error) {
      console.error('Error fetching affiliate links:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (affiliateId) {
      fetchAffiliateLinks()
    }
  }, [affiliateId])

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => 
      prev.includes(domainId) 
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    )
  }

  const expandAll = () => {
    setExpandedDomains(domains.map(d => d.id))
  }

  const collapseAll = () => {
    setExpandedDomains([])
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const createAffiliateLink = async () => {
    if (!selectedTool || !linkName) return
    
    setCreating(true)
    
    try {
      // Build URL with UTM parameters
      let destinationUrl = `${window.location.origin}/purchase/${selectedTool.id}?ref=${affiliateId}`
      
      if (campaign) {
        destinationUrl += `&utm_campaign=${encodeURIComponent(campaign)}`
      }
      if (source) {
        destinationUrl += `&utm_source=${encodeURIComponent(source)}`
      }
      if (medium) {
        destinationUrl += `&utm_medium=${encodeURIComponent(medium)}`
      }

      // Create short URL (you can integrate a URL shortener service here)
      const shortUrl = destinationUrl // Placeholder

      const { data, error } = await supabase
        .from('affiliate_links')
        .insert({
          affiliate_id: affiliateId,
          name: linkName,
          link_type: 'tool_specific',
          tool_id: selectedTool.id,
          domain_id: selectedDomain.id,
          destination_url: destinationUrl,
          short_url: shortUrl,
          utm_campaign: campaign || null,
          utm_source: source || null,
          utm_medium: medium || null,
          custom_parameters: {},
          status: 'active',
          tags: [],
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      setAffiliateLinks([data, ...affiliateLinks])
      
      // Reset form
      setShowCreateModal(false)
      setSelectedTool(null)
      setSelectedDomain(null)
      setLinkName('')
      setCampaign('')
      setSource('')
      setMedium('')
      
    } catch (error) {
      console.error('Error creating affiliate link:', error)
      alert('Failed to create link. Please try again.')
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

      setAffiliateLinks(prev => 
        prev.map(link => 
          link.id === linkId ? { ...link, status: newStatus } : link
        )
      )
    } catch (error) {
      console.error('Error updating link status:', error)
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

      setAffiliateLinks(prev => prev.filter(link => link.id !== linkId))
    } catch (error) {
      console.error('Error deleting link:', error)
    }
  }

  const getLinksForTool = (toolId: string) => {
    return affiliateLinks.filter(link => link.tool_id === toolId)
  }

  // Filter domains based on search
  const filteredDomains = domains
    .map(domain => ({
      ...domain,
      tools: domain.tools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(domain => domain.tools.length > 0 || searchQuery === '')

  // Filter links based on status
  const filteredLinks = affiliateLinks.filter(link => {
    if (filterStatus !== 'all' && link.status !== filterStatus) return false
    if (searchQuery && !link.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Total Links</p>
          <p className="text-xl font-bold text-primary-600">{affiliateLinks.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Total Clicks</p>
          <p className="text-xl font-bold">
            {affiliateLinks.reduce((sum, l) => sum + l.clicks, 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Conversions</p>
          <p className="text-xl font-bold text-green-600">
            {affiliateLinks.reduce((sum, l) => sum + l.conversions, 0)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-neutral-500">Earnings</p>
          <p className="text-xl font-bold text-amber-600">
            ${affiliateLinks.reduce((sum, l) => sum + l.earnings, 0).toFixed(2)}
          </p>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'domains' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('domains')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Browse Domains
          </Button>
          <Button
            variant={viewMode === 'links' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('links')}
          >
            <Link2 className="w-4 h-4 mr-2" />
            My Links ({affiliateLinks.length})
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAffiliateLinks}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search across all domains and tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* DOMAINS VIEW */}
      {viewMode === 'domains' && (
        <div className="space-y-4">
          {filteredDomains.map((domain) => {
            const isExpanded = expandedDomains.includes(domain.id)
            const domainLinks = affiliateLinks.filter(l => l.domain_id === domain.id)
            const domainLinkCount = domainLinks.length
            
            return (
              <Card key={domain.id} className="overflow-hidden">
                {/* Domain Header */}
                <button
                  onClick={() => toggleDomain(domain.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center text-2xl`}>
                      {domain.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg">{domain.name}</h3>
                        <Badge variant="outline" className="ml-2">
                          {domain.destination}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span>{domain.tools.length} tools</span>
                        <span>•</span>
                        <span>{domainLinks.length} links</span>
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
                    {domainLinkCount > 0 && (
                      <Badge variant="primary" className="mr-2">
                        {domainLinkCount} links
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </button>

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
                          const destination = domainDestinations[domain.id]
                          
                          return (
                            <div key={tool.id} className="p-4 hover:bg-neutral-50 transition">
                              <div className="flex items-start justify-between gap-4">
                                {/* Tool Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{tool.emoji}</span>
                                    <h4 className="font-medium truncate">{tool.name}</h4>
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
                                  
                                  <p className="text-sm text-neutral-600 line-clamp-2 mb-2">
                                    {tool.subtitle || tool.shortDescription}
                                  </p>

                                  {/* Tool Details */}
                                  <div className="flex flex-wrap gap-3 text-xs">
                                    <span className="text-primary-600 font-medium">
                                      ${tool.price}
                                    </span>
                                    <span className="text-neutral-400">•</span>
                                    <span className="text-neutral-600">
                                      <Clock className="w-3 h-3 inline mr-1" />
                                      {tool.estimatedReadTime || 30} min
                                    </span>
                                    {destination === 'audio' && (
                                      <>
                                        <span className="text-neutral-400">•</span>
                                        <span className="text-blue-600">
                                          <Headphones className="w-3 h-3 inline mr-1" />
                                          Audio
                                        </span>
                                      </>
                                    )}
                                    {destination === 'chat' && (
                                      <>
                                        <span className="text-neutral-400">•</span>
                                        <span className="text-purple-600">
                                          <MessageCircle className="w-3 h-3 inline mr-1" />
                                          Chat
                                        </span>
                                      </>
                                    )}
                                    {tool.requiresImage && (
                                      <>
                                        <span className="text-neutral-400">•</span>
                                        <span className="text-amber-600">
                                          <Camera className="w-3 h-3 inline mr-1" />
                                          {tool.requiresImageType === 'both' ? 'Face+Palms' : 
                                           tool.requiresImageType === 'face' ? 'Face' : 'Palms'}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Existing Links */}
                                  {toolLinks.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {toolLinks.map(link => (
                                        <div key={link.id} className="p-2 bg-primary-50 rounded-lg">
                                          <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium">{link.name}</span>
                                            <Badge 
                                              variant={link.status === 'active' ? 'primary' : 'secondary'} 
                                              size="sm"
                                            >
                                              {link.status}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1">
                                              <MousePointer className="w-3 h-3" />
                                              {link.clicks}
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Users className="w-3 h-3" />
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
                                          <div className="flex items-center gap-2 mt-2">
                                            <code className="flex-1 bg-white px-2 py-1 rounded text-xs font-mono truncate">
                                              {link.short_url}
                                            </code>
                                            <button
                                              onClick={() => handleCopy(link.destination_url, link.id)}
                                              className="p-1 hover:bg-white rounded"
                                              title="Copy link"
                                            >
                                              {copiedId === link.id ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
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

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTool(tool)
                                      setSelectedDomain(domain)
                                      setLinkName(`${tool.name} Affiliate Link`)
                                      setShowCreateModal(true)
                                    }}
                                    className="whitespace-nowrap"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Generate Link
                                  </Button>
                                  {onGenerateLink && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onGenerateLink(tool.id, tool.name, domain.id)}
                                    >
                                      <Share2 className="w-4 h-4 mr-2" />
                                      Share
                                    </Button>
                                  )}
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
      )}

      {/* LINKS VIEW */}
      {viewMode === 'links' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="all">All Links</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="date">Newest First</option>
                <option value="clicks">Most Clicks</option>
                <option value="earnings">Highest Earnings</option>
              </select>
            </div>
          </div>

          {/* Links List */}
          {filteredLinks.length > 0 ? (
            <div className="space-y-3">
              {filteredLinks
                .sort((a, b) => {
                  if (sortBy === 'clicks') return b.clicks - a.clicks
                  if (sortBy === 'earnings') return b.earnings - a.earnings
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
                .map(link => (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">
                            {domains.find(d => d.id === link.domain_id)?.icon || '🔗'}
                          </span>
                          <h4 className="font-medium">{link.name}</h4>
                          <Badge variant="outline" size="sm">
                            {link.link_type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant={link.status === 'active' ? 'primary' : 'secondary'} 
                            size="sm"
                          >
                            {link.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <code className="flex-1 bg-neutral-50 px-3 py-2 rounded text-sm font-mono truncate">
                            {link.short_url}
                          </code>
                          <button
                            onClick={() => handleCopy(link.destination_url, link.id)}
                            className="p-2 hover:bg-neutral-100 rounded"
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
                            className="p-2 hover:bg-neutral-100 rounded"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                          <div className="text-center p-2 bg-neutral-50 rounded">
                            <p className="text-xs text-neutral-500">Clicks</p>
                            <p className="font-bold text-primary-600">{link.clicks}</p>
                          </div>
                          <div className="text-center p-2 bg-neutral-50 rounded">
                            <p className="text-xs text-neutral-500">Unique</p>
                            <p className="font-bold">{link.unique_clicks}</p>
                          </div>
                          <div className="text-center p-2 bg-neutral-50 rounded">
                            <p className="text-xs text-neutral-500">Conversions</p>
                            <p className="font-bold text-green-600">{link.conversions}</p>
                          </div>
                          <div className="text-center p-2 bg-neutral-50 rounded">
                            <p className="text-xs text-neutral-500">Rate</p>
                            <p className="font-bold text-amber-600">
                              {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-neutral-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                            {link.last_used && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span>Last used: {new Date(link.last_used).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary-600">
                              Earned: ${link.earnings.toFixed(2)}
                            </span>
                            <button
                              onClick={() => deleteLink(link.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded"
                              title="Delete link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* UTM Parameters */}
                        {(link.utm_campaign || link.utm_source || link.utm_medium) && (
                          <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                            {link.utm_campaign && (
                              <Badge variant="outline" size="sm">Campaign: {link.utm_campaign}</Badge>
                            )}
                            {link.utm_source && (
                              <Badge variant="outline" size="sm">Source: {link.utm_source}</Badge>
                            )}
                            {link.utm_medium && (
                              <Badge variant="outline" size="sm">Medium: {link.utm_medium}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Link2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No links yet</h3>
              <p className="text-sm text-neutral-500 mb-4">Start by generating links for your favorite tools</p>
              <Button onClick={() => setViewMode('domains')}>
                Browse Domains
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Create Link Modal */}
      <AnimatePresence>
        {showCreateModal && selectedTool && selectedDomain && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-serif mb-4">Generate Affiliate Link</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                  <span className="text-3xl">{selectedTool.emoji}</span>
                  <div>
                    <p className="font-medium">{selectedTool.name}</p>
                    <p className="text-xs text-primary-600">{selectedDomain.name}</p>
                    <p className="text-xs text-green-600 mt-1">${selectedTool.price} • 15% commission</p>
                  </div>
                </div>

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

                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Tracking Parameters (Optional)</h4>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={campaign}
                      onChange={(e) => setCampaign(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Campaign (e.g., spring_sale)"
                    />
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Source (e.g., facebook)"
                    />
                    <input
                      type="text"
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Medium (e.g., cpc, social)"
                    />
                  </div>
                </div>

                {selectedTool.requiresImage && (
                  <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                    <Camera className="w-4 h-4 inline mr-1" />
                    This tool requires {selectedTool.requiresImageType === 'both' ? 'face and palm photos' : 
                                      selectedTool.requiresImageType === 'face' ? 'a face photo' : 'palm photos'}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={createAffiliateLink}
                    disabled={creating || !linkName}
                    className="flex-1"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Link'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
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