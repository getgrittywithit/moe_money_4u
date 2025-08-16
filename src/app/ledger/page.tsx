'use client'

import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import GeneralLedgerTable from '@/components/ledger/GeneralLedgerTable'
import PendingTransactions from '@/components/ledger/PendingTransactions'
import AIChatWidget from '@/components/chat/AIChatWidget'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface DraftTransaction {
  id: string
  description: string
  amount: number
  category: string
  confidence: number
  date: string
  merchant?: string
}

export default function LedgerPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [draftTransactions, setDraftTransactions] = useState<DraftTransaction[]>([])
  const [refreshLedger, setRefreshLedger] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  const handleDraftTransactions = (transactions: DraftTransaction[]) => {
    setDraftTransactions(prev => [...prev, ...transactions])
  }

  const handleTransactionRemoved = (transactionId: string) => {
    setDraftTransactions(prev => prev.filter(t => t.id !== transactionId))
  }

  const handleTransactionsApproved = (approvedTransactions: DraftTransaction[]) => {
    // Remove approved transactions from drafts
    const approvedIds = approvedTransactions.map(t => t.id)
    setDraftTransactions(prev => prev.filter(t => !approvedIds.includes(t.id)))
    // Refresh the ledger to show new transactions
    setRefreshLedger(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Setup Required</h1>
          <p className="text-gray-600">Please contact your administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppLayout>
        <div>
          <h2 className="text-2xl font-bold mb-6">General Ledger</h2>
          
          <PendingTransactions
            profileId={profile.id}
            draftTransactions={draftTransactions}
            onTransactionsApproved={handleTransactionsApproved}
            onTransactionRemoved={handleTransactionRemoved}
          />
          
          <GeneralLedgerTable 
            profileId={profile.id} 
            refreshTrigger={refreshLedger}
          />
        </div>
      </AppLayout>
      
      {/* AIChatWidget outside of AppLayout to avoid overflow clipping */}
      <AIChatWidget
        profileId={profile.id}
        onDraftTransactions={handleDraftTransactions}
      />
    </>
  )
}