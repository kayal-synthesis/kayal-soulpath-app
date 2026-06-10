'use client'

import { motion } from 'framer-motion'
import { TheSeerCard } from './TheSeerCard'
import { HeartOracleCard } from './HeartOracleCard'
import { ProsperityOracleCard } from './ProsperityOracleCard'
import { SummitOracleCard } from './SummitOracleCard'
import { MysticOracleCard } from './MysticOracleCard'
import { VitalityOracleCard } from './VitalityOracleCard'
import { DestinyOracleCard } from './DestinyOracleCard'
import { DailyCompanionCard } from './DailyCompanionCard'
import { VoiceOfTimeCard } from './VoiceOfTimeCard'
import { ConversationStarterCard } from './ConversationStarterCard'

interface VoiceToolCardProps {
  tool: any
  stats: any
  index: number
  onQuickPreview: (tool: any) => void
}

export const VoiceToolCard = ({ tool, stats, index, onQuickPreview }: VoiceToolCardProps) => {
  
  // Select the appropriate card based on tool ID
  const getCardComponent = () => {
    switch (tool.id) {
      case 'the-seer-voice':
        return <TheSeerCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-heart-oracle':
        return <HeartOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-prosperity-oracle':
        return <ProsperityOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-summit-oracle':
        return <SummitOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-mystic-oracle':
        return <MysticOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-vitality-oracle':
        return <VitalityOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-destiny-oracle-voice':
        return <DestinyOracleCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-daily-companion':
        return <DailyCompanionCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-voice-of-time':
        return <VoiceOfTimeCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      case 'the-conversation-starter':
        return <ConversationStarterCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
      default:
        return <TheSeerCard tool={tool} stats={stats} onQuickPreview={onQuickPreview} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-full"
    >
      {getCardComponent()}
    </motion.div>
  )
}