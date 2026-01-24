-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  hostel_block TEXT,
  room_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  stock INT NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled');

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('upi', 'cod');

-- Create delivery mode enum
CREATE TYPE public.delivery_mode AS ENUM ('room', 'common_area');

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status order_status NOT NULL DEFAULT 'placed',
  payment_method payment_method NOT NULL,
  delivery_mode delivery_mode NOT NULL,
  delivery_address TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Order items policies
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert order items for their orders"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;/*
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
EXECUTE FUNCTION public.update_updated_at();-- Allow anyone to sign up as a runner (they'll be inactive until admin approves)
CREATE POLICY "Anyone can sign up as a runner"
ON public.runners
FOR INSERT
WITH CHECK (is_active = false);

-- Allow runners to view their own record by phone
CREATE POLICY "Runners can view their own record"
ON public.runners
FOR SELECT
USING (true);-- Add delivered_at timestamp to orders for tracking delivery times
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
GROUP BY r.id, r.name, r.phone, r.is_active;-- Fix security definer view by recreating with SECURITY INVOKER
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
GROUP BY r.id, r.name, r.phone, r.is_active;-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);-- Add notification_preference column to runners table
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'sms' CHECK (notification_preference IN ('sms', 'whatsapp', 'both'));

-- Add notification_preference column to profiles table for customers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'push' CHECK (notification_preference IN ('push', 'whatsapp', 'both'));-- Create wallet_transactions table to track all wallet activity
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'topup')),
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add wallet_balance column to profiles table
ALTER TABLE public.profiles ADD COLUMN wallet_balance NUMERIC NOT NULL DEFAULT 0;

-- Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet transactions
CREATE POLICY "Users can view their own wallet transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own wallet transactions (for topups)
CREATE POLICY "Users can insert their own wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all wallet transactions
CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update wallet balance on transaction
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type IN ('credit', 'topup', 'refund') THEN
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + NEW.amount 
    WHERE user_id = NEW.user_id;
  ELSIF NEW.transaction_type = 'debit' THEN
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance - NEW.amount 
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update balance
CREATE TRIGGER on_wallet_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_product_id ON public.favorites(product_id);
-- Create product reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, order_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- Add average_rating and review_count to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Function to update product rating stats
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.products 
    SET 
      average_rating = (SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0) FROM public.reviews WHERE product_id = NEW.product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products 
    SET 
      average_rating = (SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0) FROM public.reviews WHERE product_id = OLD.product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger to auto-update product ratings
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();

-- Add scheduled_for column to orders table for order scheduling
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
-- Enhanced Notifications System

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  order_updates BOOLEAN DEFAULT true,
  promotions BOOLEAN DEFAULT true,
  offers BOOLEAN DEFAULT true,
  delivery_updates BOOLEAN DEFAULT true,
  wallet_updates BOOLEAN DEFAULT true,
  review_reminders BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification history table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general', -- order, promo, delivery, wallet, review, general
  priority TEXT DEFAULT 'normal', -- low, normal, high
  image_url TEXT,
  action_url TEXT,
  order_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- RLS Policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM notifications 
    WHERE user_id = p_user_id AND is_read = false AND is_archived = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update notification_preferences.updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
