# Frontend Integration Plan - Moe Money 4U

## Current Status ✅

### What's Working:
- ✅ Build compiles successfully
- ✅ Basic authentication setup (login/signup page)
- ✅ AuthContext with user state management
- ✅ Protected routes (redirects to login if not authenticated)
- ✅ Supabase client configuration
- ✅ Basic UI components (Button, Card, Input, etc.)

### What's Missing:
- ❌ Environment variables (still have placeholder values)
- ❌ Profile creation after auth signup
- ❌ Expense tracking UI components
- ❌ CSV upload functionality
- ❌ Category management
- ❌ Dashboard with actual data
- ❌ Business class selection
- ❌ AI categorization integration

## Issues to Fix First

### 1. Environment Variables
**Problem**: `.env.local` has placeholder values
**Solution**: Update with actual Supabase API keys
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
```

### 2. Profile Integration
**Problem**: Auth creates `auth.users` but we need `profiles` for our expense system
**Solution**: Create profile after successful signup or login

### 3. Database Schema Mismatch
**Problem**: Frontend assumes simple user-based auth, but database uses profile-based structure
**Solution**: Update AuthContext to handle profiles

## Implementation Plan

### Phase 1: Fix Authentication Integration (Priority: HIGH)
1. **Update AuthContext** to work with profiles table
2. **Create profile** after signup
3. **Handle existing profiles** for existing users
4. **Fix environment variables**

### Phase 2: Core Expense Features (Priority: HIGH)
1. **Dashboard with real data**
   - Expense summary cards
   - Recent expenses list
   - Category breakdown chart
2. **Add Expense Form**
   - Amount, description, date
   - Category dropdown (personal vs business)
   - Business class selection (when business)
3. **Expense List View**
   - Filter by date, category, type
   - Edit/delete functionality

### Phase 3: Category Management (Priority: MEDIUM)
1. **Category List View**
   - Show all categories with colors
   - Personal vs business categories
2. **Add/Edit Categories**
   - Color picker
   - Category rules for AI

### Phase 4: CSV Upload (Priority: MEDIUM)
1. **Upload Component**
   - Drag & drop or file picker
   - Preview CSV data
2. **Processing Screen**
   - Progress indicator
   - Error handling
3. **AI Categorization**
   - Auto-categorize during import
   - Manual review/override

### Phase 5: Advanced Features (Priority: LOW)
1. **Budget Management**
   - Set monthly budgets per category
   - Budget vs actual tracking
2. **Reports & Analytics**
   - Monthly/yearly summaries
   - Business expense reports by class
3. **Settings**
   - Preferences
   - Export data

## File Structure Plan

```
src/
├── app/
│   ├── dashboard/           # Main dashboard
│   ├── expenses/
│   │   ├── page.tsx        # Expense list
│   │   ├── add/page.tsx    # Add expense
│   │   └── [id]/page.tsx   # Edit expense
│   ├── categories/
│   │   ├── page.tsx        # Category management
│   │   └── add/page.tsx    # Add category
│   ├── upload/page.tsx     # CSV upload
│   └── settings/page.tsx   # User settings
├── components/
│   ├── expense/
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   └── ExpenseCard.tsx
│   ├── category/
│   │   ├── CategorySelector.tsx
│   │   └── CategoryBadge.tsx
│   ├── upload/
│   │   └── CSVUploader.tsx
│   └── dashboard/
│       ├── SummaryCards.tsx
│       └── ExpenseChart.tsx
├── hooks/
│   ├── useExpenses.ts
│   ├── useCategories.ts
│   └── useProfile.ts
└── types/
    └── database.ts         # TypeScript types
```

## API Routes Needed

```typescript
/api/
├── expenses/
│   ├── GET /api/expenses    # List expenses
│   ├── POST /api/expenses   # Create expense
│   └── PUT /api/expenses/[id] # Update expense
├── categories/
│   ├── GET /api/categories  # List categories
│   └── POST /api/categories # Create category
├── upload/
│   └── POST /api/upload/csv # Process CSV upload
└── ai/
    └── POST /api/ai/categorize # AI categorization
```

## Database Integration Points

### 1. Profile Management
```typescript
// After auth, ensure profile exists
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single()

if (!profile) {
  // Create profile
}
```

### 2. Expense Categories
```typescript
// Get categories by type
const { data: categories } = await supabase
  .from('expense_categories')
  .select('*')
  .eq('profile_id', profileId)
  .ilike('name', expenseType === 'business' ? 'B -%' : '!B -%')
```

### 3. Business Classes
```typescript
// Get business classes for dropdown
const { data: businessClasses } = await supabase
  .from('business_classes')
  .select('*')
  .eq('active', true)
```

## Next Steps
1. Fix environment variables
2. Update AuthContext for profiles
3. Build basic dashboard
4. Add expense form
5. Implement CSV upload

This plan will transform the current basic auth app into a full-featured expense tracking system that integrates with your custom database structure.