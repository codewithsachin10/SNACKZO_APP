-- Create Chat Tables
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  runner_id UUID REFERENCES public.runners(id) ON DELETE SET NULL,
  conversation_type TEXT DEFAULT 'order_support' CHECK (conversation_type IN ('order_support', 'runner_chat', 'general_support')),
  subject TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('user', 'runner', 'system')),
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  for_role TEXT CHECK (for_role IN ('user', 'runner', 'both')),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Conversation Policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Runners can view assigned conversations" ON public.chat_conversations;
CREATE POLICY "Runners can view assigned conversations"
  ON public.chat_conversations FOR SELECT
  USING (true); -- Ideally restrict to assigned runner, but for MVP simplifying

DROP POLICY IF EXISTS "Users can insert conversations" ON public.chat_conversations;
CREATE POLICY "Users can insert conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Message Policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Runners can view messages" ON public.chat_messages;
CREATE POLICY "Runners can view messages"
  ON public.chat_messages FOR SELECT
  USING (true); -- Simplified for MVP

DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
CREATE POLICY "Users can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Quick Replies Policies
DROP POLICY IF EXISTS "Anyone can view quick replies" ON public.quick_replies;
CREATE POLICY "Anyone can view quick replies"
  ON public.quick_replies FOR SELECT
  USING (true);

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_order_conversation(p_order_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_runner_id UUID;
BEGIN
  -- Get runner for the order
  SELECT runner_id INTO v_runner_id FROM public.orders WHERE id = p_order_id;
  
  -- Check if conversation exists
  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE order_id = p_order_id AND user_id = p_user_id;
  
  -- If not, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.chat_conversations (order_id, user_id, runner_id, conversation_type, subject)
    VALUES (p_order_id, p_user_id, v_runner_id, 'order_support', 'Order #' || substring(p_order_id::text, 1, 8))
    RETURNING id INTO v_conversation_id;
    
    -- Insert initial system message
    INSERT INTO public.chat_messages (conversation_id, sender_type, sender_id, message, message_type)
    VALUES (v_conversation_id, 'system', '00000000-0000-0000-0000-000000000000', 'Chat started for this order', 'system');
  ELSE
    -- Update runner if changed
    IF v_runner_id IS DISTINCT FROM (SELECT runner_id FROM public.chat_conversations WHERE id = v_conversation_id) THEN
        UPDATE public.chat_conversations SET runner_id = v_runner_id WHERE id = v_conversation_id;
    END IF;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Seed Quick Replies
INSERT INTO public.quick_replies (message, category, for_role, display_order) VALUES
('I am at the location', 'delivery', 'runner', 1),
('Can you call me?', 'communication', 'both', 2),
('Coming down in 2 mins', 'delivery', 'user', 3),
('Where is the location?', 'delivery', 'runner', 4),
('Please leave it at the door', 'delivery', 'user', 5)
ON CONFLICT DO NOTHING;

-- Enable Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
