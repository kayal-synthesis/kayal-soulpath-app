'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnonymousStore } from '@/lib/store/anonymousStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mic, MessageCircle, ArrowLeft } from 'lucide-react'
import { voiceTools } from '@/lib/constants/voice-tools'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasCompletedOnboarding } = useAnonymousStore()
  const toolId = params.toolId as string
  const tool = voiceTools.find(t => t.id === toolId)

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      router.push('/onboarding/basic')
    }
  }, [hasCompletedOnboarding, router])

  if (!tool) {
    return <div>Tool not found</div>
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <Card className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center text-3xl">
            {tool.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-serif">{tool.name}</h1>
            <p className="text-neutral-500">{tool.role}</p>
          </div>
        </div>

        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
          <h2 className="text-xl font-medium mb-2">Chat Coming Soon</h2>
          <p className="text-neutral-500 mb-6">
            This is where you'll chat with {tool.name}
          </p>
          <Button disabled>
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Chat (Coming Soon)
          </Button>
        </div>
      </Card>
    </div>
  )
}