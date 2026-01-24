-- ==========================================
-- PHASE 3: GROWTH & ENGAGEMENT
-- ==========================================

-- 1. Create Referrals System
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- The new user
    referral_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'verified')),
    reward_amount DECIMAL(10,2) DEFAULT 50.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- RLS for Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

-- 2. Enhanced Reviews (with Photo Support)
-- Check if 'image_url' exists in reviews/ratings table (assuming 'product_reviews' or similar)
-- I'll create a dedicated review_images table for multi-image support or add column if simple
-- Let's check 'product_reviews' table existence first, assuming standard set up

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add image support
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'image_url') THEN
        ALTER TABLE public.product_reviews ADD COLUMN image_url TEXT;
    END IF;
    
    -- Add helper column for helpful votes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_reviews' AND column_name = 'helpful_count') THEN
        ALTER TABLE public.product_reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Social Notifications (Social Proof)
-- We'll use a table to log "public" significant events that can be broadcasted
CREATE TABLE IF NOT EXISTS public.social_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT CHECK (event_type IN ('order', 'review', 'signup')),
    user_name TEXT, -- stored as "Sahil S." for privacy
    product_name TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (Read only for public/authenticated)
ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for social events"
    ON public.social_events FOR SELECT
    USING (true);

-- 4. Notification Center (In-App Inbox)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'order', 'promo', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    action_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_type TEXT DEFAULT 'info',
    p_action_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, body, type, action_link)
    VALUES (p_user_id, p_title, p_body, p_type, p_action_link)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
