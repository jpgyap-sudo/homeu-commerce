#!/usr/bin/env node
/**
 * Instagram Sync Script
 * 
 * Syncs Instagram posts into the DaVinciOS instagram_posts table.
 * Uses Instagram Basic Display API (personal accounts) or Facebook Graph API.
 * 
 * Usage:
 *   node tools/instagram-sync.mjs          # Full sync (latest 25 posts)
 *   node tools/instagram-sync.mjs --full   # Sync all available posts
 *   node tools/instagram-sync.mjs --dry    # Dry run: show what would be imported
 * 
 * Cron: */6 * * * * (every 6 hours)
 * 
 * Required env vars:
 *   INSTAGRAM_ACCESS_TOKEN — long-lived token (60 days, auto-refreshable)
 *   DATABASE_URI — PostgreSQL connection string
 */

import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Config ──────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(process.cwd(), 'apps/website/.env')
  try {
    const envContent = readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/)
      if (match) process.env[match[1]] = match[2]
    }
  } catch {
    console.warn('⚠️  Could not load .env file, using process.env')
  }
}

loadEnv()

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const DB_URI = process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@localhost:5432/homeu'

if (!TOKEN) {
  console.error('❌ INSTAGRAM_ACCESS_TOKEN not set in .env')
  process.exit(1)
}

const API_BASE = 'https://graph.instagram.com'
const DRY_RUN = process.argv.includes('--dry')
const FULL_SYNC = process.argv.includes('--full')

const pool = new Pool({ connectionString: DB_URI })

// ── Types ───────────────────────────────────────────────────────────────

interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  children?: { data: { media_url: string; id: string }[] }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📸 Instagram Sync — ${new Date().toISOString()}`)
  console.log(`${DRY_RUN ? '🔍 DRY RUN' : '📥 IMPORT MODE'}${FULL_SYNC ? ' (FULL)' : ''}\n`)

  try {
    // 1. Fetch media from Instagram API
    const media = await fetchMedia(FULL_SYNC)
    console.log(`📡 Fetched ${media.length} posts from Instagram API`)

    // 2. Check existing posts
    const { rows: existing } = await pool.query('SELECT instagram_media_id FROM instagram_posts WHERE instagram_media_id IS NOT NULL')
    const existingIds = new Set(existing.map((r: any) => r.instagram_media_id))
    const newMedia = media.filter(m => !existingIds.has(m.id))

    console.log(`📊 New posts to import: ${newMedia.length} (${media.length - newMedia.length} already synced)\n`)

    if (newMedia.length === 0) {
      console.log('✅ Nothing to sync — all posts already imported')
      await pool.end()
      return
    }

    // 3. Import new media
    let imported = 0
    for (const m of newMedia) {
      if (DRY_RUN) {
        console.log(`🔍 [DRY] Would import: ${m.id.padEnd(20)} | ${m.media_type.padEnd(12)} | ${(m.caption || 'No caption').substring(0, 50)}`)
        continue
      }

      await pool.query(
        `INSERT INTO instagram_posts (instagram_media_id, media_type, image_url, thumbnail_url, permalink, caption, is_visible, is_pinned, status, source, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,FALSE,'pending','instagram',NOW())`,
        [m.id, m.media_type, m.media_url, m.thumbnail_url || null, m.permalink, m.caption || null]
      )
      imported++
      console.log(`📥 Imported ${m.id.substring(0, 18).padEnd(20)} | ${m.media_type.padEnd(12)} | ${(m.caption || 'No caption').substring(0, 60)}`)
    }

    // 4. Summary
    console.log(`\n✅ Sync complete: ${DRY_RUN ? `${newMedia.length} would be imported` : `${imported} posts imported`}`)
    console.log(`   Status: all new posts set to 'pending' — review in /admin/apps/instagram`)
    console.log(`   Database: ${existingIds.size + imported} total posts\n`)

  } catch (err: any) {
    console.error('❌ Sync failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// ── API Fetch ───────────────────────────────────────────────────────────

async function fetchMedia(full: boolean): Promise<InstagramMedia[]> {
  const allMedia: InstagramMedia[] = []
  let url = `${API_BASE}/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp${full ? '&limit=100' : '&limit=25'}&access_token=${TOKEN}`

  while (url) {
    const response = await fetch(url)
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(`Instagram API error (${response.status}): ${err?.error?.message || 'Unknown'}`)
    }

    const data = await response.json()
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error(`Unexpected API response: ${JSON.stringify(data).substring(0, 200)}`)
    }

    allMedia.push(...data.data)

    // Pagination
    if (full && data.paging?.next) {
      url = data.paging.next
    } else {
      url = ''
    }
  }

  return allMedia
}

// ── Run ─────────────────────────────────────────────────────────────────

main()
