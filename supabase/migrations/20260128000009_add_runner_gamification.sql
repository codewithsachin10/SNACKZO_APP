-- Add Gamification columns to runners table
ALTER TABLE public.runners 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN public.runners.xp IS 'Experience points for the runner';
COMMENT ON COLUMN public.runners.level IS 'Current level of the runner based on XP';
