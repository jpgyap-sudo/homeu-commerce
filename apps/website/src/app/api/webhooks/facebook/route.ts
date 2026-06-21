/**
 * Facebook Messenger Webhook Endpoint
 *
 * Receives real-time messages from Facebook Page via Meta's Webhooks API.
 *
 * Registration:
 *   1. Go to Meta Developer Console → Your App → Webhooks → Page
 *   2. Callback URL: https://admin.homeu.ph/api/webhooks/facebook
 *   3. Verify Token: (the fb_webhook_verify_token from Social Settings)
 *   4. Subscribe to: messages, messaging_postbacks, message_deliveries
 *
 * Required env: FACEBOOK_VERIFY_TOKEN (or uses the one stored in DaVinciOS_kv)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Cache for the verify token to avoid DB lookup on every GET verification
let _verifyToken: string | null = null

async function getVerifyToken(): Promise<string> {
  if (_verifyToken) return _verifyToken

  try {
    const result = await query(
      `SELECT data->>'fb_webhook_verify_token' AS token
       FROM "DaVinciOS_kv" WHERE key = 'social_channels_config' LIMIT 1`
    )
    const token: string | undefined = result.rows[0]?.token
    if (token) {
      _verifyToken = token
      return token
    }
  } catch { /* key may not exist */ }

  const fallback = process.env.FACEBOOK_VERIFY_TOKEN || 'homeu-fb-webhook-verify'
  _verifyToken = fallback
  return fallback
}

/**
 * GET — Verification handshake
 * Facebook sends hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = await getVerifyToken()

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[facebook-webhook] Verification successful')
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[facebook-webhook] Verification failed:', { mode, tokenProvided: !!token })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST — Receive incoming messages
 *
 * Meta sends a JSON payload with messaging events under entry[].messaging[]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[facebook-webhook] Received:', JSON.stringify(body).substring(0, 500))

    const entry = body.entry?.[0]
    if (!entry) {
      return NextResponse.json({ success: true })
    }

    const pageId = entry.id
    const messagingEvents = entry.messaging || []
    const standbyEvents = entry.standby || []

    // ── Process messaging events ──────────────────────────────────
    for (const event of messagingEvents) {
      // Sender and recipient
      const senderId = event.sender?.id
      const recipientId = event.recipient?.id
      if (!senderId) continue

      // Extract message content
      let messageText = ''
      let messageAttachments: any[] = []

      if (event.message) {
        messageText = event.message.text || ''
        messageAttachments = event.message.attachments || []
      } else if (event.postback) {
        messageText = event.postback.payload || 'Postback received'
      }

      // Skip empty messages
      if (!messageText && messageAttachments.length === 0) continue

      // Find or create the inbox channel
      const channelResult = await query(
        `SELECT id FROM inbox_channels WHERE type = 'facebook' AND external_page_id = $1 LIMIT 1`,
        [pageId]
      )

      let channelId: number
      if (channelResult.rows.length === 0) {
        const newChannel = await query(
          `INSERT INTO inbox_channels (type, name, external_page_id, is_active)
           VALUES ('facebook', 'Facebook Page', $1, TRUE) RETURNING id`,
          [pageId]
        )
        channelId = newChannel.rows[0].id
      } else {
        channelId = channelResult.rows[0].id
      }

      // Find or create the contact (identity is global, keyed by facebook_psid — not scoped per-channel)
      const contactResult = await query(
        `SELECT id FROM inbox_contacts WHERE facebook_psid = $1 LIMIT 1`,
        [senderId]
      )

      let contactId: number
      if (contactResult.rows.length === 0) {
        // Fetch sender name from Graph API (if we have a token)
        const newContact = await query(
          `INSERT INTO inbox_contacts (name, facebook_psid, source)
           VALUES ($1, $2, 'facebook') RETURNING id`,
          [`Facebook User ${senderId.substring(0, 6)}`, senderId]
        )
        contactId = newContact.rows[0].id
      } else {
        contactId = contactResult.rows[0].id
      }

      // Find or create the conversation
      const convResult = await query(
        `SELECT id FROM inbox_conversations
         WHERE channel_id = $1 AND contact_id = $2 AND status != 'archived'
         ORDER BY last_message_at DESC LIMIT 1`,
        [channelId, contactId]
      )

      let conversationId: number
      if (convResult.rows.length === 0) {
        const newConv = await query(
          `INSERT INTO inbox_conversations (channel_id, contact_id, subject, status)
           VALUES ($1, $2, $3, 'open') RETURNING id`,
          [channelId, contactId, messageText.substring(0, 100)]
        )
        conversationId = newConv.rows[0].id
      } else {
        conversationId = convResult.rows[0].id
        // Reopen if archived
        await query(
          `UPDATE inbox_conversations SET status = 'open', last_message_at = NOW() WHERE id = $1`,
          [conversationId]
        )
      }

      // Insert the inbound message
      await query(
        `INSERT INTO inbox_messages (conversation_id, direction, body, attachments, external_message_id, raw_payload, created_at)
         VALUES ($1, 'inbound', $2, $3::jsonb, $4, $5::jsonb, NOW())`,
        [
          conversationId,
          messageText || '(attachment)',
          JSON.stringify(messageAttachments),
          event.message?.mid || null,
          JSON.stringify(event),
        ]
      )

      // Update conversation last_message_at
      await query(
        `UPDATE inbox_conversations SET last_message_at = NOW() WHERE id = $1`,
        [conversationId]
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[facebook-webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
