-- Migration 060: 30-day website chat resume window
--
-- Returning customers should be able to continue a recent website chat
-- without creating duplicate leads or empty conversations. The app extends
-- expires_at on each client-started message and only resumes conversations
-- that are still inside this window.

ALTER TABLE chatbot.conversations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE chatbot.conversations
SET expires_at = COALESCE(last_message_at, created_at, NOW()) + INTERVAL '30 days'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_lead_resume
  ON chatbot.conversations (lead_id, expires_at DESC, last_message_at DESC)
  WHERE COALESCE(status, 'active') NOT IN ('archived', 'closed');

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_created
  ON chatbot.messages (conversation_id, created_at ASC);
