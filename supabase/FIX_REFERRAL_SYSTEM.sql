-- =====================================================
-- FIX REFERRAL PROGRAM
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Ensure referral_codes table exists with correct permissions
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT UNIQUE NOT NULL,
  uses INT DEFAULT 0,
  max_uses INT DEFAULT 100,
  reward_amount DECIMAL(10,2) DEFAULT 50,
  referee_reward DECIMAL(10,2) DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ensure referrals table exists
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 4. Fix Policies for referral_codes
-- Allow users to read their own code
DROP POLICY IF EXISTS "Users can view their referral code" ON public.referral_codes;
CREATE POLICY "Users can view their referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Allow anyone to look up a referral code (needed for applying it)
DROP POLICY IF EXISTS "Anyone can look up referral codes" ON public.referral_codes;
CREATE POLICY "Anyone can look up referral codes"
  ON public.referral_codes FOR SELECT
  USING (true);

-- Allow users and system to insert codes
DROP POLICY IF EXISTS "Users can insert their referral code" ON public.referral_codes;
CREATE POLICY "Users can insert their referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Fix Policies for referrals
-- Allow users to view referrals where they are either the referrer or referred
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;
CREATE POLICY "Users can view their referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Allow users to create a referral record (when they apply a code)
DROP POLICY IF EXISTS "Users can create referral record" ON public.referrals;
CREATE POLICY "Users can create referral record"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- 6. Recreate the generator function
-- Drop old versions to correctly handle parameter name changes
DROP FUNCTION IF EXISTS public.generate_referral_code(uuid); 
DROP FUNCTION IF EXISTS public.generate_referral_code();

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- If user already has a code, return it
  SELECT code INTO new_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;

  LOOP
    -- Generate a random 8-character code: e.g., HM-X7Y8Z9
    new_code := 'HM-' || upper(substr(md5(random()::text), 1, 6));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  -- Insert the new referral code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Return the code
  SELECT code INTO new_code FROM public.referral_codes WHERE user_id = p_user_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT ALL ON public.referral_codes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_codes TO anon; 

GRANT ALL ON public.referrals TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;

SELECT 'Referral system fixed successfully!' as result;
