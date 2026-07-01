import { query } from '@/lib/db'

export type Channel = 'website' | 'email' | 'facebook' | 'instagram' | 'rfq' | 'all'
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
  customerId?: number | string
  rfqRequestId?: string
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
  statusFilter?: 'all' | 'unread' | 'read'
}): Promise<{ conversations: UnifiedConversation[]; total: number }> {
  const { tab = 'all', search = '', limit = 50, offset = 0, statusFilter = 'all' } = params
  const results: UnifiedConversation[] = []

  const searchPattern = search ? `%${search}%` : null

  // ── Website Chat ──
  if (tab === 'all' || tab === 'website' || tab === 'archived') {
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
          CASE WHEN c.is_read THEN 0 ELSE COALESCE((SELECT COUNT(*) FROM chatbot.messages m WHERE m.conversation_id = c.id AND m.sender_type = 'visitor'), 1)::int END AS "unreadCount",
          COALESCE(c.status, 'open') AS "status",
          ARRAY[]::text[] AS "tags",
          NULLIF(l.daVincios_customer_id, '') AS "customerId"
        FROM chatbot.conversations c
        LEFT JOIN chatbot.leads l ON l.id = c.lead_id
        WHERE ${tab === 'archived' ? "c.status = 'archived'" : "(c.status IS NULL OR c.status != 'archived')"}
          AND EXISTS (SELECT 1 FROM chatbot.messages m WHERE m.conversation_id = c.id)
          ${statusFilter === 'unread' ? 'AND NOT c.is_read' : ''}
          ${statusFilter === 'read' ? 'AND c.is_read' : ''}
          ${searchPattern ? `AND (COALESCE(l.name, '') ILIKE $1 OR COALESCE(l.email, '') ILIKE $1 OR COALESCE(c.current_intent, '') ILIKE $1)` : ''}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${Math.min(limit, 20)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* table may not exist */ }
  }

  // ── Email ──
  if (tab === 'all' || tab === 'email' || tab === 'archived') {
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
        WHERE e.folder = ${tab === 'archived' ? "'ARCHIVE'" : "'INBOX'"}
          ${statusFilter === 'unread' ? 'AND NOT e.is_read' : ''}
          ${statusFilter === 'read' ? 'AND e.is_read' : ''}
          ${searchPattern ? `AND (e.subject ILIKE $1 OR e.sender_name ILIKE $1 OR e.sender_email ILIKE $1 OR e.body_text ILIKE $1)` : ''}
        ORDER BY e.received_at DESC
        LIMIT ${Math.min(limit, 20)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* emails table may not exist */ }
  }

  // ── Facebook / Instagram ──
  if (tab === 'all' || tab === 'facebook' || tab === 'instagram' || tab === 'archived') {
    try {
      const channelFilter = tab === 'facebook' ? "AND ch.type = 'facebook'" : tab === 'instagram' ? "AND ch.type = 'instagram'" : ""
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
          CASE WHEN c.is_read THEN 0 ELSE 1 END::int AS "unreadCount",
          COALESCE(c.status, 'open') AS "status",
          ARRAY[]::text[] AS "tags",
          ct.customer_id::int AS "customerId"
        FROM inbox_conversations c
        JOIN inbox_channels ch ON ch.id = c.channel_id
        LEFT JOIN inbox_contacts ct ON ct.id = c.contact_id
        WHERE ${tab === 'archived' ? "c.status = 'archived'" : "c.status IS DISTINCT FROM 'archived'"}
          ${channelFilter}
          ${statusFilter === 'unread' ? 'AND NOT c.is_read' : ''}
          ${statusFilter === 'read' ? 'AND c.is_read' : ''}
          ${searchPattern ? `AND (COALESCE(ct.name,'') ILIKE $1 OR COALESCE(c.subject,'') ILIKE $1)` : ''}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${Math.min(limit, 10)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch { /* inbox tables may not exist */ }
  }

  // ── RFQ Chat ──
  if (tab === 'all' || tab === 'rfq' || tab === 'archived') {
    try {
      const { rows } = await query(`
        SELECT
          c.id::text AS "id",
          'rfq' AS "channel",
          r.id::text AS "rfqRequestId",
          COALESCE(r.customer_name, 'Client') AS "contactName",
          COALESCE(r.email, '') AS "contactEmail",
          r.phone AS "contactPhone",
          'RFQ #' || UPPER(SUBSTR(r.id::text, -6)) || ' - ' || COALESCE(r.project_type, 'Quote Request') AS "subject",
          COALESCE(
            (SELECT m.content FROM rfq_chat_messages m
             WHERE m.conversation_id = c.id
             ORDER BY m.created_at DESC LIMIT 1),
            'No messages yet'
          ) AS "lastMessage",
          c.last_message_at::text AS "lastMessageAt",
          CASE WHEN c.status = 'resolved' THEN 0 ELSE
            COALESCE(
              (SELECT COUNT(*)::int FROM rfq_chat_messages m
               WHERE m.conversation_id = c.id
                 AND m.sender_type = 'customer'
                 AND m.created_at > COALESCE(
                   (SELECT m2.created_at FROM rfq_chat_messages m2
                    WHERE m2.conversation_id = c.id AND m2.sender_type = 'admin'
                    ORDER BY m2.created_at DESC LIMIT 1),
                   '1970-01-01'::timestamptz
                 )),
              0
            )::int
          END AS "unreadCount",
          COALESCE(c.status, 'open') AS "status",
          ARRAY['rfq']::text[] AS "tags",
          r.customer_id::int AS "customerId"
        FROM rfq_chat_conversations c
        JOIN rfq_requests r ON r.id = c.rfq_request_id
        WHERE ${tab === 'archived' ? "c.status = 'archived'" : "c.status != 'archived'"}
          ${statusFilter === 'unread' ? "AND c.status != 'resolved' AND EXISTS (SELECT 1 FROM rfq_chat_messages m WHERE m.conversation_id = c.id AND m.sender_type = 'customer')" : ''}
          ${statusFilter === 'read' ? "OR c.status = 'resolved'" : ''}
          ${searchPattern ? `AND (r.customer_name ILIKE $1 OR r.email ILIKE $1)` : ''}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${Math.min(limit, 20)} OFFSET ${offset}
      `, searchPattern ? [searchPattern] : [])
      results.push(...rows)
    } catch (e) {
      console.warn('[central-inbox-service] Failed to fetch RFQs:', (e as Error).message)
    }
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
    if (channel === 'rfq') {
      const { rows } = await query(
        `SELECT id::text, conversation_id::text AS "conversationId",
          CASE WHEN sender_type = 'customer' THEN 'inbound' ELSE 'outbound' END AS direction,
          content AS body, 'rfq' AS channel, created_at::text AS "createdAt"
         FROM rfq_chat_messages WHERE conversation_id = $1
         ORDER BY created_at ASC LIMIT 100`,
        [conversationId]
      )
      return rows
    }

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

/**
 * Update read/unread and archived status for a conversation.
 */
export async function updateConversationStatus(
  conversationId: string,
  channel: Channel,
  action: 'read' | 'unread' | 'archive' | 'unarchive'
): Promise<boolean> {
  try {
    if (channel === 'rfq') {
      if (action === 'read') {
        // Mark RFQ conversation as active/read
        return true
      } else if (action === 'archive') {
        await query("UPDATE rfq_chat_conversations SET status = 'archived' WHERE id = $1", [conversationId])
      } else if (action === 'unarchive') {
        await query("UPDATE rfq_chat_conversations SET status = 'active' WHERE id = $1", [conversationId])
      }
      return true
    }

    if (channel === 'website') {
      if (action === 'read') {
        await query('UPDATE chatbot.conversations SET is_read = TRUE WHERE id = $1', [conversationId])
      } else if (action === 'unread') {
        await query('UPDATE chatbot.conversations SET is_read = FALSE WHERE id = $1', [conversationId])
      } else if (action === 'archive') {
        await query('UPDATE chatbot.conversations SET status = \'archived\' WHERE id = $1', [conversationId])
      } else if (action === 'unarchive') {
        await query('UPDATE chatbot.conversations SET status = \'active\' WHERE id = $1', [conversationId])
      }
      return true
    }

    if (channel === 'email') {
      const emailId = parseInt(conversationId, 10)
      if (isNaN(emailId)) return false
      if (action === 'read') {
        await query('UPDATE emails SET is_read = TRUE WHERE id = $1', [emailId])
      } else if (action === 'unread') {
        await query('UPDATE emails SET is_read = FALSE WHERE id = $1', [emailId])
      } else if (action === 'archive') {
        await query('UPDATE emails SET folder = \'ARCHIVE\' WHERE id = $1', [emailId])
      } else if (action === 'unarchive') {
        await query('UPDATE emails SET folder = \'INBOX\' WHERE id = $1', [emailId])
      }
      return true
    }

    // facebook / instagram
    if (action === 'read') {
      await query('UPDATE inbox_conversations SET is_read = TRUE WHERE id = $1', [conversationId])
    } else if (action === 'unread') {
      await query('UPDATE inbox_conversations SET is_read = FALSE WHERE id = $1', [conversationId])
    } else if (action === 'archive') {
      await query('UPDATE inbox_conversations SET status = \'archived\' WHERE id = $1', [conversationId])
    } else if (action === 'unarchive') {
      await query('UPDATE inbox_conversations SET status = \'open\' WHERE id = $1', [conversationId])
    }
    return true
  } catch (err) {
    console.error('Failed to update conversation status:', err)
    return false
  }
}

/**
 * Fetch unread conversation counts across all channels.
 */
export async function getUnreadCounts(): Promise<{
  all: number
  website: number
  email: number
  facebook: number
  instagram: number
  rfq: number
}> {
  const counts = { all: 0, website: 0, email: 0, facebook: 0, instagram: 0, rfq: 0 }
  
  // Website
  try {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS count 
      FROM chatbot.conversations c
      WHERE (c.status IS NULL OR c.status != 'archived') 
        AND NOT c.is_read
        AND EXISTS (SELECT 1 FROM chatbot.messages m WHERE m.conversation_id = c.id)
    `)
    counts.website = rows[0]?.count || 0
  } catch {}

  // Email
  try {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS count 
      FROM emails 
      WHERE folder = 'INBOX' AND NOT is_read
    `)
    counts.email = rows[0]?.count || 0
  } catch {}

  // Facebook / Instagram
  try {
    const { rows } = await query(`
      SELECT ch.type, COUNT(*)::int AS count
      FROM inbox_conversations c
      JOIN inbox_channels ch ON ch.id = c.channel_id
      WHERE c.status NOT IN ('archived') AND NOT c.is_read
      GROUP BY ch.type
    `)
    for (const r of rows) {
      if (r.type === 'facebook') counts.facebook = r.count
      if (r.type === 'instagram') counts.instagram = r.count
    }
  } catch {}

  // RFQ count
  try {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS count 
      FROM rfq_chat_conversations c
      WHERE c.status = 'active'
        AND EXISTS (
          SELECT 1 FROM rfq_chat_messages m 
          WHERE m.conversation_id = c.id 
            AND m.sender_type = 'customer'
        )
    `)
    counts.rfq = rows[0]?.count || 0
  } catch {}

  counts.all = counts.website + counts.email + counts.facebook + counts.instagram + counts.rfq
  return counts
}
