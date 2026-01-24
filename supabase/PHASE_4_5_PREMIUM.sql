-- ==========================================
-- PHASE 4 & 5: ADMIN & NEXT-GEN FEATURES
-- ==========================================

-- 1. [Phase 4] Inventory Logging
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL, -- e.g. -1, +10
    reason TEXT, -- 'order', 'restock', 'damage'
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view inventory logs" ON public.inventory_logs FOR SELECT USING (true); -- In prod, check admin role

-- 2. [Phase 5] Live Chat Support System
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id), -- Null if system message
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View messages for own tickets" ON public.support_messages FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()));
CREATE POLICY "Send messages to own tickets" ON public.support_messages FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()));

-- 3. [Phase 5] Split Bill Requests
CREATE TABLE IF NOT EXISTS public.split_bill_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_amount DECIMAL(10,2) NOT NULL,
    split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.split_bill_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    split_request_id UUID REFERENCES public.split_bill_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Or phone number if not reg
    amount_owed DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.split_bill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_bill_participants;
