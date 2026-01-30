/*
  # Add advanced admin features

  1. New Tables
    - `store_settings` - Store configuration (hours, fees, thresholds)
    - `discounts` - Promotional discount codes
    - `flash_sales` - Flash sale management
    - `bundle_deals` - Product bundle deals
    - `blocked_users` - Blocked/suspended users
    - `customer_insights` - Cached customer analytics

  2. Security
    - Enable RLS on all new tables
    - Admin-only access for management tables
    - Appropriate policies for each table

  3. Features
    - Store configuration management
    - Discount code creation and tracking
    - Flash sale scheduling
    - Customer blocking functionality
    - Bundle deal management
*/

-- Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operating_hours_open TEXT DEFAULT '09:00',
  operating_hours_close TEXT DEFAULT '21:00',
  is_open BOOLEAN DEFAULT true,
  delivery_fee DECIMAL(10,2) DEFAULT 50,
  free_delivery_threshold DECIMAL(10,2) DEFAULT 500,
  low_stock_threshold INT DEFAULT 5,
  auto_notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- Discount Codes Table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT,
  used_count INT DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Flash Sales Table
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  discount_percentage INT,
  quantity_available INT NOT NULL,
  quantity_sold INT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bundle Deals Table
CREATE TABLE IF NOT EXISTS public.bundle_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bundle_price DECIMAL(10,2) NOT NULL,
  regular_price DECIMAL(10,2),
  discount_percentage INT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bundle Deal Products (junction table)
CREATE TABLE IF NOT EXISTS public.bundle_deal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_deal_id UUID REFERENCES public.bundle_deals(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  unblocked_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Customer Insights (for caching analytics)
CREATE TABLE IF NOT EXISTS public.customer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;

-- Store Settings Policies (admin only)
CREATE POLICY "Admins can view store settings"
  ON public.store_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert store settings"
  ON public.store_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Discounts Policies
CREATE POLICY "Anyone can view active discounts"
  ON public.discounts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all discounts"
  ON public.discounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage discounts"
  ON public.discounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Flash Sales Policies
CREATE POLICY "Anyone can view active flash sales"
  ON public.flash_sales FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all flash sales"
  ON public.flash_sales FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage flash sales"
  ON public.flash_sales FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Bundle Deals Policies
CREATE POLICY "Anyone can view active bundles"
  ON public.bundle_deals FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all bundles"
  ON public.bundle_deals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bundles"
  ON public.bundle_deals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Bundle Deal Items Policies
CREATE POLICY "Anyone can view active bundle items"
  ON public.bundle_deal_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bundle_deals
    WHERE bundle_deals.id = bundle_deal_items.bundle_deal_id
    AND bundle_deals.is_active = true
  ));

CREATE POLICY "Admins can manage bundle items"
  ON public.bundle_deal_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.bundle_deals
    WHERE bundle_deals.id = bundle_deal_items.bundle_deal_id
    AND public.has_role(bundle_deals.created_by, 'admin')
  ));

-- Blocked Users Policies (admin only)
CREATE POLICY "Admins can view blocked users"
  ON public.blocked_users FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage blocked users"
  ON public.blocked_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Customer Insights Policies
CREATE POLICY "Users can view their own insights"
  ON public.customer_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all insights"
  ON public.customer_insights FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_flash_sales_updated_at
  BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bundle_deals_updated_at
  BEFORE UPDATE ON public.bundle_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customer_insights_updated_at
  BEFORE UPDATE ON public.customer_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
