-- ==========================================
-- PHASE 3 FIX: Add Referral Codes Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    uses_count INTEGER DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
    ON public.referral_codes FOR SELECT
    USING (auth.uid() = user_id);
    
CREATE POLICY "Anyone can look up referral code"
    ON public.referral_codes FOR SELECT
    USING (true); -- Needed for applying code

-- RPC to safely generate unique code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random code like HM-AB12
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
