import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch expenses for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const limit = searchParams.get('limit') || '50'

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories(name, color)
      `)
      .eq('profile_id', profileId)
      .order('expense_date', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      throw error
    }

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const { 
      profileId, 
      description, 
      amount, 
      category, 
      date, 
      merchant,
      paymentMethod,
      businessClass,
      tags,
      source 
    } = await request.json()

    if (!profileId || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Profile ID, description, and amount are required' },
        { status: 400 }
      )
    }

    // Get category ID if category name provided
    let categoryId = null
    if (category) {
      const { data: categoryData } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('profile_id', profileId)
        .eq('name', category)
        .single()
      
      categoryId = categoryData?.id || null
    }

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        profile_id: profileId,
        category_id: categoryId,
        amount: parseFloat(amount),
        description,
        merchant: merchant || null,
        expense_date: date || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod || null,
        business_class: businessClass || null,
        tags: tags || null,
        ai_categorized: source === 'ai_receipt',
        ai_confidence: source === 'ai_receipt' ? 85 : null, // Default confidence for AI
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        expense_categories(name, color)
      `)
      .single()

    if (expenseError) {
      throw expenseError
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const { 
      id,
      profileId, 
      description, 
      amount, 
      category, 
      date, 
      merchant,
      paymentMethod,
      businessClass,
      tags
    } = await request.json()

    if (!id || !profileId) {
      return NextResponse.json(
        { error: 'Expense ID and Profile ID are required' },
        { status: 400 }
      )
    }

    // Get category ID if category name provided
    let categoryId = null
    if (category) {
      const { data: categoryData } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('profile_id', profileId)
        .eq('name', category)
        .single()
      
      categoryId = categoryData?.id || null
    }

    // Update expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .update({
        category_id: categoryId,
        amount: amount ? parseFloat(amount) : undefined,
        description,
        merchant,
        expense_date: date,
        payment_method: paymentMethod,
        business_class: businessClass,
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('profile_id', profileId)
      .select(`
        *,
        expense_categories(name, color)
      `)
      .single()

    if (expenseError) {
      throw expenseError
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const profileId = searchParams.get('profileId')

    if (!id || !profileId) {
      return NextResponse.json(
        { error: 'Expense ID and Profile ID are required' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}