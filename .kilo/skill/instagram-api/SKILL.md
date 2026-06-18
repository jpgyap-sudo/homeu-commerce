# Instagram API Sync Skill

## Purpose
Connect to Instagram Basic Display API / Facebook Graph API to auto-sync posts into the DaVinciOS instagram_posts table. Posts land in `status='pending'` for admin moderation.

## Architecture Pattern
```
Instagram Graph API (Meta)
  └── CRON job (every 1–6 hours)
       └── fetch media → download images → insert into instagram_posts
            └── status='pending' → admin approves → published
```

## API Token Setup
1. Create Facebook App at https://developers.facebook.com
2. Add "Instagram Basic Display" product
3. Get `instagram_basic` and `pages_show_list` permissions
4. Generate long-lived token (60 days, refreshable)
5. Store tokens in `.env`:
```
INSTAGRAM_CLIENT_ID=xxx
INSTAGRAM_CLIENT_SECRET=xxx
INSTAGRAM_ACCESS_TOKEN=xxx
INSTAGRAM_USER_ID=xxx
```

## Endpoints to Use

### Basic Display API (for personal accounts)
```
GET https://graph.instagram.com/me/media
  ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url}
  &access_token={token}

GET https://graph.instagram.com/{media-id}
  ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp
  &access_token={token}
```

### Graph API (for business/creator accounts)
```
GET https://graph.facebook.com/v18.0/{ig-user-id}/media
  ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp
  &access_token={token}
```

## Token Refresh
Long-lived tokens expire after 60 days. Refresh automatically:
```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={current_long_lived_token}
```

## Sync Implementation Pattern

```typescript
// tools/instagram-sync.mjs
import { Pool } from 'pg'
import fetch from 'node-fetch'

const pool = new Pool({ connectionString: process.env.DATABASE_URI })

async function sync() {
  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
  )
  const data = await response.json()

  for (const media of data.data) {
    // Skip if already imported
    const exists = await pool.query(
      'SELECT id FROM instagram_posts WHERE instagram_media_id = $1',
      [media.id]
    )
    if (exists.rows.length > 0) continue

    await pool.query(
      `INSERT INTO instagram_posts
       (instagram_media_id, media_type, image_url, thumbnail_url, permalink, caption,
        is_visible, is_pinned, status, source, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,'pending','instagram',NOW())`,
      [media.id, media.media_type, media.media_url, media.thumbnail_url,
       media.permalink, media.caption]
    )
  }
  console.log(`Synced ${data.data.length} posts`)
}

sync().catch(console.error)
```

## Webhook Support (Real-time)
For production, register Instagram webhooks:
```
POST https://graph.facebook.com/v18.0/{app-id}/subscriptions
  ?object=instagram
  &callback_url=https://admin.homeatelier.ph/api/webhooks/instagram
  &fields=mentions,messages
  &verify_token=your-verify-token
  &access_token={app-access-token}
```

## Study References
- **Pasilobus/shopify-instagram-feed**: Simple Instafeed.js widget, Liquid snippet pattern.
  Key takeaway: access token in theme settings → frontend renders via JS.
- **nocodeapi/embed-instagram-feed**: Web component approach, NoCodeAPI proxy.
  Key takeaway: API endpoint as attribute → web component fetches and renders.
  MIT licensed, 47 stars.

## Anti-Patterns to Avoid
- ❌ Don't use unofficial/scraping APIs (break Instagram ToS)
- ❌ Don't store access tokens in frontend code
- ❌ Don't sync every minute (rate limited at 200 calls/hour)
- ✅ Use long-lived tokens with server-side refresh
- ✅ Always set status='pending' for new synced posts
- ✅ Cache images to DO Spaces, not hotlink from Instagram CDN
