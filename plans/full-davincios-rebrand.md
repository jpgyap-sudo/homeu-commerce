# Full DaVinciOS Rebrand Plan

## Current State

- **Surface-level rebrand** via npm aliases in [`apps/website/package.json`](../apps/website/package.json):
  - `"DaVinciOS"` → npm alias for `"payload"` v3.85.1
  - `"@DaVinciOScms/db-postgres"` → npm alias for `"@payloadcms/db-postgres"` v3.85.1
  - `"@DaVinciOScms/next"` → npm alias for `"@payloadcms/next"` v3.85.1
  - `"@DaVinciOScms/richtext-lexical"` → npm alias for `"@payloadcms/richtext-lexical"` v3.85.1
- [`packages/davincios/`](../packages/davincios/) exists with `name: "@davincios/cms"` and rebranded [`bin.js`](../packages/davincios/bin.js) but **no `dist/` directory** — the compiled fork doesn't exist yet
- The installed `node_modules/DaVinciOS` is still the original Payload package with internal `payload` references

## Problem

The npm aliases rename packages at install time, but the **compiled JavaScript** inside `node_modules/DaVinciOS/dist/` still contains thousands of internal references to:
- `payload` (variable names, property names, string literals)
- `Payload` (class names, type names, export names)
- `PAYLOAD` (environment variable names, constants)
- `payloadcms` (URLs, author info, repo references)

This means `req.payload` is still the runtime property name, environment variables like `PAYLOAD_CONFIG_PATH` are still checked, and the compiled code still identifies as "payload" internally.

## Goal

Create a truly forked package where **zero** `payload`/`Payload`/`PAYLOAD` strings appear in the compiled output, so:
1. Runtime property is `req.davincios` instead of `req.payload`
2. Environment variables are purely `DAVINCIOS_*` with no `PAYLOAD_*` fallback
3. The package can be published as `@davincios/cms` and used without npm aliases

---

## Architecture

```mermaid
flowchart TD
    subgraph Current["Current State"]
        A[apps/website/package.json] -->|npm alias| B[npm:payload v3.85.1]
        A -->|npm alias| C[npm:@payloadcms/db-postgres]
        A -->|npm alias| D[npm:@payloadcms/next]
        A -->|npm alias| E[npm:@payloadcms/richtext-lexical]
        B --> F[dist/ contains 'payload' strings internally]
        C --> G[dist/ contains 'payload' strings internally]
    end

    subgraph Target["Target State"]
        H[apps/website/package.json] -->|direct dep| I[packages/davincios @davincios/cms]
        H -->|direct dep| J[packages/db-postgres @davincios/db-postgres]
        H -->|direct dep| K[packages/next @davincios/next]
        H -->|direct dep| L[packages/richtext-lexical @davincios/richtext-lexical]
        I --> M[dist/ contains ZERO 'payload' strings]
        J --> N[dist/ contains ZERO 'payload' strings]
    end
```

---

## Phase 1: Patch Forked Core Package (`packages/davincios`)

### 1a: Copy Installed Payload dist/ into packages/davincios/dist/

Copy the entire `apps/website/node_modules/DaVinciOS/dist/` directory tree into `packages/davincios/dist/`.

The directory structure to copy includes 70+ subdirectories:
```
dist/__testing__/
dist/admin/
dist/auth/
dist/collections/
dist/config/
dist/database/
dist/email/
dist/errors/
dist/exports/
dist/fields/
dist/folders/
dist/globals/
dist/kv/
dist/locked-documents/
dist/preferences/
dist/query-presets/
dist/queues/
dist/translations/
dist/types/
dist/uploads/
dist/utilities/
dist/versions/
```

**Files to also copy from `node_modules/DaVinciOS/`:**
- `bin.js` (already exists in packages/davincios/)
- `package.json` (already exists in packages/davincios/)
- `LICENSE.md` (already exists)
- `README.md` (already exists)

### 1b: Search-and-Replace on All dist/ JS/TS Files

Using a script (PowerShell or Node.js), perform the following replacements across ALL `.js`, `.mjs`, `.d.ts` files in `packages/davincios/dist/`:

| Find | Replace | Context |
|------|---------|---------|
| `payload` (as standalone word/variable) | `davincios` | Variable names, property names, string literals |
| `Payload` | `DaVinciOS` | Class names, type names, export names |
| `PAYLOAD` | `DAVINCIOS` | Constants, environment variable names |
| `payloadcms.com` | `davincios.com` | URLs |
| `payloadcms` | `davincios` | Package scope, org names |
| `@payloadcms/` | `@davincios/` | Internal import paths |
| `packages/payload` | `packages/davincios` | Repo paths |
| `Payload CMS` | `DaVinciOS CMS` | Display names |
| `Payload <dev@payloadcms.com>` | `DaVinciOS Team <dev@davincios.com>` | Author metadata |

