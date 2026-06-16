# Preflight Sweep — Mandatory Pre-Build/Pre-Deploy Audit

## 🚨 ENFORCEMENT: DO NOT BUILD OR DEPLOY UNTIL THIS SWEEP PASSES CLEAN

**This is a GATE, not a suggestion.** Before ANY `npm run build`, `next build`,
`docker build`, `docker-compose up`, `deployer_build`, `deployer_deploy`, or
any deployment to VPS (`100.64.175.88`), you MUST run ALL phases of this sweep.

If the sweep finds errors, gaps, missing dependencies, or broken wiring — **DO
NOT force the build.** Fix the issues first. Re-run the sweep. Only proceed
when the sweep passes clean.

---

## Phase 0: Environment Sanity Check (30s)

Before anything else, verify the environment is sound:

```bash
# Check Node version (requires >=18.20.2 or >=20.9.0)
node --version

# Check npm is available
npm --version

# Check working directory is the project root
pwd
# Expected: /path/to/.homeu-commerce
```

### Check required env files exist
```bash
test -f .env.example && echo "OK: .env.example exists" || echo "GAP: .env.example missing"
test -f apps/website/.env && echo "OK: apps/website/.env exists" || echo "GAP: apps/website/.env missing"
```

### Check required env vars in apps/website/.env
```
REQUIRED_VARS="DATABASE_URI JWT_SECRET DAVINCIOS_SECRET DAVINCIOS_PUBLIC_SERVER_URL NEXT_PUBLIC_SITE_URL"
```
Every missing var is a **BLOCKER**.

### Check env vars use correct prefix (NOT old Payload CMS prefix)
```bash
# These must NOT exist
rg -n "PAYLOAD_SECRET|PAYLOAD_PUBLIC_SERVER_URL|PAYLOAD_TELEMETRY" .env* apps/website/.env 2>/dev/null
# If any match found → GAP: old Payload env vars still present → BLOCK BUILD
```

---

## Phase 1: Dependency Audit (1min)

### Check package.json for missing/broken dependencies

```bash
cd apps/website

# Check node_modules exists
test -d node_modules && echo "OK: node_modules exists" || echo "GAP: node_modules missing - run npm install"

# Check for stale Payload CMS / DaVinciOS aliases
rg -n "payload|@payloadcms|@DaVinciOScms" package.json
# If any match → GAP: stale CMS package aliases → BLOCK BUILD

# Check for missing peer dependencies
npm ls --depth=0 2>&1 | grep -E "UNMET|MISSING|peer dep"
# If any match → GAP: install missing deps → BLOCK BUILD

# Check for extraneous packages
npm ls --depth=0 2>&1 | grep "extraneous"
# If any → GAP: run npm prune
```

### Check all imported packages resolve

```bash
# List all unique imports from source files
cd apps/website
rg --no-filename -o "from ['\"]([^'\"]+)" src/ --replace '$1' | \
  grep -v '^\.' | sort -u | while read pkg; do
    node -e "require.resolve('$pkg')" 2>/dev/null || echo "GAP: $pkg not installed"
done
```

---

## Phase 2: TypeScript Compilation (2min)

### Full type-check — ZERO errors required

```bash
cd apps/website
npx tsc --noEmit 2>&1
```

| Error pattern | Severity | Action |
|---------------|----------|--------|
| `Cannot find module` | **BLOCKER** | Missing import — install package or fix path |
| `Cannot find name` | **BLOCKER** | Undefined variable — add type definition |
| `Property 'X' does not exist` | **BLOCKER** | Wrong type or API mismatch |
| `Type 'X' is not assignable` | **BLOCKER** | API signature mismatch (e.g., Next.js params Promise) |
| `'X' is possibly 'null'` | **BLOCKER** | Add null check |
| `Parameter 'X' implicitly has 'any'` | WARNING | Add explicit type annotation |

**Rules:**
- **Zero BLOCKER errors allowed before build.** Fix every one.
- **WARNING-level** errors: fix if they affect runtime behavior.
- Do NOT use `// @ts-ignore` or `// @ts-expect-error` as a workaround — fix the root cause.
- Do NOT use `as any` to silence type errors — define proper types.

---

## Phase 3: Import Resolution & Missing Files (1min)

### Check that all local imports resolve to actual files

```bash
cd apps/website

# Find all local imports (starting with ./ or ../ or @/)
rg --no-filename -o "from ['\"](\.\.?/[^'\"]+|@/[^'\"]+)" src/ --replace '$1' | \
  sort -u | while read imp; do
    # Convert to filesystem path
    path=$(echo "$imp" | sed 's|@/|src/|')
    # Check for .ts, .tsx, .js, .mjs extensions
    found=$(ls "${path}.ts" "${path}.tsx" "${path}.js" "${path}.mjs" "${path}/index.ts" "${path}/index.tsx" 2>/dev/null)
    if [ -z "$found" ]; then
      echo "GAP: Import '$imp' does not resolve to any file"
    fi
done
```

### Check for files referenced in docs/config that don't exist

```bash
# Check if daVinciOS.config.ts is referenced anywhere but doesn't exist
test -f apps/website/src/daVinciOS.config.ts || rg -l "daVinciOS\.config\.ts|davincios\.config\.ts" --type md .kilo docs agents 2>/dev/null | while read f; do
  echo "GAP: $f references daVinciOS.config.ts which does not exist"
done

# Check if (DaVinciOS) route group is referenced but doesn't exist
test -d "apps/website/src/app/(DaVinciOS)" || rg -l "\(DaVinciOS\)" --type md .kilo docs agents 2>/dev/null | while read f; do
  echo "GAP: $f references (DaVinciOS) route group which does not exist"
done
```

