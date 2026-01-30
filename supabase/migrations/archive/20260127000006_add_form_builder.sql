-- Create Forms Table
CREATE TABLE IF NOT EXISTS public.admin_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Form Fields Table
CREATE TABLE IF NOT EXISTS public.admin_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.admin_forms(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL, -- text, number, rating, etc.
    is_required BOOLEAN DEFAULT false,
    options TEXT[], -- For select/radio fields
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Form Responses Table (The submission event)
CREATE TABLE IF NOT EXISTS public.admin_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.admin_forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null for anonymous if we allow it
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Create Form Response Values Table (The actual answers)
CREATE TABLE IF NOT EXISTS public.admin_form_response_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES public.admin_form_responses(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.admin_form_fields(id) ON DELETE CASCADE,
    value TEXT, -- Storing as text for simplicity, JSONB could be better but this is fine
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_form_response_values ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can do everything with forms
CREATE POLICY "Admins can manage forms" ON public.admin_forms
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage fields" ON public.admin_form_fields
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Everyone can view active forms and fields (to fill them out)
CREATE POLICY "Public can view active forms" ON public.admin_forms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view fields of active forms" ON public.admin_form_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_forms 
            WHERE id = admin_form_fields.form_id AND is_active = true
        )
    );

-- Responses
-- Users can insert their own responses
CREATE POLICY "Users can submit responses" ON public.admin_form_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can submit response values" ON public.admin_form_response_values
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_form_responses
            WHERE id = admin_form_response_values.response_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- Admins can view all responses
CREATE POLICY "Admins can view responses" ON public.admin_form_responses
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view response values" ON public.admin_form_response_values
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_form_responses;

NOTIFY pgrst, 'reload schema';