**Critical replacements in specific files:**
- `dist/index.js` — main export must use `getDaVinciOS` not `getPayload`
- `dist/bin/index.js` — CLI binary references
- All files referencing `process.env.PAYLOAD_*` → `process.env.DAVINCIOS_*`
- All files with `req.payload` → `req.davincios`
- All files with `payload.` → `davincios.`
- All files with `payload.config.ts` → `davincios.config.ts`
- All files with `payload.config` → `davincios.config`
- Config path references like `PAYLOAD_CONFIG_PATH` → `DAVINCIOS_CONFIG_PATH`

**⚠️ Important Caveats — Words to NOT replace:**

The word "payload" can appear in contextual strings that shouldn't be changed:
- GraphQL payload response handling
- HTTP request/response payloads
- Generic "payload" in comments/documentation about data transmission

A word-boundary-aware replacement strategy is needed. For example, replace `\bpayload\b` but NOT `payload` when it's part of a broader concept like "request payload" in generic HTTP context. However, given that this is a CMS framework's compiled output, most "payload" references ARE the CMS name and SHOULD be replaced.

**Recommended approach:** Use a Node.js script with regex word boundaries:
```js
// replace-in-dir.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const EXTENSIONS = new Set(['.js', '.mjs', '.d.ts'])
const REPLACEMENTS = [
  [/\bPAYLOAD\b/g, 'DAVINCIOS'],
  [/\bPayload\b/g, 'DaVinciOS'],
  [/\bpayload\b/g, 'davincios'],
  [/payloadcms\.com/g, 'davincios.com'],
  [/@payloadcms\//g, '@davincios/'],
  [/packages\/payload/g, 'packages/davincios'],
]

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walk(fullPath))
    else if (EXTENSIONS.has(extname(fullPath))) results.push(fullPath)
  }
  return results
}

const distDir = 'packages/davincios/dist'
const files = walk(distDir)
console.log(`Processing ${files.length} files...`)

for (const file of files) {
  let content = readFileSync(file, 'utf-8')
  const original = content
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement)
  }
  if (content !== original) {
    writeFileSync(file, content, 'utf-8')
    console.log(`  Patched: ${file}`)
  }
}

console.log('Done.')
```

### 1c: Update [`bin.js`](../packages/davincios/bin.js)

The existing `bin.js` already references `davincios` brand. Verify and update if needed:
- Change `"bin": { "payload": "bin.js" }` → `"bin": { "davincios": "bin.js" }` in package.json

### 1d: Update package.json

The [`packages/davincios/package.json`](../packages/davincios/package.json) already has proper `@davincios/cms` naming. Verify:
- `@payloadcms/translations` dependency → `@davincios/translations`
- All URLs, author info, keywords

---

## Phase 2: Patch Sibling Packages

### 2a: Patch `@DaVinciOScms/db-postgres`

Copy `apps/website/node_modules/@DaVinciOScms/db-postgres/dist/` into a new package at `packages/db-postgres/dist/`.

Run the same search-and-replace on dist/ files. Also update `package.json`:
- `name`: `@davincios/db-postgres`
- All internal `@payloadcms/` import references → `@davincios/`
- Author, URLs, repository

### 2b: Patch `@DaVinciOScms/next`

Copy `apps/website/node_modules/@DaVinciOScms/next/dist/` into `packages/next/dist/`.

Run the same search-and-replace. Update `package.json`:
- `name`: `@davincios/next`
- All internal references

### 2c: Patch `@DaVinciOScms/richtext-lexical`

Copy `apps/website/node_modules/@DaVinciOScms/richtext-lexical/dist/` into `packages/richtext-lexical/dist/`.

Run the same search-and-replace. Update `package.json`:
- `name`: `@davincios/richtext-lexical`
- All internal references

**⚠️ TLA Issue:** The `@DaVinciOScms/richtext-lexical` package uses top-level await (TLA), which caused `ERR_REQUIRE_ASYNC_MODULE` when loaded via CJS `require()`. Ensure the forked version is only loaded via ESM `import()`.

---

## Phase 3: Update Application-Level Code

### 3a: Update `apps/website/package.json`

Remove npm aliases and use local packages directly:

```json
{
  "dependencies": {
    "@davincios/cms": "file:../../packages/davincios",
    "@davincios/db-postgres": "file:../../packages/db-postgres",
    "@davincios/next": "file:../../packages/next",
    "@davincios/richtext-lexical": "file:../../packages/richtext-lexical",
    ...
  }
}
```

