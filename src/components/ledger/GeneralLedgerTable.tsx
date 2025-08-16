'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Expense {
  id: string
  expense_date: string
  name: string
  amount: number
  status_text: string
  business_class: string | null
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
  refreshTrigger?: number
}

export default function GeneralLedgerTable({ profileId, refreshTrigger }: GeneralLedgerTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [newExpense, setNewExpense] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    name: '',
    amount: '',
    status_text: 'pending',
    business_class: '',
    tags: '',
    transaction_type_text: 'regular',
    account: '',
    account_mask: '',
    note: '',
    recurring: ''
  })

  useEffect(() => {
    fetchExpenses()
  }, [profileId, refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

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
          business_class,
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

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount) {
      alert('Please fill in Name and Amount')
      return
    }

    try {
      const amount = parseFloat(newExpense.amount)
      if (isNaN(amount)) {
        alert('Please enter a valid amount')
        return
      }

      const { error } = await supabase
        .from('expenses')
        .insert({
          profile_id: profileId,
          expense_date: newExpense.expense_date,
          name: newExpense.name,
          amount: amount,
          description: newExpense.name,
          status_text: newExpense.status_text,
          business_class: newExpense.business_class || null,
          tags: newExpense.tags ? newExpense.tags.split(',').map(t => t.trim()) : null,
          transaction_type_text: newExpense.transaction_type_text,
          account: newExpense.account || null,
          account_mask: newExpense.account_mask || null,
          note: newExpense.note || null,
          recurring: newExpense.recurring || null,
          expense_type: newExpense.business_class ? 'business' : 'personal'
        })
        .select()

      if (error) throw error

      // Reset form and refresh data
      setNewExpense({
        expense_date: new Date().toISOString().split('T')[0],
        name: '',
        amount: '',
        status_text: 'pending',
        business_class: '',
        tags: '',
        transaction_type_text: 'regular',
        account: '',
        account_mask: '',
        note: '',
        recurring: ''
      })
      setIsAddingRow(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense')
    }
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Transactions</h3>
        <Button
          onClick={() => setIsAddingRow(true)}
          disabled={isAddingRow}
          size="sm"
        >
          Add Expense
        </Button>
      </div>
      
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
              Class
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
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isAddingRow && (
            <tr className="bg-blue-50">
              <td className="px-2 py-2">
                <Input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, expense_date: e.target.value }))}
                  className="text-xs h-8"
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="Name/Merchant"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xs h-8"
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-xs h-8 text-right"
                />
              </td>
              <td className="px-2 py-2">
                <select
                  value={newExpense.status_text}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, status_text: e.target.value }))}
                  className="text-xs h-8 w-full border border-gray-300 rounded"
                >
                  <option value="pending">Pending</option>
                  <option value="posted">Posted</option>
                  <option value="cleared">Cleared</option>
                </select>
              </td>
              <td className="px-2 py-2">
                <span className="text-xs text-gray-500">Auto</span>
              </td>
              <td className="px-2 py-2">
                <select
                  value={newExpense.business_class}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, business_class: e.target.value }))}
                  className="text-xs h-8 w-full border border-gray-300 rounded"
                >
                  <option value="">Personal</option>
                  <option value="triton">Triton</option>
                  <option value="grit_collective">Grit Collective</option>
                  <option value="mermaid">Mermaid</option>
                  <option value="pantrypal_pro">PantryPal Pro</option>
                  <option value="boernes_handy_hub">Boerne&apos;s Handy Hub</option>
                </select>
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="tag1, tag2"
                  value={newExpense.tags}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, tags: e.target.value }))}
                  className="text-xs h-8"
                />
              </td>
              <td className="px-2 py-2">
                <select
                  value={newExpense.transaction_type_text}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, transaction_type_text: e.target.value }))}
                  className="text-xs h-8 w-full border border-gray-300 rounded"
                >
                  <option value="regular">Regular</option>
                  <option value="income">Income</option>
                  <option value="internal_transfer">Transfer</option>
                </select>
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <Input
                    placeholder="Account"
                    value={newExpense.account}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, account: e.target.value }))}
                    className="text-xs h-8 w-20"
                  />
                  <Input
                    placeholder="Mask"
                    value={newExpense.account_mask}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, account_mask: e.target.value }))}
                    className="text-xs h-8 w-16"
                  />
                </div>
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="Note"
                  value={newExpense.note}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, note: e.target.value }))}
                  className="text-xs h-8"
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="Recurring"
                  value={newExpense.recurring}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, recurring: e.target.value }))}
                  className="text-xs h-8"
                />
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <Button onClick={handleAddExpense} size="sm" className="h-6 px-2 text-xs">
                    Save
                  </Button>
                  <Button 
                    onClick={() => setIsAddingRow(false)} 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </td>
            </tr>
          )}
          {expenses.map((expense) => (
            <tr key={expense.id}>
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
                {expense.business_class ? (
                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-800">
                    {expense.business_class.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ) : '-'}
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
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                {/* Edit/Delete actions can go here later */}
                -
              </td>
            </tr>
          ))}
          
          {expenses.length === 0 && !isAddingRow && (
            <tr>
              <td colSpan={12} className="text-center py-8">
                <p className="text-gray-500">No expenses found. Add your first expense to get started.</p>
              </td>
            </tr>
          )}
          
          <tr className="bg-gray-50">
            <td colSpan={12} className="px-4 py-3 text-sm text-gray-700">
              Showing {expenses.length} transactions
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  )
}