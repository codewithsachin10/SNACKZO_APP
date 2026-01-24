-- ========================================
-- SUPPORT SYSTEM ENHANCEMENT
-- Run this in Supabase SQL Editor to sync with the new Support Center
-- ========================================

-- 1. ENHANCE ORDER_ISSUES TABLE
-- Check if the table exists first, if not create it
CREATE TABLE IF NOT EXISTS public.order_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    issue_category TEXT DEFAULT 'others' CHECK (issue_category IN ('orders', 'payments', 'account', 'app', 'others')),
    issue_type TEXT CHECK (issue_type IN ('late', 'wrong', 'missing', 'damaged', 'quality', 'runner', 'other', 'refund', 'payment_failed', 'login_issue', 'technical')),
    title TEXT,
    description TEXT,
    photo_urls TEXT[],
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolution TEXT,
    refund_amount DECIMAL(10, 2),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'priority')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. ENABLE RLS
ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.order_issues;
CREATE POLICY "Users can view their own tickets" ON public.order_issues
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can create tickets" ON public.order_issues;
CREATE POLICY "Users can create tickets" ON public.order_issues
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update tickets" ON public.order_issues;
CREATE POLICY "Admins can update tickets" ON public.order_issues
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. PERMISSIONS
GRANT ALL ON public.order_issues TO authenticated;
GRANT ALL ON public.order_issues TO service_role;

-- 5. REALTIME
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'order_issues'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_issues;
    END IF;
END $$;

-- 6. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_order_issues_user_id ON public.order_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_order_id ON public.order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON public.order_issues(status);

-- Update confirmation
SELECT 'Support Database Synced Successfully!' as message;
