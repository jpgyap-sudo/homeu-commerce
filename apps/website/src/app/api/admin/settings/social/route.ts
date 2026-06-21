/**
 * GET /api/admin/settings/social
 * PUT /api/admin/settings/social
 *
 * Admin-only: Read/write Facebook & Instagram social channel credentials
 * from DaVinciOS_kv table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const KV_SOCIAL_KEY = 'social_channels_config'
const MASKED_FIELDS = ['fb_page_access_token', 'fb_app_secret', 'ig_access_token']

export interface SocialConfig {
  // Facebook
  fb_app_id: string
  fb_app_secret: string
  fb_page_id: string
  fb_page_access_token: string
  fb_webhook_verify_token: string

  // Instagram
  ig_business_account_id: string
  ig_access_token: string

  // Status
  fb_webhook_active: boolean
  ig_webhook_active: boolean

  // Timestamps
  fb_token_expires_at: string
  ig_token_expires_at: string
}

function getEmptyConfig(): SocialConfig {
  return {
    fb_app_id: '',
    fb_app_secret: '',
    fb_page_id: '',
    fb_page_access_token: '',
    fb_webhook_verify_token: 'homeu-fb-webhook-verify-' + Date.now().toString(36),
    ig_business_account_id: '',
    ig_access_token: '',
    fb_webhook_active: false,
    ig_webhook_active: false,
    fb_token_expires_at: '',
    ig_token_expires_at: '',
  }
}

async function loadConfig(): Promise<SocialConfig> {
  try {
    const result = await query(
      'SELECT data FROM "DaVinciOS_kv" WHERE key = $1 LIMIT 1',
      [KV_SOCIAL_KEY]
    )
    if (result.rows.length > 0) {
      const data = result.rows[0].data
      if (typeof data === 'object' && data !== null) {
        return { ...getEmptyConfig(), ...data } as SocialConfig
      }
    }
  } catch { /* table may not exist */ }
  return getEmptyConfig()
}

async function saveConfig(config: Partial<SocialConfig>): Promise<void> {
  const existing = await loadConfig()
  const merged = { ...existing, ...config }

  // Remove empty strings
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(merged)) {
    if (value !== '' && value !== null && value !== undefined) {
      clean[key] = value
    }
  }

  await query(
    `INSERT INTO "DaVinciOS_kv" (key, data)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key)
     DO UPDATE SET data = $2::jsonb`,
    [KV_SOCIAL_KEY, JSON.stringify(clean)]
  )
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await loadConfig()

    // Mask sensitive fields
    const masked: Record<string, any> = {}
    for (const [key, value] of Object.entries(config)) {
      if (MASKED_FIELDS.includes(key) && typeof value === 'string' && value.length > 4) {
        masked[key] = value.substring(0, 2) + '••••' + value.substring(value.length - 1)
      } else {
        masked[key] = value
      }
    }

    // Build webhook callback URLs
    const baseUrl = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'
    masked.fb_webhook_callback_url = `${baseUrl}/api/webhooks/facebook`
    masked.ig_webhook_callback_url = `${baseUrl}/api/webhooks/instagram`

    return NextResponse.json({ config: masked })
  } catch (err: any) {
    console.error('[admin/settings/social] GET error:', err.message)
    return NextResponse.json({ config: getEmptyConfig() })
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

    const existing = await loadConfig()

    // Keep existing values for masked fields that weren't changed
    for (const field of MASKED_FIELDS) {
      if (config[field] && config[field].includes('••••')) {
        config[field] = existing[field as keyof SocialConfig] || config[field]
      }
    }

    await saveConfig(config)

    return NextResponse.json({
      success: true,
      message: 'Social channel settings saved',
    })
  } catch (err: any) {
    console.error('[admin/settings/social] PUT error:', err.message)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
