-- Canonical runtime schema for analytics, live visitors, report preferences,
-- and the admin workflow dashboard. Idempotent for environments that already
-- ran the older tools/migration-brain migrations.

CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  title VARCHAR(300),
  referrer VARCHAR(1000),
  visitor_id VARCHAR(100),
  user_id INTEGER,
  is_admin BOOLEAN DEFAULT FALSE,
  source VARCHAR(100),
  source_category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS source_category VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_admin ON page_views(is_admin, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  visitor_id VARCHAR(100) PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_path VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  ip_address VARCHAR(45),
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen ON visitor_sessions(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_admin ON visitor_sessions(is_admin, last_seen DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_features (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(20) DEFAULT '📋',
  description TEXT,
  category VARCHAR(50) DEFAULT 'catalog',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id SERIAL PRIMARY KEY,
  feature_slug VARCHAR(50) NOT NULL REFERENCES workflow_features(slug) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assignee VARCHAR(100),
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_automated BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_audit_log (
  id SERIAL PRIMARY KEY,
  feature_slug VARCHAR(50) REFERENCES workflow_features(slug) ON DELETE CASCADE,
  task_id INTEGER REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  note TEXT,
  performed_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_feature ON workflow_tasks(feature_slug);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee ON workflow_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_feature ON workflow_audit_log(feature_slug);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_task ON workflow_audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_features_category ON workflow_features(category);

INSERT INTO workflow_features (slug, title, icon, description, category, sort_order) VALUES
  ('products', 'Products', '🛋️', 'Product catalog management', 'catalog', 10),
  ('categories', 'Categories', '📂', 'Category tree management', 'catalog', 20),
  ('customers', 'Customers', '🏢', 'Customer database', 'sales', 30),
  ('rfq', 'RFQ Requests', '📋', 'Request for Quote lifecycle', 'sales', 40),
  ('quotations', 'Quotations', '📄', 'Formal quotation management', 'sales', 50),
  ('leads', 'Leads', '👤', 'Chatbot lead intake and qualification', 'engagement', 60),
  ('appointments', 'Appointments', '📅', 'Scheduled showroom consultations', 'engagement', 70),
  ('media', 'Media Library', '🖼️', 'Digital asset management', 'content', 80),
  ('pages', 'CMS Pages', '📝', 'Static page and SEO management', 'content', 90),
  ('redirects', 'Redirects', '🔀', 'URL redirection management', 'system', 100),
  ('analytics', 'Analytics', '📊', 'Traffic and conversion analytics', 'system', 110),
  ('chatbot', 'AI Concierge', '🤖', 'Concierge conversations and automation', 'engagement', 120)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;
