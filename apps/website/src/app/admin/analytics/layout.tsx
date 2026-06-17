import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const TABS = [
  { href: '/admin/analytics',           label: 'Overview',        icon: '📊' },
  { href: '/admin/analytics/traffic',   label: 'Traffic',         icon: '👁️' },
  { href: '/admin/analytics/leads',     label: 'Leads & CRM',     icon: '👤' },
  { href: '/admin/analytics/pipeline',  label: 'Sales Pipeline',  icon: '💰' },
  { href: '/admin/analytics/products',  label: 'Products',        icon: '🛋️' },
  { href: '/admin/analytics/reports',   label: 'Reports',         icon: '📋' },
]

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sub-tab navigation */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid #d9e0d7',
        padding: '0 24px', background: '#faf9f6', overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <a
            key={tab.href}
            href={tab.href}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#667168',
              textDecoration: 'none',
              borderBottom: '2px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </a>
        ))}
      </div>
      {children}
    </div>
  )
}
