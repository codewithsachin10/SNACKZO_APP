-- Use the secure is_admin() function for promo_codes policy to avoid RLS recursion issues
-- This assumes public.is_admin() exists (from 20260127010000_snackzo_max_security.sql)

-- Re-create the function just in case, ensuring it is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing failing policies
DROP POLICY IF EXISTS "Admins can do everything with promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Users can view active promo codes" ON public.promo_codes;

-- Admin Policy (Uses SECURITY DEFINER function)
CREATE POLICY "Admins can do everything with promo codes"
ON public.promo_codes
FOR ALL
USING (public.is_admin());

-- User Policy (Read Access for valid codes)
CREATE POLICY "Users can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (
    is_active = true 
    AND now() BETWEEN start_date AND end_date
);
