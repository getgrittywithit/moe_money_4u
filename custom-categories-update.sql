-- Custom Categories and Business Classes Update
-- This replaces default categories with your actual categories and adds business class support

-- Create expense type enum
CREATE TYPE expense_type AS ENUM ('personal', 'business');

-- Create business class enum  
CREATE TYPE business_class AS ENUM ('triton', 'grit_collective', 'mermaid', 'pantrypal_pro', 'boernes_handy_hub');

-- Add expense_type and business_class columns to expenses table
ALTER TABLE expenses 
ADD COLUMN expense_type expense_type DEFAULT 'personal',
ADD COLUMN business_class business_class DEFAULT NULL;

-- Create business classes lookup table
CREATE TABLE business_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code business_class NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert business classes
INSERT INTO business_classes (name, code, description, color) VALUES
  ('Triton', 'triton', 'Triton business operations', '#FF6B6B'),
  ('Grit Collective', 'grit_collective', 'Grit Collective business', '#4ECDC4'),
  ('Mermaid', 'mermaid', 'Mermaid business operations', '#45B7D1'),
  ('PantryPal Pro', 'pantrypal_pro', 'PantryPal Pro business', '#96CEB4'),
  ('Boerne''s Handy Hub', 'boernes_handy_hub', 'Boerne''s Handy Hub business', '#FECA57');

-- Function to replace default categories with custom ones
CREATE OR REPLACE FUNCTION replace_with_custom_categories()
RETURNS VOID AS $$
DECLARE
    profile_record RECORD;
    personal_categories TEXT[] := ARRAY[
        'Home Rent', 'Utilities', 'Other', 'Groceries', 'Restaurants', 
        'Party Store & Alcohol', 'Healthcare', 'Clothing', 'Holiday/Gifts',
        'Kids Cell Phone', 'Insurance', 'School', 'Household', 'Tobacco',
        'Movies and TV', 'Fuel', 'Beauty', 'Pets', 'Roth IRA/Crypto',
        'Bank Fees', 'Moving to 111 Dover', 'Amos - Patreon', 'Bank-rup',
        'COGS - Grit College', 'Kids Activities', 'Income', 'Work food'
    ];
    business_categories TEXT[] := ARRAY[
        'B - COGS', 'B - Advertising', 'B - Rent', 'B - Software',
        'B - Fuel', 'B - Auto Repair', 'B - Office'
    ];
    category_colors TEXT[] := ARRAY[
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', 
        '#54A0FF', '#A8E6CF', '#FFD93D', '#6BCF7F', '#FF8A80', '#82B1FF',
        '#B39DDB', '#F8BBD9', '#FFAB91', '#C5E1A5', '#FFCC02', '#80DEEA',
        '#BCAAA4', '#CFD8DC', '#F48FB1', '#CE93D8', '#90CAF9', '#81C784',
        '#FFB74D', '#A1887F', '#E57373'
    ];
    i INTEGER;
BEGIN
    -- Clear existing default categories
    DELETE FROM expense_categories WHERE is_default = TRUE;
    
    -- Add custom categories for each profile
    FOR profile_record IN SELECT id FROM profiles LOOP
        -- Add personal categories
        FOR i IN 1..array_length(personal_categories, 1) LOOP
            INSERT INTO expense_categories (profile_id, name, description, color, is_default) VALUES
            (profile_record.id, 
             personal_categories[i], 
             'Personal expense category', 
             category_colors[((i-1) % array_length(category_colors, 1)) + 1],
             FALSE);
        END LOOP;
        
        -- Add business categories  
        FOR i IN 1..array_length(business_categories, 1) LOOP
            INSERT INTO expense_categories (profile_id, name, description, color, is_default) VALUES
            (profile_record.id, 
             business_categories[i], 
             'Business expense category', 
             category_colors[((i + 20 - 1) % array_length(category_colors, 1)) + 1],
             FALSE);
        END LOOP;
    END LOOP;
END;
$$ language 'plpgsql';

-- Execute the function to replace categories
SELECT replace_with_custom_categories();

-- Add indexes for new columns
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX idx_expenses_business_class ON expenses(business_class);

-- Enable RLS on business_classes table
ALTER TABLE business_classes ENABLE ROW LEVEL SECURITY;

-- Business classes policies (everyone can view, only authenticated users can manage)
CREATE POLICY "Everyone can view business classes" ON business_classes
  FOR SELECT USING (true);

-- Create view for business expense summary by class
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
JOIN business_classes bc ON e.business_class = bc.code
JOIN profiles p ON e.profile_id = p.id
WHERE e.expense_type = 'business'
GROUP BY e.business_class, bc.name, e.profile_id, p.first_name, DATE_TRUNC('month', e.expense_date);

-- Enable RLS on the view
ALTER VIEW business_expense_summary SET (security_invoker = true);

-- Update expense preferences to handle business vs personal
ALTER TABLE expense_preferences 
ADD COLUMN default_business_category_id UUID REFERENCES expense_categories(id),
ADD COLUMN separate_business_budgets BOOLEAN DEFAULT TRUE;

-- Function to get appropriate categories based on expense type
CREATE OR REPLACE FUNCTION get_categories_for_expense_type(p_profile_id UUID, p_expense_type expense_type)
RETURNS TABLE(id UUID, name VARCHAR, color VARCHAR) AS $$
BEGIN
    IF p_expense_type = 'business' THEN
        RETURN QUERY
        SELECT ec.id, ec.name, ec.color
        FROM expense_categories ec
        WHERE ec.profile_id = p_profile_id 
        AND ec.name LIKE 'B -%'
        ORDER BY ec.name;
    ELSE
        RETURN QUERY
        SELECT ec.id, ec.name, ec.color
        FROM expense_categories ec
        WHERE ec.profile_id = p_profile_id 
        AND ec.name NOT LIKE 'B -%'
        ORDER BY ec.name;
    END IF;
END;
$$ language 'plpgsql';