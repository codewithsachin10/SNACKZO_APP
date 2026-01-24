-- FINAL PERMISSION FIX
-- 1. Disable RLS
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.runners DISABLE ROW LEVEL SECURITY;

-- 2. Grant explicit permissions to the API roles
GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.runners TO anon, authenticated, service_role;
GRANT ALL ON public.order_items TO anon, authenticated, service_role;

-- 3. Verify data exists (Run this part separately looking at the "Results" tab in Supabase)
SELECT count(*) as total_orders FROM public.orders;
