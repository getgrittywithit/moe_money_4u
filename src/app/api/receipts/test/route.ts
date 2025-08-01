import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('Testing receipt processing components...')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as Array<{name: string, status: string, details?: string}>
    }

    // Test 1: Environment variables
    results.tests.push({
      name: 'Environment Variables',
      status: process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'PASS' : 'FAIL',
      details: `Vision API Key: ${process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'Set' : 'Missing'}, OpenAI Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`
    })

    // Test 2: Database connection
    try {
      const { data, error } = await supabase
        .from('receipt_processing_jobs')
        .select('count')
        .limit(1)
      
      results.tests.push({
        name: 'Database Connection',
        status: error ? 'FAIL' : 'PASS',
        details: error ? error.message : 'Can access receipt_processing_jobs table'
      })
    } catch (dbError) {
      results.tests.push({
        name: 'Database Connection',
        status: 'FAIL',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      })
    }

    // Test 3: Storage bucket
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      const receiptsBucket = buckets?.find(bucket => bucket.name === 'receipts')
      
      results.tests.push({
        name: 'Storage Bucket',
        status: receiptsBucket ? 'PASS' : 'FAIL',
        details: receiptsBucket ? 'Receipts bucket exists' : 'Receipts bucket not found'
      })
    } catch (storageError) {
      results.tests.push({
        name: 'Storage Bucket',
        status: 'FAIL',
        details: storageError instanceof Error ? storageError.message : 'Storage access error'
      })
    }

    // Test 4: Google Vision API
    if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      try {
        const testResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
              }]
            })
          }
        )

        results.tests.push({
          name: 'Google Vision API',
          status: testResponse.ok ? 'PASS' : 'FAIL',
          details: `HTTP ${testResponse.status}: ${testResponse.statusText}`
        })
      } catch (visionError) {
        results.tests.push({
          name: 'Google Vision API',
          status: 'FAIL',
          details: visionError instanceof Error ? visionError.message : 'Vision API test failed'
        })
      }
    }

    // Test 5: OpenAI API
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-build') {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        })

        results.tests.push({
          name: 'OpenAI API',
          status: openaiResponse.ok ? 'PASS' : 'FAIL',
          details: `HTTP ${openaiResponse.status}: ${openaiResponse.statusText}`
        })
      } catch (openaiError) {
        results.tests.push({
          name: 'OpenAI API',
          status: 'FAIL',
          details: openaiError instanceof Error ? openaiError.message : 'OpenAI API test failed'
        })
      }
    }

    const allPassed = results.tests.every(test => test.status === 'PASS')
    
    return NextResponse.json({
      overall: allPassed ? 'PASS' : 'FAIL',
      ...results
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json(
      { 
        overall: 'FAIL',
        error: 'Test endpoint failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}