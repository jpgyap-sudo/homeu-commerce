/**
 * Push tools/shopify-import/output/seo-audit.json into the "seo-health"
 * Payload global (table: seo_health), so the score/checklist/recommendations
 * show up in /admin.
 *
 * Usage: node src/scripts/seed-seo-health.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../../../')
const OUTPUT_DIR = path.join(REPO_ROOT, 'tools', 'shopify-import', 'output')

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  loadEnv()

  const report = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'seo-audit.json'), 'utf-8'))

  const client = new pg.Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  // Globals table holds a single row (id = 1)
  await client.query(
    `INSERT INTO seo_health (id, score, grade, last_audit_at, summary, updated_at, created_at)
     VALUES (1, $1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       score = EXCLUDED.score,
       grade = EXCLUDED.grade,
       last_audit_at = EXCLUDED.last_audit_at,
       summary = EXCLUDED.summary,
       updated_at = now()`,
    [report.score, report.grade, report.generatedAt, report.summary],
  )

  await client.query(
    `UPDATE seo_health SET
       totals_products = $1,
       totals_categories = $2,
       totals_pages = $3,
       redirects_summary_total = $4,
       redirects_summary_pending = $5,
       redirects_summary_active = $6,
       redirects_summary_verified = $7
     WHERE id = 1`,
    [
      report.totals.products,
      report.totals.categories,
      report.totals.pages,
      report.redirectsSummary.total,
      report.redirectsSummary.pending,
      report.redirectsSummary.active,
      report.redirectsSummary.verified,
    ],
  )

  // Replace checks + recommendations arrays
  await client.query('DELETE FROM seo_health_checks')
  for (let i = 0; i < report.checks.length; i++) {
    const c = report.checks[i]
    await client.query(
      `INSERT INTO seo_health_checks (id, _order, _parent_id, label, passed, total, impact, description)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7)`,
      [crypto.randomUUID(), i + 1, c.label, c.passed, c.total, c.impact, c.description || ''],
    )
  }

  await client.query('DELETE FROM seo_health_recommendations')
  for (let i = 0; i < report.recommendations.length; i++) {
    const r = report.recommendations[i]
    await client.query(
      `INSERT INTO seo_health_recommendations (id, _order, _parent_id, text, priority)
       VALUES ($1, $2, 1, $3, $4)`,
      [crypto.randomUUID(), i + 1, r.text, r.priority],
    )
  }

  await client.end()
  console.log(`✅ Seeded SEO health: ${report.score}/100 (${report.grade})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
