#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════
 *  SEED: Deployer Gate Rules — Extension Registration Runner
 *  ════════════════════════════════════════════════════════════
 *
 *  Connects to Central Brain PostgreSQL and runs:
 *    1. queue-schema.sql     (creates deployer_sync_state + deployer_gate_rules tables)
 *    2. seed-gate-rules.sql  (inserts all known coding extensions)
 *
 *  Usage:
 *    node tools/deployer-agent/seed-gate-rules.mjs
 *
 *  Environment variables (same as deployer-mcp.mjs):
 *    PGHOST     (default: localhost)
 *    PGPORT     (default: 5432)
 *    PGUSER     (default: homeu)
 *    PGPASSWORD (default: homeu_local_password)
 *    PGDATABASE (default: homeu)
 *
 *  Or via DATABASE_URI:
 *    DATABASE_URI=postgresql://user:pass@host:port/db \
 *      node tools/deployer-agent/seed-gate-rules.mjs
 * ════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AGENT_DIR = __dirname

async function main() {
  // Determine connection string
  let connectionString
  if (process.env.DATABASE_URI) {
    connectionString = process.env.DATABASE_URI
  } else {
    const DB = {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'homeu',
      password: process.env.PGPASSWORD || 'homeu_local_password',
      database: process.env.PGDATABASE || 'homeu',
    }
    connectionString = `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.database}`
  }

  console.log('🔌 Connecting to Central Brain PostgreSQL...')
  console.log(`   URI: ${connectionString.replace(/\/\/.*@/, '//***:***@')}`)

  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString, max: 1 })
  const client = await pool.connect()

  try {
    // Step 1: Run schema SQL (queue-schema.sql)
    console.log('\n📦 Running schema (queue-schema.sql)...')
    const schemaSql = readFileSync(resolve(AGENT_DIR, 'queue-schema.sql'), 'utf-8')
    await client.query(schemaSql)
    console.log('   ✅ Schema applied')

    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('deployer_sync_state', 'deployer_gate_rules')
      ORDER BY table_name
    `)
    console.log(`   📋 Tables: ${tables.rows.map(r => r.table_name).join(', ')}`)

    // Step 2: Seed gate rules
    console.log('\n🌱 Seeding gate rules...')

    const insertSql = `
      INSERT INTO deployer_gate_rules (extension_id, extension_name, sync_required, auto_sync)
      VALUES
        ('ext-roo-code',       'Roo Code (VS Code)',        TRUE, TRUE),
        ('ext-claude-code',    'Claude Code (CLI)',          TRUE, TRUE),
        ('ext-blackbox',       'Blackbox Agent',             TRUE, TRUE),
        ('ext-codex-brain',    'Codex Brain',                TRUE, TRUE),
        ('ext-kilo-code',      'Kilo Code',                  TRUE, TRUE),
        ('ext-roo-cline',      'Roo Cline',                  TRUE, TRUE),
        ('ext-superroo',       'SuperRoo VS Code',           TRUE, TRUE)
      ON CONFLICT (extension_id) DO UPDATE SET
        last_seen      = NOW(),
        sync_required  = TRUE,
        auto_sync      = TRUE
    `

    await client.query(insertSql)
    console.log('   ✅ Seed data inserted')

    // Verify
    const rules = await client.query(`
      SELECT extension_id, extension_name, sync_required, auto_sync, last_seen
      FROM deployer_gate_rules ORDER BY extension_name
    `)
    console.log(`\n📋 Registered extensions (${rules.rows.length}):`)
    for (const r of rules.rows) {
      console.log(`   ${r.extension_id.padEnd(20)} ${r.extension_name.padEnd(20)} sync=${r.sync_required} auto=${r.auto_sync}`)
    }

    console.log('\n✅ Seed complete! Gate rules are active.')
    console.log('   Extensions will auto-register on first deployer_sync_check call.')
  } catch (err) {
    console.error(`\n❌ Seed failed: ${err.message}`)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
