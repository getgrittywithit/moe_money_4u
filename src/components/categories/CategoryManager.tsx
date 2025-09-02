'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  description: string
  color: string
  is_default: boolean
  created_at: string
  category_budgets?: Array<{
    budget_amount: number
    month_year: string
  }>
}

interface CategoryManagerProps {
  profileId: string
}

export default function CategoryManager({ profileId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    budgetAmount: ''
  })

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/categories?profileId=${profileId}`)
      if (!response.ok) throw new Error('Failed to fetch categories')
      
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const loadPredefinedCategories = async () => {
    if (!confirm('This will add your personal expense categories. Continue?')) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/categories/bulk-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })

      if (!response.ok) throw new Error('Failed to load predefined categories')
      
      const data = await response.json()
      toast.success(`Loaded ${data.categoriesCreated} personal categories with ${data.budgetsCreated} budgets!`)
      fetchCategories()
    } catch (error) {
      console.error('Error loading predefined categories:', error)
      toast.error('Failed to load predefined categories')
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessCategories = async () => {
    if (!confirm('This will add Cheetah Elevation, LLC business categories. Continue?')) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/categories/bulk-insert-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      })

      if (!response.ok) throw new Error('Failed to load business categories')
      
      const data = await response.json()
      toast.success(`Loaded ${data.categoriesCreated} ${data.businessName} categories with ${data.budgetsCreated} budgets!`)
      fetchCategories()
    } catch (error) {
      console.error('Error loading business categories:', error)
      toast.error('Failed to load business categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCategory ? '/api/categories' : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      
      const payload = {
        profileId,
        name: formData.name,
        description: formData.description,
        color: formData.color,
        budgetAmount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : 0,
        ...(editingCategory && { id: editingCategory.id })
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to save category')
      
      toast.success(editingCategory ? 'Category updated!' : 'Category created!')
      setIsDialogOpen(false)
      setEditingCategory(null)
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category')
    }
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return
    
    try {
      const response = await fetch(`/api/categories?id=${category.id}&profileId=${profileId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }
      
      toast.success('Category deleted!')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      budgetAmount: category.category_budgets?.[0]?.budget_amount?.toString() || ''
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      budgetAmount: ''
    })
  }

  const getCurrentMonthBudget = (category: Category) => {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    return category.category_budgets?.find(b => b.month_year.startsWith(currentMonth))?.budget_amount || 0
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading categories...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Categories</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={loadPredefinedCategories}
            disabled={loading}
          >
            Load Personal Categories
          </Button>
          <Button 
            variant="outline"
            onClick={loadBusinessCategories}
            disabled={loading}
          >
            Load Business Categories
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCategory(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description (optional)"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monthly Budget ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  {category.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                  {(category.name.startsWith('B - ') || category.name.includes('COGS') || category.name === 'Work food') && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Business</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!category.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {category.description && (
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              )}
              <div className="text-sm">
                <strong>Monthly Budget: </strong>
                ${getCurrentMonthBudget(category).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No categories yet. Create your first category!</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Category
          </Button>
        </div>
      )}
    </div>
  )
}