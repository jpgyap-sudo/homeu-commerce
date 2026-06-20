/**
 * smtp-config.ts
 * ===============
 * Loads SMTP configuration from the DaVinciOS_kv database table.
 * Falls back to environment variables if DB config is not set.
 *
 * This allows admins to configure email settings from the admin panel
 * without needing server/.env file access.
 */

import { query } from '@/lib/db'
import { decryptSmtpPassword } from '@/lib/smtp-config-crypto'

export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  salesEmail: string
}

/**
 * Load SMTP settings from DB key-value store, falling back to env vars.
 */
export async function loadSmtpConfig(): Promise<SmtpSettings> {
  let dbConfig: Record<string, string> = {}

  try {
    const result = await query(
      `SELECT data FROM "DaVinciOS_kv" WHERE key = 'smtp_config' LIMIT 1`
    )
    if (result.rows.length > 0) {
      const data = result.rows[0].data
      if (typeof data === 'object' && data !== null) {
        dbConfig = data as Record<string, string>
        if (dbConfig.smtp_pass) dbConfig.smtp_pass = decryptSmtpPassword(dbConfig.smtp_pass)
      }
    }
  } catch {
    // DB table might not exist yet — use env vars
  }

  return {
    host: dbConfig.smtp_host || process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(dbConfig.smtp_port || process.env.SMTP_PORT || '587'),
    secure: (dbConfig.smtp_secure || process.env.SMTP_SECURE || 'false') === 'true',
    user: dbConfig.smtp_user || process.env.SALES_EMAIL || process.env.SMTP_FROM || '',
    pass: dbConfig.smtp_pass || process.env.SALES_EMAIL_PASS || process.env.SMTP_PASS || '',
    from: dbConfig.smtp_from || process.env.SMTP_FROM || '"Home Atelier" <sales@homeatelier.ph>',
    salesEmail: dbConfig.smtp_sales_email || process.env.SALES_EMAIL || 'sales@homeu.ph',
  }
}

/**
 * Create a nodemailer transporter from the loaded SMTP config.
 */
export async function createMailTransporter() {
  const nodemailer = await import('nodemailer')
  const config = await loadSmtpConfig()

  return nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}
