'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import SummaryCards from '@/components/dashboard/SummaryCards'
import CategoriesGrid from '@/components/dashboard/CategoriesGrid'
import AppLayout from '@/components/layout/AppLayout'
import useExpenseData from '@/hooks/useExpenseData'

export default function Home() {
  const { user, profile, loading, signOut } = useAuth()
  const expenseData = useExpenseData()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Moe Money 4U</h1>
          <p className="text-gray-600 mb-8">Personal expense tracking made simple</p>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Setup Required</h1>
          <p className="text-gray-600 mb-8">
            You need to be added to a family profile to use this app.
            Please contact your family administrator.
          </p>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  if (expenseData.loading) {
    return (
      <div className="min-h-screen p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Moe Money 4U</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {profile.first_name}</span>
            <span className="text-sm text-gray-500">({profile.role})</span>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div>Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (expenseData.error) {
    return (
      <div className="min-h-screen p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Moe Money 4U</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {profile.first_name}</span>
            <span className="text-sm text-gray-500">({profile.role})</span>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </header>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold">Dashboard Error</h3>
            <p className="text-red-600 text-sm mt-1">Error: {expenseData.error}</p>
            <p className="text-gray-600 text-sm mt-2">Profile ID: {profile.id}</p>
          </div>
          <div className="text-center">
            <Button onClick={() => window.location.reload()}>
              Reload Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-6">Expense Dashboard</h2>
          
          <SummaryCards
            totalExpenses={expenseData.totalExpenses}
            monthlyTotal={expenseData.monthlyTotal}
            categoryCount={expenseData.categories.length}
            recentCount={expenseData.recentCount}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Your Categories</h3>
            <Button>
              <Link href="/expenses/add">Add Expense</Link>
            </Button>
          </div>
          
          <CategoriesGrid categories={expenseData.categories} />
        </div>

        {expenseData.expenses.length > 0 ? (
          <div>
            <h3 className="text-xl font-semibold mb-4">Recent Expenses</h3>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">
                You have {expenseData.expenses.length} expenses. View them in the General Ledger.
              </p>
              <Link href="/ledger">
                <Button className="mt-2">View General Ledger</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No expenses yet. Ready to start tracking?</p>
            <Button>
              <Link href="/expenses/add">Add Your First Expense</Link>
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
