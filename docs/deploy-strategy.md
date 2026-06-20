# HomeU Deployment Strategy

> ## ⚠️ ACTUAL DEPLOYMENT (corrected 2026-06-20 — read this first)
>
> The live site does **NOT** run on PM2. It runs as the **`website` service in
> `docker-compose.yml`** on the VPS. Request path: nginx `:443` →
> `127.0.0.1:3000` → the `homeu-commerce-website-1` Docker container.
>
> - **SSH is Tailscale-only.** Public IP `104.248.225.250` has port 22 firewalled;
>   SSH via Tailscale `root@100.64.175.88` (key `~/.ssh/id_superroo_vps`). The
>   website (443) is public on `104.248.225.250`; DNS for `store.`/`admin.
>   homeatelier.ph` → `104.248.225.250`.
> - **Deploy = push to `origin/master`, then rebuild the container:**
>   ```bash
>   git push origin master            # locally
>   node tools/deploy-fast.mjs        # VPS: git reset --hard origin/master + docker compose up -d --build website
>   ```
>   A `superroo-auto-deployer` PM2 process also auto-rebuilds the container after a push.
> - The host-side `next build` + `pm2 reload homeu-website` flow described below
>   is **obsolete** — it never touched the live container. The redundant PM2
>   `homeu-website` process was removed.
>
> Everything below is the original aspirational design, kept for reference.

---

# HomeU Deployment Strategy v2 — THE GENIUS (superseded — see note above)

## Problem
Current deploy: tar+scp entire `src/` → npm install → full `next build` → restart.
- Full deploy: **~85 seconds** (30s tar+scp, 30s npm install, 40s next build)
- Even tiny CSS changes require a full rebuild
- Zero separation between app code, static assets, and config

