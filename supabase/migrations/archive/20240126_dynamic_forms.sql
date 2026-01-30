-- Create tables for dynamic form builder

-- 1. Forms Table (The container)
CREATE TABLE IF NOT EXISTS public.admin_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Form Fields (The questions)
CREATE TABLE IF NOT EXISTS public.admin_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.admin_forms(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'rating', 'boolean', 'select', 'date')),
    options TEXT[], -- For select/radio types
    is_required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0
);

-- 3. Form Responses (The answers)
CREATE TABLE IF NOT EXISTS public.admin_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.admin_forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be anonymous if null
    response_data JSONB NOT NULL, -- Storing answers as { "field_id": "value" }
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Security Policies (RLS)
ALTER TABLE public.admin_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_form_responses ENABLE ROW LEVEL SECURITY;

-- Admins manage forms
CREATE POLICY "Admins manage forms" ON public.admin_forms 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Everyone can view active forms
CREATE POLICY "Public view active forms" ON public.admin_forms 
FOR SELECT USING (is_active = true);

-- Admins manage fields
CREATE POLICY "Admins manage fields" ON public.admin_form_fields 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Everyone can view fields for active forms
CREATE POLICY "Public view fields" ON public.admin_form_fields 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_forms WHERE id = form_id AND is_active = true)
);

-- Users can submit responses
CREATE POLICY "Public submit responses" ON public.admin_form_responses 
FOR INSERT WITH CHECK (true);

-- Admins view responses
CREATE POLICY "Admins view responses" ON public.admin_form_responses 
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_form_responses;

NOTIFY pgrst, 'reload schema';
