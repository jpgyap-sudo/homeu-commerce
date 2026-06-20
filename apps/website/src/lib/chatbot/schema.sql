-- HomeU Concierge Chatbot — Database Schema
-- PostgreSQL. Sidecar schema that references DaVinciOS CMS collections by UUID.
-- Run: psql -d homeu -f apps/website/src/lib/chatbot/schema.sql
-- Or embed in the main DaVinciOS migration.

CREATE SCHEMA IF NOT EXISTS chatbot;

-- ============================================================
-- LEADS
-- Visitors who filled the lead gate form.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  buyer_type TEXT,                          -- homeowner | architect | contractor | hotel | retail
  company_name TEXT,
  project_location TEXT,
  consent BOOLEAN DEFAULT TRUE,
  source_page TEXT,                         -- /products/dining-chair, /categories/lighting
  referrer TEXT,                            -- google, facebook, direct
  status TEXT DEFAULT 'new',                -- new | contacted | qualified | quoted | won | lost | spam
  score INTEGER DEFAULT 0,                  -- lead score 0–100
  score_label TEXT,                         -- cold | warm | hot | qualified
  daVincios_customer_id TEXT,               -- link to existing DaVinciOS customers collection
  metadata JSONB DEFAULT '{}',              -- flexible extra data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON chatbot.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON chatbot.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON chatbot.leads(score DESC);

-- ============================================================
-- CONVERSATIONS
-- One conversation per lead session.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',             -- active | bot_handling | needs_human | closed
  current_intent TEXT,
  intent_confidence REAL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  device_info JSONB DEFAULT '{}',           -- { userAgent, screenSize, platform }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_lead ON chatbot.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conv_status ON chatbot.conversations(status);

-- ============================================================
-- MESSAGES
-- Individual chat messages within a conversation.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,                -- visitor | bot | admin | system
  content TEXT,
  message_type TEXT DEFAULT 'text',          -- text | image | product_card | quick_reply | system
  metadata JSONB DEFAULT '{}',              -- { productId, imageUrl, confidence, intent, quickReplies[] }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv ON chatbot.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_created ON chatbot.messages(created_at);

-- ============================================================
-- UPLOADED IMAGES
-- Images uploaded by visitors for product matching.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  ai_description TEXT,
  extracted_attributes JSONB DEFAULT '{}',  -- { category, style[], material[], color[] }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_img_conv ON chatbot.uploaded_images(conversation_id);

-- ============================================================
-- RFQ CARTS
-- One cart per lead, holds items before submission.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.rfq_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',              -- draft | submitted | quoted | closed
  delivery_location TEXT,
  project_type TEXT,                        -- home | condo | restaurant | hotel | office | other
  target_date DATE,
  budget_range TEXT,
  notes TEXT,
  estimated_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cart_lead ON chatbot.rfq_carts(lead_id);
CREATE INDEX IF NOT EXISTS idx_cart_status ON chatbot.rfq_carts(status);

-- ============================================================
-- RFQ ITEMS
-- Individual products in an RFQ cart.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_cart_id UUID REFERENCES chatbot.rfq_carts(id) ON DELETE CASCADE,
  product_id TEXT,                          -- DaVinciOS product ID (text ID from CMS)
  product_title TEXT,
  product_url TEXT,
  reference_price NUMERIC,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  inspiration_image_url TEXT,
  accepts_alternatives BOOLEAN DEFAULT TRUE,
  match_type TEXT,                          -- closest_match | style_alternative | budget | premium
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_cart ON chatbot.rfq_items(rfq_cart_id);

-- ============================================================
-- APPOINTMENTS
-- Showroom visit booking requests.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_time TEXT,
  visitor_count INTEGER,
  categories_of_interest TEXT[],            -- ['Dining Chairs', 'Lighting']
  status TEXT DEFAULT 'requested',          -- requested | confirmed | completed | cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_lead ON chatbot.appointments(lead_id);

-- ============================================================
-- LEAD SCORES
-- Real-time lead scoring signals and computed scores.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE UNIQUE,
  score INTEGER DEFAULT 0,
  signals JSONB DEFAULT '[]',               -- [{ signal: 'high_value_cart', weight: 20, timestamp }]
  buyer_type TEXT,
  intent_match_count INTEGER DEFAULT 0,
  avg_sentiment REAL DEFAULT 0,
  urgency_detected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RECOMMENDATION LOGS