## The Genius: Tiered Incremental Deploy

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                   VPS (104.248.225.250)              │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Nginx      │  │  PM2 (Next)  │  │  Build     │ │
│  │   (port 443) │→│  (port 3000) │  │  Cache     │ │
│  │              │  │              │  │  .next/    │ │
│  │  static/*    │  │  server.js   │  │  node_mods │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│         ▲                 ▲                ▲         │
│         │                 │                │         │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌────┴──────┐  │
│  │  Layer 1    │  │  Layer 2     │  │  Layer 3  │  │
│  │  Static     │  │  Server      │  │  Infra    │  │
│  │  (rare)     │  │  (frequent)  │  │  (never)  │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tier 1: Static Assets — NEVER Rebuild (Nginx Serves Directly)
**Deploy frequency:** Only when JS/CSS bundles change
**Downtime:** Zero (nginx reload is instant)

| Asset | Location | Cache | Update mechanism |
|-------|----------|-------|------------------|
| `public/` images | `/opt/homeu/public/` | CDN | `scp` file directly |
| `.next/static/` JS/CSS | `/opt/homeu/.next/static/` | 1 year (hash) | Sync once per deploy |
| `debut-theme.css` | `/opt/homeu/public/` | CDN | `scp` file directly |

### Tier 2: Server Code — Incremental Build (PM2 Graceful Restart)
**Deploy frequency:** Every code change
**Downtime:** ~1 second (PM2 graceful restart)

Uses **Next.js standalone output mode**:
```bash
# Build locally (or on VPS)
cd apps/website
npx next build   # Produces .next/standalone/

# Standalone is SELF-CONTAINED:
.next/standalone/
├── server.js          # The entire Next.js server
├── .next/server/       # Server-side pages
├── .next/static/       # Client-side bundles
├── node_modules/       # Only production deps
└── package.json
```

**Deploy script:**
```bash
# Step 1: Build (only what changed — Turbopack incremental ~5s for small changes)
cd /opt/homeu-commerce/apps/website
npx next build

# Step 2: PM2 graceful restart (zero-downtime if using cluster mode)
pm2 reload homeu-website --update-env
```

**For micro-changes (CSS, text, config):**
```bash
# Even faster: skip build entirely, just sync file and restart
scp apps/website/src/app/globals.css root@vps:/opt/homeu/...
pm2 restart homeu-website --update-env   # ~2s total
```

### Tier 3: Infrastructure — Almost Never Changed
**Deploy frequency:** Monthly or on server migration
**Downtime:** Acceptable (planned)

| Component | Update mechanism |
|-----------|-----------------|
| Nginx config | `scp` then `nginx -s reload` (~0.1s) |
| `.env` secrets | `scp` then `pm2 restart` |
| `package.json` deps | `npm install` (rare) |
| Docker/base image | `docker build` (rare) |

## The Genius Workflow

### 🔥 Hot Fix (CSS typo, text change) — 2 seconds
```bash
# 1. Edit file locally
# 2. SCP just the changed file
scp apps/website/src/app/globals.css root@vps:/opt/homeu/...

# 3. Restart PM2
ssh root@vps "pm2 restart homeu-website"
```
**No build. No npm install. No downtime.** Total: ~2s.

### 🟢 Small Code Change (component, API) — 10 seconds
```bash
# 1. Commit locally → git push
# 2. VPS git pull
ssh root@vps "cd /opt/homeu && git pull"

# 3. Incremental build (Turbopack caches previous build)
ssh root@vps "cd /opt/homeu/apps/website && npx next build"

# 4. PM2 graceful reload
ssh root@vps "pm2 reload homeu-website"
```
Total: ~10s (build uses Turbopack cache).

### 🟡 Full Deploy (new deps, schema change) — 30 seconds
```bash
# Full build-and-deploy.mjs flow
node tools/build-and-deploy.mjs
```
Total: ~30s (tar+scp source + build + restart).

## How Turbopack Makes This Fast

Next.js 16 uses Turbopack (Rust-based, not Webpack). Key properties:
- **Incremental compilation:** Only changed files recompile (~100ms per file)
- **Persistent cache:** `.next/cache/` survives between builds
- **Parallel processing:** Multi-core Rust compiler

**First build:** 40s (cold cache)
**Subsequent builds:** 5-15s (hot cache, only changed files)

**This is why we DON'T need separate containers.** The native Next.js incremental compiler + PM2 graceful restart is already faster than any Docker-based hot-reload system for production.

## The No-Container Decision

### Why NOT Docker for the app?
| Aspect | Docker | PM2 Direct |
|--------|--------|------------|
| Startup time | 10-30s (image pull + container start) | <1s (PM2 reload) |
| Build time | 60-120s (Docker build) | 5-15s (Turbopack incremental) |
| Disk usage | 1-2GB per image | 300MB (node + build output) |
| Complexity | Dockerfile, compose, registry | `pm2 start` |
| Hot reload | Must rebuild image | `pm2 reload` = 1s |

The only case for Docker is **isolation and reproducibility**, but since this is a single VPS running a single Node app, PM2 provides sufficient isolation.

### What IS Dockerized?
- **Deployer agent** (Python/queue worker) — already containerized
- **Build environment** (for CI/CD) — optional
- **Nothing else needed.** The Next.js app runs natively via PM2.

## The Ultimate Script: `tools/deploy-fast.mjs`

```javascript
// THE GENIUS: Deploy in under 10 seconds for small changes
// Usage: node tools/deploy-fast.mjs [file1 file2 ...]

import { execSync } from 'child_process'

const VPS = 'root@104.248.225.250'
const KEY = process.env.USERPROFILE + '/.ssh/id_superroo_vps'
const SSH = `-i ${KEY} -o StrictHostKeyChecking=no`
const DEST = '/opt/homeu-commerce/apps/website'

const files = process.argv.slice(2)

if (files.length === 0) {
  // Full incremental deploy: git pull + build + restart
  execSync(`ssh ${SSH} ${VPS} "cd ${DEST} && git pull && npx next build && pm2 reload homeu-website"`, { stdio: 'inherit' })
} else {
  // Hot fix: scp individual files + restart
  for (const file of files) {
    execSync(`scp ${SSH} "${file}" "${VPS}:${DEST}/src/${file}"`, { stdio: 'inherit' })
  }
  execSync(`ssh ${SSH} ${VPS} "pm2 restart homeu-website"`, { stdio: 'inherit' })
}
```

## Zero-Downtime with PM2 Cluster Mode

```bash
# Start with cluster mode (2 instances)
pm2 start server.js -i 2 --name homeu-website

# Reload = zero-downtime (one worker at a time)
pm2 reload homeu-website

# Rollback if something goes wrong
pm2 deploy ecosystem.config.js production rollback
```

**PM2 ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'homeu-website',
    script: 'apps/website/.next/standalone/server.js',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,  // Don't watch in production
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3000 },
  }]
}
```

## Summary: Deploy Times

| Change Type | Current | With Genius Strat | Speedup |
|------------|---------|-------------------|---------|
| CSS/text fix | 85s | **2s** (scp + restart) | **42x** |
| Component/API change | 85s | **10s** (git pull + build + reload) | **8x** |
| New dependency | 85s | **30s** (npm install + build) | **3x** |
| Full initial deploy | 85s | **85s** (same — first time) | 1x |

**The key insight:** 90% of changes are Tier 1 (CSS/text) or Tier 2 (small code changes). By optimizing for these common paths, the average deploy time drops from 85s to **under 10s**.
