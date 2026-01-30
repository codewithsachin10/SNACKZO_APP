-- Ensure permissions are explicitly granted
GRANT ALL ON public.promo_codes TO postgres;
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.promo_codes TO authenticated;

-- Reset RLS policies completely
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything with promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins Full Access" ON public.promo_codes;
DROP POLICY IF EXISTS "Public Read Active" ON public.promo_codes;

-- 1. Admin Full Access Policy
-- Direct subquery, relying on "Users can view their own roles" policy on user_roles table.
CREATE POLICY "Admins Full Access"
ON public.promo_codes
FOR ALL
TO authenticated
USING (
    (SELECT count(*) FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') > 0
);

-- 2. General Read Access (Simplified for debugging/stability)
-- Users verify codes via exact match in code, so open read isn't a huge risk if we want to unblock.
-- But let's keep it slightly filtered for hygiene.
CREATE POLICY "Public Read Active"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (
    is_active = true
);
