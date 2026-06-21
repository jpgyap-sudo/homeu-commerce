/**
 * app-config.ts — Unified Application Configuration Registry
 *
 * ALL application configuration is defined here as typed namespaces.
 * Every config value follows: DB (DaVinciOS_kv) > env var > hardcoded default
 *
 * Usage:
 *   import { loadNamespace, saveNamespace } from '@/lib/app-config'
 *   const store = await loadNamespace('store')
 *   await saveNamespace('store', { name: 'My Store' })
 *
 * The .env file is ONLY needed for:
 *   - DATABASE_URI (to connect)
 *   - JWT_SECRET (JWT signing — security requirement)
 *   - DAVINCIOS_SECRET (config encryption)
 * Everything else can be configured through the admin UI.
 */

import { query } from '@/lib/db'

// ── Config Namespace Types ──────────────────────────────────────────

export interface StoreConfig {
  name: string           // Store name (brand)
  displayName: string    // Display name
  email: string          // Contact email
  phone: string          // Contact phone
  address: string        // Business address
  currency: string       // Default currency
  timezone: string       // Timezone
  bankDetails: string    // Bank account details for quotations
}

export interface EmailConfig {
  smtpHost: string
  smtpPort: string
  smtpSecure: string
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  salesEmail: string
  salesEmailPass: string
  zohoImapHost: string
  zohoImapPort: string
  notificationEmail: string
}

export interface AiConfig {
  provider: string       // 'gemini' | 'openai' | 'ollama'
  geminiApiKey: string
  openaiApiKey: string
  ollamaBaseUrl: string
  ollamaModel: string
}

export interface SocialConfig {
  fbAppId: string
  fbAppSecret: string
  fbPageId: string
  fbPageAccessToken: string
  fbWebhookVerifyToken: string
  igBusinessAccountId: string
  igAccessToken: string
  fbWebhookActive: boolean
  igWebhookActive: boolean
}

export interface MessagingConfig {
  telegramBotToken: string
  telegramChatId: string
  viberNumber: string
  viberName: string
  enableChat: boolean
  greetingDelay: number
  productPageDelay: number
}

export interface AuthConfig {
  googleClientId: string
  googleAllowedDomain: string
}

export interface CdnConfig {
  doSpacesKey: string
  doSpacesSecret: string
  doSpacesBucket: string
  doSpacesRegion: string
  doSpacesEndpoint: string
  doSpacesCdnEndpoint: string
}

export interface UrlsConfig {
  siteUrl: string
  appUrl: string
  serverUrl: string
}

export interface AllConfig {
  store: StoreConfig
  email: EmailConfig
  ai: AiConfig
  social: SocialConfig
  messaging: MessagingConfig
  auth: AuthConfig
  cdn: CdnConfig
  urls: UrlsConfig
}

// ── Namespace Registry ──────────────────────────────────────────────

type NamespaceWithDefault<T> = {
  namespace: string
  defaults: () => T
  envMap: Record<string, keyof T>  // env var → config key
}

const KV_PREFIX = 'app_config_'

