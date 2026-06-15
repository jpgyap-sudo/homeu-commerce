/**
 * POST /api/rfq/add-item
 *
 * Adds a product to the visitor's RFQ cart.
 * In MVP, the client-side QuoteCart (localStorage) handles this,
 * but this endpoint serves as the server-side sync for admin tracking.
 *
 * Request:
 *   { leadId, conversationId, productId, quantity, notes?, acceptsAlternatives?, matchType? }
 *
 * Response:
 *   { success, rfqCartId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { addItemToRFQCart } from '@/lib/chatbot/rfq-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, conversationId, productId, productTitle, quantity, notes, acceptsAlternatives, matchType } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    const result = await addItemToRFQCart(leadId, conversationId || '', {
      productId,
      productTitle: productTitle || '',
      quantity,
      notes,
      acceptsAlternatives,
      matchType,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to add item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rfqCartId: result.rfqCartId })
  } catch (err) {
    console.error('[chatbot] POST /api/rfq/add-item error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
