import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { syncLiveStoreThemeSnapshot } from '@/lib/store-themes'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await syncLiveStoreThemeSnapshot()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/theme/sync-snapshot] POST error:', err)
    return NextResponse.json({ error: 'Failed to sync snapshot' }, { status: 500 })
  }
}
