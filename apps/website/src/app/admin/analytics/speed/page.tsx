export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SpeedAnalyticsClient from './SpeedAnalyticsClient'

export default async function SpeedAnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return <SpeedAnalyticsClient />
}
