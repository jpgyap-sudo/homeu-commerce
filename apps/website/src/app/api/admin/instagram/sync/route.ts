import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { loadInstagramSocialConfig, syncInstagramFeed } from '@/lib/instagram-sync'

async function requireStaff() {
  const session = await getSession()
  return session && session.role !== 'customer' ? session : null
}

export async function GET() {
  if (!await requireStaff()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const config = await loadInstagramSocialConfig()
    const { rows } = await query(
      `SELECT COUNT(*)::int AS posts,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              MAX(synced_at) AS last_synced_at
       FROM instagram_posts`
    )
    return NextResponse.json({
      configured: Boolean(config.ig_business_account_id && config.ig_access_token),
      businessAccount: config.ig_business_account_id
        ? `••••${config.ig_business_account_id.slice(-4)}`
        : null,
      graphVersion: config.ig_graph_api_version || process.env.META_GRAPH_API_VERSION || 'v23.0',
      ...rows[0],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  if (!await requireStaff()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const summary = await syncInstagramFeed()
    return NextResponse.json({ success: true, ...summary })
  } catch (err: any) {
    console.error('[admin/instagram/sync] Error:', err.message)
    return NextResponse.json({ error: err.message || 'Instagram sync failed' }, { status: 502 })
  }
}
