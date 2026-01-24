-- HOSTEL HUSTLE - COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: CREATE ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('upi', 'cod');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM ('room', 'common_area');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: CREATE CORE TABLES
-- ============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  hostel_block TEXT,
  room_number TEXT,
  wallet_balance NUMERIC NOT NULL DEFAULT 0,
  notification_preference TEXT DEFAULT 'push' CHECK (notification_preference IN ('push', 'whatsapp', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  stock INT NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  average_rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Runners table
CREATE TABLE IF NOT EXISTS public.runners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  notification_preference TEXT DEFAULT 'sms' CHECK (notification_preference IN ('sms', 'whatsapp', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  runner_id UUID REFERENCES public.runners(id),
  status order_status NOT NULL DEFAULT 'placed',
  payment_method payment_method NOT NULL,
  delivery_mode delivery_mode NOT NULL,
  delivery_address TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 3: CREATE FEATURE TABLES
-- ============================================

-- Discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INT,
  used_count INT DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store settings table
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

-- Flash sales table
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

-- Bundle deals table
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

-- Bundle deal items table
CREATE TABLE IF NOT EXISTS public.bundle_deal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_deal_id UUID REFERENCES public.bundle_deals(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocked users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  unblocked_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Customer insights table
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

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'topup')),
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
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

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  image_url TEXT,
  action_url TEXT,
  order_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to update timestamps
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
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Function to set delivered_at timestamp
CREATE OR REPLACE FUNCTION public.set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type IN ('credit', 'topup', 'refund') THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount WHERE user_id = NEW.user_id;
  ELSIF NEW.transaction_type = 'debit' THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance - NEW.amount WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update product ratings
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.products SET 
      average_rating = (SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0) FROM public.reviews WHERE product_id = NEW.product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET 
      average_rating = (SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0) FROM public.reviews WHERE product_id = OLD.product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM notifications WHERE user_id = p_user_id AND is_read = false AND is_archived = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET is_read = true WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Drop existing triggers first to avoid errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS set_order_delivered_at ON public.orders;
DROP TRIGGER IF EXISTS on_wallet_transaction ON public.wallet_transactions;
DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
DROP TRIGGER IF EXISTS update_flash_sales_updated_at ON public.flash_sales;
DROP TRIGGER IF EXISTS update_bundle_deals_updated_at ON public.bundle_deals;
DROP TRIGGER IF EXISTS update_customer_insights_updated_at ON public.customer_insights;
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_order_delivered_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_delivered_at();

CREATE TRIGGER on_wallet_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_balance();

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
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

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- STEP 7: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- ============================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================

-- Drop all existing policies first
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
  END LOOP;
END $$;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES POLICIES
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PRODUCTS POLICIES
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ORDERS POLICIES
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ORDER ITEMS POLICIES
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RUNNERS POLICIES
CREATE POLICY "Anyone can sign up as runner" ON public.runners FOR INSERT WITH CHECK (is_active = false);
CREATE POLICY "Anyone can view runners" ON public.runners FOR SELECT USING (true);
CREATE POLICY "Admins can manage runners" ON public.runners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- DISCOUNTS POLICIES
CREATE POLICY "Anyone can view active discounts" ON public.discounts FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage discounts" ON public.discounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- STORE SETTINGS POLICIES
CREATE POLICY "Admins can view store settings" ON public.store_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- FLASH SALES POLICIES
CREATE POLICY "Anyone can view active flash sales" ON public.flash_sales FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage flash sales" ON public.flash_sales FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- BUNDLE DEALS POLICIES
CREATE POLICY "Anyone can view active bundles" ON public.bundle_deals FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage bundles" ON public.bundle_deals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- BUNDLE DEAL ITEMS POLICIES
CREATE POLICY "Anyone can view bundle items" ON public.bundle_deal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage bundle items" ON public.bundle_deal_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- BLOCKED USERS POLICIES
CREATE POLICY "Admins can view blocked users" ON public.blocked_users FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage blocked users" ON public.blocked_users FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CUSTOMER INSIGHTS POLICIES
CREATE POLICY "Users can view own insights" ON public.customer_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all insights" ON public.customer_insights FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- PUSH SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- WALLET TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.wallet_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- FAVORITES POLICIES
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- REVIEWS POLICIES
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- NOTIFICATION PREFERENCES POLICIES
CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert preferences" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- STEP 9: CREATE VIEWS
-- ============================================

DROP VIEW IF EXISTS public.runner_stats;
CREATE VIEW public.runner_stats WITH (security_invoker = true) AS
SELECT 
  r.id as runner_id,
  r.name as runner_name,
  r.phone,
  r.is_active,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as total_deliveries,
  COUNT(CASE WHEN o.status IN ('packed', 'out_for_delivery') THEN 1 END) as pending_deliveries,
  ROUND(AVG(CASE WHEN o.status = 'delivered' AND o.delivered_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60 END)::numeric, 1) as avg_delivery_time_mins,
  MAX(o.delivered_at) as last_delivery_at
FROM public.runners r
LEFT JOIN public.orders o ON r.id = o.runner_id
GROUP BY r.id, r.name, r.phone, r.is_active;

-- ============================================
-- STEP 10: ENABLE REALTIME
-- ============================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;

-- ============================================
-- DONE! ✅
-- ============================================
