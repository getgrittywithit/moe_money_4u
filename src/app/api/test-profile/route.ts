import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test profile lookup for your user_id
    const userId = 'af2741ac-f65f-4966-8d9e-33974580ef0f'
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return NextResponse.json({
      success: true,
      profile,
      error,
      query: `Looking for user_id: ${userId}`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}