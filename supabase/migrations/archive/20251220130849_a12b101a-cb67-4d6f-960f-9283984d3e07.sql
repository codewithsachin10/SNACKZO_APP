-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.runner_stats;

CREATE VIEW public.runner_stats 
WITH (security_invoker = true)
AS
SELECT 
  r.id as runner_id,
  r.name as runner_name,
  r.phone,
  r.is_active,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as total_deliveries,
  COUNT(CASE WHEN o.status IN ('packed', 'out_for_delivery') THEN 1 END) as pending_deliveries,
  ROUND(AVG(
    CASE 
      WHEN o.status = 'delivered' AND o.delivered_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60 
    END
  )::numeric, 1) as avg_delivery_time_mins,
  MAX(o.delivered_at) as last_delivery_at
FROM public.runners r
LEFT JOIN public.orders o ON r.id = o.runner_id
GROUP BY r.id, r.name, r.phone, r.is_active;