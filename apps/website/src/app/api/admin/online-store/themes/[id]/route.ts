import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStoreThemeById, updateStoreThemeSnapshot } from '@/lib/store-themes'

async function requireAdmin() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const blocked = await requireAdmin()
    if (blocked) return blocked

    const { id } = await params
    const theme = await getStoreThemeById(Number(id))
    if (!theme) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
    return NextResponse.json({ theme })
  } catch (err: any) {
    console.error('[api/admin/online-store/themes/[id]] GET error:', err)
    return NextResponse.json({ error: err.message || 'Failed to load theme' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const blocked = await requireAdmin()
    if (blocked) return blocked

    const { id } = await params
    const body = await request.json()
    const theme = await updateStoreThemeSnapshot(Number(id), {
      name: body.name,
      snapshot: body.snapshot,
      performanceMetrics: body.performanceMetrics,
    })
    return NextResponse.json({ theme })
  } catch (err: any) {
    console.error('[api/admin/online-store/themes/[id]] PATCH error:', err)
    const message = err.message || 'Failed to save theme'
    const status = /required|invalid|missing|not found/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
