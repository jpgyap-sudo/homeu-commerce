import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [lastRunRes, todayRes, weekRes, recentRes] = await Promise.all([
      query(`SELECT created_at FROM crm_logs ORDER BY created_at DESC LIMIT 1`, []),
      query(`SELECT COUNT(*) as c FROM crm_logs WHERE created_at > NOW() - INTERVAL '24 hours'`, []),
      query(`SELECT COUNT(*) as c FROM crm_logs WHERE created_at > NOW() - INTERVAL '7 days'`, []),
      query(`SELECT id, action_sent, cart_id, quotation_id, rfq_id, created_at FROM crm_logs ORDER BY created_at DESC LIMIT 20`, []),
    ])

    return NextResponse.json({
      lastRun: lastRunRes.rows[0]?.created_at || null,
      todaySent: Number(todayRes.rows[0]?.c || 0),
      weekSent: Number(weekRes.rows[0]?.c || 0),
      recentLogs: recentRes.rows,
    })
  } catch {
    return NextResponse.json({ lastRun: null, todaySent: 0, weekSent: 0, recentLogs: [] })
  }
}
