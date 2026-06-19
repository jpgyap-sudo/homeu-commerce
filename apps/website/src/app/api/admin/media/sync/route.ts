/**
 * POST /api/admin/media/sync — reconcile the media index with reality.
 *
 * The "sync everything" engine. Because every image's identity is its content
 * hash (the sha256 in its cdn-mirror URL), syncing is idempotent and self-
 * healing: re-scan every place images are referenced, rebuild each object's
 * usage + used_count, and upsert one media row per distinct object. Nothing
 * can drift, because identity = the content itself.
 *
 * Returns a reconciliation report (indexed / per-source / orphaned).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const IMG_RE = /https?:\/\/[^\s"'<>\\)]+\.(?:jpg|jpeg|png|webp|gif|avif)/gi
const SHA_RE = /cdn-mirror\/([a-f0-9]{64})\.(\w+)/i
const PRIORITY: Record<string, number> = { brand: 5, theme: 4, collection: 3, product: 2, article: 1, upload: 0, other: 0 }
const KIND: Record<string, string> = { brand: 'logo', theme: 'banner', collection: 'image', product: 'product', article: 'article', upload: 'image', other: 'image' }

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // sha256 → { url, ext, usage[], sources:Set }
    const media = new Map<string, { url: string; ext: string; usage: any[]; sources: Set<string> }>()
    const add = (url: string, entry: any, srcType: string) => {
      const m = SHA_RE.exec(url || '')
      if (!m) return
      let rec = media.get(m[1])
      if (!rec) { rec = { url, ext: m[2], usage: [], sources: new Set() }; media.set(m[1], rec) }
      rec.usage.push(entry)
      rec.sources.add(srcType)
    }

    const pi = await query(`SELECT pi.url, pi.product_id, pi.sort_order, p.title FROM product_images pi JOIN products p ON p.id = pi.product_id`, [])
    pi.rows.forEach((r: any) => add(r.url, { refType: 'product', refId: r.product_id, refTitle: r.title, sortOrder: r.sort_order }, 'product'))

    const arts = await query(`SELECT id, title, image_url, body FROM articles`, [])
    for (const a of arts.rows as any[]) {
      if (a.image_url) add(a.image_url, { refType: 'article', refId: a.id, refTitle: a.title, featured: true }, 'article')
      for (const u of new Set((a.body || '').match(IMG_RE) || [])) add(u as string, { refType: 'article-body', refId: a.id, refTitle: a.title }, 'article')
    }

    const secs = await query(`SELECT id, type, config::text AS c FROM homepage_sections`, [])
    for (const s of secs.rows as any[]) {
      for (const u of new Set((s.c || '').match(IMG_RE) || [])) add(u as string, { refType: 'theme', refId: s.id, refTitle: s.type }, 'theme')
    }

    const hs = await query(`SELECT value FROM site_settings WHERE key = 'header_settings'`, [])
    const logo = hs.rows[0]?.value?.logoUrl
    if (logo) add(logo, { refType: 'brand', refId: 0, refTitle: 'Header logo' }, 'brand')

    // Upsert all referenced objects
    const perSource: Record<string, number> = {}
    for (const [sha, m] of media) {
      const source = [...m.sources].sort((a, b) => (PRIORITY[b] || 0) - (PRIORITY[a] || 0))[0] || 'other'
      perSource[source] = (perSource[source] || 0) + 1
      await query(
        `INSERT INTO media (url, filename, sha256, source, kind, usage, used_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW(), NOW())
         ON CONFLICT (sha256) WHERE sha256 IS NOT NULL DO UPDATE SET
           url = EXCLUDED.url, source = EXCLUDED.source, kind = EXCLUDED.kind,
           usage = EXCLUDED.usage, used_count = EXCLUDED.used_count, updated_at = NOW()`,
        [m.url, `${sha.slice(0, 12)}.${m.ext}`, sha, source, KIND[source] || 'image', JSON.stringify(m.usage), m.usage.length]
      )
    }

    // Anything in the index no longer referenced anywhere (and not a manual
    // upload) becomes used_count = 0 → flagged as orphaned for review.
    const referenced = [...media.keys()]
    if (referenced.length > 0) {
      await query(
        `UPDATE media SET used_count = 0, updated_at = NOW()
         WHERE source <> 'upload' AND sha256 IS NOT NULL AND sha256 <> ALL($1::text[])`,
        [referenced]
      )
    }
    const orphans = await query(`SELECT COUNT(*)::int AS n FROM media WHERE COALESCE(used_count,0) = 0`, [])

    return NextResponse.json({
      ok: true,
      indexed: media.size,
      perSource,
      orphaned: orphans.rows[0].n,
    })
  } catch (err) {
    console.error('[api/admin/media/sync] POST error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