Or use workspace protocol if using npm workspaces:
```json
{
  "dependencies": {
    "@davincios/cms": "workspace:*",
    "@davincios/db-postgres": "workspace:*",
    "@davincios/next": "workspace:*",
    "@davincios/richtext-lexical": "workspace:*",
    ...
  }
}
```

### 3b: Fix `req.payload` → `req.davincios` in [`Products.ts`](../apps/website/src/collections/Products.ts)

Line 35 currently uses:
```ts
const category = await req.payload.findByID({...})
```

Change to:
```ts
const category = await req.davincios.findByID({...})
```

This is the only source file that directly accesses `req.payload`. The DaVinciOS request object will have `.davincios` instead of `.payload` after the fork.

### 3c: Simplify [`daVinciOS.ts`](../apps/website/src/lib/daVinciOS.ts)

Current code uses string obfuscation:
```ts
const factoryName = ['get', 'Pa', 'yload'].join('')
```

Change to direct import after the fork:
```ts
import { getDaVinciOS } from '@davincios/cms'

export async function getDaVinciOSClient(config: unknown) {
  return getDaVinciOS({ config })
}
```

### 3d: Update config imports in [`daVinciOS.config.ts`](../apps/website/src/daVinciOS.config.ts)

```ts
// Before (npm alias approach):
import { buildConfig } from 'DaVinciOS'
import { lexicalEditor } from '@DaVinciOScms/richtext-lexical'
import { postgresAdapter } from '@DaVinciOScms/db-postgres'

// After (local package approach):
import { buildConfig } from '@davincios/cms'
import { lexicalEditor } from '@davincios/richtext-lexical'
import { postgresAdapter } from '@davincios/db-postgres'
```

---

## Phase 4: Update Docker Scripts and Tooling

### 4a: Remove `PAYLOAD_*` env var fallbacks

All Docker scripts use obfuscated `PAYLOAD_CONFIG_PATH` and `PAYLOAD_DISABLE_ADMIN` environment variables. After the deep fork, these should be pure `DAVINCIOS_*` variables.

Files to update:
- [`docker/push-programmatic.mjs`](../docker/push-programmatic.mjs) — line 20: `process.env[['PAY', 'LOAD_CONFIG_PATH'].join('')]`
- [`docker/push-schema.sh`](../docker/push-schema.sh) — line 16: `LEGACY_CONFIG_KEY="$(printf 'PAY%s_CONFIG_PATH' 'LOAD')"`
- [`docker/migrate.mjs`](../docker/migrate.mjs) — line 9: `process.env[['PAY', 'LOAD_CONFIG_PATH'].join('')]`
- [`docker/migrate-v2.mjs`](../docker/migrate-v2.mjs) — lines 10-11: `PAYLOAD_CONFIG_PATH` and `PAYLOAD_DISABLE_ADMIN` obfuscation

### 4b: Fix [`docker/push-direct.mjs`](../docker/push-direct.mjs)

Line 14 currently sets `PAYLOAD_CONFIG_PATH`:
```js
process.env.PAYLOAD_CONFIG_PATH = './src/daVinciOS.config.ts'
```

Change to:
```js
process.env.DAVINCIOS_CONFIG_PATH = './src/daVinciOS.config.ts'
```

Lines 74-76 currently use `getPayload`:
```js
const { getPayload } = await import('/app/node_modules/DaVinciOS/dist/index.js')
await getPayload({ config })
```

Change to:
```js
const { getDaVinciOS } = await import('@davincios/cms')
await getDaVinciOS({ config })
```

### 4c: Fix [`docker/push-programmatic.mjs`](../docker/push-programmatic.mjs)

Remove the PAYLOAD_CONFIG_PATH obfuscation on line 20:
```js
// Before:
process.env[['PAY', 'LOAD_CONFIG_PATH'].join('')] = process.env.DAVINCIOS_CONFIG_PATH

// After:
// (remove this line entirely — DAVINCIOS_CONFIG_PATH is already set on line 19)
```

Line 34: `getDaVinciOS` is already correct.

### 4d: Fix [`docker/migrate.mjs`](../docker/migrate.mjs)

- Line 9: Remove PAYLOAD_CONFIG_PATH obfuscation
- Lines 14-19: Already use `DaVinciOS` package names — keep as-is

Fix [`docker/migrate-v2.mjs`](../docker/migrate-v2.mjs):
- Lines 10-11: Remove `PAYLOAD_CONFIG_PATH` and `PAYLOAD_DISABLE_ADMIN` obfuscation
- Line 16: `getDaVinciOS` is already correct

### 4e: Delete [`inspect-exports.mjs`](../inspect-exports.mjs)

This is a debugging artifact that references "payload" in filter strings. Delete it.

---

## Phase 5: Docker and Deployment Changes

### 5a: Update [`Dockerfile`](../Dockerfile)

