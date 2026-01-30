
-- 1. Grant Access to Security Audit Logs for Admins
ALTER TABLE IF EXISTS public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins View Audit Logs" ON public.security_audit_logs;
CREATE POLICY "Admins View Audit Logs" ON public.security_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 2. Grant Access to Rate Limit Tracking for Admins
ALTER TABLE IF EXISTS public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins View Rate Limits" ON public.rate_limit_tracking;
CREATE POLICY "Admins View Rate Limits" ON public.rate_limit_tracking
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 3. Force refresh of schema cache (sometimes needed for new Foreign Keys to be picked up)
COMMENT ON TABLE public.payment_sessions IS 'Payment Sessions with Foreign Key';
