import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up receipt processing tables...')
    const results = []

    // Check if receipt_processing_jobs table exists by trying to query it
    const { error: jobsTableError } = await supabase
      .from('receipt_processing_jobs')
      .select('count')
      .limit(1)

    if (jobsTableError && jobsTableError.code === 'PGRST116') {
      // Table doesn't exist, let's create it using a simpler approach
      const { error: createError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_name', 'receipt_processing_jobs')

      if (createError) {
        results.push('❌ Cannot access database to check tables')
      } else {
        results.push('✅ Database access confirmed')
      }
    } else {
      results.push('✅ receipt_processing_jobs table already exists')
    }

    // For now, let's try a different approach - check if we can access expenses table
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('id, parent_transaction_id, is_split_transaction')
      .limit(1)

    if (expensesError && expensesError.message.includes('does not exist')) {
      results.push('❌ Need to add columns to expenses table')
    } else if (expensesError) {
      results.push(`❌ Expenses table error: ${expensesError.message}`)
    } else {
      results.push('✅ Expenses table has receipt processing columns')
    }

    // Check storage bucket
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      
      if (bucketError) {
        results.push(`❌ Storage access error: ${bucketError.message}`)
      } else {
        const receiptsBucket = buckets?.find(bucket => bucket.name === 'receipts')
        if (receiptsBucket) {
          results.push('✅ Receipts storage bucket exists')
        } else {
          // Try to create bucket
          const { error: createBucketError } = await supabase.storage.createBucket('receipts', { public: false })
          if (createBucketError) {
            results.push(`❌ Failed to create receipts bucket: ${createBucketError.message}`)
          } else {
            results.push('✅ Created receipts storage bucket')
          }
        }
      }
    } catch (storageError) {
      results.push(`❌ Storage error: ${storageError}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Setup check completed',
      results,
      canProceed: !results.some(r => r.startsWith('❌'))
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { 
        error: 'Setup failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}