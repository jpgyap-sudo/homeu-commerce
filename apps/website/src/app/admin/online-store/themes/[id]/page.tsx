import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStoreThemeById } from '@/lib/store-themes'
import ThemeSnapshotEditor from './ThemeSnapshotEditor'

export const metadata = { title: 'Edit Store Theme - DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function StoreThemeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const theme = await getStoreThemeById(Number(id))
  if (!theme) redirect('/admin/online-store')

  return <ThemeSnapshotEditor initialTheme={theme} />
}
