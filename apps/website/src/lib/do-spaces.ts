/**
 * do-spaces.ts — DigitalOcean Spaces upload client.
 *
 * Credentials follow the same DB-first/env-fallback pattern as the rest of
 * the no-code settings platform (see lib/app-config.ts, namespace 'cdn').
 * Mirrors the working S3Client setup already used by
 * tools/shopify-import/mirror-db-assets.mjs.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { loadNamespace } from '@/lib/app-config'

interface SpacesCreds {
  doSpacesKey: string
  doSpacesSecret: string
  doSpacesBucket: string
  doSpacesRegion: string
  doSpacesEndpoint: string
  doSpacesCdnEndpoint: string
}

let cachedClient: { s3: S3Client; bucket: string; cdnEndpoint: string } | null = null

async function getClient() {
  if (cachedClient) return cachedClient

  const cdn = await loadNamespace<SpacesCreds>('cdn')
  if (!cdn.doSpacesKey || !cdn.doSpacesSecret) {
    throw new Error('DO Spaces credentials are not configured (Settings → CDN / Storage)')
  }

  const region = cdn.doSpacesRegion || 'sgp1'
  const s3 = new S3Client({
    endpoint: `https://${region}.digitaloceanspaces.com`,
    region,
    credentials: { accessKeyId: cdn.doSpacesKey, secretAccessKey: cdn.doSpacesSecret },
    forcePathStyle: false,
  })

  cachedClient = { s3, bucket: cdn.doSpacesBucket, cdnEndpoint: cdn.doSpacesCdnEndpoint }
  return cachedClient
}

/** Invalidate the cached client — called after CDN settings are saved. */
export function resetSpacesClient(): void {
  cachedClient = null
}

/**
 * Upload a buffer to DO Spaces under the given key. Returns the public CDN URL.
 */
export async function uploadBufferToSpaces(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const { s3, bucket, cdnEndpoint } = await getClient()

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }))

  return `${cdnEndpoint}/${key}`
}
