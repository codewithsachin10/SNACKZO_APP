-- Create saved_payment_methods table
CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('card', 'upi', 'netbanking', 'bnpl')),
    provider TEXT,
    card_last4 TEXT,
    card_brand TEXT,
    card_expiry_month INTEGER,
    card_expiry_year INTEGER,
    upi_id TEXT,
    bnpl_provider TEXT,
    is_default BOOLEAN DEFAULT false,
    nickname TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own payment methods" ON public.saved_payment_methods
    FOR ALL USING (auth.uid() = user_id);

-- RPC for setting default
CREATE OR REPLACE FUNCTION public.set_default_payment_method(p_user_id UUID, p_payment_method_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset all others
    UPDATE public.saved_payment_methods
    SET is_default = false
    WHERE user_id = p_user_id;

    -- Set new default
    UPDATE public.saved_payment_methods
    SET is_default = true
    WHERE id = p_payment_method_id AND user_id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
