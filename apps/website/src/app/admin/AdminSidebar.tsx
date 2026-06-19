'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// ── Nav Structure: groups with collapsible sub-items ──────────────────────────

interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavGroup {
  id: string
  label: string
  icon: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📊',
    items: [
      { href: '/admin/dashboard',  label: 'Dashboard',  icon: '🏠' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    items: [
      { href: '/admin/analytics',           label: 'Overview',        icon: '📊' },
      { href: '/admin/analytics/traffic',   label: 'Traffic',         icon: '👁' },
      { href: '/admin/analytics/leads',     label: 'Leads & CRM',     icon: '👤' },
      { href: '/admin/analytics/pipeline',  label: 'Sales Pipeline',  icon: '💰' },
      { href: '/admin/analytics/products',  label: 'Products',        icon: '🛋' },
      { href: '/admin/analytics/reports',   label: 'Reports',         icon: '📋' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: '📦',
    items: [
      { href: '/admin/products',   label: 'Products',   icon: '🛋' },
      { href: '/admin/categories', label: 'Categories', icon: '📂' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: '💰',
    items: [
      { href: '/admin/rfq',        label: 'RFQ Requests',  icon: '📋' },
      { href: '/admin/quotations', label: 'Quotations',    icon: '📄' },
      { href: '/admin/customers',  label: 'Customers',     icon: '🏢' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: '👥',
    items: [
      { href: '/admin/collections/leads',         label: 'Leads',         icon: '👤' },
      { href: '/admin/collections/appointments',   label: 'Appointments',  icon: '📅' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📝',
    items: [
      { href: '/admin/pages',      label: 'Pages',      icon: '📄' },
      { href: '/admin/media',      label: 'Media',      icon: '🖼' },
      { href: '/admin/redirects',  label: 'Redirects',  icon: '🔀' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: '⚙',
    items: [
      { href: '/admin/workflows',  label: 'Workflows',  icon: '⚡' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '🔧',
    items: [
      { href: '/admin/settings/users',         label: 'Users & Roles',   icon: '👥' },
      { href: '/admin/settings/store',         label: 'Store Profile',   icon: '🏪' },
      { href: '/admin/settings/notifications', label: 'Notifications',   icon: '🔔' },
      { href: '/admin/settings/system',        label: 'System Health',   icon: '🖥' },
    ],
  },
]

// ── localStorage persistence key ──────────────────────────────────────────────

const COLLAPSED_KEY = 'admin_sidebar_collapsed'

function loadCollapsed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

interface AdminSidebarProps {
  /** Set of tab ids the user has permission to see. ['*'] = all. */
  userTabs?: string[]
}

export default function AdminSidebar({ userTabs = ['*'] }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed())

  const canSee = (href: string): boolean => {
    if (userTabs.includes('*')) return true
    // Check if this route's section is in the user's allowed tabs
    for (const group of NAV_GROUPS) {
      const item = group.items.find(i => i.href === href || href.startsWith(i.href + '/'))
      if (item && userTabs.includes(group.id)) return true
    }
    return userTabs.some(tab => href.startsWith(tab))
  }

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]))
    } catch { /* ignore */ }
  }, [collapsed])

  function toggle(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Determine which group contains the active page
  function isGroupActive(group: NavGroup): boolean {
    return group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  }

  function isItemActive(href: string): boolean {
    if (pathname === href) return true
    if (pathname.startsWith(href + '/')) return true
    if (href === '/admin/dashboard' && pathname === '/admin/dashboard') return true
    return false
  }

  // Filter groups to only those the user can see
  const visibleGroups = NAV_GROUPS.filter(group => {
    if (userTabs.includes('*')) return true
    return group.items.some(item => canSee(item.href))
  })

  return (
    <aside className="admin-sidebar">
      {/* ── Branding ──────────────────────────────────────────── */}
      <div className="admin-sidebar-brand">
        <div className="admin-sidebar-logo">🏠 HomeU</div>
        <div className="admin-sidebar-subtitle">Operations Console</div>
      </div>

      {/* ── Navigation Groups ─────────────────────────────────── */}
      <nav className="admin-sidebar-nav">
        {visibleGroups.map(group => {
          const active = isGroupActive(group)
          const isCollapsed = collapsed.has(group.id)

          return (
            <div key={group.id} className={`admin-nav-group ${active ? 'admin-nav-group--active' : ''}`}>
              {/* Group header — collapsible */}
              <button
                className="admin-nav-group-header"
                onClick={() => toggle(group.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="admin-nav-group-icon">{group.icon}</span>
                <span className="admin-nav-group-label">{group.label}</span>
                <span
                  className="admin-nav-group-chevron"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }}
                >
                  ▼
                </span>
              </button>

              {/* Group items */}
              <div
                className={`admin-nav-group-items ${isCollapsed ? 'admin-nav-group-items--collapsed' : ''}`}
              >
                {group.items.filter(item => canSee(item.href)).map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-item ${isItemActive(item.href) ? 'admin-nav-item--active' : ''}`}
                  >
                    <span className="admin-nav-item-icon">{item.icon}</span>
                    <span className="admin-nav-item-label">{item.label}</span>
                    {isItemActive(item.href) && <span className="admin-nav-item-dot" />}
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="admin-sidebar-footer">
        DaVinciOS v1.0
      </div>
    </aside>
  )
}
