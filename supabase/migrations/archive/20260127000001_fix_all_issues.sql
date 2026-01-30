-- Fix Spin History RLS
ALTER TABLE IF EXISTS public.spin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own spin history" ON public.spin_history;
CREATE POLICY "Users can view own spin history"
    ON public.spin_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own spin history" ON public.spin_history;
CREATE POLICY "Users can insert own spin history"
    ON public.spin_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Fix permissions for other tables if needed
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;

-- Ensure reviews are visible
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
