-- Enhanced Payment Options Migration
-- Run this in Supabase SQL Editor

-- ========================================
-- UPDATE PAYMENT METHOD ENUM
-- ========================================
-- Add new payment methods to existing enum
DO $$ BEGIN
  -- Check if enum values exist, if not add them
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'card' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')) THEN
    ALTER TYPE public.payment_method ADD VALUE 'card';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'netbanking' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')) THEN
    ALTER TYPE public.payment_method ADD VALUE 'netbanking';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bnpl' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')) THEN
    ALTER TYPE public.payment_method ADD VALUE 'bnpl';
  END IF;
END $$;

-- ========================================
-- SAVED PAYMENT METHODS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('card', 'upi', 'netbanking', 'bnpl')),
  provider TEXT, -- 'razorpay', 'simpl', 'zestmoney', etc.
  
  -- Card details (tokenized)
  card_token TEXT, -- Razorpay token ID
  card_last4 TEXT, -- Last 4 digits
  card_brand TEXT, -- 'visa', 'mastercard', 'rupay', etc.
  card_expiry_month INT,
  card_expiry_year INT,
  card_holder_name TEXT,
  
  -- UPI details
  upi_id TEXT,
  
  -- BNPL details
  bnpl_provider TEXT, -- 'simpl', 'zestmoney', 'lazy pay', etc.
  bnpl_limit DECIMAL(10, 2),
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  nickname TEXT, -- User-friendly name like "My Visa Card"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure only one default per user
  CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_user ON public.saved_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_default ON public.saved_payment_methods(user_id, is_default) WHERE is_default = true;

-- ========================================
-- PAYMENT TRANSACTIONS TABLE (Enhanced)
-- ========================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  
  -- Provider details
  provider TEXT DEFAULT 'razorpay', -- 'razorpay', 'simpl', 'zestmoney', etc.
  provider_transaction_id TEXT,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  
  -- Card/UPI details (for reference)
  card_last4 TEXT,
  card_brand TEXT,
  upi_id TEXT,
  
  -- BNPL specific
  bnpl_provider TEXT,
  bnpl_emi_plan TEXT,
  
  -- Saved payment method reference
  saved_payment_method_id UUID REFERENCES public.saved_payment_methods(id) ON DELETE SET NULL,
  
  -- Failure details
  failure_reason TEXT,
  failure_code TEXT,
  
  -- Timestamps
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(payment_status);

-- ========================================
-- ONE-CLICK CHECKOUT SETTINGS
-- ========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS one_click_checkout_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_payment_method_id UUID REFERENCES public.saved_payment_methods(id) ON DELETE SET NULL;

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to set default payment method
CREATE OR REPLACE FUNCTION public.set_default_payment_method(
  p_user_id UUID,
  p_payment_method_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Unset all other defaults for this user
  UPDATE public.saved_payment_methods
  SET is_default = false
  WHERE user_id = p_user_id;
  
  -- Set the new default
  UPDATE public.saved_payment_methods
  SET is_default = true
  WHERE id = p_payment_method_id AND user_id = p_user_id;
  
  -- Update profile
  UPDATE public.profiles
  SET default_payment_method_id = p_payment_method_id
  WHERE user_id = p_user_id;
END;
$$;

-- Function to get user's saved payment methods
CREATE OR REPLACE FUNCTION public.get_saved_payment_methods(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  payment_type TEXT,
  provider TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  card_expiry_month INT,
  card_expiry_year INT,
  upi_id TEXT,
  bnpl_provider TEXT,
  is_default BOOLEAN,
  nickname TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spm.id,
    spm.payment_type,
    spm.provider,
    spm.card_last4,
    spm.card_brand,
    spm.card_expiry_month,
    spm.card_expiry_year,
    spm.upi_id,
    spm.bnpl_provider,
    spm.is_default,
    spm.nickname,
    spm.created_at
  FROM public.saved_payment_methods spm
  WHERE spm.user_id = p_user_id
    AND spm.is_active = true
  ORDER BY spm.is_default DESC, spm.created_at DESC;
END;
$$;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Saved Payment Methods
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved payment methods"
  ON public.saved_payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved payment methods"
  ON public.saved_payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved payment methods"
  ON public.saved_payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved payment methods"
  ON public.saved_payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Payment Transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ========================================
-- TRIGGERS
-- ========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_payment_methods_updated_at
  BEFORE UPDATE ON public.saved_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE public.saved_payment_methods IS 'Stores tokenized payment methods for one-click checkout';
COMMENT ON TABLE public.payment_transactions IS 'Tracks all payment transactions with full details';
COMMENT ON COLUMN public.profiles.one_click_checkout_enabled IS 'Enables one-click checkout for the user';
COMMENT ON COLUMN public.profiles.default_payment_method_id IS 'Default payment method for one-click checkout';
