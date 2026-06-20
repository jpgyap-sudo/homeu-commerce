import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
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
      await query(
        `UPDATE quotations SET pending_revision = false, revision_request = '', current_version = current_version + 1, updated_at = NOW() WHERE id = $1`,
        [id]
      )
      const row = await query('SELECT * FROM quotations WHERE id = $1', [id])
      return NextResponse.json({ ...row.rows[0], revisionResolved: true })
    }

    const fields = Object.keys(body).filter(k => k !== 'resolveRevision' && k !== 'clearRevisionFlag')
    if (fields.length === 0) {
      // Just the revision resolve, no data changes
      const row = await query('SELECT * FROM quotations WHERE id = $1', [id])
      return NextResponse.json({ ...row.rows[0], revisionResolved: true })
    }
    const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ')
    const values = fields.map((f) => body[f])
    values.push(id)
    const result = await query(
      `UPDATE quotations SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const updated = result.rows[0]

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
          const APP_URL = process.env.APP_URL || 'http://localhost:3000'
          fetch(`${APP_URL}/api/system/rfq-chat/quotation-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rfqRequestId: rfqId,
              quotationId: Number(id),
              versionNumber: updated.current_version || 1,
              eventType: statusEventMap[body.status],
              eventLabel: statusEventMap[body.status] === 'quotation_sent' ? 'Quotation sent to you' : undefined,
            }),
          }).catch(() => {})
        }
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json(updated)
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
