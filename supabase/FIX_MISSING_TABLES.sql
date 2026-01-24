-- =====================================================
-- FIX MISSING TABLES
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- FAVORITES TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their favorites" ON public.favorites;
CREATE POLICY "Users can view their favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATIONS TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- WALLET TRANSACTIONS TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
CREATE POLICY "System can insert transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- REFERRAL CODES TABLE (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT UNIQUE NOT NULL,
  uses INT DEFAULT 0,
  max_uses INT DEFAULT 100,
  reward_amount DECIMAL(10,2) DEFAULT 50,
  referee_reward DECIMAL(10,2) DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their referral code" ON public.referral_codes;
CREATE POLICY "Users can view their referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their referral code" ON public.referral_codes;
CREATE POLICY "Users can insert their referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- REFERRALS TABLE (if missing)
-- =====================================================
-- Note: Table may already exist with different column names
-- Skip if exists - referrals table is already set up

-- =====================================================
-- LOYALTY POINTS & REWARDS (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view their loyalty transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'free_delivery', 'free_item', 'cashback')),
  reward_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rewards" ON public.loyalty_rewards;
CREATE POLICY "Anyone can view rewards"
  ON public.loyalty_rewards FOR SELECT
  USING (true);

-- Add loyalty_points to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;

-- =====================================================
-- GROUP ORDERS (if missing)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.group_order_status AS ENUM ('open', 'locked', 'ordered', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status public.group_order_status NOT NULL DEFAULT 'open',
  invite_code TEXT UNIQUE NOT NULL,
  hostel_block TEXT NOT NULL,
  max_members INT DEFAULT 10,
  delivery_address TEXT NOT NULL,
  order_deadline TIMESTAMPTZ NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  final_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group orders they are part of" ON public.group_orders;
CREATE POLICY "Users can view group orders they are part of"
  ON public.group_orders FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.group_order_members WHERE group_order_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create group orders" ON public.group_orders;
CREATE POLICY "Users can create group orders"
  ON public.group_orders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update their group orders" ON public.group_orders;
CREATE POLICY "Creators can update their group orders"
  ON public.group_orders FOR UPDATE
  USING (auth.uid() = created_by);

-- Group order members
CREATE TABLE IF NOT EXISTS public.group_order_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  has_paid BOOLEAN DEFAULT false,
  subtotal DECIMAL(10,2) DEFAULT 0,
  share_of_delivery DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_order_id, user_id)
);

ALTER TABLE public.group_order_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group members" ON public.group_order_members;
CREATE POLICY "Members can view group members"
  ON public.group_order_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join groups" ON public.group_order_members;
CREATE POLICY "Users can join groups"
  ON public.group_order_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their membership" ON public.group_order_members;
CREATE POLICY "Users can update their membership"
  ON public.group_order_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Group order items
CREATE TABLE IF NOT EXISTS public.group_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.group_order_members(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group items" ON public.group_order_items;
CREATE POLICY "Members can view group items"
  ON public.group_order_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members can add items" ON public.group_order_items;
CREATE POLICY "Members can add items"
  ON public.group_order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update their items" ON public.group_order_items;
CREATE POLICY "Members can update their items"
  ON public.group_order_items FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Members can delete their items" ON public.group_order_items;
CREATE POLICY "Members can delete their items"
  ON public.group_order_items FOR DELETE
  USING (true);

-- =====================================================
-- GENERATE REFERRAL CODE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    new_code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert the new referral code for the current user
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (auth.uid(), new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Return the code (either new or existing)
  SELECT code INTO new_code FROM public.referral_codes WHERE user_id = auth.uid();
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DAILY CHECK-IN FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  last_checkin DATE;
  current_streak INT;
  points_earned INT := 10;
  result JSONB;
BEGIN
  -- Get last checkin date and current streak
  SELECT 
    (data->>'last_checkin')::DATE,
    COALESCE((data->>'streak')::INT, 0)
  INTO last_checkin, current_streak
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if already checked in today
  IF last_checkin = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today',
      'streak', current_streak
    );
  END IF;
  
  -- Calculate new streak
  IF last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN
    current_streak := current_streak + 1;
  ELSE
    current_streak := 1;
  END IF;
  
  -- Bonus points for streak milestones
  IF current_streak = 7 THEN
    points_earned := 50;
  ELSIF current_streak = 30 THEN
    points_earned := 200;
  ELSIF current_streak % 7 = 0 THEN
    points_earned := 25;
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    data = COALESCE(data, '{}'::JSONB) || jsonb_build_object(
      'last_checkin', CURRENT_DATE,
      'streak', current_streak
    ),
    loyalty_points = COALESCE(loyalty_points, 0) + points_earned
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO public.loyalty_transactions (user_id, points, type, description)
  VALUES (p_user_id, points_earned, 'bonus', 'Daily check-in streak: ' || current_streak);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Checked in successfully!',
    'streak', current_streak,
    'points_earned', points_earned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SUCCESS!
-- =====================================================
SELECT 'All missing tables and functions have been created!' as result;
