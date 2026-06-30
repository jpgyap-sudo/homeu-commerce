import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const DEFAULT_CONFIG = {
  enabled: true,
  abandonedCartDelayHours: 2,
  abandonedCartFollowUpHours: 24,
  stalledRfqDelayHours: 24,
  expiringQuoteDelayHours: 48,
  maxDailyEmails: 50,
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'crm_automation_config' LIMIT 1`)
    const config = res.rows[0]?.value || DEFAULT_CONFIG
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ config: DEFAULT_CONFIG })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ['crm_automation_config', JSON.stringify(body)]
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
