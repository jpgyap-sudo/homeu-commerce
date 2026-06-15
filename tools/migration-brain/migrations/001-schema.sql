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

-- NOTE: Product/collection/image/redirect data is NOT duplicated here.
-- DaVinciOS CMS already owns the canonical `products`, `categories`, `media`,
-- and `redirects` tables (apps/website/src/collections/*) — the Central
-- Brain reads counts from those directly (see brain.mjs showStatus /
-- suggestNextSteps) instead of maintaining a second copy that would collide
-- with DaVinciOS's table names and drift out of sync.

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

CREATE INDEX IF NOT EXISTS idx_migration_phases_phase ON migration_phases(phase);
CREATE INDEX IF NOT EXISTS idx_scanned_pages_type ON scanned_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_migration_errors_severity ON migration_errors(severity);
CREATE INDEX IF NOT EXISTS idx_brain_memories_type ON brain_memories(memory_type);
