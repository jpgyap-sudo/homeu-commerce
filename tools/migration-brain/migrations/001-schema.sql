-- Migration Central Brain Schema
-- Stores all migration data in PostgreSQL for persistent, queryable memory
-- Run: psql -h localhost -U homeu -d homeu -f migrations/001-schema.sql

-- ==========================
-- CORE ENTITIES
-- ==========================

-- All discovered pages from scanner
CREATE TABLE IF NOT EXISTS scanned_pages (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  page_type VARCHAR(50),                       -- product, collection, page, blog, homepage
  title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  h1 TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  json_ld JSONB,                               -- structured data found on page
  http_status INTEGER,
  content_hash TEXT,                           -- SHA256 of HTML for change detection
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  notes TEXT
);

-- Products extracted from Shopify (scanner + export)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  shopify_id BIGINT UNIQUE,
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  show_price BOOLEAN DEFAULT TRUE,
  price_note TEXT,
  description TEXT,
  description_html TEXT,
  dimensions TEXT,
  materials TEXT,
  tags TEXT[],
  vendor TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status VARCHAR(20) DEFAULT 'discovered',    -- discovered, extracted, mapped, imported, verified
  shopify_url TEXT,
  payload_id INTEGER,                          -- ID after import to Payload CMS
  confidence DECIMAL(5,2),                     -- hermess3 confidence in data accuracy
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections/categories from Shopify
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  shopify_id BIGINT UNIQUE,
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  parent_id INTEGER REFERENCES collections(id),
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'discovered',
  payload_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: products <-> collections
CREATE TABLE IF NOT EXISTS product_collections (
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

-- Product images manifest
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  local_path TEXT,                             -- path after download
  alt_text TEXT,
  checksum TEXT,                               -- MD5 for dedup
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  status VARCHAR(20) DEFAULT 'pending',        -- pending, downloaded, uploaded, failed
  payload_media_id INTEGER,                    -- ID after upload to Payload
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- SEO & URL MAPPING
-- ==========================

-- 301 redirect map (Shopify URL -> New URL)
CREATE TABLE IF NOT EXISTS url_mappings (
  id SERIAL PRIMARY KEY,
  shopify_url TEXT NOT NULL UNIQUE,
  new_url TEXT NOT NULL,
  page_type VARCHAR(50),
  redirect_type VARCHAR(10) DEFAULT '301',
  status VARCHAR(20) DEFAULT 'mapped',         -- mapped, verified, deployed
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- NAVIGATION
-- ==========================

-- Hierarchical navigation structure
CREATE TABLE IF NOT EXISTS navigation (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES navigation(id),
  title TEXT NOT NULL,
  url TEXT,
  sort_order INTEGER DEFAULT 0,
  depth INTEGER DEFAULT 0,
  menu_type VARCHAR(20) DEFAULT 'main',       -- main, footer, mobile
  shopify_data JSONB,                          -- original Shopify nav data
  migrated BOOLEAN DEFAULT FALSE
);

-- ==========================
-- VISUAL ANALYSIS (Ollama)
-- ==========================

-- Results from llava:7b screenshot analysis
CREATE TABLE IF NOT EXISTS visual_analysis (
  id SERIAL PRIMARY KEY,
  page_url TEXT,
  page_type VARCHAR(50),
  screenshot_path TEXT,
  model_used VARCHAR(50) DEFAULT 'llava:7b',
  layout_description TEXT,
  color_scheme JSONB,
  components_detected JSONB,                   -- detected UI components
  similarity_score DECIMAL(5,2),              -- when comparing old vs new
  analysis_raw TEXT,                           -- full llava response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- COMPONENT MAPPING (Liquid -> Next.js)
-- ==========================

CREATE TABLE IF NOT EXISTS component_mappings (
  id SERIAL PRIMARY KEY,
  liquid_template TEXT,                        -- layout/theme.liquid
  liquid_section TEXT,                         -- sections/slideshow.liquid
  nextjs_component TEXT,                       -- components/HeroSlider.tsx
  confidence DECIMAL(5,2),                    -- hermess3 confidence
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- MIGRATION PROGRESS
-- ==========================

CREATE TABLE IF NOT EXISTS migration_phases (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(50) NOT NULL,                  -- scan, extract, parse, map, import, verify
  status VARCHAR(20) DEFAULT 'pending',        -- pending, running, completed, failed
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Migration errors with hermes3 analysis
CREATE TABLE IF NOT EXISTS migration_errors (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(50),
  source_url TEXT,
  error_type VARCHAR(100),
  error_message TEXT,
  severity VARCHAR(20) DEFAULT 'warning',     -- info, warning, error, critical
  hermes_analysis TEXT,                        -- hermes3 reasoning about the error
  suggested_fix TEXT,                          -- hermes3 suggested resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ==========================
-- BRAIN MEMORY (lessons learned)
-- ==========================

-- Cross-session persistent knowledge
CREATE TABLE IF NOT EXISTS brain_memories (
  id SERIAL PRIMARY KEY,
  memory_type VARCHAR(50),                     -- lesson, pattern, decision, mapping
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  source VARCHAR(50),                          -- hermes, scanner, manual
  confidence VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- INDEXES
-- ==========================

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_url_mappings_status ON url_mappings(status);
CREATE INDEX IF NOT EXISTS idx_migration_phases_phase ON migration_phases(phase);
CREATE INDEX IF NOT EXISTS idx_scanned_pages_type ON scanned_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_migration_errors_severity ON migration_errors(severity);
CREATE INDEX IF NOT EXISTS idx_brain_memories_type ON brain_memories(memory_type);
