import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/** Per-quotation overrides on top of the global site_settings.theme_quotation
 *  (e.g. hide watermark just for this one). Stored on quotations.theme_overrides. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { rows } = await query('SELECT theme_overrides FROM quotations WHERE id = $1', [id])
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0].theme_overrides || {})
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  await query('UPDATE quotations SET theme_overrides = $1::jsonb WHERE id = $2', [JSON.stringify(body || {}), id])
  return NextResponse.json({ success: true })
}
