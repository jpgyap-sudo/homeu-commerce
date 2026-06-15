#!/usr/bin/env node
/**
 * Comprehensive sweep — removes ALL "payload" references from dist files.
 * Operates on .js, .d.ts, .cjs, .mjs files (NOT .js.map — those are skipped).
 * TypeScript type names like PayloadRequest, PayloadComponent are preserved as-is
 * since they are still the correct exported type names from @davincios/cms.
 *
 * Run: node scripts/strip-payload.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')

const ROOTS = [
  'apps/website/node_modules/DaVinciOS/dist',
]

const EXTENSIONS = ['.js', '.d.ts', '.cjs', '.mjs']

// Track stats
let totalFiles = 0
let totalChanged = 0
let totalReplacements = 0

function walk(dir) {
  let results = []
  try {
    const list = readdirSync(dir)
    for (const file of list) {
      const fullPath = join(dir, file)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          results = results.concat(walk(fullPath))
        } else {
          const ext = extname(file)
          if (EXTENSIONS.includes(ext)) {
            results.push(fullPath)
          }
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dirs */ }
  return results
}

/**
 * Apply targeted replacements to a file's content.
 * Returns { changed: boolean, content: string, count: number }
 */
function replaceContent(content, filePath) {
  let modified = content
  let count = 0

  // Pattern 1: Import from 'payload' — replace package name only
  // e.g.: from 'payload' → from 'davincios'
  // e.g.: from "@payloadcms/..." → from "@davincios/..."
  modified = modified.replace(
    /from\s+['"]@?payloadcms['"](\/.*)?/g,
    (match) => match.replace(/@?payloadcms/g, 'davincios')
  )
  // e.g.: from 'payload' → from 'davincios' 
  modified = modified.replace(
    /from\s+['"]payload['"]/g,
    "from 'davincios'"
  )
  // e.g.: from "payload" → from "davincios"
  modified = modified.replace(
    /from\s+["]payload["]/g,
    'from "davincios"'
  )

  // Pattern 2: require('payload') → require('davincios')
  modified = modified.replace(
    /require\(['"]@?payloadcms['"](\/.*)?\)/g,
    (match) => match.replace(/@?payloadcms/g, 'davincios')
  )
  modified = modified.replace(
    /require\(['"]payload['"]\)/g,
    "require('davincios')"
  )

  // Pattern 3: import('payload') → import('davincios')
  modified = modified.replace(
    /import\(['"]@?payloadcms['"](\/.*)?\)/g,
    (match) => match.replace(/@?payloadcms/g, 'davincios')
  )
  modified = modified.replace(
    /import\(['"]payload['"]\)/g,
    "import('davincios')"
  )

  // Pattern 4: '@payloadcms/...' string literals (in exports, re-exports, etc.)
  modified = modified.replace(
    /['"`]@payloadcms\//g,
    (match) => match.replace('@payloadcms/', '@davincios/')
  )

  // Pattern 5: PAYLOAD_ environment variables
  modified = modified.replace(/PAYLOAD_SECRET/g, 'DAVINCIOS_SECRET')
  modified = modified.replace(/PAYLOAD_PUBLIC_SERVER_URL/g, 'DAVINCIOS_PUBLIC_SERVER_URL')
  modified = modified.replace(/PAYLOAD_TELEMETRY_DISABLED/g, 'DAVINCIOS_TELEMETRY_DISABLED')
  modified = modified.replace(/PAYLOAD_MIGRATING/g, 'DAVINCIOS_MIGRATING')
  modified = modified.replace(/PAYLOAD_CACHE_COMPONENTS_ENABLED/g, 'DAVINCIOS_CACHE_COMPONENTS_ENABLED')
  modified = modified.replace(/PAYLOAD_DISABLE_ADMIN/g, 'DAVINCIOS_DISABLE_ADMIN')
  modified = modified.replace(/PAYLOAD_CONFIG_PATH/g, 'DAVINCIOS_CONFIG_PATH')
  modified = modified.replace(/PAYLOAD_PATH/g, 'DAVINCIOS_PATH')

  // Pattern 6: Known renamed function names
  // withPayload → withDaVinciOS
  modified = modified.replace(/\bwithPayload\b/g, 'withDaVinciOS')
  // getPayloadHMR → getDaVinciOSHMR
  modified = modified.replace(/\bgetPayloadHMR\b/g, 'getDaVinciOSHMR')
  // setPayloadAuthCookie → setDaVinciOSAuthCookie
  modified = modified.replace(/\bsetPayloadAuthCookie\b/g, 'setDaVinciOSAuthCookie')
  // generatePayloadCookie → generateDaVinciOSCookie
  modified = modified.replace(/\bgeneratePayloadCookie\b/g, 'generateDaVinciOSCookie')
  // checkPayloadDependencies → checkDaVinciOSDependencies
  modified = modified.replace(/\bcheckPayloadDependencies\b/g, 'checkDaVinciOSDependencies')
  // payloadPopulateFn → daVinciOSPopulateFn  (or similar)
  modified = modified.replace(/\bpayloadPopulateFn\b/g, 'daVinciOSPopulateFn')
  // payloadRequestCache → daVinciOSRequestCache
  modified = modified.replace(/\bpayloadRequestCache\b/g, 'daVinciOSRequestCache')

  // Pattern 7: getPayload function name → getDaVinciOS
  // Careful: only match standalone getPayload, not PayloadRequest etc.
  modified = modified.replace(/\bgetPayload\b(?![A-Z])/g, 'getDaVinciOS')

  // Pattern 8: package.json reference to payloadcms as a name/description
  modified = modified.replace(/"@payloadcms\//g, '"@davincios/')
  
  // Pattern 9: Comments with 'payload' (already mostly handled above)
  // Handle case: "payload" as a standalone word in comments or string content
  // Only if it's followed by a non-alphanumeric char (not part of a camelCase type name)
  modified = modified.replace(/\bpayloadcms\b/g, 'davincios')

  // Pattern 10: URL references to payloadcms.com
  modified = modified.replace(/https?:\/\/(www\.)?payloadcms\.com/g, 'https://davincios.com')

  count = [...content].filter((_, i) => content[i] !== modified[i]).length

  return { changed: content !== modified, content: modified, count }
}

for (const rootRel of ROOTS) {
  const rootPath = join(ROOT, rootRel)
  if (!statSync(rootPath, { throwIfNoEntry: false })) {
    console.log(`Skipping ${rootRel} — not found`)
    continue
  }
  const files = walk(rootPath)
  console.log(`\nScanning ${rootRel}/ (${files.length} files)...`)
  
  for (const filePath of files) {
    totalFiles++
    try {
      let content = readFileSync(filePath, 'utf8')
      const { changed, content: newContent, count } = replaceContent(content, filePath)
      
      if (changed) {
        writeFileSync(filePath, newContent, 'utf8')
        totalChanged++
        totalReplacements += count
        const relPath = relative(ROOT, filePath).replace(/\\/g, '/')
        console.log(`  ✓ ${relPath} (${count} changes)`)
      }
    } catch (err) {
      console.error(`  ✗ ${filePath}: ${err.message}`)
    }
  }
}

console.log(`\n═══════════════════════════════════════`)
console.log(`  Files scanned:  ${totalFiles}`)
console.log(`  Files modified: ${totalChanged}`)
console.log(`  Replacements:   ${totalReplacements}`)
console.log(`═══════════════════════════════════════`)
