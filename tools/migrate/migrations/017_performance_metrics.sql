-- 015_performance_metrics.sql
-- Adds real-user monitoring table for Core Web Vitals + load time tracking.

BEGIN;

CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  lcp INTEGER,              -- Largest Contentful Paint (ms)
  fcp INTEGER,              -- First Contentful Paint (ms)
  ttfb INTEGER,             -- Time to First Byte (ms)
  cls TEXT,                 -- Cumulative Layout Shift (decimal string)
  load_time INTEGER,        -- Full page load time (ms)
  device_type TEXT,         -- 'desktop' | 'tablet' | 'mobile'
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS perf_metrics_recorded_at_idx ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS perf_metrics_path_idx ON performance_metrics(path);

COMMIT;
