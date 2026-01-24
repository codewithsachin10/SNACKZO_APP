-- ============================================
-- 1. GROUP ORDERING SYSTEM
-- ============================================

-- Group Orders Table
CREATE TABLE IF NOT EXISTS public.group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  hostel_block TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  order_deadline TIMESTAMPTZ NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'locked', 'ordered', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS public.group_order_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  has_paid BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_order_id, user_id)
);

-- Group Items Table
CREATE TABLE IF NOT EXISTS public.group_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.group_order_members(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. GAMIFICATION SYSTEM
-- ============================================

-- Badges Definition Table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji or Icon name
  badge_type TEXT CHECK (badge_type IN ('achievement', 'streak', 'milestone', 'special')),
  requirement_type TEXT CHECK (requirement_type IN ('orders', 'streak', 'spending')),
  requirement_value INT NOT NULL,
  points_reward INT DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Badges (Earned)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Daily Check-ins (Streaks)
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE DEFAULT CURRENT_DATE,
  points_earned INT DEFAULT 0,
  bonus_multiplier DECIMAL(3,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Add Gamification Columns to Profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_checkin_date DATE,
ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges_count INT DEFAULT 0;

-- ============================================
-- 3. RLS POLICIES (With Drop Statements)
-- ============================================

-- Enable RLS
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Group Order Policies
DROP POLICY IF EXISTS "Anyone can view open groups" ON public.group_orders;
DROP POLICY IF EXISTS "Users can create groups" ON public.group_orders;
DROP POLICY IF EXISTS "Group admins can update" ON public.group_orders;
CREATE POLICY "Anyone can view open groups" ON public.group_orders FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON public.group_orders FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group admins can update" ON public.group_orders FOR UPDATE USING (auth.uid() = created_by);

-- Group Member Policies
DROP POLICY IF EXISTS "Anyone can view members" ON public.group_order_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_order_members;
CREATE POLICY "Anyone can view members" ON public.group_order_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_order_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group Item Policies
DROP POLICY IF EXISTS "Anyone can view items" ON public.group_order_items;
DROP POLICY IF EXISTS "Members can add items" ON public.group_order_items;
CREATE POLICY "Anyone can view items" ON public.group_order_items FOR SELECT USING (true);
CREATE POLICY "Members can add items" ON public.group_order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_order_members 
    WHERE id = member_id AND user_id = auth.uid()
  )
);

-- Badge Policies
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
DROP POLICY IF EXISTS "Users can view earned badges" ON public.user_badges;
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Users can view earned badges" ON public.user_badges FOR SELECT USING (true);

-- Check-in Policies
DROP POLICY IF EXISTS "Users can view own checkins" ON public.daily_checkins;
CREATE POLICY "Users can view own checkins" ON public.daily_checkins FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 4. GAMIFICATION FUNCTIONS
-- ============================================

-- Function: Handle Daily Check-in
-- Drop first to handle return type changes
DROP FUNCTION IF EXISTS daily_checkin(UUID);

CREATE OR REPLACE FUNCTION daily_checkin(p_user_id UUID)
RETURNS TABLE (points_earned INT, new_streak INT, bonus_multiplier DECIMAL) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_checkin DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_points INT := 10; -- Base points
  v_multiplier DECIMAL := 1.0;
BEGIN
  -- Get current user stats
  SELECT last_checkin_date, current_streak, longest_streak 
  INTO v_last_checkin, v_current_streak, v_longest_streak
  FROM public.profiles WHERE user_id = p_user_id;

  -- Check if already checked in today
  IF v_last_checkin = CURRENT_DATE THEN
    RETURN QUERY SELECT 0, v_current_streak, 1.0;
    RETURN;
  END IF;

  -- Calculate Streak
  IF v_last_checkin = CURRENT_DATE - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  -- Update Longest Streak
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Calculate Multiplier (e.g., 1.1x for every day, max 2x)
  v_multiplier := LEAST(1.0 + (v_current_streak * 0.1), 2.0);
  v_points := FLOOR(v_points * v_multiplier);

  -- Insert Check-in
  INSERT INTO public.daily_checkins (user_id, checkin_date, points_earned, bonus_multiplier)
  VALUES (p_user_id, CURRENT_DATE, v_points, v_multiplier);

  -- Update Profile
  UPDATE public.profiles 
  SET 
    last_checkin_date = CURRENT_DATE,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    loyalty_points = loyalty_points + v_points,
    lifetime_points = lifetime_points + v_points
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_points, v_current_streak, v_multiplier;
END;
$$;

-- Seed some initial badges
INSERT INTO public.badges (name, description, icon, badge_type, requirement_type, requirement_value, points_reward) 
VALUES 
('Night Owl', 'Placed 5 orders after 10 PM', '🦉', 'special', 'orders', 5, 100),
('Early Bird', 'First order of the day', '☀️', 'achievement', 'orders', 1, 50),
('Streak Master', '7 Day Check-in Streak', '🔥', 'streak', 'streak', 7, 500),
('Big Spender', 'Spent over ₹1000', '💎', 'milestone', 'spending', 1000, 200)
ON CONFLICT DO NOTHING;

-- Enable Realtime for Groups (for live cart updates)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_members;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
