import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    // Cheetah Elevation, LLC business categories with budgets
    const businessCategories = [
      { name: 'B - Rent', description: 'Business rent and facility costs', color: '#E74C3C', budget: 650 },
      { name: 'B - Software and subscriptions', description: 'Business software, SaaS, subscriptions', color: '#3498DB', budget: 100 },
      { name: 'B - Office', description: 'Office supplies and equipment', color: '#2ECC71', budget: 17 },
      { name: 'Work food', description: 'Business meals and work-related food', color: '#F39C12', budget: 339 },
      { name: 'B - COGS', description: 'Cost of Goods Sold - direct business costs', color: '#9B59B6', budget: 275 },
      { name: 'B - Advertising', description: 'Marketing and advertising expenses', color: '#E67E22', budget: 100 },
      { name: 'B - Fuel', description: 'Business vehicle fuel costs', color: '#34495E', budget: 62 },
      { name: 'B - Auto Repair', description: 'Business vehicle maintenance and repairs', color: '#95A5A6', budget: 50 },
      { name: 'COGS - Grit Collective Co.', description: 'Cost of Goods Sold for Grit Collective', color: '#8E44AD', budget: 11 },
    ]

    // Get current month for budget
    const currentDate = new Date()
    const monthYear = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString().split('T')[0]

    // Insert business categories
    const { data: categories, error: categoriesError } = await supabase
      .from('expense_categories')
      .insert(
        businessCategories.map(cat => ({
          profile_id: profileId,
          name: cat.name,
          description: cat.description,
          color: cat.color,
          is_default: false
        }))
      )
      .select('id, name')

    if (categoriesError) {
      throw categoriesError
    }

    // Insert budgets
    const budgetInserts = categories
      .map((category, index) => ({
        profile_id: profileId,
        category_id: category.id,
        budget_amount: businessCategories[index].budget,
        month_year: monthYear
      }))
      .filter(budget => budget.budget_amount > 0)

    if (budgetInserts.length > 0) {
      const { error: budgetError } = await supabase
        .from('category_budgets')
        .insert(budgetInserts)

      if (budgetError) {
        console.error('Budget insert error:', budgetError)
        // Don't fail the whole request for budget errors
      }
    }

    return NextResponse.json({ 
      success: true, 
      categoriesCreated: categories.length,
      budgetsCreated: budgetInserts.length,
      businessName: 'Cheetah Elevation, LLC'
    })
  } catch (error) {
    console.error('Error bulk inserting business categories:', error)
    return NextResponse.json(
      { error: 'Failed to insert business categories' },
      { status: 500 }
    )
  }
}