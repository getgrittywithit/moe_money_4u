import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with specific header
    const authHeader = request.headers.get('x-admin-key')
    if (process.env.NODE_ENV === 'production' && authHeader !== 'update-schema-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting schema update...')
    const results = []

    // Step 1: Add receipt processing fields to expenses table
    try {
      const { error: alterError } = await supabaseAdmin
        .from('expenses')
        .select('parent_transaction_id')
        .limit(1)
      
      if (alterError && alterError.message.includes('does not exist')) {
        // Columns don't exist, need to add them
        const addColumnsQueries = [
          'ALTER TABLE expenses ADD COLUMN parent_transaction_id UUID REFERENCES expenses(id)',
          'ALTER TABLE expenses ADD COLUMN is_split_transaction BOOLEAN DEFAULT FALSE',
          'ALTER TABLE expenses ADD COLUMN receipt_image_url TEXT',
          'ALTER TABLE expenses ADD COLUMN split_line_items JSONB',
          'ALTER TABLE expenses ADD COLUMN ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100)'
        ]

        for (const query of addColumnsQueries) {
          try {
            await supabaseAdmin.rpc('exec', { sql: query })
            results.push(`✓ ${query}`)
          } catch (err) {
            results.push(`✗ ${query}: ${err}`)
          }
        }
      } else {
        results.push('✓ Expenses table columns already exist')
      }
    } catch (err) {
      results.push(`✗ Expenses table update failed: ${err}`)
    }

    // Step 2: Create receipt processing jobs table
    try {
      const { error } = await supabaseAdmin
        .from('receipt_processing_jobs')
        .select('id')
        .limit(1)
      
      if (error && error.message.includes('does not exist')) {
        await supabaseAdmin.rpc('exec', {
          sql: `
            CREATE TABLE receipt_processing_jobs (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              profile_id UUID NOT NULL REFERENCES profiles(id),
              receipt_image_url TEXT NOT NULL,
              ocr_text TEXT,
              ai_suggestions JSONB,
              status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
              error_message TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              processed_at TIMESTAMPTZ,
              approved_at TIMESTAMPTZ
            )
          `
        })
        results.push('✓ Created receipt_processing_jobs table')
      } else {
        results.push('✓ receipt_processing_jobs table already exists')
      }
    } catch (err) {
      results.push(`✗ receipt_processing_jobs table creation failed: ${err}`)
    }

    // Step 3: Create AI feedback table
    try {
      const { error } = await supabaseAdmin
        .from('ai_categorization_feedback')
        .select('id')
        .limit(1)
      
      if (error && error.message.includes('does not exist')) {
        await supabaseAdmin.rpc('exec', {
          sql: `
            CREATE TABLE ai_categorization_feedback (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              profile_id UUID NOT NULL REFERENCES profiles(id),
              expense_id UUID NOT NULL REFERENCES expenses(id),
              ai_suggested_category TEXT NOT NULL,
              user_chosen_category TEXT NOT NULL,
              ai_confidence_score INTEGER NOT NULL,
              merchant_name TEXT,
              transaction_amount DECIMAL(10,2),
              created_at TIMESTAMPTZ DEFAULT NOW()
            )
          `
        })
        results.push('✓ Created ai_categorization_feedback table')
      } else {
        results.push('✓ ai_categorization_feedback table already exists')
      }
    } catch (err) {
      results.push(`✗ ai_categorization_feedback table creation failed: ${err}`)
    }

    // Step 4: Create storage bucket
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      const receiptsBucket = buckets?.find(bucket => bucket.name === 'receipts')
      
      if (!receiptsBucket) {
        await supabaseAdmin.storage.createBucket('receipts', { public: false })
        results.push('✓ Created receipts storage bucket')
      } else {
        results.push('✓ receipts storage bucket already exists')
      }
    } catch (err) {
      results.push(`✗ Storage bucket creation failed: ${err}`)
    }

    console.log('Schema update completed')

    return NextResponse.json({ 
      success: true, 
      message: 'Receipt processing schema updated successfully',
      results
    })

  } catch (error) {
    console.error('Schema update failed:', error)
    return NextResponse.json(
      { error: 'Schema update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}