'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { QuoteCartBadge } from '@/components/QuoteCart'

/**
 * Fixed bottom navigation bar for mobile.
 * Shows on screens ≤ 768px.
 *
 * 5 tabs: Home, Products, RFQ (with badge), Account, Menu
 * Inspired by IKEA and West Elm mobile patterns.
 */
export default function MobileBottomNav() {
  const pathname = usePathname()

  // Don't show on admin pages
  if (typeof window !== 'undefined' && window.location.hostname.startsWith('admin.')) return null
  if (pathname?.startsWith('/admin')) return null

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path) || false
  }

  const tabs = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l8-7 8 7v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h4v10" />
        </svg>
      ),
    },
    {
      href: '/products',
      label: 'Products',
      icon: (
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="13" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="13" width="6" height="6" rx="1" />
          <rect x="13" y="13" width="6" height="6" rx="1" />
        </svg>
      ),
    },
    {
      href: '/quote-cart',
      label: 'RFQ',
      icon: (
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <path d="M3 6h16" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      ),
      badge: <QuoteCartBadge countOnly />,
    },
    {
      href: '/customer/dashboard',
      label: 'Account',
      icon: (
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="11" cy="7" r="4" />
        </svg>
      ),
    },
    {
      href: '#menu',
      label: 'Menu',
      icon: (
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 5h14" />
          <path d="M4 11h14" />
          <path d="M4 17h14" />
        </svg>
      ),
      onClick: () => {
        window.dispatchEvent(new CustomEvent('toggle-mobile-drawer'))
      },
    },
  ]

  return (
    <nav className="homeu-mobile-bottom-nav" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        const content = (
          <>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              {tab.icon}
              {tab.badge && <span style={{ position: 'absolute', top: -6, right: -8 }}>{tab.badge}</span>}
            </span>
            <span>{tab.label}</span>
          </>
        )

        if (tab.onClick) {
          return (
            <button
              key={tab.href}
              onClick={tab.onClick}
              className={`homeu-mobile-bottom-nav__item ${active ? 'active' : ''}`}
              aria-label={tab.label}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`homeu-mobile-bottom-nav__item ${active ? 'active' : ''}`}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
