import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { getCustomCss, getHeaderSettings } from '@/lib/theme'
import ThemeEditor from '../ThemeEditor'

export const metadata = { title: 'Homepage Theme — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function HomepageThemePage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  let sections: any[] = []
  let initialCss = ''
  let initialHeader: any = {}

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

  return (
    <ThemeEditor
      initial={sections}
      initialCss={initialCss}
      initialHeader={initialHeader}
      initialViewport="desktop"
      themeId={null}
      themeName=""
    />
  )
}
