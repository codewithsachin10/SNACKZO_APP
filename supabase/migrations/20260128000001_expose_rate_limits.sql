-- ENABLE ADMIN ACCESS TO RATE LIMIT TABLE
-- This allows the Security Dashboard to show "Active Locks"

-- 1. Enable RLS (already enabled, but good to be safe)
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policy
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limit_tracking;

-- 3. Allow Admins to View Logged Attempts
CREATE POLICY "Admins can view rate limits"
    ON public.rate_limit_tracking
    FOR SELECT
    USING (public.is_admin());

-- 4. Grant Select Permission to Authenticated Users (Policy restricts to Admin only)
GRANT SELECT ON public.rate_limit_tracking TO authenticated;

SELECT 'Rate Limit visibility enabled for Admins' as status;
