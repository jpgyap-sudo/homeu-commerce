/**
 * DELETE /api/admin/products/[id]/images/[imageId] — remove one product image
 * PATCH  /api/admin/products/[id]/images/[imageId] — update alt text
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, imageId } = await params

    const result = await query(
      `DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING id`,
      [imageId, id]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Image removed' })
  } catch (err) {
    console.error('[api/admin/products/:id/images/:imageId] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, imageId } = await params
    const body = await request.json()

    const result = await query(
      `UPDATE product_images SET alt = $1 WHERE id = $2 AND product_id = $3 RETURNING id, url, alt, sort_order`,
      [body.alt?.trim() || null, imageId, id]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    return NextResponse.json({ image: result.rows[0] })
  } catch (err) {
    console.error('[api/admin/products/:id/images/:imageId] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
  }
}
