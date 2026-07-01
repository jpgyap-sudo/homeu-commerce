import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getOrCreateConversation, insertMessage } from '@/lib/rfq-chat-db'
import crypto from 'crypto'

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const cameled: any = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    cameled[camelKey] = snakeToCamel(obj[key])
    if (key === 'pending_revision' || key === 'revision_request') {
      cameled[key] = obj[key]
    }
  }
  return cameled
}

async function linkQuotationCustomerIfMissing(quotationId: string | number, quote: any): Promise<any> {
  if (quote.customer_id) return quote

  let customerId: number | null = null
  if (quote.rfq_id) {
    const rfqCustomer = await query('SELECT customer_id FROM rfq_requests WHERE id = $1 LIMIT 1', [quote.rfq_id])
    const fromRfq = Number(rfqCustomer.rows[0]?.customer_id)
    if (Number.isInteger(fromRfq) && fromRfq > 0) customerId = fromRfq
  }

  const email = quote.email || quote.customer_email
  if (!customerId && email) {
    const customerResult = await query(
      'SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    )
    const fromEmail = Number(customerResult.rows[0]?.id)
    if (Number.isInteger(fromEmail) && fromEmail > 0) customerId = fromEmail
  }

  if (!customerId) return quote

  const linked = await query(
    `UPDATE quotations
     SET customer_id = $1, updated_at = NOW()
     WHERE id = $2 AND customer_id IS NULL
     RETURNING *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until`,
    [customerId, quotationId]
  )
  return linked.rows[0] || { ...quote, customer_id: customerId }
}

async function recordRfqQuotationEvent(options: {
  rfqId: number
  quotationId: number
  versionNumber: number
  eventType: string
  eventLabel: string
}) {
  const conversationId = await getOrCreateConversation(options.rfqId)
  await insertMessage({
    conversationId,
    senderType: 'system',
    content: options.eventLabel,
    messageType: options.eventType === 'quotation_sent' ? 'notification' : 'system_event',
    relatedQuotationId: options.quotationId,
    relatedVersionNumber: options.versionNumber,
    metadata: {
      eventType: options.eventType,
      quotationId: options.quotationId,
      versionNumber: options.versionNumber,
      rfqRequestId: options.rfqId,
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await query("SELECT *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until FROM quotations WHERE id = $1", [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    const quote = result.rows[0]

    let authorized = false
    const session = await getSession()
    if (session) {
      authorized = true
    } else {
      const { searchParams } = new URL(request.url)
      const token = searchParams.get('token')
      if (token) {
        const secret = process.env.JWT_SECRET || 'fallback'
        const computed = crypto
          .createHmac('sha256', secret)
          .update(`${id}-${quote.created_at}`)
          .digest('hex')
          .slice(0, 16)
        if (token === computed) {
          authorized = true
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET || 'fallback'
    const guestToken = crypto
      .createHmac('sha256', secret)
      .update(`${id}-${quote.created_at}`)
      .digest('hex')
      .slice(0, 16)

    return NextResponse.json({
      ...snakeToCamel(quote),
      guestToken
    })
  } catch (error: any) {
    console.error('Quotation GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotation' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()

    // ── Version control: create snapshot BEFORE applying changes ──
    // If this is not a resolveRevision call, create a version snapshot
    if (!body.resolveRevision && !body.clearRevisionFlag) {
      try {
        const { createVersion } = await import('@/lib/quotation-versions')
        await createVersion(
          id,
          body.resolveRevision === true ? 'reverted' : 'admin_edit',
          '',
          'admin'
        )
      } catch (verr) {
        console.warn('[quotation] Version snapshot skipped (table may not exist yet):', verr)
      }
    }

    // Handle resolveRevision — admin resolved a customer's revision request
    if (body.resolveRevision === true) {
      const revisionNote = body.revisionNote || ''

      // Store revision note as a system chat message
      if (revisionNote) {
        try {
          await query(
            `INSERT INTO quotation_revision_chat (quotation_id, sender_type, message) VALUES ($1, 'system', $2)`,
            [id, `Admin note: ${revisionNote}`]
          )
        } catch {}
      }

      // Insert system event message
      try {
        await query(
          `INSERT INTO quotation_revision_chat (quotation_id, sender_type, message) VALUES ($1, 'system', $2)`,
          [id, 'Quotation revised and ready for customer review']
        )
      } catch {}

      await query(
        `UPDATE quotations SET pending_revision = false, revision_request = '', revision_request_data = '{}'::jsonb, current_version = current_version + 1, updated_at = NOW() WHERE id = $1`,
        [id]
      )
      const row = await query("SELECT *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until FROM quotations WHERE id = $1", [id])

      // Fire RFQ chat event for revision_resolved
      try {
        const q = row.rows[0]
        if (q.rfq_id) {
          const APP_URL = process.env.APP_URL || 'http://localhost:3000'
          fetch(`${APP_URL}/api/system/rfq-chat/quotation-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rfqRequestId: q.rfq_id,
              quotationId: Number(id),
              versionNumber: q.current_version || 1,
              eventType: 'revision_resolved',
              eventLabel: 'Revision resolved',
              message: revisionNote || 'Quotation revised',
            }),
          }).catch(() => {})
        }
      } catch {}

      return NextResponse.json({ ...row.rows[0], revisionResolved: true })
    }

    const fields = Object.keys(body).filter(k => k !== 'resolveRevision' && k !== 'clearRevisionFlag' && k !== 'revisionNote')
    if (fields.includes('items')) {
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: 'Missing required field: items must be a non-empty array' },
          { status: 400 }
        )
      }
    }
    if (fields.length === 0) {
      // Just the revision resolve, no data changes
      const row = await query("SELECT *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until FROM quotations WHERE id = $1", [id])
      return NextResponse.json({ ...snakeToCamel(row.rows[0]), revisionResolved: true })
    }
    const sets = fields.map((f, i) => {
      const col = camelToSnake(f)
      if (col === 'items' || col === 'bank_details') {
        return `"${col}" = $${i + 1}::jsonb`
      }
      return `"${col}" = $${i + 1}`
    }).join(', ')
    const values = fields.map((f) => {
      if (f === 'items' || f === 'bankDetails') {
        return JSON.stringify(body[f])
      }
      return body[f]
    })
    values.push(id)
    const result = await query(
      `UPDATE quotations SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until`,
      values
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    let updated = await linkQuotationCustomerIfMissing(id, result.rows[0])

    // Sync quotations_items table if items are updated
    if (fields.includes('items') && body.items && Array.isArray(body.items)) {
      try {
        await query('DELETE FROM quotations_items WHERE quotation_id = $1', [id])
        for (const item of body.items) {
          await query(
            `INSERT INTO quotations_items (quotation_id, product_id, title, quantity, unit_price, total_price, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              item.productId ? Number(item.productId) : (item.product ? Number(item.product) : null),
              item.productTitle || item.description || '',
              Number(item.quantity) || 1,
              Number(item.unitCost) || 0,
              Number(item.total) || 0,
              item.notes || null
            ]
          )
        }
      } catch (err: any) {
        console.error('[quotations] Failed to sync quotations_items table:', err.message)
      }
    }

    // ── Fire RFQ chat event for status changes ────────────
    const statusEventMap: Record<string, string> = {
      sent: 'quotation_sent',
      accepted: 'quotation_accepted',
      rejected: 'quotation_rejected',
    }
    if (body.status && statusEventMap[body.status]) {
      try {
        const qRfqResult = await query('SELECT rfq_id FROM quotations WHERE id = $1', [id])
        const rfqId = qRfqResult.rows[0]?.rfq_id
        if (rfqId) {
          if (body.status === 'sent') {
            await query(
              `UPDATE rfq_requests
               SET status = CASE WHEN status IN ('new', 'contacted') THEN 'quoted' ELSE status END,
                   quotation_sent_at = COALESCE($2::timestamptz, NOW()),
                   quotation_sent_via = COALESCE($3, 'email'),
                   updated_at = NOW()
               WHERE id = $1`,
              [rfqId, body.sentAt || null, body.sentVia || null]
            )
          }

          await recordRfqQuotationEvent({
            rfqId,
            quotationId: Number(id),
            versionNumber: updated.current_version || 1,
            eventType: statusEventMap[body.status],
            eventLabel: body.status === 'sent'
              ? 'Quotation sent to you'
              : body.status === 'accepted'
                ? 'Quotation accepted'
                : 'Quotation rejected',
          })
        }
      } catch (eventErr: any) {
        console.warn('[quotation] RFQ status/chat event skipped:', eventErr.message)
      }
    }

    return NextResponse.json(snakeToCamel(updated))
  } catch (error: any) {
    console.error('Quotation PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await query('DELETE FROM quotations WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Quotation DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete quotation' },
      { status: 500 }
    )
  }
}
