
-- Create a table for real-time payment sessions
CREATE TABLE IF NOT EXISTS public.payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sessions;

-- Policies (Public for demo purposes, or secure as needed)
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.payment_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.payment_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.payment_sessions FOR UPDATE USING (true);