-- Audit trail of product recommendation queries and results.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  query_text TEXT,
  uploaded_image_id UUID REFERENCES chatbot.uploaded_images(id) ON DELETE SET NULL,
  extracted_attributes JSONB DEFAULT '{}',
  recommended_products JSONB DEFAULT '[]',  -- [{ productId, title, matchType, confidence }]
  confidence REAL,
  click_through BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_conv ON chatbot.recommendation_logs(conversation_id);

-- ============================================================
-- TELEGRAM LOGS
-- Audit trail of Telegram alert deliveries.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.telegram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  event_type TEXT,                          -- NEW_LEAD | RFQ_SUBMITTED | APPOINTMENT_REQUESTED | ESCALATION | HOT_LEAD
  message_data JSONB,
  telegram_message_id TEXT,
  status TEXT DEFAULT 'pending',            -- pending | sent | failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BOT SETTINGS
-- Key-value store for chatbot configuration.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.bot_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LEAD LEDGER EVENTS (Immutable Event Log)
-- Every visitor action is recorded as an immutable event.
-- Score is computed by replaying all events for a lead.
-- This enables: auditable scoring, style DNA building,
-- returning visitor memory, and predictive matching.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.lead_ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES chatbot.conversations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,                   -- see EVENT_TYPES below
  event_data JSONB DEFAULT '{}',              -- flexible payload per event type
  score_delta INTEGER DEFAULT 0,              -- points added/removed for this event
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_lead ON chatbot.lead_ledger_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON chatbot.lead_ledger_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON chatbot.lead_ledger_events(created_at);

COMMENT ON TABLE chatbot.lead_ledger_events IS
  'Immutable event log for every visitor action. Replay events to compute lead score and build style DNA.';

-- Event Types:
--   lead_gate_completed      Visitor submitted name/email/mobile      +5
--   product_page_visited     Visitor viewed a product page             +3
--   image_uploaded           Visitor uploaded a furniture photo        +15
--   item_added_to_cart       Product added to RFQ cart                +20
--   high_value_cart          Cart total > ₱50,000                    +25
--   large_quantity           Quantity >= 10 units                     +20
--   rfq_submitted            RFQ submitted for sales review           +30
--   appointment_requested    Showroom visit booked                    +30
--   viber_handoff_accepted   Visitor accepted Viber handoff           +15
--   urgent_timeline          Visitor needs items within 2 weeks        +10
--   budget_provided          Visitor gave budget range                 +8
--   buyer_type_identified    Architect/contractor/hotel/retail         +20
--   project_location_given   Delivery location provided                +5
--   message_sent             Visitor sent a chat message               +2
--   long_conversation        >10 messages in conversation              +5
--   existing_customer_linked Known customer using chat                +15
--   complaint                Visitor complained/provided negative      -5
--   abandoned_chat           Visitor stopped responding               -3
--   quote_viewed             Visitor viewed quotation                 +5
--   image_matched            AI matched uploaded image to product     +10
--   style_dna_updated        Visitor's style preferences recorded       +0

-- ============================================================
-- VISITOR PROFILES (Aggregated view of lead + ledger)
-- Materialized profile per lead including style DNA, project
-- history, and preferences. Updated by ledger event triggers.
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot.visitor_profiles (
  lead_id UUID PRIMARY KEY REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  style_dna JSONB DEFAULT '{}'::jsonb,         -- { styles: ["modern","scandinavian"], materials: ["wood","fabric"], colors: ["beige","walnut"] }
  project_history JSONB DEFAULT '[]'::jsonb,    -- [{ project_type: "restaurant", date: "2026-01", status: "rfq_submitted" }]
  product_affinity JSONB DEFAULT '{}'::jsonb,   -- { category_counts: { "Dining Chair": 3, "Lighting": 1 }, top_categories: ["Dining Chair"] }
  total_visits INTEGER DEFAULT 1,
  last_conversation_summary TEXT,               -- summary of most recent conversation
  conversation_count INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_sentiment REAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_style ON chatbot.visitor_profiles USING GIN(style_dna);

-- ============================================================
-- Add style_dna column to existing leads table
-- ============================================================
ALTER TABLE chatbot.leads ADD COLUMN IF NOT EXISTS style_dna JSONB DEFAULT '{}'::jsonb;
ALTER TABLE chatbot.leads ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 1;
ALTER TABLE chatbot.leads ADD COLUMN IF NOT EXISTS conversation_summary TEXT;
ALTER TABLE chatbot.leads ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();
