-- Migration: add_inbox_read_archived
-- Created: 2026-06-23T08:03:18.596Z

ALTER TABLE chatbot.conversations ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT TRUE;
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_is_read ON chatbot.conversations(is_read);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_is_read ON public.inbox_conversations(is_read);
