/**
 * Simple in-memory rate limiter for public API routes.
 *
 * Uses a sliding window approach with an LRU-like cleanup.
 * Not suitable for multi-instance deployments — for that, use
 * Upstash Redis or a shared DB-based limiter.
 */

const store = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [key, timestamps] of store) {
    const remaining = timestamps.filter(t => t > cutoff)
    if (remaining.length === 0) store.delete(key)
    else store.set(key, remaining)
  }
}, 60_000)

export function checkRateLimit(
  key: string,
  maxRequests: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = store.get(key) || []
  const recent = timestamps.filter(t => t > cutoff)
  if (recent.length >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: recent[0] + windowMs }
  }
  recent.push(now)
  store.set(key, recent)
  return { allowed: true, remaining: maxRequests - recent.length, resetAt: now + windowMs }
}
