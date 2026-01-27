-- Create banners table
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
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active banners" ON public.banners 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON public.banners 
  FOR ALL 
  USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Indexes
CREATE INDEX idx_banners_active_dates ON public.banners(is_active, start_date, end_date);
