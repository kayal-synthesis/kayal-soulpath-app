export const dynamic = 'force-dynamic'

import { ToolPageClient } from './ToolPageClient'
import styles from './toolPage.module.css'
import { loveTools }         from '@/lib/constants/love-tools'
import { wealthTools }       from '@/lib/constants/wealth-tools'
import { wellnessTools }     from '@/lib/constants/wellness-spiritual'
import { lifePathTools }     from '@/lib/constants/life-path-tools'
import { omniRelationshipTools }   from '@/lib/constants/omni-seer-relationships'
import { omniSelfPurposeTools }    from '@/lib/constants/omni-seer-self-purpose'
import { omniPhysicalTimingTools } from '@/lib/constants/omni-seer-physical-timing'
import { sacredScriptTools } from '@/lib/constants/sacred-script-tools'
import { timeKeeperTools }   from '@/lib/constants/time-keeper-tools'
import { voiceTools }        from '@/lib/constants/voice-tools'

const ALL_TOOLS = [
  ...loveTools, ...wealthTools, ...wellnessTools, ...lifePathTools,
  ...omniRelationshipTools, ...omniSelfPurposeTools, ...omniPhysicalTimingTools,
  ...sacredScriptTools, ...timeKeeperTools, ...voiceTools,
]


// Tool lookup now happens here, server-side, once per request, not in
// the client bundle. Previously this whole 113-tool merged array
// (every tool's whatYouGet list, hooks, taglines, all of it) shipped to
// the browser on every single tool page load, even though only one
// tool was ever actually rendered. Moving it here means the client
// bundle only ever contains the one tool object it actually needs.
export default function ToolPage({ params }: { params: { toolId: string } }) {
  const tool = ALL_TOOLS.find((t: any) => t.id === params.toolId) as any

  if (!tool) {
    return (
      <div className={styles.page} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(26,23,20,0.5)', marginBottom: 16 }}>Tool not found.</p>
          <a href="/dashboard" style={{ color: '#1a1714' }}>Back to dashboard</a>
        </div>
      </div>
    )
  }

  return <ToolPageClient tool={tool} />
}
