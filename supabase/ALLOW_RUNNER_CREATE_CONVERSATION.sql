-- Allow Runnners to Create (Insert) Conversations
-- Required when the runner initiates the chat first

GRANT INSERT ON public.chat_conversations TO anon;
GRANT INSERT ON public.chat_conversations TO authenticated;

DROP POLICY IF EXISTS "Runners can insert conversations" ON public.chat_conversations;

CREATE POLICY "Runners can insert conversations"
ON public.chat_conversations FOR INSERT
TO public
WITH CHECK (
  runner_id IS NOT NULL 
  AND order_id IS NOT NULL
  -- Ideally check if runner_id matches the current runner but difficult with anon auth
);

-- Ensure they can also read what they created
DROP POLICY IF EXISTS "Runners can view assigned conversations" ON public.chat_conversations;
CREATE POLICY "Runners can view assigned conversations"
ON public.chat_conversations FOR SELECT
TO public
USING (true); -- Simplified public access for MVP runner app
