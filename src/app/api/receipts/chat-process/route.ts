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

// Same categories as in the existing categorize route
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
    const { jobId, imageUrl, userInput } = await request.json()

    if (!jobId || !imageUrl) {
      return NextResponse.json(
        { error: 'Job ID and image URL are required' },
        { status: 400 }
      )
    }

    // For demo purposes, simulate OCR text from a typical receipt
    const ocrText = `
WALMART SUPERCENTER
123 MAIN ST
ANYTOWN, USA 12345

DATE: 01/15/2024
TIME: 14:30:25

GREAT VALUE MILK 1GAL      $3.98
BANANAS 3LB               $1.67
TIDE LAUNDRY DETERGENT    $8.47
PAPER TOWELS 6PACK        $12.34
GROUND BEEF 1LB           $4.89
BREAD WHOLE WHEAT         $2.45

SUBTOTAL:                 $33.80
TAX:                      $2.03
TOTAL:                   $35.83

PAYMENT: CREDIT CARD
`

    // Try to update job status if table exists
    try {
      await supabase
        .from('receipt_processing_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
    } catch {
      console.log('Receipt processing jobs table not found, continuing with demo')
    }

    // Enhanced prompt for conversational response
    const prompt = `
You are a helpful receipt parsing assistant having a conversation with a user. Analyze this receipt and provide a friendly, conversational response.

IMPORTANT RULES:
1. Use ONLY these categories: ${EXPENSE_CATEGORIES.join(', ')}
2. Never create new categories - use "Uncategorized" if unsure
3. For each item, provide your confidence level (0-100)
4. If the receipt has multiple different types of items, break them down by category
5. Respond in a friendly, conversational tone
6. Acknowledge any user notes/context provided

${userInput ? `User's notes: "${userInput}"` : ''}

RECEIPT TEXT:
${ocrText}

Please provide:
1. A conversational summary of what you found
2. Line-by-line breakdown with categories and confidence
3. Total amount verification if visible
4. Any observations or suggestions

Format your response as JSON:
{
  "summary": "Friendly conversational summary of the receipt",
  "lineItems": [
    {
      "description": "Item name/description",
      "amount": 0.00,
      "category": "Category from list",
      "confidence": 90
    }
  ],
  "totalAmount": 0.00,
  "merchantName": "Store name",
  "date": "YYYY-MM-DD or null",
  "observations": "Any helpful observations or suggestions"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a friendly receipt parsing assistant. Analyze receipts conversationally and categorize items accurately."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch {
      throw new Error('Invalid AI response format')
    }

    // Validate categories
    if (parsedResponse.lineItems) {
      parsedResponse.lineItems = parsedResponse.lineItems.map((item: { category?: string; confidence?: number; [key: string]: unknown }) => ({
        ...item,
        category: (item.category && EXPENSE_CATEGORIES.includes(item.category)) ? item.category : 'Uncategorized',
        confidence: Math.min(Math.max(item.confidence || 50, 0), 100)
      }))
    }

    // Try to update job with results if table exists
    try {
      await supabase
        .from('receipt_processing_jobs')
        .update({ 
          ocr_text: ocrText,
          ai_suggestions: parsedResponse,
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    } catch {
      console.log('Receipt processing jobs table not found, continuing with demo')
    }

    // Create a conversational response
    const conversationalSummary = parsedResponse.observations 
      ? `${parsedResponse.summary}\n\n${parsedResponse.observations}`
      : parsedResponse.summary

    return NextResponse.json({
      success: true,
      summary: conversationalSummary,
      lineItems: parsedResponse.lineItems,
      totalAmount: parsedResponse.totalAmount,
      merchantName: parsedResponse.merchantName,
      date: parsedResponse.date,
      jobId
    })

  } catch (error) {
    console.error('Processing error:', error)
    
    // Try to update job with error if table exists
    try {
      if (jobId) {
        await supabase
          .from('receipt_processing_jobs')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing failed'
          })
          .eq('id', jobId)
      }
    } catch {
      console.log('Could not update job error status, continuing')
    }

    return NextResponse.json(
      { 
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}