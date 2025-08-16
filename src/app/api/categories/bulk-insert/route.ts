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

    // Your custom categories with budgets
    const categoriesData = [
      // Home Essentials
      { name: 'Home Rent', description: 'Monthly rent payments', color: '#FF6B6B', budget: 2501 },
      { name: 'Utilities', description: 'Electric, water, gas, internet', color: '#FF8E6B', budget: 660 },
      
      // Food & Drink
      { name: 'Groceries', description: 'Food shopping, household essentials', color: '#4ECDC4', budget: 1301 },
      { name: 'Restaurants', description: 'Dining out, food delivery', color: '#45B7D1', budget: 218 },
      { name: 'Party Store & Bars', description: 'Alcohol, bar visits', color: '#5DADE2', budget: 52 },
      
      // Shopping
      { name: 'Tobacco', description: 'Cigarettes, tobacco products', color: '#A569BD', budget: 200 },
      { name: 'Household', description: 'Home goods, cleaning supplies', color: '#BB6BD9', budget: 350 },
      { name: 'Movies and Video Games', description: 'Entertainment purchases', color: '#96CEB4', budget: 130 },
      { name: 'Fuel', description: 'Gas for vehicles', color: '#F7DC6F', budget: 125 },
      { name: 'Beauty', description: 'Cosmetics, personal care', color: '#FF9FF3', budget: 60 },
      { name: 'Pets', description: 'Pet food, supplies, vet bills', color: '#85C1E9', budget: 52 },
      
      // Future Needs/Saving
      { name: 'Healthcare', description: 'Medical expenses, prescriptions', color: '#F8C471', budget: 600 },
      { name: 'Clothing', description: 'Clothes, shoes, accessories', color: '#82E0AA', budget: 200 },
      { name: 'Holiday/Gifts', description: 'Holiday spending, gifts', color: '#F1948A', budget: 120 },
      { name: 'Kids Cell Phones', description: 'Cell phone bills for children', color: '#AED6F1', budget: 90 },
      { name: 'Insurance', description: 'Various insurance payments', color: '#D7BDE2', budget: 70 },
      { name: 'School', description: 'School supplies, fees', color: '#A9DFBF', budget: 50 },
      
      // Other Categories
      { name: 'Bank Fees', description: 'Banking fees and charges', color: '#EC7063', budget: 0 },
      { name: 'Bank-rup', description: 'Bankruptcy related expenses', color: '#E74C3C', budget: 0 },
      { name: 'Kids Activities', description: 'Activities and sports for children', color: '#F39C12', budget: 0 },
    ]

    // Get current month for budget
    const currentDate = new Date()
    const monthYear = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString().split('T')[0]

    // Clear existing categories first (except defaults)
    await supabase
      .from('expense_categories')
      .delete()
      .eq('profile_id', profileId)
      .eq('is_default', false)

    // Insert categories
    const { data: categories, error: categoriesError } = await supabase
      .from('expense_categories')
      .insert(
        categoriesData.map(cat => ({
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
        budget_amount: categoriesData[index].budget,
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
      budgetsCreated: budgetInserts.length 
    })
  } catch (error) {
    console.error('Error bulk inserting categories:', error)
    return NextResponse.json(
      { error: 'Failed to insert categories' },
      { status: 500 }
    )
  }
}