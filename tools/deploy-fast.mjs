/**
 * deploy-fast.mjs — THE GENIUS
 * =============================
 * Incremental deploy: <10s for small changes, 30s for full deploy.
 *
 * Usage:
 *   node tools/deploy-fast.mjs                    # Full incremental deploy
 *   node tools/deploy-fast.mjs file1.ts file2.css  # Hot fix: scp + restart
 *
 * Requires:
 *   - PM2 installed on VPS (pm2 start apps/website/.next/standalone/server.js -i 2 --name homeu-website)
 *   - SSH key at ~/.ssh/id_superroo_vps
 *   - Git repo on VPS at /opt/homeu-commerce
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

const VPS = 'root@104.248.225.250'
const KEY = process.env.USERPROFILE.replace(/\\/g, '/') + '/.ssh/id_superroo_vps'
const SSH_OPTS = `-i "${KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=10`
const REPO = process.cwd()
const VPS_REPO = '/opt/homeu-commerce'

// ── First run: ensure PM2 is set up for cluster mode ─────────────────────
async function ensurePM2() {
  console.log('  🔍 Checking PM2 status...')
  try {
    execSync(`ssh ${SSH_OPTS} ${VPS} "pm2 show homeu-website 2>/dev/null | head -3"`, { timeout: 10000 })
    console.log('  ✅ PM2 already configured')
  } catch {
    console.log('  ⚠️  homeu-website not in PM2 — skipping check (manual setup recommended)')
  }
}

// ── Hot fix: scp individual files + restart PM2 ──────────────────────────
function hotFix(files) {
  console.log(`\n🔥 Hot fix: ${files.length} file(s)`)
  const start = Date.now()

  for (const file of files) {
    const localPath = resolve(REPO, file)
    if (!existsSync(localPath)) {
      console.warn(`  ⚠️  NOT FOUND: ${file}`)
      continue
    }
    const remotePath = `${VPS}:${VPS_REPO}/${file}`
    console.log(`  📤 ${file}`)
    execSync(`scp ${SSH_OPTS} "${localPath}" "${remotePath}"`, { stdio: 'inherit', timeout: 15000 })
  }

  // Only restart if files were actually sent
  if (files.some(f => existsSync(resolve(REPO, f)))) {
    console.log('  🔄 Restarting PM2...')
    execSync(`ssh ${SSH_OPTS} ${VPS} "pm2 reload homeu-website --update-env 2>/dev/null || pm2 restart homeu-website"`, { timeout: 10000 })
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`✅ Deployed ${files.length} file(s) in ${elapsed}s`)
}

// ── Full incremental deploy ──────────────────────────────────────────────
function fullDeploy() {
  console.log(`\n🟢 Full incremental deploy`)
  const start = Date.now()

  // Step 1: Git pull on VPS
  console.log('  📡 Git pull...')
  execSync(
    `ssh ${SSH_OPTS} ${VPS} "cd ${VPS_REPO} && git pull 2>&1 | tail -3"`,
    { stdio: 'inherit', timeout: 30000 }
  )

  // Step 2: Build (Turbopack = fast incremental)
  console.log('  🏗️  Build...')
  execSync(
    `ssh ${SSH_OPTS} ${VPS} "cd ${VPS_REPO}/apps/website && npx next build 2>&1 | tail -5"`,
    { stdio: 'inherit', timeout: 120000 }
  )

  // Step 3: PM2 reload
  console.log('  🔄 PM2 reload...')
  execSync(
    `ssh ${SSH_OPTS} ${VPS} "pm2 reload homeu-website --update-env 2>/dev/null || pm2 restart homeu-website"`,
    { timeout: 15000 }
  )

  // Step 4: Quick smoke test
  console.log('  🔍 Smoke test...')
  try {
    execSync(
      `curl -s -o /dev/null -w "HTTP %{http_code}\n" --connect-timeout 5 https://admin.homeatelier.ph/admin/login`,
      { stdio: 'inherit', timeout: 15000 }
    )
  } catch {
    console.warn('  ⚠️  Smoke test failed — site may need a moment to start')
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`✅ Full deploy completed in ${elapsed}s`)
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║      HomeU Fast Deploy v2           ║')
  console.log('╚══════════════════════════════════════╝')

  await ensurePM2()

  const files = process.argv.slice(2).filter(f => !f.startsWith('-'))

  if (files.length > 0) {
    hotFix(files)
  } else {
    fullDeploy()
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
