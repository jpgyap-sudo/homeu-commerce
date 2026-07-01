import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await query(
      `SELECT key, value FROM site_settings WHERE key LIKE 'theme_%' OR key = 'custom_css' OR key = 'favicon'`,
      []
    )

    const settings: Record<string, any> = {}
    for (const row of res.rows) {
      if (row.key === 'custom_css') {
        settings.customCss = typeof row.value === 'string' ? row.value : ''
      } else if (row.key === 'favicon') {
        settings.favicon = row.value
      } else if (row.key.startsWith('theme_')) {
        const k = row.key.replace('theme_', '')
        settings[k] = row.value
      }
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({})
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Map global theme settings to individual site_settings keys
    const themeKeys = [
      'primaryColor', 'secondaryColor', 'accentColor', 'bodyBg',
      'textColor', 'mutedColor', 'borderColor',
      'headingFont', 'bodyFont',
      'buttonRadius', 'buttonStyle', 'buttonUppercase',
      'layoutMaxWidth', 'sectionGap',
    ]

    const entries: Array<{ key: string; value: any }> = []

    for (const k of themeKeys) {
      if (body[k] !== undefined) {
        entries.push({ key: `theme_${k}`, value: body[k] })
      }
    }

    // Handle custom CSS separately (it uses a different key)
    if (body.customCss !== undefined) {
      entries.push({ key: 'custom_css', value: body.customCss })
    }

    // Handle favicon
    if (body.favicon !== undefined) {
      entries.push({ key: 'favicon', value: body.favicon })
    }

    for (const entry of entries) {
      await query(
        `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [entry.key, JSON.stringify(entry.value)]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
