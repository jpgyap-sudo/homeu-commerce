'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import PageViewTracker from '@/components/PageViewTracker'
import type { ReactNode } from 'react'

interface SidebarSection {
  id: string
  label: string
  icon: string
  links: { href: string; icon: string; label: string; badge?: string }[]
}

const SECTIONS: SidebarSection[] = [
  {
    id: 'main', label: 'Main', icon: '⬡',
    links: [
      { href: '/admin/dashboard', icon: '◈', label: 'Dashboard' },
    ],
  },
  {
    id: 'catalog', label: 'Catalog', icon: '⃞',
    links: [
      { href: '/admin/products', icon: '◆', label: 'Products' },
      { href: '/admin/categories', icon: '◇', label: 'Categories' },
      { href: '/admin/collections', icon: '◉', label: 'Collections' },
    ],
  },
  {
    id: 'sales', label: 'Sales', icon: '⎔',
    links: [
      { href: '/admin/apps/central-inbox', icon: '📬', label: 'Central Inbox' },
      { href: '/admin/apps/email-inbox', icon: '📬', label: 'Email Inbox' },
      { href: '/admin/quotations', icon: '◎', label: 'Quotations', badge: '83' },
      { href: '/admin/rfq', icon: '◐', label: 'RFQ Requests' },
      { href: '/admin/customers', icon: '◑', label: 'Customers' },
    ],
  },
  {
    id: 'content', label: 'Content', icon: '⬖',
    links: [
      { href: '/admin/theme', icon: '◭', label: 'Theme' },
      { href: '/admin/blogs', icon: '✎', label: 'Blogs' },
      { href: '/admin/navigation', icon: '☰', label: 'Navigation' },
      { href: '/admin/pages', icon: '◈', label: 'Pages' },
      { href: '/admin/media', icon: '◉', label: 'Media' },
      { href: '/admin/redirects', icon: '◐', label: 'Redirects' },
    ],
  },
  {
    id: 'insights', label: 'Insights', icon: '⏣',
    links: [
      { href: '/admin/analytics', icon: '◆', label: 'Analytics' },
      { href: '/admin/collections/leads', icon: '◇', label: 'Leads' },
      { href: '/admin/collections/appointments', icon: '◎', label: 'Appointments' },
    ],
  },
  {
    id: 'apps', label: 'Apps', icon: '⬡',
    links: [
      { href: '/admin/apps', icon: '🧩', label: 'Category Apps' },
      { href: '/admin/apps/instagram', icon: '📸', label: 'Instagram Feed' },
    ],
  },
  {
    id: 'system', label: 'System', icon: '☗',
    links: [
      { href: '/admin/settings', icon: '⚙', label: 'Settings' },
      { href: '/admin/workflows', icon: '⚡', label: 'Workflows' },
    ],
  },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'

  // Collapsed sections — all expanded by default, auto-collapse inactive
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // User permissions — which tabs to show
  const [userTabs, setUserTabs] = useState<string[]>(['*'])

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => {
      if (d.user?.tabs) setUserTabs(d.user.tabs)
    }).catch(() => {})
  }, [])

  const canSeeSection = (id: string) => userTabs.includes('*') || userTabs.includes(id)

  if (isLogin) {
    return (
      <div className="luxe-admin">
        <PageViewTracker />
        {children}
      </div>
    )
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const toggleSection = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="luxe-admin" style={{ display: 'flex', minHeight: '100vh' }}>
      <PageViewTracker />

      <aside className="luxe-sidebar">
        {/* Brand */}
        <div className="luxe-sidebar-brand">
          <div className="luxe-sidebar-logo">
            <div className="luxe-sidebar-logo-icon">D</div>
            <span className="luxe-sidebar-title">DaVinciOS</span>
          </div>
          <div className="luxe-sidebar-subtitle">Command Center</div>
        </div>

        {/* Navigation with collapsible sections */}
        <nav className="luxe-sidebar-nav">
          {SECTIONS.filter(s => canSeeSection(s.id)).map(section => {
            const isExpanded = !collapsed.has(section.id)
            const hasActive = section.links.some(l => isActive(l.href))

            return (
              <div key={section.id} className="sidebar-section-group">
                {/* Section header — clickable toggle */}
                <button
                  className={`sidebar-section-header ${hasActive ? 'has-active' : ''}`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="sidebar-section-icon">{section.icon}</span>
                  <span className="sidebar-section-label">{section.label}</span>
                  <span
                    className={`sidebar-section-arrow ${isExpanded ? 'expanded' : 'collapsed'}`}
                    style={{
                      marginLeft: 'auto',
                      transition: 'transform 200ms ease',
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      fontSize: 10,
                      opacity: 0.4,
                    }}
                  >
                    ▼
                  </span>
                </button>

                {/* Section links — slide-down animation */}
                <div
                  className={`sidebar-section-links ${isExpanded ? 'expanded' : 'collapsed'}`}
                  style={{ maxHeight: isExpanded ? `${section.links.length * 40 + 20}px` : '0px' }}
                >
                  {section.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`luxe-sidebar-link ${isActive(link.href) ? 'active' : ''}`}
                    >
                      <span className="luxe-sidebar-icon">{link.icon}</span>
                      {link.label}
                      {link.badge && (
                        <span className="luxe-sidebar-badge">{link.badge}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="luxe-sidebar-footer">
          <div className="luxe-sidebar-user">
            <div className="luxe-sidebar-avatar">A</div>
            <div>
              <div className="luxe-sidebar-user-name">Admin</div>
              <div className="luxe-sidebar-user-role">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="luxe-main">
        {children}
      </main>
    </div>
  )
}
