-- Add missing columns to orders table to support Express Delivery and Scheduling
-- Fixes error: Could not find the 'is_express' column of 'orders' in the schema cache

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
