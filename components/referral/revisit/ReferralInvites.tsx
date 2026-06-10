'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, User, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

export const ReferralInvites = () => {
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState('')

  const addEmail = () => {
    if (currentEmail && !emails.includes(currentEmail)) {
      setEmails([...emails, currentEmail])
      setCurrentEmail('')
    }
  }

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email))
  }

  const sendInvites = () => {
    toast.success(`Invitations sent to ${emails.length} friends!`)
    setEmails([])
  }

  return (
    <Card>
      <h3 className="text-lg font-medium mb-4">Invite Friends via Email</h3>
      
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Enter email address"
          value={currentEmail}
          onChange={(e) => setCurrentEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addEmail()}
        />
        <Button onClick={addEmail} variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {emails.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Recipients ({emails.length})</p>
          <div className="space-y-2">
            {emails.map((email) => (
              <div key={email} className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{email}</span>
                </div>
                <button onClick={() => removeEmail(email)} className="p-1 hover:bg-neutral-200 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={sendInvites} fullWidth disabled={emails.length === 0}>
        Send Invitations
      </Button>
    </Card>
  )
}