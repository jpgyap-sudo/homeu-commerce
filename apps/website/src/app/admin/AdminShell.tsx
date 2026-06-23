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
    id: 'messages', label: 'Messages', icon: '⎕',
    links: [
      { href: '/admin/apps/central-inbox', icon: '📬', label: 'Central Inbox' },
      { href: '/admin/apps/email-inbox', icon: '📧', label: 'Email Inbox' },
    ],
  },
  {
    id: 'sales', label: 'Sales', icon: '⎔',
    links: [
      { href: '/admin/quotations', icon: '◎', label: 'Quotations' },
      { href: '/admin/rfq', icon: '◐', label: 'RFQ Requests' },
      { href: '/admin/collections/appointments', icon: '📅', label: 'Appointments' },
      { href: '/admin/customers', icon: '◑', label: 'Customers' },
      { href: '/admin/designer-club', icon: '🎨', label: 'Designer Club' },
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
      { href: '/admin/reviews', icon: '⭐', label: 'Reviews' },
    ],
  },
  {
    id: 'insights', label: 'Insights', icon: '⏣',
    links: [
      { href: '/admin/analytics', icon: '◆', label: 'Analytics' },
      { href: '/admin/collections/leads', icon: '◇', label: 'Leads' },
    ],
  },
  {
    id: 'apps', label: 'Apps', icon: '⬡',
    links: [
      { href: '/admin/apps', icon: '🧩', label: 'App Settings' },
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
  const isFullBleed = pathname === '/admin/theme' || pathname.startsWith('/admin/theme/')

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [userTabs, setUserTabs] = useState<string[]>(['*'])

  useEffect(() => {
    if (isLogin) return
    fetch('/api/admin/me').then(r => r.json()).then(d => {
      const tabs = d.user?.tabs
      if (Array.isArray(tabs) && tabs.length > 0) setUserTabs(tabs)
    }).catch(() => {})
  }, [isLogin])

  const canSeeSection = (id: string) => userTabs.includes('*') || userTabs.includes(id)

  const [editingSidebar, setEditingSidebar] = useState(false)
  const [sidebarOrder, setSidebarOrder] = useState(SECTIONS.map(s => s.id))

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-order')
    if (saved) {
      try {
        const known = new Set(SECTIONS.map(s => s.id))
        const ids = (JSON.parse(saved) as string[]).filter(id => known.has(id))
        for (const s of SECTIONS) if (!ids.includes(s.id)) ids.push(s.id)
        setSidebarOrder(ids)
      } catch {}
    }
  }, [])

  const orderedSections: SidebarSection[] = (() => {
    const out = sidebarOrder
      .map(id => SECTIONS.find(s => s.id === id))
      .filter((s): s is SidebarSection => !!s)
    for (const s of SECTIONS) if (!out.includes(s)) out.push(s)
    return out
  })()

  const moveSection = (id: string, dir: 'up' | 'down') => {
    setSidebarOrder(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = [...prev]
      if (dir === 'up' && idx > 0) [next[idx-1], next[idx]] = [next[idx], next[idx-1]]
      if (dir === 'down' && idx < next.length - 1) [next[idx+1], next[idx]] = [next[idx], next[idx+1]]
      localStorage.setItem('admin-sidebar-order', JSON.stringify(next))
      return next
    })
  }

  if (isLogin) {
    return (
      <div className="luxe-admin">
        <PageViewTracker />
        {children}
      </div>
    )
  }

  if (isFullBleed) {
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
        <div className="luxe-sidebar-brand">
          <div className="luxe-sidebar-logo">
            <div className="luxe-sidebar-logo-icon">D</div>
            <span className="luxe-sidebar-title">DaVinciOS</span>
          </div>
          <div className="luxe-sidebar-subtitle">Command Center</div>
        </div>

        <nav className="luxe-sidebar-nav">
          {orderedSections.filter(s => canSeeSection(s.id)).map(section => {
            const isExpanded = !collapsed.has(section.id)
            const hasActive = section.links.some(l => isActive(l.href))

            return (
              <div key={section.id} className="sidebar-section-group">
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

        <div style={{ padding: 'var(--space-2) var(--space-3)' }}>
          <button
            onClick={() => setEditingSidebar(true)}
            style={{
              width: '100%', padding: '6px 10px', border: '1px dashed var(--luxe-blue-200)',
              background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: 11, color: 'var(--luxe-slate-400)', display: 'flex', alignItems: 'center',
              gap: 6, transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--luxe-blue-500)'; e.currentTarget.style.color = 'var(--luxe-blue-600)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--luxe-blue-200)'; e.currentTarget.style.color = 'var(--luxe-slate-400)' }}
          >
            ✏️ Edit Sidebar
          </button>
        </div>

        <div className="luxe-sidebar-footer">
          <div className="luxe-sidebar-user">
            <div className="luxe-sidebar-avatar">A</div>
            <div>
              <div className="luxe-sidebar-user-name">Admin</div>
              <div className="luxe-sidebar-user-role">Administrator</div>
            </div>
          </div>
          <a
            href="/api/admin/logout"
            className="luxe-sidebar-logout"
            title="Log out"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: '#999', textDecoration: 'none',
              padding: '4px 8px', borderRadius: 6, marginTop: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={undefined}
          >
            Log out
          </a>
        </div>
      </aside>

      <main className="luxe-main">
        {children}
      </main>

      {editingSidebar && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setEditingSidebar(false)}>
          <div className="luxe-card" style={{ width: 440, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">✏️ Reorder Sidebar</h2>
              <button onClick={() => setEditingSidebar(false)} className="luxe-btn luxe-btn-ghost luxe-btn-sm">Done</button>
            </div>
            <div className="luxe-card-body">
              <p style={{ fontSize: 12, color: 'var(--luxe-slate-400)', margin: '0 0 var(--space-4)' }}>
                Drag or use arrows to rearrange sections. Hidden sections (no permission) are not shown.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {sidebarOrder.map((id, i) => {
                  const section = SECTIONS.find(s => s.id === id)
                  if (!section || !canSeeSection(id)) return null
                  const isFirst = i === 0
                  const isLast = i === sidebarOrder.length - 1
                  return (
                    <div key={id} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                      background:'var(--luxe-warm-50)', borderRadius:'var(--radius-sm)',
                      border:'1px solid var(--luxe-warm-200)',
                    }}>
                      <span style={{ fontSize: 18 }}>{section.icon}</span>
                      <span style={{ flex:1, fontSize: 13, fontWeight: 500 }}>{section.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--luxe-slate-400)' }}>{section.links.length} links</span>
                      <div style={{ display:'flex', gap:2 }}>
                        <button onClick={() => moveSection(id, 'up')} disabled={isFirst}
                          className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 6px', fontSize: 14, opacity: isFirst ? 0.3 : 1 }}>
                          ▲
                        </button>
                        <button onClick={() => moveSection(id, 'down')} disabled={isLast}
                          className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 6px', fontSize: 14, opacity: isLast ? 0.3 : 1 }}>
                          ▼
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => { setSidebarOrder(SECTIONS.map(s => s.id)); localStorage.setItem('admin-sidebar-order', JSON.stringify(SECTIONS.map(s => s.id))) }}
                className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ marginTop:'var(--space-4)' }}>
                🔄 Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
