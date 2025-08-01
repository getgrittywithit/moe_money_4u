'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Moe Money 4U</h1>
          <p className="text-gray-600 mb-8">Personal expense tracking made simple</p>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Setup Required</h1>
          <p className="text-gray-600 mb-8">
            You need to be added to a family profile to use this app.
            Please contact your family administrator.
          </p>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Moe Money 4U</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {profile.first_name}</span>
          <span className="text-sm text-gray-500">({profile.role})</span>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>
      
      <main>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Your expense tracking dashboard will go here.
            Profile ID: {profile.id}
          </p>
        </div>
      </main>
    </div>
  )
}
