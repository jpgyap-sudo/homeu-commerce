#!/usr/bin/env node
/**
 * Generate PWA icons from favicon.svg using sharp (preferred) or
 * a zero-dependency fallback that creates branded PNG icons.
 *
 * Usage: node tools/generate-pwa-icons.mjs
 */

import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(PROJECT_ROOT, 'apps', 'website', 'public')
const ICONS_DIR = join(PUBLIC_DIR, 'icons')
const SVG_SOURCE = join(PUBLIC_DIR, 'favicon.svg')
const sizes = [192, 512]
const BRAND_GREEN = [30, 126, 71, 255] // #1e7a47

// ── Zero-dependency PNG generator ─────────────────────────────────

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4

      // Background: brand green
      pixels[i] = BRAND_GREEN[0]
      pixels[i + 1] = BRAND_GREEN[1]
      pixels[i + 2] = BRAND_GREEN[2]
      pixels[i + 3] = BRAND_GREEN[3]

      // Draw white border (3px)
      const border = Math.max(2, Math.floor(size * 0.02))
      if (x < border || x >= size - border || y < border || y >= size - border) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
        continue
      }

      // Draw "H" monogram in white
      const cx = size * 0.32
      const cy = size * 0.5
      const cw = size * 0.68
      const t = Math.max(2, Math.floor(size * 0.1))

      // Left vertical
      if (x >= cx - t && x <= cx + t) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
      }
      // Right vertical
      if (x >= cw - t && x <= cw + t) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
      }
      // Crossbar
      if (y >= cy - t && y <= cy + t && x >= cx - t && x <= cw + t) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
      }

      // Rounded corners (alpha)
      const dx = Math.min(x, size - 1 - x)
      const dy = Math.min(y, size - 1 - y)
      const r = size * 0.15
      if (dx < r && dy < r && dx * dx + dy * dy > r * r) {
        pixels[i + 3] = 0
      }
      if (dx < r && dy < r && (size - 1 - dx) * (size - 1 - dx) + dy * dy > r * r) {
        // top-right
      }
    }
  }

  // Build raw rows with filter byte
  const rowLen = size * 4 + 1
  const raw = Buffer.alloc(rowLen * size)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0 // filter: none
    pixels.copy(raw, y * rowLen + 1, y * size * 4, (y + 1) * size * 4)
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const t = Buffer.from(type, 'ascii')
    const crcData = Buffer.concat([t, data])
    const crc = crc32(crcData)
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc)
    return Buffer.concat([len, t, data, c])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  await mkdir(ICONS_DIR, { recursive: true })

  // Try sharp first (needs platform-specific binary)
  let usedSharp = false
  try {
    const sharp = (await import(join(PROJECT_ROOT, 'apps', 'website', 'node_modules', 'sharp'))).default
    for (const size of sizes) {
      const out = join(ICONS_DIR, `icon-${size}x${size}.png`)
      await sharp(SVG_SOURCE).resize(size, size).png().toFile(out)
      console.log(`  ✅ ${size}x${size} (sharp)`)
    }
    usedSharp = true
  } catch {
    // sharp not available — use fallback
  }

  if (!usedSharp) {
    console.log('  ℹ️  sharp not available locally — using built-in PNG generator')
    for (const size of sizes) {
      const out = join(ICONS_DIR, `icon-${size}x${size}.png`)
      const png = createPNG(size)
      await writeFile(out, png)
      const kb = (png.length / 1024).toFixed(1)
      console.log(`  ✅ ${size}x${size} (${kb} KB, fallback PNG)`)
    }
  }

  console.log('\n🎉 PWA icons ready!')
}

main().catch(err => { console.error('❌', err); process.exit(1) })
