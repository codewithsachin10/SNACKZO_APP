-- ============================================================
-- FIX SIGNUP PROCESS - Complete Profile Trigger
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure profiles table has correct RLS policies for signup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow public read for phone check" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON profiles;

-- Create proper RLS policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id)
WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Allow anonymous users to check if phone exists (for signup validation)
CREATE POLICY "Allow phone check for signup"
ON profiles FOR SELECT
TO anon
USING (true);

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 2: Create or replace the profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    full_name,
    phone,
    created_at,
    updated_at,
    wallet_balance,
    loyalty_points,
    lifetime_points,
    loyalty_tier,
    total_orders,
    current_streak,
    longest_streak,
    badges_count,
    is_banned
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NOW(),
    NOW(),
    0,
    0,
    0,
    'bronze',
    0,
    0,
    0,
    0,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Add unique constraint on phone if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_phone_key' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN 
    RAISE NOTICE 'Could not add phone unique constraint: %', SQLERRM;
END $$;

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Step 5: Ensure feature_toggles has demo_otp_mode
INSERT INTO feature_toggles (feature_name, display_name, is_enabled, description)
VALUES (
  'demo_otp_mode',
  'Demo OTP Mode',
  true,
  'When enabled, shows OTP in popup instead of sending email'
)
ON CONFLICT (feature_name) DO UPDATE SET is_enabled = true;

-- Verification
SELECT 'Signup fix applied successfully!' as status;
SELECT COUNT(*) as profile_count FROM profiles;
