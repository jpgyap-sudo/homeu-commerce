/**
 * GET /api/products/[id] — Single product detail
 * PATCH /api/products/[id] — Update product
 * DELETE /api/products/[id] — Delete product
 *
 * Custom API endpoint for single-product CRUD operations.
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
      `SELECT p.*,
              (SELECT row_to_json(c.*) FROM categories c WHERE c.id = p.category_id) as category,
              (SELECT json_agg(row_to_json(pi.*)) FROM (SELECT * FROM product_images WHERE product_id = p.id ORDER BY sort_order) pi) as images
       FROM products p
       WHERE p.id = $1 OR p.slug = $1
       LIMIT 1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = result.rows[0]

    return NextResponse.json({
      id: product.id,
      title: product.title,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      salePrice: product.sale_price,
      showPrice: product.show_price,
      priceNote: product.price_note,
      description: product.description,
      status: product.status,
      vendor: product.vendor,
      productType: product.product_type,
      inventoryTracked: product.inventory_tracked,
      inventoryQuantity: product.inventory_quantity,
      salesChannel: product.sales_channel,
      dimensions: product.dimensions,
      materials: product.materials,
      category_id: product.category_id,
      category: product.category,
      seoTitle: product.seo_title,
      seoDescription: product.seo_description,
      images: product.images || [],
      imageUrl: product.images?.[0]?.url || product.image_url || null,
      tags: product.tags,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    })
  } catch (err) {
    console.error('[api/products/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
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

    // Build SET clause dynamically from allowed fields
    const allowedFields = new Set([
      'title', 'slug', 'sku', 'status', 'vendor', 'product_type',
      'price', 'sale_price', 'show_price', 'price_note',
      'inventory_tracked', 'inventory_quantity', 'sales_channel',
      'description', 'dimensions', 'materials',
      'category_id', 'seo_title', 'seo_description',
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
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Product updated successfully',
      product: result.rows[0],
    })
  } catch (err) {
    console.error('[api/products/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
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

    // Check product exists
    const existing = await query('SELECT id FROM products WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete related product_images first
    await query('DELETE FROM product_images WHERE product_id = $1', [id])

    // Delete product_rels entries
    await query('DELETE FROM products_rels WHERE parent_id = $1', [id])

    // Delete the product
    await query('DELETE FROM products WHERE id = $1', [id])

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (err) {
    console.error('[api/products/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
