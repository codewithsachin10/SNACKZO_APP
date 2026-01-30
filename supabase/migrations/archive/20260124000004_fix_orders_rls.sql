-- SIMPLE FIX: Allow anonymous users to update orders
-- This is needed because the Runner Dashboard uses phone-based auth, not Supabase auth

-- Drop existing restrictive policies and add permissive ones
DROP POLICY IF EXISTS "Runners can update order status" ON orders;
DROP POLICY IF EXISTS "Users can update their orders" ON orders;

-- Allow all updates to orders (the app handles authorization)
CREATE POLICY "Allow order updates" ON orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- Also ensure select works
DROP POLICY IF EXISTS "Allow order reads" ON orders;
CREATE POLICY "Allow order reads" ON orders
    FOR SELECT USING (true);

-- Ensure insert works for new orders
DROP POLICY IF EXISTS "Allow order inserts" ON orders;
CREATE POLICY "Allow order inserts" ON orders
    FOR INSERT WITH CHECK (true);

SELECT 'Orders RLS fix applied!' as status;
