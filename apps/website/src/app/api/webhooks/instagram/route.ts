import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  loadInstagramSocialConfig,
  syncInstagramMediaById,
} from '@/lib/instagram-sync'

function validMetaSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith('sha256=') || !secret) return false
  const supplied = signature.slice('sha256='.length)
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (!/^[a-f0-9]{64}$/i.test(supplied) || supplied.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'))
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const config = await loadInstagramSocialConfig()
  const verifyToken = config.fb_webhook_verify_token || process.env.INSTAGRAM_VERIFY_TOKEN

  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const config = await loadInstagramSocialConfig()
    if (!config.fb_app_secret) {
      return NextResponse.json({ error: 'Meta app secret is not configured' }, { status: 503 })
    }
    if (!validMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), config.fb_app_secret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const mediaIds = new Set<string>()
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const mediaId = change.value?.media_id || change.value?.id
        if (mediaId) mediaIds.add(String(mediaId))
      }
    }

    let synced = 0
    for (const mediaId of mediaIds) {
      const result = await syncInstagramMediaById(mediaId, config)
      if (result !== 'skipped') synced++
    }

    return NextResponse.json({ success: true, received: mediaIds.size, synced })
  } catch (err: any) {
    console.error('[instagram-webhook] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
