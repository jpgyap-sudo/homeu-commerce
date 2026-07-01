'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'

interface ThemeTab {
  href: string
  label: string
  icon: string
  description: string
}

const THEME_TABS: ThemeTab[] = [
  { href: '/admin/theme/homepage', label: 'Homepage', icon: '🏠', description: 'Homepage sections, header, footer, promo bar' },
  { href: '/admin/theme/product', label: 'Product', icon: '📦', description: 'Product details, gallery, collection grid' },
  { href: '/admin/theme/account', label: 'Account', icon: '👤', description: 'Customer dashboard, login, account portal' },
  { href: '/admin/theme/mobile', label: 'Mobile', icon: '📱', description: 'Mobile nav, bottom bar, mobile sections' },
  { href: '/admin/theme/global', label: 'Global', icon: '🎨', description: 'Palette, typography, buttons, layout, custom CSS' },
  { href: '/admin/theme/quotation', label: 'Quotation', icon: '📄', description: 'Quotation PDF template, brand colors, header/footer layout' },
]

export default function ThemeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [activeInfo, setActiveInfo] = useState<ThemeTab | null>(null)

  const activeTab = THEME_TABS.find(t => pathname === t.href || pathname.startsWith(t.href + '/'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Theme Top Bar ─────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #d9e0d7',
        padding: 'var(--space-3) var(--space-6) 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 18 }}>◭</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>
            Theme Builder
          </h1>
          {activeTab && (
            <span style={{ fontSize: 12, color: 'var(--luxe-slate-400)', fontWeight: 500 }}>
              / {activeTab.icon} {activeTab.label}
            </span>
          )}
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 0, overflow: 'auto' }}>
          {THEME_TABS.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                onMouseEnter={() => setActiveInfo(tab)}
                onMouseLeave={() => setActiveInfo(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--luxe-sapphire)' : '2px solid transparent',
                  background: isActive ? 'var(--luxe-warm-50)' : 'transparent',
                  color: isActive ? 'var(--luxe-sapphire)' : 'var(--luxe-slate-500)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: -1,
                }}
              >
                <span style={{ fontSize: 15 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Quick info tooltip */}
        {activeInfo && (
          <div style={{
            fontSize: 11,
            color: 'var(--luxe-slate-400)',
            padding: '4px 0 8px',
            borderTop: 'none',
          }}>
            {activeInfo.icon} {activeInfo.description}
          </div>
        )}
      </div>

      {/* ── Content Area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-6)' }}>
        {children}
      </div>
    </div>
  )
}
