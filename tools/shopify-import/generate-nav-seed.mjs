#!/usr/bin/env node
/** Seed site_settings.nav_main / nav_footer from navigation.json. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nav = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../apps/website/src/data/navigation.json'), 'utf-8'))

const esc = (obj) => JSON.stringify(obj).replace(/'/g, "''")

const sql = `SET client_min_messages TO WARNING;
INSERT INTO site_settings (key, value, updated_at)
VALUES ('nav_main', '${esc(nav.main || [])}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value, updated_at)
VALUES ('nav_footer', '${esc(nav.footer || [])}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
SELECT key, jsonb_array_length(value) AS items FROM site_settings WHERE key IN ('nav_main','nav_footer');
`

const out = path.join(__dirname, 'output', 'homeu-nav-seed.sql')
fs.writeFileSync(out, sql, { encoding: 'utf8' })
console.log(`✅ ${out}`)
console.log(`   main items: ${(nav.main || []).length}, footer items: ${(nav.footer || []).length}`)
