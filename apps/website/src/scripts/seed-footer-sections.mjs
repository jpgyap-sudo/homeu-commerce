#!/usr/bin/env node
/**
 * Seed 4 footer sections into homepage_sections so they appear as editable
 * cards in the admin Theme Editor sidebar.
 *
 * Usage: node src/scripts/seed-footer-sections.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
const { Client } = pg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  loadEnv()

  if (!process.env.DATABASE_URI) {
    console.error('DATABASE_URI not found in .env')
    process.exit(1)
  }

  const client = new Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  // Check which footer sections already exist
  const existing = await client.query(
    `SELECT type FROM homepage_sections WHERE type LIKE 'footer_%'`
  )
  const existingTypes = new Set(existing.rows.map(r => r.type))

  // Get the next position
  const posRes = await client.query(
    `SELECT COALESCE(MAX(position), 0) + 10 AS pos FROM homepage_sections`
  )
  let nextPos = posRes.rows[0].pos

  const footerSections = [
    {
      type: 'footer_brand',
      config: {
        name: '',
        tagline: '',
        address1: '',
        city: '',
        country: '',
        email: '',
        phone: '',
      },
    },
    {
      type: 'footer_quick_links',
      config: { title: 'Quick Links' },
    },
    {
      type: 'footer_newsletter',
      config: {
        title: 'Subscribe',
        description: 'Get design tips and new arrivals in your inbox.',
        placeholder: 'Your email address',
        buttonText: 'Subscribe',
        successMessage: 'Thanks for subscribing!',
      },
    },
    {
      type: 'footer_social',
      config: {
        title: 'Follow Us',
        platforms: [
          { name: 'instagram', url: '', label: 'Instagram' },
          { name: 'facebook', url: '', label: 'Facebook' },
          { name: 'pinterest', url: '', label: 'Pinterest' },
          { name: 'youtube', url: '', label: 'YouTube' },
        ],
      },
    },
  ]

  let count = 0
  for (const sec of footerSections) {
    if (existingTypes.has(sec.type)) {
      console.log(`  ✓ ${sec.type} already exists, skipping`)
      continue
    }
    await client.query(
      `INSERT INTO homepage_sections (type, position, enabled, config)
       VALUES ($1, $2, true, $3::jsonb)`,
      [sec.type, nextPos, JSON.stringify(sec.config)]
    )
    console.log(`  + ${sec.type} created at position ${nextPos}`)
    nextPos += 10
    count++
  }

  await client.end()

  if (count > 0) {
    console.log(`\n✓ ${count} footer sections seeded.`)
  } else {
    console.log(`\n✓ All footer sections already exist.`)
  }
  console.log(`Open /admin/theme in the admin panel to see and edit them.`)
}

main().catch(err => {
  console.error('Failed to seed footer sections:', err)
  process.exit(1)
})
