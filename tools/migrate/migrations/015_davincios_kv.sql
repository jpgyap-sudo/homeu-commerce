-- Migration 015: "DaVinciOS_kv" key-value store
--
-- This table is defined in 001_initial_schema.sql (the legacy PayloadCMS
-- pg_dump baseline) but is missing from this database — the baseline's
-- _migrations bookkeeping says 001 is applied, yet several tables it
-- defines (DaVinciOS_kv and the now-unused DaVinciOS_locked_documents/
-- preferences/migrations PayloadCMS-internal tables) don't actually exist.
--
-- "DaVinciOS_kv" is the only one of those still read/written by current
-- code: smtp-config.ts, the admin Email/Social settings routes, the
-- unified app-config.ts registry, and the Facebook webhook's verify-token
-- lookup all query it by its exact quoted (mixed-case) name. Without it,
-- every one of those silently falls back to env vars / hardcoded defaults
-- and admin-saved settings never persist.

CREATE TABLE IF NOT EXISTS "DaVinciOS_kv" (
  id SERIAL PRIMARY KEY,
  key VARCHAR NOT NULL,
  data JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "DaVinciOS_kv_key_idx" ON "DaVinciOS_kv" USING btree (key);
