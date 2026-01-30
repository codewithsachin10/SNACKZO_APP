-- SAFE MIGRATION: Fix Admin Roles
-- This script safely updates the user_roles table without errors

-- 1. Create table if it doesn't exist (Safe)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

-- 2. Enable RLS (Safe)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies to avoid "already exists" error
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow read access" ON public.user_roles;
DROP POLICY IF EXISTS "Allow public read of roles" ON public.user_roles;

-- 4. Re-create the Policies
CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Grant Permissions (Crucial for 406 error fix)
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

-- 6. OPTIONAL: Make yourself an admin
-- Uncomment and replace YOUR_EMAIL with your email to become admin immediately
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'codewithsachin10@gmail.com'
-- ON CONFLICT DO NOTHING;
