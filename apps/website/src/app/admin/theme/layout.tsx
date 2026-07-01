'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'

interface ThemeTab {
  href: string
  label: string
  shortLabel: string
  description: string
}

const THEME_TABS: ThemeTab[] = [
  { href: '/admin/theme/homepage', label: 'Homepage', shortLabel: 'Home', description: 'Homepage sections, header, footer, and promo bar' },
  { href: '/admin/theme/product', label: 'Product', shortLabel: 'Product', description: 'Product details, gallery, buying actions, and collection grid' },
  { href: '/admin/theme/account', label: 'Account', shortLabel: 'Account', description: 'Customer dashboard, orders, RFQs, and account portal' },
  { href: '/admin/theme/mobile', label: 'Mobile', shortLabel: 'Mobile', description: 'Mobile navigation, bottom tabs, search, and small-screen layout' },
  { href: '/admin/theme/global', label: 'Global', shortLabel: 'Global', description: 'Brand colors, typography, buttons, spacing, and custom CSS' },
  { href: '/admin/theme/quotation', label: 'Quotation', shortLabel: 'Quote', description: 'Quotation document layout, header, terms, and watermark' },
]

export default function ThemeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [activeInfo, setActiveInfo] = useState<ThemeTab | null>(null)

  const activeTab = THEME_TABS.find(tab => pathname === tab.href || pathname.startsWith(tab.href + '/'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f6f4ef' }}>
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #d9e0d7',
        padding: '14px 24px 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, minWidth: 0 }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: '#17211b',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            fontSize: 13,
            flex: '0 0 auto',
          }}>
            TB
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800, color: '#17211b' }}>
              No-Code Theme Builder
            </h1>
            <div style={{ color: '#647067', fontSize: 12, marginTop: 2 }}>
              {activeTab ? activeTab.description : 'Choose a theme area to edit with live previews'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'thin' }}>
          {THEME_TABS.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => router.push(tab.href)}
                onMouseEnter={() => setActiveInfo(tab)}
                onMouseLeave={() => setActiveInfo(null)}
                title={tab.description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 96,
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #17211b' : '3px solid transparent',
                  background: isActive ? '#f6f4ef' : 'transparent',
                  color: isActive ? '#17211b' : '#536057',
                  fontWeight: isActive ? 800 : 650,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeInfo && activeInfo.href !== activeTab?.href && (
          <div style={{ fontSize: 11, color: '#647067', padding: '4px 0 8px' }}>
            {activeInfo.shortLabel}: {activeInfo.description}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {children}
      </div>
    </div>
  )
}
