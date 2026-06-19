/**
 * Seed the 4 footer sections into homepage_sections (idempotent).
 * The footer components fall back to site-config.json / navigation.json when
 * config is empty, so seeding empty-config rows is enough to make the footer
 * render and become editable in /admin/theme → Footer.
 *
 *   node seed-footer-sections.mjs            # local DB
 *   node seed-footer-sections.mjs --emit-sql # also write output/seed-footer.sql for VPS
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from '../../node_modules/pg/lib/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dirname, '..', '..', 'apps', 'website', '.env'), 'utf8')
const uri = (env.match(/DATABASE_URI=(.*)/) || [])[1]?.trim()

const SQL = `INSERT INTO homepage_sections (type, position, enabled, config)
SELECT v.type, v.position, true, '{}'::jsonb
FROM (VALUES
  ('footer_brand', 1000),
  ('footer_quick_links', 1010),
  ('footer_newsletter', 1020),
  ('footer_social', 1030)
) AS v(type, position)
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections s WHERE s.type = v.type);`

if (process.argv.includes('--emit-sql')) {
  const out = path.join(__dirname, 'output', 'seed-footer.sql')
  fs.writeFileSync(out, SQL + '\n', 'utf8')
  console.log('Wrote', out)
}

const pool = new pg.Pool({ connectionString: uri })
const res = await pool.query(SQL)
console.log(`Inserted ${res.rowCount} footer section(s).`)
const check = await pool.query(`SELECT type, position, enabled FROM homepage_sections WHERE type LIKE 'footer%' ORDER BY position`)
check.rows.forEach(r => console.log('  ', r.type, '| pos', r.position, '| enabled', r.enabled))
await pool.end()
