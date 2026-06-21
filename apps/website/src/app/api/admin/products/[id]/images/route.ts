/**
 * GET    /api/admin/products/[id]/images — list a product's images, ordered
 * POST   /api/admin/products/[id]/images — add an image (from MediaPicker: url + optional alt)
 * PATCH  /api/admin/products/[id]/images — reorder (body: { order: number[] } of image ids)
 *
 * Products previously had no admin UI for managing images at all — this is
 * the API behind the new ProductImagesManager component.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const result = await query(
      `SELECT id, url, alt, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC`,
      [id]
    )
    return NextResponse.json({ images: result.rows })
  } catch (err) {
    console.error('[api/admin/products/:id/images] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    if (!body.url || !body.url.trim()) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const maxRes = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM product_images WHERE product_id = $1`,
      [id]
    )
    const nextOrder = maxRes.rows[0].next_order

    const result = await query(
      `INSERT INTO product_images (product_id, url, alt, sort_order, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, url, alt, sort_order`,
      [id, body.url.trim(), body.alt?.trim() || null, nextOrder]
    )

    return NextResponse.json({ image: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/products/:id/images] POST error:', err)
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: 'order must be an array of image ids' }, { status: 400 })
    }

    for (let i = 0; i < body.order.length; i++) {
      await query(
        `UPDATE product_images SET sort_order = $1 WHERE id = $2 AND product_id = $3`,
        [i, body.order[i], id]
      )
    }

    return NextResponse.json({ message: 'Reordered' })
  } catch (err) {
    console.error('[api/admin/products/:id/images] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to reorder images' }, { status: 500 })
  }
}
