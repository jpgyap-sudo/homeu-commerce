#!/usr/bin/env node
/**
 * Simple PostgreSQL migration runner.
 *
 * Scans tools/migrate/migrations/ for .sql files, tracks applied migrations
 * in a _migrations table, and runs unapplied ones in order.
 *
 * Usage:
 *   node tools/migrate/migrate.mjs                    # run pending migrations
 *   node tools/migrate/migrate.mjs --status            # show migration status
 *   node tools/migrate/migrate.mjs --create <name>     # create a new migration file
 *   node tools/migrate/migrate.mjs --baseline <file>   # mark an imported legacy schema as applied
 *
 * Migration file naming:
 *   migrations/001_create_initial_tables.sql
 *   migrations/002_add_short_description_to_products.sql
 *
 * The _migrations table tracks: filename, checksum, applied_at
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

// ── DB connection ────────────────────────────────────────────────────────
const connectionString = process.env.DATABASE_URI || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString, max: 1 })

async function query(sql, params = []) {
  const client = await pool.connect()
  try { return await client.query(sql, params) } finally { client.release() }
}

// ── Ensure _migrations table exists ─────────────────────────────────────
async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === '--create') {
    const name = args.slice(1).join('_').replace(/[^a-z0-9_]/gi, '_').toLowerCase()
    if (!name) { console.error('Usage: migrate.mjs --create <name>'); process.exit(1) }
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    const nextNum = String(files.length + 1).padStart(3, '0')
    const filename = `${nextNum}_${name}.sql`
    const filepath = join(MIGRATIONS_DIR, filename)
    writeFileSync(filepath, `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n`)
    console.log(`Created: ${filepath}`)
    process.exit(0)
  }

  await ensureMigrationTable()

  if (cmd === '--baseline') {
    const targets = args.slice(1)
    if (targets.length === 0) {
      console.error('Usage: migrate.mjs --baseline <migration.sql> [more.sql]')
      await pool.end()
      process.exit(1)
    }
    const available = new Set(readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')))
    for (const filename of targets) {
      if (!available.has(filename)) {
        console.error(`Unknown migration: ${filename}`)
        await pool.end()
        process.exit(1)
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      await query(
        `INSERT INTO _migrations (filename, checksum)
         VALUES ($1, $2)
         ON CONFLICT (filename) DO NOTHING`,
        [filename, checksum]
      )
      console.log(`Baselined: ${filename}`)
    }
    await pool.end()
    return
  }

  if (cmd === '--status') {
    const all = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    const { rows: applied } = await query('SELECT filename, applied_at FROM _migrations ORDER BY id')
    const appliedSet = new Set(applied.map((r) => r.filename))
    console.log('\nMigration Status:')
    console.log('─'.repeat(60))
    for (const f of all) {
      const a = applied.find((r) => r.filename === f)
      console.log(`  ${a ? '✅' : '⬜'} ${f} ${a ? `(${a.applied_at.toISOString()})` : '(pending)'}`)
    }
    console.log(`\n${applied.length}/${all.length} applied`)
    process.exit(0)
  }

  // ── Run pending migrations ──────────────────────────────────────────
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
  const { rows: applied } = await query('SELECT filename FROM _migrations ORDER BY id')
  const appliedSet = new Set(applied.map((r) => r.filename))

  const pending = files.filter(f => !appliedSet.has(f))
  if (pending.length === 0) {
    console.log('No pending migrations.')
    await pool.end()
    process.exit(0)
  }

  console.log(`Found ${pending.length} pending migration(s):`)
  for (const f of pending) console.log(`  → ${f}`)

  for (const f of pending) {
    const filepath = join(MIGRATIONS_DIR, f)
    const sql = readFileSync(filepath, 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')

    console.log(`\nRunning: ${f}...`)
    try {
      await query('BEGIN')
      await query(sql)
      await query(
        'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)',
        [f, checksum]
      )
      await query('COMMIT')
      console.log(`  ✅ Done`)
    } catch (err) {
      await query('ROLLBACK')
      console.error(`  ❌ Failed: ${err.message}`)
      await pool.end()
      process.exit(1)
    }
  }

  console.log(`\n✅ All migrations applied.`)
  await pool.end()
}

main().catch(err => {
  console.error('Migration error:', err.message)
  process.exit(1)
})
