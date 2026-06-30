import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { getCustomCss, getHeaderSettings } from '@/lib/theme'
import { getStoreThemeById } from '@/lib/store-themes'
import ThemeEditor from './ThemeEditor'

export const metadata = { title: 'Theme — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function ThemePage({
  searchParams,
}: {
  searchParams: Promise<{ viewport?: string; themeId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const sp = await searchParams
  const initialViewport = sp.viewport === 'mobile' || sp.viewport === 'tablet' ? sp.viewport : 'desktop'
  const themeId = sp.themeId ? Number(sp.themeId) : null

  let sections: any[] = []
  let initialCss = ''
  let initialHeader: any = {}
  let initialThemeId: number | null = null
  let initialThemeName = ''

  if (themeId) {
    // Load from store_themes snapshot
    const theme = await getStoreThemeById(themeId)
    if (theme) {
      const snap = theme.snapshot
      sections = (snap.sections || []).map((s: any, i: number) => ({
        id: i + 1,
        type: s.type,
        position: s.position || (i + 1) * 10,
        enabled: s.enabled !== false,
        config: s.config || {},
        template: s.template || 'index',
      }))
      initialCss = typeof snap.settings?.custom_css === 'string' ? snap.settings.custom_css : ''
      initialHeader = snap.settings?.header_settings || {}
      initialThemeId = themeId
      initialThemeName = theme.name
    }
  }

  if (!themeId) {
    // Load from live tables
    try {
      const res = await query(
        `SELECT id, type, position, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC`,
        []
      )
      sections = res.rows
    } catch { sections = [] }
    const [css, hdr] = await Promise.all([getCustomCss(), getHeaderSettings()])
    initialCss = css
    initialHeader = hdr
  }

  return (
    <ThemeEditor
      initial={sections}
      initialCss={initialCss}
      initialHeader={initialHeader}
      initialViewport={initialViewport}
      themeId={initialThemeId}
      themeName={initialThemeName}
    />
  )
}
