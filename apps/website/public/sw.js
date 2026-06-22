/**
 * HomeU Commerce — Service Worker
 *
 * Cache-first only for durable media assets.
 * Network-only for Next.js runtime files, APIs, and authenticated pages.
 * Background sync for offline RFQ submission.
 * Push notifications for quotation alerts.
 *
 * Version: 1.1.0
 *
 * v3 purges the old unbounded Next.js/API caches. Fingerprinted Next.js
 * assets are left to the browser HTTP cache, while authenticated and API
 * traffic is never placed in Cache Storage.
 */

const CACHE = {
  STATIC: 'homeu-static-v3',
  FONTS: 'homeu-fonts-v3',
  IMAGES: 'homeu-images-v3',
  SHELL: 'homeu-shell-v3',
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

  // Let the browser handle non-GET and non-HTTP(S) traffic.
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  // Never put runtime code, API responses, or authenticated/account pages in
  // Cache Storage. This prevents stale chunk failures and cross-session data.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/customer/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname === '/login' ||
    url.pathname === '/register' ||
    url.pathname.startsWith('/reset-password') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json'
  ) {
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

  // Public navigation gets a network response; only the pre-cached homepage
  // is used as an offline fallback. Dynamic responses are never cached here.
  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request))
    return
  }
})

// ── Caching strategies ────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function navigationNetworkFirst(request) {
  try {
    return await fetch(request)
  } catch {
    const shell = await caches.open(CACHE.SHELL).then((cache) => cache.match('/'))
    if (shell) return shell
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
