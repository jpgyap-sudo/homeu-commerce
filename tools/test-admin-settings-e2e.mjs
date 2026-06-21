/**
 * Admin Settings Wiring Audit
 *
 * Static source-content checks (no running server required) verifying the
 * unified no-code settings platform (lib/app-config.ts, /api/admin/config,
 * Store/Notifications/AI/CDN/URLs pages) is actually wired end-to-end:
 * UI -> API -> DB, and runtime consumers (AI provider, Telegram, chat
 * widget) actually read the saved config instead of only env vars.
 *
 * Usage: node tools/test-admin-settings-e2e.mjs
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
let passed = 0
let failed = 0

function source(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function check(name, condition) {
  if (condition) {
    passed++
    console.log(`PASS ${name}`)
  } else {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── Core config registry ──────────────────────────────────────
const appConfig = source('apps/website/src/lib/app-config.ts')
check('app-config defines DB > env > default precedence', appConfig.includes('Merge: DB values override env/defaults'))
check('app-config namespaces cover store/email/ai/social/messaging/auth/cdn/urls', [
  "store:", "email:", "ai:", "social:", "messaging:", "auth:", "cdn:", "urls:",
].every(k => appConfig.includes(k)))

// ── Unified config API ────────────────────────────────────────
const configRoute = source('apps/website/src/app/api/admin/config/route.ts')
check('/api/admin/config requires an authenticated session', configRoute.includes('getSession()'))
check('/api/admin/config masks sensitive namespaces on GET', configRoute.includes('maskSensitiveFields'))
check('/api/admin/config invalidates the AI provider cache on save', configRoute.includes('resetAIProvider'))

// ── DaVinciOS_kv table the whole registry depends on ──────────
const kvMigration = resolve(root, 'tools/migrate/migrations/015_davincios_kv.sql')
check('DaVinciOS_kv table has a migration (was missing from the local baseline)', existsSync(kvMigration))

// ── Settings pages actually call the unified API (not static placeholders) ──
const storePage = source('apps/website/src/app/admin/settings/store/page.tsx')
check('Store settings is a client component with real save handler', storePage.includes("'use client'") && storePage.includes("fetch('/api/admin/config?namespace=store'"))

const notificationsPage = source('apps/website/src/app/admin/settings/notifications/page.tsx')
check('Notifications settings is a client component with real save handler', notificationsPage.includes("'use client'") && notificationsPage.includes("fetch('/api/admin/config?namespace=messaging'"))

const aiPage = source('apps/website/src/app/admin/settings/ai/page.tsx')
check('AI settings page exists and saves to the ai namespace', aiPage.includes("fetch('/api/admin/config?namespace=ai'"))

const cdnPage = source('apps/website/src/app/admin/settings/cdn/page.tsx')
check('CDN settings page exists', existsSync(resolve(root, 'apps/website/src/app/admin/settings/cdn/page.tsx')))
check('CDN settings page exposes the Region field do-spaces.ts depends on', cdnPage.includes('doSpacesRegion'))

// ── Media upload actually persists to DO Spaces, not the container's disk ──
const doSpacesLib = source('apps/website/src/lib/do-spaces.ts')
check('do-spaces.ts reads credentials from the admin-configured cdn namespace', doSpacesLib.includes("loadNamespace") && doSpacesLib.includes("'cdn'"))

const uploadRoute = source('apps/website/src/app/api/admin/media/upload/route.ts')
check('media upload route no longer writes to local container disk', !uploadRoute.includes('fs/promises') && !uploadRoute.includes("'/uploads/"))
check('media upload route uploads to DO Spaces', uploadRoute.includes('uploadBufferToSpaces'))
check('media upload route dedupes by sha256 and registers the media row', uploadRoute.includes('WHERE sha256') && uploadRoute.includes('INSERT INTO media'))

const settingsNav = source('apps/website/src/app/admin/settings/SettingsNav.tsx')
check('Settings nav uses usePathname for active-tab state (not hardcoded false)', settingsNav.includes('usePathname'))

// ── Runtime actually reads saved config, not just env vars ───
const aiProvider = source('apps/website/src/lib/chatbot/ai-provider.ts')
check('getAIProvider() loads the admin-configured ai namespace', aiProvider.includes("loadNamespace") && /export async function getAIProvider/.test(aiProvider))

const telegramClient = source('apps/website/src/lib/chatbot/telegram-client.ts')
check('sendTelegramAlert() reads bot token/chat id from app-config, not only env', telegramClient.includes("loadNamespace") && telegramClient.includes('messaging.telegramBotToken'))

const chatMessageRoute = source('apps/website/src/app/api/chat/message/route.ts')
check('chat message route reads the Viber number from app-config', chatMessageRoute.includes("loadNamespace") && chatMessageRoute.includes('messaging.viberNumber'))

const widgetConfigRoute = resolve(root, 'apps/website/src/app/api/chat/widget-config/route.ts')
check('public chat widget config endpoint exists (client component cannot read DB directly)', existsSync(widgetConfigRoute))

const chatWidget = source('apps/website/src/components/chat/ChatWidget.tsx')
check('ChatWidget fetches widget-config instead of reading build-time env vars', chatWidget.includes("fetch('/api/chat/widget-config')"))
check('ChatWidget honors the admin enableChat toggle', chatWidget.includes('!widgetConfig.enableChat'))
check('ChatWidget no longer reads NEXT_PUBLIC_SALES_VIBER_NUMBER directly', !chatWidget.includes('process.env.NEXT_PUBLIC_SALES_VIBER_NUMBER'))

// ── Summary ────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
