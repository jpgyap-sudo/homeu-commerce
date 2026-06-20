import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const SETTINGS_TABS = [
  { href: '/admin/settings/users',         label: 'Users & Roles',   icon: '👥' },
  { href: '/admin/settings/store',         label: 'Store Profile',   icon: '🏪' },
  { href: '/admin/settings/email',         label: 'Email / SMTP',   icon: '📧' },
  { href: '/admin/settings/notifications', label: 'Notifications',   icon: '🔔' },
  { href: '/admin/settings/system',        label: 'System Health',   icon: '🖥️' },
]

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>Settings</h1>
      <p style={{ fontSize: 13, color: '#667168', margin: '0 0 20px' }}>
        Manage platform configuration, users, and integrations
      </p>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #d9e0d7' }}>
        {SETTINGS_TABS.map(tab => {
          const isActive = false // server component, can't detect pathname easily — rely on children
          return (
            <a
              key={tab.href}
              href={tab.href}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#667168',
                textDecoration: 'none',
                borderBottom: '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={undefined}
            >
              {tab.icon} {tab.label}
            </a>
          )
        })}
      </div>

      {children}
    </div>
  )
}
