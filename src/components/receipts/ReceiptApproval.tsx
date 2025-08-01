'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, X, Edit2, Loader2 } from 'lucide-react'

interface LineItem {
  description: string
  amount: number
  category: string
  confidence: number
  business_class?: string
  tags?: string[]
  note?: string
}

interface ReceiptApprovalProps {
  jobId: string
  profileId: string
  onApprovalComplete: () => void
}

const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Gas & Fuel', 'Groceries', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education', 'Personal Care',
  'Home Improvement', 'Automotive', 'Insurance', 'Taxes', 'Investments',
  'Gifts & Donations', 'Business Expenses', 'Pet Care', 'Subscriptions',
  'Banking Fees', 'Legal', 'Childcare', 'Clothing', 'Electronics',
  'Books & Supplies', 'Fitness & Recreation', 'Beauty & Spa', 'Online Shopping',
  'Cash & ATM', 'Transfer', 'Income', 'Refund', 'Other', 'Uncategorized'
]

const BUSINESS_CLASSES = [
  { value: '', label: 'Personal' },
  { value: 'triton', label: 'Triton' },
  { value: 'grit_collective', label: 'Grit Collective' },
  { value: 'mermaid', label: 'Mermaid' },
  { value: 'pantrypal_pro', label: 'PantryPal Pro' },
  { value: 'boernes_handy_hub', label: 'Boerne\'s Handy Hub' }
]

export default function ReceiptApproval({ jobId, profileId, onApprovalComplete }: ReceiptApprovalProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [isSplitTransaction, setIsSplitTransaction] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchJobDetails()
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/receipts/job/${jobId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch job details')
      }

      if (result.ai_suggestions) {
        setMerchant(result.ai_suggestions.merchant || '')
        setDate(result.ai_suggestions.date || new Date().toISOString().split('T')[0])
        setLineItems(result.ai_suggestions.lineItems || [])
        setIsSplitTransaction(result.ai_suggestions.isSplitTransaction || false)
      }
    } catch (error) {
      console.error('Error fetching job details:', error)
      setError(error instanceof Error ? error.message : 'Failed to load receipt details')
    } finally {
      setLoading(false)
    }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number | string[]) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const handleApprove = async () => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/receipts/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId,
          profileId,
          merchant,
          date,
          lineItems,
          isSplitTransaction
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Approval failed')
      }

      onApprovalComplete()
    } catch (error) {
      console.error('Approval error:', error)
      setError(error instanceof Error ? error.message : 'Approval failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading receipt details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Review & Approve Receipt</h3>
      
      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
          <Input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Store name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Line Items</h4>
          <Badge variant={isSplitTransaction ? 'default' : 'secondary'}>
            {isSplitTransaction ? 'Split Transaction' : 'Single Category'}
          </Badge>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="text-sm"
                  />
                </div>
                
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="text-sm text-right"
                  />
                </div>

                <div className="col-span-3">
                  <select
                    value={item.category}
                    onChange={(e) => updateLineItem(index, 'category', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <select
                    value={item.business_class || ''}
                    onChange={(e) => updateLineItem(index, 'business_class', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {BUSINESS_CLASSES.map(cls => (
                      <option key={cls.value} value={cls.value}>{cls.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 text-center">
                  <Badge className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                    {item.confidence}%
                  </Badge>
                </div>
              </div>

              {editingIndex === index && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Tags (comma separated)"
                    value={item.tags?.join(', ') || ''}
                    onChange={(e) => updateLineItem(index, 'tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Note"
                    value={item.note || ''}
                    onChange={(e) => updateLineItem(index, 'note', e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  {editingIndex === index ? 'Done' : 'Edit'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-gray-50 rounded p-3">
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={processing || lineItems.length === 0}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Transactions...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Approve & Create Transactions
            </>
          )}
        </Button>
        
        <Button variant="outline" onClick={onApprovalComplete}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}