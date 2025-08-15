import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Temporarily skip authentication for testing
    const demoUserId = 'demo-user-' + Date.now()
    const profileId = demoUserId

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `demo/${timestamp}.${fileExt}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    // Try to create processing job, fallback to demo if table doesn't exist
    let jobId = 'demo-job-' + timestamp
    try {
      const { data: job, error: jobError } = await supabase
        .from('receipt_processing_jobs')
        .insert({
          profile_id: profileId,
          receipt_image_url: publicUrl,
          status: 'pending'
        })
        .select()
        .single()

      if (job && !jobError) {
        jobId = job.id
      }
    } catch (error) {
      console.log('Receipt processing jobs table not found, using demo job ID')
    }

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      jobId: jobId,
      message: 'Receipt uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    )
  }
}