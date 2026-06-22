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

      // Reload once when a new SW takes control, so a stale cached shell
      // or chunk reference from a previous deploy never sticks around —
      // without this, `updatefound` only logged and the new SW sat
      // "waiting" indefinitely since nothing ever called skipWaiting from
      // the page side, leaving visitors on an old cached version after
      // every deploy until they happened to hard-refresh.
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] SW registered:', reg.scope)

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available, activating...')
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
