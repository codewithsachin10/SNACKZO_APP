-- Create feature_toggles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feature_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    icon TEXT,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read feature_toggles" ON public.feature_toggles
    FOR SELECT USING (true);

CREATE POLICY "Admin update feature_toggles" ON public.feature_toggles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insert Email Simulation Toggle
INSERT INTO public.feature_toggles (feature_name, display_name, description, is_enabled, icon, category)
VALUES (
    'email_simulation', 
    'Email Simulation Mode', 
    'When enabled, emails are logged to the console instead of being sent via Resend API.', 
    false, 
    'demo_otp_mode', 
    'developer'
)
ON CONFLICT (feature_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category;
