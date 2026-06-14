/**
 * Seed the `redirects` table from tools/shopify-import/output/redirects.json.
 * Existing rows (matched by from_path) keep their status/notes if already edited
 * (status/source_type are only set on insert, not overwritten on conflict).
 *
 * Usage: node src/scripts/seed-redirects.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
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

  const redirects = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'redirects.json'), 'utf-8'))

  const client = new pg.Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  let count = 0
  for (const r of redirects) {
    await client.query(
      `INSERT INTO redirects (from_path, to_path, redirect_type, status, source_type, priority, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (from_path) DO UPDATE SET
         to_path = EXCLUDED.to_path,
         updated_at = now()`,
      [r.fromPath, r.toPath, r.redirectType, r.status, r.sourceType, r.priority || 'medium'],
    )
    count++
  }

  await client.end()
  console.log(`✅ Seeded ${count} redirects`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
