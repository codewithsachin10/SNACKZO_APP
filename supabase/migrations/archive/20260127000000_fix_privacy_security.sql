-- Add transaction_pin to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transaction_pin TEXT;

-- Create login_history table
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_name TEXT,
    location TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for login_history
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can insert their own login history" ON public.login_history;

-- Create Policies for login_history
CREATE POLICY "Users can view their own login history"
    ON public.login_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login history"
    ON public.login_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);
