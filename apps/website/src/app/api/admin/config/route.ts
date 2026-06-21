/**
 * GET /api/admin/config — Load all config (masked secrets)
 * PUT /api/admin/config?namespace=store — Save one namespace
 *
 * Admin-only: Read/write all application settings through the unified
 * config registry stored in DaVinciOS_kv table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  loadAllConfig,
  loadNamespace,
  saveNamespace,
  maskSensitiveFields,
  isMaskedValue,
  getNamespaceList,
} from '@/lib/app-config'

// Namespaces whose values get masked in API responses
const MASKED_NAMESPACES = new Set(['email', 'ai', 'social', 'cdn', 'auth', 'messaging'])

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allConfig = await loadAllConfig()
    const namespaces = getNamespaceList()

    // Mask sensitive fields per namespace
    const masked: Record<string, any> = {}
    for (const ns of namespaces) {
      const data = (allConfig as any)[ns.key] || {}
      masked[ns.key] = MASKED_NAMESPACES.has(ns.key)
        ? maskSensitiveFields(data)
        : data
    }

    return NextResponse.json({ config: masked })
  } catch (err: any) {
    console.error('[admin/config] GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get('namespace')

    if (!namespace) {
      return NextResponse.json({ error: 'namespace query param is required' }, { status: 400 })
    }

    const body = await request.json()
    const { config } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config object is required' }, { status: 400 })
    }

    // Load existing to preserve masked values
    const existing = await loadNamespace(namespace)

    // For masked fields, keep the existing value
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && isMaskedValue(value)) {
        config[key] = (existing as any)[key] || value
      }
    }

    await saveNamespace(namespace, config)

    // Invalidate cached runtime config so the change takes effect immediately
    if (namespace === 'ai') {
      const { resetAIProvider } = await import('@/lib/chatbot/ai-provider')
      resetAIProvider()
    }
    if (namespace === 'cdn') {
      const { resetSpacesClient } = await import('@/lib/do-spaces')
      resetSpacesClient()
    }

    return NextResponse.json({
      success: true,
      message: `${namespace} settings saved`,
    })
  } catch (err: any) {
    console.error('[admin/config] PUT error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
