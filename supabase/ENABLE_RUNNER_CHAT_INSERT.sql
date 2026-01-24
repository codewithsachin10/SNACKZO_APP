-- Allow Runnners to Insert Messages
-- Ideally we should restrict this to only the assigned runner, but since they are anon/public users in this context, we will allow inserts with sender_type='runner'
-- We verify that the conversation exists.

DROP POLICY IF EXISTS "Runners can insert messages" ON public.chat_messages;

CREATE POLICY "Runners can insert messages"
ON public.chat_messages FOR INSERT
TO public
WITH CHECK (
  sender_type = 'runner'
  AND EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
  )
);

-- Ensure anon role has permissions
GRANT INSERT ON public.chat_messages TO anon;
GRANT UPDATE ON public.chat_conversations TO anon; -- To update last_message_at

-- Allow Runners to Update Conversation (last_message_at)
DROP POLICY IF EXISTS "Runners can update conversations" ON public.chat_conversations;

CREATE POLICY "Runners can update conversations"
ON public.chat_conversations FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
