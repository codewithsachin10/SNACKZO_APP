-- Fix Feedback Table Permissions

-- 1. Ensure Table Permissions are granted to roles
GRANT ALL ON TABLE public.app_feedback TO authenticated;
GRANT ALL ON TABLE public.app_feedback TO service_role;

-- 2. Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Users can create feedback" ON public.app_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.app_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.app_feedback;
DROP POLICY IF EXISTS "Admins can update information" ON public.app_feedback;

-- 3. Re-create Policies (Robust Version)

-- Allow anyone authenticated to Create Feedback
CREATE POLICY "Users can create feedback" 
ON public.app_feedback FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow Users to view their own feedback
CREATE POLICY "Users can view own feedback" 
ON public.app_feedback FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow Admins to View ALL feedback
-- Using a security definer function for the admin check can sometimes be safer/cleaner, 
-- but direct check should work if profiles is readable. 
-- We'll assume standard RLS on profiles allows users to read their own 'is_admin' field.
CREATE POLICY "Admins can view all feedback" 
ON public.app_feedback FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- Allow Admins to Update/Delete (Resolve, Reply, Remove)
CREATE POLICY "Admins can update feedback" 
ON public.app_feedback FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

CREATE POLICY "Admins can delete feedback" 
ON public.app_feedback FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    )
);

-- 4. Enable RLS (Just in case)
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
