#!/usr/bin/env node
// Run SQL migration against homeu DB
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URI ||
  'postgres://homeu:homeu_local_password@localhost:5432/homeu'

async function run() {
  const pool = new Pool({ connectionString, max: 1 })
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', '..', 'database', 'migration-001-create-email-tables.sql'),
      'utf-8'
    )
    console.log('[migrate] Running migration-001-create-email-tables.sql...')
    await pool.query(sql)
    console.log('[migrate] Migration completed successfully.')
  } catch (err) {
    console.error('[migrate] Migration failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

run()
