export * from '@/lib/tools'

// FIX: getToolById previously ignored its `id` argument entirely and always
// returned null — any code calling this instead of doing its own lookup
// (checkout, /start/[toolId], admin, etc.) was broken. This searches across
// all 103 tools in the real catalog.
//
// Note: this file explicitly declares `getToolById` as a local export.
// Per ES module semantics, a local named export always takes precedence
// over a same-named binding pulled in via `export * from '@/lib/tools'`
// above — so this fix is safe even if that other module happens to define
// its own getToolById, without needing to know what's inside it.

import { loveTools } from './love-tools'
import { wealthTools } from './wealth-tools'
import { wellnessTools } from './wellness-spiritual'
import { lifePathTools } from './life-path-tools'
import { omniRelationshipTools } from './omni-seer-relationships'
import { omniSelfPurposeTools } from './omni-seer-self-purpose'
import { omniPhysicalTimingTools } from './omni-seer-physical-timing'
import { sacredScriptTools } from './sacred-script-tools'
import { timeKeeperTools } from './time-keeper-tools'
import { voiceTools } from './voice-tools'

const ALL_TOOLS = [
  ...loveTools,
  ...wealthTools,
  ...wellnessTools,
  ...lifePathTools,
  ...omniRelationshipTools,
  ...omniSelfPurposeTools,
  ...omniPhysicalTimingTools,
  ...sacredScriptTools,
  ...timeKeeperTools,
  ...voiceTools,
]

export const getToolById = (id: string) => ALL_TOOLS.find(t => t.id === id) ?? null
export const getAllTools = () => ALL_TOOLS
export const getToolsByDomain = (domain: string) => ALL_TOOLS.filter(t => t.domain === domain)
