/**
 * Server-only helper to upload a file buffer to DigitalOcean Spaces, content-
 * addressed by SHA-256 (cdn-mirror/<sha256>.<ext>) — the same scheme as the
 * migrated catalog images, so identical bytes dedupe to a single object.
 *
 * Credentials come from DO_SPACES_* env vars; they never reach the browser.
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

function client() {
  return new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY || '',
      secretAccessKey: process.env.DO_SPACES_SECRET || '',
    },
    forcePathStyle: false,
  })
}

export interface UploadResult {
  url: string        // public CDN URL
  sha256: string
  key: string        // cdn-mirror/<sha256>.<ext>
  bytes: number
  contentType: string
  deduped: boolean   // true if the object already existed
}

export async function uploadToSpaces(buf: Buffer, ext: string, contentType: string): Promise<UploadResult> {
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const safeExt = (ext || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const key = `cdn-mirror/${sha256}.${safeExt}`
  const bucket = process.env.DO_SPACES_BUCKET || ''
  const cdn = process.env.DO_SPACES_CDN_ENDPOINT || ''
  const s3 = client()

  // Dedupe: if the object already exists, skip the upload.
  let deduped = false
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    deduped = true
  } catch { /* not found — upload below */ }

  if (!deduped) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: buf, ContentType: contentType, ACL: 'public-read',
    }))
  }

  return { url: `${cdn}/${key}`, sha256, key, bytes: buf.length, contentType, deduped }
}

export function spacesConfigured(): boolean {
  return Boolean(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET && process.env.DO_SPACES_BUCKET && process.env.DO_SPACES_CDN_ENDPOINT)
}
