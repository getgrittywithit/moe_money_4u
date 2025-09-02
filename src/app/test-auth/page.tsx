'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestAuth() {
  const [status, setStatus] = useState<string[]>(['Starting test...'])
  
  const addStatus = (message: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }
  
  useEffect(() => {
    const testAuth = async () => {
      try {
        addStatus('Creating Supabase client...')
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseKey) {
          addStatus('ERROR: Missing environment variables')
          return
        }
        
        addStatus(`URL: ${supabaseUrl}`)
        
        const supabase = createClient(supabaseUrl, supabaseKey)
        addStatus('Client created successfully')
        
        // Test 1: Direct session check
        addStatus('Testing getSession()...')
        const start = Date.now()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        const duration = Date.now() - start
        addStatus(`getSession completed in ${duration}ms`)
        
        if (error) {
          addStatus(`ERROR: ${error.message}`)
        } else {
          addStatus(`Session: ${session ? 'Found' : 'Not found'}`)
          if (session) {
            addStatus(`User: ${session.user.email}`)
          }
        }
        
        // Test 2: Try API endpoint
        addStatus('Testing API endpoint...')
        const apiResponse = await fetch('/api/debug-supabase')
        const apiData = await apiResponse.json()
        addStatus(`API Response: ${JSON.stringify(apiData)}`)
        
      } catch (error) {
        addStatus(`CAUGHT ERROR: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
    
    testAuth()
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
      <div className="bg-gray-100 p-4 rounded font-mono text-sm">
        {status.map((line, i) => (
          <div key={i} className={line.includes('ERROR') ? 'text-red-600' : ''}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}