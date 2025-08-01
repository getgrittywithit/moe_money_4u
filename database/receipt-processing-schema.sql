-- Receipt Processing Database Schema Updates
-- Add fields to support AI receipt processing and transaction splitting

-- Add receipt processing fields to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES expenses(id),
ADD COLUMN IF NOT EXISTS is_split_transaction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT,
ADD COLUMN IF NOT EXISTS split_line_items JSONB,
ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100);

-- Create index for faster parent-child transaction queries
CREATE INDEX IF NOT EXISTS idx_expenses_parent_transaction ON expenses(parent_transaction_id);

-- Create index for split transaction queries
CREATE INDEX IF NOT EXISTS idx_expenses_is_split ON expenses(is_split_transaction) WHERE is_split_transaction = TRUE;

-- Create table for storing receipt processing jobs
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

-- RLS policies for receipt processing jobs
ALTER TABLE receipt_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipt jobs" ON receipt_processing_jobs
    FOR SELECT USING (profile_id = get_current_profile_id());

CREATE POLICY "Users can insert own receipt jobs" ON receipt_processing_jobs
    FOR INSERT WITH CHECK (profile_id = get_current_profile_id());

CREATE POLICY "Users can update own receipt jobs" ON receipt_processing_jobs
    FOR UPDATE USING (profile_id = get_current_profile_id());

-- Create table for storing AI categorization confidence tracking
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

-- RLS policies for AI feedback
ALTER TABLE ai_categorization_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI feedback" ON ai_categorization_feedback
    FOR SELECT USING (profile_id = get_current_profile_id());

CREATE POLICY "Users can insert own AI feedback" ON ai_categorization_feedback
    FOR INSERT WITH CHECK (profile_id = get_current_profile_id());

-- Create storage bucket for receipt images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipt images
CREATE POLICY "Users can upload their own receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own receipts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipts' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to get parent transaction with all children
CREATE OR REPLACE FUNCTION get_transaction_with_splits(transaction_id UUID)
RETURNS TABLE (
    id UUID,
    expense_date DATE,
    name TEXT,
    amount DECIMAL(10,2),
    status_text TEXT,
    business_class TEXT,
    tags TEXT[],
    transaction_type_text TEXT,
    account TEXT,
    account_mask TEXT,
    note TEXT,
    recurring TEXT,
    expense_type TEXT,
    parent_transaction_id UUID,
    is_split_transaction BOOLEAN,
    receipt_image_url TEXT,
    split_line_items JSONB,
    ai_confidence_score INTEGER,
    level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE transaction_tree AS (
        -- Base case: the main transaction
        SELECT 
            e.id, e.expense_date, e.name, e.amount, e.status_text,
            e.business_class, e.tags, e.transaction_type_text,
            e.account, e.account_mask, e.note, e.recurring, e.expense_type,
            e.parent_transaction_id, e.is_split_transaction,
            e.receipt_image_url, e.split_line_items, e.ai_confidence_score,
            0 as level
        FROM expenses e
        WHERE e.id = transaction_id
        
        UNION ALL
        
        -- Recursive case: child transactions
        SELECT 
            e.id, e.expense_date, e.name, e.amount, e.status_text,
            e.business_class, e.tags, e.transaction_type_text,
            e.account, e.account_mask, e.note, e.recurring, e.expense_type,
            e.parent_transaction_id, e.is_split_transaction,
            e.receipt_image_url, e.split_line_items, e.ai_confidence_score,
            tt.level + 1
        FROM expenses e
        INNER JOIN transaction_tree tt ON e.parent_transaction_id = tt.id
    )
    SELECT * FROM transaction_tree ORDER BY level, expense_date;
END;
$$ LANGUAGE plpgsql;