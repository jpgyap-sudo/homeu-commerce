'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA support.
 * Only runs on the storefront (not admin subdomain).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if ('serviceWorker' in navigator) {
      // Don't register SW on admin subdomain
      if (window.location.hostname.startsWith('admin.')) return

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] SW registered:', reg.scope)

          // Check for updates on page load
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available — notify user
                  console.log('[PWA] New version available')
                }
              })
            }
          })
        })
        .catch((err) => {
          console.error('[PWA] SW registration failed:', err)
        })

      // Re-register on reconnect
      window.addEventListener('online', () => {
        navigator.serviceWorker.register('/sw.js')
      })
    }
  }, [])

  return null
}
