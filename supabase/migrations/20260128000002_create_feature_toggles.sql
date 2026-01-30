-- Create Feature Toggles Table (Definition matches existing schema based on error logs)
-- Existing columns appear to be: id, feature_name, display_name, description, is_enabled, updated_by, category, created_at, updated_at
CREATE TABLE IF NOT EXISTS public.feature_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    description TEXT,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- 1. Everyone can READ feature toggles (so the app knows if features are on/off)
DROP POLICY IF EXISTS "Public read feature toggles" ON public.feature_toggles;
CREATE POLICY "Public read feature toggles" 
ON public.feature_toggles FOR SELECT 
USING (true);

-- 2. Only Admins can UPDATE/INSERT feature toggles
DROP POLICY IF EXISTS "Admins manage feature toggles" ON public.feature_toggles;
CREATE POLICY "Admins manage feature toggles" 
ON public.feature_toggles FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Insert the SnackzoPay Gateway toggle if not exists
INSERT INTO public.feature_toggles (feature_name, display_name, is_enabled, description, category)
VALUES ('snackzopay_gateway', 'SnackzoPay Gateway', true, 'Master switch for SnackzoPay Payment Gateway', 'financial')
ON CONFLICT (feature_name) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    category = EXCLUDED.category;

-- Grant permissions
GRANT SELECT ON public.feature_toggles TO authenticated, anon;
GRANT ALL ON public.feature_toggles TO service_role;
