'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import navigation from '@/data/navigation.json'

interface NavItem {
  title: string
  href: string
}

const CATEGORY_ICONS: Record<string, string> = {
  'Quick Delivery': '🚚',
  'Lighting': '💡',
  'Stone': '🪨',
  'Decor': '🏺',
  'Ceiling Fan': '🌀',
  'Wall Panel': '🧱',
  'Rugs': '🟫',
  'Lighting | Ceiling Fan': '💡',
  'Furniture': '🛋️',
  'Bedroom': '🛏️',
  'Kitchen': '🍳',
  'Bathroom': '🚿',
  'Outdoor': '🌿',
  'Office': '💼',
}

export default function MobileHomepageEnhancer() {
  const [isMobile, setIsMobile] = useState(true) // assume mobile initially to avoid flash
  const [isHome, setIsHome] = useState(false)
  const [recentViews, setRecentViews] = useState<Array<{title: string; url: string; image?: string}>>([])

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768)
    setIsHome(window.location.pathname === '/')

    // Load recently viewed
    try {
      const stored = localStorage.getItem('homeu-recent-products')
      if (stored) setRecentViews(JSON.parse(stored).slice(0, 6))
    } catch { /* noop */ }

    // Handle resize
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!isMobile || !isHome) return null

  // Save current product page to recently viewed when on product page
  useEffect(() => {
    const path = window.location.pathname
    if (!path.startsWith('/products/')) return

    const titleEl = document.querySelector('.product-detail__title')
    const title = titleEl?.textContent?.trim() || path.split('/').pop() || 'Product'

    try {
      const stored = JSON.parse(localStorage.getItem('homeu-recent-products') || '[]')
      const filtered = stored.filter((p: any) => p.url !== path)
      filtered.unshift({ title, url: path })
      localStorage.setItem('homeu-recent-products', JSON.stringify(filtered.slice(0, 20)))
    } catch { /* noop */ }
  }, [])

  if (!isMobile) return null

  const navItems: NavItem[] = (navigation as any).main || []
  // Flatten top-level nav items + their children into category chips
  const chips: Array<{ title: string; href: string; icon?: string }> = []

  // Add top-level collections
  for (const item of navItems) {
    if (item.href && item.href !== '/') {
      chips.push({
        title: item.title,
        href: item.href,
        icon: CATEGORY_ICONS[item.title],
      })
    }
    // Add children as well (Quick Delivery subcategories)
    if ((item as any).children) {
      for (const child of (item as any).children) {
        chips.push({
          title: child.title,
          href: child.href,
          icon: CATEGORY_ICONS[child.title],
        })
      }
    }
  }

  return (
    <>
      {/* Welcome section */}
      <div className="homeu-mobile-welcome">
        <h1>Modern Interior</h1>
        <p>Contemporary furniture & bespoke designs for your space</p>
      </div>

      {/* Quick action bar */}
      <div className="homeu-mobile-quick-actions">
        <Link href="/products?sort=newest" className="homeu-mobile-quick-action">
          <span className="homeu-mobile-quick-action__icon">✨</span>
          <span className="homeu-mobile-quick-action__label">New Arrivals</span>
        </Link>
        <Link href="/products?sort=price-asc" className="homeu-mobile-quick-action">
          <span className="homeu-mobile-quick-action__icon">🤑</span>
          <span className="homeu-mobile-quick-action__label">Under ₱10K</span>
        </Link>
        <Link href="/products?category=fast-delivery" className="homeu-mobile-quick-action">
          <span className="homeu-mobile-quick-action__icon">⚡</span>
          <span className="homeu-mobile-quick-action__label">Quick Ship</span>
        </Link>
        <a href="tel:+63281234567" className="homeu-mobile-quick-action">
          <span className="homeu-mobile-quick-action__icon">📞</span>
          <span className="homeu-mobile-quick-action__label">Call Us</span>
        </a>
      </div>

      {/* Category chips — horizontal scroll */}
      <div className="homeu-category-chips">
        {chips.slice(0, 15).map((chip, i) => (
          <Link key={i} href={chip.href} className="homeu-category-chip">
            {chip.icon && <span>{chip.icon}</span>}
            {chip.title}
          </Link>
        ))}
      </div>

      {/* Recently viewed */}
      {recentViews.length > 0 && (
        <div className="homeu-recently-viewed">
          <div className="homeu-recently-viewed__title">Recently Viewed</div>
          <div className="homeu-recently-viewed__list">
            {recentViews.map((item, i) => (
              <Link key={i} href={item.url} className="homeu-recently-viewed__item">
                <div className="homeu-recently-viewed__thumb">
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="homeu-recently-viewed__name">{item.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
