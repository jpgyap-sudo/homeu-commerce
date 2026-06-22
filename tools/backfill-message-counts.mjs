/**
 * Backfill message_count and last_message_at for existing chatbot conversations
 * that have messages but show count=0.
 */
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@localhost:5432/homeu'
})

async function main() {
  const result = await pool.query(`
    UPDATE chatbot.conversations c
    SET
      message_count = (SELECT COUNT(*)::int FROM chatbot.messages m WHERE m.conversation_id = c.id),
      last_message_at = COALESCE(
        (SELECT MAX(m.created_at) FROM chatbot.messages m WHERE m.conversation_id = c.id),
        c.last_message_at
      )
    WHERE EXISTS (SELECT 1 FROM chatbot.messages m WHERE m.conversation_id = c.id)
    RETURNING c.id, c.message_count
  `)
  console.log('Backfilled', result.rowCount, 'conversations')
  for (const row of result.rows) {
    console.log(' ', row.id.substring(0, 8), '-> message_count:', row.message_count)
  }

  // Verify
  const check = await pool.query(`
    SELECT c.id, c.message_count, c.last_message_at,
      (SELECT COUNT(*)::int FROM chatbot.messages m WHERE m.conversation_id = c.id) AS actual
    FROM chatbot.conversations c
    ORDER BY c.created_at DESC
  `)
  console.log('\nVerification:')
  for (const row of check.rows) {
    const ok = row.message_count === row.actual ? '✓' : '✗'
    console.log(ok, row.id.substring(0, 8), 'count:', row.message_count, 'actual:', row.actual)
  }

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
