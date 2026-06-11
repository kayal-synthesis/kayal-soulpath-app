'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Heart, Users } from 'lucide-react'

export default function CompatibilityPage() {
  const session = null
  const router = useRouter()
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', month: '', day: '', year: '' })
  const [result, setResult] = useState<any>(null)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setResult({ score: 87, match: 'Exceptional Match' })
      setStep('result')
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-block mb-4">
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
      </Link>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
        <h1 className="text-2xl font-serif">Compatibility Challenge</h1>
      </div>
      {step === 'input' ? (
        <Card>
          <h2 className="text-lg font-medium mb-4">See how compatible you are with someone you love</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Their Name" value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 border rounded-lg" required />
            <div className="grid grid-cols-3 gap-2">
              <select value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})} className="p-3 border rounded-lg" required>
                <option value="">Month</option>
                {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select value={formData.day} onChange={(e) => setFormData({...formData, day: e.target.value})} className="p-3 border rounded-lg" required>
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="p-3 border rounded-lg" required>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button type="submit">Check Compatibility</Button>
          </form>
        </Card>
      ) : (
        <Card className="text-center">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-12 h-12 text-primary-600 fill-primary-600" />
          </div>
          <h2 className="text-2xl font-serif mb-2">{formData.name}</h2>
          <div className="text-5xl font-serif text-primary-600 mb-2">{result.score}%</div>
          <p className="text-lg text-neutral-600 mb-6">{result.match}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline">Share Result</Button>
            <Button>View Full Report — $37</Button>
          </div>
        </Card>
      )}
    </div>
  )
}