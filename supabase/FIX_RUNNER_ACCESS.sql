-- =====================================================
-- FIX RUNNER ACCESS (RLS & PERMISSIONS)
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Grant Permissions to 'anon' role (since Runners are not authenticated via Supabase Auth)
-- This allows the Runner Dashboard to query these tables
GRANT SELECT, UPDATE ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;
GRANT SELECT ON public.profiles TO anon;

-- 2. Add RLS Policies for Runners (Anonymous Access)

-- ORDERS: Allow runners to view and update orders assigned to anyone (needed since we don't know WHICH runner is logged in at DB level)
DROP POLICY IF EXISTS "Runners can view assigned orders" ON public.orders;
CREATE POLICY "Runners can view assigned orders"
ON public.orders FOR SELECT
TO anon
USING (runner_id IS NOT NULL);

DROP POLICY IF EXISTS "Runners can update assigned orders" ON public.orders;
CREATE POLICY "Runners can update assigned orders"
ON public.orders FOR UPDATE
TO anon
USING (runner_id IS NOT NULL);

-- ORDER ITEMS: Allow viewing items for assigned orders
DROP POLICY IF EXISTS "Runners can view order items" ON public.order_items;
CREATE POLICY "Runners can view order items"
ON public.order_items FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.runner_id IS NOT NULL
  )
);

-- PROFILES: Allow runners to view customer details (Name, Phone, etc.)
-- We open this up to 'public' (anon + auth) to ensure social features and delivery work
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
ON public.profiles FOR SELECT
USING (true);

-- 3. Fix Discounts & Flash Sales permissions for everyone (just in case)
GRANT SELECT ON public.discounts TO anon;
GRANT SELECT ON public.flash_sales TO anon;
GRANT SELECT ON public.bundle_deals TO anon;
GRANT SELECT ON public.bundle_deal_items TO anon;

-- 4. Enable Realtime for Orders (Safely)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

SELECT 'Runner permissions fixed!' as result;
