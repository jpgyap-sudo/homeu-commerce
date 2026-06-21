import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SettingsNav from './SettingsNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>Settings</h1>
      <p style={{ fontSize: 13, color: '#667168', margin: '0 0 20px' }}>
        Manage platform configuration, users, and integrations
      </p>

      <SettingsNav />

      {children}
    </div>
  )
}
