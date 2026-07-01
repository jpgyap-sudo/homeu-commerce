import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getUnifiedInbox, getConversationMessages, updateConversationStatus, getUnreadCounts } from '@/lib/central-inbox/service'
import type { InboxTab } from '@/lib/central-inbox/service'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const tab = (url.searchParams.get('tab') || 'all') as InboxTab
    const search = url.searchParams.get('search') || ''
    const statusFilter = (url.searchParams.get('statusFilter') || 'all') as any
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)
    const conversationId = url.searchParams.get('conversationId')
    const channel = url.searchParams.get('channel') || 'website'

    if (conversationId) {
      const messages = await getConversationMessages(conversationId, channel as any)
      let rfqDetails: any = null
      let otherConversations: any[] = []

      if (channel === 'rfq') {
        const convResult = await query(
          `SELECT rfq_request_id FROM rfq_chat_conversations WHERE id = $1 LIMIT 1`,
          [conversationId]
        )
        const rfqId = convResult.rows[0]?.rfq_request_id

        if (rfqId) {
          const rfqResult = await query(
            `SELECT id, customer_name, email, phone, status::text, delivery_location, project_type::text, budget_range, notes, created_at
             FROM rfq_requests WHERE id = $1 LIMIT 1`,
            [rfqId]
          )
          rfqDetails = rfqResult.rows[0] || null

          if (rfqDetails) {
            const itemsResult = await query(
              `SELECT product_title_snapshot as title, quantity::int, unit_price_snapshot as price, notes, accepts_alternatives
               FROM rfq_request_items WHERE rfq_request_id = $1 ORDER BY id ASC`,
              [rfqId]
            )
            rfqDetails.items = itemsResult.rows

            const otherResult = await query(
              `SELECT c.id::text, c.rfq_request_id::text as "rfqRequestId", c.status::text, c.last_message_at::text as "lastMessageAt",
                      'RFQ #' || UPPER(SUBSTR(r.id::text, -6)) || ' - ' || COALESCE(r.project_type::text, 'Quote Request') AS "subject"
               FROM rfq_chat_conversations c
               JOIN rfq_requests r ON r.id = c.rfq_request_id
               WHERE c.id != $1
                 AND (
                   (r.email IS NOT NULL AND r.email = $2)
                   OR (r.phone IS NOT NULL AND r.phone = $3)
                 )
               ORDER BY c.last_message_at DESC`,
              [conversationId, rfqDetails.email, rfqDetails.phone]
            )
            otherConversations = otherResult.rows
          }
        }
      }

      return NextResponse.json({ messages, rfqDetails, otherConversations })
    }

    const data = await getUnifiedInbox({ tab, search, limit, offset, statusFilter })
    const unreadCounts = await getUnreadCounts()
    return NextResponse.json({ ...data, unreadCounts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { conversationId, channel, action } = body

    if (!conversationId || !channel || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const success = await updateConversationStatus(conversationId, channel, action)
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to update conversation status' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
