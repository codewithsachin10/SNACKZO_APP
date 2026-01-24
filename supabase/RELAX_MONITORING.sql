-- ==========================================================
-- RELAX CONSTRAINTS FOR ROBUST MONITORING
-- ==========================================================

-- Drop the strict FK to profiles so logins never fail
ALTER TABLE public.active_sessions 
DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey_profiles;

-- Restore FK to auth.users (Standard Supabase Link)
-- This ensures data integrity without requiring a public profile
ALTER TABLE public.active_sessions
ADD CONSTRAINT active_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;
