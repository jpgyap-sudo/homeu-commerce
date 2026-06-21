/**
 * POST /api/admin/reviews/[id]/reply
 *   { body } — publish a merchant reply.
 *   { aiDraft: true } — instead of saving, return an AI-drafted reply
 *     for the admin to review/edit before submitting for real.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  try {
    const body = await request.json()

    const reviewResult = await query(
      `SELECT r.*, p.title as product_title FROM reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.id = $1`,
      [id]
    )
    if (reviewResult.rowCount === 0) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    const review = reviewResult.rows[0]

    if (body.aiDraft) {
      const { getAIProvider } = await import('@/lib/chatbot/ai-provider')
      const ai = await getAIProvider()
      const draft = await ai.generateText(
        `Write a short, warm, professional merchant reply (2-3 sentences max) to this customer review for "${review.product_title || 'a product'}":\n\nRating: ${review.rating}/5\nReview: "${review.body}"\n\nThank them, address anything specific they mentioned, and keep it genuine — no generic corporate filler.`,
        'You are replying as the HomeU.PH / Home Atelier team to a customer product review.'
      )
      return NextResponse.json({ draft })
    }

    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }

    const replyResult = await query(
      `INSERT INTO review_replies (review_id, admin_user_id, body, ai_drafted)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, session.id || null, body.body.trim(), !!body.aiDrafted]
    )

    return NextResponse.json({ reply: replyResult.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[admin/reviews/:id/reply] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
