-- Add delivered_at timestamp to orders for tracking delivery times
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create a function to set delivered_at when order status changes to delivered
CREATE OR REPLACE FUNCTION public.set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic delivered_at timestamp
DROP TRIGGER IF EXISTS set_order_delivered_at ON public.orders;
CREATE TRIGGER set_order_delivered_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_delivered_at();

-- Create a view for runner statistics
CREATE OR REPLACE VIEW public.runner_stats AS
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