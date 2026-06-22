/**
 * GET /api/cron/rfq-cleanup-sweep
 *
 * Manual/external trigger for the same sweep that also runs automatically
 * once a day via src/instrumentation.ts. Useful for testing or for an
 * external scheduler (e.g. a hosting platform's cron) as a backup.
 * Same bearer-token convention as /api/cron/crm-trigger.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runRfqCleanupSweep } from '@/lib/rfq-cleanup-sweep'

const CRON_SECRET = process.env.CRON_SECRET || 'homeu-crm-secret-token-123xyz'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '')
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev && token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runRfqCleanupSweep()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[cron/rfq-cleanup-sweep] error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
