#!/usr/bin/env node
/**
 * Search-and-replace script for DaVinciOS deep fork rebrand.
 *
 * Runs word-boundary-aware replacements on all .js, .mjs, .d.ts files
 * in the specified directory tree, renaming internal Payload CMS
 * references to DaVinciOS equivalents.
 *
 * Usage:
 *   node plans/replace-in-dir.mjs <target-dir>
 *
 * Example:
 *   node plans/replace-in-dir.mjs packages/davincios/dist
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, extname, resolve } from 'path'

const EXTENSIONS = new Set(['.js', '.mjs', '.d.ts', '.cjs'])

const REPLACEMENTS = [
  // Exact full-word matches — order matters (longer patterns first)
  [/\bPAYLOAD_PUBLIC_SERVER_URL\b/g, 'DAVINCIOS_PUBLIC_SERVER_URL'],
  [/\bPAYLOAD_PUBLIC_URL\b/g, 'DAVINCIOS_PUBLIC_URL'],
  [/\bPAYLOAD_SECRET\b/g, 'DAVINCIOS_SECRET'],
  [/\bPAYLOAD_CONFIG_PATH\b/g, 'DAVINCIOS_CONFIG_PATH'],
  [/\bPAYLOAD_DISABLE_ADMIN\b/g, 'DAVINCIOS_DISABLE_ADMIN'],
  [/\bPAYLOAD_DROP_DATABASE\b/g, 'DAVINCIOS_DROP_DATABASE'],
  [/\bPAYLOAD_PATCH_TURBOPACK_WARNINGS\b/g, 'DAVINCIOS_PATCH_TURBOPACK_WARNINGS'],
  [/\bPAYLOAD_CACHE_COMPONENTS_ENABLED\b/g, 'DAVINCIOS_CACHE_COMPONENTS_ENABLED'],
  [/\bPAYLOAD_PUBLIC_SERVER_URL\b/g, 'DAVINCIOS_PUBLIC_SERVER_URL'],
  // Uppercase standalone
  [/\bPAYLOAD\b/g, 'DAVINCIOS'],
  // TitleCase: word-boundary matches and camelCase transitions
  [/\bPayload\b/g, 'DaVinciOS'],
  [/([a-z])Payload/g, '$1DaVinciOS'],     // e.g. getPayload → getDaVinciOS
  [/Payload([A-Z])/g, 'DaVinciOS$1'],     // e.g. PayloadClient → DaVinciOSClient
  // lowercase: word-boundary matches and camelCase transitions
  [/\bpayload\b/g, 'davincios'],
  [/([a-z])payload/g, '$1davincios'],     // e.g. newLinkPayload → newLinkdavincios
  [/payload([A-Z])/g, 'davincios$1'],     // e.g. payloadCookie → davinciosCookie
  // Package scopes and URLs
  [/@DaVinciOScms\//g, '@davincios/'],
  [/@payloadcms\//g, '@davincios/'],
  [/payloadcms\.com/g, 'davincios.com'],
  [/packages\/payload/g, 'packages/davincios'],
  // GitHub repos
  [/github\.com\/payloadcms\/payload/g, 'github.com/davincios/davincios'],
  // Author/maintainer strings
  [/Payload <dev@payloadcms\.com>/g, 'DaVinciOS Team <dev@davincios.com>'],
  [/Payload \(https:\/\/payloadcms\.com\)/g, 'DaVinciOS (https://davincios.com)'],
  [/Payload CMS/g, 'DaVinciOS CMS'],
  ['"payload"', '"davincios"'],
  ["'payload'", "'davincios'"],
  // CLI binary name
  [/"bin":\s*\{\s*"payload"\s*:/g, '"bin": { "davincios":'],
]

function walk(dir) {
  const results = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walk(fullPath))
      } else if (EXTENSIONS.has(extname(fullPath))) {
        results.push(fullPath)
      }
    }
  } catch (err) {
    console.error(`  Error reading directory ${dir}: ${err.message}`)
  }
  return results
}

function main() {
  const targetDir = resolve(process.argv[2])
  if (!targetDir) {
    console.error('Usage: node replace-in-dir.mjs <target-dir>')
    process.exit(1)
  }

  if (!statSync(targetDir, { throwIfNoEntry: false })) {
    console.error(`Directory not found: ${targetDir}`)
    process.exit(1)
  }

  console.log(`Processing files in: ${targetDir}`)
  const files = walk(targetDir)
  console.log(`Found ${files.length} files to process.`)

  let patchedCount = 0
  let totalReplacements = 0

  for (const file of files) {
    let content = readFileSync(file, 'utf-8')
    const original = content
    let fileReplacements = 0

    for (const [pattern, replacement] of REPLACEMENTS) {
      const before = content
      content = content.replace(pattern, replacement)
      const diff = (before.match(pattern) || []).length
      fileReplacements += diff
    }

    if (content !== original) {
      writeFileSync(file, content, 'utf-8')
      patchedCount++
      totalReplacements += fileReplacements
      console.log(`  [${fileReplacements}] ${file}`)
    }
  }

  console.log(`\nDone! ${patchedCount} files patched with ${totalReplacements} total replacements.`)
}

main()
