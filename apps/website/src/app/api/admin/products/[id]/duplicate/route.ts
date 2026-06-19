/**
 * POST /api/admin/products/[id]/duplicate
 *
 * Deep-copies a product row (including images), appends " (Copy)" to the title,
 * generates a unique slug, and returns the new product ID.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Fetch the original product
    const origRows = await query('SELECT * FROM products WHERE id = $1', [id])
    if (origRows.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const orig = origRows.rows[0]

    // Generate a new unique slug
    const baseSlug = (orig.slug || 'product') + '-copy'
    let newSlug = baseSlug
    let suffix = 1
    while (true) {
      const check = await query('SELECT id FROM products WHERE slug = $1', [newSlug])
      if (check.rows.length === 0) break
      suffix++
      newSlug = `${baseSlug}-${suffix}`
    }

    // Insert the duplicate
    const insertResult = await query(
      `INSERT INTO products (title, slug, description, short_description, price, sale_price,
         category_id, sku, status, dimensions, materials, tags, colors,
         seo_title, seo_description, meta, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
       RETURNING id`,
      [
        (orig.title || 'Untitled') + ' (Copy)',
        newSlug,
        orig.description,
        orig.short_description,
        orig.price,
        orig.sale_price,
        orig.category_id,
        orig.sku ? orig.sku + '-COPY' : null,
        'draft',
        orig.dimensions,
        orig.materials,
        orig.tags || [],
        orig.colors || [],
        orig.seo_title,
        orig.seo_description,
        orig.meta || {},
      ]
    )
    const newId = insertResult.rows[0].id

    // Copy product images
    await query(
      `INSERT INTO product_images (product_id, url, alt, sort_order)
       SELECT $1, url, alt, sort_order
       FROM product_images
       WHERE product_id = $2
       ORDER BY sort_order`,
      [newId, id]
    )

    // Copy related products
    await query(
      `INSERT INTO related_products (product_id, related_product_id)
       SELECT $1, related_product_id
       FROM related_products
       WHERE product_id = $2`,
      [newId, id]
    )

    return NextResponse.json({ id: newId, slug: newSlug }, { status: 201 })
  } catch (err) {
    console.error('[api/admin/products/duplicate] Error:', err)
    return NextResponse.json({ error: 'Failed to duplicate product' }, { status: 500 })
  }
}
