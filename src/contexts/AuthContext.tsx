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

  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const linkProfileToUser = async (user: User) => {
    try {
      console.log('Attempting to link profile for:', user.email)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/link-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log('Profile linked successfully:', result.profile)
        return result.profile
      } else {
        console.log('Profile linking failed:', response.status, response.statusText)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Profile linking timed out')
      } else {
        console.error('Error linking profile:', error)
      }
    }
    return null
  }

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('Getting auth session...')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          throw error
        }
        console.log('Session retrieved:', session ? 'Session found' : 'No session')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('User found, getting profile for:', session.user.email)
          let profileData = await getProfile(session.user.id)
          
          // If no profile found, try to link existing profile
          if (!profileData) {
            console.log('No profile found, attempting to link...')
            profileData = await linkProfileToUser(session.user)
          }
          
          setProfile(profileData)
          console.log('Profile set:', profileData ? 'Success' : 'Failed')
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack)
        }
      } finally {
        setLoading(false)
        console.log('Auth loading complete')
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('Auth state change:', event, session?.user?.email)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            let profileData = await getProfile(session.user.id)
            
            // If no profile found, try to link existing profile
            if (!profileData && event === 'SIGNED_IN') {
              profileData = await linkProfileToUser(session.user)
            }
            
            setProfile(profileData)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}