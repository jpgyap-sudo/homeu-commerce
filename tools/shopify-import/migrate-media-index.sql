-- Media index: enrich the `media` table so it can be auto-populated from every
-- image source and categorized by usage (virtual folders, no manual sorting).
SET client_min_messages TO WARNING;

ALTER TABLE media ADD COLUMN IF NOT EXISTS sha256     VARCHAR;
ALTER TABLE media ADD COLUMN IF NOT EXISTS source     VARCHAR;            -- primary category: product|article|theme|brand|collection|other
ALTER TABLE media ADD COLUMN IF NOT EXISTS kind       VARCHAR;            -- product|banner|logo|article|image
ALTER TABLE media ADD COLUMN IF NOT EXISTS usage      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE media ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0;

-- One row per distinct DO Spaces object (dedupe by content hash).
CREATE UNIQUE INDEX IF NOT EXISTS media_sha256_key ON media(sha256) WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_source_idx ON media(source);
CREATE INDEX IF NOT EXISTS media_used_count_idx ON media(used_count);

SELECT 'media columns ready' AS status;
