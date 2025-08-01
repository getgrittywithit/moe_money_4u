'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

interface Expense {
  id: string
  expense_date: string
  name: string
  amount: number
  status_text: string
  parent_category: string | null
  excluded: boolean
  tags: string[] | null
  transaction_type_text: string
  account: string | null
  account_mask: string | null
  note: string | null
  recurring: string | null
  expense_type: 'personal' | 'business'
  expense_categories: {
    name: string
    color: string
  } | null
}

interface GeneralLedgerTableProps {
  profileId: string
}

export default function GeneralLedgerTable({ profileId }: GeneralLedgerTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExpenses()
  }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          expense_date,
          name,
          amount,
          status_text,
          parent_category,
          excluded,
          tags,
          transaction_type_text,
          account,
          account_mask,
          note,
          recurring,
          expense_type,
          expense_categories (name, color)
        `)
        .eq('profile_id', profileId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(expense => ({
        ...expense,
        expense_categories: Array.isArray(expense.expense_categories) 
          ? expense.expense_categories[0] || null
          : expense.expense_categories
      }))
      
      setExpenses(transformedData)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setError(error instanceof Error ? error.message : 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
    
    return isNegative ? `(${formatted})` : formatted
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    })
  }

  if (loading) {
    return <div className="text-center py-8">Loading general ledger...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Parent Category
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Excluded
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tags
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Note
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recurring
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.map((expense) => (
            <tr key={expense.id} className={expense.excluded ? 'opacity-50' : ''}>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                {formatDate(expense.expense_date)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                {expense.name}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                <span className={expense.amount < 0 ? 'text-green-600' : 'text-gray-900'}>
                  {formatCurrency(expense.amount)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge 
                  variant={expense.status_text === 'posted' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {expense.status_text}
                </Badge>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: expense.expense_categories?.color || '#6B7280',
                    color: expense.expense_categories?.color || '#6B7280'
                  }}
                  className="text-xs"
                >
                  {expense.expense_categories?.name || 'Uncategorized'}
                </Badge>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {expense.parent_category || '-'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                {expense.excluded ? '✓' : '-'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {expense.tags?.join(', ') || '-'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge 
                  variant={expense.transaction_type_text === 'income' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {expense.transaction_type_text}
                </Badge>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {expense.account} {expense.account_mask && `(${expense.account_mask})`}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {expense.note || '-'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {expense.recurring || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {expenses.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No expenses found. Add your first expense to get started.</p>
        </div>
      )}
      
      <div className="bg-gray-50 px-4 py-3 sm:px-6">
        <p className="text-sm text-gray-700">
          Showing {expenses.length} transactions
        </p>
      </div>
    </div>
  )
}