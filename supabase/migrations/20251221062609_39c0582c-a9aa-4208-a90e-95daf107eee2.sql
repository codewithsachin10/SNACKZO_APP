-- Create wallet_transactions table to track all wallet activity
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
  EXECUTE FUNCTION public.update_wallet_balance();