-- Fix the schema enhancement errors

-- Drop the view temporarily to allow column type changes
DROP VIEW IF EXISTS business_expense_summary;

-- Add missing columns to expenses table (without type changes for now)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS status_text VARCHAR(20) DEFAULT 'posted',
ADD COLUMN IF NOT EXISTS parent_category TEXT,
ADD COLUMN IF NOT EXISTS excluded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS transaction_type_text VARCHAR(20) DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS account VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS recurring TEXT;

-- Create account types table (fix business_class values)
CREATE TABLE IF NOT EXISTS account_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mask VARCHAR(10) NOT NULL UNIQUE,
  account_type VARCHAR(20) NOT NULL,
  business_class business_class,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert account types with correct business_class values
INSERT INTO account_types (name, mask, account_type, business_class) VALUES
  ('Main Personal', '232', 'checking', NULL),
  ('Cheetah Checking', '230', 'checking', 'grit_collective'), -- Using existing enum value
  ('Spending Account', '4117', 'spending', NULL)
ON CONFLICT (mask) DO NOTHING;

-- Create parent categories table
CREATE TABLE IF NOT EXISTS parent_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert parent categories
INSERT INTO parent_categories (name) VALUES
  ('Food & Drink'),
  ('Shopping'),
  ('Home Essentials'),
  ('Future Needs/Saving'),
  ('Cheetah Elevation, LLC')
ON CONFLICT (name) DO NOTHING;

-- Create enums
CREATE TYPE IF NOT EXISTS expense_status AS ENUM ('pending', 'posted', 'cleared');
CREATE TYPE IF NOT EXISTS transaction_type AS ENUM ('regular', 'income', 'internal_transfer');

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_expenses_name ON expenses(name);
CREATE INDEX IF NOT EXISTS idx_expenses_status_text ON expenses(status_text);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account);
CREATE INDEX IF NOT EXISTS idx_expenses_transaction_type_text ON expenses(transaction_type_text);

-- Recreate the business expense summary view
CREATE VIEW business_expense_summary AS
SELECT 
    e.business_class,
    bc.name as business_name,
    e.profile_id,
    p.first_name,
    DATE_TRUNC('month', e.expense_date) as month,
    SUM(e.amount) as total_amount,
    COUNT(*) as expense_count
FROM expenses e
LEFT JOIN business_classes bc ON e.business_class = bc.code
JOIN profiles p ON e.profile_id = p.id
WHERE e.expense_type = 'business'
GROUP BY e.business_class, bc.name, e.profile_id, p.first_name, DATE_TRUNC('month', e.expense_date);

-- Update import function
CREATE OR REPLACE FUNCTION import_expense_from_csv(
  p_profile_id UUID,
  p_date DATE,
  p_name TEXT,
  p_amount DECIMAL(12,2),
  p_status TEXT,
  p_category_name TEXT,
  p_parent_category TEXT DEFAULT NULL,
  p_excluded BOOLEAN DEFAULT FALSE,
  p_tags TEXT[] DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'regular',
  p_account TEXT DEFAULT NULL,
  p_account_mask TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_recurring TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  category_id UUID;
  expense_id UUID;
  business_class_val business_class;
BEGIN
  -- Find or create category
  SELECT id INTO category_id 
  FROM expense_categories 
  WHERE profile_id = p_profile_id AND name = p_category_name;
  
  IF category_id IS NULL THEN
    INSERT INTO expense_categories (profile_id, name, description, color)
    VALUES (p_profile_id, p_category_name, 'Imported from CSV', '#6B7280')
    RETURNING id INTO category_id;
  END IF;
  
  -- Determine business class
  business_class_val := NULL;
  IF p_parent_category = 'Cheetah Elevation, LLC' THEN
    business_class_val := 'grit_collective'; -- Map to existing enum value
  END IF;
  
  -- Insert expense
  INSERT INTO expenses (
    profile_id, category_id, amount, description, expense_date, name,
    status_text, parent_category, excluded, tags, transaction_type_text,
    account, account_mask, note, recurring, expense_type, business_class
  ) VALUES (
    p_profile_id, category_id, p_amount, p_name, p_date, p_name,
    p_status, p_parent_category, p_excluded, p_tags, p_transaction_type,
    p_account, p_account_mask, p_note, p_recurring,
    CASE WHEN p_category_name LIKE 'B -%' THEN 'business' ELSE 'personal' END,
    business_class_val
  ) RETURNING id INTO expense_id;
  
  RETURN expense_id;
END;
$$ LANGUAGE plpgsql;