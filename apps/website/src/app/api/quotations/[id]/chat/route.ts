/**
 * Customer-facing revision chat API for a quotation.
 * GET  — list all messages (auth via session or token)
 * POST — customer sends a message (auth via session or token)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import crypto from 'crypto'

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor', 'sales'])
type Session = Awaited<ReturnType<typeof getSession>>

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

async function verifyAuth(id: string | number, request: NextRequest): Promise<boolean> {
  const session = await getSession()

  try {
    const qResult = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (qResult.rows.length === 0) return false
    const quote = qResult.rows[0]
    if (isAdminSession(session) || isCustomerOwner(quote, session)) return true

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (token) {
      const secret = process.env.JWT_SECRET || 'fallback'
      const computed = crypto
        .createHmac('sha256', secret)
        .update(`${id}-${quote.created_at}`)
        .digest('hex')
        .slice(0, 16)
      return token === computed
    }
  } catch {}
  return false
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await verifyAuth(id, request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, sender_type, message, created_at
       FROM quotation_revision_chat
       WHERE quotation_id = $1
       ORDER BY created_at ASC`,
      [id]
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('[quotation-chat] GET Error:', error.message)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await verifyAuth(id, request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const message = String(body.message || '').trim()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO quotation_revision_chat (quotation_id, sender_type, message)
       VALUES ($1, 'customer', $2)
       RETURNING id, sender_type, message, created_at`,
      [id, message]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('[quotation-chat] POST Error:', error.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
