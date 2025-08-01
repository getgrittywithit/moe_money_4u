-- Enhance expense table to match general ledger structure
-- Based on your July expense data

-- Add missing columns to expenses table
ALTER TABLE expenses 
ADD COLUMN name TEXT, -- transaction name/merchant
ADD COLUMN status VARCHAR(20) DEFAULT 'posted', -- pending, posted
ADD COLUMN parent_category TEXT, -- parent category (Food & Drink, etc.)
ADD COLUMN excluded BOOLEAN DEFAULT FALSE,
ADD COLUMN tags TEXT[],
ADD COLUMN transaction_type VARCHAR(20) DEFAULT 'regular', -- regular, income, internal transfer
ADD COLUMN account VARCHAR(50), -- Main Personal, Cheetah Checking, etc.
ADD COLUMN account_mask VARCHAR(10), -- 232, 230, 4117, etc.
ADD COLUMN note TEXT,
ADD COLUMN recurring TEXT;

-- Update existing amount column to handle negative values (income)
ALTER TABLE expenses ALTER COLUMN amount TYPE DECIMAL(12,2);

-- Create account types table
CREATE TABLE account_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mask VARCHAR(10) NOT NULL UNIQUE,
  account_type VARCHAR(20) NOT NULL, -- checking, savings, spending, etc.
  business_class business_class,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your account types based on the data
INSERT INTO account_types (name, mask, account_type, business_class) VALUES
  ('Main Personal', '232', 'checking', NULL),
  ('Cheetah Checking', '230', 'checking', 'cheetah_elevation'),
  ('Spending Account', '4117', 'spending', NULL);

-- Create transaction types enum
CREATE TYPE transaction_type AS ENUM ('regular', 'income', 'internal_transfer');

-- Update the transaction_type column to use enum
ALTER TABLE expenses ALTER COLUMN transaction_type TYPE transaction_type USING transaction_type::transaction_type;

-- Create parent categories table
CREATE TABLE parent_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert parent categories from your data
INSERT INTO parent_categories (name) VALUES
  ('Food & Drink'),
  ('Shopping'),
  ('Home Essentials'),
  ('Future Needs/Saving'),
  ('Cheetah Elevation, LLC');

-- Create status enum
CREATE TYPE expense_status AS ENUM ('pending', 'posted', 'cleared');

-- Update status column to use enum
ALTER TABLE expenses ALTER COLUMN status TYPE expense_status USING status::expense_status;

-- Add indexes for new columns
CREATE INDEX idx_expenses_name ON expenses(name);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_account ON expenses(account);
CREATE INDEX idx_expenses_transaction_type ON expenses(transaction_type);

-- Function to import CSV data
CREATE OR REPLACE FUNCTION import_expense_from_csv(
  p_profile_id UUID,
  p_date DATE,
  p_name TEXT,
  p_amount DECIMAL(12,2),
  p_status expense_status,
  p_category_name TEXT,
  p_parent_category TEXT DEFAULT NULL,
  p_excluded BOOLEAN DEFAULT FALSE,
  p_tags TEXT[] DEFAULT NULL,
  p_transaction_type transaction_type DEFAULT 'regular',
  p_account TEXT DEFAULT NULL,
  p_account_mask TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_recurring TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  category_id UUID;
  expense_id UUID;
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
  
  -- Insert expense
  INSERT INTO expenses (
    profile_id, category_id, amount, description, expense_date, name,
    status, parent_category, excluded, tags, transaction_type,
    account, account_mask, note, recurring, expense_type, business_class
  ) VALUES (
    p_profile_id, category_id, p_amount, p_name, p_date, p_name,
    p_status, p_parent_category, p_excluded, p_tags, p_transaction_type,
    p_account, p_account_mask, p_note, p_recurring,
    CASE WHEN p_category_name LIKE 'B -%' THEN 'business' ELSE 'personal' END,
    CASE WHEN p_parent_category = 'Cheetah Elevation, LLC' THEN 'cheetah_elevation' ELSE NULL END
  ) RETURNING id INTO expense_id;
  
  RETURN expense_id;
END;
$$ LANGUAGE plpgsql;