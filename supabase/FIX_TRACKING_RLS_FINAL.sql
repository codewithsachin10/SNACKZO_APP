-- ========================================
-- RLS & PERMISSIONS FIX (ROBUST VERSION)
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. FIX RLS POLICIES
-- Order Status History
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their order status history" ON public.order_status_history;
CREATE POLICY "Users can view their order status history" ON public.order_status_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid()) OR 
        (auth.role() = 'authenticated')
    );

-- Runner Locations
ALTER TABLE IF EXISTS public.runner_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read runner locations" ON public.runner_locations;
CREATE POLICY "Anyone can read runner locations" ON public.runner_locations 
    FOR SELECT USING (true);

-- Delivery Estimates
ALTER TABLE IF EXISTS public.delivery_estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their delivery estimates" ON public.delivery_estimates;
CREATE POLICY "Users can view their delivery estimates" ON public.delivery_estimates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid()) OR
        (auth.role() = 'authenticated')
    );

-- 2. ENABLE REALTIME SAFELY
-- This block adds tables only if they aren't already in the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'order_status_history'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'runner_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.runner_locations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'delivery_estimates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_estimates;
    END IF;
END $$;

-- 3. GRANT NECESSARY PERMISSIONS
-- Essential for resolving the 403 Forbidden errors
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.runner_locations TO authenticated;
GRANT SELECT ON public.delivery_estimates TO authenticated;
GRANT SELECT ON public.delivery_proofs TO authenticated;
GRANT SELECT ON public.delivery_instructions TO authenticated;
GRANT SELECT ON public.runners TO authenticated;
GRANT SELECT ON public.orders TO authenticated;

-- Confirmation
SELECT 'Tracking permissions and Realtime fixed successfully!' as status;
