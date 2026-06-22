import { query } from '@/lib/db'

export interface InstagramSocialConfig {
  fb_app_secret?: string
  fb_webhook_verify_token?: string
  ig_business_account_id?: string
  ig_access_token?: string
  ig_graph_api_version?: string
}

export interface InstagramMedia {
  id: string
  caption?: string
  media_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
}

export async function loadInstagramSocialConfig(): Promise<InstagramSocialConfig> {
  const { rows } = await query(
    `SELECT data FROM "DaVinciOS_kv" WHERE key = 'social_channels_config' LIMIT 1`
  )
  return (rows[0]?.data || {}) as InstagramSocialConfig
}

function graphVersion(config: InstagramSocialConfig): string {
  const version = config.ig_graph_api_version || process.env.META_GRAPH_API_VERSION || 'v23.0'
  return /^v\d+\.\d+$/.test(version) ? version : 'v23.0'
}

async function graphRequest<T>(path: string, config: InstagramSocialConfig): Promise<T> {
  if (!config.ig_access_token) throw new Error('Instagram access token is not configured')

  const url = new URL(`https://graph.facebook.com/${graphVersion(config)}/${path}`)
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.ig_access_token}` },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Instagram Graph API returned ${response.status}`)
  }
  return payload as T
}

export function imageUrlForMedia(media: InstagramMedia): string | null {
  return media.media_url || media.thumbnail_url || null
}

export async function upsertInstagramMedia(media: InstagramMedia): Promise<'imported' | 'updated' | 'skipped'> {
  const imageUrl = imageUrlForMedia(media)
  if (!media.id || !imageUrl) return 'skipped'

  const existing = await query(
    'SELECT id FROM instagram_posts WHERE instagram_media_id = $1 LIMIT 1',
    [media.id]
  )

  await query(
    `INSERT INTO instagram_posts
       (image_url, caption, link, alt_text, width, height, instagram_media_id,
        media_type, permalink, status, source, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','instagram',NOW())
     ON CONFLICT (instagram_media_id) WHERE instagram_media_id IS NOT NULL
     DO UPDATE SET
       image_url = EXCLUDED.image_url,
       caption = EXCLUDED.caption,
       link = EXCLUDED.link,
       media_type = EXCLUDED.media_type,
       permalink = EXCLUDED.permalink,
       synced_at = NOW()`,
    [
      imageUrl,
      media.caption || null,
      media.permalink || null,
      media.caption?.slice(0, 240) || 'Instagram post',
      1080,
      1080,
      media.id,
      media.media_type || 'IMAGE',
      media.permalink || null,
    ]
  )

  return existing.rows.length > 0 ? 'updated' : 'imported'
}

export async function syncInstagramMediaById(mediaId: string, config?: InstagramSocialConfig) {
  const resolved = config || await loadInstagramSocialConfig()
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const media = await graphRequest<InstagramMedia>(`${encodeURIComponent(mediaId)}?fields=${fields}`, resolved)
  return upsertInstagramMedia(media)
}

export async function syncInstagramFeed() {
  const config = await loadInstagramSocialConfig()
  if (!config.ig_business_account_id || !config.ig_access_token) {
    throw new Error('Configure the Instagram Business Account ID and access token first')
  }

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const payload = await graphRequest<{ data?: InstagramMedia[] }>(
    `${encodeURIComponent(config.ig_business_account_id)}/media?fields=${fields}&limit=50`,
    config
  )

  const summary = { imported: 0, updated: 0, skipped: 0, total: payload.data?.length || 0 }
  for (const media of payload.data || []) {
    const result = await upsertInstagramMedia(media)
    summary[result]++
  }
  return summary
}
