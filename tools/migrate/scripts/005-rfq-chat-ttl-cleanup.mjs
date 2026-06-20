#!/usr/bin/env node
/**
 * 005-rfq-chat-ttl-cleanup.mjs
 * ==============================
 * Daily TTL cleanup for RFQ chat messages.
 *
 * Marks messages older than 30 days as customer-invisible.
 * Does NOT physically delete — just flips customer_visible = FALSE.
 *
 * Run via cron: 0 3 * * * /usr/bin/node /path/to/this/script.mjs
 */

const DATABASE_URI =
  process.env.DATABASE_URI ||
  process.env.DB_URI ||
  'postgres://homeu:homeu@localhost:5432/homeu'

async function run() {
  console.log('[rfq-chat-ttl] Starting cleanup...')

  let pool
  try {
    const { Pool } = await import('pg')
    pool = new Pool({ connectionString: DATABASE_URI })

    // Mark messages older than 30 days as customer-invisible
    const result = await pool.query(`
      UPDATE rfq_chat_messages
      SET customer_visible = FALSE,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{archived_at}',
            to_jsonb(NOW())
          )
      WHERE created_at < NOW() - INTERVAL '30 days'
        AND customer_visible = TRUE
        AND deleted_at IS NULL
    `)

    console.log(`[rfq-chat-ttl] Marked ${result.rowCount} messages as customer-invisible (TTL expired)`)

    // Hard-delete messages physically older than 2 years
    const deleteResult = await pool.query(`
      DELETE FROM rfq_chat_messages
      WHERE created_at < NOW() - INTERVAL '2 years'
    `)
    console.log(`[rfq-chat-ttl] Physically deleted ${deleteResult.rowCount} messages older than 2 years`)

    // Hard-delete soft-deleted messages older than 90 days
    const purgeResult = await pool.query(`
      DELETE FROM rfq_chat_messages
      WHERE deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '90 days'
    `)
    console.log(`[rfq-chat-ttl] Purged ${purgeResult.rowCount} soft-deleted messages older than 90 days`)

    console.log('[rfq-chat-ttl] Cleanup complete')
  } catch (err) {
    console.error('[rfq-chat-ttl] Error:', err.message)
    process.exit(1)
  } finally {
    if (pool) await pool.end()
  }
}

run()
