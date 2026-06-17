/**
 * POST   /api/collections/[id]/products  — add a manual product { productId }
 * DELETE /api/collections/[id]/products  — remove a manual product { productId }
 * PUT    /api/collections/[id]/products  — reorder { order: number[] } (product ids)
 *
 * Manual membership management for collections. Auth required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    // Append at end (max position + 1)
    await query(
      `INSERT INTO collection_products (collection_id, product_id, position, source)
       VALUES ($1, $2, COALESCE((SELECT MAX(position) FROM collection_products WHERE collection_id = $1), 0) + 1, 'manual')
       ON CONFLICT (collection_id, product_id)
       DO UPDATE SET source = 'manual'`,
      [id, productId]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/collections/[id]/products] POST error:', err)
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { productId } = await request.json()
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

    await query(
      `DELETE FROM collection_products WHERE collection_id = $1 AND product_id = $2`,
      [id, productId]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/collections/[id]/products] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove product' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { order } = await request.json()
    if (!Array.isArray(order)) return NextResponse.json({ error: 'order array required' }, { status: 400 })

    for (let pos = 0; pos < order.length; pos++) {
      await query(
        `UPDATE collection_products SET position = $1 WHERE collection_id = $2 AND product_id = $3`,
        [pos, id, order[pos]]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/collections/[id]/products] PUT error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
