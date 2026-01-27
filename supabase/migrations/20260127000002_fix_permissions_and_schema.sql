-- Force enable RLS and ensure policies exist for All new tables
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own spin history" ON public.spin_history;
CREATE POLICY "Users can view own spin history" ON public.spin_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own spin history" ON public.spin_history;
CREATE POLICY "Users can insert own spin history" ON public.spin_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure public access to necessary tables if not strictly private
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);


-- Ensure RLS is enabled on group orders properly
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;

-- Policy for viewing group orders: Created by user OR user is member
DROP POLICY IF EXISTS "View accessible group orders" ON public.group_orders;
CREATE POLICY "View accessible group orders" ON public.group_orders FOR SELECT 
USING (
  created_by = auth.uid() 
  OR 
  id IN (SELECT group_order_id FROM public.group_order_members WHERE user_id = auth.uid())
);

-- Ensure Privacy tables
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_name TEXT,
    location TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transaction_pin TEXT;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;
CREATE POLICY "Users can view their own login history"
    ON public.login_history FOR SELECT
    USING (auth.uid() = user_id);
