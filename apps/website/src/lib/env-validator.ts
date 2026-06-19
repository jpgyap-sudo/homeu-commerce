/**
 * Environment Variable Validator
 *
 * Called at startup to verify all required environment variables are present
 * and valid. Logs warnings for non-fatal issues, throws for fatal ones.
 *
 * Import this in lib/db.ts (import-time side effect) and in the root layout
 * to ensure validation happens before any requests are served.
 */

const REQUIRED_VARS: { key: string; fatal: boolean; devOnly?: boolean; validate?: (v: string) => string | null }[] = [
  { key: 'DATABASE_URI',       fatal: true,  validate: validateDatabaseUri },
  { key: 'JWT_SECRET',         fatal: process.env.NODE_ENV === 'production', validate: validateJwtSecret },
  { key: 'NEXT_PUBLIC_SITE_URL', fatal: false },
  { key: 'DO_SPACES_KEY',      fatal: false },
  { key: 'DO_SPACES_SECRET',   fatal: false },
  { key: 'DO_SPACES_BUCKET',   fatal: false },
  { key: 'DO_SPACES_ENDPOINT', fatal: false },
  { key: 'AI_PROVIDER',        fatal: false },
  { key: 'VIBER_NUMBER',       fatal: false },
  { key: 'TELEGRAM_BOT_TOKEN', fatal: false },
]

export interface EnvValidationResult {
  ok: boolean
  missing: string[]
  invalid: { key: string; reason: string }[]
  warnings: string[]
}

function validateDatabaseUri(uri: string): string | null {
  try {
    const url = new URL(uri)
    if (!url.hostname) return 'DATABASE_URI has no hostname'
    if (!url.pathname || url.pathname === '/') return 'DATABASE_URI has no database name'
    return null // valid
  } catch {
    return 'DATABASE_URI is not a valid URL'
  }
}

function validateJwtSecret(secret: string): string | null {
  if (secret.length < 32) {
    return `JWT_SECRET must be at least 32 characters (currently ${secret.length})`
  }
  // Warn if it's a default/placeholder
  if (secret.includes('your-secret') || secret.includes('change-me') || secret === 'dev-secret-1234567890abcdef1234567890abcdef') {
    return 'JWT_SECRET appears to be a placeholder — generate a real one for production'
  }
  return null
}

let _result: EnvValidationResult | null = null

export function validateEnv(): EnvValidationResult {
  if (_result) return _result

  const result: EnvValidationResult = { ok: true, missing: [], invalid: [], warnings: [] }

  for (const { key, fatal, validate } of REQUIRED_VARS) {
    const value = process.env[key]

    if (!value || value.trim() === '') {
      if (fatal) {
        result.ok = false
        result.missing.push(key)
      } else {
        result.warnings.push(`Optional env var ${key} is not set`)
      }
      continue
    }

    if (validate) {
      const error = validate(value)
      if (error) {
        if (fatal) {
          result.ok = false
          result.invalid.push({ key, reason: error })
        } else {
          result.warnings.push(`${key}: ${error}`)
        }
      }
    }
  }

  _result = result

  // Log results to console (central-logger may not be available yet at import-time)
  if (!result.ok) {
    console.error('[env-validator] ❌ FATAL: Missing required environment variables:')
    for (const m of result.missing) console.error(`  - ${m} (required)`)
    for (const i of result.invalid) console.error(`  - ${i.key}: ${i.reason}`)
    console.error('[env-validator] Server startup will be aborted.')
  }
  if (result.warnings.length > 0) {
    console.warn('[env-validator] ⚠ Warnings:')
    for (const w of result.warnings) console.warn(`  - ${w}`)
  }
  if (result.ok && result.warnings.length === 0) {
    console.log('[env-validator] ✓ All required environment variables are valid.')
  }

  return result
}

/**
 * Check fatal issues and throw if any exist. Call this after central-logger
 * is available to ensure errors go to the log file.
 */
export function assertEnv(): void {
  const result = validateEnv()
  if (!result.ok) {
    const msg = `Fatal env validation errors: missing=[${result.missing.join(', ')}] invalid=[${result.invalid.map(i => `${i.key}:${i.reason}`).join(', ')}]`
    throw new Error(msg)
  }
}

export function getEnvResult(): EnvValidationResult | null {
  return _result
}
