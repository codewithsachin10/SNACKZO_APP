-- ==========================================================
-- REAL DEVICE TRACKING & SYSTEM HEALTH SUPPORT
-- ==========================================================

-- 1. Active Sessions Table (For Real Device Monitoring)
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info TEXT,
    ip_address TEXT,
    location TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view ALL sessions
CREATE POLICY "Admins_View_All_Sessions" ON public.active_sessions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Users can insert/update their own session
CREATE POLICY "Users_Manage_Own_Sessions" ON public.active_sessions
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Storage Helper (Simulated Pruning)
-- We can't prune explicit storage via SQL easily securely, but we can track it.

-- 3. Ensure User Roles exists (Prerequisite)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT,
  UNIQUE(user_id, role)
);
