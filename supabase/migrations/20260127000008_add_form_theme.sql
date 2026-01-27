-- Add theme column to admin_forms
ALTER TABLE public.admin_forms 
ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primaryColor": "#7c3aed", "backgroundColor": "#ffffff", "borderRadius": "0.75rem"}'::jsonb;

-- Grant permissions just in case
GRANT ALL ON TABLE public.admin_forms TO authenticated;
GRANT ALL ON TABLE public.admin_forms TO service_role;
