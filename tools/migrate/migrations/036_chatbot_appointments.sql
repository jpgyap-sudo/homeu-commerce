-- Migration: chatbot_appointments
-- Created: 2026-06-22
-- Adds the chatbot.appointments table for showroom visit bookings via the chatbot

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
