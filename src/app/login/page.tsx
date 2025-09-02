'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContextSimple'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user && !authLoading) {
      console.log('User already logged in, redirecting to home')
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
        setMessage('Check your email for the password reset link!')
        setIsResetPassword(false)
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        console.log('Login successful:', data.user?.email)
        console.log('Redirecting to home page...')
        router.push('/')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Checking authentication...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {isResetPassword ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isResetPassword && (
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : 
                isResetPassword ? 'Send Reset Link' : 
                isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>
          
          {message && (
            <p className={`mt-4 text-sm text-center ${message.includes('Check your email') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          
          <div className="mt-4 space-y-2">
            {!isResetPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            )}
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsResetPassword(!isResetPassword)
                  setMessage('')
                  setPassword('')
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {isResetPassword ? 'Back to sign in' : 'Forgot your password?'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}