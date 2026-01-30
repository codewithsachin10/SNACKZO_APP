-- Add Express Delivery Feature
-- Run this in Supabase SQL Editor

-- ========================================
-- ADD EXPRESS DELIVERY COLUMN TO ORDERS
-- ========================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT false;

-- Add index for express orders
CREATE INDEX IF NOT EXISTS idx_orders_is_express ON public.orders(is_express) WHERE is_express = true;

-- ========================================
-- ENHANCED DELIVERY ESTIMATES
-- ========================================
-- Update delivery_estimates table to support express delivery
ALTER TABLE public.delivery_estimates ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT false;
ALTER TABLE public.delivery_estimates ADD COLUMN IF NOT EXISTS order_queue_count INT DEFAULT 0;
ALTER TABLE public.delivery_estimates ADD COLUMN IF NOT EXISTS traffic_level TEXT CHECK (traffic_level IN ('low', 'medium', 'high'));

-- ========================================
-- EXPRESS DELIVERY STATISTICS VIEW
-- ========================================
CREATE OR REPLACE VIEW public.express_delivery_stats AS
SELECT 
  DATE(created_at) as delivery_date,
  COUNT(*) FILTER (WHERE is_express = true) as express_orders,
  COUNT(*) FILTER (WHERE is_express = false) as regular_orders,
  AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (
    WHERE is_express = true AND delivered_at IS NOT NULL
  ) as avg_express_delivery_time,
  AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (
    WHERE is_express = false AND delivered_at IS NOT NULL
  ) as avg_regular_delivery_time,
  COUNT(*) FILTER (
    WHERE is_express = true 
    AND delivered_at IS NOT NULL 
    AND EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60 <= 10
  ) as express_on_time_count,
  COUNT(*) FILTER (
    WHERE is_express = true 
    AND delivered_at IS NOT NULL
  ) as express_total_delivered
FROM public.orders
WHERE status = 'delivered'
GROUP BY DATE(created_at)
ORDER BY delivery_date DESC;

-- ========================================
-- FUNCTION: UPDATE DELIVERY ESTIMATE
-- ========================================
CREATE OR REPLACE FUNCTION public.update_delivery_estimate(
  p_order_id UUID,
  p_estimated_minutes INT,
  p_is_express BOOLEAN DEFAULT false,
  p_queue_count INT DEFAULT 0,
  p_traffic_level TEXT DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.delivery_estimates (
    order_id,
    estimated_delivery_at,
    is_express,
    order_queue_count,
    traffic_level,
    updated_at
  )
  VALUES (
    p_order_id,
    NOW() + (p_estimated_minutes || ' minutes')::INTERVAL,
    p_is_express,
    p_queue_count,
    p_traffic_level,
    NOW()
  )
  ON CONFLICT (order_id) 
  DO UPDATE SET
    estimated_delivery_at = NOW() + (p_estimated_minutes || ' minutes')::INTERVAL,
    is_express = p_is_express,
    order_queue_count = p_queue_count,
    traffic_level = p_traffic_level,
    updated_at = NOW();
END;
$$;

-- ========================================
-- RLS POLICIES
-- ========================================
-- Users can view their own order delivery estimates
CREATE POLICY IF NOT EXISTS "Users can view their delivery estimates"
  ON public.delivery_estimates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = delivery_estimates.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can view all delivery estimates
CREATE POLICY IF NOT EXISTS "Admins can view all delivery estimates"
  ON public.delivery_estimates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON COLUMN public.orders.is_express IS 'Indicates if this is an express delivery order (10-minute guarantee)';
COMMENT ON VIEW public.express_delivery_stats IS 'Statistics for express vs regular delivery performance';
