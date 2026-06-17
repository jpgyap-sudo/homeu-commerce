/**
 * POST /api/collections/preview — evaluate smart rules WITHOUT saving.
 *
 * Body: { rules: CollectionRule[], rulesMatch: 'all'|'any', limit?: number }
 * Returns the matching products so the admin can see results live while
 * building rules. Auth required (admin tool).
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { compileRules, type CollectionRule } from '@/lib/collection-rules'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const rules: CollectionRule[] = Array.isArray(body.rules) ? body.rules : []
    const match: 'all' | 'any' = body.rulesMatch === 'any' ? 'any' : 'all'
    const limit = Math.min(parseInt(body.limit, 10) || 24, 100)

    const { where, params } = compileRules(rules, match, 0)
    if (where === 'FALSE') {
      return NextResponse.json({ total: 0, products: [] })
    }

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM products p WHERE p.status = 'active' AND (${where})`,
      params
    )
    const total = parseInt(countRes.rows[0]?.total, 10) || 0

    const pRes = await query(
      `SELECT p.id, p.title, p.slug, p.price, p.sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url
       FROM products p
       WHERE p.status = 'active' AND (${where})
       ORDER BY p.id ASC
       LIMIT ${limit}`,
      params
    )

    return NextResponse.json({
      total,
      products: pRes.rows.map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug,
        price: p.price, salePrice: p.sale_price,
        imageUrl: p.image_url || null,
      })),
    })
  } catch (err) {
    console.error('[api/collections/preview] error:', err)
    return NextResponse.json({ error: 'Failed to preview rules' }, { status: 500 })
  }
}
