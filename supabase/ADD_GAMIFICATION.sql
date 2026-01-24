-- Add Gamification columns to runners
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Create Badges Table
CREATE TABLE IF NOT EXISTS public.runner_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name or image URL
    criteria JSONB, -- e.g. {"min_deliveries": 100}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CLEANUP DUPLICATES: Delete duplicate badges so we can add a unique constraint
-- This keeps one instance of each badge name and deletes the others.
DELETE FROM public.runner_badges a USING public.runner_badges b
WHERE a.id > b.id AND a.name = b.name;

-- Ensure Name is Unique for Badges to prevent duplicates in future
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runner_badges_name_key') THEN
        ALTER TABLE public.runner_badges ADD CONSTRAINT runner_badges_name_key UNIQUE (name);
    END IF;
END
$$;

-- Associate Badges with Runners
CREATE TABLE IF NOT EXISTS public.runner_achieved_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.runner_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(runner_id, badge_id)
);

-- RLS: Drop existing policies first to ensure idempotency
ALTER TABLE public.runner_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read badges" ON public.runner_badges;
CREATE POLICY "Public read badges" ON public.runner_badges FOR SELECT USING (true);

ALTER TABLE public.runner_achieved_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Runners can see their own badges" ON public.runner_achieved_badges;
CREATE POLICY "Runners can see their own badges" ON public.runner_achieved_badges FOR SELECT USING (true);

-- Seed Initial Badges
INSERT INTO public.runner_badges (name, description, icon, criteria) VALUES
('First Steps', 'Completed your first delivery', 'Footprints', '{"min_deliveries": 1}'),
('Speed Demon', 'Completed a delivery in under 10 minutes', 'Zap', '{"max_time_mins": 10}'),
('Century Club', 'Completed 100 deliveries', 'Trophy', '{"min_deliveries": 100}'),
('Night Owl', 'Completed a delivery after 10 PM', 'Moon', '{"time_range": "22:00-06:00"}')
ON CONFLICT (name) DO NOTHING;
