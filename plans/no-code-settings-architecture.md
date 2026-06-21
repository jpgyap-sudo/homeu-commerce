# No-Code Admin Settings Platform — Architecture Plan

## Current State

The admin has **6 settings pages** but only **3 are functional**. There are **45+ process.env references** scattered across the codebase with mixed fallback patterns. Settings should be manageable through the admin UI with `.env` as fallback, making the system replicable.

## Complete Environment Variable Inventory

### Group 1: Database & Core (REQUIRED)
| Env Var | Consumers | Current Fallback |
|---------|-----------|------------------|
| `DATABASE_URI` | `db.ts`, `chatbot/db.ts`, `env-validator.ts` | `postgres://homeu:homeu@localhost:5432/homeu` |
| `JWT_SECRET` | `proxy.ts`, `auth.ts` | Hard error if missing |
| `DAVINCIOS_SECRET` | `smtp-config-crypto.ts` | Falls back to `JWT_SECRET` |
| `NEXT_PUBLIC_SITE_URL` | `sitemap.ts`, `feed.xml` | `https://store.homeu.ph` |

### Group 2: SMTP / Email (15 references across 8 files)
| Env Var | Files Using It |
|---------|---------------|
| `SMTP_HOST` | `smtp-config.ts`, `rfq/route.ts`, `reset-password/route.ts`, `email/send/route.ts`, `email/reply/route.ts`, `env-validator.ts` |
| `SMTP_PORT` | same files |
| `SMTP_SECURE` | same files |
| `SMTP_USER` | same files |
| `SMTP_PASS` | same files |
| `SMTP_FROM` | same files |
| `SALES_EMAIL` | `mail-client.ts`, `smtp-config.ts`, `email/send/route.ts`, `email/reply/route.ts` |
| `SALES_EMAIL_PASS` | `mail-client.ts`, `smtp-config.ts`, `email/reply/route.ts`, `email/send/route.ts` |
| `ZOHO_IMAP_HOST` | `mail-client.ts` |
| `ZOHO_IMAP_PORT` | `mail-client.ts` |
| `NOTIFICATION_EMAIL` | `rfq/route.ts` |

### Group 3: AI / Chatbot
| Env Var | Files Using It |
|---------|---------------|
| `AI_PROVIDER` | `ai-provider.ts` (gemini/openai/ollama) |
| `GEMINI_API_KEY` | `ai-provider.ts` |
| `OPENAI_API_KEY` | `ai-provider.ts` |
| `OLLAMA_BASE_URL` | `ai-provider.ts`, `ollama-utils.ts`, `health/route.ts` |
| `OLLAMA_MODEL` | `ollama-utils.ts`, `ai-provider.ts` |

### Group 4: Social / Messaging
| Env Var | Files Using It |
|---------|---------------|
| `FACEBOOK_VERIFY_TOKEN` | webhook/facebook/route.ts |
| `INSTAGRAM_VERIFY_TOKEN` | webhook/instagram/route.ts |
| `TELEGRAM_BOT_TOKEN` | telegram-client.ts |
| `TELEGRAM_GROUP_CHAT_ID` | telegram-client.ts |
| `SALES_VIBER_NUMBER` | message/route.ts |
| `SALES_VIBER_NAME` | ChatWidget.tsx |

### Group 5: Auth / OAuth
| Env Var | Files Using It |
|---------|---------------|
| `GOOGLE_CLIENT_ID` | auth/google routes |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | auth/google routes |
| `GOOGLE_ALLOWED_DOMAIN` | admin/auth/google/route.ts |

### Group 6: DigitalOcean / CDN
| Env Var | Files Using It |
|---------|---------------|
| `DO_SPACES_KEY` | env-validator.ts (checks only) |
| `DO_SPACES_SECRET` | env-validator.ts (checks only) |
| `DO_SPACES_BUCKET` | health/route.ts, env-validator.ts |
| `DO_SPACES_ENDPOINT` | health/route.ts |
| `DO_SPACES_CDN_ENDPOINT` | health/route.ts |

### Group 7: Store & Branding
| Env Var | Files Using It |
|---------|---------------|
| `BANK_DETAILS` | Quotations.ts |
| `APP_URL` / `PUBLIC_SERVER_URL` | Various routes for link generation |
| `NEXT_PUBLIC_SITE_NAME` | feed.xml |
| `NEXT_PUBLIC_CHAT_GREETING_DELAY` | ChatWidget.tsx |
| `NEXT_PUBLIC_CHAT_PRODUCT_PAGE_DELAY` | ChatWidget.tsx |
| `NEXT_PUBLIC_ENABLE_CHAT` | ChatWidget.tsx |

---

## Architecture: Unified Settings Registry

### Pattern: DB-First with Env Fallback

