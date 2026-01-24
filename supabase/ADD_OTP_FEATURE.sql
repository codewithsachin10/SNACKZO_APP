-- Add delivery_otp to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_otp TEXT DEFAULT (floor(random() * 9000 + 1000)::text);

-- Ensure it's never null for new rows (the default handles this, but good to know)
-- For existing rows, we can backfill if needed, but active orders are what matters.
UPDATE public.orders SET delivery_otp = (floor(random() * 9000 + 1000)::text) WHERE delivery_otp IS NULL;
