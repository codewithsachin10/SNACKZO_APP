-- Premium Features Migration
-- Includes: Product Search Enhancement, Order Scheduling, Live Tracking, 
-- Split Payment, Order History Timeline, Flash Deals, Price Alerts, 
-- Spin Wheel, Achievement Display, Social Sharing

-- ============================================
-- 1. FEATURE TOGGLES (Admin Controllable)
-- ============================================

CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default feature toggles
INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled, config) VALUES
  ('flash_deals', 'Flash Deals & Coupons', 'Time-limited deals and promotional offers', true, '{"max_active_deals": 5}'),
  ('price_alerts', 'Price Drop Alerts', 'Allow users to set price drop notifications', true, '{"max_alerts_per_user": 10}'),
  ('spin_wheel', 'Spin the Wheel', 'Daily spin wheel for rewards', true, '{"spins_per_day": 1, "cooldown_hours": 24}'),
  ('scheduled_orders', 'Order Scheduling', 'Allow scheduling orders for later', true, '{"max_days_ahead": 7}'),
  ('split_payment', 'Split Payment', 'Pay with multiple methods', true, '{}'),
  ('live_tracking', 'Live Runner Tracking', 'Real-time map tracking', true, '{}'),
  ('social_sharing', 'Social Sharing', 'Share products and orders', true, '{}')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================
-- 2. PRODUCT IMAGES (Multiple images per product)
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- ============================================
-- 3. SEARCH HISTORY & SUGGESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INT DEFAULT 0,
  clicked_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, created_at DESC);

-- Popular searches materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.popular_searches AS
SELECT 
  query,
  COUNT(*) as search_count,
  MAX(created_at) as last_searched
FROM public.search_history
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY query
ORDER BY search_count DESC
LIMIT 20;

-- ============================================
-- 4. SCHEDULED ORDERS
-- ============================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recurring_frequency TEXT; -- daily, weekly, monthly
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id);

CREATE TABLE IF NOT EXISTS public.recurring_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB NOT NULL, -- [{product_id, quantity}]
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  preferred_time TIME DEFAULT '18:00',
  preferred_day INT, -- 0-6 for weekly, 1-28 for monthly
  delivery_mode TEXT DEFAULT 'room',
  is_active BOOLEAN DEFAULT true,
  next_order_date DATE,
  last_order_date DATE,
  total_orders INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. RUNNER LOCATION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.runner_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES public.runners(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  battery_level INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runner_locations_runner ON public.runner_locations(runner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runner_locations_order ON public.runner_locations(order_id);

-- Keep only last 100 locations per runner for performance
CREATE OR REPLACE FUNCTION public.cleanup_old_runner_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.runner_locations
  WHERE runner_id = NEW.runner_id
    AND id NOT IN (
      SELECT id FROM public.runner_locations
      WHERE runner_id = NEW.runner_id
      ORDER BY created_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_runner_locations_trigger ON public.runner_locations;
CREATE TRIGGER cleanup_runner_locations_trigger
  AFTER INSERT ON public.runner_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_runner_locations();

-- ============================================
-- 6. SPLIT PAYMENT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL, -- wallet, card, upi, loyalty_points, cod
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);

-- ============================================
-- 7. FLASH DEALS & TIME-LIMITED OFFERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.flash_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('percentage', 'fixed', 'bogo', 'bundle')),
  discount_value DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  deal_price DECIMAL(10, 2),
  quantity_limit INT, -- Max items that can be sold at deal price
  quantity_sold INT DEFAULT 0,
  per_user_limit INT DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  banner_image TEXT,
  priority INT DEFAULT 0, -- Higher = more prominent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON public.flash_deals(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_flash_deals_product ON public.flash_deals(product_id);

-- User flash deal claims
CREATE TABLE IF NOT EXISTS public.flash_deal_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.flash_deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id, order_id)
);

-- ============================================
-- 8. PRICE DROP ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON public.price_alerts(product_id, is_active);

-- Price history for charts
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id, recorded_at DESC);

-- Trigger to record price changes
CREATE OR REPLACE FUNCTION public.record_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (product_id, price, recorded_at)
    VALUES (NEW.id, NEW.price, now());
    
    -- Trigger price alerts
    UPDATE public.price_alerts
    SET triggered_at = now(), notification_sent = false
    WHERE product_id = NEW.id
      AND is_active = true
      AND target_price >= NEW.price
      AND triggered_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_product_price_change ON public.products;
CREATE TRIGGER on_product_price_change
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.record_price_change();

