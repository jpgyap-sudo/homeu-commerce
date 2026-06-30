-- Migration 056: Drop dead Payload CMS tables
--
-- These tables were created by the old Payload CMS framework and are
-- not used by any running code. DaVinciOS_kv is intentionally kept
-- as it stores SMTP configuration set via the admin Settings panel.

DROP TABLE IF EXISTS public."DaVinciOS_locked_documents_rels" CASCADE;
DROP TABLE IF EXISTS public."DaVinciOS_locked_documents" CASCADE;
DROP TABLE IF EXISTS public."DaVinciOS_migrations" CASCADE;
DROP TABLE IF EXISTS public."DaVinciOS_preferences_rels" CASCADE;
DROP TABLE IF EXISTS public."DaVinciOS_preferences" CASCADE;
