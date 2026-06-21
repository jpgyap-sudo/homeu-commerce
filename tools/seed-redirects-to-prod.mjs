/**
 * One-off: copy local's 83 seeded redirects to production (which has the
 * table now, but no rows). Reads from local DB, emits a single INSERT batch
 * applied via the dump-then-pipe-to-psql pattern used elsewhere this session.
 */
import pg from 'pg'
import fs from 'fs'

const conn = process.env.DATABASE_URI || process.env.DATABASE_URL || 'postgres://homeu:homeu@localhost:5432/homeu'
const pool = new pg.Pool({ connectionString: conn, connectionTimeoutMillis: 8000 })

const TAG = '$HOMEU_RD_9c2f$'
const run = async () => {
  const { rows } = await pool.query(
    `SELECT source, target, type, status, source_type, notes, priority, verified FROM redirects ORDER BY id`
  )
  const lines = ['BEGIN;']
  for (const r of rows) {
    const notes = r.notes == null ? 'NULL' : `${TAG}${r.notes}${TAG}`
    lines.push(
      `INSERT INTO redirects (source, target, type, status, source_type, notes, priority, verified) ` +
      `VALUES (${TAG}${r.source}${TAG}, ${TAG}${r.target}${TAG}, ${TAG}${r.type}${TAG}, ${TAG}${r.status}${TAG}, ${TAG}${r.source_type}${TAG}, ${notes}, ${TAG}${r.priority}${TAG}, ${r.verified}) ` +
      `ON CONFLICT (source) DO NOTHING;`
    )
  }
  lines.push('COMMIT;')
  fs.writeFileSync('tools/output-redirects-seed.sql', lines.join('\n'), 'utf8')
  console.log(`Wrote ${rows.length} redirect INSERTs -> tools/output-redirects-seed.sql`)
  await pool.end()
}
run().catch((e) => { console.error('failed:', e.message); process.exit(1) })
