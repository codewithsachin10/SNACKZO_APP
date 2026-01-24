-- 1. Ensure store_config exists (and create if not)
CREATE TABLE IF NOT EXISTS public.store_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open BOOLEAN DEFAULT true,
    announcement_text TEXT DEFAULT '',
    promo_text TEXT DEFAULT '',
    operating_hours_open TEXT DEFAULT '20:00',
    operating_hours_close TEXT DEFAULT '03:00',
    delivery_fee DECIMAL DEFAULT 20.00,
    free_delivery_threshold DECIMAL DEFAULT 200.00,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- Policies for store_config (Drop first to allow re-run)
DROP POLICY IF EXISTS "Public can view store config" ON public.store_config;
CREATE POLICY "Public can view store config" ON public.store_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update store config" ON public.store_config;
CREATE POLICY "Admins can update store config" ON public.store_config FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- 2. Ensure notifications table exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'announcement',
    created_at TIMESTAMPTZ DEFAULT now(),
    is_read BOOLEAN DEFAULT false
);

-- Add target_user_id if missing (Safe alter)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_user_id') THEN 
        ALTER TABLE public.notifications ADD COLUMN target_user_id UUID REFERENCES auth.users(id); 
    END IF; 
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can see own or broadcast notifications" ON public.notifications;
CREATE POLICY "Users can see own or broadcast notifications" ON public.notifications FOR SELECT
USING (target_user_id = auth.uid() OR target_user_id IS NULL);

DROP POLICY IF EXISTS "Admins can send notifications" ON public.notifications;
CREATE POLICY "Admins can send notifications" ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- 3. Insert default config if missing
INSERT INTO public.store_config (is_open, announcement_text, promo_text)
SELECT true, 'Welcome to Hostel Mart!', 'Free Delivery over ₹200'
WHERE NOT EXISTS (SELECT 1 FROM public.store_config);
