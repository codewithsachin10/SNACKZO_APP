-- Enable RLS but ensure policies exist for public access (since custom auth is used)
ALTER TABLE public.runner_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable generic access for now" ON public.runner_shifts;
DROP POLICY IF EXISTS "Public access policy" ON public.runner_shifts;

-- Create a permissive policy for Runner Shifts (Required for custom phone auth)
CREATE POLICY "Public access policy" 
ON public.runner_shifts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Ensure the 'anon' role (used by the client) has permissions
GRANT ALL ON public.runner_shifts TO anon;
GRANT ALL ON public.runner_shifts TO authenticated;
GRANT ALL ON public.runner_shifts TO service_role;

-- Fix permissions for Runner Badges as well (just in case)
ALTER TABLE public.runner_achieved_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Runners can see their own badges" ON public.runner_achieved_badges;
CREATE POLICY "Public access badges" ON public.runner_achieved_badges FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.runner_achieved_badges TO anon;
GRANT ALL ON public.runner_achieved_badges TO authenticated;
GRANT ALL ON public.runner_achieved_badges TO service_role;

-- Fix permissions for Runners table updates (e.g. location tracking)
ALTER TABLE public.runners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Runners can update themselves" ON public.runners;
-- Allow anyone to update runners (secured by logic in app, needed for anon auth)
CREATE POLICY "Public update runners" ON public.runners FOR UPDATE USING (true);
CREATE POLICY "Public read runners" ON public.runners FOR SELECT USING (true);

GRANT ALL ON public.runners TO anon;
GRANT ALL ON public.runners TO authenticated;
