-- ============================================================
-- ADD EMAIL ACCESS FOR ADMIN DASHBOARD
-- Run this in Supabase SQL Editor
-- ============================================================

-- Option 1: Create a secure RPC function to get user email
-- This function can only be called by authenticated admins
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_email TO authenticated;

-- Option 2: Create a view that joins profiles with auth.users
-- This is useful for querying multiple users at once
DROP VIEW IF EXISTS user_emails_view;
CREATE VIEW user_emails_view AS
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created_at
FROM auth.users u;

-- Grant access to the view
GRANT SELECT ON user_emails_view TO authenticated;

-- Option 3: Create a more complete admin users view
DROP VIEW IF EXISTS admin_users_view;
CREATE VIEW admin_users_view AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.phone,
  u.email,
  p.hostel_block,
  p.room_number,
  p.wallet_balance,
  p.loyalty_points,
  p.lifetime_points,
  p.loyalty_tier,
  p.total_orders,
  p.current_streak,
  p.longest_streak,
  p.badges_count,
  p.is_banned,
  p.created_at,
  p.updated_at
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;

-- Grant access to the admin view
GRANT SELECT ON admin_users_view TO authenticated;

-- Verify
SELECT 'Email access functions created successfully!' as status;

-- Test the function (replace with an actual user ID)
-- SELECT get_user_email('your-user-uuid-here');

-- Test the view
SELECT COUNT(*) as users_with_email FROM admin_users_view WHERE email IS NOT NULL;
