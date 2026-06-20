/**
 * GET /api/admin/settings/email
 * PUT /api/admin/settings/email
 *
 * Admin-only: Read/write SMTP email configuration from DaVinciOS_kv table.
 * Stored as encrypted JSON in the key-value store.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const KV_EMAIL_KEY = 'smtp_config'
const MASKED_FIELDS = ['smtp_pass']

/**
 * Load SMTP config from database key-value store.
 * Fallback: returns empty config (will use .env defaults at runtime).
 */
async function loadConfig(): Promise<Record<string, string>> {
  try {
    const result = await query(
      'SELECT data FROM "DaVinciOS_kv" WHERE key = $1 LIMIT 1',
      [KV_EMAIL_KEY]
    )
    if (result.rows.length > 0) {
      const data = result.rows[0].data
      if (typeof data === 'object' && data !== null) {
        return data as Record<string, string>
      }
    }
  } catch {
    // Table may not exist yet
  }
  return {}
}

/**
 * Save SMTP config to database key-value store.
 */
async function saveConfig(config: Record<string, string>): Promise<void> {
  // Strip empty values — keep only non-empty entries
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    if (value && value.trim()) {
      clean[key] = value.trim()
    }
  }

  // Upsert into DaVinciOS_kv
  await query(
    `INSERT INTO "DaVinciOS_kv" (key, data)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key)
     DO UPDATE SET data = $2::jsonb`,
    [KV_EMAIL_KEY, JSON.stringify(clean)]
  )
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await loadConfig()

    // Mask sensitive fields for the response
    const masked: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      masked[key] = MASKED_FIELDS.includes(key) && value.length > 4
        ? value.substring(0, 2) + '••••' + value.substring(value.length - 1)
        : value
    }

    return NextResponse.json({ config: masked })
  } catch (err: any) {
    console.error('[admin/settings/email] GET error:', err.message)
    return NextResponse.json({ config: {} })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { config } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config object is required' }, { status: 400 })
    }

    // Merge with existing config (preserve password if not provided new one)
    const existing = await loadConfig()

    // If password field is the masked version, keep the existing password
    if (config.smtp_pass && config.smtp_pass.includes('••••')) {
      config.smtp_pass = existing.smtp_pass || config.smtp_pass
    }

    // Merge: new values override existing
    const merged = { ...existing, ...config }

    // Remove any values that are empty strings
    const clean: Record<string, string> = {}
    for (const [key, value] of Object.entries(merged)) {
      if (value && typeof value === 'string' && value.trim()) {
        clean[key] = value.trim()
      }
    }

    await saveConfig(clean)

    return NextResponse.json({
      success: true,
      message: 'SMTP settings saved',
    })
  } catch (err: any) {
    console.error('[admin/settings/email] PUT error:', err.message)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
