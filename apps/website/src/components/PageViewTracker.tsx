'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * PageViewTracker — records page views to the analytics API.
 *
 * Drop this into any layout to start tracking page views.
 * Uses a visitor fingerprint stored in localStorage to count unique visitors.
 * Only fires on actual navigation (not on mount remounts in dev).
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    // Don't double-fire on the same path
    if (lastPath.current === pathname) return
    lastPath.current = pathname

    // Simple visitor fingerprint (not PII)
    let visitorId = ''
    try {
      visitorId = localStorage.getItem('_hv') || ''
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).slice(2, 14) + '_' + Date.now().toString(36)
        localStorage.setItem('_hv', visitorId)
      }
    } catch { /* localStorage not available */ }

    // Fire-and-forget — don't block navigation
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        title: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        visitorId: visitorId || undefined,
      }),
      keepalive: true, // ensures the request completes even if the page unloads
    }).catch(() => { /* silently ignore */ })
  }, [pathname])

  return null // renders nothing
}
