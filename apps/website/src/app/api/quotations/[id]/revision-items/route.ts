import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import crypto from 'crypto'

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor', 'sales'])
type Session = Awaited<ReturnType<typeof getSession>>

interface RevisionItemBody {
  items: Array<{
    itemIndex: number
    actionType: 'remove' | 'change_qty' | 'change_finish' | 'swap' | 'lower_price' | 'lead_time'
    payload?: Record<string, any>
  }>
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

function tokenMatches(id: string | number, quote: any, token?: string): boolean {
  if (!token) return false
  const secret = process.env.JWT_SECRET || 'fallback'
  const computed = crypto.createHmac('sha256', secret).update(`${id}-${quote.created_at}`).digest('hex').slice(0, 16)
  return token === computed
}

async function verifyAuth(id: string | number, request: NextRequest): Promise<boolean> {
  const session = await getSession()
  const qResult = await query('SELECT * FROM quotations WHERE id = $1', [id])
  if (qResult.rows.length === 0) return false
  const quote = qResult.rows[0]
  if (isAdminSession(session) || isCustomerOwner(quote, session)) return true

  const { searchParams } = new URL(request.url)
  const queryToken = searchParams.get('token')
  if (tokenMatches(id, quote, queryToken || undefined)) return true

  const body = await request.clone().json().catch(() => ({}))
  return tokenMatches(id, quote, body.token)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await verifyAuth(id, request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RevisionItemBody = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    // Verify quotation exists
    const exists = await query('SELECT id FROM quotations WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    let inserted = 0
    for (const item of body.items) {
      if (!item.actionType) continue
      await query(
        `INSERT INTO quotation_revision_items (quotation_id, item_index, action_type, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [id, item.itemIndex, item.actionType, JSON.stringify(item.payload || {})]
      )
      inserted++
    }

    return NextResponse.json({ success: true, count: inserted })
  } catch (error: any) {
    console.error('[revision-items] Error:', error.message)
    return NextResponse.json({ error: 'Failed to save revision items' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await verifyAuth(id, request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, item_index, action_type, payload, created_at
       FROM quotation_revision_items
       WHERE quotation_id = $1
       ORDER BY created_at ASC`,
      [id]
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('[revision-items] GET Error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch revision items' }, { status: 500 })
  }
}
