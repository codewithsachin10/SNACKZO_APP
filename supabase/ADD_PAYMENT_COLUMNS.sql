-- Add payment details to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'; -- paid, pending, failed

-- Reload the schema cache so the API knows about the new columns immediately
NOTIFY pgrst, 'reload schema';
