import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, message, token } = body

    if (!token) {
      return NextResponse.json({ error: 'Authorization token is required' }, { status: 401 })
    }

    // Retrieve the quote to verify the token and get current fields
    const qResult = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (qResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    const quote = qResult.rows[0]

    // Verify token matching the scheme used in GET: sha256(id + created_at + JWT_SECRET)
    const secret = process.env.JWT_SECRET || 'fallback'
    const computed = crypto
      .createHmac('sha256', secret)
      .update(`${id}-${quote.created_at}`)
      .digest('hex')
      .slice(0, 16)

    if (token !== computed) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 })
    }

    if (action === 'accept') {
      // 1. Create a version snapshot before updating status
      try {
        const { createVersion } = await import('@/lib/quotation-versions')
        await createVersion(id, 'admin_edit', 'Quotation accepted by customer', 'customer')
      } catch (verr) {
        console.warn('[respond] Version snapshot skipped:', verr)
      }

      // 2. Update status and increment version
      const updateResult = await query(
        `UPDATE quotations 
         SET status = 'accepted', current_version = current_version + 1, updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [id]
      )
      const updatedQuote = updateResult.rows[0]

      // 3. Fire RFQ chat event for accepted status
      try {
        if (updatedQuote.rfq_id) {
          const APP_URL = process.env.APP_URL || 'http://localhost:3000'
          fetch(`${APP_URL}/api/system/rfq-chat/quotation-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rfqRequestId: updatedQuote.rfq_id,
              quotationId: Number(id),
              versionNumber: updatedQuote.current_version || 1,
              eventType: 'quotation_accepted',
              eventLabel: 'Quotation accepted',
            }),
          }).catch(() => {})
        }
      } catch (err) {
        console.warn('[respond] Failed to fire chat event:', err)
      }

      return NextResponse.json({ success: true, quotation: updatedQuote })

    } else if (action === 'revision') {
      if (!message?.trim()) {
        return NextResponse.json({ error: 'Revision message is required' }, { status: 400 })
      }

      // 1. Create a version snapshot before applying revision request
      try {
        const { createVersion } = await import('@/lib/quotation-versions')
        await createVersion(id, 'customer_revision', message.trim(), 'customer')
      } catch (verr) {
        console.warn('[respond] Version snapshot skipped:', verr)
      }

      // 2. Update quotation record with pending_revision flags and message
      const updateResult = await query(
        `UPDATE quotations 
         SET pending_revision = true, 
             revision_request = $1, 
             current_version = current_version + 1, 
             updated_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [message.trim(), id]
      )
      const updatedQuote = updateResult.rows[0]

      // 3. Fire RFQ chat event for revision_requested
      try {
        if (updatedQuote.rfq_id) {
          const APP_URL = process.env.APP_URL || 'http://localhost:3000'
          fetch(`${APP_URL}/api/system/rfq-chat/quotation-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rfqRequestId: updatedQuote.rfq_id,
              quotationId: Number(id),
              eventType: 'revision_requested',
              eventLabel: 'Revision requested',
              message: message.trim().substring(0, 200),
            }),
          }).catch(() => {})
        }
      } catch (err) {
        console.warn('[respond] Failed to fire chat event:', err)
      }

      return NextResponse.json({ success: true, quotation: updatedQuote })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[respond] Error in quotation response API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process response' },
      { status: 500 }
    )
  }
}
