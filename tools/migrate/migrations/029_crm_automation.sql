-- Migration: 029_crm_automation.sql
-- Create crm_logs table to prevent duplicate CRM emails.

CREATE TABLE IF NOT EXISTS crm_logs (
  id           SERIAL PRIMARY KEY,
  cart_id      UUID REFERENCES chatbot.rfq_carts(id) ON DELETE CASCADE,
  quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
  action_sent  VARCHAR NOT NULL, -- 'cart_abandoned_email', 'quote_expiring_email'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_logs_cart ON crm_logs(cart_id);
CREATE INDEX IF NOT EXISTS idx_crm_logs_quote ON crm_logs(quotation_id);
