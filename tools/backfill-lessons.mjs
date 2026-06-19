#!/usr/bin/env node
/**
 * HomeU Commerce — Backfill Lessons from Git History
 *
 * Processes all commits since the last lesson date and generates
 * meaningful, deduplicated lessons for the learning layer.
 *
 * Usage:
 *   node tools/backfill-lessons.mjs                    # backfill all
 *   node tools/backfill-lessons.mjs --dry-run           # preview only
 *   node tools/backfill-lessons.mjs --since 2026-06-16  # specific range
 *   node tools/backfill-lessons.mjs --ollama            # use Ollama for summaries
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const LESSON_FILE = path.join(ROOT, 'memory/lessons-learned.md')
const INDEX_FILE = path.join(ROOT, 'memory/lesson-index.jsonl')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const useOllama = args.includes('--ollama')
const sinceIdx = args.indexOf('--since')
const SINCE_DATE = sinceIdx >= 0 ? args[sinceIdx + 1] : '2026-06-14'

// ── Project-specific lesson indicators ──────────────────────────────
const LESSON_INDICATORS = [
  /^feat/i, /^fix/i, /^perf/i, /^refactor/i, /^revert/i,
  /^chore.*(?:build|dep|config|migration)/i,
]

// ── Feature area patterns for tagging ───────────────────────────────
const FEATURE_TAGS = [
  { pattern: /admin|login|dashboard|sidebar/i, tags: ['admin-ui'] },
  { pattern: /collection|category|product|catalog/i, tags: ['catalog'] },
  { pattern: /deploy|docker|vps|ssl|nginx|domain/i, tags: ['deployment'] },
  { pattern: /auth|security|guard|rbac|permission|role|access/i, tags: ['security'] },
  { pattern: /inbox|email|imap|message|central.?inbox/i, tags: ['messaging'] },
  { pattern: /instagram|social|feed|gallery|collage/i, tags: ['instagram'] },
  { pattern: /chatbot|concierge|chat|lead/i, tags: ['chatbot'] },
  { pattern: /analytics|tracking|seo|traffic/i, tags: ['analytics'] },
  { pattern: /db(?:.)?migrate|schema|sql|postgres/i, tags: ['database'] },
  { pattern: /theme|style|css|design|font|brand/i, tags: ['design'] },
  { pattern: /rfq|quote|quotation|crm/i, tags: ['rfq'] },
  { pattern: /e2e|test|qa/i, tags: ['testing'] },
  { pattern: /davincios|rebrand|cms/i, tags: ['davincios'] },
  { pattern: /import|export|sync|shopify|migration/i, tags: ['migration'] },
  { pattern: /docs?/i, tags: ['documentation'] },
  { pattern: /email|mail/i, tags: ['email'] },
  { pattern: /app.?builder|app.?build/i, tags: ['app-builder'] },
  { pattern: /nav|menu|navigation/i, tags: ['navigation'] },
  { pattern: /blog|article|content/i, tags: ['content'] },
  { pattern: /dna|score|product.?complet/i, tags: ['product-dna'] },
]

function detectTags(message, files) {
  const tags = new Set()
  for (const { pattern, tags: t } of FEATURE_TAGS) {
    if (pattern.test(message) || files.some(f => pattern.test(f))) {
      t.forEach(tag => tags.add(tag))
    }
  }
  if (tags.size === 0) tags.add('general')
  return [...tags]
}

function getLessonType(message) {
  if (/^fix/i.test(message)) return 'bugfix'
  if (/^perf/i.test(message)) return 'performance'
  if (/^refactor/i.test(message)) return 'refactor'
  if (/^docs?/i.test(message)) return 'documentation'
  return 'feature'
}

function extractTitle(message) {
  // Remove conventional commit prefix like "feat(scope):" or "fix:"
  let title = message.replace(/^(feat|fix|perf|chore|docs?|refactor|revert)(\([^)]+\))?:\s*/i, '')
  // Remove trailing parenthetical content like (closes #123)
  title = title.replace(/\s*\([^)]*\)\s*$/, '')
  title = title.charAt(0).toUpperCase() + title.slice(1)
  if (title.length > 80) title = title.slice(0, 77) + '...'
  return title
}

function buildLessonContext(message) {
  // Generate a concise summary of what the commit does
  const isFix = /^fix/i.test(message)
  const isFeat = /^feat/i.test(message)
  const isPerf = /^perf/i.test(message)
  const isDoc = /^docs?/i.test(message)

  if (isFix) {
    const desc = message.replace(/^fix(\([^)]+\))?:\s*/i, '')
    return {
      lessonLearned: `Fixes: ${desc}. This resolves a specific issue in the codebase.`,
      rule: `When encountering similar issues, check for the patterns fixed in this commit. Always verify the fix doesn't introduce regressions.`,
    }
  }
  if (isFeat) {
    const desc = message.replace(/^feat(\([^)]+\))?:\s*/i, '')
    return {
      lessonLearned: `Adds: ${desc}. This feature extends the HomeU platform capabilities.`,
      rule: `When extending this feature area, reference this implementation for patterns and conventions.`,
    }
  }
  if (isPerf) {
    return {
      lessonLearned: `Performance optimization: ${message}`,
      rule: `Always profile before optimizing. Apply similar caching/optimization patterns where applicable.`,
    }
  }
  if (isDoc) {
    return {
      lessonLearned: `Documentation update: ${message}`,
      rule: `Keep documentation in sync with code changes. Review docs/ directory for stale content before major changes.`,
    }
  }
  return {
    lessonLearned: `Commit: ${message}. Refer to the commit for full context.`,
    rule: `Review the commit diff at ${message} for implementation details.`,
  }
}