const NAMESPACES: Record<string, NamespaceWithDefault<any>> = {
  store: {
    namespace: 'store',
    defaults: (): StoreConfig => ({
      name: process.env.STORE_NAME || 'Home Atelier',
      displayName: process.env.STORE_DISPLAY_NAME || 'Home Atelier',
      email: process.env.STORE_EMAIL || process.env.SALES_EMAIL || 'hello@homeu.ph',
      phone: process.env.STORE_PHONE || '+63 2 8123 4567',
      address: process.env.STORE_ADDRESS || 'Manila, Philippines',
      currency: process.env.STORE_CURRENCY || 'PHP (₱)',
      timezone: process.env.STORE_TIMEZONE || 'Asia/Manila (UTC+8)',
      bankDetails: process.env.BANK_DETAILS || 'Bank: Eastwest Bank\nAccount Name: Home Atelier\nAccount Number: (set in admin settings)',
    }),
    envMap: {
      STORE_NAME: 'name',
      STORE_DISPLAY_NAME: 'displayName',
      STORE_EMAIL: 'email',
      SALES_EMAIL: 'email',
      STORE_PHONE: 'phone',
      STORE_ADDRESS: 'address',
      STORE_CURRENCY: 'currency',
      STORE_TIMEZONE: 'timezone',
      BANK_DETAILS: 'bankDetails',
    },
  },
  email: {
    namespace: 'email',
    defaults: (): EmailConfig => ({
      smtpHost: process.env.SMTP_HOST || 'smtp.zoho.com',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpSecure: process.env.SMTP_SECURE || 'false',
      smtpUser: process.env.SMTP_USER || process.env.SALES_EMAIL || '',
      smtpPass: process.env.SMTP_PASS || process.env.SALES_EMAIL_PASS || '',
      smtpFrom: process.env.SMTP_FROM || '',
      salesEmail: process.env.SALES_EMAIL || 'sales@homeu.ph',
      salesEmailPass: process.env.SALES_EMAIL_PASS || '',
      zohoImapHost: process.env.ZOHO_IMAP_HOST || 'imap.zoho.com',
      zohoImapPort: process.env.ZOHO_IMAP_PORT || '993',
      notificationEmail: process.env.NOTIFICATION_EMAIL || 'admin@homeu.ph',
    }),
    envMap: {
      SMTP_HOST: 'smtpHost',
      SMTP_PORT: 'smtpPort',
      SMTP_SECURE: 'smtpSecure',
      SMTP_USER: 'smtpUser',
      SMTP_PASS: 'smtpPass',
      SMTP_FROM: 'smtpFrom',
      SALES_EMAIL: 'salesEmail',
      SALES_EMAIL_PASS: 'salesEmailPass',
      ZOHO_IMAP_HOST: 'zohoImapHost',
      ZOHO_IMAP_PORT: 'zohoImapPort',
      NOTIFICATION_EMAIL: 'notificationEmail',
    },
  },
  ai: {
    namespace: 'ai',
    defaults: (): AiConfig => ({
      provider: process.env.AI_PROVIDER || 'gemini',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:4b',
    }),
    envMap: {
      AI_PROVIDER: 'provider',
      GEMINI_API_KEY: 'geminiApiKey',
      OPENAI_API_KEY: 'openaiApiKey',
      OLLAMA_BASE_URL: 'ollamaBaseUrl',
      OLLAMA_MODEL: 'ollamaModel',
    },
  },
  social: {
    namespace: 'social',
    defaults: (): SocialConfig => ({
      fbAppId: '',
      fbAppSecret: '',
      fbPageId: '',
      fbPageAccessToken: '',
      fbWebhookVerifyToken: 'homeu-fb-webhook-verify-' + Date.now().toString(36),
      igBusinessAccountId: '',
      igAccessToken: '',
      fbWebhookActive: false,
      igWebhookActive: false,
    }),
    envMap: {},
  },
  messaging: {
    namespace: 'messaging',
    defaults: (): MessagingConfig => ({
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '',
      viberNumber: process.env.SALES_VIBER_NUMBER || '+639171234567',
      viberName: process.env.SALES_VIBER_NAME || 'HomeU Sales Team',
      enableChat: process.env.NEXT_PUBLIC_ENABLE_CHAT !== 'false',
      greetingDelay: parseInt(process.env.NEXT_PUBLIC_CHAT_GREETING_DELAY || '4000'),
      productPageDelay: parseInt(process.env.NEXT_PUBLIC_CHAT_PRODUCT_PAGE_DELAY || '7000'),
    }),
    envMap: {
      TELEGRAM_BOT_TOKEN: 'telegramBotToken',
      TELEGRAM_GROUP_CHAT_ID: 'telegramChatId',
      SALES_VIBER_NUMBER: 'viberNumber',
      SALES_VIBER_NAME: 'viberName',
      NEXT_PUBLIC_ENABLE_CHAT: 'enableChat',
      NEXT_PUBLIC_CHAT_GREETING_DELAY: 'greetingDelay',
      NEXT_PUBLIC_CHAT_PRODUCT_PAGE_DELAY: 'productPageDelay',
    },
  },
  auth: {
    namespace: 'auth',
    defaults: (): AuthConfig => ({
      googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      googleAllowedDomain: process.env.GOOGLE_ALLOWED_DOMAIN || '',
    }),
    envMap: {
      GOOGLE_CLIENT_ID: 'googleClientId',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'googleClientId',
      GOOGLE_ALLOWED_DOMAIN: 'googleAllowedDomain',
    },
  },
  cdn: {
    namespace: 'cdn',
    defaults: (): CdnConfig => ({
      doSpacesKey: process.env.DO_SPACES_KEY || '',
      doSpacesSecret: process.env.DO_SPACES_SECRET || '',
      doSpacesBucket: process.env.DO_SPACES_BUCKET || 'homeatelierspaces',
      doSpacesRegion: process.env.DO_SPACES_REGION || 'sgp1',
      doSpacesEndpoint: process.env.DO_SPACES_ORIGIN_ENDPOINT?.replace('https://', '') || 'sgp1.digitaloceanspaces.com',
      doSpacesCdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT || 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com',
    }),
    envMap: {
      DO_SPACES_KEY: 'doSpacesKey',
      DO_SPACES_SECRET: 'doSpacesSecret',
      DO_SPACES_BUCKET: 'doSpacesBucket',
      DO_SPACES_REGION: 'doSpacesRegion',
      DO_SPACES_ORIGIN_ENDPOINT: 'doSpacesEndpoint',
      DO_SPACES_CDN_ENDPOINT: 'doSpacesCdnEndpoint',
    },
  },
  urls: {
    namespace: 'urls',
    defaults: (): UrlsConfig => ({
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeu.ph',
      appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://homeu.ph',
      serverUrl: process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph',
    }),
    envMap: {
      NEXT_PUBLIC_SITE_URL: 'siteUrl',
      APP_URL: 'appUrl',
      NEXT_PUBLIC_APP_URL: 'appUrl',
      DAVINCIOS_PUBLIC_SERVER_URL: 'serverUrl',
    },
  },
}

