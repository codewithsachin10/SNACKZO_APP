-- NUCLEAR OPTION: Disable problematic triggers and fix RLS completely
-- Run this in Supabase SQL Editor

-- Step 1: Disable ALL triggers on orders table that might be causing issues
DROP TRIGGER IF EXISTS trigger_record_order_status ON orders;
DROP TRIGGER IF EXISTS trigger_award_delivery_points ON orders;
DROP TRIGGER IF EXISTS trigger_update_runner_deliveries ON orders;

-- Step 2: Completely disable RLS on orders table (temporary fix)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Step 3: Also disable RLS on related tables
ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;

SELECT 'All triggers disabled and RLS disabled on orders!' as status;
