-- Create a table for store configuration and announcements
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

-- RLS Policies
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- Everyone can view the config
CREATE POLICY "Public can view store config"
ON public.store_config FOR SELECT
USING (true);

-- Only Admins can update
CREATE POLICY "Admins can update store config"
ON public.store_config FOR UPDATE
USING (
  auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
);

-- Insert default row if not exists
INSERT INTO public.store_config (is_open, announcement_text, promo_text)
SELECT true, 'Welcome to Hostel Mart!', 'Free Delivery over ₹200'
WHERE NOT EXISTS (SELECT 1 FROM public.store_config);

-- Create a notifications table for broadcasting
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'announcement', -- 'announcement', 'promo', 'order'
    target_user_id UUID REFERENCES auth.users(id), -- NULL for broadcast
    created_at TIMESTAMPTZ DEFAULT now(),
    is_read BOOLEAN DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications OR broadcast notifications
CREATE POLICY "Users can see own or broadcast notifications"
ON public.notifications FOR SELECT
USING (
  target_user_id = auth.uid() OR target_user_id IS NULL
);

-- Admins can insert notifications
CREATE POLICY "Admins can send notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
);
