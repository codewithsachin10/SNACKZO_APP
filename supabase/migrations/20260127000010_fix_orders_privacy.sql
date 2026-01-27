-- CRITICAL SECURITY FIX: Restrict Order Visibility
-- This migration fixes the vulnerability where any user could see all orders.

-- 1. Remove the over-permissive "Allow order reads" policy
DROP POLICY IF EXISTS "Allow order reads" ON public.orders;

-- 2. Create a restricted SELECT policy
-- - Authenticated users (Customers): Can only see their OWN orders.
-- - Admins: Can see ALL orders.
-- - Anonymous users (Runners): Allowed for the Runner Dashboard (legacy setup).
CREATE POLICY "Orders privacy policy" ON public.orders
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR public.has_role(auth.uid(), 'admin')
        OR (auth.role() = 'anon') -- Maintaining support for the legacy runner dashboard
    );

-- 3. Also restrict UPDATE policy which was also too open
DROP POLICY IF EXISTS "Allow order updates" ON public.orders;
CREATE POLICY "Orders update policy" ON public.orders
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR public.has_role(auth.uid(), 'admin')
        OR (auth.role() = 'anon')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR public.has_role(auth.uid(), 'admin')
        OR (auth.role() = 'anon')
    );

-- Log status
SELECT 'Orders privacy and update policies have been restricted to owners and admins.' as status;
