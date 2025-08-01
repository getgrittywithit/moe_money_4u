import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Use REST API instead of client library for better Vercel compatibility
async function performOCR(imageUrl: string): Promise<string> {
  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error('Google Vision API key not configured')
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              source: {
                imageUri: imageUrl
              }
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Vision API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  
  if (result.responses?.[0]?.error) {
    throw new Error(`Vision API error: ${result.responses[0].error.message}`)
  }

  const textAnnotations = result.responses?.[0]?.textAnnotations
  return textAnnotations?.[0]?.description || ''
}

export async function POST(request: NextRequest) {
  try {
    console.log('Processing receipt - starting')
    
    const { jobId } = await request.json()

    if (!jobId) {
      console.log('Error: No job ID provided')
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log('Looking up job:', jobId)

    // Get the processing job
    const { data: job, error: jobError } = await supabase
      .from('receipt_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError) {
      console.log('Job lookup error:', jobError)
      return NextResponse.json(
        { error: 'Database error finding job', details: jobError.message },
        { status: 500 }
      )
    }

    if (!job) {
      console.log('Job not found:', jobId)
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      )
    }

    console.log('Found job:', job.id, 'Image URL:', job.receipt_image_url)

    // Update job status to processing
    await supabase
      .from('receipt_processing_jobs')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', jobId)

    try {
      console.log('Starting OCR processing...')
      
      // Process image with Google Vision OCR using REST API
      const extractedText = await performOCR(job.receipt_image_url)

      console.log('OCR completed. Text length:', extractedText?.length || 0)

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text detected in receipt image')
      }

      // Update job with OCR results
      const { error: updateError } = await supabase
        .from('receipt_processing_jobs')
        .update({ 
          ocr_text: extractedText,
          status: 'completed'
        })
        .eq('id', jobId)

      if (updateError) {
        throw new Error('Failed to update job with OCR results')
      }

      // Now call AI categorization
      const categorizationResponse = await fetch(`${request.nextUrl.origin}/api/receipts/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, ocrText: extractedText })
      })

      if (!categorizationResponse.ok) {
        throw new Error('AI categorization failed')
      }

      const categorizationResult = await categorizationResponse.json()

      return NextResponse.json({
        success: true,
        jobId,
        ocrText: extractedText,
        aiSuggestions: categorizationResult.suggestions,
        message: 'Receipt processed successfully'
      })

    } catch (processingError) {
      console.error('Processing error:', processingError)
      
      // Update job with error status
      await supabase
        .from('receipt_processing_jobs')
        .update({ 
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Processing failed'
        })
        .eq('id', jobId)

      throw processingError
    }

  } catch (error) {
    console.error('Receipt processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}