---

## Phase 4: Wiring Audit — API Routes & Consumers (2min)

### Verify all API routes have matching consumers or are intentionally standalone

```bash
cd apps/website/src/app/api

# List all API route files
find . -name "route.ts" -o -name "route.tsx" | sort > /tmp/api_routes.txt

# List all files that call these API endpoints
cd apps/website/src
rg --no-filename -o "['\"]/api/([^'\"]+)" . --replace '$1' | sort -u > /tmp/api_consumers.txt
```

### Check for orphaned API routes (routes with no consumers)
- If a route exists but nothing calls it → flag as potentially dead code
- Exception: routes that are intentionally public-facing (e.g., `/api/rfq/submit`, `/api/chat/*`)

### Check for broken API consumers (code calls endpoints that don't exist)

```bash
# For each consumer, verify the route file exists
while read endpoint; do
  route_file="apps/website/src/app/api/${endpoint}/route.ts"
  if [ ! -f "$route_file" ]; then
    echo "GAP: Consumer calls /api/$endpoint but route file does not exist → BLOCK BUILD"
  fi
done < /tmp/api_consumers.txt
```

---

## Phase 5: Database Schema vs Code Alignment (1min)

### Check that all tables referenced in code exist in schema

```bash
# Extract all table names from db.ts queries
rg --no-filename -o "FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)" apps/website/src/lib/db.ts apps/website/src/app/api/ | \
  grep -oE '\b(products|categories|customers|rfq_requests|quotations|media|pages|redirects|chat_leads|chat_messages|chat_visitors|chat_ledger|product_images|products_rels|customers_rels)\b' | \
  sort -u
```

### Cross-reference with homeu-schema.sql

```bash
# List tables defined in schema
rg -o "CREATE TABLE IF NOT EXISTS (\w+)" homeu-schema.sql --replace '$1' | sort -u
```

Any table queried in code but NOT in the schema file → **BLOCKER** (will fail at runtime).
Any table in schema but NOT queried in code → potential dead table (medium gap).

---

## Phase 6: Brand & Naming Sweep (1min)

### Check for ANY remaining Payload CMS references

```bash
cd /path/to/.homeu-commerce

# Exclude .git, node_modules, .next, and GAP_LOG.md (historical)
rg -in "payload.?cms|@payloadcms|payloadcms" \
   --ignore-file <(echo ".git\nnode_modules\n.next\ndocs/GAP_LOG.md") \
   .
# ANY match → GAP: stale Payload CMS reference → fix before build
```

### Check for stale DaVinciOS CMS references (removed architecture)

```bash
# These paths NO LONGER EXIST — any reference to them in docs/skills is stale
rg -n "daVinciOS\.config\.ts|@DaVinciOScms|\(DaVinciOS\)" \
   --type md --type ts --type tsx \
   .kilo docs agents design-resources .claude \
   2>/dev/null
# Each match → GAP: update to reflect current architecture
```

---

## Phase 7: Dead File Cleanup (30s)

### Check for files that served the old CMS but are now dead

```bash
# These directories should NOT exist (were removed during migration)
for dir in packages/davincios packages/next packages/db-postgres packages/richtext-lexical; do
  test -d "$dir" && echo "GAP: $dir still exists (old CMS packages)" || echo "OK: $dir removed"
done

# These files should NOT exist
for file in \
  apps/website/src/daVinciOS.config.ts \
  apps/website/src/lib/daVinciOS.ts \
  apps/website/src/components/admin/DaVinciOSAdminLogo.tsx \
  tools/payloadcms-ui-3.85.1.tgz \
  nginx_payload.b64 \
  tools/cleanup-davincios.mjs; do
  test -f "$file" && echo "GAP: $file still exists (stale artifact)" || echo "OK: $file removed"
done
```

---

## Phase 8: Build Dry-Run (1min)

Only after Phases 0-7 all pass clean — attempt a build:

```bash
cd apps/website
npm run build 2>&1
```

If build fails → **DO NOT DEPLOY.** Fix the build error. Re-run Phases 0-7. Rebuild.

---

## Sweep Exit Codes

| Exit | Meaning | Action |
|------|---------|--------|
| ✅ **PASS** | All 8 phases clean | Proceed to `deployer_sync_check` then `deployer_build` / `deployer_deploy` |
| 🟡 **WARN** | Non-blocking gaps found (docs, comments) | Fix if time permits; build may proceed |
| 🔴 **BLOCK** | Blocking gaps found (missing deps, TS errors, broken wiring, stale Payload refs) | **HALT. Fix all. Re-sweep.** Do NOT force build. |

---

## Quick Sweep Command

For automated sweeps, run:

```bash
# Full sweep — all phases
node tools/shared/preflight-sweep.mjs --full

# Quick sweep — phases 0, 1, 2, 6 only (fast pre-commit check)
node tools/shared/preflight-sweep.mjs --quick

# Generate sweep report to tools/sweep-output/
node tools/shared/preflight-sweep.mjs --full --report
```

---

## Agent Compliance Rule

**Any agent that attempts to build or deploy without first running and passing this sweep is in violation.** If you see another agent (or yourself) trying to force a build through errors — **STOP and run the sweep first.**

This instruction is PERSISTENT. It applies to ALL coding agents: Claude Code, Codex, Kilo Code, Blackbox, SuperRoo, Roo Cline, and any future agent working in this repository.
