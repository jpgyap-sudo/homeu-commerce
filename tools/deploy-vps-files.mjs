#!/usr/bin/env node
/**
 * Deploy specific files to VPS via SSH + base64 to avoid path escaping issues.
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const SSH_KEY = process.env.USERPROFILE + '/.ssh/id_superroo_vps'
const VPS = 'root@100.64.175.88'
const BASE = process.cwd()

const files = [
  'apps/website/src/app/admin/AdminShell.tsx',
  'apps/website/src/app/api/customers/auth/google/route.ts',
  'apps/website/src/app/api/customers/route.ts',
  'apps/website/src/app/login/page.tsx',
]

for (const file of files) {
  const src = BASE + '/' + file
  const content = readFileSync(src, 'utf-8')
  const b64 = Buffer.from(content, 'utf-8').toString('base64')
  const dest = '/opt/homeu-commerce/' + file.replace(/\\/g, '/')
  console.log(`Copying ${file}...`)
  execSync(
    `ssh -i "${SSH_KEY}" -o ConnectTimeout=10 ${VPS} "echo '${b64}' | base64 -d > '${dest}'"`,
    { stdio: 'inherit' }
  )
}

// Build and restart
console.log('\n=== Building ===')
execSync(
  `ssh -i "${SSH_KEY}" -o ConnectTimeout=10 ${VPS} "cd /opt/homeu-commerce/apps/website && npx next build 2>&1 | tail -5 && echo '===RESTART===' && docker compose restart website"`,
  { stdio: 'inherit', timeout: 300000 }
)
console.log('\nDone!')
