import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Check content length before parsing
    const contentLength = request.headers.get('content-length')
    const maxSize = 5 * 1024 * 1024 // Reduce to 5MB for better reliability
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 413 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('receipt') as File
    const profileId = formData.get('profileId') as string

    if (!file || !profileId) {
      return NextResponse.json(
        { error: 'Receipt file and profile ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image or PDF.' },
        { status: 400 }
      )
    }

    // Double-check file size after parsing
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 413 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${profileId}/${timestamp}.${fileExtension}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload receipt image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    // Create processing job record using service role (bypasses RLS)
    const { data: jobData, error: jobError } = await supabase
      .rpc('create_receipt_job', {
        p_profile_id: profileId,
        p_receipt_image_url: urlData.publicUrl
      })

    if (jobError) {
      console.error('Job creation error:', jobError)
      // Clean up uploaded file
      await supabase.storage.from('receipts').remove([fileName])
      return NextResponse.json(
        { error: 'Failed to create processing job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: jobData.id,
      receiptUrl: urlData.publicUrl,
      message: 'Receipt uploaded successfully. Processing will begin shortly.'
    })

  } catch (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}