-- ============================================
-- 9. SPIN THE WHEEL REWARDS
-- ============================================

CREATE TABLE IF NOT EXISTS public.spin_wheel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'discount', 'free_delivery', 'product', 'nothing', 'cashback')),
  reward_value DECIMAL(10, 2),
  reward_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  probability DECIMAL(5, 4) NOT NULL, -- 0.0001 to 1.0000
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default wheel segments
INSERT INTO public.spin_wheel_segments (label, reward_type, reward_value, probability, color, display_order) VALUES
  ('🎉 50 Points', 'points', 50, 0.20, '#22c55e', 1),
  ('💸 10% Off', 'discount', 10, 0.15, '#3b82f6', 2),
  ('🚚 Free Delivery', 'free_delivery', 0, 0.10, '#8b5cf6', 3),
  ('⭐ 100 Points', 'points', 100, 0.10, '#f59e0b', 4),
  ('😅 Try Again', 'nothing', 0, 0.25, '#6b7280', 5),
  ('💰 20% Off', 'discount', 20, 0.08, '#ec4899', 6),
  ('🎁 25 Points', 'points', 25, 0.10, '#14b8a6', 7),
  ('🤑 ₹50 Cashback', 'cashback', 50, 0.02, '#ef4444', 8)
ON CONFLICT DO NOTHING;

-- User spin history
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.spin_wheel_segments(id) ON DELETE CASCADE,
  reward_claimed BOOLEAN DEFAULT false,
  reward_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spin_history_user ON public.spin_history(user_id, created_at DESC);

-- Function to check if user can spin
CREATE OR REPLACE FUNCTION public.can_user_spin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  last_spin TIMESTAMPTZ;
  cooldown_hours INT := 24;
BEGIN
  SELECT created_at INTO last_spin
  FROM public.spin_history
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF last_spin IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (now() - last_spin) > (cooldown_hours || ' hours')::INTERVAL;
END;
$$;

-- Function to perform spin
CREATE OR REPLACE FUNCTION public.perform_spin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_segment RECORD;
  random_val DECIMAL;
  cumulative DECIMAL := 0;
  result JSONB;
BEGIN
  -- Check if user can spin
  IF NOT public.can_user_spin(p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please wait before spinning again');
  END IF;
  
  -- Select random segment based on probability
  random_val := random();
  
  FOR selected_segment IN 
    SELECT * FROM public.spin_wheel_segments 
    WHERE is_active = true 
    ORDER BY display_order
  LOOP
    cumulative := cumulative + selected_segment.probability;
    IF random_val <= cumulative THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Record the spin
  INSERT INTO public.spin_history (user_id, segment_id, expires_at)
  VALUES (p_user_id, selected_segment.id, now() + INTERVAL '7 days');
  
  -- Apply instant rewards (points, cashback)
  IF selected_segment.reward_type = 'points' THEN
    UPDATE public.profiles 
    SET loyalty_points = COALESCE(loyalty_points, 0) + selected_segment.reward_value::INT
    WHERE id = p_user_id;
  ELSIF selected_segment.reward_type = 'cashback' THEN
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + selected_segment.reward_value
    WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'segment', jsonb_build_object(
      'id', selected_segment.id,
      'label', selected_segment.label,
      'reward_type', selected_segment.reward_type,
      'reward_value', selected_segment.reward_value,
      'color', selected_segment.color
    )
  );
END;
$$;

-- ============================================
-- 10. ORDER HISTORY & SPENDING ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_spending_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  total_spent DECIMAL(10, 2) DEFAULT 0,
  order_count INT DEFAULT 0,
  category_breakdown JSONB DEFAULT '{}',
  most_ordered_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  savings_from_deals DECIMAL(10, 2) DEFAULT 0,
  loyalty_points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Function to update spending stats
CREATE OR REPLACE FUNCTION public.update_spending_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  month_start DATE;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    month_start := date_trunc('month', NEW.created_at)::DATE;
    
    INSERT INTO public.user_spending_stats (user_id, month, total_spent, order_count, average_order_value)
    VALUES (NEW.user_id, month_start, NEW.total, 1, NEW.total)
    ON CONFLICT (user_id, month) DO UPDATE SET
      total_spent = public.user_spending_stats.total_spent + EXCLUDED.total_spent,
      order_count = public.user_spending_stats.order_count + 1,
      average_order_value = (public.user_spending_stats.total_spent + EXCLUDED.total_spent) / (public.user_spending_stats.order_count + 1),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivered_stats ON public.orders;
CREATE TRIGGER on_order_delivered_stats
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spending_stats();

