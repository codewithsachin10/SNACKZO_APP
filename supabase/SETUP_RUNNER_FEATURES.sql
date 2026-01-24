-- Create table for Runner Shifts
CREATE TABLE IF NOT EXISTS public.runner_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_earnings NUMERIC DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    break_start_time TIMESTAMP WITH TIME ZONE, -- If currently on break
    total_break_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_runner_shifts_runner ON public.runner_shifts(runner_id);
CREATE INDEX idx_runner_shifts_status ON public.runner_shifts(status);

-- RLS
ALTER TABLE public.runner_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Runners can view their own shifts" ON public.runner_shifts
    FOR SELECT USING (runner_id IN (
        SELECT id FROM public.runners WHERE phone = current_setting('request.jwt.claim.sub', true) -- This is tricky as runners aren't auth users.
        -- Assuming runner dashboard uses local storage and simple query. RLS might need to be open or use a function.
        -- For now, let's allow public read/write if we trust the client logic (since authentication is Phone-based without proper Auth user).
        -- Ideally, we should migrate runners to Auth users eventually.
        -- For this MVP, we will make it public but maybe restrict by ID if we could.
        -- Let's just create a policy that allows all for now since Runner Auth is "mocked" via phone lookup.
    ));

CREATE POLICY "Enable generic access for now" ON public.runner_shifts FOR ALL USING (true) WITH CHECK (true);


-- Add status column to runners if missing (it might exist as is_active boolean, let's enhance it)
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS current_stat TEXT DEFAULT 'offline'; -- offline, active, break
