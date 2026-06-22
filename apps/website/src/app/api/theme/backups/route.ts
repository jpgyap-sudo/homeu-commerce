import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const res = await query(`SELECT data FROM "DaVinciOS_kv" WHERE key = 'theme_backups' LIMIT 1`, [])
    const backups = res.rows[0]?.data || []
    return NextResponse.json({ backups })
  } catch (err) {
    return NextResponse.json({ backups: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sections, header, css, palette } = await request.json()
    const newBackup = {
      timestamp: new Date().toISOString(),
      data: { sections, header, css, palette },
    }

    // Get current backups
    const currentRes = await query(`SELECT data FROM "DaVinciOS_kv" WHERE key = 'theme_backups' LIMIT 1`, [])
    const currentBackups = Array.isArray(currentRes.rows[0]?.data) ? currentRes.rows[0].data : []

    // Prepend and limit to 3
    const updatedBackups = [newBackup, ...currentBackups].slice(0, 3)

    await query(
      `INSERT INTO "DaVinciOS_kv" (key, data)
       VALUES ('theme_backups', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
      [JSON.stringify(updatedBackups)]
    )

    return NextResponse.json({ ok: true, backups: updatedBackups })
  } catch (err: any) {
    console.error('[api/theme/backups] POST error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save backup' }, { status: 500 })
  }
}
