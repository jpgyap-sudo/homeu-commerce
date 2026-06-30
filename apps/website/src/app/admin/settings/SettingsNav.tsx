'use client'

import { usePathname } from 'next/navigation'

const SETTINGS_TABS = [
  { href: '/admin/settings/users',         label: 'Users & Roles',   icon: '👥' },
  { href: '/admin/settings/store',         label: 'Store Profile',   icon: '🏪' },
  { href: '/admin/settings/social',        label: 'Social Channels', icon: '🌐' },
  { href: '/admin/settings/email',         label: 'Email / SMTP',   icon: '📧' },
  { href: '/admin/settings/ai',            label: 'AI / Chatbot',    icon: '🤖' },
  { href: '/admin/settings/automation',    label: 'CRM Automation',   icon: '⚙️' },
  { href: '/admin/settings/notifications', label: 'Notifications',   icon: '🔔' },
  { href: '/admin/settings/cdn',           label: 'CDN / Storage',   icon: '☁️' },
  { href: '/admin/settings/urls',          label: 'Site URLs',       icon: '🔗' },
  { href: '/admin/settings/system',        label: 'System Health',   icon: '🖥️' },
]

export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #d9e0d7', flexWrap: 'wrap' }}>
      {SETTINGS_TABS.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <a
            key={tab.href}
            href={tab.href}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? '#151a17' : '#667168',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid #151a17' : '2px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </a>
        )
      })}
    </div>
  )
}
