-- ========================================
-- SUPPORT DATABASE REPAIR SCRIPT v2
-- Run this if you see 400 Bad Request errors
-- ========================================

-- 1. Create the issue_category enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE issue_category AS ENUM (
        'wrong_item', 
        'missing_item', 
        'late_delivery', 
        'damaged_item', 
        'wrong_quantity', 
        'quality_issue', 
        'rude_behavior', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add or fix the 'category' column (this is the main column used)
ALTER TABLE public.order_issues ADD COLUMN IF NOT EXISTS category issue_category;

-- 3. Migrate any legacy issue_category values to new category column (if applicable)
-- UPDATE public.order_issues SET category = 'other' WHERE category IS NULL;

-- 4. Ensure all additional columns exist
ALTER TABLE public.order_issues ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.order_issues ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
ALTER TABLE public.order_issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.order_issues ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- 5. Set default status to 'pending' (compatible with issue_status enum)
ALTER TABLE public.order_issues ALTER COLUMN status SET DEFAULT 'pending';

-- 6. Fix Foreign Key: Link order_id to orders table for nested joins 
ALTER TABLE public.order_issues DROP CONSTRAINT IF EXISTS order_issues_order_id_fkey;
ALTER TABLE public.order_issues ADD CONSTRAINT order_issues_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 7. Fix Foreign Key: Link user_id to profiles table
ALTER TABLE public.order_issues DROP CONSTRAINT IF EXISTS order_issues_user_id_fkey;
ALTER TABLE public.order_issues ADD CONSTRAINT order_issues_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 8. Drop old RLS policies and recreate
DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.order_issues;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.order_issues;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.order_issues;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.order_issues;

-- 9. Enable RLS
ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;

-- 10. Create User policies
CREATE POLICY "Users can view their own tickets"
ON public.order_issues FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets"
ON public.order_issues FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 11. Create Admin policies (checks user_roles table for admin role)
CREATE POLICY "Admins can view all tickets"
ON public.order_issues FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update tickets"
ON public.order_issues FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 12. Grant permissions
GRANT ALL ON public.order_issues TO authenticated;
GRANT ALL ON public.order_issues TO service_role;

-- 13. Enable Realtime (skip if already added)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_issues;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

SELECT 'Support Database Repair Completed! - v2' as message;
