'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/analytics', label: 'Overview', icon: '📊' },
  { href: '/admin/analytics/traffic', label: 'Traffic', icon: '👁️' },
  { href: '/admin/analytics/leads', label: 'Leads & CRM', icon: '👤' },
  { href: '/admin/analytics/pipeline', label: 'Sales Pipeline', icon: '💰' },
  { href: '/admin/analytics/products', label: 'Products', icon: '🛋️' },
  { href: '/admin/analytics/reports', label: 'Reports', icon: '📋' },
]

export default function AnalyticsTabs() {
  const pathname = usePathname()
  return <nav aria-label="Analytics sections" style={{ display: 'flex', borderBottom: '1px solid #d9e0d7', padding: '0 24px', background: '#faf9f6', overflowX: 'auto' }}>
    {TABS.map(tab => {
      const active = pathname === tab.href
      return <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: active ? '#1a6d3e' : '#667168', textDecoration: 'none', borderBottom: `2px solid ${active ? '#1a6d3e' : 'transparent'}`, whiteSpace: 'nowrap' }}>{tab.icon} {tab.label}</Link>
    })}
  </nav>
}
