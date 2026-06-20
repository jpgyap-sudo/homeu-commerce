'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import navigation from '@/data/navigation.json'

interface NavItem {
  title: string
  href: string
  children?: NavItem[]
}

const QUICK_ACTIONS = [
  { icon: '📞', label: 'Call Designer', href: 'tel:+63281234567', external: true },
  { icon: '💬', label: 'Chat with Us', href: '#chat', onClick: true },
  { icon: '📍', label: 'Visit Showroom', href: '/pages/contact' },
  { icon: '⭐', label: 'Best Sellers', href: '/products?sort=best-selling' },
]

export default function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [recentViews, setRecentViews] = useState<Array<{title: string; url: string}>>([])

  // Load recently viewed products from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('homeu-recent-products')
      if (stored) setRecentViews(JSON.parse(stored).slice(0, 5))
    } catch { /* noop */ }
  }, [])

  // Listen for custom event from bottom nav Menu button
  useEffect(() => {
    const handler = () => setOpen(prev => !prev)
    window.addEventListener('toggle-mobile-drawer', handler)
    return () => window.removeEventListener('toggle-mobile-drawer', handler)
  }, [])

  // Close on escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const navItems: NavItem[] = (navigation as any).main || []

  const toggleExpand = (title: string) => {
    setExpanded(expanded === title ? null : title)
  }

  const handleOverlayClick = () => setOpen(false)

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1999,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 2000,
          width: 'min(85vw, 340px)',
          background: '#fff',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid #eef1ed',
        }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#151a17' }}>Menu</span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: '#f5f5f5',
              border: 'none',
              width: 36,
              height: 36,
              borderRadius: '50%',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#667168',
            }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Quick actions row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            padding: '16px 20px',
            borderBottom: '8px solid #f7f9f6',
          }}>
            {QUICK_ACTIONS.map((action, i) => (
              action.onClick ? (
                <button
                  key={i}
                  onClick={() => {
                    setOpen(false)
                    setTimeout(() => {
                      const chatBtn = document.querySelector('.homeu-chat-widget__button') as HTMLElement
                      chatBtn?.click()
                    }, 300)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: '#f7f9f6',
                    borderRadius: 10,
                    border: '1px solid #eef1ed',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#151a17',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{action.icon}</span>
                  {action.label}
                </button>
              ) : (
                <Link
                  key={i}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: '#f7f9f6',
                    borderRadius: 10,
                    border: '1px solid #eef1ed',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#151a17',
                    textDecoration: 'none',
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{action.icon}</span>
                  {action.label}
                </Link>
              )
            ))}
          </div>

          {/* Navigation tree */}
          <div style={{ padding: '8px 0' }}>
            {navItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expanded === item.title

              return (
                <div key={item.title}>
                  <div
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpand(item.title)
                      } else {
                        setOpen(false)
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      cursor: 'pointer',
                      color: '#151a17',
                      minHeight: 48,
                    }}
                  >
                    {hasChildren ? (
                      <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{item.title}</span>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: '#151a17',
                          textDecoration: 'none',
                          flex: 1,
                        }}
                      >
                        {item.title}
                      </Link>
                    )}
                    {hasChildren && (
                      <span style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: '#9aa69c',
                        fontSize: 12,
                      }}>
                        ▼
                      </span>
                    )}
                  </div>

                  {/* Children */}
                  {hasChildren && isExpanded && (
                    <div style={{ background: '#fafbfa', padding: '4px 0' }}>
                      {item.children!.map((child) => (
                        <Link
                          key={child.title}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '11px 20px 11px 36px',
                            fontSize: 13,
                            color: '#3a4339',
                            textDecoration: 'none',
                            minHeight: 44,
                          }}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Recently viewed */}
          {recentViews.length > 0 && (
            <div style={{
              borderTop: '8px solid #f7f9f6',
              padding: '16px 20px',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#667168', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recently Viewed
              </div>
              {recentViews.map((item, i) => (
                <Link
                  key={i}
                  href={item.url}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'block',
                    padding: '8px 0',
                    fontSize: 13,
                    color: '#3a4339',
                    textDecoration: 'none',
                    borderBottom: i < recentViews.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          )}

          {/* Bottom spacer for safe area */}
          <div style={{ height: 'calc(60px + env(safe-area-inset-bottom, 0px))' }} />
        </div>
      </div>
    </>
  )
}
