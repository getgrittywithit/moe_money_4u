import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
})

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Gas & Fuel', 
  'Groceries',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Travel',
  'Education',
  'Personal Care',
  'Home Improvement',
  'Automotive',
  'Insurance',
  'Taxes',
  'Investments',
  'Gifts & Donations',
  'Business Expenses',
  'Pet Care',
  'Subscriptions',
  'Banking Fees',
  'Legal',
  'Childcare',
  'Clothing',
  'Electronics',
  'Books & Supplies',
  'Fitness & Recreation',
  'Beauty & Spa',
  'Online Shopping',
  'Cash & ATM',
  'Transfer',
  'Income',
  'Refund',
  'Other',
  'Uncategorized'
]

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-build') {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const { jobId, ocrText } = await request.json()

    if (!jobId || !ocrText) {
      return NextResponse.json(
        { error: 'Job ID and OCR text are required' },
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

    const prompt = `
You are a transaction categorizer for expense tracking. Your job is to analyze receipt text and categorize line items.

RULES:
1. Use ONLY the provided category list - never create new categories
2. If uncertain, use "Uncategorized"
3. For receipts with multiple categories, split line by line
4. Provide confidence scores (0-100) for each categorization
5. Ensure line item amounts add up to the total (if available)
6. Extract merchant name and transaction date if visible

CATEGORY LIST:
${EXPENSE_CATEGORIES.join(', ')}

RECEIPT TEXT:
${ocrText}

Please analyze this receipt and return a JSON response with this structure:
{
  "merchant": "Store name",
  "date": "YYYY-MM-DD or null if not found",
  "total": 0.00,
  "lineItems": [
    {
      "description": "Item description",
      "amount": 0.00,
      "category": "Category from list",
      "confidence": 85
    }
  ],
  "isSplitTransaction": true/false
}

If this is a simple single-category receipt (like gas station), set isSplitTransaction to false and return one line item with the full amount.
If this has multiple categories (like grocery store with food + household items), set isSplitTransaction to true and break down by category.
`

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise transaction categorizer. Always return valid JSON in the requested format."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const aiResponse = completion.choices[0]?.message?.content
      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Parse AI response
      let aiSuggestions
      try {
        aiSuggestions = JSON.parse(aiResponse)
      } catch {
        console.error('Failed to parse AI response:', aiResponse)
        throw new Error('Invalid AI response format')
      }

      // Validate and clean the response
      if (!aiSuggestions.lineItems || !Array.isArray(aiSuggestions.lineItems)) {
        throw new Error('Invalid line items in AI response')
      }

      // Ensure all categories are from our list
      aiSuggestions.lineItems = aiSuggestions.lineItems.map((item: { category?: string; confidence?: number; [key: string]: unknown }) => ({
        ...item,
        category: (item.category && EXPENSE_CATEGORIES.includes(item.category)) ? item.category : 'Uncategorized',
        confidence: Math.min(Math.max(item.confidence || 50, 0), 100) // Clamp between 0-100
      }))

      // Update job with AI suggestions
      const { error: updateError } = await supabase
        .from('receipt_processing_jobs')
        .update({ 
          ai_suggestions: aiSuggestions,
          status: 'completed'
        })
        .eq('id', jobId)

      if (updateError) {
        throw new Error('Failed to update job with AI suggestions')
      }

      return NextResponse.json({
        success: true,
        suggestions: aiSuggestions,
        message: 'Receipt categorized successfully'
      })

    } catch (aiError) {
      console.error('AI categorization error:', aiError)
      
      // Update job with error status
      await supabase
        .from('receipt_processing_jobs')
        .update({ 
          status: 'failed',
          error_message: aiError instanceof Error ? aiError.message : 'AI categorization failed'
        })
        .eq('id', jobId)

      throw aiError
    }

  } catch (error) {
    console.error('Categorization error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to categorize receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}