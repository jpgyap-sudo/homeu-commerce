/**
 * Chatbot Database Layer
 *
 * PostgreSQL helpers for the chatbot schema (chatbot.leads, chatbot.conversations,
 * chatbot.messages, chatbot.lead_ledger_events).
 *
 * Uses the DATABASE_URI environment variable for connection.
 * Pool is created lazily to avoid issues during Next.js build time.
 */

import { Pool, type QueryResultRow } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URI
    if (!connectionString) {
      throw new Error('[chatbot-db] DATABASE_URI environment variable is not set')
    }
    pool = new Pool({ connectionString })
  }
  return pool
}

/**
 * Execute a SQL query against the PostgreSQL database.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const client = getPool()
    const result = await client.query<T>(text, params)
    return result.rows
  } catch (err) {
    console.error('[chatbot-db] Query error:', err instanceof Error ? err.message : err)
    throw err
  }
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}

// ── Types ────────────────────────────────────────────────────────

export interface LeadInsert {
  name: string
  email: string
  mobile: string
  buyerType?: string
  companyName?: string
  sourcePage?: string
  consent?: boolean
  daVinciosCustomerId?: string
  metadata?: Record<string, unknown>
}

export interface ConversationInsert {
  leadId: string
  status?: string
  currentIntent?: string
  deviceInfo?: Record<string, unknown>
}

export interface MessageInsert {
  conversationId: string
  senderType: 'visitor' | 'bot' | 'admin' | 'system'
  content?: string
  messageType?: string
  metadata?: Record<string, unknown>
}

export interface LedgerEventInsert {
  leadId: string
  conversationId?: string
  eventType: string
  eventData?: Record<string, unknown>
  scoreDelta: number
}

// ── Leads ────────────────────────────────────────────────────────

/**
 * Insert a new lead into chatbot.leads and return the generated ID.
 */
export async function insertLead(data: LeadInsert): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO chatbot.leads (name, email, mobile, buyer_type, company_name, source_page, consent, daVincios_customer_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      data.name.trim(),
      data.email.trim(),
      data.mobile.trim(),
      data.buyerType || null,
      data.companyName?.trim() || null,
      data.sourcePage || null,
      data.consent !== false,
      data.daVinciosCustomerId || null,
      JSON.stringify(data.metadata || {}),
    ]
  )
  return rows[0].id
}

/**
 * Look up a lead by email address.
 */
export async function getLeadByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
  const rows = await query<{ id: string; name: string; email: string }>(
    'SELECT id, name, email FROM chatbot.leads WHERE email = $1 LIMIT 1',
    [email.trim()]
  )
  return rows[0] || null
}

/**
 * Look up a lead by ID.
 */
export async function getLeadById(id: string): Promise<QueryResultRow | null> {
  const rows = await query('SELECT * FROM chatbot.leads WHERE id = $1', [id])
  return rows[0] || null
}

/**
 * Update a lead's daVincios_customer_id to link it to a registered customer.
 */
export async function linkLeadToDb(leadId: string, customerId: string): Promise<boolean> {
  const rows = await query(
    'UPDATE chatbot.leads SET daVincios_customer_id = $1, updated_at = now() WHERE id = $2 RETURNING id',
    [customerId, leadId]
  )
  return rows.length > 0
}

// ── Conversations ────────────────────────────────────────────────

/**
 * Insert a new conversation into chatbot.conversations and return the generated ID.
 */
export async function insertConversation(data: ConversationInsert): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO chatbot.conversations (lead_id, status, current_intent, device_info)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      data.leadId,
      data.status || 'active',
      data.currentIntent || null,
      JSON.stringify(data.deviceInfo || {}),
    ]
  )
  return rows[0].id
}

// ── Messages ─────────────────────────────────────────────────────

/**
 * Insert a message into chatbot.messages and return the generated ID.
 */
export async function insertMessage(data: MessageInsert): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO chatbot.messages (conversation_id, sender_type, content, message_type, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.conversationId,
      data.senderType,
      data.content || null,
      data.messageType || 'text',
      JSON.stringify(data.metadata || {}),
    ]
  )

  // Update conversation message count and last_message_at
  // Use COALESCE to handle NULL message_count (legacy rows)
  try {
    await query(
      'UPDATE chatbot.conversations SET message_count = COALESCE(message_count, 0) + 1, last_message_at = now() WHERE id = $1',
      [data.conversationId]
    )
  } catch (err) {
    console.error('[chatbot-db] Failed to update conversation message count:', err)
  }

  return rows[0].id
}

// ── Ledger Events ────────────────────────────────────────────────

/**
 * Insert a ledger event into chatbot.lead_ledger_events.
 */
export async function insertLedgerEvent(data: LedgerEventInsert): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO chatbot.lead_ledger_events (lead_id, conversation_id, event_type, event_data, score_delta)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.leadId,
      data.conversationId || null,
      data.eventType,
      JSON.stringify(data.eventData || {}),
      data.scoreDelta,
    ]
  )
  return rows[0].id
}

/**
 * Get all ledger events for a lead.
 */
export async function getLedgerEvents(leadId: string): Promise<QueryResultRow[]> {
  return query(
    'SELECT * FROM chatbot.lead_ledger_events WHERE lead_id = $1 ORDER BY created_at ASC',
    [leadId]
  )
}

/**
 * Get all leads with computed scores for admin dashboard display.
 */
export async function getLeadsWithScores(limit = 50, offset = 0): Promise<QueryResultRow[]> {
  return query(
    `SELECT l.id, l.name, l.email, l.mobile, l.buyer_type, l.company_name,
            l.source_page, l.status, l.score, l.score_label,
            l.created_at, l.daVincios_customer_id,
            (SELECT COUNT(*) FROM chatbot.conversations c WHERE c.lead_id = l.id) AS conversation_count,
            (SELECT COUNT(*) FROM chatbot.messages m
             JOIN chatbot.conversations c ON c.id = m.conversation_id
             WHERE c.lead_id = l.id) AS message_count
     FROM chatbot.leads l
     ORDER BY l.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
}

/**
 * Close the database pool (for cleanup during testing).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
