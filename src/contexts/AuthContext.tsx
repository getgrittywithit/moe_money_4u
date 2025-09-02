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
      console.log('getProfile called with userId:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      console.log('Profile query result:', { data, error })
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error in getProfile catch:', error)
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
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        console.log('Setting up auth state change listener...')
        
        // Failsafe: Set loading to false after 10 seconds no matter what
        const timeoutId = setTimeout(() => {
          console.log('Auth initialization timeout - setting loading to false')
          if (mounted) {
            setLoading(false)
          }
        }, 10000)
        
        // Set up the auth state change listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return
            
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
              if (mounted) {
                setLoading(false)
              }
            }
          }
        )
        
        console.log('Auth listener set up, checking initial session...')
        
        // Try to get initial session (but don't wait too long)
        try {
          console.log('Calling getSession...')
          const { data: { session } } = await supabase.auth.getSession()
          console.log('Initial session check:', session ? 'Found' : 'Not found')
          
          if (session && mounted) {
            // Manually trigger the auth state change handler
            subscription.callback('INITIAL_SESSION', session)
          } else if (mounted) {
            // No session, we can stop loading
            setLoading(false)
          }
        } catch (error) {
          console.error('Error getting initial session:', error)
          // Don't let this block the app, onAuthStateChange will handle it
          if (mounted) {
            console.log('Setting loading to false due to session error')
            setLoading(false)
          }
        }
        
        return () => {
          mounted = false
          clearTimeout(timeoutId)
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          console.log('Setting loading to false due to init error')
          setLoading(false)
        }
      }
    }
    
    initializeAuth()
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