// @ts-nocheck
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Database, 
  HardDrive, 
  Activity, 
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDatabasePage() {
  const [backingUp, setBackingUp] = useState(false)

  const tables = [
    { name: 'users', rows: 12847, size: '124 MB', lastUpdated: '2 min ago' },
    { name: 'profiles', rows: 12847, size: '89 MB', lastUpdated: '2 min ago' },
    { name: 'purchases', rows: 23847, size: '156 MB', lastUpdated: '5 min ago' },
    { name: 'subscriptions', rows: 3895, size: '23 MB', lastUpdated: '10 min ago' },
    { name: 'referrals', rows: 12453, size: '45 MB', lastUpdated: '15 min ago' },
    { name: 'notifications', rows: 89234, size: '234 MB', lastUpdated: '1 min ago' },
  ]

  const backups = [
    { date: '2026-03-15 03:00', size: '1.2 GB', status: 'success' },
    { date: '2026-03-14 03:00', size: '1.1 GB', status: 'success' },
    { date: '2026-03-13 03:00', size: '1.1 GB', status: 'success' },
    { date: '2026-03-12 03:00', size: '1.0 GB', status: 'failed' },
    { date: '2026-03-11 03:00', size: '1.0 GB', status: 'success' },
  ]

  const handleBackup = () => {
    setBackingUp(true)
    setTimeout(() => {
      setBackingUp(false)
      toast.success('Database backup completed')
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-serif">Database Management</h1>
              <p className="text-sm text-neutral-500">Monitor and manage your database</p>
            </div>
          </div>
          <Button onClick={handleBackup} loading={backingUp}>
            <Download className="w-4 h-4 mr-2" />
            Backup Now
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Size</p>
            <p className="text-2xl font-serif">2.4 GB</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Tables</p>
            <p className="text-2xl font-serif">24</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Total Rows</p>
            <p className="text-2xl font-serif">187k</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-neutral-500">Avg Query Time</p>
            <p className="text-2xl font-serif">23ms</p>
          </Card>
        </div>

        {/* Tables List */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Database Tables</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium">Table Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Rows</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Size</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Last Updated</th>
                  <th className="text-left py-3 px-4 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.name} className="border-b hover:bg-neutral-50">
                    <td className="py-3 px-4 font-medium">{table.name}</td>
                    <td className="py-3 px-4">{table.rows.toLocaleString()}</td>
                    <td className="py-3 px-4">{table.size}</td>
                    <td className="py-3 px-4 text-sm text-neutral-600">{table.lastUpdated}</td>
                    <td className="py-3 px-4">
                      <Button size="xs" variant="ghost">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Backups */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Backup History</h3>
          <div className="space-y-3">
            {backups.map((backup, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {backup.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{backup.date}</p>
                    <p className="text-xs text-neutral-500">Size: {backup.size}</p>
                  </div>
                </div>
                <Button size="xs" variant="ghost">Restore</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}