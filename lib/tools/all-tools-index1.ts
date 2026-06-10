// Import ALL your tool constants
import { omniSeerTools } from '@/lib/constants/omni-seer-tools'
import { voiceTools } from '@/lib/constants/voice-tools'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools } from '@/lib/constants/time-keeper-tools'
import { loveTools } from '@/lib/constants/love-tools'
import { wealthTools } from '@/lib/constants/wealth-tools'
import { spiritualTools } from '@/lib/constants/spiritual-tools'
import { lifePathTools } from '@/lib/constants/life-path-tools'

// Domain destinations mapping
export const domainDestinations: Record<string, string> = {
  'oracle-temple': 'report',      // Omni-Seer's Sanctum
  'voice': 'audio',                // Voice of Prophecy
  'sacred-script': 'chat',         // Sacred Script
  'time-keeper': 'reading',        // Eternal Clock
  'love': 'report',                 // Heart's Destiny
  'wealth': 'report',               // Abyss of Abundance
  'spiritual': 'report',            // Soul's Journey
  'life-path': 'report'             // Path of Destiny
}

// Define all domains with their metadata
export const domains = [
  {
    id: 'oracle-temple',
    name: 'Omni-Seer\'s Sanctum',
    icon: '👁️',
    path: '/domain/omni-seer-sanctum',
    destination: 'report',
    tools: omniSeerTools,
    count: omniSeerTools.length,
    color: 'from-purple-600 to-indigo-600'
  },
  {
    id: 'voice',
    name: 'Voice of Prophecy',
    icon: '🎙️',
    path: '/domain/voice-of-prophecy',
    destination: 'audio',
    tools: voiceTools,
    count: voiceTools.length,
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'sacred-script',
    name: 'Sacred Script',
    icon: '📜',
    path: '/domain/sacred-script',
    destination: 'chat',
    tools: sacredScriptTools,
    count: sacredScriptTools.length,
    color: 'from-amber-600 to-orange-600'
  },
  {
    id: 'time-keeper',
    name: 'Eternal Clock',
    icon: '⏰',
    path: '/domain/eternal-clock',
    destination: 'reading',
    tools: timeKeeperTools,
    count: timeKeeperTools.length,
    color: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'love',
    name: 'Heart\'s Destiny',
    icon: '💞',
    path: '/domain/hearts-destiny',
    destination: 'report',
    tools: loveTools,
    count: loveTools.length,
    color: 'from-red-600 to-pink-600'
  },
  {
    id: 'wealth',
    name: 'Abyss of Abundance',
    icon: '💰',
    path: '/domain/abyss-of-abundance',
    destination: 'report',
    tools: wealthTools,
    count: wealthTools.length,
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'spiritual',
    name: 'Soul\'s Journey',
    icon: '🕉️',
    path: '/domain/souls-journey',
    destination: 'report',
    tools: spiritualTools,
    count: spiritualTools.length,
    color: 'from-violet-600 to-purple-600'
  },
  {
    id: 'life-path',
    name: 'Path of Destiny',
    icon: '🌟',
    path: '/domain/path-of-destiny',
    destination: 'report',
    tools: lifePathTools,
    count: lifePathTools.length,
    color: 'from-amber-600 to-yellow-600'
  }
]

// Combine all tools for easy access
export const allTools = [
  ...omniSeerTools,
  ...voiceTools,
  ...sacredScriptTools,
  ...timeKeeperTools,
  ...loveTools,
  ...wealthTools,
  ...spiritualTools,
  ...lifePathTools
]

// Helper functions
export function getToolById(id: string) {
  return allTools.find(tool => tool.id === id)
}

export function getToolsByDomain(domainId: string) {
  const domain = domains.find(d => d.id === domainId)
  return domain?.tools || []
}

export function getDomainStats() {
  return domains.map(domain => ({
    ...domain,
    totalValue: domain.tools.reduce((sum, t) => sum + (t.price || 0), 0),
    avgPrice: domain.tools.reduce((sum, t) => sum + (t.price || 0), 0) / domain.tools.length,
    toolsRequiringImages: domain.tools.filter(t => t.requiresImage).length
  }))
}

// Calculate overall stats
export const overallStats = {
  totalTools: allTools.length,
  totalDomains: domains.length,
  totalValue: allTools.reduce((sum, t) => sum + (t.price || 0), 0),
  avgPrice: allTools.reduce((sum, t) => sum + (t.price || 0), 0) / allTools.length,
  toolsRequiringImages: allTools.filter(t => t.requiresImage).length,
  popularTools: allTools.filter(t => t.isPopular).length,
  newTools: allTools.filter(t => t.isNew).length
}