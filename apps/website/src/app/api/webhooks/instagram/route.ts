import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * Instagram Webhook Endpoint
 * 
 * Receives real-time notifications from Instagram Graph API when:
 * - A new post is published
 * - A post is mentioned
 * - Media is updated
 * 
 * Registers at: POST https://graph.facebook.com/v18.0/{app-id}/subscriptions
 *   ?object=instagram
 *   &callback_url=https://admin.homeatelier.ph/api/webhooks/instagram
 *   &fields=mentions,messages,media
 *   &verify_token={VERIFY_TOKEN}
 *   &access_token={app-access-token}
 * 
 * Required env: INSTAGRAM_VERIFY_TOKEN
 */

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'homeu-instagram-webhook-verify'

export async function GET(request: NextRequest) {
  // Instagram sends a GET for verification with hub.mode, hub.verify_token, hub.challenge
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[instagram-webhook] Verification successful')
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[instagram-webhook] Verification failed:', { mode, token })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[instagram-webhook] Received:', JSON.stringify(body).substring(0, 500))

    // Handle media notifications — new posts added to queue
    if (body.entry?.[0]?.changes?.[0]?.value?.media_id) {
      const change = body.entry[0].changes[0]
      const mediaId = change.value.media_id

      // Check if already imported
      const { rows } = await query(
        'SELECT id FROM instagram_posts WHERE instagram_media_id = $1',
        [mediaId]
      )

      if (rows.length === 0) {
        // Insert as pending — admin will review
        await query(
          `INSERT INTO instagram_posts (instagram_media_id, status, source, is_visible, is_pinned)
           VALUES ($1, 'pending', 'instagram', TRUE, FALSE)`,
          [mediaId]
        )
        console.log(`[instagram-webhook] New post queued: ${mediaId}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[instagram-webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