The current Dockerfile copies `node_modules` from the build stage. After switching to local packages, the Dockerfile needs to:
1. Copy the local packages into the container
2. Update `package.json` to reference local paths

Alternatively, use a simpler approach:
- Keep npm aliases for now in Docker builds
- Only apply the deep fork for local development
- Gradually migrate to full fork in Docker

**Recommended approach for Docker:** Install from the local packages directory:
```dockerfile
# Copy local packages
COPY packages/ ./packages/

# In package.json, reference local packages via file: protocol
RUN cd website && npm install
```

### 5b-5c: Build and Deploy

Standard build and deploy process using the existing [`tools/deployer-agent/deploy-helper.ps1`](../tools/deployer-agent/deploy-helper.ps1).

---

## Phase 6: Validation

### 6a: Verify Zero Remaining "payload" Strings

Run a search across ALL tracked source files (excluding `node_modules` and `.next`):
```bash
findstr /s /i "payload" apps\website\src\*.ts apps\website\src\*.tsx docker\*.mjs docker\*.sh
```

Expected to find zero results (except generic uses like HTTP payload in comments).

### 6b: Schema Push Test

Run the updated schema push to confirm database connectivity with the forked package.

### 6c: Admin Panel Verification

Verify admin panel loads at `admin.homeu.ph` and all collections are accessible.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Search-and-replace breaks runtime behavior | High | Run comprehensive tests after replacement |
| `req.davincios` property not recognized by internal code | High | All internal references to `req.payload` MUST be replaced too |
| TLA in richtext-lexical still causes ESM issues | Medium | Ensure all imports are via ESM `import()`, not CJS `require()` |
| Package resolution fails in Docker | Medium | Test Docker build locally before deploying |
| npm alias approach simpler than full fork | Low | Consider leaving aliases and only patching the dist/ files |

---

## Alternative Approaches Considered

### Option A: Keep npm aliases + selective patching (lower effort)
Keep the current npm alias approach, but only patch the specific runtime references that cause issues (e.g., `req.payload`, `PAYLOAD_CONFIG_PATH`). This is simpler but doesn't achieve a "pure" rebrand.

**Effort:** Low | **Purity:** Low | **Risk:** Low

### Option B: Full source fork with SWC build (recommended)
Get the Payload CMS source code, do a global search-and-replace, and rebuild with SWC. This produces a truly rebranded package.

**Effort:** High | **Purity:** High | **Risk:** Medium

### Option C: Patch compiled dist/ only (this plan)
Work from the already-compiled dist/ files, doing search-and-replace on the JavaScript output. This is the pragmatic middle ground — no source code needed, but all internal references get renamed.

**Effort:** Medium | **Purity:** High | **Risk:** Low-Medium

---

## File Inventory

### Source files that need modification:

| File | Change |
|------|--------|
| `apps/website/package.json` | Replace npm aliases with local package refs |
| `apps/website/src/daVinciOS.config.ts` | Update import paths from `DaVinciOS` → `@davincios/cms` |
| `apps/website/src/collections/Products.ts` | `req.payload` → `req.davincios` |
| `apps/website/src/lib/daVinciOS.ts` | Remove string obfuscation, use direct import |
| `docker/push-direct.mjs` | `getPayload` → `getDaVinciOS`, remove `PAYLOAD_CONFIG_PATH` |
| `docker/push-programmatic.mjs` | Remove `PAYLOAD_CONFIG_PATH` obfuscation |
| `docker/push-schema.sh` | Remove `LEGACY_CONFIG_KEY` (PAYLOAD_CONFIG_PATH) |
| `docker/migrate.mjs` | Remove `PAYLOAD_CONFIG_PATH` obfuscation |
| `docker/migrate-v2.mjs` | Remove `PAYLOAD_*` obfuscation |
| `inspect-exports.mjs` | DELETE (debugging artifact) |

### New files to create:

| File | Source |
|------|--------|
| `packages/davincios/dist/` (directory tree) | Copy from `node_modules/DaVinciOS/dist/` then patch |
| `plans/replace-in-dir.mjs` | Search-and-replace script |

### Package files to create for sibling forks:

| File | Source |
|------|--------|
| `packages/db-postgres/package.json` | Fork of `@payloadcms/db-postgres` |
| `packages/db-postgres/dist/` | Patched from `@DaVinciOScms/db-postgres/dist/` |
| `packages/next/package.json` | Fork of `@payloadcms/next` |
| `packages/next/dist/` | Patched from `@DaVinciOScms/next/dist/` |
| `packages/richtext-lexical/package.json` | Fork of `@payloadcms/richtext-lexical` |
| `packages/richtext-lexical/dist/` | Patched from `@DaVinciOScms/richtext-lexical/dist/` |
