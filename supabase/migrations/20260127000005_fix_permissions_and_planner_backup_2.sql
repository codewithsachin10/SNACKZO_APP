-- Drop existing policies to ensure clean slate (checking both old and new names)
DROP POLICY IF EXISTS "Admins can manage events" ON public.admin_events;
DROP POLICY IF EXISTS "Admin manage events" ON public.admin_events;

DROP POLICY IF EXISTS "Admins can manage notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Admin manage notes" ON public.admin_notes;

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Admin all banners" ON public.banners;

DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Public read active banners" ON public.banners;

-- Make sure tables exist (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  type TEXT DEFAULT 'event',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  color TEXT DEFAULT '#feipce',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  priority INT DEFAULT 0,
  display_location TEXT DEFAULT 'home',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- REVISED POLICIES:
-- 1. Banners: Public read (for home screen), Admin all
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admin all banners" ON public.banners FOR ALL USING (
  -- Check if user is admin OR if user_roles table is empty/missing (fallback for dev)
  (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  OR 
  (auth.role() = 'authenticated' AND NOT EXISTS (SELECT 1 FROM public.user_roles))
) WITH CHECK (
  (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  OR 
  (auth.role() = 'authenticated' AND NOT EXISTS (SELECT 1 FROM public.user_roles))
);

-- 2. Events & Notes: Admin only (with dev fallback)
CREATE POLICY "Admin manage events" ON public.admin_events FOR ALL USING (
  (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  OR 
  (auth.role() = 'authenticated' AND NOT EXISTS (SELECT 1 FROM public.user_roles))
);

CREATE POLICY "Admin manage notes" ON public.admin_notes FOR ALL USING (
  (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  OR 
  (auth.role() = 'authenticated' AND NOT EXISTS (SELECT 1 FROM public.user_roles))
);

-- Fix: Grant necessary permissions to authenticated role for these tables
GRANT ALL ON public.admin_events TO authenticated;
GRANT ALL ON public.admin_notes TO authenticated;
GRANT ALL ON public.banners TO authenticated;
GRANT ALL ON public.banners TO anon; -- Allow anon to read banners if needed (usually handled by service_role or published API, but good for safe measure)

-- OPTIONAL: Insert the current user as Admin if not exists (This requires knowing the UUID, so we can't do it genericly in SQL easily without a function. 
-- Instead, we ensure the policies are robust.)
