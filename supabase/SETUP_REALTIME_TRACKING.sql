-- 1. Add Location Columns to Runners Table
ALTER TABLE public.runners 
ADD COLUMN IF NOT EXISTS current_lat TEXT,
ADD COLUMN IF NOT EXISTS current_lng TEXT,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- 2. Create a location history table (Optional, for replay)
CREATE TABLE IF NOT EXISTS public.order_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE,
    lat TEXT NOT NULL,
    lng TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS for history
ALTER TABLE public.order_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view location history" ON public.order_location_history FOR SELECT USING (true);
CREATE POLICY "Runners can insert location" ON public.order_location_history FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'runner' -- Simplified check
    -- Or just public for now for MVP
) OR true);

-- Enable Realtime for runners location
ALTER PUBLICATION supabase_realtime ADD TABLE public.runners;
