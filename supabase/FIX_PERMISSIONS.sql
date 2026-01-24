-- =====================================================
-- FIX PERMISSIONS & GRANTS
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant permissions on ALL tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Grant permissions on ALL sequences (for auto-increment IDs if any)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. Ensure RLS is enabled on all tables (Safety check)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 5. Fix specific public access policies (Allow guests to see products)
-- First, drop restrictive policies if they exist
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- Then recreate them allowing 'anon' as well
CREATE POLICY "Anyone can view products" 
ON public.products FOR SELECT 
TO public -- 'public' includes both anon and authenticated
USING (true);

CREATE POLICY "Anyone can view categories" 
ON public.categories FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Anyone can view reviews" 
ON public.reviews FOR SELECT 
TO public 
USING (true);

-- 6. Verify and Fix Profiles Policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

-- 7. Fix Notifications Policy
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- DONE
SELECT 'Permissions and Grants have been fixed!' as status;
