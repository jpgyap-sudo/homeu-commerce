import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listStoreThemes } from '@/lib/store-themes'
import OnlineStoreClient from './OnlineStoreClient'

export const metadata = { title: 'Online Store - DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function OnlineStorePage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const themes = await listStoreThemes().catch(() => [])
  return <OnlineStoreClient initialThemes={themes} />
}
