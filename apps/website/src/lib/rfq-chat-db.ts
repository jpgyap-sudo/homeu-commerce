/**
 * rfq-chat-db.ts
 * ===============
 * Database service layer for the RFQ persistent chat system.
 *
 * Manages conversations, messages, deletion requests, notifications,
 * and chatbot backfill for per-RFQ messaging threads.
 *
 * Uses the same `query` function from @/lib/db as the rest of the app.
 */

import { query } from '@/lib/db'

// ── Types ────────────────────────────────────────────────────────

export interface RfqChatConversation {
  id: string
  rfq_request_id: number
  status: 'active' | 'resolved' | 'archived'
  last_message_at: Date
  message_count: number
  internal_score: number
  admin_notes: string
  resolved_at: Date | null
  source: 'rfq_chat' | 'chatbot_backfill'
  source_conversation_id: string | null
  created_at: Date
}

export interface RfqChatMessage {
  id: string
  conversation_id: string
  sender_type: 'customer' | 'admin' | 'system' | 'ai_bot'
  admin_user_id: number | null
  content: string
  message_type: 'text' | 'image' | 'document' | 'system_event' | 'quotation_version' | 'notification'
  related_quotation_id: number | null
  related_version_number: number | null
  metadata: Record<string, any>
  customer_visible: boolean
  deleted_at: Date | null
  deleted_by: number | null
  created_at: Date
}

export interface MessageInsert {
  conversationId: string
  senderType: 'customer' | 'admin' | 'system' | 'ai_bot'
  adminUserId?: number
  content: string
  messageType?: string
  relatedQuotationId?: number
  relatedVersionNumber?: number
  metadata?: Record<string, any>
  customerVisible?: boolean
}

export interface NotificationLogInsert {
  conversationId: string
  adminUserId: number
  notificationType: 'quotation_sent' | 'admin_notify' | 'quotation_updated'
  emailSentTo: string
  emailSubject: string
  emailLink: string
  triggeredBy: 'manual' | 'auto'
}

// ── Conversations ────────────────────────────────────────────────

/**
 * Find an existing conversation by RFQ request ID, or create one.
 * Returns the conversation UUID string.
 */
export async function getOrCreateConversation(rfqRequestId: number): Promise<string> {
  // Try to find existing
  const existing = await query(
    'SELECT id FROM rfq_chat_conversations WHERE rfq_request_id = $1 LIMIT 1',
    [rfqRequestId]
  )
  if (existing.rows.length > 0) {
    return existing.rows[0].id as string
  }

  // Create new
  const result = await query(
    `INSERT INTO rfq_chat_conversations (rfq_request_id, status, source)
     VALUES ($1, 'active', 'rfq_chat')
     RETURNING id`,
    [rfqRequestId]
  )
  return result.rows[0].id as string
}

/**
 * Get a conversation by RFQ request ID.
 */
export async function getConversationByRfqId(
  rfqRequestId: number
): Promise<RfqChatConversation | null> {
  const result = await query(
    'SELECT * FROM rfq_chat_conversations WHERE rfq_request_id = $1 LIMIT 1',
    [rfqRequestId]
  )
  return result.rows[0] || null
}

/**
 * Get a conversation by its UUID.
 */
export async function getConversationById(
  conversationId: string
): Promise<RfqChatConversation | null> {
  const result = await query(
    'SELECT * FROM rfq_chat_conversations WHERE id = $1 LIMIT 1',
    [conversationId]
  )
  return result.rows[0] || null
}

// ── Messages ─────────────────────────────────────────────────────

/**
 * Insert a message into the RFQ chat and update the conversation counter.
 * Returns the message UUID string.
 */
export async function insertMessage(data: MessageInsert): Promise<string> {
  const result = await query(
    `INSERT INTO rfq_chat_messages
     (conversation_id, sender_type, admin_user_id, content, message_type,
      related_quotation_id, related_version_number, metadata, customer_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      data.conversationId,
      data.senderType,
      data.adminUserId || null,
      data.content,
      data.messageType || 'text',
      data.relatedQuotationId || null,
      data.relatedVersionNumber || null,
      JSON.stringify(data.metadata || {}),
      data.customerVisible !== false, // defaults to true
    ]
  )

  // Update conversation message count and last_message_at
  await query(
    `UPDATE rfq_chat_conversations
     SET message_count = message_count + 1, last_message_at = NOW()
     WHERE id = $1`,
    [data.conversationId]
  ).catch((err: Error) => {
    console.error('[rfq-chat-db] Failed to update conversation counter:', err.message)
  })

  return result.rows[0].id as string
}

/**
 * Get messages visible to the customer (30-day window, non-deleted, visible).
 */
export async function getCustomerMessages(conversationId: string): Promise<any[]> {
  const result = await query(
    `SELECT * FROM rfq_chat_messages
     WHERE conversation_id = $1
       AND customer_visible = TRUE
       AND deleted_at IS NULL
       AND created_at >= NOW() - INTERVAL '30 days'
     ORDER BY created_at ASC`,
    [conversationId]
  )
  return result.rows
}

/**
 * Get all messages for admin (no TTL, includes soft-deleted).
 * Adds computed `is_deleted` boolean column.
 */
export async function getAdminMessages(conversationId: string): Promise<any[]> {
  const result = await query(
    `SELECT *, (deleted_at IS NOT NULL) AS is_deleted
     FROM rfq_chat_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  )
  return result.rows
}

/**
 * Soft-delete messages by setting deleted_at and deleted_by.
 * Returns the count of actually deleted rows.
 */
