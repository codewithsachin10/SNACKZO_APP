-- Fix RLS for feature_toggles table
-- Allow everyone to read feature toggles (they control UI features)

ALTER TABLE IF EXISTS feature_toggles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS "Anyone can view feature toggles" ON feature_toggles;

-- Create policy to allow all users (including anonymous) to read feature toggles
CREATE POLICY "Anyone can view feature toggles"
  ON feature_toggles FOR SELECT
  USING (true);

-- Only admins can modify feature toggles
DROP POLICY IF EXISTS "Admins can manage feature toggles" ON feature_toggles;

CREATE POLICY "Admins can manage feature toggles"
  ON feature_toggles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
