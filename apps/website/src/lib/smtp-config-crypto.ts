import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function encryptionKey(): Buffer {
  const secret = process.env.DAVINCIOS_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('DAVINCIOS_SECRET or JWT_SECRET is required for SMTP credential encryption')
  return createHash('sha256').update(secret).digest()
}

export function encryptSmtpPassword(value: string): string {
  if (!value || value.startsWith(PREFIX)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSmtpPassword(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64')
  if (payload.length < 29) throw new Error('Invalid encrypted SMTP password')
  const iv = payload.subarray(0, 12)
  const tag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function isMaskedSmtpPassword(value: unknown): value is string {
  return typeof value === 'string' && value.includes('••••')
}
