#!/usr/bin/env node
/**
 * Comprehensive sweep — removes ALL "payload" references from dist files.
 * Operates on .js, .d.ts, .cjs, .mjs files (NOT .js.map — those are skipped).
 * Also renames files on disk that still have "Payload" in their names.
 * TypeScript type names like PayloadRequest, PayloadComponent are preserved as-is
 * since they are still the correct exported type names from @davincios/cms.
 *
 * Run: node scripts/strip-payload.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs'
import { join, extname, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')

const ROOTS = [
  // During Docker build, packages are copied to node_modules/@davincios/
  // These paths are relative to the project root (parent of scripts/)
  'website/node_modules/@davincios/cms/dist',
  'website/node_modules/@davincios/next/dist',
]

const EXTENSIONS = ['.js', '.d.ts', '.cjs', '.mjs']

// Track stats
let totalFiles = 0
let totalChanged = 0
let totalReplacements = 0
let totalRenamed = 0

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
  // e.g.: from 'payload' -> from 'davincios'
  // e.g.: from "@payloadcms/..." -> from "@davincios/..."
  modified = modified.replace(
    /from\s+['"]@?payloadcms['"](\/.*)?/g,
    (match) => match.replace(/@?payloadcms/g, 'davincios')
  )
  // e.g.: from 'payload' -> from 'davincios' 
  modified = modified.replace(
    /from\s+['"]payload['"]/g,
    "from 'davincios'"
  )
  // e.g.: from "payload" -> from "davincios"
  modified = modified.replace(
    /from\s+["]payload["]/g,
    'from "davincios"'
  )

  // Pattern 2: require('payload') -> require('davincios')
  modified = modified.replace(
    /require\(['"]@?payloadcms['"](\/.*)?\)/g,
    (match) => match.replace(/@?payloadcms/g, 'davincios')
  )
  modified = modified.replace(
    /require\(['"]payload['"]\)/g,
    "require('davincios')"
  )

  // Pattern 3: import('payload') -> import('davincios')
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
  // withPayload -> withDaVinciOS
  modified = modified.replace(/\bwithPayload\b/g, 'withDaVinciOS')
  // getPayloadHMR -> getDaVinciOSHMR
  modified = modified.replace(/\bgetPayloadHMR\b/g, 'getDaVinciOSHMR')
  // setPayloadAuthCookie -> setDaVinciOSAuthCookie
  modified = modified.replace(/\bsetPayloadAuthCookie\b/g, 'setDaVinciOSAuthCookie')
  // generatePayloadCookie -> generateDaVinciOSCookie
  modified = modified.replace(/\bgeneratePayloadCookie\b/g, 'generateDaVinciOSCookie')
  // checkPayloadDependencies -> checkDaVinciOSDependencies
  modified = modified.replace(/\bcheckPayloadDependencies\b/g, 'checkDaVinciOSDependencies')
  // payloadPopulateFn -> daVinciOSPopulateFn  (or similar)
  modified = modified.replace(/\bpayloadPopulateFn\b/g, 'daVinciOSPopulateFn')
  // payloadRequestCache -> daVinciOSRequestCache
  modified = modified.replace(/\bpayloadRequestCache\b/g, 'daVinciOSRequestCache')
  // PAYLOAD_PACKAGE_LIST -> DaVinciOS_PACKAGE_LIST
  modified = modified.replace(/\bPAYLOAD_PACKAGE_LIST\b/g, 'DaVinciOS_PACKAGE_LIST')
  // payloadPackageList -> DaVinciOSPackageList
  modified = modified.replace(/\bpayloadPackageList\b/g, 'DaVinciOSPackageList')
  // withPayloadLegacy -> withDaVinciOSLegacy
  modified = modified.replace(/\bwithPayloadLegacy\b/g, 'withDaVinciOSLegacy')

  // Pattern 7: getPayload function name -> getDaVinciOS
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

  // Pattern 11: sourceMappingURL references to old filenames
  modified = modified.replace(/\/\/# sourceMappingURL=withPayload/g, '//# sourceMappingURL=withDaVinciOS')
  modified = modified.replace(/\/\/# sourceMappingURL=checkPayloadDependencies/g, '//# sourceMappingURL=checkDaVinciOSDependencies')
  modified = modified.replace(/\/\/# sourceMappingURL=payloadPackageList/g, '//# sourceMappingURL=DaVinciOSPackageList')
  modified = modified.replace(/\/\/# sourceMappingURL=withPayloadLegacy/g, '//# sourceMappingURL=withDaVinciOSLegacy')

  count = [...content].filter((_, i) => content[i] !== modified[i]).length

  return { changed: content !== modified, content: modified, count }
}

/**
 * Rename files on disk whose names still contain "Payload" or "payload" patterns.
 * This runs AFTER content replacement so imports already point to the new names.
 */
function renameFilesOnDisk(rootPath) {
  const renameMap = {
    'checkPayloadDependencies': 'checkDaVinciOSDependencies',
    'payloadPackageList': 'DaVinciOSPackageList',
    'withPayload': 'withDaVinciOS',
  }

  let renamedCount = 0

  // Walk directories — use a stack to handle renames safely
  // First pass: collect all files and dirs that need renaming, do it bottom-up
  function collectRenames(dir) {
    const items = []
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          // Recurse first (depth-first)
          const subItems = collectRenames(fullPath)
          items.push(...subItems)
          // Check if this directory itself needs renaming
          let newName = entry.name
          for (const [old, next] of Object.entries(renameMap)) {
            if (newName.includes(old)) {
              newName = newName.replace(old, next)
              break
            }
          }
          if (newName !== entry.name) {
            items.push({ from: fullPath, to: join(dir, newName) })
          }
        } else {
          // Check if file needs renaming
          let newName = entry.name
          for (const [old, next] of Object.entries(renameMap)) {
            if (newName.includes(old)) {
              newName = newName.replace(old, next)
              break
            }
          }
          if (newName !== entry.name) {
            items.push({ from: fullPath, to: join(dir, newName) })
          }
        }
      }
    } catch { /* skip unreadable */ }
    return items
  }

  const renames = collectRenames(rootPath)
  // Process bottom-up (children before parents)
  renames.sort((a, b) => b.from.length - a.from.length)

  for (const { from, to } of renames) {
    try {
      renameSync(from, to)
      renamedCount++
      const relFrom = relative(ROOT, from).replace(/\\/g, '/')
      const relTo = relative(ROOT, to).replace(/\\/g, '/')
      console.log(`  ↻ Renamed: ${relFrom} -> ${relTo}`)
    } catch (err) {
      console.error(`  ✗ Failed to rename ${from}: ${err.message}`)
    }
  }

  return renamedCount
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

  // Phase 2: Rename files on disk that still have old "Payload" names
  console.log(`\nRenaming files with "Payload" in name under ${rootRel}/...`)
  const renamed = renameFilesOnDisk(rootPath)
  totalRenamed += renamed
  console.log(`  Renamed ${renamed} files/directories`)
}

console.log(`\n═══════════════════════════════════════`)
console.log(`  Files scanned:  ${totalFiles}`)
console.log(`  Files modified: ${totalChanged}`)
console.log(`  Replacements:   ${totalReplacements}`)
console.log(`  Files renamed:  ${totalRenamed}`)
console.log(`═══════════════════════════════════════`)
