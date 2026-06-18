import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { getCustomCss } from '@/lib/theme'
import ThemeEditor from './ThemeEditor'

export const metadata = { title: 'Theme — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function ThemePage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  let sections: any[] = []
  try {
    const res = await query(
      `SELECT id, type, position, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC`,
      []
    )
    sections = res.rows
  } catch { sections = [] }

  const customCss = await getCustomCss()

  return <ThemeEditor initial={sections} initialCss={customCss} />
}
