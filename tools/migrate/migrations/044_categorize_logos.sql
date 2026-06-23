-- Migration: categorize_logos
-- Created: 2026-06-24T02:30:00Z

UPDATE media SET source = 'brand' WHERE filename IN ('HomeU_Logo_001.png', 'HomeU_Logo_016.png', 'HomeU_Logo_049.png');

UPDATE site_settings SET value = jsonb_set(value, '{logoUrl}', '"https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/661b4f02354d0a3763a4a0331fad557e312abdc19bece013a3d86bbe8582df1a.png"'::jsonb) WHERE key = 'header_settings';
