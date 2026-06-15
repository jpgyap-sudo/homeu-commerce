#!/usr/bin/env node
/**
 * Comprehensive sweep — removes ALL "payload" references from dist files.
 * Operates on .js, .d.ts, .cjs, .mjs, .js.map, .d.ts.map files.
 * Also renames files on disk that still have "Payload" or "payload" in their names.
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

// All dist directories that need processing
const ROOTS = [
  // === Source packages (local development) ===
  'packages/davincios/dist',
  'packages/next/dist',
  'packages/richtext-lexical/dist',
  'packages/db-postgres/dist',

  // === Dev node_modules copies ===
  'apps/website/node_modules/@davincios/cms/dist',
  'apps/website/node_modules/@davincios/next/dist',
  'apps/website/node_modules/@davincios/richtext-lexical/dist',
  'apps/website/node_modules/@davincios/db-postgres/dist',
  'apps/website/node_modules/@davincios/ui/dist',
  'apps/website/node_modules/@davincios/graphql/dist',
  'apps/website/node_modules/@davincios/translations/dist',
  'apps/website/node_modules/@davincios/drizzle/dist',

  // === Docker build target paths (website is at root in Docker context) ===
  'website/node_modules/@davincios/cms/dist',
  'website/node_modules/@davincios/next/dist',
  'website/node_modules/@davincios/richtext-lexical/dist',
  'website/node_modules/@davincios/db-postgres/dist',
  'website/node_modules/@davincios/ui/dist',
  'website/node_modules/@davincios/graphql/dist',
  'website/node_modules/@davincios/translations/dist',
  'website/node_modules/@davincios/drizzle/dist',
]

const EXTENSIONS = ['.js', '.d.ts', '.cjs', '.mjs', '.js.map', '.d.ts.map']

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
  modified = modified.replace(/\bwithPayload\b/g, 'withDaVinciOS')
  modified = modified.replace(/\bgetPayloadHMR\b/g, 'getDaVinciOSHMR')
  modified = modified.replace(/\bsetPayloadAuthCookie\b/g, 'setDaVinciOSAuthCookie')
  modified = modified.replace(/\bgeneratePayloadCookie\b/g, 'generateDaVinciOSCookie')
  modified = modified.replace(/\bcheckPayloadDependencies\b/g, 'checkDaVinciOSDependencies')
  modified = modified.replace(/\bpayloadPopulateFn\b/g, 'daVinciOSPopulateFn')
  modified = modified.replace(/\bpayloadRequestCache\b/g, 'daVinciOSRequestCache')
  modified = modified.replace(/\bPAYLOAD_PACKAGE_LIST\b/g, 'DaVinciOS_PACKAGE_LIST')
  modified = modified.replace(/\bpayloadPackageList\b/g, 'DaVinciOSPackageList')
  modified = modified.replace(/\bwithPayloadLegacy\b/g, 'withDaVinciOSLegacy')
  modified = modified.replace(/\baddPayloadComponentToImportMap\b/g, 'addDaVinciOSComponentToImportMap')
  modified = modified.replace(/\bparsePayloadComponent\b/g, 'parseDaVinciOSComponent')
  modified = modified.replace(/\bcreatePayloadRequest\b/g, 'createDaVinciOSRequest')
  modified = modified.replace(/\busePayloadAPI\b/g, 'useDaVinciOSAPI')

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
  modified = modified.replace(/\/\/# sourceMappingURL=withPayloadLegacy/g, '//# sourceMappingURL=withDaVinciOSLegacy')
  modified = modified.replace(/\/\/# sourceMappingURL=withPayload/g, '//# sourceMappingURL=withDaVinciOS')
  modified = modified.replace(/\/\/# sourceMappingURL=checkPayloadDependencies/g, '//# sourceMappingURL=checkDaVinciOSDependencies')
  modified = modified.replace(/\/\/# sourceMappingURL=payloadPackageList/g, '//# sourceMappingURL=DaVinciOSPackageList')
  modified = modified.replace(/\/\/# sourceMappingURL=addPayloadComponentToImportMap/g, '//# sourceMappingURL=addDaVinciOSComponentToImportMap')
  modified = modified.replace(/\/\/# sourceMappingURL=parsePayloadComponent/g, '//# sourceMappingURL=parseDaVinciOSComponent')
  modified = modified.replace(/\/\/# sourceMappingURL=createPayloadRequest/g, '//# sourceMappingURL=createDaVinciOSRequest')
  modified = modified.replace(/\/\/# sourceMappingURL=getPayloadHMR/g, '//# sourceMappingURL=getDaVinciOSHMR')
  modified = modified.replace(/\/\/# sourceMappingURL=setPayloadAuthCookie/g, '//# sourceMappingURL=setDaVinciOSAuthCookie')
  modified = modified.replace(/\/\/# sourceMappingURL=payloadPopulateFn/g, '//# sourceMappingURL=daVinciOSPopulateFn')
  modified = modified.replace(/\/\/# sourceMappingURL=usePayloadAPI/g, '//# sourceMappingURL=useDaVinciOSAPI')

  // Pattern 12: sourceMappingURL for .map files (JSON references)
  // e.g., "sources":["createPayloadRequest.js"] -> "sources":["createDaVinciOSRequest.js"]
  modified = modified.replace(/"payloadPackageList"/g, '"DaVinciOSPackageList"')
  modified = modified.replace(/"withPayloadLegacy"/g, '"withDaVinciOSLegacy"')
  modified = modified.replace(/"withPayload"/g, '"withDaVinciOS"')
  modified = modified.replace(/"checkPayloadDependencies"/g, '"checkDaVinciOSDependencies"')
  modified = modified.replace(/"addPayloadComponentToImportMap"/g, '"addDaVinciOSComponentToImportMap"')
  modified = modified.replace(/"parsePayloadComponent"/g, '"parseDaVinciOSComponent"')
  modified = modified.replace(/"createPayloadRequest"/g, '"createDaVinciOSRequest"')
  modified = modified.replace(/"getPayloadHMR"/g, '"getDaVinciOSHMR"')
  modified = modified.replace(/"setPayloadAuthCookie"/g, '"setDaVinciOSAuthCookie"')
  modified = modified.replace(/"payloadPopulateFn"/g, '"daVinciOSPopulateFn"')
  modified = modified.replace(/"usePayloadAPI"/g, '"useDaVinciOSAPI"')

  count = [...content].filter((_, i) => content[i] !== modified[i]).length

  return { changed: content !== modified, content: modified, count }
}

/**
 * Rename files on disk whose names still contain "Payload" or "payload" patterns.
 * This runs AFTER content replacement so imports already point to the new names.
 *
 * Entries are ORDERED from MOST specific to LEAST specific because the loop
 * breaks on the first match (prevents partial/incorrect matches).
 */
function renameFilesOnDisk(rootPath) {
  const renameMap = [
    // MOST SPECIFIC FIRST — these must match before less-specific patterns
    ['withPayloadLegacy', 'withDaVinciOSLegacy'],
    ['withPayload', 'withDaVinciOS'],
    ['addPayloadComponentToImportMap', 'addDaVinciOSComponentToImportMap'],
    ['parsePayloadComponent', 'parseDaVinciOSComponent'],
    ['createPayloadRequest', 'createDaVinciOSRequest'],
    ['checkPayloadDependencies', 'checkDaVinciOSDependencies'],
    ['payloadPackageList', 'DaVinciOSPackageList'],
    ['payloadPopulateFn', 'daVinciOSPopulateFn'],
    ['payload-favicon', 'davincios-favicon'],
    ['payload-logo', 'davincios-logo'],
    ['getPayloadHMR', 'getDaVinciOSHMR'],
    ['setPayloadAuthCookie', 'setDaVinciOSAuthCookie'],
    ['usePayloadAPI', 'useDaVinciOSAPI'],
    ['Payload', 'DaVinciOS'],          // Generic catch-all for uppercase P
  ]

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
          for (const [old, next] of renameMap) {
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
          for (const [old, next] of renameMap) {
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
