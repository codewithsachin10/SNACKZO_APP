-- Fix permissions for Runner Gamification Tables

-- 1. Runner Badges (Metadata)
ALTER TABLE public.runner_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read badges" ON public.runner_badges;
CREATE POLICY "Public read badges" ON public.runner_badges FOR SELECT USING (true);

GRANT SELECT ON public.runner_badges TO anon;
GRANT SELECT ON public.runner_badges TO authenticated;
GRANT ALL ON public.runner_badges TO service_role;

-- 2. Runner Achieved Badges (User Data)
ALTER TABLE public.runner_achieved_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access badges" ON public.runner_achieved_badges;
DROP POLICY IF EXISTS "Runners can see their own badges" ON public.runner_achieved_badges;

CREATE POLICY "Public access achieved badges" ON public.runner_achieved_badges 
FOR ALL 
USING (true) 
WITH CHECK (true);

GRANT ALL ON public.runner_achieved_badges TO anon;
GRANT ALL ON public.runner_achieved_badges TO authenticated;
GRANT ALL ON public.runner_achieved_badges TO service_role;

-- 3. Runners Table (for XP/Level updates)
ALTER TABLE public.runners ENABLE ROW LEVEL SECURITY;
-- Ensure we don't duplicate policies, so drop if exists
DROP POLICY IF EXISTS "Public update runners" ON public.runners;
DROP POLICY IF EXISTS "Public read runners" ON public.runners;

CREATE POLICY "Public update runners" ON public.runners FOR UPDATE USING (true);
CREATE POLICY "Public read runners" ON public.runners FOR SELECT USING (true);

GRANT ALL ON public.runners TO anon;
GRANT ALL ON public.runners TO authenticated;
