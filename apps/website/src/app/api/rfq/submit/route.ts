/**
 * POST /api/rfq/submit
 *
 * Submits the RFQ cart for sales review.
 * Creates a record in DaVinciOS RFQRequests collection and sends
 * a Telegram alert to the sales group.
 *
 * Request:
 *   { leadId, conversationId, deliveryLocation, projectType, targetDate, budgetRange, notes, items }
 *
 * Response:
 *   { success, rfqCartId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { submitRFQ } from '@/lib/chatbot/rfq-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, conversationId, deliveryLocation, projectType, targetDate, budgetRange, notes, items } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }
    if (!deliveryLocation?.trim()) {
      return NextResponse.json({ error: 'Delivery location is required' }, { status: 400 })
    }

    const result = await submitRFQ({
      leadId,
      conversationId,
      deliveryLocation,
      projectType,
      targetDate,
      budgetRange,
      notes,
      items: items.map((item: any) => ({
        productId: item.productId,
        productTitle: item.productTitle || '',
        productUrl: item.productUrl,
        referencePrice: item.referencePrice,
        quantity: item.quantity || 1,
        notes: item.notes,
        acceptsAlternatives: item.acceptsAlternatives,
        matchType: item.matchType,
      })),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to submit RFQ' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rfqCartId: result.rfqCartId,
      message: 'Your RFQ has been sent to our sales team. We will review the items and contact you with quotation details.',
    })
  } catch (err) {
    console.error('[chatbot] POST /api/rfq/submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
