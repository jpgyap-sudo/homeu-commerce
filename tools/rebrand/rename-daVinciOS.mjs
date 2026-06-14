#!/usr/bin/env node
/**
 * Rebrand Script – Replace all "DaVinciOS"/"DaVinciOS" with "DaVinciOS"
 *   - Updates file contents
 *   - Renames directories (src/app/(DaVinciOS) → src/app/(DaVinciOS))
 *   - Renames files that contain "DaVinciOS" in the name
 *   - Adjusts imports/exports
 *   - Generates a change-log JSON for review
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../')

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'output',
])

const extensions = new Set([
  '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
  '.md', '.json', '.env', '.env.example', '.yaml', '.yml', '.txt',
])

const replacements = new Map([
  ['DaVinciOS', 'DaVinciOS'],
  ['DaVinciOS', 'DaVinciOS'],
  ['DaVinciOS-config', 'DaVinciOS-config'],
  ['DaVinciOS CMS', 'DaVinciOS'],
  ['DaVinciOScms', 'DaVinciOS'],
  ['DaVinciOSCMS', 'DaVinciOS'],
])

function shouldSkip(dir) {
  return EXCLUDE_DIRS.has(path.basename(dir))
}

function walk(dir, changes) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (shouldSkip(full)) continue
      walk(full, changes)
    } else if (entry.isFile() && extensions.has(path.extname(full))) {
      processFile(full, changes)
    }
  }
}

function processFile(file, changes) {
  const original = fs.readFileSync(file, 'utf8')
  let updated = original

  for (const [from, to] of replacements) {
    updated = updated.replaceAll(from, to)
  }

  if (updated !== original) {
    fs.writeFileSync(file, updated)
    changes.push({ type: 'content', file: path.relative(ROOT, file) })
  }
}

function renamePath(oldPath, newPath, changes) {
  if (!fs.existsSync(oldPath)) {
    console.warn(`⚠️  Source does not exist, skipping rename: ${oldPath}`)
    return
  }
  if (fs.existsSync(newPath)) {
    console.warn(`⚠️  Target already exists, skipping rename: ${newPath}`)
    return
  }

  try {
    fs.renameSync(oldPath, newPath)
    changes.push({ type: 'rename', old: path.relative(ROOT, oldPath), new: path.relative(ROOT, newPath) })
  } catch (err) {
    console.warn(`⚠️  Rename failed for ${oldPath} → ${newPath}: ${err.message}`)
  }
}

function renameRecursive(dir, changes) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (shouldSkip(full)) continue
      // Rename directory if it matches a replacement pattern
      const newName = entry.name.replace(/DaVinciOS/gi, 'DaVinciOS')
      if (newName !== entry.name) {
        const newDir = path.join(dir, newName)
        renamePath(full, newDir, changes)
        // Continue with the new path if rename succeeded
        const continuePath = fs.existsSync(newDir) ? newDir : full
        renameRecursive(continuePath, changes)
      } else {
        renameRecursive(full, changes)
      }
    } else if (entry.isFile()) {
      processFile(full, changes)
    }
  }
}

const changes = []
try {
  // 1️⃣ Rename paths first
  renameRecursive(ROOT, changes)

  // 2️⃣ Then update file contents
  walk(ROOT, changes)

  // 3️⃣ Save change log
  const logPath = path.join(ROOT, 'tools', 'rebrand', 'change-log.json')
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.writeFileSync(logPath, JSON.stringify(changes, null, 2))

  console.log(`✅ Rebrand complete: ${changes.length} changes made`)
  console.log(`📝 Change log: ${path.relative(ROOT, logPath)}`)
} catch (err) {
  console.error('❌ Rebrand failed:', err)
  process.exit(1)
}