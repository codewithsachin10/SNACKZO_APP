-- Add is_banned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Update RLS to allow admins to update is_banned (assuming admin policies exist)
-- But usually, policies on profiles are for "own profile".
-- We need to ensure Admin can update ANY profile.

-- Create a policy for Admins to update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
);
