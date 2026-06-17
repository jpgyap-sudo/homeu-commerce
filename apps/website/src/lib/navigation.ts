/**
 * Navigation data layer. Menus are stored as JSON in site_settings
 * (nav_main, nav_footer). Falls back to the bundled navigation.json if the
 * DB has no entry yet, so the storefront never renders without a menu.
 */

import { query } from '@/lib/db'
import navJson from '@/data/navigation.json'

export interface NavItem {
  title: string
  href: string
  type?: string
  originalUrl?: string
  children: NavItem[]
}

async function getMenu(key: 'nav_main' | 'nav_footer', fallback: any[]): Promise<NavItem[]> {
  try {
    const res = await query('SELECT value FROM site_settings WHERE key = $1', [key])
    const val = res.rows[0]?.value
    if (Array.isArray(val) && val.length > 0) return normalize(val)
  } catch { /* fall through */ }
  return normalize(fallback)
}

function normalize(items: any[]): NavItem[] {
  return (items || []).map(i => ({
    title: i.title || '',
    href: i.href || '#',
    type: i.type,
    originalUrl: i.originalUrl,
    children: Array.isArray(i.children) ? normalize(i.children) : [],
  }))
}

export async function getMainNav(): Promise<NavItem[]> {
  return getMenu('nav_main', (navJson as any).main || [])
}

export async function getFooterNav(): Promise<NavItem[]> {
  return getMenu('nav_footer', (navJson as any).footer || [])
}
