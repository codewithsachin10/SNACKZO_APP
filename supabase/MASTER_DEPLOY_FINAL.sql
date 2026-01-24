-- =================================================================
-- HOSTEL MART - MASTER DEPLOYMENT SCRIPT (ALL FEATURES)
-- Run this in your Supabase SQL Editor to enable all Features including Premium & Monitoring
-- =================================================================

-- -----------------------------------------------------------------
-- 1. FINANCE & WALLET
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    usage_limit INTEGER, -- NULL means unlimited
    usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read promo codes" ON public.promo_codes;
CREATE POLICY "Public read promo codes" ON public.promo_codes FOR SELECT USING (true);

-- -----------------------------------------------------------------
-- 2. GROWTH & REFERRALS
-- -----------------------------------------------------------------
-- Referral Codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    uses_count INTEGER DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read referral codes" ON public.referral_codes;
CREATE POLICY "Read referral codes" ON public.referral_codes FOR SELECT USING (true);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id),
    referred_id UUID REFERENCES auth.users(id),
    referral_code TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referrals" ON public.referrals;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);

-- Social Events
CREATE TABLE IF NOT EXISTS public.social_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT CHECK (event_type IN ('order', 'review', 'signup')),
    user_name TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read social events" ON public.social_events;
CREATE POLICY "Public read social events" ON public.social_events FOR SELECT USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    priority TEXT DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    image_url TEXT,
    order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage notifications" ON public.notifications;
CREATE POLICY "Users manage notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- 3. ADMIN & SUPPORT
-- -----------------------------------------------------------------
-- Inventory Logs
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id),
    change_amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin view logs" ON public.inventory_logs;
CREATE POLICY "Admin view logs" ON public.inventory_logs FOR SELECT USING (true);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    subject TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view tickets" ON public.support_tickets;
CREATE POLICY "Users view tickets" ON public.support_tickets FOR ALL USING (auth.uid() = user_id);

-- Support Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view messages" ON public.support_messages;
CREATE POLICY "Users view messages" ON public.support_messages FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Users send messages" ON public.support_messages;
CREATE POLICY "Users send messages" ON public.support_messages FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()));

-- Enable Realtime for Chat & Social Proof (Safe Execution)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.social_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- -----------------------------------------------------------------
-- 4. HELPER FUNCTIONS
-- -----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generate_referral_code(UUID);

CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'HM-' || substring(md5(random()::text) from 1 for 6);
        new_code := upper(new_code);
        SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO exists;
        IF NOT exists THEN
            INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, new_code);
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------
-- 5. SYSTEM HEALTH & MONITORING (NEW!)
-- -----------------------------------------------------------------
-- Active Sessions Table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info TEXT,
    ip_address TEXT,
    location TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Grant Permissions
GRANT ALL ON TABLE public.active_sessions TO postgres;
GRANT ALL ON TABLE public.active_sessions TO authenticated;
GRANT ALL ON TABLE public.active_sessions TO service_role;
GRANT ALL ON TABLE public.active_sessions TO anon;

-- Apply Robust Policies
DROP POLICY IF EXISTS "Auth_View_All" ON public.active_sessions;
CREATE POLICY "Auth_View_All" ON public.active_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users_Insert_Own" ON public.active_sessions;
CREATE POLICY "Users_Insert_Own" ON public.active_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users_Manage_Own" ON public.active_sessions;
CREATE POLICY "Users_Manage_Own" ON public.active_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users_Delete_Own" ON public.active_sessions;
CREATE POLICY "Users_Delete_Own" ON public.active_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Relaxed Constraints (No strict profile link required)
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey_profiles;
ALTER TABLE public.active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey;
ALTER TABLE public.active_sessions ADD CONSTRAINT active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT,
  UNIQUE(user_id, role)
);
