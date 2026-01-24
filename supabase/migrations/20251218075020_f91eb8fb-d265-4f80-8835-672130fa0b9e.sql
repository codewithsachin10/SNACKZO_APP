-- Create discounts table for admin promotions
CREATE TABLE public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Admin can manage discounts
CREATE POLICY "Admins can manage discounts" ON public.discounts
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can view active discounts (for checkout validation)
CREATE POLICY "Anyone can view active discounts" ON public.discounts
FOR SELECT USING (is_active = true AND now() BETWEEN valid_from AND valid_until);

-- Trigger for updated_at
CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON public.discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();