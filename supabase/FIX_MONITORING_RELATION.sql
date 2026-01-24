-- ==========================================================
-- FIX RELATIONSHIP FOR ACTIVE SESSIONS JOIN (CORRECTED)
-- ==========================================================

-- 1. CLEANUP: Remove any sessions that don't have a corresponding profile
-- This prevents the "Key is not present in table profiles" error.
DELETE FROM public.active_sessions
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 2. Drop existing FK to auth.users if it exists
ALTER TABLE public.active_sessions 
DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey;

-- 3. Add FK to public.profiles
ALTER TABLE public.active_sessions
ADD CONSTRAINT active_sessions_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 4. Grant permissions
GRANT REFERENCES ON public.profiles TO authenticated;
GRANT REFERENCES ON public.profiles TO postgres;
