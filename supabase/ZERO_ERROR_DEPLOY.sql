-- ==========================================================
-- ZERO ERROR DEPLOYMENT SCRIPT
-- Fixes 403 (Forbidden) on Chat & 404 on Wallet
-- ==========================================================

-- 1. FIX CHAT PERMISSIONS (The 403 Fix)
-- Clear any conflicting policies
DROP POLICY IF EXISTS "Users view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users send messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users view messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins view all messages" ON public.support_messages;

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can create their own tickets
CREATE POLICY "Users_Create_Own_Tickets" ON public.support_tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own tickets
CREATE POLICY "Users_View_Own_Tickets" ON public.support_tickets
FOR SELECT USING (auth.uid() = user_id);

-- Policy 3: Admins can do EVERYTHING on tickets
CREATE POLICY "Admins_Manage_Tickets" ON public.support_tickets
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policy 4: Users can view messages for THEIR tickets
CREATE POLICY "Users_View_Chat_Messages" ON public.support_messages
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);

-- Policy 5: Users can send messages to THEIR tickets
CREATE POLICY "Users_Send_Chat_Messages" ON public.support_messages
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);

-- Policy 6: Admins can do EVERYTHING on messages
CREATE POLICY "Admins_Manage_Chat_Messages" ON public.support_messages
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. FIX WALLET & TRANSACTIONS (The 404 Fix)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users view own transactions" ON public.wallet_transactions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own transactions" ON public.wallet_transactions;
CREATE POLICY "Users create own transactions" ON public.wallet_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. ENSURE ADMIN ROLE IS READABLE (Crucial for Admin Check)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'runner', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read roles" ON public.user_roles;
CREATE POLICY "Public read roles" ON public.user_roles FOR SELECT USING (true);

-- 4. FIX SOCIAL PROOF REALTIME
-- (Safe addition that won't error if already exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;
