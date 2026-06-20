# HomeU Commerce — Project Instructions

Persistent, repo-level notes for any coding agent/extension (Claude Code,
Codex, Kilo Code, Blackbox, SuperRoo VS Code, Roo Cline, etc.) working in
this repository.

## 🚧 Source of Truth & Deploy Gate — READ FIRST (ALL EXTENSIONS)

We had repeated "localhost ≠ live site" drift and lost work because extensions
edited the VPS directly or deployed without committing. To stop this, every
extension MUST follow these rules:

**Single source of truth per layer:**
- **Code → git (`origin/master`).** Never edit files on the VPS directly — every
  deploy runs `git reset --hard origin/master`, so un-committed VPS edits are
  WIPED. The only durable path is commit → push → deploy.
- **Content/data → the PRODUCTION database** (homepage_sections, site_settings,
  theme, categories content). Author content via `admin.homeatelier.ph` (writes
  prod). Do NOT author content only in your local DB — it will not reach the live
  site (separate databases). Refresh your local copy with
  `node tools/db-pull-prod.mjs` before working.
- **Transactional data (customers, RFQs, quotations, leads) → production only.**
  Never overwrite these from local.

**Mandatory deploy gate (no exceptions):**
```
node tools/deploy-gate.mjs && node tools/deploy-fast.mjs
```
`deploy-fast.mjs` self-invokes the gate, which BLOCKS unless: working tree is
clean (committed), local == `origin/master` (pushed), and the preflight sweep
passes. Deploy = Docker on the VPS over Tailscale (`docker compose up -d --build
website`). See [docs/deploy-strategy.md](docs/deploy-strategy.md).

**Before deploying, always:** commit your work → `git push origin master` →
run the gate. If you skipped committing, the next deploy erases your VPS changes.

## Naming & Architecture

This project's CMS / backend is **DaVinciOS** — think of it as "my Shopify admin."
Always call it "DaVinciOS" in code, docs, comments, and conversation.

**Analogy:** Just like Shopify has a customer-facing storefront + a Shopify
admin backend, HomeU has **HomeU.PH** (storefront, at store.homeatelier.ph) +
**DaVinciOS** (admin backend, at admin.homeatelier.ph). DaVinciOS manages
products, collections, customers, RFQs, quotations, pages, media,
redirects, and SEO — same role Shopify Admin plays for a Shopify store.

**Architecture relationship:**
- **DaVinciOS** = The backend CMS/system. It provides the admin panel (admin.homeatelier.ph), collections (Products, Categories, Customers, RFQRequests, etc.), API endpoints, database schema, and content management infrastructure. It is the engine that powers the website.
- **HomeU (HOMEU.PH)** = Home Atelier = the customer-facing furniture brand/website. These three names are the same company. It is the frontend that DaVinciOS serves content to. Customers see HomeU at store.homeatelier.ph (Next.js frontend). HomeU is the showroom; DaVinciOS is the engine. The `homeatelier` name appears in infra (DigitalOcean Spaces bucket `homeatelierspaces`, domains `*.homeatelier.ph`).

**Framework removal (2026-06):** The original DaVinciOS framework runtime
(npm packages, `req.DaVinciOS.*` API, PayloadCMS adapter) was removed and
replaced with a custom stack (direct `pg` queries, `jose` JWT, `bcryptjs`,
custom Next.js API routes). The **name** DaVinciOS remains. The **framework**
is gone. References to `@davincios/cms`, `req.DaVinciOS`, PayloadCMS
internals, or DaVinciOS npm packages are stale. References to "DaVinciOS
collections", "DaVinciOS admin", "DaVinciOS backend" are correct and
intentional — they refer to the conceptual system, not the old framework.

## CDN Media: DigitalOcean Spaces (`do-spaces`)

All CDN media for Products, Categories/Collections, Blogs, and Pages is
stored in a DigitalOcean Spaces bucket (S3-compatible object storage).

- **Bucket:** `homeatelierspaces` (region `sgp1`)
- **Origin endpoint:** `https://homeatelierspaces.sgp1.digitaloceanspaces.com`
- **CDN endpoint:** `https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com`
  (use this for all public-facing image URLs)
- **Credentials:** `DO_SPACES_*` vars in `.env` / `apps/website/.env` (both
  gitignored — never commit real keys)
- **Full details / S3 SDK usage / DaVinciOS `media` collection integration:**
  see [`.claude/skills/digitalocean-spaces/SKILL.md`](.claude/skills/digitalocean-spaces/SKILL.md)

### MCP access (`do-spaces`)

