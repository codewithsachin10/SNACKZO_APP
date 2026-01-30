-- =====================================================
-- ADVANCED FEATURES MIGRATION
-- 1. Live Order Tracking
-- 2. Group Ordering
-- 3. Subscription Boxes
-- 4. Gamification (Streaks/Badges)
-- 5. In-App Chat
-- =====================================================

-- =====================================================
-- 1. LIVE ORDER TRACKING
-- =====================================================

-- Add runner location tracking columns to runners table
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8);
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8);
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Add delivery tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS runner_accepted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat DECIMAL(10, 8);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng DECIMAL(11, 8);

-- Create order_location_history table for tracking route
CREATE TABLE IF NOT EXISTS public.order_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  runner_id UUID REFERENCES public.runners(id) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_location_history ENABLE ROW LEVEL SECURITY;

-- Policy for order location history
CREATE POLICY "Users can view location history for their orders"
  ON public.order_location_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_location_history.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Runners can insert location history"
  ON public.order_location_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 2. GROUP ORDERING
-- =====================================================

-- Create group order status enum
DO $$ BEGIN
  CREATE TYPE public.group_order_status AS ENUM ('open', 'locked', 'ordered', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create group_orders table
CREATE TABLE IF NOT EXISTS public.group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status group_order_status NOT NULL DEFAULT 'open',
  invite_code TEXT UNIQUE NOT NULL,
  hostel_block TEXT NOT NULL,
  max_members INT DEFAULT 10,
  delivery_address TEXT NOT NULL,
  order_deadline TIMESTAMPTZ NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  final_order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create group_order_members table
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

-- Create group_order_items table
CREATE TABLE IF NOT EXISTS public.group_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.group_order_members(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for group orders
CREATE POLICY "Users can view group orders they're part of"
  ON public.group_orders FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_order_members
      WHERE group_order_members.group_order_id = group_orders.id
      AND group_order_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create group orders"
  ON public.group_orders FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admin can update group orders"
  ON public.group_orders FOR UPDATE
  USING (created_by = auth.uid());

-- Policies for group order members
CREATE POLICY "Members can view their group"
  ON public.group_order_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE group_orders.id = group_order_members.group_order_id
      AND group_orders.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON public.group_order_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their membership"
  ON public.group_order_members FOR UPDATE
  USING (user_id = auth.uid());

-- Policies for group order items
CREATE POLICY "Members can view group items"
  ON public.group_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_order_members
      WHERE group_order_members.id = group_order_items.member_id
      AND (
        group_order_members.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_orders
          WHERE group_orders.id = group_order_members.group_order_id
          AND group_orders.created_by = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members can add items"
  ON public.group_order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_order_members
      WHERE group_order_members.id = group_order_items.member_id
      AND group_order_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete their items"
  ON public.group_order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_order_members
      WHERE group_order_members.id = group_order_items.member_id
      AND group_order_members.user_id = auth.uid()
    )
  );

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_group_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. SUBSCRIPTION BOXES
-- =====================================================

-- Create subscription frequency enum
DO $$ BEGIN
  CREATE TYPE public.subscription_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create subscription_plans table (admin-created plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  discount_percentage INT DEFAULT 0,
  frequency subscription_frequency NOT NULL DEFAULT 'weekly',
  is_customizable BOOLEAN DEFAULT false,
  max_items INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription_plan_items (default items in a plan)
CREATE TABLE IF NOT EXISTS public.subscription_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  is_required BOOLEAN DEFAULT false
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  frequency subscription_frequency NOT NULL,
  next_delivery_date DATE NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'room',
  total_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'wallet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  pause_until DATE
);

-- Create user_subscription_items (customized items)
CREATE TABLE IF NOT EXISTS public.user_subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL
);

-- Create subscription_orders (history of delivered subscriptions)
CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view plan items"
  ON public.subscription_plan_items FOR SELECT
  USING (true);

