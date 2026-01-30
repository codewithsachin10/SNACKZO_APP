-- Fix Security Advisor Warnings
-- 1. Fix function search_path for all flagged functions
-- 2. Move pg_net extension to extensions schema
-- 3. Fix overly permissive RLS policies

-- ============================================
-- 1. FIX FUNCTION SEARCH_PATH (set to empty string for security)
-- ============================================

-- Drop functions first to allow return type changes
DROP FUNCTION IF EXISTS public.generate_group_invite_code();
DROP FUNCTION IF EXISTS public.check_and_award_badges(UUID);
DROP FUNCTION IF EXISTS public.daily_checkin(UUID);
DROP FUNCTION IF EXISTS public.get_or_create_order_conversation(UUID);
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS public.generate_referral_code();
DROP FUNCTION IF EXISTS public.process_referral_reward() CASCADE;
DROP FUNCTION IF EXISTS public.add_loyalty_points(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS public.redeem_loyalty_points(UUID, INT, UUID);
DROP FUNCTION IF EXISTS public.trigger_welcome_email() CASCADE;

-- Fix generate_group_invite_code
CREATE OR REPLACE FUNCTION public.generate_group_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.group_orders WHERE invite_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- Fix check_and_award_badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  badge RECORD;
  order_count INT;
  total_spent NUMERIC;
  streak_days INT;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO order_count FROM public.orders WHERE user_id = p_user_id AND status = 'delivered';
  SELECT COALESCE(SUM(total), 0) INTO total_spent FROM public.orders WHERE user_id = p_user_id AND status = 'delivered';
  SELECT COALESCE(current_streak, 0) INTO streak_days FROM public.user_streaks WHERE user_id = p_user_id;
  
  -- Check each badge
  FOR badge IN SELECT * FROM public.badges WHERE is_active = true LOOP
    -- Skip if already earned
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = badge.id
    );
    
    -- Check criteria
    IF (badge.criteria_type = 'orders' AND order_count >= badge.criteria_value) OR
       (badge.criteria_type = 'spending' AND total_spent >= badge.criteria_value) OR
       (badge.criteria_type = 'streak' AND streak_days >= badge.criteria_value) THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, badge.id);
    END IF;
  END LOOP;
END;
$$;

-- Fix daily_checkin
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  streak RECORD;
  points_earned INT := 10;
  result JSON;
BEGIN
  SELECT * INTO streak FROM public.user_streaks WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_checkin)
    VALUES (p_user_id, 1, 1, CURRENT_DATE)
    RETURNING * INTO streak;
    points_earned := 10;
  ELSIF streak.last_checkin = CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'message', 'Already checked in today', 'streak', streak.current_streak);
  ELSIF streak.last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.user_streaks 
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_checkin = CURRENT_DATE,
        total_checkins = total_checkins + 1
    WHERE user_id = p_user_id
    RETURNING * INTO streak;
    points_earned := 10 + (streak.current_streak * 2);
  ELSE
    UPDATE public.user_streaks 
    SET current_streak = 1,
        last_checkin = CURRENT_DATE,
        total_checkins = total_checkins + 1
    WHERE user_id = p_user_id
    RETURNING * INTO streak;
    points_earned := 10;
  END IF;
  
  -- Award points
  UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points, 0) + points_earned WHERE id = p_user_id;
  
  -- Check for badges
  PERFORM public.check_and_award_badges(p_user_id);
  
  RETURN json_build_object(
    'success', true, 
    'streak', streak.current_streak, 
    'points_earned', points_earned,
    'total_checkins', streak.total_checkins
  );
END;
$$;

-- Fix get_or_create_order_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_order_conversation(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  conv_id UUID;
  order_record RECORD;
BEGIN
  SELECT id INTO conv_id FROM public.chat_conversations WHERE order_id = p_order_id LIMIT 1;
  
  IF conv_id IS NULL THEN
    SELECT * INTO order_record FROM public.orders WHERE id = p_order_id;
    IF order_record IS NULL THEN
      RAISE EXCEPTION 'Order not found';
    END IF;
    
    INSERT INTO public.chat_conversations (order_id, customer_id, runner_id)
    VALUES (p_order_id, order_record.user_id, order_record.runner_id)
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$;

-- Fix get_unread_notification_count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  count_val INT;
BEGIN
  SELECT COUNT(*) INTO count_val 
  FROM public.notifications 
  WHERE user_id = p_user_id AND is_read = false AND is_archived = false;
  RETURN count_val;
END;
$$;

-- Fix mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.notifications SET is_read = true WHERE user_id = p_user_id AND is_read = false;
END;
$$;

-- Fix generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'REF' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- Fix process_referral_reward
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  referral RECORD;
  reward_amount INT := 50;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    SELECT rc.* INTO referral 
    FROM public.referral_codes rc
    JOIN public.referrals r ON r.referral_code_id = rc.id
    WHERE r.referred_id = NEW.user_id AND r.status = 'pending'
    LIMIT 1;
    
    IF FOUND THEN
      -- Reward referrer
      UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points, 0) + reward_amount WHERE id = referral.user_id;
      -- Reward referred user
      UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points, 0) + reward_amount WHERE id = NEW.user_id;
      -- Mark referral as completed
      UPDATE public.referrals SET status = 'completed', completed_at = NOW() WHERE referred_id = NEW.user_id AND status = 'pending';
      -- Update referral code stats
      UPDATE public.referral_codes SET successful_referrals = successful_referrals + 1 WHERE id = referral.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix add_loyalty_points
