-- Fix permissions for admin_forms
-- Drop existing restricted policies
DROP POLICY IF EXISTS "Admins manage forms" ON public.admin_forms;
DROP POLICY IF EXISTS "Admins manage fields" ON public.admin_form_fields;
DROP POLICY IF EXISTS "Admins view responses" ON public.admin_form_responses;

-- Create more permissive policies for development/admin use
-- (Allows any authenticated user to create/manage forms for now)
CREATE POLICY "Enable all access for authenticated users" ON public.admin_forms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for fields" ON public.admin_form_fields
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable response view for authenticated" ON public.admin_form_responses
    FOR SELECT
    TO authenticated
    USING (true);

-- Ensure public read access is still there
DROP POLICY IF EXISTS "Public view active forms" ON public.admin_forms;
CREATE POLICY "Public view active forms" ON public.admin_forms 
    FOR SELECT 
    USING (is_active = true);

NOTIFY pgrst, 'reload schema';
