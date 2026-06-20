/**
 * deploy-gate.mjs — MANDATORY gate before ANY deploy (all extensions)
 * ===================================================================
 * The recurring "localhost ≠ website" / lost-work problem is caused by
 * extensions deploying directly to the VPS without committing to git. This gate
 * makes that impossible to do durably: it BLOCKS a deploy unless the change is
 * committed AND pushed to origin/master, and preflight is clean.
 *
 * Because the VPS deploy does `git reset --hard origin/master`, anything not in
 * git is wiped on the next deploy anyway — so git is the ONLY durable path.
 *
 * Usage (every extension, every deploy):
 *   node tools/deploy-gate.mjs && node tools/deploy-fast.mjs
 * (deploy-fast.mjs also calls this gate itself, so it can't be skipped.)
 *
 * Exit 0 = pass, 2 = BLOCKED.
 */
import { execSync } from 'child_process'

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()
const fails = []

console.log('🔒 Deploy gate — verifying git + preflight before deploy\n')

// 1) Working tree must be clean (everything committed)
let dirty = ''
try { dirty = sh('git status --porcelain') } catch { /* ignore */ }
if (dirty) {
  const files = dirty.split('\n').slice(0, 15).join('\n   ')
  fails.push(`Uncommitted changes — commit them first (no direct/uncommitted edits):\n   ${files}`)
}

// 2) Local must equal origin/master (committed AND pushed)
try {
  sh('git fetch origin -q')
  const branch = sh('git rev-parse --abbrev-ref HEAD')
  if (branch !== 'master') fails.push(`On branch "${branch}" — deploys ship origin/master. Merge/push to master.`)
  const ahead = sh('git rev-list --count origin/master..HEAD')
  const behind = sh('git rev-list --count HEAD..origin/master')
  if (ahead !== '0') fails.push(`${ahead} commit(s) not pushed — \`git push origin master\` first.`)
  if (behind !== '0') fails.push(`${behind} commit(s) behind origin/master — \`git pull --rebase\` first.`)
} catch (e) {
  fails.push(`Could not verify git sync: ${e.message}`)
}

// 3) Preflight sweep must pass (TS, wiring, brand, etc.)
if (!process.argv.includes('--skip-preflight')) {
  try {
    execSync('node tools/shared/preflight-sweep.mjs --full', { stdio: 'inherit' })
  } catch {
    fails.push('Preflight sweep BLOCKED — fix blockers, then retry.')
  }
}

if (fails.length) {
  console.error('\n🛑 DEPLOY GATE BLOCKED — do NOT deploy until fixed:\n')
  for (const f of fails) console.error(' • ' + f)
  console.error('\nWhy: the VPS resets to origin/master on deploy, so only committed+pushed work survives.')
  process.exit(2)
}

console.log('\n✅ Deploy gate PASSED — committed + pushed to origin/master, preflight clean. Safe to deploy.')
