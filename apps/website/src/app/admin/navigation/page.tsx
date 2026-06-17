import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMainNav, getFooterNav } from '@/lib/navigation'
import NavEditor from './NavEditor'

export const metadata = { title: 'Navigation — DaVinciOS' }
export const dynamic = 'force-dynamic'

export default async function NavigationPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const [main, footer] = await Promise.all([getMainNav(), getFooterNav()])
  return <NavEditor main={main} footer={footer} />
}
