// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CreditCard, DollarSign, Receipt, Download,
  Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, FileText, Printer, Mail,
  Plus, Edit, Trash2, Eye
} from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()

  const invoices = [
    { id: 'inv_001', date: '2026-03-01', amount: 2450, status: 'paid', description: 'Platform subscription - March 2026' },
    { id: 'inv_002', date: '2026-02-01', amount: 2450, status: 'paid', description: 'Platform subscription - February 2026' },
    { id: 'inv_003', date: '2026-01-01', amount: 2450, status: 'paid', description: 'Platform subscription - January 2026' },
    { id: 'inv_004', date: '2025-12-01', amount: 2450, status: 'paid', description: 'Platform subscription - December 2025' },
  ]

  const paymentMethods = [
    { id: 'pm1', type: 'visa', last4: '4242', expiry: '12/26', default: true },
    { id: 'pm2', type: 'mastercard', last4: '8888', expiry: '08/25', default: false },
  ]

  const subscription = {
    plan: 'Enterprise',
    amount: 2450,
    interval: 'monthly',
    nextBilling: '2026-04-01',
    status: 'active'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your subscription and payment methods</p>
        </div>
        <Button>
          <Receipt className="w-4 h-4 mr-2" />
          View All Invoices
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-primary-100">Current Plan</p>
            <h2 className="text-3xl font-bold mt-2">{subscription.plan}</h2>
            <p className="text-2xl font-bold mt-2">${subscription.amount}/month</p>
            <p className="text-sm text-primary-200 mt-2">Next billing: {subscription.nextBilling}</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {subscription.status}
            </Badge>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="bg-white text-primary-700 hover:bg-white/90">
            Change Plan
          </Button>
          <Button variant="outline" className="border-white text-white hover:bg-white/10">
            Cancel Subscription
          </Button>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Payment Methods</h3>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Method
          </Button>
        </div>
        <div className="space-y-3">
          {paymentMethods.map((pm) => (
            <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="font-medium">
                    {pm.type.charAt(0).toUpperCase() + pm.type.slice(1)} ending in {pm.last4}
                  </p>
                  <p className="text-xs text-neutral-500">Expires {pm.expiry}</p>
                </div>
                {pm.default && (
                  <Badge variant="primary" size="sm">Default</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-neutral-100 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Invoices */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Recent Invoices</h3>
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm">
              <div>
                <p className="font-medium">{inv.description}</p>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-neutral-500">{inv.date}</span>
                  <span>•</span>
                  <span className="font-medium text-primary-600">${inv.amount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={inv.status === 'paid' ? 'primary' : 'secondary'} size="sm">
                  {inv.status}
                </Badge>
                <button className="p-1 hover:bg-neutral-100 rounded">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-1 hover:bg-neutral-100 rounded">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Billing History */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Billing History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-neutral-500 border-b">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="py-3">{inv.date}</td>
                  <td className="py-3">{inv.description}</td>
                  <td className="py-3 font-medium">${inv.amount}</td>
                  <td className="py-3">
                    <Badge variant={inv.status === 'paid' ? 'primary' : 'secondary'} size="sm">
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}