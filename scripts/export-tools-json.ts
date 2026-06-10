/**
 * scripts/export-tools-json.ts
 *
 * Generates public/tools.json — consumed by the /tool/[toolId] sales page.
 * Run with:  npx ts-node --project tsconfig.scripts.json scripts/export-tools-json.ts
 * Or add to package.json: "build:tools": "ts-node scripts/export-tools-json.ts"
 */

import fs   from 'fs'
import path from 'path'

// ── Import all domain constants ──────────────────────────────
import { loveTools }         from '../lib/constants/love-tools'
import { wealthTools }       from '../lib/constants/wealth-tools'
import { wellnessTools }     from '../lib/constants/wellness-spiritual'
import { lifePathTools }     from '../lib/constants/life-path-tools'
import { omniTools }         from '../lib/constants/omni-seer-tools'
import { sacredScriptTools } from '../lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '../lib/constants/time-keeper-tools'
import { voiceTools }        from '../lib/constants/voice-tools'

const allTools = [
  ...loveTools,
  ...wealthTools,
  ...wellnessTools,
  ...lifePathTools,
  ...omniTools,
  ...sacredScriptTools,
  ...timeKeeperTools,
  ...voiceTools,
]

// ── Flatten to the shape the sales page needs ────────────────
const json = allTools.map((t: any) => ({
  id:               t.id,
  name:             t.name,
  tagline:          t.tagline  ?? '',
  hook:             t.hook     ?? '',
  emoji:            t.emoji    ?? '🔮',
  domain:           t.domain,
  price:            t.price,
  rating:           t.rating       ?? 4.9,
  review_count:     t.reviewCount  ?? 0,
  is_popular:       t.isPopular    ?? false,
  is_bestseller:    t.isBestSeller ?? false,
  is_new:           t.isNew        ?? false,
  is_flagship:      t.isFlagship   ?? false,
  is_subscription:  !!t.subscriptionPeriod,
  subscription_period: t.subscriptionPeriod ?? null,
  requires_image:   t.requiresImage ? t.requiresImage.type : null,
  requires_partner: t.requiresPartner ?? false,
  delivery_minutes: t.deliveryMinutes ?? 20,
  guidance_type:    t.guidanceType ?? null,
  what_you_get:     t.whatYouGet ?? [],
  upsell_id:        t.upsell?.id ?? null,
  upsell_name:      t.upsell?.name ?? null,
  upsell_price:     t.upsell?.price ?? null,
}))

const outPath = path.join(process.cwd(), 'public', 'tools.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8')

console.log(`✅  Exported ${json.length} tools → public/tools.json`)

// Quick validation
const domains = [...new Set(json.map(t => t.domain))]
console.log(`   Domains: ${domains.join(', ')}`)
console.log(`   Require image: ${json.filter(t => t.requires_image).length}`)
console.log(`   Require partner: ${json.filter(t => t.requires_partner).length}`)
console.log(`   Subscriptions: ${json.filter(t => t.is_subscription).length}`)
