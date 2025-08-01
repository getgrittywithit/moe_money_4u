import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Google Vision client
const vision = new ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
})

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

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

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Processing job not found' },
        { status: 404 }
      )
    }

    // Update job status to processing
    await supabase
      .from('receipt_processing_jobs')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', jobId)

    try {
      // Process image with Google Vision OCR
      const [result] = await vision.textDetection({
        image: { source: { imageUri: job.receipt_image_url } }
      })

      const detections = result.textAnnotations
      const extractedText = detections?.[0]?.description || ''

      if (!extractedText) {
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