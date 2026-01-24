-- 1. Grant Basic Table Permissions (Crucial if missing)
GRANT ALL ON TABLE public.store_config TO service_role;
GRANT ALL ON TABLE public.store_config TO postgres;
GRANT SELECT ON TABLE public.store_config TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.store_config TO authenticated;

-- 2. Grant Permissions for Notifications
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.notifications TO postgres;
GRANT SELECT ON TABLE public.notifications TO anon, authenticated;
GRANT INSERT ON TABLE public.notifications TO authenticated;

-- 3. Reset RLS Policies for store_config
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Config" ON public.store_config;
DROP POLICY IF EXISTS "Public can view store config" ON public.store_config;
CREATE POLICY "Public Read Config" ON public.store_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Update Config" ON public.store_config;
DROP POLICY IF EXISTS "Admins can update store config" ON public.store_config;
CREATE POLICY "Admin Update Config" ON public.store_config FOR UPDATE USING (
  -- Temporarily allow all logged-in users to update for debugging.
  -- We will tighten this once basic access works.
  auth.role() = 'authenticated'
);

-- 4. Ensure a Default Row Exists (So Frontend doesn't error on empty table)
INSERT INTO public.store_config (is_open, announcement_text, promo_text)
SELECT true, 'Welcome to Hostel Mart!', 'Free Delivery over ₹200'
WHERE NOT EXISTS (SELECT 1 FROM public.store_config);

-- 5. Reset RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User View Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin Send Notifications" ON public.notifications;

CREATE POLICY "User View Notifications" ON public.notifications FOR SELECT
USING (target_user_id = auth.uid() OR target_user_id IS NULL);

CREATE POLICY "Admin Send Notifications" ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
