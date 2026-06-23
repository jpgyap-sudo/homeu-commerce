'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * PageViewTracker — records page views to the analytics API.
 *
 * Drop this into any layout to start tracking page views.
 * Uses a visitor fingerprint stored in localStorage to count unique visitors.
 * Also tracks lead-specific page views when a lead session is active
 * (leadId stored in localStorage by ChatWidget).
 *
 * Tracks time-on-page by recording when the previous page was first rendered
 * and sending the duration when navigating away.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)
  const pageEnteredAt = useRef<number>(Date.now())
  const currentSessionId = useRef<string | null>(null)

  useEffect(() => {
    // Initialize session ID once per page load (not per navigation)
    if (!currentSessionId.current) {
      try {
        const stored = localStorage.getItem('_hvs')
        currentSessionId.current = stored || ('s_' + Math.random().toString(36).slice(2, 14) + '_' + Date.now().toString(36))
        if (!stored) localStorage.setItem('_hvs', currentSessionId.current)
      } catch {
        currentSessionId.current = crypto.randomUUID?.() || 's_' + Date.now().toString(36)
      }
    }
  }, [])

  useEffect(() => {
    const now = Date.now()

    // Calculate time spent on the PREVIOUS page
    const timeOnPageMs = lastPath.current ? now - pageEnteredAt.current : 0
    const previousPath = lastPath.current

    // Reset timing for the NEW page
    pageEnteredAt.current = now

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

    // Read leadId from localStorage (set by ChatWidget / QuoteCart)
    let leadId: string | null = null
    try {
      leadId = localStorage.getItem('homeu_lead_id')
    } catch { /* ignore */ }

    // Fire-and-forget: general analytics pageview
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        title: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        visitorId: visitorId || undefined,
      }),
      keepalive: true,
    }).catch(() => { /* silently ignore */ })

    // Fire-and-forget: lead-specific page view (only if leadId is known)
    if (leadId) {
      fetch('/api/chat/leads/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          path: pathname,
          title: typeof document !== 'undefined' ? document.title : '',
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          sessionId: currentSessionId.current,
          timeOnPageSec: timeOnPageMs > 0 ? parseFloat((timeOnPageMs / 1000).toFixed(1)) : undefined,
          previousPath,
        }),
        keepalive: true,
      }).catch(() => { /* silently ignore */ })
    }

    // ── Track time-on-page on unload ──────────────────────────
    // This captures the final page's duration when the user leaves
    const handleBeforeUnload = () => {
      const finalTimeOnPage = Date.now() - pageEnteredAt.current
      if (leadId && finalTimeOnPage > 500) {
        navigator.sendBeacon('/api/chat/leads/page-view', JSON.stringify({
          leadId,
          path: pathname,
          title: typeof document !== 'undefined' ? document.title : '',
          sessionId: currentSessionId.current,
          timeOnPageSec: parseFloat((finalTimeOnPage / 1000).toFixed(1)),
        }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname])

  return null // renders nothing
}