CREATE POLICY "Users can view their subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their subscription items"
  ON public.user_subscription_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_subscriptions.id = user_subscription_items.subscription_id
      AND user_subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their subscription items"
  ON public.user_subscription_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_subscriptions.id = user_subscription_items.subscription_id
      AND user_subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their subscription orders"
  ON public.subscription_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_subscriptions.id = subscription_orders.subscription_id
      AND user_subscriptions.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. GAMIFICATION (STREAKS/BADGES)
-- =====================================================

-- Create badge_type enum
DO $$ BEGIN
  CREATE TYPE public.badge_type AS ENUM ('achievement', 'streak', 'milestone', 'special');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  badge_type badge_type NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INT NOT NULL,
  points_reward INT DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_order_date DATE,
  streak_freeze_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create daily_checkins table
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INT DEFAULT 0,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

-- Add gamification columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_checkin_date DATE;

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (is_secret = false OR EXISTS (
    SELECT 1 FROM public.user_badges
    WHERE user_badges.badge_id = badges.id
    AND user_badges.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their badges"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their streaks"
  ON public.user_streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their streaks"
  ON public.user_streaks FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their checkins"
  ON public.daily_checkins FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Insert default badges
INSERT INTO public.badges (name, description, icon, badge_type, requirement_type, requirement_value, points_reward) VALUES
  ('First Order', 'Placed your first order!', '🎉', 'achievement', 'orders', 1, 10),
  ('Regular Customer', 'Placed 10 orders', '⭐', 'milestone', 'orders', 10, 50),
  ('Super Shopper', 'Placed 50 orders', '🛒', 'milestone', 'orders', 50, 200),
  ('Century Club', 'Placed 100 orders', '💯', 'milestone', 'orders', 100, 500),
  ('3-Day Streak', 'Ordered 3 days in a row', '🔥', 'streak', 'streak', 3, 15),
  ('Week Warrior', 'Ordered 7 days in a row', '⚡', 'streak', 'streak', 7, 50),
  ('Streak Master', 'Ordered 30 days in a row', '🏆', 'streak', 'streak', 30, 300),
  ('Night Owl', 'Placed 10 orders after 10 PM', '🦉', 'achievement', 'night_orders', 10, 30),
  ('Early Bird', 'Placed 10 orders before 8 AM', '🐦', 'achievement', 'morning_orders', 10, 30),
  ('Social Butterfly', 'Referred 5 friends', '🦋', 'achievement', 'referrals', 5, 100),
  ('Review Champion', 'Left 10 product reviews', '📝', 'achievement', 'reviews', 10, 50),
  ('Big Spender', 'Spent ₹5000 total', '💰', 'milestone', 'spending', 5000, 100),
  ('Snack Master', 'Ordered from all categories', '🍿', 'achievement', 'categories', 1, 75),
  ('Loyal Customer', 'Customer for 30 days', '❤️', 'milestone', 'days_active', 30, 50),
  ('Flash Buyer', 'Bought 5 flash sale items', '⚡', 'achievement', 'flash_sales', 5, 40)
ON CONFLICT (name) DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS void AS $$
DECLARE
  badge RECORD;
  user_stats RECORD;
BEGIN
  -- Get user statistics
  SELECT 
    COALESCE(p.total_orders, 0) as total_orders,
    COALESCE(p.current_streak, 0) as current_streak,
    COALESCE(p.longest_streak, 0) as longest_streak,
    COALESCE(p.lifetime_points, 0) as lifetime_points
  INTO user_stats
  FROM profiles p
  WHERE p.user_id = p_user_id;

  -- Check each badge
  FOR badge IN SELECT * FROM badges LOOP
    -- Skip if user already has this badge
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = badge.id) THEN
      CONTINUE;
    END IF;

    -- Check if user qualifies
    IF badge.requirement_type = 'orders' AND user_stats.total_orders >= badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, badge.id);
      -- Award points
      UPDATE profiles SET loyalty_points = loyalty_points + badge.points_reward WHERE user_id = p_user_id;
    ELSIF badge.requirement_type = 'streak' AND user_stats.current_streak >= badge.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, badge.id);
      UPDATE profiles SET loyalty_points = loyalty_points + badge.points_reward WHERE user_id = p_user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for daily check-in
