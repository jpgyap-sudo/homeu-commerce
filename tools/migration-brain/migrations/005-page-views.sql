-- Page View Analytics for DaVinciOS
-- Tracks which admin pages and public pages are viewed most.
--
-- Run: psql -h localhost -U homeu -d homeu -f migrations/005-page-views.sql

CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,                  -- e.g. /admin/dashboard, /products/sofa
  title VARCHAR(300),                          -- page title (if available)
  referrer VARCHAR(1000),                      -- HTTP referrer
  visitor_id VARCHAR(100),                     -- anonymous visitor hash (for unique counting)
  user_id INTEGER,                             -- logged-in user id (if applicable)
  is_admin BOOLEAN DEFAULT FALSE,              -- true for /admin/* pages
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for aggregation queries
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_admin ON page_views (is_admin, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id);
