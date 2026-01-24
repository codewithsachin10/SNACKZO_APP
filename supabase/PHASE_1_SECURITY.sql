-- ==========================================
-- PHASE 1: SECURITY & SETTINGS ENHANCEMENT
-- ==========================================

-- 1. Create Login History Table
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT,
    location TEXT, -- storing approximate location if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Login History
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login history"
    ON public.login_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login history"
    ON public.login_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Add columns to Profiles for Transaction PIN and Settings
-- We use safe 'IF NOT EXISTS' equivalent by catching errors or checking schema, 
-- but straightforward ALTER TABLE is standard for migrations.

DO $$
BEGIN
    -- Transaction PIN (hashed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transaction_pin') THEN
        ALTER TABLE public.profiles ADD COLUMN transaction_pin TEXT; -- Will store hashed PIN
    END IF;

    -- Settings Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'settings') THEN
        ALTER TABLE public.profiles ADD COLUMN settings JSONB DEFAULT '{
            "theme": "system",
            "reduce_motion": false,
            "high_contrast": false,
            "sound_enabled": true,
            "vibro_enabled": true,
            "language": "en"
        }'::jsonb;
    END IF;
END $$;

-- 3. Function to log login (can be called from frontend on auth state change)
-- Note: IP and User Agent are usually better captured on Edge Functions, 
-- but can be passed from client for this implementation level.

-- 4. Enable Realtime for Login History so users see "New login" immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_history;
