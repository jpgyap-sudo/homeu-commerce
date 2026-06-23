/**
 * GET    /api/collections/[id]  — collection + its products (public reads)
 * PATCH  /api/collections/[id]  — update; re-syncs smart membership
 * DELETE /api/collections/[id]  — delete collection (membership cascades)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { compileRules, sortClause, type CollectionRule } from '@/lib/collection-rules'

// Re-evaluate a smart collection's rules and refresh its smart memberships.
// Manual members (source='manual') are preserved; smart members are replaced.
async function resyncSmartMembership(
  collectionId: number,
  rules: CollectionRule[],
  match: 'all' | 'any'
): Promise<number> {
  const { where, params } = compileRules(rules, match, 1)
  // $1 = collectionId, rule params follow starting at $2
  await query(`DELETE FROM collection_products WHERE collection_id = $1 AND source = 'smart'`, [collectionId])

  if (where === 'FALSE') return 0

  const insertSQL = `
    INSERT INTO collection_products (collection_id, product_id, position, source)
    SELECT $1, p.id, p.id, 'smart'
    FROM products p
    WHERE p.status = 'active' AND (${where})
    ON CONFLICT (collection_id, product_id) DO NOTHING`
  const res = await query(insertSQL, [collectionId, ...params])
  return res.rowCount || 0
}

// ── GET ───────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cRes = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM categories c WHERE c.id = $1`,
      [id]
    )
    if (cRes.rows.length === 0) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    const c = cRes.rows[0]

    const pRes = await query(
      `SELECT p.id, p.title, p.slug, p.price, p.sale_price, p.status,
              cp.source, cp.position,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url
       FROM collection_products cp
       JOIN products p ON p.id = cp.product_id
       WHERE cp.collection_id = $1
       ORDER BY cp.position ASC
       LIMIT 500`,
      [id]
    )

    return NextResponse.json({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      imageUrl: c.image_url || null,
      bannerImageUrl: c.banner_image_url || null,
      bannerFocalX: c.banner_focal_x ?? 50,
      bannerFocalY: c.banner_focal_y ?? 50,
      bannerImageScale: c.banner_image_scale ?? 100,
      type: c.collection_type,
      rules: c.rules || [],
      rulesMatch: c.rules_match,
      published: c.published,
      position: c.position,
      productSort: c.product_sort,
      featured: c.featured,
      seoTitle: c.seo_title,
      seoDescription: c.seo_description,
      productCount: parseInt(c.product_count, 10) || 0,
      products: pRes.rows.map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug,
        price: p.price, salePrice: p.sale_price, status: p.status,
        source: p.source, imageUrl: p.image_url || null,
      })),
    })
  } catch (err) {
    console.error('[api/collections/[id]] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const fields: string[] = []
    const values: any[] = []
    let i = 0
    const set = (col: string, val: any, cast = '') => {
      i++; fields.push(`${col} = $${i}${cast}`); values.push(val)
    }

    if (body.title !== undefined) set('title', body.title.trim())
    if (body.slug !== undefined) set('slug', body.slug.trim())
    if (body.description !== undefined) set('description', body.description?.trim() || null)
    if (body.imageUrl !== undefined) set('image_url', body.imageUrl?.trim() || null)
    if (body.bannerImageUrl !== undefined) set('banner_image_url', body.bannerImageUrl?.trim() || null)
    if (body.bannerFocalX !== undefined) set('banner_focal_x', Math.min(100, Math.max(0, parseInt(body.bannerFocalX, 10) || 50)))
    if (body.bannerFocalY !== undefined) set('banner_focal_y', Math.min(100, Math.max(0, parseInt(body.bannerFocalY, 10) || 50)))
    if (body.bannerImageScale !== undefined) set('banner_image_scale', Math.min(160, Math.max(40, parseInt(body.bannerImageScale, 10) || 100)))
    if (body.type !== undefined) set('collection_type', body.type === 'smart' ? 'smart' : 'manual')
    if (body.rules !== undefined) set('rules', JSON.stringify(body.rules || []), '::jsonb')
    if (body.rulesMatch !== undefined) set('rules_match', body.rulesMatch === 'any' ? 'any' : 'all')
    if (body.published !== undefined) set('published', !!body.published)
    if (body.position !== undefined) set('position', parseInt(body.position, 10) || 0)
    if (body.productSort !== undefined) set('product_sort', body.productSort || 'manual')
    if (body.featured !== undefined) set('featured', !!body.featured)
    if (body.seoTitle !== undefined) set('seo_title', body.seoTitle?.trim() || null)
    if (body.seoDescription !== undefined) set('seo_description', body.seoDescription?.trim() || null)

    if (fields.length > 0) {
      i++
      await query(
        `UPDATE categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
        [...values, id]
      )
    }

    // If smart, re-evaluate membership from the (possibly new) rules.
    const cRes = await query(
      `SELECT collection_type, rules, rules_match FROM categories WHERE id = $1`,
      [id]
    )
    const c = cRes.rows[0]
    let smartCount = 0
    if (c && c.collection_type === 'smart') {
      smartCount = await resyncSmartMembership(
        parseInt(id, 10),
        c.rules || [],
        c.rules_match === 'any' ? 'any' : 'all'
      )
    }

    return NextResponse.json({ ok: true, smartMembers: smartCount })
  } catch (err) {
    console.error('[api/collections/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await query('DELETE FROM categories WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/collections/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
  }
}
