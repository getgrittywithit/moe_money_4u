'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  user_id: string
  email: string
  first_name: string
  role: 'parent' | 'child'
  color_theme: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Simple Auth: Starting initialization')
    
    // Set loading to false after 3 seconds no matter what
    const timeout = setTimeout(() => {
      console.log('Simple Auth: Timeout reached, forcing loading to false')
      setLoading(false)
    }, 3000)

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Simple Auth: State change', event, session?.user?.email)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Try to get profile
          console.log('Simple Auth: Fetching profile for user_id:', session.user.id)
          console.log('Simple Auth: Session exists, access_token present:', !!session.access_token)
          
          try {
            // Add a small delay to ensure auth state is fully set
            await new Promise(resolve => setTimeout(resolve, 100))
            
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single()
            
            console.log('Simple Auth: Profile query result:', { data, error })
            
            if (error) {
              console.error('Simple Auth: Profile query error:', error)
              // Try alternative approach - look up by email
              console.log('Simple Auth: Trying email lookup as fallback...')
              const { data: emailData, error: emailError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', session.user.email)
                .single()
              
              console.log('Simple Auth: Email lookup result:', { emailData, emailError })
              setProfile(emailData || null)
            } else {
              console.log('Simple Auth: Profile found:', data)
              setProfile(data)
            }
          } catch (error) {
            console.error('Simple Auth: Profile fetch exception', error)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
        
        setLoading(false)
        clearTimeout(timeout)
      }
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Simple Auth: Initial session', session ? 'found' : 'not found')
      if (session) {
        subscription.callback('INITIAL_SESSION', session)
      } else {
        setLoading(false)
        clearTimeout(timeout)
      }
    }).catch(error => {
      console.error('Simple Auth: Session error', error)
      setLoading(false)
      clearTimeout(timeout)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}