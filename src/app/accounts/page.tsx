'use client'

import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AccountsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>
  }

  return (
    <AppLayout>
      <div>
        <h2 className="text-2xl font-bold mb-6">Accounts</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Account management coming soon...</p>
        </div>
      </div>
    </AppLayout>
  )
}