-- ============================================
-- 11. SOCIAL SHARING & ACHIEVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('product', 'order', 'achievement', 'referral')),
  content_id UUID,
  share_platform TEXT, -- whatsapp, instagram, twitter, copy_link
  share_url TEXT,
  views INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_content_user ON public.shared_content(user_id);

-- Achievement showcase preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS showcase_badges UUID[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'friends' CHECK (profile_visibility IN ('public', 'friends', 'private'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_spending_stats BOOLEAN DEFAULT false;

-- ============================================
-- 12. RLS POLICIES
-- ============================================

-- Feature toggles (public read, admin write)
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feature toggles" ON public.feature_toggles FOR SELECT USING (true);
CREATE POLICY "Admins can manage feature toggles" ON public.feature_toggles FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Product images (public read)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON public.product_images FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Search history (users own)
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own search history" ON public.search_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recurring order templates
ALTER TABLE public.recurring_order_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON public.recurring_order_templates FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Runner locations (runners and order owners)
ALTER TABLE public.runner_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view runner location for their orders" ON public.runner_locations FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );
CREATE POLICY "System can insert runner locations" ON public.runner_locations FOR INSERT
  WITH CHECK (true);

-- Order payments
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order payments" ON public.order_payments FOR SELECT
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));
CREATE POLICY "System can manage order payments" ON public.order_payments FOR ALL
  USING (true) WITH CHECK (true);

-- Flash deals (public read)
ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active flash deals" ON public.flash_deals FOR SELECT USING (true);
CREATE POLICY "Admins can manage flash deals" ON public.flash_deals FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Flash deal claims
ALTER TABLE public.flash_deal_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own claims" ON public.flash_deal_claims FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can claim deals" ON public.flash_deal_claims FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Price alerts
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own price alerts" ON public.price_alerts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Price history (public read)
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);

-- Spin wheel segments (public read)
ALTER TABLE public.spin_wheel_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spin segments" ON public.spin_wheel_segments FOR SELECT USING (true);
CREATE POLICY "Admins can manage spin segments" ON public.spin_wheel_segments FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Spin history
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spin history" ON public.spin_history FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "System can insert spin history" ON public.spin_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User spending stats
ALTER TABLE public.user_spending_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spending stats" ON public.user_spending_stats FOR SELECT
  USING (user_id = auth.uid());

-- Shared content
ALTER TABLE public.shared_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shared content" ON public.shared_content FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Public can view shared content" ON public.shared_content FOR SELECT USING (true);

-- ============================================
-- 13. HELPER FUNCTIONS
-- ============================================

-- Get active flash deals
CREATE OR REPLACE FUNCTION public.get_active_flash_deals()
RETURNS SETOF public.flash_deals
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT * FROM public.flash_deals
  WHERE is_active = true
    AND starts_at <= now()
    AND ends_at > now()
    AND (quantity_limit IS NULL OR quantity_sold < quantity_limit)
  ORDER BY priority DESC, ends_at ASC;
$$;

-- Get user's spending analytics
CREATE OR REPLACE FUNCTION public.get_spending_analytics(p_user_id UUID, p_months INT DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'monthly_data', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'month', to_char(month, 'Mon YYYY'),
        'total_spent', total_spent,
        'order_count', order_count,
        'average_order', average_order_value
      ) ORDER BY month DESC)
      FROM public.user_spending_stats
      WHERE user_id = p_user_id
        AND month >= date_trunc('month', now() - (p_months || ' months')::INTERVAL)
    ), '[]'::jsonb),
    'total_lifetime_spent', COALESCE((
      SELECT SUM(total_spent) FROM public.user_spending_stats WHERE user_id = p_user_id
    ), 0),
    'total_orders', COALESCE((
      SELECT SUM(order_count) FROM public.user_spending_stats WHERE user_id = p_user_id
    ), 0),
    'current_month', COALESCE((
      SELECT jsonb_build_object('spent', total_spent, 'orders', order_count)
      FROM public.user_spending_stats
      WHERE user_id = p_user_id AND month = date_trunc('month', now())::DATE
    ), '{"spent": 0, "orders": 0}'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Check if feature is enabled
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(is_enabled, false) FROM public.feature_toggles WHERE feature_key = p_feature_key;
$$;

-- Get feature config
CREATE OR REPLACE FUNCTION public.get_feature_config(p_feature_key TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(config, '{}'::jsonb) FROM public.feature_toggles WHERE feature_key = p_feature_key;
$$;

-- ============================================
-- DONE: Premium features migration complete
-- ============================================