async function summarizeWithOllama(message, files) {
  try {
    const prompt = `You are a senior software engineer extracting engineering lessons from git commits.
Given this commit message and file list, generate a COMPLETE lesson entry in the following format.
Be specific and avoid generic placeholder text. Use concrete technical details.

Commit: ${message}
Files: ${files.join(', ')}

Generate:
{
  "lesson_learned": "Specific, actionable engineering insight from this commit (2-3 sentences)",
  "reusable_rule": "Specific rule future agents should follow when working in this area",
  "bug_cause": "Root cause if this is a fix commit, otherwise 'N/A — feature/improvement'",
  "fix_applied": "What the commit does to address the issue",
  "task_summary": "Concise description of what was accomplished",
  "test_result": "Tests included or verification performed"
}

Return ONLY valid JSON. No markdown, no backticks.`

    const result = execSync(
      `ollama run qwen2.5-coder:7b "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { encoding: 'utf-8', timeout: 30000 }
    ).trim()

    // Try to parse as JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fall through on error
  }
  return null
}

function generateLessonMarkdown(sha, message, author, files, dateStr, index, total) {
  const tags = detectTags(message, files)
  const type = getLessonType(message)
  const title = extractTitle(message)
  const ctx = buildLessonContext(message)
  const shortSha = sha.slice(0, 8)

  // Determine confidence based on how much info we have
  const confidence = files.length > 0 && message.length > 30 ? 'high' : 'medium'

  // Tag area prefix
  const scopeMatch = message.match(/^(\w+)\(([^)]+)\)/)
  const scopePrefix = scopeMatch ? `[${scopeMatch[2]}] ` : ''

  return {
    markdown: `
### Lesson: ${scopePrefix}${title}

Date: ${dateStr}
Source: Git commit ${shortSha}
Model/API used: ${author}
Confidence: ${confidence}
Related files: ${files.slice(0, 8).join(', ')}

#### Task Summary

${ctx.lessonLearned}

#### Files Changed

${files.map(f => `- \`${f}\``).join('\n')}

#### Bug Cause

${type === 'bugfix' ? ctx.lessonLearned : 'N/A — feature/improvement'}

#### Fix Applied

${type === 'bugfix' ? `Commit ${shortSha}: ${message}` : 'Feature addition — see commit for details.'}

#### Test Result

${files.some(f => /test|spec|e2e/i.test(f)) ? 'Tests were included in this commit.' : 'No test files detected in this commit.'}

#### Lesson Learned

${ctx.lessonLearned}

#### Reusable Rule

${ctx.rule}

#### Tags

${tags.join(', ')}

---
`,
    indexEntry: {
      id: `lesson-homeu-${shortSha}`,
      title: `${scopePrefix}${title}`,
      type,
      date: dateStr,
      source: `Git commit ${shortSha}`,
      model: author,
      confidence,
      project: 'homeu-commerce',
      files: files.slice(0, 8),
      tags,
      relevance_score: type === 'bugfix' ? 0.85 : 0.7,
      relevance_factors: {
        is_bug_fix: type === 'bugfix',
        is_feature: type === 'feature',
        affects_multiple_files: files.length > 3,
        has_tests: files.some(f => /test|spec|e2e/i.test(f)),
      },
      rule_summary: ctx.rule,
      lesson_summary: ctx.lessonLearned,
    },
  }
}

async function main() {
  console.log(`\n🔄 HomeU Commerce — Backfill Lessons`)
  console.log(`   Since: ${SINCE_DATE}`)
  console.log(`   Dry run: ${dryRun}`)
  console.log(`   Ollama: ${useOllama}\n`)

  // ── Load existing lessons to deduplicate ──────────────────────────
  let existingContent = ''
  try {
    existingContent = await fs.readFile(LESSON_FILE, 'utf-8')
  } catch {
    existingContent = ''
  }

  let existingIndex = []
  try {
    const idxContent = await fs.readFile(INDEX_FILE, 'utf-8')
    existingIndex = idxContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
  } catch {
    existingIndex = []
  }

  // Collect all existing commit SHAs (8-char) from lessons-learned.md
  const existingShas = new Set()
  const shaMatches = existingContent.matchAll(/commit ([a-f0-9]{8})/g)
  for (const m of shaMatches) existingShas.add(m[1])

  console.log(`   Existing lessons: ${existingIndex.length}`)
  console.log(`   Existing commit SHAs referenced: ${existingShas.size}\n`)

  // ── Get commits from git log ──────────────────────────────────────
  const logFormat = '%H|%s|%an|%ai'
  let gitLog
  try {
    gitLog = execSync(
      `git log --all --since="${SINCE_DATE}" --pretty=format:"${logFormat}"`,
      { cwd: ROOT, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    )
  } catch (err) {
    console.error('Error fetching git log:', err.message)
    process.exit(1)
  }

  const commits = gitLog.split('\n').filter(l => l.trim()).map(line => {
    const [sha, ...rest] = line.split('|')
    const message = rest.slice(0, -2).join('|') // message may contain pipes
    const author = rest[rest.length - 2] || 'unknown'
    const dateStr = rest[rest.length - 1] || ''
    return { sha: sha.trim(), message: message.trim(), author: author.trim(), dateStr: dateStr.trim() }
  })

  console.log(`   Total commits since ${SINCE_DATE}: ${commits.length}`)

  // ── Process commits ───────────────────────────────────────────────
  let extracted = 0
  let skipped = 0
  let ollaSummarized = 0
  const newLessonsMd = []
  const newLessonsIndex = []

  for (let i = 0; i < commits.length; i++) {
    const { sha, message, author, dateStr } = commits[i]
    const shortSha = sha.slice(0, 8)

    // Skip already-documented commits
    if (existingShas.has(shortSha)) {
      skipped++
      continue
    }

    // Check if this is a lesson-worthy commit
    const isLessonWorthy = LESSON_INDICATORS.some(p => p.test(message))
    if (!isLessonWorthy) {
      skipped++
      continue
    }

    // Get changed files
    let files = []
    try {
      const fileOutput = execSync(
        `git diff-tree --no-commit-id --name-only -r ${sha}`,
        { cwd: ROOT, encoding: 'utf-8' }
      ).trim()
      files = fileOutput ? fileOutput.split('\n').filter(f => f.trim()) : []
    } catch {
      files = []
    }

    // Skip if only trivial files changed
    if (files.length === 0) {
      skipped++
      continue
    }

    console.log(`   [${i + 1}/${commits.length}] ${shortSha} — ${message.slice(0, 70)}`)

    // Generate the lesson
    const lesson = generateLessonMarkdown(sha, message, author, files, dateStr, extracted, commits.length)

    // Optionally enhance with Ollama
    if (useOllama) {
      const summary = await summarizeWithOllama(message, files)
      if (summary) {
        ollaSummarized++
        lesson.markdown = lesson.markdown
          .replace(/#### Lesson Learned\n\n.*?\n\n/, `#### Lesson Learned\n\n${summary.lesson_learned}\n\n`)
          .replace(/#### Reusable Rule\n\n.*?\n\n/, `#### Reusable Rule\n\n${summary.reusable_rule}\n\n`)
          .replace(/#### Bug Cause\n\n.*?\n\n/, `#### Bug Cause\n\n${summary.bug_cause || 'N/A'}\n\n`)
          .replace(/#### Fix Applied\n\n.*?\n\n/, `#### Fix Applied\n\n${summary.fix_applied}\n\n`)
          .replace(/#### Task Summary\n\n.*?\n\n/, `#### Task Summary\n\n${summary.task_summary}\n\n`)
        lesson.indexEntry.lesson_summary = summary.lesson_learned
        lesson.indexEntry.rule_summary = summary.reusable_rule
        lesson.indexEntry.confidence = 'high'
      }
    }

    newLessonsMd.push(lesson.markdown)
    newLessonsIndex.push(lesson.indexEntry)
    extracted++
  }

  // ── Report ────────────────────────────────────────────────────────
  console.log(`\n📊 Results:`)
  console.log(`   Extracted:     ${extracted}`)
  console.log(`   Skipped:       ${skipped}`)
  if (useOllama) console.log(`   Ollama-summarized: ${ollaSummarized}`)

  if (dryRun) {
    console.log('\n🛑 Dry run — no files modified.')
    console.log('   Sample output:')
    if (newLessonsMd.length > 0) {
      console.log(newLessonsMd[0].slice(0, 500))
    }
    return
  }

  // ── Write files ───────────────────────────────────────────────────
  if (newLessonsMd.length > 0) {
    // Append to lessons-learned.md
    await fs.appendFile(LESSON_FILE, newLessonsMd.join(''))
    console.log(`\n✅ Appended ${newLessonsMd.length} lessons to memory/lessons-learned.md`)

    // Append to lesson-index.jsonl
    const indexLines = newLessonsIndex.map(e => JSON.stringify(e)).join('\n') + '\n'
    await fs.appendFile(INDEX_FILE, indexLines)
    console.log(`✅ Appended ${newLessonsIndex.length} entries to memory/lesson-index.jsonl`)
  } else {
    console.log('\n✅ No new lessons to add — all commits are already documented.')
  }

  console.log('')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
