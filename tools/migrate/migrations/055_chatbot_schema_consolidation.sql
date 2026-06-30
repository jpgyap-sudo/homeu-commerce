-- Migration 055: Chatbot schema baseline
--
-- The chatbot.* tables were defined in lib/chatbot/schema.sql but never
-- wired into the numbered migration sequence. This migration creates
-- all 13 chatbot schema tables so the chatbot schema is guaranteed
-- to exist regardless of whether schema.sql was manually applied.
BEGIN;

CREATE SCHEMA IF NOT EXISTS chatbot;

CREATE TABLE IF NOT EXISTS chatbot.leads (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'chat',
  status TEXT DEFAULT 'new',
  lead_score INTEGER DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.conversations (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  channel TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.uploaded_images (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES chatbot.conversations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.rfq_carts (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  session_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.rfq_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER REFERENCES chatbot.rfq_carts(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  title TEXT,
  sku TEXT,
  price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.appointments (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  preferred_date DATE,
  preferred_time TIME,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.recommendation_logs (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  context TEXT,
  clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.telegram_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT,
  chat_id TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.bot_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.lead_ledger_events (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot.visitor_profiles (
  id SERIAL PRIMARY KEY,
  visitor_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
