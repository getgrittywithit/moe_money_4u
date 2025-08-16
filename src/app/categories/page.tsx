'use client'

import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import CategoryManager from '@/components/categories/CategoryManager'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CategoriesPage() {
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
      <CategoryManager profileId={profile.id} />
    </AppLayout>
  )
}