CREATE OR REPLACE FUNCTION public.add_loyalty_points(p_user_id UUID, p_points INT, p_reason TEXT DEFAULT 'order')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET loyalty_points = COALESCE(loyalty_points, 0) + p_points WHERE id = p_user_id;
  
  INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
  VALUES (p_user_id, p_points, 'earn', p_reason);
END;
$$;

-- Fix redeem_loyalty_points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(p_user_id UUID, p_points INT, p_reward_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_points INT;
BEGIN
  SELECT loyalty_points INTO current_points FROM public.profiles WHERE id = p_user_id;
  
  IF current_points < p_points THEN
    RETURN false;
  END IF;
  
  UPDATE public.profiles SET loyalty_points = loyalty_points - p_points WHERE id = p_user_id;
  
  INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description, reward_id)
  VALUES (p_user_id, -p_points, 'redeem', 'Points redeemed', p_reward_id);
  
  RETURN true;
END;
$$;

-- Fix trigger_welcome_email (recreate with search_path)
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert a notification for the new user
  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (NEW.id, 'Welcome to Hostel Mart!', 'Thanks for signing up. Start shopping now!', 'general');
  RETURN NEW;
END;
$$;

-- Recreate the trigger that was dropped with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();

-- Recreate process_referral_reward trigger if it was dropped
DROP TRIGGER IF EXISTS on_order_delivered_referral ON public.orders;
CREATE TRIGGER on_order_delivered_referral
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_referral_reward();

-- ============================================
-- 2. MOVE pg_net EXTENSION TO extensions SCHEMA
-- ============================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to relevant roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Moving pg_net requires dropping and recreating it
-- This may fail if pg_net is in use - run manually if needed
DO $$
BEGIN
  -- Try to move the extension
  DROP EXTENSION IF EXISTS pg_net;
  CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_net extension: %. You may need to do this manually.', SQLERRM;
END;
$$;

-- ============================================
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================

-- Fix chat_conversations: Runners can update conversations
DROP POLICY IF EXISTS "Runners can update conversations" ON public.chat_conversations;
CREATE POLICY "Runners can update conversations" ON public.chat_conversations
  FOR UPDATE
  USING (runner_id = auth.uid())
  WITH CHECK (runner_id = auth.uid());

-- Fix group_order_items: Members can delete their items
-- The table uses member_id which references group_order_members, not user_id directly
DROP POLICY IF EXISTS "Members can delete their items" ON public.group_order_items;
CREATE POLICY "Members can delete their items" ON public.group_order_items
  FOR DELETE
  USING (
    member_id IN (
      SELECT id FROM public.group_order_members WHERE user_id = auth.uid()
    )
  );

-- Fix group_order_items: Members can update their items
DROP POLICY IF EXISTS "Members can update their items" ON public.group_order_items;
CREATE POLICY "Members can update their items" ON public.group_order_items
  FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM public.group_order_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.group_order_members WHERE user_id = auth.uid()
    )
  );

-- Fix notifications: Admin insert notifications (restrict to admins)
DROP POLICY IF EXISTS "Admin insert notifications" ON public.notifications;
CREATE POLICY "Admin insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Fix notifications: Can insert notifications (authenticated users for their own)
DROP POLICY IF EXISTS "Can insert notifications" ON public.notifications;
CREATE POLICY "Can insert notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Note: Service role bypasses RLS, so no separate policy needed
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Fix runner_achieved_badges: Public access achieved badges
-- Runners use phone-based auth, not auth.uid(), so we keep SELECT public but remove write permissions
DROP POLICY IF EXISTS "Public access achieved badges" ON public.runner_achieved_badges;
DROP POLICY IF EXISTS "Runners can manage their badges" ON public.runner_achieved_badges;
CREATE POLICY "Anyone can view achieved badges" ON public.runner_achieved_badges
  FOR SELECT
  USING (true);

-- INSERT/UPDATE for runner_achieved_badges should be done by system/triggers only

-- Fix runner_shifts: Public access policy
-- Runners use phone-based auth, not auth.uid(), so we keep SELECT public
DROP POLICY IF EXISTS "Public access policy" ON public.runner_shifts;
DROP POLICY IF EXISTS "Runners can manage their shifts" ON public.runner_shifts;
CREATE POLICY "Anyone can view shifts" ON public.runner_shifts
  FOR SELECT
  USING (true);

-- Note: Runner write operations are handled through the runner dashboard with phone-based lookup

-- Fix runners: Public update runners
-- Runners use phone-based auth, not auth.uid(), so we just remove the permissive policy
DROP POLICY IF EXISTS "Public update runners" ON public.runners;
-- Note: Runner updates are handled through the runner dashboard with phone-based lookup

-- Fix store_config: Admin Update Config
DROP POLICY IF EXISTS "Admin Update Config" ON public.store_config;
CREATE POLICY "Admin Update Config" ON public.store_config
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Fix wallet_transactions: Users can insert their own transactions
-- Note: Service role bypasses RLS for system operations
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- DONE: Security warnings fixed
-- ============================================
-- Note: "Leaked Password Protection" must be enabled in Supabase Dashboard:
-- Settings > Auth > Security > Enable "Leaked password protection"
