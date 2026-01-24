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

-- Only Admins can update (assuming admin role or check via auth.uid() in admin table if exists, or just open for now and we rely on App Logic for admin check if simple)
-- For simplicity in this project's context, we allow authenticated users to update if they are admins.
-- Assuming 'is_admin' meta or similar. 
-- For now, let's allow authenticated users with a specific email or rely on client-side check + backend function validation if strictly needed. 
-- Given previous conversation, we rely on RLS if possible. Let's assume broad update for 'authenticated' for now or 'service_role' for edge functions.
-- Safest is "Admins only".
CREATE POLICY "Admins can update store config"
ON public.store_config FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
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
  auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
);