This repo's Spaces bucket is reachable from coding agents via a generic
S3-compatible MCP server, [`txn2/mcp-s3`](https://github.com/txn2/mcp-s3)
(binary: `mcp-s3.exe`, built with `go install
github.com/txn2/mcp-s3/cmd/mcp-s3@latest`).

It is currently registered for **Claude Code** (`claude mcp add do-spaces -s
local ...`, scoped to this project in `~/.claude.json`), read-only
(`MCP_S3_EXT_READONLY=true` — write/delete tools disabled since this bucket
backs the live CDN).

**For other extensions** (Codex, Kilo Code, Blackbox, SuperRoo VS Code, Roo
Cline, etc.): to get the same access when working in this project, register
an MCP server named `do-spaces` pointing at the same `mcp-s3.exe` binary
with these env vars (values come from `.env` in this repo — do not hardcode
or commit the secret):

```
S3_ENDPOINT          = $DO_SPACES_ORIGIN_ENDPOINT
AWS_REGION           = $DO_SPACES_REGION
AWS_ACCESS_KEY_ID    = $DO_SPACES_KEY
AWS_SECRET_ACCESS_KEY= $DO_SPACES_SECRET
S3_USE_PATH_STYLE    = false
MCP_S3_EXT_READONLY  = true   # keep read-only unless a task needs uploads
```

Tools exposed: `s3_list_buckets`, `s3_list_objects`, `s3_get_object`,
`s3_get_object_metadata`, `s3_copy_object`, `s3_presign_url` (plus
`s3_put_object` / `s3_delete_object`, disabled by default).

See the skill doc above for the full example config and rationale.

## 🛑 Preflight Sweep — MANDATORY Before ANY Build or Deploy

**This is a HARD GATE. Do NOT skip it. Do NOT force-build through errors.**

Before `npm run build`, `next build`, `docker build`, `docker-compose up`,
`deployer_build`, `deployer_deploy`, or any VPS deploy — you MUST run the
preflight sweep and achieve a clean PASS.

### Required Workflow Before Build/Deploy

1. **Run `node tools/shared/preflight-sweep.mjs --full`**
2. **If PASS** → proceed to Git Sync Gate below, then build/deploy
3. **If BLOCK** → fix ALL blockers, re-run sweep, repeat until clean
4. **If WARN** → fix warnings if time permits; non-blocking for build

### What the Sweep Checks

| Phase | Check | Time |
|-------|-------|------|
| 0 | Environment sanity (Node version, env files, env vars) | 30s |
| 1 | Dependency audit (missing packages, stale aliases) | 1min |
| 2 | TypeScript compilation (zero errors required) | 2min |
| 3 | Import resolution (all local imports resolve) | 1min |
| 4 | API wiring (route consumers have matching routes) | 2min |
| 5 | Database schema alignment (tables match code) | 1min |
| 6 | Brand sweep (no Payload CMS / stale DaVinciOS refs) | 1min |
| 7 | Dead file cleanup (stale artifacts removed) | 30s |
| 8 | Build dry-run (only after phases 0-7 pass) | 1min |

### Sweep Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | All clean | Proceed to Git Sync Gate → build/deploy |
| 1 | Warnings only | Fix if time permits; may proceed |
| 2 | BLOCKED | **HALT. Fix all. Re-sweep.** Do NOT force build. |

### Quick Sweep (pre-commit)

```bash
node tools/shared/preflight-sweep.mjs --quick   # phases 0, 1, 2, 6 only
```

**Violation:** Attempting to build or deploy without a clean sweep PASS is
a violation of this gate. Agents that bypass the sweep will have their
deploy blocked.

Full instructions: [`.kilo/skill/preflight-sweep/SKILL.md`](.kilo/skill/preflight-sweep/SKILL.md)

---

## 🧠 Learning Layer — Read Before Code, Write After Code

This project enforces a **learning layer** for institutional memory.

### Before ANY coding task:
```bash
node tools/lesson-retrieve.mjs query "<brief task description>"
```
This surfaces relevant past lessons, known pitfalls, and reusable rules.

### After EVERY coding task:
Lessons are automatically captured from fix/feat/perf commits via
`.githooks/post-commit`. To manually backfill:
```bash
node tools/backfill-lessons.mjs
```

### Quick commands:
| Action | Command |
|--------|---------|
| Query lessons | `node tools/lesson-retrieve.mjs query "your task"` |
| View stats | `node tools/lesson-retrieve.mjs summary` |
| Recent lessons | `node tools/lesson-retrieve.mjs recent --limit 5` |
| Backfill new | `node tools/backfill-lessons.mjs` |

Full workflow in [`ai/instructions/project.md`](ai/instructions/project.md).

---

## ⚠️ Git Sync Gate — MANDATORY Before Deploy

This repository enforces a **Git Sync Gate** before ANY deployment operation.
The Deployer Agent checks local ↔ origin sync before allowing deploys.

### Required Workflow Before Deploy

**Complete build/deploy sequence (all steps mandatory):**

1. **Run Preflight Sweep** — `node tools/shared/preflight-sweep.mjs --full` → must PASS (exit 0)
2. **Fix all sweep blockers** — re-run sweep until clean
3. **Commit** all work (`git add` + `git commit`)
4. **Run `deployer_sync_check`** — checks dirty files, fetch, ahead/behind, auto-repair
5. **If sync passes** — proceed with `deployer_build`, `deployer_deploy`, or `deployer_deploy_pending`
6. **If sync blocks** — fix the reported issues first, then retry

The deploy tools (`deployer_build`, `deployer_deploy`, `deployer_deploy_pending`)
**automatically** run the sync gate and will BLOCK with an error if sync fails.

### How The Sync Gate Works

```
1. git status --porcelain        → any dirty files?
2. git fetch origin              → can we reach GitHub?
   ↓ (if fails, retry via HTTP proxy at 127.0.0.1:10809)
3. git rev-list HEAD..origin     → behind? → auto pull --rebase
4. git rev-list origin..HEAD     → ahead?  → auto push
5. git stash (if dirty)          → save work, pull, pop stash
6. Record sync state in DB       → deployer_sync_state table
7. PASS → proceed with deploy
   BLOCK → return error with guidance
```

**Do not bypass the sync gate.** If blocked, fix the git state first.

See [`tools/deployer-agent/README.md`](tools/deployer-agent/README.md) for full details.
