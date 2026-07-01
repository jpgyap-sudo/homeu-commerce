/**
 * Admin-side revision chat API for a quotation.
 * GET  — list all messages
 * POST — admin sends a reply
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const result = await query(
      `SELECT id, sender_type, message, created_at
       FROM quotation_revision_chat
       WHERE quotation_id = $1
       ORDER BY created_at ASC`,
      [id]
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('[admin-quotation-chat] GET Error:', error.message)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const message = String(body.message || '').trim()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO quotation_revision_chat (quotation_id, sender_type, message)
       VALUES ($1, 'admin', $2)
       RETURNING id, sender_type, message, created_at`,
      [id, message]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('[admin-quotation-chat] POST Error:', error.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
