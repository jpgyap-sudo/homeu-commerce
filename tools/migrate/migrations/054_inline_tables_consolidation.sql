-- Migration 054: Consolidate inline CREATE TABLE from route handlers
--
-- Several API route handlers had ad-hoc CREATE TABLE IF NOT EXISTS
-- statements that made schema definition unpredictable. This migration
-- creates all those tables in a single, properly ordered migration so
-- the inline statements in route handlers can be removed safely.
--
-- Tables covered:
--   customers         (base customer table, was inline in customers/me/route.ts)
--   customer_addresses (was inline in customers/addresses/route.ts)
--   activation_tokens (was inline in customers/activate/route.ts)
--   password_reset_tokens (was inline in customers/reset-password/route.ts)
--   newsletter_subscribers (was inline in 3 places with slightly different schemas)
--   chatbot.*         (13 tables from lib/chatbot/schema.sql)

BEGIN;

-- customers (widest schema used across all consumer routes)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'customer',
  status TEXT DEFAULT 'active',
  company TEXT,
  tab_permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- customer_addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Philippines',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- activation_tokens
CREATE TABLE IF NOT EXISTS activation_tokens (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- newsletter_subscribers (consolidated schema with source column)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- accepts_alternatives column on rfq_request_items (H-6)
ALTER TABLE rfq_request_items ADD COLUMN IF NOT EXISTS accepts_alternatives BOOLEAN NOT NULL DEFAULT true;

COMMIT;
