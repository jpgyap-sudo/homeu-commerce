/**
 * POST /api/products/recommend
 *
 * Product recommendation endpoint. Searches the catalog by text query,
 * image ID, or extracted attributes. Returns ranked product results.
 *
 * Request:
 *   { conversationId?, query?, imageId?, attributes?, limit? }
 *
 * Response:
 *   { recommendations: [{ productId, title, url, imageUrl, referencePrice, reason, matchType, confidence }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, searchByAttributes } from '@/lib/chatbot/product-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, attributes, limit = 6 } = body

    let recommendations

    if (attributes && (attributes.category || attributes.style?.length || attributes.material?.length || attributes.color?.length)) {
      // Search by extracted attributes (from image analysis)
      recommendations = await searchByAttributes({
        category: attributes.category,
        style: attributes.style,
        material: attributes.material,
        color: attributes.color,
      })
    } else if (query?.trim()) {
      // Search by text query
      recommendations = await searchProducts({
        query,
        limit,
      })
    } else {
      return NextResponse.json({ error: 'Query or attributes required' }, { status: 400 })
    }

    const result = recommendations.map(r => ({
      productId: r.id,
      title: r.title,
      url: r.url,
      imageUrl: r.imageUrl,
      referencePrice: r.price,
      reason: r.matchReason,
      matchType: r.matchType,
      confidence: r.confidence,
    }))

    return NextResponse.json({ recommendations: result })
  } catch (err) {
    console.error('[chatbot] POST /api/products/recommend error:', err)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}
