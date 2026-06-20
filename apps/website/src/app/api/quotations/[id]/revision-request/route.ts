import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/quotations/[id]/revision-request
 *
 * THE GENIUS: Customer clicks "Request Revision" → sends a message.
 * Sets pending_revision=true so admin knows. No account needed.
 *
 * Body: { message: "Can you adjust the pricing for..." }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await query(
      `UPDATE quotations 
       SET pending_revision = true, revision_request = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, quotation_number, customer_name, pending_revision`,
      [message.trim(), id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const quotation = result.rows[0]

    // ── Fire RFQ chat event ────────────────────────────────
    try {
      const qRfqResult = await query('SELECT rfq_id FROM quotations WHERE id = $1', [id])
      const rfqId = qRfqResult.rows[0]?.rfq_id
      if (rfqId) {
        const APP_URL = process.env.APP_URL || 'http://localhost:3000'
        fetch(`${APP_URL}/api/system/rfq-chat/quotation-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rfqRequestId: rfqId,
            quotationId: Number(id),
            eventType: 'revision_requested',
            eventLabel: 'Revision requested',
            message: message.trim().substring(0, 200),
          }),
        }).catch(() => {})
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Revision request submitted. The HomeU team will review your request.',
      quotation,
    })
  } catch (err: any) {
    console.error('[revision-request] Error:', err)
    return NextResponse.json({ error: 'Failed to submit revision request' }, { status: 500 })
  }
}
