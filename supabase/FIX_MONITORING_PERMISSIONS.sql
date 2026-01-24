-- ==========================================================
-- FIX PERMISSIONS FOR SYSTEM HEALTH MONITORING (403 Error)
-- ==========================================================

-- 1. Explicitly Grant Permissions to the API Roles
-- This is often required when creating tables via SQL Editor
GRANT ALL ON TABLE public.active_sessions TO postgres;
GRANT ALL ON TABLE public.active_sessions TO authenticated;
GRANT ALL ON TABLE public.active_sessions TO service_role;
GRANT ALL ON TABLE public.active_sessions TO anon;

-- 2. Reset & Simplify Policies
-- We drop existing restrictive policies to ensure flow works
DROP POLICY IF EXISTS "Admins_View_All_Sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users_Manage_Own_Sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users_Insert_Own" ON public.active_sessions;
DROP POLICY IF EXISTS "Auth_View_All" ON public.active_sessions;
DROP POLICY IF EXISTS "Users_Manage_Own" ON public.active_sessions;
DROP POLICY IF EXISTS "Users_Delete_Own" ON public.active_sessions;

-- 3. Create Permissive Policies for the Dashboard
-- Allow ANY authenticated user to VIEW all sessions (for the Device Monitor)
CREATE POLICY "Auth_View_All" ON public.active_sessions
FOR SELECT TO authenticated
USING (true);

-- Allow Authenticated users to INSERT their own session
CREATE POLICY "Users_Insert_Own" ON public.active_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow Authenticated users to DELETE/UPDATE their own session
CREATE POLICY "Users_Manage_Own" ON public.active_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users_Delete_Own" ON public.active_sessions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4. Verify RLS is actually Enabled (It should be, but just in case)
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
