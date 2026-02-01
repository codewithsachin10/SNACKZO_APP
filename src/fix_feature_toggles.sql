-- ==============================================
-- FIX FEATURE TOGGLES (COLLISION PROOF)
-- Run this entire script in Supabase SQL Editor
-- ==============================================

-- 1. Create table if missing
CREATE TABLE IF NOT EXISTS public.feature_toggles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    category TEXT,
    icon_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Drop existing policies to prevent "Already Exists" errors
DROP POLICY IF EXISTS "Public read feature_toggles" ON public.feature_toggles;
DROP POLICY IF EXISTS "Admins manage feature_toggles" ON public.feature_toggles;

-- 3. Enable RLS
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Policies
CREATE POLICY "Public read feature_toggles" ON public.feature_toggles
    FOR SELECT
    USING (true);

CREATE POLICY "Admins manage feature_toggles" ON public.feature_toggles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Insert Default Features (Upsert)
INSERT INTO public.feature_toggles (feature_name, display_name, description, is_enabled, category, icon_key)
VALUES 
    ('demo_otp_mode', 'Demo OTP Mode', 'Show OTP in popup instead of email', false, 'developer', 'demo_otp_mode'),
    ('email_simulation', 'Email Simulation Mode', 'Log emails to console', false, 'developer', 'email_simulation'),
    ('maintenance_mode', 'System Maintenance Mode', 'Block user access', false, 'system', 'construction'),
    ('store_open_status', 'Master Store Status', 'Open/Close store', true, 'operations', 'store'),
    ('enable_delivery', 'Delivery Service', 'Toggle delivery', true, 'operations', 'truck'),
    ('auto_runner_logic', 'AI Runner Assignment', 'Auto-assign runners', true, 'operations', 'bot'),
    ('enable_cod', 'Cash on Delivery', 'Allow COD', true, 'financial', 'banknote'),
    ('enable_tips', 'Runner Tipping', 'Allow tips', true, 'financial', 'coins'),
    ('snackzopay_gateway', 'SnackzoPay Gateway', 'Payment Gateway', true, 'financial', 'wallet'),
    ('flash_deals', 'Flash Deals', 'Enable deals', true, 'growth', 'flash_deals'),
    ('referral_system', 'Referral System', 'Enable referrals', true, 'growth', 'gift'),
    ('enable_sms', 'SMS Notifications', 'Send SMS', true, 'engagement', 'sms')
ON CONFLICT (feature_name) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    icon_key = EXCLUDED.icon_key;
