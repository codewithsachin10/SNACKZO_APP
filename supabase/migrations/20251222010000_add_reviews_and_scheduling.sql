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
