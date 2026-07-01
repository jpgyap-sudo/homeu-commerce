import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface RevisionItemBody {
  items: Array<{
    itemIndex: number
    actionType: 'remove' | 'change_qty' | 'change_finish' | 'swap' | 'lower_price' | 'lead_time'
    payload?: Record<string, any>
  }>
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
