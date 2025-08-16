'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Check, 
  X, 
  Edit, 
  CheckCircle2, 
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DraftTransaction {
  id: string
  description: string
  amount: number
  category: string
  confidence: number
  date: string
  merchant?: string
  isEditing?: boolean
}

interface PendingTransactionsProps {
  profileId: string
  draftTransactions: DraftTransaction[]
  onTransactionsApproved: (transactions: DraftTransaction[]) => void
  onTransactionRemoved: (transactionId: string) => void
}

export default function PendingTransactions({ 
  profileId, 
  draftTransactions, 
  onTransactionsApproved,
  onTransactionRemoved 
}: PendingTransactionsProps) {
  const [transactions, setTransactions] = useState<DraftTransaction[]>(draftTransactions)
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    setTransactions(draftTransactions)
  }, [draftTransactions])

  const handleEdit = (transactionId: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
        ? { ...t, isEditing: !t.isEditing }
        : t
    ))
  }

  const handleUpdate = (transactionId: string, field: keyof DraftTransaction, value: string | number) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
        ? { ...t, [field]: value }
        : t
    ))
  }

  const handleApproveTransaction = async (transaction: DraftTransaction) => {
    try {
      setIsApproving(true)
      
      // Create the actual expense in the database
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          merchant: transaction.merchant,
          source: 'ai_receipt'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create expense')
      }

      // Remove from pending
      onTransactionRemoved(transaction.id)
      toast.success(`Transaction "${transaction.description}" approved!`)
      
    } catch (error) {
      console.error('Error approving transaction:', error)
      toast.error('Failed to approve transaction')
    } finally {
      setIsApproving(false)
    }
  }

  const handleApproveAll = async () => {
    try {
      setIsApproving(true)
      
      // Create all expenses
      const responses = await Promise.all(
        transactions.map(transaction =>
          fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profileId,
              description: transaction.description,
              amount: transaction.amount,
              category: transaction.category,
              date: transaction.date,
              merchant: transaction.merchant,
              source: 'ai_receipt'
            })
          })
        )
      )

      const failed = responses.filter(r => !r.ok)
      if (failed.length > 0) {
        throw new Error(`${failed.length} transactions failed to approve`)
      }

      // Notify parent to clear all pending transactions
      onTransactionsApproved(transactions)
      toast.success(`All ${transactions.length} transactions approved!`)
      
    } catch (error) {
      console.error('Error approving all transactions:', error)
      toast.error('Failed to approve some transactions')
    } finally {
      setIsApproving(false)
    }
  }

  const handleRejectTransaction = (transactionId: string) => {
    onTransactionRemoved(transactionId)
    toast.success('Transaction removed')
  }

  const handleRejectAll = () => {
    if (confirm(`Are you sure you want to reject all ${transactions.length} pending transactions?`)) {
      transactions.forEach(t => onTransactionRemoved(t.id))
      toast.success('All pending transactions removed')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return CheckCircle2
    if (confidence >= 70) return AlertCircle
    return AlertCircle
  }

  if (transactions.length === 0) {
    return null
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Pending Transactions ({transactions.length})</CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-700">
              Awaiting Approval
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              disabled={isApproving}
            >
              <X className="w-4 h-4 mr-1" />
              Reject All
            </Button>
            <Button
              size="sm"
              onClick={handleApproveAll}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const ConfidenceIcon = getConfidenceIcon(transaction.confidence)
            
            return (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <ConfidenceIcon className={cn("w-4 h-4", getConfidenceColor(transaction.confidence))} />
                      <div className="flex-1">
                        {transaction.isEditing ? (
                          <Input
                            value={transaction.description}
                            onChange={(e) => handleUpdate(transaction.id, 'description', e.target.value)}
                            className="text-sm"
                            placeholder="Transaction description"
                          />
                        ) : (
                          <div className="font-medium">{transaction.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {transaction.isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={transaction.amount}
                            onChange={(e) => handleUpdate(transaction.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 text-sm"
                          />
                        ) : (
                          <span className="font-semibold text-lg">
                            ${transaction.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>Category:</span>
                        {transaction.isEditing ? (
                          <Input
                            value={transaction.category}
                            onChange={(e) => handleUpdate(transaction.id, 'category', e.target.value)}
                            className="w-32 h-6 text-xs"
                          />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span>Date:</span>
                        {transaction.isEditing ? (
                          <Input
                            type="date"
                            value={transaction.date}
                            onChange={(e) => handleUpdate(transaction.id, 'date', e.target.value)}
                            className="w-32 h-6 text-xs"
                          />
                        ) : (
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      {transaction.merchant && (
                        <div className="flex items-center gap-1">
                          <span>Merchant:</span>
                          <span>{transaction.merchant}</span>
                        </div>
                      )}
                      
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getConfidenceColor(transaction.confidence))}
                      >
                        {transaction.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(transaction.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRejectTransaction(transaction.id)}
                      disabled={isApproving}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleApproveTransaction(transaction)}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>AI Analysis Complete:</strong> Review each transaction above. You can edit details before approving. 
            High confidence items (90%+) are likely accurate, while lower confidence items may need your attention.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}