CREATE OR REPLACE FUNCTION daily_checkin(p_user_id UUID)
RETURNS TABLE(points_earned INT, new_streak INT, bonus_multiplier DECIMAL) AS $$
DECLARE
  v_last_checkin DATE;
  v_current_streak INT;
  v_points INT;
  v_multiplier DECIMAL;
BEGIN
  -- Get last check-in date
  SELECT last_checkin_date, current_streak INTO v_last_checkin, v_current_streak
  FROM profiles WHERE user_id = p_user_id;

  -- Check if already checked in today
  IF v_last_checkin = CURRENT_DATE THEN
    RETURN QUERY SELECT 0, COALESCE(v_current_streak, 0), 1.0::DECIMAL;
    RETURN;
  END IF;

  -- Calculate streak
  IF v_last_checkin = CURRENT_DATE - 1 THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  -- Calculate bonus multiplier based on streak
  v_multiplier := LEAST(1.0 + (v_current_streak * 0.1), 2.0);
  
  -- Calculate points (base 5, with multiplier)
  v_points := FLOOR(5 * v_multiplier);

  -- Record check-in
  INSERT INTO daily_checkins (user_id, checkin_date, points_earned, bonus_multiplier)
  VALUES (p_user_id, CURRENT_DATE, v_points, v_multiplier)
  ON CONFLICT (user_id, checkin_date) DO NOTHING;

  -- Update profile
  UPDATE profiles 
  SET 
    last_checkin_date = CURRENT_DATE,
    current_streak = v_current_streak,
    longest_streak = GREATEST(longest_streak, v_current_streak),
    loyalty_points = loyalty_points + v_points
  WHERE user_id = p_user_id;

  -- Check for streak badges
  PERFORM check_and_award_badges(p_user_id);

  RETURN QUERY SELECT v_points, v_current_streak, v_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. IN-APP CHAT
-- =====================================================

-- Create conversation_type enum
DO $$ BEGIN
  CREATE TYPE public.conversation_type AS ENUM ('order_support', 'runner_chat', 'general_support');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
  conversation_type conversation_type NOT NULL DEFAULT 'order_support',
  subject TEXT,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  user_unread_count INT DEFAULT 0,
  runner_unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'runner', 'system')),
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quick_replies table (predefined messages)
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  for_role TEXT NOT NULL CHECK (for_role IN ('user', 'runner', 'both')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Policies for chat conversations
CREATE POLICY "Users can view their conversations"
  ON public.chat_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their conversations"
  ON public.chat_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- Policies for chat messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user' AND sender_id = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view quick replies"
  ON public.quick_replies FOR SELECT
  USING (is_active = true);

-- Insert default quick replies
INSERT INTO public.quick_replies (message, category, for_role, display_order) VALUES
  ('I am on my way!', 'delivery', 'runner', 1),
  ('I will be there in 5 minutes', 'delivery', 'runner', 2),
  ('I am at the location', 'delivery', 'runner', 3),
  ('Please come to collect your order', 'delivery', 'runner', 4),
  ('Cannot find the location, please help', 'delivery', 'runner', 5),
  ('Where are you?', 'delivery', 'user', 1),
  ('Please call me when you arrive', 'delivery', 'user', 2),
  ('I am waiting at the gate', 'delivery', 'user', 3),
  ('Please leave at the door', 'delivery', 'user', 4),
  ('Thank you!', 'general', 'both', 10)
ON CONFLICT DO NOTHING;

-- Function to create or get conversation for an order
CREATE OR REPLACE FUNCTION get_or_create_order_conversation(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_runner_id UUID;
BEGIN
  -- Check if conversation exists
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE order_id = p_order_id AND user_id = p_user_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Get runner id from order
  SELECT runner_id INTO v_runner_id FROM orders WHERE id = p_order_id;

  -- Create new conversation
  INSERT INTO chat_conversations (order_id, user_id, runner_id, conversation_type, subject)
  VALUES (p_order_id, p_user_id, v_runner_id, 'runner_chat', 'Order Delivery Chat')
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_location_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_items;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_group_orders_invite_code ON public.group_orders(invite_code);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_delivery ON public.user_subscriptions(next_delivery_date);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_order_location_history_order ON public.order_location_history(order_id);
