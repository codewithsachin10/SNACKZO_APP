-- ==============================================
-- FIX QR CODE PERMISSIONS & TABLES
-- Run this entire script in Supabase SQL Editor
-- ==============================================

-- 1. Drop existing policies to prevent "Already Exists" errors
DROP POLICY IF EXISTS "Admins can manage all qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "Public can read qr_codes" ON public.qr_codes;

-- 2. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'static', -- 'static', 'dynamic', 'temporary'
    settings JSONB DEFAULT '{}'::jsonb,
    scan_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Force Enable Row Level Security
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Admin Policy (Power to the Admins!)
CREATE POLICY "Admins can manage all qr_codes" ON public.qr_codes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Re-create Public Policy (Everyone can scan)
CREATE POLICY "Public can read qr_codes" ON public.qr_codes
    FOR SELECT
    TO public
    USING (true);

-- 6. GRANT PERMISSIONS (Fixes the 403 Forbidden Error)
-- This ensures the authenticated role actually has 'rights' to the table
GRANT ALL ON public.qr_codes TO authenticated;
GRANT SELECT ON public.qr_codes TO anon;
GRANT SELECT ON public.qr_codes TO service_role;

-- 7. Ensure your User Role is readable (Crucial fix for RLS recursion)
-- We safeguard this with a drop first
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 8. Helper Function to count scans
CREATE OR REPLACE FUNCTION increment_qr_scan(qr_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.qr_codes
  SET scan_count = scan_count + 1
  WHERE id = qr_id;
END;
$$;
