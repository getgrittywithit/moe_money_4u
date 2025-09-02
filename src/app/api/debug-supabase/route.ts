import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    return NextResponse.json({ 
      error: 'Missing environment variables',
      url: !!url,
      key: !!key 
    })
  }
  
  try {
    // Test direct API call to Supabase
    const response = await fetch(`${url}/auth/v1/session`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      }
    })
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      status: response.status,
      data: data
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}