-- Fix permissions for Price History, Price Alerts, and Reviews
-- This migration addresses 403 Forbidden errors for unauthenticated/authenticated access

-- 1. FIX PRICE ALERTS PERMISSIONS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted or conflicting policies
DROP POLICY IF EXISTS "Users can manage own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users manage own alerts" ON public.price_alerts;

-- Create robust policies
CREATE POLICY "Users manage own alerts" ON public.price_alerts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. FIX PRICE HISTORY PERMISSIONS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view price history" ON public.price_history;
DROP POLICY IF EXISTS "Public view price history" ON public.price_history;

-- Create robust policies
CREATE POLICY "Public view price history" ON public.price_history
    FOR SELECT
    USING (true);

-- 3. FIX REVIEWS PERMISSIONS AND RELATIONSHIPS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Add Relationship to Profiles if missing (Enables join for full_name)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_profiles_fkey') THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_user_id_profiles_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
    END IF;
END $$;

-- Fix Profile Visibility
DROP POLICY IF EXISTS "Anyone can view profile names" ON public.profiles;
CREATE POLICY "Anyone can view profile names" ON public.profiles
    FOR SELECT
    USING (true);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users insert reviews" ON public.reviews;

-- Create robust policies
CREATE POLICY "Public view reviews" ON public.reviews
    FOR SELECT
    USING (true);

CREATE POLICY "Users insert reviews" ON public.reviews
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. FIX PRODUCT IMAGES PERMISSIONS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Public view product images" ON public.product_images;

CREATE POLICY "Public view product images" ON public.product_images
    FOR SELECT
    USING (true);

-- 5. GRANT PERMISSIONS TO ROLES
GRANT ALL ON public.price_alerts TO authenticated;
GRANT SELECT ON public.price_history TO anon, authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

