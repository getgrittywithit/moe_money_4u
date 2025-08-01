import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json()

    // Update the profile to link with auth user
    const { data, error } = await supabase
      .from('profiles')
      .update({ user_id: userId })
      .eq('email', email)
      .eq('user_id', null) // Only update if not already linked
      .select()

    if (error) {
      console.error('Error linking profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data && data.length === 0) {
      return NextResponse.json({ error: 'No matching profile found or already linked' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: data[0] })
  } catch (error) {
    console.error('Error in link-profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}