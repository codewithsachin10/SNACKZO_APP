-- PHASE 2: Referral Program & Loyalty Points
-- Run this in Supabase SQL Editor

-- ============================================
-- REFERRAL SYSTEM
-- ============================================

-- Referral codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  uses_count INT DEFAULT 0,
  max_uses INT DEFAULT 100,
  reward_amount DECIMAL(10,2) DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_given BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

-- ============================================
-- LOYALTY POINTS SYSTEM
-- ============================================

-- Add loyalty points to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_points INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'expire')),
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Loyalty rewards table
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percent', 'discount_fixed', 'free_delivery', 'free_product')),
  reward_value DECIMAL(10,2),
  product_id UUID REFERENCES public.products(id),
  min_tier TEXT DEFAULT 'bronze',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PRICE DROP ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  is_triggered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  triggered_at TIMESTAMPTZ,
  UNIQUE(user_id, product_id)
);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Referral Codes Policies
CREATE POLICY "Users can view own referral code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own referral code" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view referral codes for validation" ON public.referral_codes FOR SELECT TO authenticated USING (is_active = true);

-- Referrals Policies
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Can create referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (true);

-- Loyalty Transactions Policies
CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Can insert loyalty transactions" ON public.loyalty_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Loyalty Rewards Policies
CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Price Alerts Policies
CREATE POLICY "Users can view own alerts" ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create alerts" ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'HM' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process referral and give rewards
CREATE OR REPLACE FUNCTION process_referral_reward(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referral RECORD;
  v_reward_amount DECIMAL(10,2);
BEGIN
  SELECT r.*, rc.reward_amount INTO v_referral
  FROM referrals r
  JOIN referral_codes rc ON rc.code = r.referral_code
  WHERE r.id = p_referral_id AND r.status = 'completed' AND r.reward_given = false;
  
  IF v_referral IS NOT NULL THEN
    v_reward_amount := v_referral.reward_amount;
    
    -- Give reward to referrer
    UPDATE profiles SET wallet_balance = wallet_balance + v_reward_amount WHERE user_id = v_referral.referrer_id;
    
    -- Give reward to referred user (half amount)
    UPDATE profiles SET wallet_balance = wallet_balance + (v_reward_amount / 2) WHERE user_id = v_referral.referred_id;
    
    -- Create wallet transactions
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
    VALUES (v_referral.referrer_id, v_reward_amount, 'credit', 'Referral bonus');
    
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
    VALUES (v_referral.referred_id, v_reward_amount / 2, 'credit', 'Welcome bonus (referral)');
    
    -- Mark referral as rewarded
    UPDATE referrals SET reward_given = true, status = 'rewarded' WHERE id = p_referral_id;
    
    -- Increment referral code uses
    UPDATE referral_codes SET uses_count = uses_count + 1 WHERE code = v_referral.referral_code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add loyalty points for order
CREATE OR REPLACE FUNCTION add_loyalty_points(p_user_id UUID, p_order_id UUID, p_amount DECIMAL)
RETURNS INT AS $$
DECLARE
  v_points INT;
  v_tier TEXT;
  v_multiplier DECIMAL;
BEGIN
  -- Get user's tier
  SELECT loyalty_tier INTO v_tier FROM profiles WHERE user_id = p_user_id;
  
  -- Set multiplier based on tier
  v_multiplier := CASE v_tier
    WHEN 'platinum' THEN 2.0
    WHEN 'gold' THEN 1.5
    WHEN 'silver' THEN 1.25
    ELSE 1.0
  END;
  
  -- Calculate points (1 point per ₹10 spent, with tier multiplier)
  v_points := FLOOR((p_amount / 10) * v_multiplier);
  
  -- Add points
  UPDATE profiles SET 
    loyalty_points = loyalty_points + v_points,
    lifetime_points = lifetime_points + v_points
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, description, order_id)
  VALUES (p_user_id, v_points, 'earn', 'Order points', p_order_id);
  
  -- Update tier based on lifetime points
  UPDATE profiles SET loyalty_tier = CASE
    WHEN lifetime_points >= 5000 THEN 'platinum'
    WHEN lifetime_points >= 2000 THEN 'gold'
    WHEN lifetime_points >= 500 THEN 'silver'
    ELSE 'bronze'
  END WHERE user_id = p_user_id;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(p_user_id UUID, p_points INT, p_description TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_points INT;
BEGIN
  SELECT loyalty_points INTO v_current_points FROM profiles WHERE user_id = p_user_id;
  
  IF v_current_points >= p_points THEN
    UPDATE profiles SET loyalty_points = loyalty_points - p_points WHERE user_id = p_user_id;
    
    INSERT INTO loyalty_transactions (user_id, points, transaction_type, description)
    VALUES (p_user_id, -p_points, 'redeem', p_description);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON public.price_alerts(product_id);

-- ============================================
-- SEED LOYALTY REWARDS
-- ============================================

INSERT INTO public.loyalty_rewards (name, description, points_required, reward_type, reward_value, min_tier) VALUES
('Free Delivery', 'Get free delivery on your next order', 100, 'free_delivery', 0, 'bronze'),
('₹25 Off', 'Get ₹25 off on orders above ₹200', 200, 'discount_fixed', 25, 'bronze'),
('10% Off', 'Get 10% off on your next order (max ₹50)', 300, 'discount_percent', 10, 'silver'),
('₹50 Off', 'Get ₹50 off on orders above ₹300', 400, 'discount_fixed', 50, 'silver'),
('15% Off', 'Get 15% off on your next order (max ₹100)', 500, 'discount_percent', 15, 'gold'),
('₹100 Off', 'Get ₹100 off on orders above ₹500', 800, 'discount_fixed', 100, 'gold'),
('20% Off', 'Get 20% off on your next order (max ₹150)', 1000, 'discount_percent', 20, 'platinum')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE! ✅
-- ============================================
