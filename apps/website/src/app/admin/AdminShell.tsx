'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import PageViewTracker from '@/components/PageViewTracker'
import type { ReactNode } from 'react'

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Login page gets a full-screen layout without sidebar
  const isLogin = pathname === '/admin/login'

  if (isLogin) {
    return (
      <div className="luxe-admin">
        <PageViewTracker />
        {children}
      </div>
    )
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <div className="luxe-admin" style={{ display: 'flex', minHeight: '100vh' }}>
      <PageViewTracker />

      {/* ── Luxury Sidebar ── */}
      <aside className="luxe-sidebar">
        {/* Brand */}
        <div className="luxe-sidebar-brand">
          <div className="luxe-sidebar-logo">
            <div className="luxe-sidebar-logo-icon">D</div>
            <span className="luxe-sidebar-title">DaVinciOS</span>
          </div>
          <div className="luxe-sidebar-subtitle">Command Center</div>
        </div>

        {/* Navigation */}
        <nav className="luxe-sidebar-nav">
          <div className="luxe-sidebar-section">Main</div>
          <Link href="/admin/dashboard" className={`luxe-sidebar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◈</span>
            Dashboard
          </Link>

          <div className="luxe-sidebar-section">Catalog</div>
          <Link href="/admin/products" className={`luxe-sidebar-link ${isActive('/admin/products') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◆</span>
            Products
          </Link>
          <Link href="/admin/categories" className={`luxe-sidebar-link ${isActive('/admin/categories') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◇</span>
            Categories
          </Link>
          <Link href="/admin/collections" className={`luxe-sidebar-link ${isActive('/admin/collections') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◉</span>
            Collections
          </Link>

          <div className="luxe-sidebar-section">Sales</div>
          <Link href="/admin/quotations" className={`luxe-sidebar-link ${isActive('/admin/quotations') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◎</span>
            Quotations
            <span className="luxe-sidebar-badge">83</span>
          </Link>
          <Link href="/admin/rfq" className={`luxe-sidebar-link ${isActive('/admin/rfq') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◐</span>
            RFQ Requests
          </Link>
          <Link href="/admin/customers" className={`luxe-sidebar-link ${isActive('/admin/customers') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◑</span>
            Customers
          </Link>

          <div className="luxe-sidebar-section">Content</div>
          <Link href="/admin/theme" className={`luxe-sidebar-link ${isActive('/admin/theme') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◭</span>
            Theme
          </Link>
          <Link href="/admin/blogs" className={`luxe-sidebar-link ${isActive('/admin/blogs') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">✎</span>
            Blogs
          </Link>
          <Link href="/admin/navigation" className={`luxe-sidebar-link ${isActive('/admin/navigation') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">☰</span>
            Navigation
          </Link>
          <Link href="/admin/pages" className={`luxe-sidebar-link ${isActive('/admin/pages') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◈</span>
            Pages
          </Link>
          <Link href="/admin/media" className={`luxe-sidebar-link ${isActive('/admin/media') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◉</span>
            Media
          </Link>
          <Link href="/admin/redirects" className={`luxe-sidebar-link ${isActive('/admin/redirects') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◐</span>
            Redirects
          </Link>

          <div className="luxe-sidebar-section">Insights</div>
          <Link href="/admin/analytics" className={`luxe-sidebar-link ${isActive('/admin/analytics') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◆</span>
            Analytics
          </Link>
          <Link href="/admin/collections/leads" className={`luxe-sidebar-link ${isActive('/admin/collections/leads') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◇</span>
            Leads
          </Link>
          <Link href="/admin/collections/appointments" className={`luxe-sidebar-link ${isActive('/admin/collections/appointments') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">◎</span>
            Appointments
          </Link>

          <div className="luxe-sidebar-section">System</div>
          <Link href="/admin/settings" className={`luxe-sidebar-link ${isActive('/admin/settings') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">⚙</span>
            Settings
          </Link>
          <Link href="/admin/workflows" className={`luxe-sidebar-link ${isActive('/admin/workflows') ? 'active' : ''}`}>
            <span className="luxe-sidebar-icon">⚡</span>
            Workflows
          </Link>
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

      {/* ── Main Content ── */}
      <main className="luxe-main">
        {children}
      </main>
    </div>
  )
}
