import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { normalizeCustomerAccountTheme, DEFAULT_CUSTOMER_ACCOUNT_THEME } from '@/lib/customer-account-theme'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'customer_account_theme' LIMIT 1`)
    return NextResponse.json(normalizeCustomerAccountTheme(res.rows[0]?.value))
  } catch {
    return NextResponse.json(DEFAULT_CUSTOMER_ACCOUNT_THEME)
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const normalized = normalizeCustomerAccountTheme(body)
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ['customer_account_theme', JSON.stringify(normalized)]
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
