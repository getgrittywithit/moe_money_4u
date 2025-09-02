'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContextSimple'

interface Category {
  id: string
  name: string
  color: string
  description?: string
}

interface Expense {
  id: string
  amount: number
  description: string
  expense_date: string
  category?: {
    name: string
    color: string
  }
}

interface ExpenseData {
  categories: Category[]
  expenses: Expense[]
  totalExpenses: number
  monthlyTotal: number
  recentCount: number
  loading: boolean
  error: string | null
}

export default function useExpenseData(): ExpenseData {
  const { profile } = useAuth()
  const [data, setData] = useState<ExpenseData>({
    categories: [],
    expenses: [],
    totalExpenses: 0,
    monthlyTotal: 0,
    recentCount: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!profile?.id) return

    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))

        // Fetch categories
        const { data: categories, error: categoriesError } = await supabase
          .from('expense_categories')
          .select('id, name, color, description')
          .eq('profile_id', profile.id)
          .order('name')

        if (categoriesError) throw categoriesError

        // Fetch expenses (simplified - no joins since table is likely empty)
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('id, amount, description, expense_date')
          .eq('profile_id', profile.id)
          .order('expense_date', { ascending: false })
          .limit(50)

        if (expensesError) throw expensesError

        // Calculate totals
        const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0
        
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        const monthlyTotal = expenses?.filter(exp => 
          exp.expense_date.startsWith(currentMonth)
        ).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const recentCount = expenses?.filter(exp => 
          new Date(exp.expense_date) >= weekAgo
        ).length || 0

        setData({
          categories: categories || [],
          expenses: expenses?.map(exp => ({
            id: exp.id,
            amount: Number(exp.amount),
            description: exp.description,
            expense_date: exp.expense_date,
            category: undefined // No category data for now
          })) || [],
          totalExpenses,
          monthlyTotal,
          recentCount,
          loading: false,
          error: null
        })

      } catch (error) {
        console.error('Error fetching expense data:', error)
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load data'
        }))
      }
    }

    fetchData()
  }, [profile?.id])

  return data
}