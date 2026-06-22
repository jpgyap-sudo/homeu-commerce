/**
 * Quick admin health check — tests every admin page returns 200/OK via HTTP
 * Usage: node tools/quick-admin-check.mjs
 */
const pages = [
  '/admin/login', '/admin/dashboard', '/admin/products', '/admin/categories',
  '/admin/collections', '/admin/apps/central-inbox', '/admin/apps/email-inbox',
  '/admin/quotations', '/admin/rfq', '/admin/customers', '/admin/designer-club',
  '/admin/theme', '/admin/blogs', '/admin/navigation', '/admin/pages',
  '/admin/media', '/admin/redirects', '/admin/reviews', '/admin/analytics',
  '/admin/collections/leads', '/admin/collections/appointments',
  '/admin/apps', '/admin/apps/instagram',
  '/admin/settings/users', '/admin/settings/store', '/admin/settings/email',
  '/admin/settings/social', '/admin/settings/notifications', '/admin/settings/ai',
  '/admin/workflows',
]

let passed = 0, failed = 0
for (const p of pages) {
  try {
    const res = await fetch('http://localhost:3000' + p)
    const text = await res.text()
    const ok = res.status === 200 && !text.includes('Internal Server Error') && text.length > 100
    const status = ok ? '✅' : '❌'
    const reason = !ok ? (res.status !== 200 ? `HTTP ${res.status}` : 'Internal Server Error') : ''
    console.log(`  ${status} ${p} (${text.length}b) ${reason}`)
    if (ok) passed++; else failed++
  } catch (e) {
    console.log(`  ❌ ${p} — ${e.message.substring(0, 60)}`)
    failed++
  }
}
console.log(`\nResults: ${passed}/${passed + failed} passed`)
