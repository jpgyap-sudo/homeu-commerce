'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * WebVitalsTracker
 *
 * Captures real-user performance metrics (Core Web Vitals + load time)
 * and sends them to the server for aggregation.
 *
 * Place this once in the root layout.
 *
 * Benchmarks (Google):
 *   LCP: Good < 2500ms, Poor > 4000ms
 *   FCP: Good < 1800ms, Poor > 3000ms
 *   TTFB: Good < 800ms, Poor > 1800ms
 *   CLS: Good < 0.1, Poor > 0.25
 *   Load: Good < 3000ms, Poor > 6000ms
 *
 * Industry averages (2026 e-commerce):
 *   Avg load: 4.2s (desktop), 6.8s (mobile)
 *   Top 10%: < 1.5s
 *   Bottom 25%: > 8s
 */

export default function WebVitalsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Wait for full page load including images
    if (document.readyState !== 'complete') {
      window.addEventListener('load', sendMetrics)
      return () => window.removeEventListener('load', sendMetrics)
    }

    sendMetrics()

    function sendMetrics() {
      // Give browser a tick to settle after load
      setTimeout(() => {
        try {
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (!navEntry) return

          const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
          const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : navEntry.domComplete

          const paintEntries = performance.getEntriesByName('first-contentful-paint')
          const fcp = paintEntries.length > 0 ? paintEntries[0].startTime : navEntry.domInteractive

          const deviceType = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'

          // Cumulative Layout Shift — not yet measured (placeholder)
          const cls = 0

          const payload = {
            path: pathname,
            lcp: Math.round(lcp),
            fcp: Math.round(fcp),
            ttfb: Math.round(navEntry.responseStart - navEntry.requestStart),
            cls: cls || undefined,
            loadTime: Math.round(navEntry.loadEventEnd - navEntry.startTime),
            deviceType,
          }

          // Fire and forget — no await needed
          fetch('/api/analytics/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => { /* best-effort */ })
        } catch {
          // Performance API may not be available in all browsers
        }
      }, 2000) // 2s after load to let metrics settle
    }
  }, [pathname])

  return null // This component does not render anything
}
