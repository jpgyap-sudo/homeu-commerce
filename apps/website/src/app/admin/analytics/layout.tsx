import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AnalyticsTabs from './AnalyticsTabs'

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <AnalyticsTabs />
      {children}
    </div>
  )
}
