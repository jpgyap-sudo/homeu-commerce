-- Runtime schema compatibility for email settings and persistent cart timestamps.
-- Safe to apply repeatedly against databases imported before the migration ledger.

CREATE TABLE IF NOT EXISTS public."DaVinciOS_kv" (
  id SERIAL PRIMARY KEY,
  key VARCHAR NOT NULL UNIQUE,
  data JSONB NOT NULL
);

ALTER TABLE chatbot.rfq_carts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