export async function softDeleteMessages(
  messageIds: string[],
  deletedBy: number
): Promise<number> {
  if (messageIds.length === 0) return 0

  const result = await query(
    `UPDATE rfq_chat_messages
     SET deleted_at = NOW(), deleted_by = $1
     WHERE id = ANY($2::uuid[])
       AND deleted_at IS NULL`,
    [deletedBy, messageIds]
  )
  return result.rowCount || 0
}

/**
 * Toggle whether a message is visible to the customer.
 */
export async function toggleCustomerVisibility(
  messageId: string,
  visible: boolean
): Promise<boolean> {
  const result = await query(
    'UPDATE rfq_chat_messages SET customer_visible = $1 WHERE id = $2',
    [visible, messageId]
  )
  return (result.rowCount || 0) > 0
}

// ── Deletion Requests (OTP Flow) ────────────────────────────────

/**
 * Create a deletion request pending OTP verification.
 * Returns the deletion request UUID.
 */
export async function createDeletionRequest(
  adminUserId: number,
  conversationId: string,
  messageIds: string[]
): Promise<string> {
  const result = await query(
    `INSERT INTO rfq_chat_deletion_requests
     (admin_user_id, conversation_id, message_ids)
     VALUES ($1, $2, $3::uuid[])
     RETURNING id`,
    [adminUserId, conversationId, messageIds]
  )
  return result.rows[0].id as string
}

/**
 * Execute an OTP-verified deletion request.
 * Soft-deletes the messages and marks the request as executed.
 */
export async function executeDeletionRequest(
  deletionRequestId: string,
  adminUserId: number
): Promise<boolean> {
  // Find the verified, unexecuted request
  const req = await query(
    `SELECT * FROM rfq_chat_deletion_requests
     WHERE id = $1
       AND otp_verified = TRUE
       AND executed = FALSE
     LIMIT 1`,
    [deletionRequestId]
  )

  if (req.rows.length === 0) return false

  const deletionRequest = req.rows[0]

  // Execute the soft delete
  const deletedCount = await softDeleteMessages(
    deletionRequest.message_ids as string[],
    adminUserId
  )

  // Mark request as executed
  await query(
    `UPDATE rfq_chat_deletion_requests
     SET executed = TRUE, executed_at = NOW()
     WHERE id = $1`,
    [deletionRequestId]
  )

  return deletedCount > 0
}

// ── Conversation Metadata ───────────────────────────────────────

/**
 * Update conversation metadata (admin-only fields).
 * Only provided fields are updated.
 */
export async function updateConversationMetadata(
  conversationId: string,
  data: {
    status?: string
    internalScore?: number
    adminNotes?: string
  }
): Promise<boolean> {
  const sets: string[] = []
  const values: any[] = []
  let idx = 0

  if (data.status !== undefined) {
    idx++
    sets.push(`status = $${idx}`)
    values.push(data.status)
  }
  if (data.internalScore !== undefined) {
    idx++
    sets.push(`internal_score = $${idx}`)
    values.push(data.internalScore)
  }
  if (data.adminNotes !== undefined) {
    idx++
    sets.push(`admin_notes = $${idx}`)
    values.push(data.adminNotes)
  }

  if (sets.length === 0) return false

  idx++
  values.push(conversationId)
  const result = await query(
    `UPDATE rfq_chat_conversations SET ${sets.join(', ')} WHERE id = $${idx}`,
    values
  )
  return (result.rowCount || 0) > 0
}

// ── Notification Log ─────────────────────────────────────────────

/**
 * Log a notification sent to the customer.
 * Returns the log entry UUID.
 */
export async function logNotification(data: NotificationLogInsert): Promise<string> {
  const result = await query(
    `INSERT INTO rfq_chat_notification_log
     (conversation_id, admin_user_id, notification_type, email_sent_to,
      email_subject, email_link, triggered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.conversationId,
      data.adminUserId,
      data.notificationType,
      data.emailSentTo,
      data.emailSubject,
      data.emailLink,
      data.triggeredBy,
    ]
  )
  return result.rows[0].id as string
}

/**
 * Get notification log for a conversation.
 */
export async function getNotificationLog(conversationId: string): Promise<any[]> {
  const result = await query(
    `SELECT * FROM rfq_chat_notification_log
     WHERE conversation_id = $1
     ORDER BY created_at DESC`,
    [conversationId]
  )
  return result.rows
}

// ── Chatbot Backfill ─────────────────────────────────────────────

/**
 * Create a backfill log entry to prevent re-importing the same conversation.
 */
export async function createBackfillLog(
  chatbotConversationId: string,
  rfqChatConversationId: string,
  messagesMirrored: number
): Promise<void> {
  await query(
    `INSERT INTO chatbot_backfill_log
     (chatbot_conversation_id, rfq_chat_conversation_id, messages_mirrored)
     VALUES ($1, $2, $3)
     ON CONFLICT (chatbot_conversation_id, rfq_chat_conversation_id) DO NOTHING`,
    [chatbotConversationId, rfqChatConversationId, messagesMirrored]
  )
}

/**
 * Check if a chatbot conversation has already been backfilled.
 */
export async function getBackfillLog(
  chatbotConversationId: string,
  rfqChatConversationId: string
): Promise<any | null> {
  const result = await query(
    `SELECT * FROM chatbot_backfill_log
     WHERE chatbot_conversation_id = $1
       AND rfq_chat_conversation_id = $2
     LIMIT 1`,
    [chatbotConversationId, rfqChatConversationId]
  )
  return result.rows[0] || null
}

/**
 * Update the source tracking on a conversation after backfill.
 */
export async function updateConversationSource(
  conversationId: string,
  source: string,
  sourceConversationId: string
): Promise<void> {
  await query(
    `UPDATE rfq_chat_conversations
     SET source = $1, source_conversation_id = $2
     WHERE id = $3`,
    [source, sourceConversationId, conversationId]
  )
}
