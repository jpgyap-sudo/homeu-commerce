/**
 * HomeU Commerce — Service Worker
 *
 * Cache-first for static assets (Next.js chunks, fonts, icons).
 * Network-first for API and dynamic pages.
 * Background sync for offline RFQ submission.
 * Push notifications for quotation alerts.
 *
 * Version: 1.0.0
 */

const CACHE = {
  STATIC: 'homeu-static-v1',
  FONTS: 'homeu-fonts-v1',
  IMAGES: 'homeu-images-v1',
  SHELL: 'homeu-shell-v1',
}

const STATIC_URLS = [
  '/',
  '/manifest.json',
  '/debut-theme.css',
]

// ── Install: pre-cache app shell ───────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE.SHELL).then((cache) => cache.addAll(STATIC_URLS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ─────────────────────────────────────

self.addEventListener('activate', (event) => {
  const keep = Object.values(CACHE)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('homeu-') && !keep.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: smart caching strategy ─────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, non-HTTP(S), and admin API requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return
  if (url.pathname.startsWith('/api/admin/')) {
    // Network-only for admin (never cache sensitive data)
    return
  }

  // Skip service worker and manifest (always fresh from network)
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    event.respondWith(networkFirst(request))
    return
  }

  // Cache-first: fingerprinted Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE.STATIC))
    return
  }

  // Cache-first: icons and fonts
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, CACHE.IMAGES))
    return
  }

  // Cache-first: CDN images (DigitalOcean Spaces)
  if (url.hostname.includes('digitaloceanspaces.com') || url.hostname.includes('cdn.')) {
    event.respondWith(cacheFirst(request, CACHE.IMAGES))
    return
  }

  // Network-first: API calls (non-admin)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Stale-while-revalidate: navigation and product pages
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Network-first fallback for everything else
  event.respondWith(networkFirst(request))
})

// ── Caching strategies ────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    // Offline and not cached — return offline fallback
    return caches.match('/')
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE.SHELL)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached

    // For navigation requests, serve the cached shell
    if (request.mode === 'navigate') {
      const shell = await caches.match('/')
      if (shell) return shell
    }

    return new Response('Offline', { status: 503 })
  }
}

// ── Background Sync: offline RFQ submission ───────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-rfq') {
    event.waitUntil(flushRfqQueue())
  }
})

async function flushRfqQueue() {
  try {
    // Open IndexedDB and flush any pending RFQ submissions
    const db = await openDB('homeu-rfq-queue', 1)
    const tx = db.transaction('pending', 'readonly')
    const pending = await tx.store.getAll()

    for (const item of pending) {
      try {
        const res = await fetch('/api/rfq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        })
        if (res.ok) {
          const deleteTx = db.transaction('pending', 'readwrite')
          deleteTx.store.delete(item.id)
        }
      } catch {
        break // Will retry on next sync event
      }
    }
  } catch {
    // IndexedDB not available or queue empty
  }
}

function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Push Notifications: quotation alerts ──────────────────────────

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data.json()
  } catch {
    return
  }

  const title = data.title || 'HomeU'
  const options = {
    body: data.body || 'You have a new update from HomeU',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'homeu-notification',
    data: data.url ? { url: data.url } : {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  }
})
