import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all categories for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select(`
        id,
        name,
        description,
        color,
        is_default,
        created_at,
        category_budgets(budget_amount, month_year)
      `)
      .eq('profile_id', profileId)
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const { profileId, name, description, color, budgetAmount } = await request.json()

    if (!profileId || !name) {
      return NextResponse.json(
        { error: 'Profile ID and name are required' },
        { status: 400 }
      )
    }

    // Create category
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .insert({
        profile_id: profileId,
        name,
        description: description || '',
        color: color || '#3B82F6',
        is_default: false
      })
      .select()
      .single()

    if (categoryError) {
      throw categoryError
    }

    // Create budget if amount provided
    if (budgetAmount && budgetAmount > 0) {
      const currentDate = new Date()
      const monthYear = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

      await supabase
        .from('category_budgets')
        .insert({
          profile_id: profileId,
          category_id: category.id,
          budget_amount: budgetAmount,
          month_year: monthYear.toISOString().split('T')[0]
        })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, color, budgetAmount, profileId } = await request.json()

    if (!id || !profileId) {
      return NextResponse.json(
        { error: 'Category ID and Profile ID are required' },
        { status: 400 }
      )
    }

    // Update category
    const { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .update({
        name,
        description,
        color
      })
      .eq('id', id)
      .eq('profile_id', profileId)
      .select()
      .single()

    if (categoryError) {
      throw categoryError
    }

    // Update budget
    if (budgetAmount !== undefined) {
      const currentDate = new Date()
      const monthYear = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

      await supabase
        .from('category_budgets')
        .upsert({
          profile_id: profileId,
          category_id: id,
          budget_amount: budgetAmount,
          month_year: monthYear.toISOString().split('T')[0]
        })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const profileId = searchParams.get('profileId')

    if (!id || !profileId) {
      return NextResponse.json(
        { error: 'Category ID and Profile ID are required' },
        { status: 400 }
      )
    }

    // Check if category has expenses
    const { data: expenses, error: expenseCheck } = await supabase
      .from('expenses')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (expenseCheck) {
      throw expenseCheck
    }

    if (expenses && expenses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing expenses' },
        { status: 400 }
      )
    }

    // Delete category budgets first
    await supabase
      .from('category_budgets')
      .delete()
      .eq('category_id', id)

    // Delete category
    const { error: deleteError } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}