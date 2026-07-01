/**
 * POST /api/quotations/[id]/revision-request
 *
 * Customer submits a revision request for a quotation.
 * Requires either: admin session, customer session (owns the quote), or guest token.
 * Sets pending_revision=true AND status='revision_requested'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import crypto from 'crypto'

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor', 'sales'])
type Session = Awaited<ReturnType<typeof getSession>>

function computeGuestToken(id: string | number, createdAt: string | Date): string {
  const secret = process.env.JWT_SECRET || 'fallback'
  return crypto.createHmac('sha256', secret).update(`${id}-${createdAt}`).digest('hex').slice(0, 16)
}

function isAdminSession(session: Session): boolean {
  return !!session && ADMIN_ROLES.has(session.role)
}

function isCustomerOwner(quote: any, session: Session): boolean {
  if (!session) return false
  const sessionId = Number(session.id)
  if (Number.isInteger(sessionId) && Number(quote.customer_id) === sessionId) return true
  const quoteEmail = String(quote.email || quote.customer_email || '').toLowerCase()
  return !!quoteEmail && quoteEmail === String(session.email || '').toLowerCase()
}

async function verifyCustomerOrToken(id: string | number): Promise<boolean> {
  // Admin session
  const session = await getSession()
  if (session) return true

  // Customer session — check ownership via customer_id
  try {
    const meRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/customers/me`, {
      credentials: 'include',
      headers: { cookie: '' },
    } as any)
    // Auth handled by client credentials
  } catch {}
  return true // Auth checked via client credentials; token verification is secondary
}

async function verifyToken(id: string | number, quoteCreatedAt: string): Promise<boolean> {
  try {
    const { searchParams } = new URL(globalThis.location?.href || 'http://localhost')
    const token = searchParams.get('token')
    if (token) {
      const secret = process.env.JWT_SECRET || 'fallback'
      const computed = crypto
        .createHmac('sha256', secret)
        .update(`${id}-${quoteCreatedAt}`)
        .digest('hex')
        .slice(0, 16)
      return token === computed
    }
  } catch {}
  return false
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const qResult = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (qResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    const quote = qResult.rows[0]
    const session = await getSession()
    const authorized = isAdminSession(session)
      || isCustomerOwner(quote, session)
      || (!!body.token && body.token === computeGuestToken(id, quote.created_at))

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set pending_revision=true AND status='revision_requested'
    const result = await query(
      `UPDATE quotations
       SET pending_revision = true,
           revision_request = $1,
           status = CASE WHEN status IN ('sent', 'revised') THEN 'revision_requested' ELSE status END,
           updated_at = NOW()
       WHERE id = $2 RETURNING id, quotation_number, customer_name, pending_revision, status`,
      [message.trim(), id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const quotation = result.rows[0]

    try {
      const { createVersion } = await import('@/lib/quotation-versions')
      await createVersion(id, 'customer_revision', message.trim(), isAdminSession(session) ? 'admin' : 'customer')
    } catch (verr) {
      console.warn('[revision-request] Version snapshot skipped:', verr)
    }

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
