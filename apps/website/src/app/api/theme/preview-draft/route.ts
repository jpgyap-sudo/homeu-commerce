import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { template, sections, header, css, palette, mobileNavStyle } = await request.json()
    const draftData = { template, sections, header, css, palette, mobileNavStyle }

    await query(
      `INSERT INTO "DaVinciOS_kv" (key, data)
       VALUES ('theme_preview_draft', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(draftData)]
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/theme/preview-draft] POST error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save preview draft' }, { status: 500 })
  }
}
