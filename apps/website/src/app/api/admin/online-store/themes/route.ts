import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  createStoreTheme,
  deleteStoreTheme,
  duplicateStoreTheme,
  importStoreTheme,
  listStoreThemes,
  publishStoreTheme,
  renameStoreTheme,
} from '@/lib/store-themes'

async function requireAdmin() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET() {
  try {
    const blocked = await requireAdmin()
    if (blocked) return blocked

    const themes = await listStoreThemes()
    return NextResponse.json({ themes })
  } catch (err: any) {
    console.error('[api/admin/online-store/themes] GET error:', err)
    return NextResponse.json({ error: err.message || 'Failed to load themes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await requireAdmin()
    if (blocked) return blocked

    const body = await request.json()
    const action = body?.action
    const id = Number(body?.id)

    if (action === 'create') {
      const deviceScope = body?.deviceScope === 'mobile' ? 'mobile' : 'desktop'
      const theme = await createStoreTheme(body?.name, deviceScope)
      return NextResponse.json({ theme }, { status: 201 })
    }

    if (action === 'import') {
      const theme = await importStoreTheme(body)
      return NextResponse.json({ theme }, { status: 201 })
    }

    if (action === 'duplicate') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'Theme id is required' }, { status: 400 })
      const theme = await duplicateStoreTheme(id, body?.name)
      return NextResponse.json({ theme }, { status: 201 })
    }

    if (action === 'publish') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'Theme id is required' }, { status: 400 })
      await publishStoreTheme(id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'rename') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'Theme id is required' }, { status: 400 })
      await renameStoreTheme(id, String(body?.name || ''))
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete') {
      if (!Number.isFinite(id)) return NextResponse.json({ error: 'Theme id is required' }, { status: 400 })
      await deleteStoreTheme(id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/admin/online-store/themes] POST error:', err)
    const message = err.message || 'Failed to update theme'
    const status = /required|invalid|missing|mobile themes/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
