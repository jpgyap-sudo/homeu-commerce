/**
 * Chatbot Schema Migration Script
 *
 * Applies the chatbot schema (apps/website/src/lib/chatbot/schema.sql) to
 * the PostgreSQL database. Safe to run multiple times — all CREATE TABLE/INDEX
 * statements use IF NOT EXISTS.
 *
 * Usage:
 *   node apps/website/src/scripts/migrate-chatbot-schema.mjs
 *
 * Environment variables:
 *   DATABASE_URI  — PostgreSQL connection string (default: postgres://homeu:homeu@localhost:5432/homeu)
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const connectionString =
    process.env.DATABASE_URI ||
    'postgres://homeu:homeu@localhost:5432/homeu'

  const pool = new pg.Pool({ connectionString })

  console.log(`[migrate-chatbot-schema] Connecting to PostgreSQL at ${connectionString.replace(/\/\/.*@/, '//***@')}`)

  try {
    // Test connection
    const testResult = await pool.query('SELECT 1')
    console.log(`[migrate-chatbot-schema] Connection OK (${testResult.rows.length})`)

    // Read schema file
    const schemaPath = join(__dirname, '..', 'lib', 'chatbot', 'schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')

    console.log(`[migrate-chatbot-schema] Applying schema from ${schemaPath}`)

    // Split by semicolons and execute each statement
    // We split on newlines to handle multi-line statements
    const statements = schemaSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let executed = 0
    for (const stmt of statements) {
      try {
        await pool.query(stmt)
        executed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Ignore "already exists" errors for idempotent runs
        if (msg.includes('already exists')) {
          console.log(`[migrate-chatbot-schema]  ⚠ ${msg} (continuing)`)
        } else {
          console.error(`[migrate-chatbot-schema]  ✗ Error executing statement:\n  ${stmt.substring(0, 120)}...\n  ${msg}`)
        }
      }
    }

    // Verify tables were created
    const tablesResult = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'chatbot'
       ORDER BY table_name`
    )

    console.log(`[migrate-chatbot-schema] Tables in chatbot schema: ${tablesResult.rows.length}`)
    for (const row of tablesResult.rows) {
      const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM chatbot.${row.table_name}`)
      console.log(`  - chatbot.${row.table_name}: ${countResult.rows[0].cnt} rows`)
    }

    console.log(`[migrate-chatbot-schema] ✅ Migration complete — ${executed} statements executed, ${tablesResult.rows.length} tables verified`)
  } catch (err) {
    console.error('[migrate-chatbot-schema] ❌ Migration failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
