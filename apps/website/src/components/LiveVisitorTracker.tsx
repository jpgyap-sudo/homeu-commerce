'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function LiveVisitorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    let visitorId = ''
    try {
      visitorId = localStorage.getItem('_hv') || ''
      if (!visitorId) {
        visitorId = `v_${Math.random().toString(36).slice(2, 14)}_${Date.now().toString(36)}`
        localStorage.setItem('_hv', visitorId)
      }
    } catch {
      visitorId = `anon_${Math.random().toString(36).slice(2, 10)}`
    }

    const heartbeat = () => {
      void fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: pathname, isAdmin: pathname.startsWith('/admin') }),
        keepalive: true,
      }).catch(() => {})
    }

    heartbeat()
    const timer = window.setInterval(heartbeat, 30_000)
    return () => window.clearInterval(timer)
  }, [pathname])

  return null
}
