/**
 * GET /api/quotations/[id]/versions — version history for a quotation
 */
import { NextRequest, NextResponse } from 'next/server'
import { getVersionHistory } from '@/lib/quotation-versions'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import crypto from 'crypto'

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor', 'sales'])
type Session = Awaited<ReturnType<typeof getSession>>

function canReadQuote(quote: any, session: Session, token?: string, id?: string | number): boolean {
  if (session && ADMIN_ROLES.has(session.role)) return true
  if (session) {
    const sessionId = Number(session.id)
    if (Number.isInteger(sessionId) && Number(quote.customer_id) === sessionId) return true
    const quoteEmail = String(quote.email || quote.customer_email || '').toLowerCase()
    if (quoteEmail && quoteEmail === String(session.email || '').toLowerCase()) return true
  }
  if (!token || !id) return false
  const secret = process.env.JWT_SECRET || 'fallback'
  const computed = crypto.createHmac('sha256', secret).update(`${id}-${quote.created_at}`).digest('hex').slice(0, 16)
  return token === computed
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const quoteResult = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (quoteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    const { searchParams } = new URL(request.url)
    const session = await getSession()
    if (!canReadQuote(quoteResult.rows[0], session, searchParams.get('token') || undefined, id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const versions = await getVersionHistory(id)
    return NextResponse.json({ versions })
  } catch (err: any) {
    console.error('[quotation versions] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}
