import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { rows } = await query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100')
    return NextResponse.json({ activities: rows })
  } catch { return NextResponse.json({ activities: [] }) }
}
