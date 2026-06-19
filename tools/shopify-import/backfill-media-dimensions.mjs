/**
 * Backfill width/height (and filesize) for media rows that are missing them.
 * Fetches only the first 64KB of each image (enough for the header in jpg/png/
 * webp/gif) and falls back to a full fetch if that isn't enough. Concurrency 10.
 *
 *   node backfill-media-dimensions.mjs            # local DB
 *   node backfill-media-dimensions.mjs --emit-sql # also write output/media-dims.sql
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from '../../node_modules/pg/lib/index.js'
import { imageSize } from '../../node_modules/image-size/dist/index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uri = (fs.readFileSync(path.join(__dirname, '..', '..', 'apps', 'website', '.env'), 'utf8')
  .match(/DATABASE_URI=(.*)/) || [])[1]?.trim()

async function dimsFor(url) {
  // Try a partial fetch first (header bytes), then a full fetch if needed.
  for (const range of ['bytes=0-65535', null]) {
    try {
      const res = await fetch(url, range ? { headers: { Range: range } } : {})
      if (!res.ok && res.status !== 206) continue
      const buf = Buffer.from(await res.arrayBuffer())
      try {
        const d = imageSize(buf)
        if (d.width && d.height) return { width: d.width, height: d.height, bytes: Number(res.headers.get('content-range')?.split('/')?.[1]) || (range ? null : buf.length) }
      } catch { /* need more bytes — fall through to full fetch */ }
    } catch { /* network — try next */ }
  }
  return null
}

async function main() {
  const emit = process.argv.includes('--emit-sql')
  const pool = new pg.Pool({ connectionString: uri })
  const res = await pool.query(`SELECT id, url FROM media WHERE width IS NULL AND url IS NOT NULL ORDER BY id`)
  const rows = res.rows
  console.log(`${rows.length} media rows missing dimensions`)

  const sql = ['-- Media dimension backfill (generated)', 'SET client_min_messages TO WARNING;', 'BEGIN;']
  let ok = 0, fail = 0, idx = 0
  const CONCURRENCY = 10

  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++]
      const d = await dimsFor(row.url)
      if (d) {
        await pool.query(
          `UPDATE media SET width=$1, height=$2, filesize=COALESCE(filesize,$3), updated_at=NOW() WHERE id=$4`,
          [d.width, d.height, d.bytes, row.id])
        if (emit) sql.push(`UPDATE media SET width=${d.width}, height=${d.height} WHERE id=${row.id};`)
        ok++
      } else { fail++ }
      if ((ok + fail) % 100 === 0) console.log(`  …${ok + fail}/${rows.length} (${ok} ok, ${fail} fail)`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await pool.end()

  console.log(`Done: ${ok} updated, ${fail} could not be measured.`)
  if (emit) {
    sql.push('COMMIT;')
    fs.writeFileSync(path.join(__dirname, 'output', 'media-dims.sql'), sql.join('\n'), 'utf8')
    console.log('VPS sync SQL: output/media-dims.sql')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
