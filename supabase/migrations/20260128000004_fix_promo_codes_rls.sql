-- Create promo_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    min_order_amount NUMERIC DEFAULT 0,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Admins can do everything with promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can view active promo codes" ON public.promo_codes;

-- Admin Policy (Full Access)
CREATE POLICY "Admins can do everything with promo codes"
ON public.promo_codes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- User Policy (Read Access for valid codes)
CREATE POLICY "Users can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (
    is_active = true 
    AND now() BETWEEN start_date AND end_date
);
