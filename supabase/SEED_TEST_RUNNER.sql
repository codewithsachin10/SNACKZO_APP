-- Create a test runner
INSERT INTO public.runners (name, phone, is_active, level, xp)
VALUES ('Test Runner', '9999999999', true, 1, 0)
ON CONFLICT (phone) DO UPDATE SET is_active = true;

-- Ensure Gamification tables exist (re-run safety)
CREATE TABLE IF NOT EXISTS public.runner_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.runner_achieved_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.runner_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(runner_id, badge_id)
);

-- Seed Badges if not exists
INSERT INTO public.runner_badges (name, description, icon, criteria) VALUES
('First Steps', 'Completed your first delivery', 'Footprints', '{"min_deliveries": 1}'),
('Speed Demon', 'Completed a delivery in under 10 minutes', 'Zap', '{"max_time_mins": 10}'),
('Century Club', 'Completed 100 deliveries', 'Trophy', '{"min_deliveries": 100}'),
('Night Owl', 'Completed a delivery after 10 PM', 'Moon', '{"time_range": "22:00-06:00"}')
ON CONFLICT DO NOTHING;
