-- QR Codes Table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'static', -- 'static', 'dynamic', 'temporary'
    settings JSONB DEFAULT '{}'::jsonb, -- Store colors, logo preference, etc.
    scan_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins can view/edit/delete all QR codes
CREATE POLICY "Admins can manage all qr_codes" ON public.qr_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Public can READ qr_codes (for redirection) ONLY specific columns usually, but full read is okay for basic logic
CREATE POLICY "Public can read qr_codes" ON public.qr_codes
    FOR SELECT
    USING (true);

-- 3. Public NO UPDATE (Scan count handled via RPC ideally)
-- If using direct update for scan count from public client, you'd need a permissive policy, but that's insecure.
-- Better to use the function below.

-- Function to safely increment scan count
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
