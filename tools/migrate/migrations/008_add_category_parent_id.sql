-- Migration: add parent_id to categories (self-referencing, for subcategory hierarchy)
-- Created: 2026-06-21
--
-- The admin Categories new/edit pages already have a working "Parent Category"
-- dropdown, and both /api/categories routes already read/write parent_id —
-- but the column itself was never created, so every save silently failed to
-- persist it (POST/PATCH would error; GET always returned null). Idempotent.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);
