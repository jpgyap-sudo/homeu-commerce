import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { getCustomCss, getHeaderSettings } from '@/lib/theme'
import ThemeEditor from './ThemeEditor'

export const metadata = { title: 'Theme — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function ThemePage({
  searchParams,
}: {
  searchParams: Promise<{ viewport?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  const sp = await searchParams
  const initialViewport = sp.viewport === 'mobile' || sp.viewport === 'tablet' ? sp.viewport : 'desktop'

  let sections: any[] = []
  try {
    const res = await query(
      `SELECT id, type, position, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC`,
      []
    )
    sections = res.rows
  } catch { sections = [] }

  const [customCss, header] = await Promise.all([getCustomCss(), getHeaderSettings()])

  return <ThemeEditor initial={sections} initialCss={customCss} initialHeader={header} initialViewport={initialViewport} />
}
