'use client'

import { useAuth } from '@/contexts/AuthContextSimple'
import AppLayout from '@/components/layout/AppLayout'
import ReceiptUpload from '@/components/receipts/ReceiptUpload'
import ReceiptApproval from '@/components/receipts/ReceiptApproval'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ImportExportPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>
  }

  const handleUploadComplete = (jobId: string) => {
    setCurrentJobId(jobId)
  }

  const handleApprovalComplete = () => {
    setCurrentJobId(null)
    // Optionally refresh the ledger or show success message
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Import/Export</h2>
        
        {currentJobId ? (
          <ReceiptApproval
            jobId={currentJobId}
            profileId={profile.id}
            onApprovalComplete={handleApprovalComplete}
          />
        ) : (
          <ReceiptUpload
            profileId={profile.id}
            onUploadComplete={handleUploadComplete}
          />
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">CSV Import/Export</h3>
          <p className="text-gray-600">CSV import/export functionality coming soon...</p>
        </div>
      </div>
    </AppLayout>
  )
}