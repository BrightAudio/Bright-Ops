-- Create chat system tables for website chat integration

-- Chat conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  autopilot_enabled BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'bot')),
  message TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  read_by_agent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_lead_id ON public.chat_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(conversation_id, read_by_agent) WHERE sender_type = 'visitor';

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
DROP POLICY IF EXISTS "Authenticated users can view all conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can view all conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can insert conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can update conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public (anon) to create conversations from website
DROP POLICY IF EXISTS "Anonymous users can create conversations" ON public.chat_conversations;
CREATE POLICY "Anonymous users can create conversations"
ON public.chat_conversations
FOR INSERT
TO anon
WITH CHECK (true);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can view all messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can insert messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can update messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public (anon) to insert messages from website
DROP POLICY IF EXISTS "Anonymous users can send messages" ON public.chat_messages;
CREATE POLICY "Anonymous users can send messages"
ON public.chat_messages
FOR INSERT
TO anon
WITH CHECK (sender_type = 'visitor');

DROP POLICY IF EXISTS "Anonymous users can view their conversation messages" ON public.chat_messages;
CREATE POLICY "Anonymous users can view their conversation messages"
ON public.chat_messages
FOR SELECT
TO anon
USING (true);

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.chat_messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Verification queries
SELECT 'Chat Conversations Table' as info, COUNT(*) as count FROM public.chat_conversations;
SELECT 'Chat Messages Table' as info, COUNT(*) as count FROM public.chat_messages;

SELECT 
  'Policies Created' as info,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('chat_conversations', 'chat_messages');
