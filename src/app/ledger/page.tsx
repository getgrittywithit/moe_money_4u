'use client'

import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import GeneralLedgerTable from '@/components/ledger/GeneralLedgerTable'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LedgerPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

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
    <AppLayout>
      <div>
        <h2 className="text-2xl font-bold mb-6">General Ledger</h2>
        <GeneralLedgerTable profileId={profile.id} />
      </div>
    </AppLayout>
  )
}