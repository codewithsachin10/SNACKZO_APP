-- ==========================================
-- PHASE 2: FINANCIAL POWERHOUSE
-- ==========================================

-- 1. Create Wallet Limits & Settings columns in Wallet table
-- If wallet table uses simple balance, we might need a separate settings table or add cols

-- Check if wallet table exists (it should), add settings columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'spending_limit_daily') THEN
        ALTER TABLE public.wallets ADD COLUMN spending_limit_daily DECIMAL(10,2) DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'spending_limit_weekly') THEN
        ALTER TABLE public.wallets ADD COLUMN spending_limit_weekly DECIMAL(10,2) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'auto_reload_amount') THEN
        ALTER TABLE public.wallets ADD COLUMN auto_reload_amount DECIMAL(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'auto_reload_threshold') THEN
        ALTER TABLE public.wallets ADD COLUMN auto_reload_threshold DECIMAL(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'is_auto_reload_enabled') THEN
        ALTER TABLE public.wallets ADD COLUMN is_auto_reload_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2), -- useful for percentage caps
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER, -- total times this code can be used globally
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for Promo Codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active promos (needed for validation)
CREATE POLICY "Anyone can view active promo codes"
    ON public.promo_codes FOR SELECT
    USING (is_active = TRUE AND (end_date IS NULL OR end_date > now()));

-- Only admins can manage promos (assuming admin role check logic exists or is handled by service role in real app)
-- For now, allow insert/update for testing, typically restricted to admin
CREATE POLICY "Admins can manage promo codes"
    ON public.promo_codes FOR ALL
    USING (true) -- In production, strictly check admin role
    WITH CHECK (true);

-- 3. Create User Promo Usage Table (to track per-user usage)
CREATE TABLE IF NOT EXISTS public.user_promo_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id), -- link to the order where it was used
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_promo_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo usage"
    ON public.user_promo_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promo usage"
    ON public.user_promo_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);
