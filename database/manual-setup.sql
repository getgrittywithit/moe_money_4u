-- Manual setup script for receipt processing
-- Run this in Supabase SQL Editor

-- Step 1: Add receipt processing columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES expenses(id),
ADD COLUMN IF NOT EXISTS is_split_transaction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT,
ADD COLUMN IF NOT EXISTS split_line_items JSONB,
ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_parent_transaction ON expenses(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_split ON expenses(is_split_transaction) WHERE is_split_transaction = TRUE;

-- Step 3: Create receipt processing jobs table
CREATE TABLE IF NOT EXISTS receipt_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    receipt_image_url TEXT NOT NULL,
    ocr_text TEXT,
    ai_suggestions JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ
);

-- Step 4: Create AI feedback table for learning
CREATE TABLE IF NOT EXISTS ai_categorization_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    expense_id UUID NOT NULL REFERENCES expenses(id),
    ai_suggested_category TEXT NOT NULL,
    user_chosen_category TEXT NOT NULL,
    ai_confidence_score INTEGER NOT NULL,
    merchant_name TEXT,
    transaction_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Enable RLS on new tables
ALTER TABLE receipt_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_categorization_feedback ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for receipt_processing_jobs
CREATE POLICY IF NOT EXISTS "Users can view own receipt jobs" ON receipt_processing_jobs
    FOR SELECT USING (profile_id = get_current_profile_id());

CREATE POLICY IF NOT EXISTS "Users can insert own receipt jobs" ON receipt_processing_jobs
    FOR INSERT WITH CHECK (profile_id = get_current_profile_id());

CREATE POLICY IF NOT EXISTS "Users can update own receipt jobs" ON receipt_processing_jobs
    FOR UPDATE USING (profile_id = get_current_profile_id());

-- Step 7: Create RLS policies for ai_categorization_feedback  
CREATE POLICY IF NOT EXISTS "Users can view own AI feedback" ON ai_categorization_feedback
    FOR SELECT USING (profile_id = get_current_profile_id());

CREATE POLICY IF NOT EXISTS "Users can insert own AI feedback" ON ai_categorization_feedback
    FOR INSERT WITH CHECK (profile_id = get_current_profile_id());

-- Step 8: Create storage bucket (do this in Supabase Dashboard > Storage)
-- Create a new bucket called "receipts" with public access disabled

-- Step 9: Create storage policies (run after creating bucket)
CREATE POLICY IF NOT EXISTS "Users can upload their own receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY IF NOT EXISTS "Users can view their own receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY IF NOT EXISTS "Users can update their own receipts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY IF NOT EXISTS "Users can delete their own receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Verification queries to check if everything was created
SELECT 'expenses columns' as check_type, 
       column_name 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND column_name IN ('parent_transaction_id', 'is_split_transaction', 'receipt_image_url', 'split_line_items', 'ai_confidence_score');

SELECT 'receipt_processing_jobs table' as check_type, 
       COUNT(*) as count 
FROM receipt_processing_jobs;

SELECT 'ai_categorization_feedback table' as check_type, 
       COUNT(*) as count 
FROM ai_categorization_feedback;