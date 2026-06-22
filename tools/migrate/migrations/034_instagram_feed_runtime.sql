-- Runtime schema for the DaVinciOS Instagram feed, moderation, and grid app.

CREATE TABLE IF NOT EXISTS instagram_posts (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR NOT NULL,
  caption TEXT,
  link VARCHAR,
  alt_text VARCHAR,
  width INTEGER,
  height INTEGER,
  products JSONB DEFAULT '[]'::jsonb,
  hotspots JSONB DEFAULT '[]'::jsonb,
  tags VARCHAR[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  instagram_media_id VARCHAR,
  media_type VARCHAR DEFAULT 'IMAGE',
  permalink VARCHAR,
  is_visible BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  status VARCHAR DEFAULT 'approved',
  source VARCHAR DEFAULT 'manual_upload',
  synced_at TIMESTAMPTZ,
  collection_ids INTEGER[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS instagram_grids (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  grid_type VARCHAR DEFAULT 'masonry',
  columns INTEGER DEFAULT 4,
  rows INTEGER DEFAULT 4,
  gap INTEGER DEFAULT 8,
  config JSONB DEFAULT '{}'::jsonb,
  cell_ids INTEGER[] DEFAULT '{}',
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  display_on VARCHAR[] DEFAULT '{}',
  status VARCHAR DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS grid_cells (
  id SERIAL PRIMARY KEY,
  grid_id INTEGER REFERENCES instagram_grids(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES instagram_posts(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  col_span INTEGER DEFAULT 1,
  row_span INTEGER DEFAULT 1,
  col_start INTEGER,
  row_start INTEGER,
  hotspot_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS instagram_posts_media_id_uidx
  ON instagram_posts (instagram_media_id)
  WHERE instagram_media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS instagram_posts_status_idx ON instagram_posts (status);
CREATE INDEX IF NOT EXISTS instagram_posts_pinned_idx ON instagram_posts (is_pinned);
CREATE INDEX IF NOT EXISTS grid_cells_grid_idx ON grid_cells (grid_id);