```
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Admin UI    │───>│  DTOS/KV Store   │───>│  Runtime       │
│  (settings)  │<───│  (DaVinciOS_kv)  │<───│  Config        │
└──────────────┘    └──────────────────┘    └────────────────┘
                           │                        │
                           ▼                        ▼
                    ┌──────────────────┐    ┌────────────────┐
                    │  `.env` file     │    │  process.env   │
                    │  (FALLBACK)      │    │  (FALLBACK)     │
                    └──────────────────┘    └────────────────┘
```

Every config value follows: **DB value > env var > hardcoded default**

### Unified Config Store

Create a single config registry at `lib/app-config.ts`:

```typescript
interface AppConfig {
  // Each namespace is a category with typed keys
  store: { name, displayName, email, phone, address, currency, timezone, bankDetails }
  email: { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, salesEmail, salesEmailPass }
  ai: { provider, geminiApiKey, openaiApiKey, ollamaBaseUrl, ollamaModel }
  social: { fbAppId, fbAppSecret, fbPageId, fbPageAccessToken, igBusinessAccountId, igAccessToken }
  messaging: { telegramBotToken, telegramChatId, viberNumber, viberName }
  auth: { googleClientId, googleAllowedDomain }
  cdn: { doSpacesKey, doSpacesSecret, doSpacesBucket, doSpacesEndpoint, doSpacesCdnEndpoint }
  chatbot: { greetingDelay, productPageDelay, enableChat }
  urls: { siteUrl, appUrl, serverUrl }
}
```

### API Pattern (single unified endpoint)

```
GET  /api/admin/config → { store: {...}, email: {...}, ... }
PUT  /api/admin/config?namespace=store → saves store config
```

Each settings page reads its namespace and writes to the same KV store.

### Settings Tab Active State Fix

New component `SettingsNav.tsx` (client component):

```tsx
'use client'
import { usePathname } from 'next/navigation'
export default function SettingsNav({ tabs }) {
  const pathname = usePathname()
  // Highlights active tab based on pathname match
}
```

### Settings Page Implementation Order

1. **Phase 1: Core architecture**
   - Create `lib/app-config.ts` — unified config loader with DB-first, env-fallback pattern
   - Create `/api/admin/config` — unified config CRUD API
   - Create `components/admin/SettingsField.tsx` — reusable settings field renderer (text, password, select, checkbox, textarea)
   - Fix Settings tab active state

2. **Phase 2: Fix broken pages**
   - Rewrite Store Profile (loads/saves from DB)
   - Rewrite Notifications (loads/saves Telegram + notification prefs)
   - System Health already works

3. **Phase 3: Remaining pages**
   - Email — already works, refactor to use new pattern
   - Social — already works (just built), refactor to use new pattern
   - Users — already works

4. **Phase 4: Add missing pages**
   - AI / Chatbot settings (provider selection, API keys)
   - CDN / Storage settings
   - URLs / Site settings

### Multi-Tenancy Ready

The `DaVinciOS_kv` key-value store supports per-tenant keys:
- Single-tenant: `config_store` namespace key
- Multi-tenant future: `config_store_tenant_{id}` key per tenant

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/app-config.ts` | **CREATE** | Unified config registry + loader |
| `lib/app-config-types.ts` | **CREATE** | TypeScript types for all config |
| `app/api/admin/config/route.ts` | **CREATE** | Unified config CRUD |
| `components/admin/SettingsField.tsx` | **CREATE** | Reusable settings field renderer |
| `app/admin/settings/layout.tsx` | **MODIFY** | Use client nav component |
| `app/admin/settings/SettingsNav.tsx` | **CREATE** | Client nav with active state |
| `app/admin/settings/store/page.tsx` | **REWRITE** | Load + save from DB |
| `app/admin/settings/notifications/page.tsx` | **REWRITE** | Load + save from DB |
| `app/admin/settings/ai/page.tsx` | **CREATE** | AI provider settings |
| `app/admin/settings/cdn/page.tsx` | **CREATE** | CDN settings page |
| `tools/migrate/migrations/014_unified_config.sql` | **CREATE** | Schema migration if needed |

### Migration File: Seed Default Config

When first accessed, seed default config from env vars so the admin UI picks up existing values.

---

## Implementation Steps

### Step 1: Create `lib/app-config.ts`
Define all config namespaces as TypeScript types. Build `loadConfig(namespace)` and `saveConfig(namespace, data)` that use `DaVinciOS_kv`. Add env fallback resolution.

### Step 2: Create unified API `app/api/admin/config/route.ts`
Single `GET` returns all config (masked secrets). Single `PUT` with `?namespace=` saves one namespace.

### Step 3: Fix Settings Nav Active State
Create `SettingsNav.tsx` client component, swap into `layout.tsx`.

### Step 4: Rewrite Store Settings
Client component fetching `config.store`, editable fields, save button.

### Step 5: Rewrite Notifications Settings
Client component fetching `config.messaging`, editable Telegram + notification prefs, save button.

### Step 6: Add AI Settings
New page for provider selection + API keys.

### Step 7: Add CDN Settings
New page for DO Spaces credentials.

### Step 8: Run migration
`014_unified_config.sql` — ensure `DaVinciOS_kv` has initial config.
