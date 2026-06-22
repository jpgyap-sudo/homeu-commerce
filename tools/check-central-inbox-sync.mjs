/**
 * Central Inbox Sync Diagnostic Tool
 *
 * Checks the full pipeline: chatbot messages → central inbox query
 * Run: node tools/check-central-inbox-sync.mjs
 *
 * Looks for these known issues:
 * 1. Conversations exist in chatbot.conversations but without messages
 * 2. Messages exist but without matching conversations (orphaned)
 * 3. Conversations with status not matching the central inbox WHERE clause
 * 4. Missing last_message_at (causes ordering problems)
 * 5. Different DB connections (chatbot pool vs main pool)
 */

import pg from 'pg'
const { Pool } = pg

const connectionString =
  process.env.DATABASE_URI ||
  process.env.DB_URI ||
  'postgres://homeu:homeu_local_password@localhost:5432/homeu'

const pool = new Pool({ connectionString })

async function check() {
  console.log('═══ CENTRAL INBOX SYNC DIAGNOSTIC ═══')
  console.log(`DB: ${connectionString.replace(/\/\/.*@/, '//***@')}\n`)

  // 1. Chatbot conversations summary
  const convCount = await pool.query(`SELECT COUNT(*)::int FROM chatbot.conversations`)
  console.log(`Total conversations: ${convCount.rows[0].count}`)

  const convByStatus = await pool.query(`
    SELECT COALESCE(status, 'NULL') as status, COUNT(*)::int
    FROM chatbot.conversations GROUP BY status ORDER BY status
  `)
  console.log('\nConversations by status:')
  for (const row of convByStatus.rows) {
    console.log(`  ${row.status}: ${row.count}`)
  }

  // 2. Conversations that would be returned by central inbox (status = 'active' OR NULL)
  const inboxVisible = await pool.query(`
    SELECT COUNT(*)::int FROM chatbot.conversations
    WHERE (status IS NULL OR status = 'active')
  `)
  console.log(`\nInbox-visible conversations: ${inboxVisible.rows[0].count}`)

  // 3. Conversations with no last_message_at
  const noLastMsg = await pool.query(`
    SELECT COUNT(*)::int FROM chatbot.conversations
    WHERE last_message_at IS NULL
  `)
  console.log(`Conversations with NULL last_message_at: ${noLastMsg.rows[0].count}`)

  // 4. Message counts
  const msgCount = await pool.query(`SELECT COUNT(*)::int FROM chatbot.messages`)
  console.log(`\nTotal messages: ${msgCount.rows[0].count}`)

  const msgsBySender = await pool.query(`
    SELECT sender_type, COUNT(*)::int FROM chatbot.messages GROUP BY sender_type
  `)
  console.log('Messages by sender:')
  for (const row of msgsBySender.rows) {
    console.log(`  ${row.sender_type}: ${row.count}`)
  }

  // 5. Conversations with messages but NULL last_message_at (potential sync issue)
  const missingUpdates = await pool.query(`
    SELECT COUNT(*)::int FROM chatbot.conversations c
    WHERE c.last_message_at IS NULL
    AND EXISTS (SELECT 1 FROM chatbot.messages m WHERE m.conversation_id = c.id)
  `)
  console.log(`\nConversations with messages but NULL last_message_at: ${missingUpdates.rows[0].count}`)

  // 6. Orphaned messages (conversation doesn't exist)
  const orphaned = await pool.query(`
    SELECT COUNT(*)::int FROM chatbot.messages m
    WHERE NOT EXISTS (SELECT 1 FROM chatbot.conversations c WHERE c.id = m.conversation_id)
  `)
  console.log(`Orphaned messages (no parent conversation): ${orphaned.rows[0].count}`)

  // 7. Show recent conversations with their message counts
  const recent = await pool.query(`
    SELECT
      c.id, c.status,
      c.last_message_at,
      c.message_count,
      COALESCE(l.name, 'NO LEAD') as lead_name,
      COALESCE(l.email, 'NO EMAIL') as lead_email,
      (SELECT COUNT(*) FROM chatbot.messages m WHERE m.conversation_id = c.id) as actual_msg_count
    FROM chatbot.conversations c
    LEFT JOIN chatbot.leads l ON l.id = c.lead_id
    ORDER BY c.created_at DESC
    LIMIT 15
  `)
  console.log('\nRecent 15 conversations:')
  console.log('ID | STATUS | last_msg_at | msg_count | actual_msgs | lead')
  for (const r of recent.rows) {
    console.log(
      `${(r.id || '').substring(0, 8)} | ${r.status || 'NULL'} | ` +
      `${r.last_message_at ? r.last_message_at.toISOString() : 'NULL'} | ` +
      `${r.message_count} | ${r.actual_msg_count} | ${r.lead_name}`
    )
  }

  // 8. Most recent 10 messages with their conversation context
  const recentMsgs = await pool.query(`
    SELECT
      m.id, m.conversation_id, m.sender_type,
      LEFT(m.content, 80) as content_preview,
      m.created_at,
      c.status as conv_status
    FROM chatbot.messages m
    JOIN chatbot.conversations c ON c.id = m.conversation_id
    ORDER BY m.created_at DESC
    LIMIT 10
  `)
  console.log('\nRecent 10 messages:')
  for (const m of recentMsgs.rows) {
    console.log(
      `${(m.id || '').substring(0, 8)} | conv:${(m.conversation_id || '').substring(0, 8)} | ` +
      `${m.sender_type} | conv_status:${m.conv_status} | "${m.content_preview}"`
    )
  }

  // 9. Simulate the exact central inbox query for website
  console.log('\n═══ Simulating Central Inbox Website Query ═══')
  const inboxSim = await pool.query(`
    SELECT
      c.id::text AS "id",
      'website' AS "channel",
      COALESCE(l.name, 'Website Visitor') AS "contactName",
      COALESCE(l.email, '') AS "contactEmail",
      l.mobile AS "contactPhone",
      COALESCE(c.current_intent, 'Website Chat') AS "subject",
      COALESCE(
        (SELECT m.content FROM chatbot.messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1),
        'No messages yet'
      ) AS "lastMessage",
      c.last_message_at::text AS "lastMessageAt",
      (SELECT COUNT(*) FROM chatbot.messages m
       WHERE m.conversation_id = c.id AND m.sender_type = 'visitor'
      )::int AS "unreadCount",
      COALESCE(c.status, 'open') AS "status"
    FROM chatbot.conversations c
    LEFT JOIN chatbot.leads l ON l.id = c.lead_id
    WHERE (c.status IS NULL OR c.status = 'active')
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 20
  `)
  console.log(`Results: ${inboxSim.rows.length} conversations`)
  for (const r of inboxSim.rows) {
    console.log(
      `${(r.id || '').substring(0, 8)} | ${r.contactName} | ` +
      `lastMsg: "${(r.lastMessage || '').substring(0, 50)}" | ` +
      `at: ${r.lastMessageAt || 'NULL'} | unread: ${r.unreadCount}`
    )
  }

  await pool.end()
}

check().catch(err => {
  console.error('DIAGNOSTIC ERROR:', err)
  process.exit(1)
})
