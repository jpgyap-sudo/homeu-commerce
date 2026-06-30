-- Migration 058: Quotation deposit tracking

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC DEFAULT 50;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_due_date DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_received_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_verified_by INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_notes TEXT;

CREATE TABLE IF NOT EXISTS quotation_payments (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  proof_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  verified_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
