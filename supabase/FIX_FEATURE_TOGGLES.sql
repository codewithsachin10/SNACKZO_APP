-- ============================================================
-- FIX FEATURE TOGGLES PERMISSIONS
-- ============================================================
-- Run this in your Supabase SQL Editor to fix the 403 errors

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "feature_toggles_read" ON feature_toggles;
DROP POLICY IF EXISTS "feature_toggles_update" ON feature_toggles;
DROP POLICY IF EXISTS "feature_toggles_insert" ON feature_toggles;
DROP POLICY IF EXISTS "Anyone can read feature toggles" ON feature_toggles;
DROP POLICY IF EXISTS "Admins can update feature toggles" ON feature_toggles;

-- 2. Enable RLS if not already enabled
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies

-- Allow ANYONE to read feature toggles (needed for signup page)
CREATE POLICY "Public read access for feature toggles"
ON feature_toggles
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated read access for feature toggles"
ON feature_toggles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update (for admin dashboard)
CREATE POLICY "Authenticated users can update feature toggles"
ON feature_toggles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert new features
CREATE POLICY "Authenticated users can insert feature toggles"
ON feature_toggles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Grant permissions to anon and authenticated roles
GRANT SELECT ON feature_toggles TO anon;
GRANT SELECT, INSERT, UPDATE ON feature_toggles TO authenticated;

-- 5. Insert the demo_otp_mode feature if it doesn't exist
INSERT INTO feature_toggles (feature_name, display_name, description, is_enabled, icon, category)
VALUES (
  'demo_otp_mode',
  'Demo OTP Mode',
  'When email fails, show OTP in a popup instead. Enable this for testing/demo purposes.',
  false,
  'demo_otp_mode',
  'developer'
)
ON CONFLICT (feature_name) DO NOTHING;

-- Done! The feature toggles should now work properly.
