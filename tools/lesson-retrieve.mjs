#!/usr/bin/env node
/**
 * HomeU Commerce — Lesson Retrieval Tool
 *
 * Retrieves relevant lessons from the learning layer before coding.
 * Use this at the START of any substantial task.
 *
 * Usage:
 *   node tools/lesson-retrieve.mjs query "what patterns for admin UI"
 *   node tools/lesson-retrieve.mjs recent                  # last 10 lessons
 *   node tools/lesson-retrieve.mjs tags "deployment,auth"  # by tags
 *   node tools/lesson-retrieve.mjs files "apps/website/src/lib/auth.ts"
 *   node tools/lesson-retrieve.mjs summary                 # stats
 *   node tools/lesson-retrieve.mjs random                  # 5 random lessons
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const LESSON_FILE = path.join(ROOT, 'memory/lessons-learned.md')
const INDEX_FILE = path.join(ROOT, 'memory/lesson-index.jsonl')

function loadIndex() {
  try {
    const content = fs.readFileSync(INDEX_FILE, 'utf-8')
    return content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
  } catch { return [] }
}

function loadLessons() {
  try {
    return fs.readFileSync(LESSON_FILE, 'utf-8')
  } catch { return '' }
}

function searchByText(lessons, query) {
  const q = query.toLowerCase()
  return lessons.filter(l =>
    l.title.toLowerCase().includes(q) ||
    (l.lesson_summary || '').toLowerCase().includes(q) ||
    (l.rule_summary || '').toLowerCase().includes(q) ||
    (l.tags || []).some(t => t.toLowerCase().includes(q))
  )
}

function searchByTags(lessons, tags) {
  const tagList = tags.split(',').map(t => t.trim().toLowerCase())
  return lessons.filter(l =>
    (l.tags || []).some(t => tagList.includes(t.toLowerCase()))
  )
}

function searchByFiles(lessons, filePath) {
  return lessons.filter(l =>
    (l.files || []).some(f => f.toLowerCase().includes(filePath.toLowerCase()))
  )
}

function printLesson(lesson, index) {
  console.log(`\n${'─'.repeat(72)}`)
  if (index !== undefined) console.log(`[${index + 1}] `)
  console.log(`📘 ${lesson.title}`)
  console.log(`   ID: ${lesson.id} | Date: ${lesson.date} | Type: ${lesson.type}`)
  console.log(`   Confidence: ${lesson.confidence} | Source: ${lesson.source}`)
  if (lesson.tags && lesson.tags.length > 0) {
    console.log(`   Tags: ${lesson.tags.join(', ')}`)
  }
  if (lesson.files && lesson.files.length > 0) {
    console.log(`   Files: ${lesson.files.slice(0, 4).join(', ')}${lesson.files.length > 4 ? '...' : ''}`)
  }
  console.log(`   ${'─'.repeat(40)}`)
  console.log(`   ${lesson.lesson_summary || '(no summary)'}`)
  if (lesson.rule_summary) {
    console.log(`\n   🔧 Rule: ${lesson.rule_summary}`)
  }
}

function showSummary(lessons) {
  const byType = {}
  const byTag = {}
  lessons.forEach(l => {
    byType[l.type] = (byType[l.type] || 0) + 1
    if (l.tags) l.tags.forEach(t => byTag[t] = (byTag[t] || 0) + 1)
  })

  console.log(`\n📊 Lesson Summary`)
  console.log(`   Total lessons: ${lessons.length}`)
  console.log(`\n   By type:`)
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`     ${type.padEnd(15)} ${count}`)
  })
  console.log(`\n   Top tags:`)
  Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([tag, count]) => {
    console.log(`     ${tag.padEnd(20)} ${count}`)
  })

  // Date range
  const dates = lessons.map(l => l.date).filter(Boolean).sort()
  if (dates.length > 0) {
    console.log(`\n   Date range: ${dates[0]} → ${dates[dates.length - 1]}`)
  }
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log(`Usage:
  node tools/lesson-retrieve.mjs query "search terms"
  node tools/lesson-retrieve.mjs query "search terms" --limit 3
  node tools/lesson-retrieve.mjs recent                    # last 10
  node tools/lesson-retrieve.mjs tags "deployment,auth"    # by tags
  node tools/lesson-retrieve.mjs files "apps/website/src/" # by file path
  node tools/lesson-retrieve.mjs summary                   # statistics
  node tools/lesson-retrieve.mjs random                    # 5 random
  node tools/lesson-retrieve.mjs all                       # list all titles`)
    process.exit(1)
  }

  const lessons = loadIndex()
  if (lessons.length === 0) {
    console.log('No lessons found in memory/lesson-index.jsonl')
    process.exit(0)
  }

  const cmd = args[0]
  let limit = 10
  const limitIdx = args.indexOf('--limit')
  if (limitIdx >= 0) limit = parseInt(args[limitIdx + 1]) || 10

  if (cmd === 'summary') {
    showSummary(lessons)
    return
  }

  if (cmd === 'all') {
    lessons.forEach((l, i) => console.log(`${i + 1}. [${l.date}] ${l.title} (${l.type})`))
    return
  }

  if (cmd === 'random') {
    const shuffled = [...lessons].sort(() => Math.random() - 0.5)
    shuffled.slice(0, limit).forEach((l, i) => printLesson(l, i))
    return
  }

  let results = []

  if (cmd === 'recent') {
    results = [...lessons].sort((a, b) => {
      const da = new Date(a.date || 0)
      const db = new Date(b.date || 0)
      return db - da
    }).slice(0, limit)
  } else if (cmd === 'query') {
    results = searchByText(lessons, args.slice(1).join(' '))
  } else if (cmd === 'tags') {
    results = searchByTags(lessons, args[1] || '')
  } else if (cmd === 'files') {
    results = searchByFiles(lessons, args[1] || '')
  } else {
    console.log(`Unknown command: ${cmd}`)
    process.exit(1)
  }

  if (results.length === 0) {
    console.log('No matching lessons found.')
    process.exit(0)
  }

  console.log(`\nFound ${results.length} relevant lessons:\n`)
  results.forEach((l, i) => printLesson(l, i))
}

main()
