-- Migration: sales_calendar_events
-- Created: 2026-06-23
-- Create custom events table for sales calendar tasks, site visits, notes, meetings, and presentations.

CREATE TABLE IF NOT EXISTS sales_calendar_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'task' | 'site_visit' | 'appointment' | 'note' | 'meeting' | 'presentation'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time VARCHAR(50), -- e.g. "10:00 AM"
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_cal_events_date ON sales_calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_sales_cal_events_customer ON sales_calendar_events(customer_id);
