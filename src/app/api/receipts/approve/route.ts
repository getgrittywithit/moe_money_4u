import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LineItem {
  description: string
  amount: number
  category: string
  confidence: number
  business_class?: string
  tags?: string[]
  note?: string
}

interface ApprovalRequest {
  jobId: string
  profileId: string
  merchant: string
  date: string
  lineItems: LineItem[]
  isSplitTransaction: boolean
}

export async function POST(request: NextRequest) {
  try {
    const data: ApprovalRequest = await request.json()
    const { jobId, profileId, merchant, date, lineItems, isSplitTransaction } = data

    if (!jobId || !profileId || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Calculate total amount
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)

    try {
      if (isSplitTransaction && lineItems.length > 1) {
        // Create parent transaction
        const { data: parentTransaction, error: parentError } = await supabase
          .from('expenses')
          .insert({
            profile_id: profileId,
            expense_date: date || new Date().toISOString().split('T')[0],
            name: merchant || 'Receipt Transaction',
            description: merchant || 'Receipt Transaction',
            amount: totalAmount,
            status_text: 'posted',
            transaction_type_text: 'regular',
            expense_type: 'personal',
            is_split_transaction: true,
            receipt_image_url: job.receipt_image_url,
            split_line_items: lineItems
          })
          .select()
          .single()

        if (parentError) {
          throw new Error(`Failed to create parent transaction: ${parentError.message}`)
        }

        // Create child transactions
        const childTransactions = []
        for (const item of lineItems) {
          // Get category ID if it exists
          const { data: categoryData } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('name', item.category)
            .single()

          const { data: childTransaction, error: childError } = await supabase
            .from('expenses')
            .insert({
              profile_id: profileId,
              parent_transaction_id: parentTransaction.id,
              expense_date: date || new Date().toISOString().split('T')[0],
              name: item.description,
              description: item.description,
              amount: item.amount,
              status_text: 'posted',
              transaction_type_text: 'regular',
              expense_type: item.business_class ? 'business' : 'personal',
              business_class: item.business_class || null,
              tags: item.tags || null,
              note: item.note || null,
              category_id: categoryData?.id || null,
              ai_confidence_score: item.confidence,
              is_split_transaction: false
            })
            .select()
            .single()

          if (childError) {
            throw new Error(`Failed to create child transaction: ${childError.message}`)
          }

          childTransactions.push(childTransaction)

          // Record AI feedback for learning
          if (job.ai_suggestions) {
            const originalSuggestion = job.ai_suggestions.lineItems?.find((orig: { description: string; category: string; confidence: number }) => 
              orig.description === item.description
            )
            
            if (originalSuggestion) {
              await supabase
                .from('ai_categorization_feedback')
                .insert({
                  profile_id: profileId,
                  expense_id: childTransaction.id,
                  ai_suggested_category: originalSuggestion.category,
                  user_chosen_category: item.category,
                  ai_confidence_score: originalSuggestion.confidence,
                  merchant_name: merchant,
                  transaction_amount: item.amount
                })
            }
          }
        }

        // Mark job as approved
        await supabase
          .from('receipt_processing_jobs')
          .update({ 
            approved_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', jobId)

        return NextResponse.json({
          success: true,
          parentTransaction,
          childTransactions,
          message: `Created split transaction with ${lineItems.length} categories`
        })

      } else {
        // Single transaction
        const item = lineItems[0]
        
        // Get category ID if it exists  
        const { data: categoryData } = await supabase
          .from('expense_categories')
          .select('id')
          .eq('name', item.category)
          .single()

        const { data: transaction, error: transactionError } = await supabase
          .from('expenses')
          .insert({
            profile_id: profileId,
            expense_date: date || new Date().toISOString().split('T')[0],
            name: merchant || item.description,
            description: item.description,
            amount: item.amount,
            status_text: 'posted',
            transaction_type_text: 'regular',
            expense_type: item.business_class ? 'business' : 'personal',
            business_class: item.business_class || null,
            tags: item.tags || null,
            note: item.note || null,
            category_id: categoryData?.id || null,
            ai_confidence_score: item.confidence,
            is_split_transaction: false,
            receipt_image_url: job.receipt_image_url
          })
          .select()
          .single()

        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`)
        }

        // Record AI feedback
        if (job.ai_suggestions && job.ai_suggestions.lineItems?.[0]) {
          await supabase
            .from('ai_categorization_feedback')
            .insert({
              profile_id: profileId,
              expense_id: transaction.id,
              ai_suggested_category: job.ai_suggestions.lineItems[0].category,
              user_chosen_category: item.category,
              ai_confidence_score: job.ai_suggestions.lineItems[0].confidence,
              merchant_name: merchant,
              transaction_amount: item.amount
            })
        }

        // Mark job as approved
        await supabase
          .from('receipt_processing_jobs')
          .update({ 
            approved_at: new Date().toISOString(),
            status: 'completed'
          })
          .eq('id', jobId)

        return NextResponse.json({
          success: true,
          transaction,
          message: 'Transaction created successfully'
        })
      }

    } catch (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to approve receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}