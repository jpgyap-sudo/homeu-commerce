-- Migration 014: inbox_* tables are leftover PayloadCMS-era tables whose
-- `id` (character varying) columns relied on the old PayloadCMS runtime to
-- generate IDs in application code. That runtime was removed (see
-- CLAUDE.md "Framework removal (2026-06)"), so every INSERT into
-- inbox_channels / inbox_contacts / inbox_conversations / inbox_messages
-- now fails with "null value in column id violates not-null constraint"
-- unless the caller supplies an id explicitly. Give them a DB-side default
-- so plain INSERTs (e.g. the Facebook webhook) work again.

ALTER TABLE inbox_channels ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE inbox_contacts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE inbox_conversations ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE inbox_messages ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