// ── Load from DB ───────────────────────────────────────────────────

async function loadFromDb<T>(namespace: string): Promise<Partial<T> | null> {
  try {
    const result = await query(
      `SELECT data FROM "DaVinciOS_kv" WHERE key = $1 LIMIT 1`,
      [KV_PREFIX + namespace]
    )
    if (result.rows.length > 0 && result.rows[0].data && typeof result.rows[0].data === 'object') {
      return result.rows[0].data as Partial<T>
    }
  } catch { /* table may not exist */ }
  return null
}

async function saveToDb<T>(namespace: string, data: T): Promise<void> {
  await query(
    `INSERT INTO "DaVinciOS_kv" (key, data)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (key)
     DO UPDATE SET data = $2::jsonb`,
    [KV_PREFIX + namespace, JSON.stringify(data)]
  )
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Load a config namespace. Priority: DB > env var > hardcoded default
 */
export async function loadNamespace<T>(namespace: string): Promise<T> {
  const ns = NAMESPACES[namespace]
  if (!ns) throw new Error(`Unknown config namespace: ${namespace}`)

  const defaults = ns.defaults() as T
  const dbData = await loadFromDb<Partial<T>>(namespace)

  if (!dbData) return defaults

  // Merge: DB values override env/defaults
  return { ...defaults, ...dbData }
}

/**
 * Load all config namespaces at once.
 */
export async function loadAllConfig(): Promise<AllConfig> {
  const [store, email, ai, social, messaging, auth, cdn, urls] = await Promise.all([
    loadNamespace<StoreConfig>('store'),
    loadNamespace<EmailConfig>('email'),
    loadNamespace<AiConfig>('ai'),
    loadNamespace<SocialConfig>('social'),
    loadNamespace<MessagingConfig>('messaging'),
    loadNamespace<AuthConfig>('auth'),
    loadNamespace<CdnConfig>('cdn'),
    loadNamespace<UrlsConfig>('urls'),
  ])
  return { store, email, ai, social, messaging, auth, cdn, urls }
}

/**
 * Save a config namespace to DB.
 */
export async function saveNamespace<T>(namespace: string, data: Partial<T>): Promise<void> {
  const ns = NAMESPACES[namespace]
  if (!ns) throw new Error(`Unknown config namespace: ${namespace}`)

  // Merge with existing to preserve unspecified fields
  const existing = await loadNamespace<T>(namespace)
  const merged = { ...existing, ...data }

  // Strip empty values
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(merged as Record<string, any>)) {
    if (value !== '' && value !== null && value !== undefined) {
      clean[key] = value
    }
  }

  await saveToDb(namespace, clean)
}

/**
 * Get the list of all supported namespaces for the admin UI.
 */
export function getNamespaceList() {
  return Object.entries(NAMESPACES).map(([key, ns]) => ({
    key,
    defaults: ns.defaults(),
  }))
}

/**
 * Mask sensitive fields for API responses.
 */
const SENSITIVE_KEYS = new Set([
  'smtpPass', 'salesEmailPass', 'smtpPassword',
  'geminiApiKey', 'openaiApiKey',
  'fbAppSecret', 'fbPageAccessToken', 'igAccessToken',
  'telegramBotToken',
  'doSpacesKey', 'doSpacesSecret',
  'googleClientId',
])

export function maskSensitiveFields(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key) && typeof value === 'string' && value.length > 4) {
      masked[key] = value.substring(0, 2) + '••••' + value.substring(value.length - 1)
    } else {
      masked[key] = value
    }
  }
  return masked
}

/**
 * Check if a value is a masked version (contains ••••).
 */
export function isMaskedValue(value: string): boolean {
  return typeof value === 'string' && value.includes('••••')
}
