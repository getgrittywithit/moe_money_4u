-- Expense Tracking Tables for Moe Money 4U
-- Integrates with existing family management database

-- Categories table for expense categorization
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- matches profile color theme pattern
  rules JSONB, -- AI categorization rules/keywords
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table for tracking all expenses
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  merchant VARCHAR(255),
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50), -- credit_card, debit_card, cash, etc.
  csv_import_id UUID, -- to track which CSV import this came from
  ai_categorized BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CSV Imports table to track uploaded files
CREATE TABLE csv_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- User expense preferences (extends existing profiles)
CREATE TABLE expense_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  currency VARCHAR(3) DEFAULT 'USD',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  default_category_id UUID REFERENCES expense_categories(id),
  ai_auto_categorize BOOLEAN DEFAULT TRUE,
  budget_alerts_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly budgets per category
CREATE TABLE category_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
  budget_amount DECIMAL(12,2) NOT NULL,
  month_year DATE NOT NULL, -- first day of the month
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, category_id, month_year)
);

-- Indexes for performance
CREATE INDEX idx_expenses_profile_id ON expenses(profile_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expense_categories_profile_id ON expense_categories(profile_id);
CREATE INDEX idx_csv_imports_profile_id ON csv_imports(profile_id);
CREATE INDEX idx_category_budgets_profile_month ON category_budgets(profile_id, month_year);

-- Row Level Security Policies
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- Expense Categories policies (users can manage their own categories)
CREATE POLICY "Users can view their own expense categories" ON expense_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_categories.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own expense categories" ON expense_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_categories.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own expense categories" ON expense_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_categories.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own expense categories" ON expense_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_categories.profile_id AND profiles.user_id = auth.uid())
  );

-- Expenses policies (similar pattern)
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expenses.profile_id AND profiles.user_id = auth.uid())
  );

-- CSV imports policies
CREATE POLICY "Users can view their own csv imports" ON csv_imports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = csv_imports.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own csv imports" ON csv_imports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = csv_imports.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own csv imports" ON csv_imports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = csv_imports.profile_id AND profiles.user_id = auth.uid())
  );

-- Expense preferences policies
CREATE POLICY "Users can view their own expense preferences" ON expense_preferences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_preferences.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own expense preferences" ON expense_preferences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_preferences.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own expense preferences" ON expense_preferences
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = expense_preferences.profile_id AND profiles.user_id = auth.uid())
  );

-- Category budgets policies
CREATE POLICY "Users can view their own category budgets" ON category_budgets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = category_budgets.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own category budgets" ON category_budgets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = category_budgets.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own category budgets" ON category_budgets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = category_budgets.profile_id AND profiles.user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own category budgets" ON category_budgets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = category_budgets.profile_id AND profiles.user_id = auth.uid())
  );

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_expense_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION update_expense_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_expense_updated_at_column();

CREATE TRIGGER update_expense_preferences_updated_at BEFORE UPDATE ON expense_preferences
    FOR EACH ROW EXECUTE FUNCTION update_expense_updated_at_column();

CREATE TRIGGER update_category_budgets_updated_at BEFORE UPDATE ON category_budgets
    FOR EACH ROW EXECUTE FUNCTION update_expense_updated_at_column();

-- Function to create default expense categories for a profile
CREATE OR REPLACE FUNCTION create_default_expense_categories(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO expense_categories (profile_id, name, description, color, is_default) VALUES
    (p_profile_id, 'Food & Dining', 'Restaurants, groceries, food delivery', '#FF6B6B', TRUE),
    (p_profile_id, 'Transportation', 'Gas, public transit, rideshare, parking', '#4ECDC4', TRUE),
    (p_profile_id, 'Shopping', 'Retail purchases, online shopping', '#45B7D1', TRUE),
    (p_profile_id, 'Entertainment', 'Movies, concerts, streaming services', '#96CEB4', TRUE),
    (p_profile_id, 'Bills & Utilities', 'Rent, electricity, water, phone', '#FECA57', TRUE),
    (p_profile_id, 'Healthcare', 'Medical expenses, pharmacy, insurance', '#FF9FF3', TRUE),
    (p_profile_id, 'Allowances', 'Kid allowances and payments', '#A8E6CF', TRUE),
    (p_profile_id, 'Other', 'Miscellaneous expenses', '#54A0FF', TRUE);
  
  -- Create default expense preferences
  INSERT INTO expense_preferences (profile_id) VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
END;
$$ language 'plpgsql';

-- Create default categories for existing profiles
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id FROM profiles LOOP
        PERFORM create_default_expense_categories(profile_record.id);
    END LOOP;
END $$;