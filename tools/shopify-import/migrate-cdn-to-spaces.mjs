/**
 * Reverse-migrate cdn.shopify.com image references found in the exported
 * Shopify JSON (tools/shopify-import/output/*.json) into DigitalOcean
 * Spaces, content-addressed and deduped by SHA-256.
 *
 * Read-only against Shopify (plain HTTPS GET on public CDN URLs), writes
 * only to DO Spaces + local manifest/.cdn.json files. Resumable: re-running
 * --scan picks up new URLs, --mirror skips URLs already marked "done" and
 * dedups identical bytes to a single Spaces object.
 *
 * Usage:
 *   node migrate-cdn-to-spaces.mjs --scan
 *   node migrate-cdn-to-spaces.mjs --report
 *   node migrate-cdn-to-spaces.mjs --mirror [--execute] [--limit=N] [--concurrency=N]
 *   node migrate-cdn-to-spaces.mjs --rewrite
 *
 * See .claude/skills/cdn-reverse-migration/SKILL.md for the full workflow.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, 'output')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'cdn-migration-manifest.json')

const INPUT_FILES = [
  'products.json',
  'categories.json',
  'pages.json',
]

const SHOPIFY_CDN_REGEX = /https:\/\/cdn\.shopify\.com\/[^\s"'<>\\)]+/g

function loadEnv() {
  const candidates = [
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '..', 'apps', 'website', '.env'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  }
  return { urls: {}, hashes: {} }
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}

function scan(manifest) {
  let added = 0
  for (const file of INPUT_FILES) {
    const fp = path.join(OUTPUT_DIR, file)
    if (!fs.existsSync(fp)) continue
    const text = fs.readFileSync(fp, 'utf8')
    for (const url of new Set(text.match(SHOPIFY_CDN_REGEX) || [])) {
      if (!manifest.urls[url]) {
        manifest.urls[url] = { status: 'pending' }
        added++
      }
    }
  }
  return added
}

function report(manifest) {
  const urls = Object.values(manifest.urls)
  const done = urls.filter((u) => u.status === 'done')
  const pending = urls.filter((u) => u.status === 'pending')
  const errored = urls.filter((u) => u.status === 'error')
  const totalBytes = Object.values(manifest.hashes).reduce((sum, h) => sum + (h.bytes || 0), 0)
  console.log(`Unique source URLs: ${urls.length}`)
  console.log(`  done:    ${done.length}`)
  console.log(`  pending: ${pending.length}`)
  console.log(`  error:   ${errored.length}`)
  console.log(`Unique content hashes (deduped Spaces objects): ${Object.keys(manifest.hashes).length}`)
  console.log(`Total bytes mirrored: ${totalBytes} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`)
}

function extFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase()
  return ext && ext.length <= 5 ? ext : '.jpg'
}

async function mirror(manifest, { execute, limit, concurrency }) {
  const pending = Object.entries(manifest.urls).filter(([, v]) => v.status === 'pending')
  const batch = limit ? pending.slice(0, limit) : pending

  if (!execute) {
    console.log(`[dry run] would mirror ${batch.length} of ${pending.length} pending URL(s)`)
    for (const [url] of batch.slice(0, 10)) console.log('  ' + url)
    if (batch.length > 10) console.log(`  ... and ${batch.length - 10} more`)
    return
  }

  // DO_SPACES_ORIGIN_ENDPOINT already embeds the bucket name as a subdomain
  // (https://<bucket>.<region>.digitaloceanspaces.com). The AWS SDK's
  // virtual-hosted-style addressing prepends the bucket again, so the S3
  // client must point at the bare region endpoint instead.
  const s3 = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: false,
  })
  const bucket = process.env.DO_SPACES_BUCKET

  async function processOne(url) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
      const ext = extFromUrl(url)
      const key = `cdn-mirror/${sha256}${ext}`
      const contentType = res.headers.get('content-type') || 'application/octet-stream'

      if (!manifest.hashes[sha256]) {
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ContentType: contentType,
          ACL: 'public-read',
        }))
        manifest.hashes[sha256] = { key, cdnUrl: `${process.env.DO_SPACES_CDN_ENDPOINT}/${key}`, bytes: buf.length }
      }

      manifest.urls[url] = {
        status: 'done',
        sha256,
        spacesKey: manifest.hashes[sha256].key,
        cdnUrl: manifest.hashes[sha256].cdnUrl,
        bytes: buf.length,
        contentType,
      }
      return true
    } catch (err) {
      manifest.urls[url] = { status: 'error', error: String(err.message || err) }
      return false
    }
  }

  let idx = 0
  let okCount = 0
  let errCount = 0
  let active = 0

  await new Promise((resolve) => {
    const pump = () => {
      if (idx >= batch.length && active === 0) return resolve()
      while (active < concurrency && idx < batch.length) {
        const [url] = batch[idx++]
        active++
        processOne(url).then((ok) => {
          active--
          if (ok) okCount++
          else errCount++
          if ((okCount + errCount) % 10 === 0) saveManifest(manifest)
          pump()
        })
      }
    }
    pump()
  })

  saveManifest(manifest)
  console.log(`mirrored ${okCount} ok, ${errCount} error(s)`)
}

function rewrite(manifest) {
  for (const file of INPUT_FILES) {
    const fp = path.join(OUTPUT_DIR, file)
    if (!fs.existsSync(fp)) continue
    let text = fs.readFileSync(fp, 'utf8')
    let replaced = 0
    for (const [url, info] of Object.entries(manifest.urls)) {
      if (info.status !== 'done') continue
      if (text.includes(url)) {
        text = text.split(url).join(info.cdnUrl)
        replaced++
      }
    }
    const outFp = fp.replace(/\.json$/, '.cdn.json')
    fs.writeFileSync(outFp, text)
    console.log(`${file}: rewrote ${replaced} URL(s) -> ${path.basename(outFp)}`)
  }
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const manifest = loadManifest()

  if (args.includes('--scan')) {
    const added = scan(manifest)
    saveManifest(manifest)
    console.log(`scan complete, ${added} new URL(s) added to manifest`)
    report(manifest)
  }

  if (args.includes('--report')) {
    report(manifest)
  }

  if (args.includes('--mirror')) {
    const execute = args.includes('--execute')
    const limitArg = args.find((a) => a.startsWith('--limit='))
    const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))
    await mirror(manifest, {
      execute,
      limit: limitArg ? parseInt(limitArg.split('=')[1], 10) : null,
      concurrency: concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 5,
    })
  }

  if (args.includes('--rewrite')) {
    rewrite(manifest)
  }

  if (args.length === 0) {
    console.log('Usage: node migrate-cdn-to-spaces.mjs --scan | --report | --mirror [--execute] [--limit=N] [--concurrency=N] | --rewrite')
  }
}

main()
