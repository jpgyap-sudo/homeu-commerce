/**
 * deploy-fast.mjs — Docker Compose deploy over Tailscale
 * ======================================================
 * REALITY CHECK (2026-06-20): the live HomeU site runs as the `website` service
 * in docker-compose on the VPS. nginx :443 → 127.0.0.1:3000 → container. There
 * is NO PM2 serving the site (an old `pm2 homeu-website` was redundant and has
 * been removed). The previous PM2 + host `next build` approach was a no-op for
 * the live container.
 *
 * SSH note: the public IP (104.248.225.250) has port 22 firewalled — the VPS is
 * reachable for SSH only over Tailscale (100.64.175.88). The website itself
 * (443) is public on 104.248.225.250.
 *
 * Usage:
 *   node tools/deploy-fast.mjs            # sync VPS to origin/master + rebuild container
 *
 * Requires:
 *   - SSH key at ~/.ssh/id_superroo_vps
 *   - VPS repo at /opt/homeu-commerce with docker-compose.yml + .env
 *   - COMMIT & PUSH to origin/master FIRST (the VPS resets to origin/master)
 */

import { execSync } from 'child_process'

// Tailscale IP is primary; override with HOMEU_VPS_SSH if the host changes.
const VPS = process.env.HOMEU_VPS_SSH || 'root@100.64.175.88'
const HOME = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/')
const KEY = `${HOME}/.ssh/id_superroo_vps`
const SSH = `ssh -i "${KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=15`
const VPS_REPO = '/opt/homeu-commerce'

// Node's execSync uses cmd.exe on Windows, which has no concept of single-
// quote shell-quoting — a naive `'${cmd}'` wrapper gets mangled by cmd.exe's
// own tokenizing (this silently broke $(...) substitution and made the git
// sync step unreliable). Base64-encoding the remote command sidesteps shell
// quoting entirely: the encoded string has no special characters for either
// the local Windows shell or the remote bash to misinterpret.
function remote(cmd, timeout = 600000) {
  const encoded = Buffer.from(cmd, 'utf8').toString('base64')
  execSync(`${SSH} ${VPS} "echo ${encoded} | base64 -d | bash"`, { stdio: 'inherit', timeout })
}

function deploy() {
  const start = Date.now()

  // 0. MANDATORY GATE — refuse to deploy uncommitted/unpushed work. The VPS
  //    resets to origin/master, so only committed+pushed work survives anyway.
  if (!process.argv.includes('--no-gate')) {
    try {
      execSync('node tools/deploy-gate.mjs', { stdio: 'inherit' })
    } catch {
      console.error('\n🛑 Deploy aborted by deploy-gate. Commit + push, then retry.')
      process.exit(2)
    }
  }

  console.log('\n🟢 Docker deploy → origin/master')

  // 1. Make the VPS match origin/master exactly (discards any VPS-side drift —
  //    the VPS holds no local commits; origin/master is the source of truth).
  console.log('  📡 Sync VPS working tree to origin/master...')
  remote(`cd ${VPS_REPO} && git fetch origin -q && git reset --hard origin/master && echo "VPS now at $(git rev-parse --short HEAD)"`, 60000)

  // 2. Rebuild + recreate only the website container (postgres/ollama untouched).
  console.log('  🐳 Rebuild + restart website container (this is the actual deploy)...')
  remote(`cd ${VPS_REPO} && docker compose up -d --build website 2>&1 | tail -8`, 600000)

  // 3. Public smoke test (from this machine).
  console.log('  🔍 Smoke test...')
  try {
    execSync(`curl -s -o /dev/null -w "  admin/login: HTTP %{http_code}\\n" --max-time 20 https://admin.homeatelier.ph/admin/login`, { stdio: 'inherit' })
    execSync(`curl -s -o /dev/null -w "  store:       HTTP %{http_code}\\n" --max-time 20 https://store.homeatelier.ph/`, { stdio: 'inherit' })
  } catch {
    console.warn('  ⚠️  Smoke test failed — container may still be starting; retry in ~10s')
  }

  console.log(`✅ Deploy completed in ${((Date.now() - start) / 1000).toFixed(0)}s`)
}

console.log('╔══════════════════════════════════════╗')
console.log('║   HomeU Deploy — Docker Compose v3   ║')
console.log('╚══════════════════════════════════════╝')
deploy()
