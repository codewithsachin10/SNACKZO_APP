-- Add Delivery Enhancement Features
-- 1. Estimated Delivery Time
-- 2. Runner Rating System
-- 3. Order Issue Reporting
-- 4. Reorder Suggestions

-- ============================================
-- 1. ESTIMATED DELIVERY TIME
-- ============================================

-- Add delivery estimate columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS actual_delivery_minutes INT;

-- Create delivery metrics table for ML-based estimates
CREATE TABLE IF NOT EXISTS public.delivery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  distance_meters INT,
  time_of_day TEXT, -- morning, afternoon, evening, night
  day_of_week INT, -- 0-6
  weather_condition TEXT DEFAULT 'normal',
  estimated_minutes INT,
  actual_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to calculate estimated delivery time
CREATE OR REPLACE FUNCTION public.calculate_delivery_estimate(
  p_runner_id UUID DEFAULT NULL,
  p_time_of_day TEXT DEFAULT 'afternoon'
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_time INT := 15; -- Base delivery time in minutes
  runner_avg INT;
  time_modifier DECIMAL := 1.0;
  pending_orders INT;
  result INT;
BEGIN
  -- Get runner's average delivery time if assigned
  IF p_runner_id IS NOT NULL THEN
    SELECT COALESCE(AVG(actual_minutes), 15)::INT INTO runner_avg
    FROM public.delivery_metrics
    WHERE runner_id = p_runner_id
    AND actual_minutes IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';
    
    IF runner_avg IS NOT NULL THEN
      base_time := runner_avg;
    END IF;
    
    -- Count pending orders for this runner
    SELECT COUNT(*) INTO pending_orders
    FROM public.orders
    WHERE runner_id = p_runner_id
    AND status IN ('packed', 'out_for_delivery');
    
    -- Add 5 minutes per pending order
    base_time := base_time + (pending_orders * 5);
  END IF;
  
  -- Apply time of day modifier
  CASE p_time_of_day
    WHEN 'morning' THEN time_modifier := 0.9;
    WHEN 'afternoon' THEN time_modifier := 1.0;
    WHEN 'evening' THEN time_modifier := 1.2; -- Peak hours
    WHEN 'night' THEN time_modifier := 1.1;
    ELSE time_modifier := 1.0;
  END CASE;
  
  result := (base_time * time_modifier)::INT;
  
  -- Ensure minimum 10 minutes, maximum 60 minutes
  RETURN GREATEST(10, LEAST(60, result));
END;
$$;

-- ============================================
-- 2. RUNNER RATING SYSTEM
-- ============================================

-- Create runner ratings table
CREATE TABLE IF NOT EXISTS public.runner_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  runner_id UUID REFERENCES public.runners(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  delivery_speed_rating INT CHECK (delivery_speed_rating >= 1 AND delivery_speed_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  package_condition_rating INT CHECK (package_condition_rating >= 1 AND package_condition_rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add average rating to runners table
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;

-- Function to update runner's average rating
CREATE OR REPLACE FUNCTION public.update_runner_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_avg DECIMAL(3,2);
  total_count INT;
BEGIN
  -- Calculate new average
  SELECT AVG(rating)::DECIMAL(3,2), COUNT(*)
  INTO new_avg, total_count
  FROM public.runner_ratings
  WHERE runner_id = NEW.runner_id;
  
  -- Update runner's rating
  UPDATE public.runners
  SET average_rating = new_avg,
      total_ratings = total_count
  WHERE id = NEW.runner_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rating updates
DROP TRIGGER IF EXISTS on_runner_rating_change ON public.runner_ratings;
CREATE TRIGGER on_runner_rating_change
  AFTER INSERT OR UPDATE ON public.runner_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_runner_rating();

-- ============================================
-- 3. ORDER ISSUE REPORTING
-- ============================================

-- Create issue categories enum
DO $$ BEGIN
  CREATE TYPE issue_category AS ENUM (
    'wrong_item',
    'missing_item', 
    'late_delivery',
    'damaged_item',
    'wrong_quantity',
    'quality_issue',
    'rude_behavior',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create issue status enum
DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM (
    'pending',
    'investigating',
    'resolved',
    'refunded',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create order issues table
CREATE TABLE IF NOT EXISTS public.order_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category issue_category NOT NULL,
  description TEXT NOT NULL,
  image_urls TEXT[], -- Array of image URLs for proof
  status issue_status NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  refund_amount DECIMAL(10,2),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to create issue notification
CREATE OR REPLACE FUNCTION public.notify_issue_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify admins about new issue
  INSERT INTO public.notifications (user_id, title, body, type, data)
  SELECT ur.user_id, 
         'New Order Issue Reported',
         'A customer reported an issue: ' || NEW.category::TEXT,
         'order',
         jsonb_build_object('issue_id', NEW.id, 'order_id', NEW.order_id)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_issue_created ON public.order_issues;
CREATE TRIGGER on_issue_created
  AFTER INSERT ON public.order_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_issue_created();

-- ============================================
-- 4. REORDER SUGGESTIONS
-- ============================================

-- Create table to track reorder patterns
CREATE TABLE IF NOT EXISTS public.reorder_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  order_count INT DEFAULT 1,
  last_ordered_at TIMESTAMPTZ DEFAULT now(),
  avg_days_between_orders DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Function to update reorder patterns after order delivery
CREATE OR REPLACE FUNCTION public.update_reorder_patterns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item RECORD;
  prev_order_date TIMESTAMPTZ;
  days_diff DECIMAL;
BEGIN
  -- Only process when order is delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get all items from this order
    FOR item IN 
      SELECT product_id FROM public.order_items WHERE order_id = NEW.id
    LOOP
      -- Get previous order date for this product
      SELECT MAX(o.delivered_at) INTO prev_order_date
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = NEW.user_id
      AND oi.product_id = item.product_id
      AND o.status = 'delivered'
      AND o.id != NEW.id;
      
      -- Calculate days between orders
      IF prev_order_date IS NOT NULL THEN
        days_diff := EXTRACT(EPOCH FROM (NOW() - prev_order_date)) / 86400;
      END IF;
      
      -- Insert or update reorder pattern
      INSERT INTO public.reorder_patterns (user_id, product_id, order_count, last_ordered_at, avg_days_between_orders)
      VALUES (NEW.user_id, item.product_id, 1, NOW(), days_diff)
      ON CONFLICT (user_id, product_id) DO UPDATE SET
        order_count = public.reorder_patterns.order_count + 1,
        last_ordered_at = NOW(),
        avg_days_between_orders = CASE 
          WHEN public.reorder_patterns.avg_days_between_orders IS NULL THEN EXCLUDED.avg_days_between_orders
          ELSE (public.reorder_patterns.avg_days_between_orders + COALESCE(EXCLUDED.avg_days_between_orders, 0)) / 2
        END,
        updated_at = NOW();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivered_patterns ON public.orders;
CREATE TRIGGER on_order_delivered_patterns
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reorder_patterns();

-- Function to get reorder suggestions
CREATE OR REPLACE FUNCTION public.get_reorder_suggestions(p_user_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_price DECIMAL,
  product_image TEXT,
  times_ordered INT,
  days_since_last_order INT,
  suggestion_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.price as product_price,
    p.image_url as product_image,
    rp.order_count as times_ordered,
    EXTRACT(DAY FROM NOW() - rp.last_ordered_at)::INT as days_since_last_order,
    -- Score based on frequency and recency
    (rp.order_count * 10 + 
     CASE 
       WHEN EXTRACT(DAY FROM NOW() - rp.last_ordered_at) < 7 THEN 50
       WHEN EXTRACT(DAY FROM NOW() - rp.last_ordered_at) < 14 THEN 30
       WHEN EXTRACT(DAY FROM NOW() - rp.last_ordered_at) < 30 THEN 20
       ELSE 10
     END)::DECIMAL as suggestion_score
  FROM public.reorder_patterns rp
  JOIN public.products p ON p.id = rp.product_id
  WHERE rp.user_id = p_user_id
  AND p.is_available = true
  AND p.stock > 0
  ORDER BY suggestion_score DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE public.delivery_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runner_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_patterns ENABLE ROW LEVEL SECURITY;

-- Delivery metrics policies
CREATE POLICY "Users can view delivery metrics for their orders" ON public.delivery_metrics
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert delivery metrics" ON public.delivery_metrics
  FOR INSERT WITH CHECK (true);

-- Runner ratings policies
CREATE POLICY "Users can view all ratings" ON public.runner_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can rate their own orders" ON public.runner_ratings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid() AND status = 'delivered')
  );

CREATE POLICY "Users can update their own ratings" ON public.runner_ratings
  FOR UPDATE USING (user_id = auth.uid());

-- Order issues policies
CREATE POLICY "Users can view their own issues" ON public.order_issues
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all issues" ON public.order_issues
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

CREATE POLICY "Users can report issues on their orders" ON public.order_issues
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update issues" ON public.order_issues
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- Reorder patterns policies
CREATE POLICY "Users can view their own patterns" ON public.reorder_patterns
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_delivery_metrics_runner ON public.delivery_metrics(runner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_metrics_order ON public.delivery_metrics(order_id);
CREATE INDEX IF NOT EXISTS idx_runner_ratings_runner ON public.runner_ratings(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_ratings_order ON public.runner_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_order ON public.order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON public.order_issues(status);
CREATE INDEX IF NOT EXISTS idx_reorder_patterns_user ON public.reorder_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_patterns_product ON public.reorder_patterns(product_id);

-- ============================================
-- DONE
-- ============================================
