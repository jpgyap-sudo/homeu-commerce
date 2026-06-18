import { query } from '@/lib/db'

export type Channel = 'website' | 'email' | 'facebook' | 'instagram' | 'all'
export type InboxTab = Channel | 'archived'

export interface UnifiedConversation {
  id: string
  channel: Channel
  contactName: string
  contactEmail: string
  contactPhone?: string
  subject: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: string
  tags: string[]
  customerId?: number
}

export interface UnifiedMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  body: string
  channel: Channel
  createdAt: string
  externalId?: string
}

/**
 * Fetch conversations from ALL channels, unified format.
 * Uses parameterized queries — no string interpolation.
 */
export async function getUnifiedInbox(params: {
  tab?: InboxTab
  channelId?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ conversations: UnifiedConversation[]; total: number }> {
  const { tab = 'all', search = '', limit = 50, offset = 0 } = params
  const results: UnifiedConversation[] = []

  const searchPattern = search ? `%${search}%` : null

  // ── Website Chat ──
  if (tab === 'all' || tab === 'website') {
    try {
      const { rows } = await query(`
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
          COALESCE(c.status, 'open') AS "status",
          ARRAY[]::text[] AS "tags",
          NULL::int AS "customerId"
        FROM chatbot.conversations c
        LEFT JOIN chatbot.leads l ON l.id = c.lead_id
        WHERE (c.status IS NULL OR c.status = 'active')
          ${searchPattern ? `AND (COALESCE(l.name, '') ILIKE $1 OR COALESCE(l.email, '') ILIKE $1 OR COALESCE(c.current_intent, '') ILIKE $1)` : ''}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${Math.min(limit, 20)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* table may not exist */ }
  }

  // ── Email ──
  if (tab === 'all' || tab === 'email') {
    try {
      const { rows } = await query(`
        SELECT
          e.id::text AS "id",
          'email' AS "channel",
          COALESCE(e.sender_name, e.sender_email, 'Unknown') AS "contactName",
          e.sender_email AS "contactEmail",
          NULL AS "contactPhone",
          e.subject AS "subject",
          COALESCE(e.body_text, '') AS "lastMessage",
          e.received_at::text AS "lastMessageAt",
          CASE WHEN e.is_read THEN 0 ELSE 1 END::int AS "unreadCount",
          e.category AS "status",
          ARRAY[e.category]::text[] AS "tags",
          e.customer_id::int AS "customerId"
        FROM emails e
        WHERE e.folder = 'INBOX'
          ${searchPattern ? `AND (e.subject ILIKE $1 OR e.sender_name ILIKE $1 OR e.sender_email ILIKE $1 OR e.body_text ILIKE $1)` : ''}
        ORDER BY e.received_at DESC
        LIMIT ${Math.min(limit, 20)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* emails table may not exist */ }
  }

  // ── Facebook / Instagram ──
  if (tab === 'all' || tab === 'facebook' || tab === 'instagram') {
    try {
      const { rows } = await query(`
        SELECT
          c.id AS "id",
          ch.type AS "channel",
          COALESCE(ct.name, 'User') AS "contactName",
          COALESCE(ct.email, '') AS "contactEmail",
          ct.phone AS "contactPhone",
          COALESCE(c.subject, ch.type || ' Message') AS "subject",
          COALESCE(
            (SELECT m.body FROM inbox_messages m
             WHERE m.conversation_id = c.id
             ORDER BY m.created_at DESC LIMIT 1),
            'No messages yet'
          ) AS "lastMessage",
          c.last_message_at::text AS "lastMessageAt",
          0::int AS "unreadCount",
          COALESCE(c.status, 'open') AS "status",
          ARRAY[]::text[] AS "tags",
          ct.customer_id::int AS "customerId"
        FROM inbox_conversations c
        JOIN inbox_channels ch ON ch.id = c.channel_id
        LEFT JOIN inbox_contacts ct ON ct.id = c.contact_id
        WHERE c.status NOT IN ('archived')
          ${searchPattern ? `AND (COALESCE(ct.name,'') ILIKE $1 OR COALESCE(c.subject,'') ILIKE $1)` : ''}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${Math.min(limit, 10)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* inbox tables may not exist */ }
  }

  results.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  return {
    conversations: results.slice(0, limit),
    total: results.length,
  }
}

/**
 * Fetch messages for a specific conversation.
 */
export async function getConversationMessages(conversationId: string, channel: Channel): Promise<UnifiedMessage[]> {
  try {
    if (channel === 'website') {
      const { rows } = await query(
        `SELECT id::text, conversation_id::text AS "conversationId",
          CASE WHEN sender_type = 'visitor' THEN 'inbound' ELSE 'outbound' END AS direction,
          content AS body, 'website' AS channel, created_at::text AS "createdAt"
         FROM chatbot.messages WHERE conversation_id = $1
         ORDER BY created_at ASC LIMIT 100`,
        [conversationId]
      )
      return rows
    }

    if (channel === 'email') {
      const { rows } = await query(
        `SELECT id::text, $1::text AS "conversationId",
          'inbound' AS direction, body_text AS body, 'email' AS channel,
          received_at::text AS "createdAt"
         FROM emails WHERE id = $2
         ORDER BY received_at ASC LIMIT 100`,
        [conversationId, conversationId]
      )
      return rows
    }

    const { rows } = await query(
      `SELECT id, conversation_id AS "conversationId",
        direction, body, 'facebook' AS channel,
        created_at::text AS "createdAt"
       FROM inbox_messages WHERE conversation_id = $1
       ORDER BY created_at ASC LIMIT 100`,
      [conversationId]
    )
    return rows
  } catch {
    return []
  }
}
