/**
 * db-pull-prod.mjs — refresh LOCAL content tables from PRODUCTION
 * ==============================================================
 * Production is the single source of truth for design/content. Run this to make
 * your local DB match production before you start working, so localhost == the
 * live site and you never re-introduce drift.
 *
 * Pulls ONLY design/content config tables (prod → local). It does NOT touch
 * production, and does NOT pull transactional tables (customers/RFQs/etc).
 *
 *   node tools/db-pull-prod.mjs
 *
 * Requires: SSH key at ~/.ssh/id_superroo_vps, local DATABASE_URI, `pg` installed.
 */
import pg from 'pg'
import { execSync } from 'child_process'

// Design/content tables only (safe to replace wholesale from prod).
const TABLES = ['site_settings', 'homepage_sections']

const VPS = process.env.HOMEU_VPS_SSH || 'root@100.64.175.88'
const HOME = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/')
const SSH = `ssh -i "${HOME}/.ssh/id_superroo_vps" -o StrictHostKeyChecking=no -o ConnectTimeout=15`
const localUri = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'

const tableArgs = TABLES.map((t) => `--table=public.${t}`).join(' ')

console.log('⬇️  Pulling content tables from production →', TABLES.join(', '))
const dump = execSync(
  `${SSH} ${VPS} "docker exec homeu-commerce-postgres-1 pg_dump -U homeu -d homeu --data-only --inserts ${tableArgs}"`,
  { encoding: 'utf8', maxBuffer: 1e8 },
)

const local = new pg.Pool({ connectionString: localUri, connectionTimeoutMillis: 8000 })
const run = async () => {
  await local.query('BEGIN')
  try {
    for (const t of TABLES) await local.query(`TRUNCATE public.${t} RESTART IDENTITY CASCADE`)
    await local.query(dump) // node-postgres runs multi-statement INSERTs in one call
    await local.query('COMMIT')
    console.log('✅ Local content tables now match production. localhost == live site for these.')
  } catch (e) {
    await local.query('ROLLBACK')
    throw e
  } finally {
    await local.end()
  }
}
run().catch((e) => { console.error('db-pull failed (local rolled back):', e.message); process.exit(1) })
