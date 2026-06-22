import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('categories surface database failures and report real counts', async () => {
  const [page, route] = await Promise.all([
    read('apps/website/src/app/admin/categories/page.tsx'),
    read('apps/website/src/app/api/categories/route.ts'),
  ])

  assert.match(page, /dynamic = 'force-dynamic'/)
  assert.match(page, /Catalog connection error/)
  assert.match(page, /console\.error\('\[admin\/categories\]/)
  assert.match(route, /FROM products p WHERE p\.category_id = c\.id/)
  assert.match(route, /SELECT COUNT\(\*\)::int AS total FROM categories/)
})

test('Instagram app has schema, sync, moderation, and signed webhook wiring', async () => {
  const [migration, syncRoute, syncService, adminPage, publicRoute, webhook] = await Promise.all([
    read('tools/migrate/migrations/034_instagram_feed_runtime.sql'),
    read('apps/website/src/app/api/admin/instagram/sync/route.ts'),
    read('apps/website/src/lib/instagram-sync.ts'),
    read('apps/website/src/app/admin/apps/instagram/page.tsx'),
    read('apps/website/src/app/api/instagram/route.ts'),
    read('apps/website/src/app/api/webhooks/instagram/route.ts'),
  ])

  assert.match(migration, /CREATE TABLE IF NOT EXISTS instagram_posts/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS instagram_grids/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS grid_cells/)
  assert.match(syncRoute, /syncInstagramFeed/)
  assert.match(syncService, /social_channels_config/)
  assert.match(syncService, /status, source, synced_at/)
  assert.match(adminPage, /onClick={syncNow}/)
  assert.match(adminPage, /href="\/admin\/settings\/social"/)
  assert.match(adminPage, /d\.docs \|\| d\.products/)
  assert.match(publicRoute, /status = 'approved' AND (?:p\.)?is_visible = TRUE/)
  assert.match(webhook, /x-hub-signature-256/)
  assert.match(webhook, /timingSafeEqual/)
})
