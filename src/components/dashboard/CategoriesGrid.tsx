'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Category {
  id: string
  name: string
  color: string
  description?: string
}

interface CategoriesGridProps {
  categories: Category[]
}

export default function CategoriesGrid({ categories }: CategoriesGridProps) {
  const personalCategories = categories.filter(cat => !cat.name.startsWith('B -'))
  const businessCategories = categories.filter(cat => cat.name.startsWith('B -'))

  const CategoryBadge = ({ category }: { category: Category }) => (
    <Badge 
      variant="outline" 
      className="text-xs"
      style={{ 
        borderColor: category.color,
        color: category.color,
        backgroundColor: `${category.color}10`
      }}
    >
      {category.name}
    </Badge>
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Categories ({personalCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {personalCategories.map((category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Categories ({businessCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {businessCategories.map((category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}