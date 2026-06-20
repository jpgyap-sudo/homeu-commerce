-- Migration 005: RFQ Persistent Chat System
-- Created: 2026-06-20
--
-- Adds:
--   1. rfq_chat_conversations — one per RFQ request
--   2. rfq_chat_messages — individual messages with TTL support
--   3. rfq_chat_deletion_requests — OTP-verified deletion tracking
--   4. rfq_chat_notification_log — audit trail of admin notify actions
--   5. chatbot_backfill_log — deduplication for chatbot message import

-- ============================================================
-- RFQ CHAT CONVERSATIONS
-- One conversation per RFQ request. Created automatically
-- when the first RFQ-related message is sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_request_id INTEGER NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'resolved', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  internal_score INTEGER DEFAULT 0,
  admin_notes TEXT DEFAULT '',
  resolved_at TIMESTAMPTZ,
  source TEXT DEFAULT 'rfq_chat' NOT NULL CHECK (source IN ('rfq_chat', 'chatbot_backfill')),
  source_conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rfq_chat_conv_rfq ON rfq_chat_conversations(rfq_request_id);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_conv_status ON rfq_chat_conversations(status);


-- ============================================================
-- RFQ CHAT MESSAGES
-- Individual messages within an RFQ conversation.
-- TTL: messages older than 30 days hidden from customer.
-- Soft-delete: deleted_at set instead of actual delete.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system', 'ai_bot')),
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'system_event', 'quotation_version', 'notification')),
  related_quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
  related_version_number INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  customer_visible BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_conv ON rfq_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_created ON rfq_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_type ON rfq_chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_rfq_chat_msg_active
  ON rfq_chat_messages(created_at)
  WHERE customer_visible = TRUE AND deleted_at IS NULL;


-- ============================================================
-- DELETION APPROVAL TOKENS
-- Tracks OTP-verified message deletion requests.
-- Admin selects messages → OTP sent to jpgyap@gmail.com →
-- OTP verified → deletion executed.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  message_ids UUID[] NOT NULL,
  otp_email TEXT NOT NULL DEFAULT 'jpgyap@gmail.com',
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMPTZ,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rfq_del_req_conv ON rfq_chat_deletion_requests(conversation_id);


-- ============================================================
-- NOTIFICATION LOG
-- Tracks every "Notify" button click by admin.
-- Used for audit trail and future analytics.
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_chat_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('quotation_sent', 'admin_notify', 'quotation_updated')),
  email_sent_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_link TEXT NOT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('manual', 'auto')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rfq_notif_conv ON rfq_chat_notification_log(conversation_id);


-- ============================================================
-- CHATBOT BACKFILL LOG
-- Prevents re-importing the same chatbot conversation twice.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_backfill_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_conversation_id UUID NOT NULL,
  rfq_chat_conversation_id UUID NOT NULL REFERENCES rfq_chat_conversations(id) ON DELETE CASCADE,
  messages_mirrored INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(chatbot_conversation_id, rfq_chat_conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_backfill_chatbot ON chatbot_backfill_log(chatbot_conversation_id);

-- ============================================================
-- Ensure rfq_id column on quotations table
-- Referenced by hooks in quotation-versions.ts and quotation routes
-- ============================================================
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS rfq_id INTEGER REFERENCES rfq_requests(id);
CREATE INDEX IF NOT EXISTS idx_quotations_rfq_id ON quotations(rfq_id);
