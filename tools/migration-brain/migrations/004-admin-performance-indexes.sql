-- Admin Performance Indexes for DaVinciOS
-- Adds expression indexes to speed up search, filter, and sort queries
-- used by the admin dashboard, products list, and analytics pages.
--
-- Run: psql -h localhost -U homeu -d homeu -f migrations/004-admin-performance-indexes.sql

-- ==========================
-- PRODUCTS TABLE
-- ==========================

-- Accelerate LOWER(sku) LIKE searches in admin products list
CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products (LOWER(COALESCE(sku, '')));

-- Accelerate LOWER(title) LIKE searches
CREATE INDEX IF NOT EXISTS idx_products_title_lower ON products (LOWER(title));

-- Accelerate LOWER(slug) LIKE searches
CREATE INDEX IF NOT EXISTS idx_products_slug_lower ON products (LOWER(slug));

-- Accelerate status filter/sort (if status column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
  END IF;
END $$;

-- Accelerate vendor filter/sort (if vendor column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'vendor') THEN
    CREATE INDEX IF NOT EXISTS idx_products_vendor ON products (vendor);
  END IF;
END $$;

-- Accelerate category_id joins and EXISTS subqueries
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);

-- Accelerate ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- ==========================
-- CATEGORIES TABLE
-- ==========================

-- Accelerate LOWER(slug) lookups (used in category filter subquery)
CREATE INDEX IF NOT EXISTS idx_categories_slug_lower ON categories (LOWER(slug));

-- ==========================
-- CUSTOMERS TABLE
-- ==========================

-- Accelerate admin login: WHERE email = $1 AND role = 'admin' AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers (LOWER(email));

-- Accelerate status filter (if status column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status);
  END IF;
END $$;

-- Accelerate role filter (if role column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'role') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_role ON customers (role);
  END IF;
END $$;

-- ==========================
-- RFQ_REQUESTS TABLE
-- ==========================

CREATE INDEX IF NOT EXISTS idx_rfq_requests_created_at ON rfq_requests (created_at DESC);

-- ==========================
-- REDIRECTS TABLE
-- ==========================

CREATE INDEX IF NOT EXISTS idx_redirects_created_at ON redirects (created_at DESC);

-- ==========================
-- CHATBOT SCHEMA
-- ==========================

-- Accelerate GROUP BY buyer_type query in analytics
CREATE INDEX IF NOT EXISTS idx_leads_buyer_type ON chatbot.leads (buyer_type);

-- Accelerate DATE(created_at) GROUP BY for lead volume chart
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON chatbot.leads (created_at DESC);

-- Accelerate DATE(created_at) GROUP BY for message volume chart
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chatbot.messages (created_at DESC);

-- ==========================
-- NOTE
-- ==========================
-- All indexes use IF NOT EXISTS so this migration is safe to re-run.
-- Expression indexes (LOWER, COALESCE) are used because the admin queries
-- wrap columns in LOWER() which bypasses standard B-tree indexes.
