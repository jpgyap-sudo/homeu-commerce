/**
 * GET /api/chat/widget-config — Public, unauthenticated.
 *
 * The storefront chat widget is a client component and can't read
 * server-side env vars or query the DB directly at render time, so it
 * fetches its runtime config (Viber handoff number, enable flag, timing
 * delays) from here. Values come from the admin-configurable `messaging`
 * namespace in lib/app-config.ts (DB > env var > default).
 */

import { NextResponse } from 'next/server'
import { loadNamespace } from '@/lib/app-config'

export async function GET() {
  try {
    const messaging = await loadNamespace<{
      viberNumber: string
      viberName: string
      enableChat: boolean
      greetingDelay: number
      productPageDelay: number
    }>('messaging')

    return NextResponse.json({
      viberNumber: messaging.viberNumber,
      viberName: messaging.viberName,
      enableChat: messaging.enableChat,
      greetingDelay: messaging.greetingDelay,
      productPageDelay: messaging.productPageDelay,
    })
  } catch (err: any) {
    console.error('[chat/widget-config] error:', err.message)
    // Fail open with defaults so a DB hiccup never hides the chat widget
    return NextResponse.json({
      viberNumber: '',
      viberName: 'HomeU Sales Team',
      enableChat: true,
      greetingDelay: 4000,
      productPageDelay: 7000,
    })
  }
}
