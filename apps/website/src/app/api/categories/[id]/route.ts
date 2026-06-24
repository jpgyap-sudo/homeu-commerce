/**
 * GET /api/categories/[id] — Single category detail
 * PATCH /api/categories/[id] — Update category
 * DELETE /api/categories/[id] — Delete category
 *
 * Custom API endpoint for single-category CRUD operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ── GET ──────────────────────────────────────────────────────────────

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

    const result = await query(
      `SELECT c.* FROM categories c WHERE c.id::text = $1 OR c.slug = $1 LIMIT 1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const cat = result.rows[0]

    // Linked products come from collection_products — the many-to-many
    // table that mirrors Shopify's real collection membership (a product
    // can belong to several categories at once). products.category_id is
    // kept only as a "primary category" convenience field.
    const productsRes = await query(
      `SELECT p.id, p.title, p.slug,
              (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url
       FROM collection_products cp
       JOIN products p ON p.id = cp.product_id
       WHERE cp.collection_id = $1
       ORDER BY cp.position ASC, p.title ASC`,
      [cat.id]
    )

    return NextResponse.json({
      id: cat.id,
      title: cat.title,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.image_url || null,
      parentId: cat.parent_id || null,
      collectionType: cat.collection_type,
      productCount: productsRes.rowCount,
      products: productsRes.rows,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
    })
  } catch (err) {
    console.error('[api/categories/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

// ── PATCH ────────────────────────────────────────────────────────────

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

    const allowedFields = new Set([
      'title', 'slug', 'description', 'image_url', 'parent_id',
    ])

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 0

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        idx++
        setClauses.push(`"${key}" = $${idx}`)
        values.push(value ?? null)
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(id)

    const result = await query(
      `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Category updated successfully',
      category: result.rows[0],
    })
  } catch (err) {
    console.error('[api/categories/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────

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

    // Check category exists
    const existing = await query('SELECT id FROM categories WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Unlink products that reference this category
    await query('UPDATE products SET category_id = NULL WHERE category_id = $1', [id])

    // Delete the category
    await query('DELETE FROM categories WHERE id = $1', [id])

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (err) {
    console.error('[api/categories/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
