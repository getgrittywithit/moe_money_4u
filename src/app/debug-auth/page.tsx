'use client'

import { useAuth } from '@/contexts/AuthContextSimple'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'

export default function DebugAuth() {
  const { user, profile, loading } = useAuth()
  const [sessionData, setSessionData] = useState<{ session: Session | null } | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...')
  const [profileTest, setProfileTest] = useState<any>(null)

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Check if Supabase client is initialized
        if (!supabase) {
          setSupabaseStatus('Supabase client not initialized')
          return
        }
        
        setSupabaseStatus('Supabase client initialized')
        
        // Try to get session directly
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setSessionError(error.message)
          console.error('Session error:', error)
        } else {
          setSessionData(data)
          console.log('Session data:', data)
        }
      } catch (err) {
        console.error('Debug error:', err)
        setSessionError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
    
    checkSupabase()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Information</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <pre className="text-sm">
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Not set'}
            {'\n'}
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Supabase Status</h2>
          <p>{supabaseStatus}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Auth Context State</h2>
          <pre className="text-sm">
            Loading: {loading.toString()}
            {'\n'}
            User: {user ? `✓ ${user.email}` : '✗ No user'}
            {'\n'}
            Profile: {profile ? `✓ ${profile.first_name}` : '✗ No profile'}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Direct Session Check</h2>
          {sessionError ? (
            <div className="text-red-600">
              <p className="font-semibold">Error:</p>
              <pre className="text-sm">{sessionError}</pre>
            </div>
          ) : sessionData ? (
            <pre className="text-sm">
              Session: {sessionData.session ? '✓ Active' : '✗ No session'}
              {'\n'}
              {sessionData.session && `User: ${sessionData.session.user.email}`}
            </pre>
          ) : (
            <p>Checking...</p>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Profile Test</h2>
          <div className="space-y-2">
            <button 
              onClick={async () => {
                if (!user) {
                  setProfileTest({ error: 'No user logged in' })
                  return
                }
                
                console.log('Testing direct profile query...')
                const { data, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', user.id)
                  .single()
                
                setProfileTest({ data, error })
                console.log('Direct profile test:', { data, error })
              }}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Test Direct Profile Query
            </button>
            {profileTest && (
              <pre className="text-sm bg-white p-2 rounded border">
                {JSON.stringify(profileTest, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Reload Page
            </button>
            <button 
              onClick={async () => {
                const { error } = await supabase.auth.signOut()
                if (error) console.error('Sign out error:', error)
                else window.location.href = '/'
              }}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Force Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}