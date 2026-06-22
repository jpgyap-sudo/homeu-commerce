/**
 * Apply migration 036 (chatbot.appointments) and mark it in _migrations
 */
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import pg from 'pg'

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@localhost:5432/homeu'
  })

  // Read and apply the migration SQL
  const sql = readFileSync('tools/migrate/migrations/036_chatbot_appointments.sql', 'utf8')
  await pool.query(sql)
  console.log('Migration 036 applied')

  // Record in _migrations table (create if not exists)
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)

  const checksum = createHash('md5').update(sql).digest('hex')
  await pool.query(
    'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    ['036_chatbot_appointments.sql', checksum]
  )
  console.log('Marked migration as applied')

  // Verify
  const check = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='chatbot' AND table_name='appointments' ORDER BY ordinal_position"
  )
  console.log('chatbot.appointments columns:', check.rows.map(r => r.column_name).join(', '))

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
