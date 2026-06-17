-- Workflow Engine Schema for DaVinciOS
-- Tracks operational workflow status across all website features
--
-- Run: psql -h localhost -U homeu -d homeu -f migrations/003-workflows.sql

-- ==========================
-- WORKFLOW FEATURE DEFINITIONS
-- ==========================

CREATE TABLE IF NOT EXISTS workflow_features (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,              -- unique feature identifier
  title VARCHAR(100) NOT NULL,                   -- human-readable name
  icon VARCHAR(10) DEFAULT '📋',                -- emoji icon for UI
  description TEXT,                               -- brief feature description
  category VARCHAR(50) DEFAULT 'catalog',        -- catalog, sales, engagement, content, system
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- WORKFLOW TASKS / STEPS
-- ==========================

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id SERIAL PRIMARY KEY,
  feature_slug VARCHAR(50) NOT NULL REFERENCES workflow_features(slug) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,                   -- task name
  description TEXT,                               -- what needs to be done
  status VARCHAR(30) DEFAULT 'pending',          -- pending, in_progress, completed, blocked, skipped
  priority VARCHAR(20) DEFAULT 'medium',         -- low, medium, high, critical
  assignee VARCHAR(100),                          -- who is responsible
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',                   -- flexible extra data (counts, links, refs)
  sort_order INTEGER DEFAULT 0,
  is_automated BOOLEAN DEFAULT FALSE,            -- true if system-generated
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- WORKFLOW AUDIT LOG
-- ==========================

CREATE TABLE IF NOT EXISTS workflow_audit_log (
  id SERIAL PRIMARY KEY,
  feature_slug VARCHAR(50) REFERENCES workflow_features(slug) ON DELETE CASCADE,
  task_id INTEGER REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,                   -- created, status_changed, assigned, note_added
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  note TEXT,
  performed_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- INDEXES
-- ==========================

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_feature ON workflow_tasks(feature_slug);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee ON workflow_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_feature ON workflow_audit_log(feature_slug);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_task ON workflow_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_features_category ON workflow_features(category);

-- ==========================
-- SEED DATA: Default feature definitions
-- ==========================

INSERT INTO workflow_features (slug, title, icon, description, category, sort_order) VALUES
  ('products',     'Products',     '🛋️', 'Product catalog management — add, edit, organize inventory',                          'catalog',    10),
  ('categories',   'Categories',   '📂', 'Category tree management — structure and organize product groupings',                'catalog',    20),
  ('customers',    'Customers',    '🏢', 'Customer database — manage accounts, contacts, and purchase history',               'sales',      30),
  ('rfq',          'RFQ Requests', '📋', 'Request for Quote lifecycle — new → contacted → quoted → closed',                  'sales',      40),
  ('quotations',   'Quotations',   '📄', 'Formal quotation management — create, send, track proposals',                       'sales',      50),
  ('leads',        'Leads',        '👤', 'Chatbot lead intake — score, qualify, and route prospects',                         'engagement', 60),
  ('appointments', 'Appointments', '📅', 'Scheduled consultations — manage booking calendar and follow-ups',                 'engagement', 70),
  ('media',        'Media Library','🖼️', 'Asset management — images, files, and digital asset organization',                  'content',    80),
  ('pages',        'CMS Pages',    '📝', 'Content pages — create and manage static pages and SEO metadata',                   'content',    90),
  ('redirects',    'Redirects',    '🔀', 'URL redirection management — preserve SEO equity during migrations',               'system',     100),
  ('analytics',    'Analytics',    '📊', 'Traffic and conversion analytics — monitor site performance',                       'system',     110),
  ('chatbot',      'AI Concierge', '🤖', 'Chatbot configuration — intent flows, lead scoring, appointment automation',       'engagement', 120)
ON CONFLICT (slug) DO NOTHING;
