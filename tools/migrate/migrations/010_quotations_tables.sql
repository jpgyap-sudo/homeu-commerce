-- Migration: create quotations + quotations_items (production was missing
-- these entirely — local had them, production never did, so the whole
-- Quotations admin feature 500'd on every request there). Idempotent.

CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  title VARCHAR,
  customer_id INTEGER,
  customer_name VARCHAR,
  customer_email VARCHAR,
  status VARCHAR DEFAULT 'draft',
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  bank_details JSONB,
  terms TEXT,
  warranty TEXT,
  valid_until TIMESTAMPTZ,
  quotation_number VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  title VARCHAR,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS quotations_quotation_number_idx ON quotations(quotation_number) WHERE quotation_number IS NOT NULL;
