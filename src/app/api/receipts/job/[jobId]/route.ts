import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Get the processing job
    const { data: job, error: jobError } = await supabase
      .from('receipt_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError) {
      console.error('Job fetch error:', jobError)
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(job)

  } catch (error) {
    console.error('Job details error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch job details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}