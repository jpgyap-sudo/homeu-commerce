# DaVinciOS Rebrand — Debugging & Process Lessons

**Date:** 2026-06-15  
**Project:** homeu-website (PayloadCMS → DaVinciOS, Next.js 16.2.9)  
**Purpose:** Capture every error, root cause, fix, and decision made during the deep rebrand so future forks can avoid the same pitfalls.

---

## 1. Problem Summary

The project renamed PayloadCMS to DaVinciOS. This required changing **every** reference to "payload"/"Payload"/"PAYLOAD" in compiled JavaScript, TypeScript definitions, and source maps across **4 source packages** + **4 copied upstream packages**, spanning **3,687 files** and **1.5M+ replacements**.

---

## 2. Timeline of Errors & Fixes

### 2.1. npm install Created Mangled Directory Names

**Error:** `npm install` created `node_modules/@DaVinciOScms/` (capitalized, appended "cms") and `DaVinciOS/` instead of `@davincios/`.

**Root cause:** `apps/website/package.json` used npm aliases (`"DaVinciOS": "npm:payload@3.85.1"` etc.) and the generated `package-lock.json` cached these mangled names.

**Fix:** Deleted `apps/website/package-lock.json` so it could be regenerated correctly. However, this introduced the next problem.

**Lesson:** After rebranding package names, **always delete and regenerate `package-lock.json`**. The lockfile caches directory names that don't match your rebranded names.

---

### 2.2. `@davincios/cms@3.85.1` Not Found on npm

**Error:** After deleting `package-lock.json`, `npm install` failed because `@davincios/cms@3.85.1` doesn't exist on the public npm registry.

**Root cause:** The `file:` protocol dependencies in `apps/website/package.json` had peer/dev dependencies referencing `@davincios/cms@3.85.1`, but this package only exists as a local fork, not on npm.

**Fix:** The solution was to **copy the compiled `dist/` directories** from the original `@payloadcms/*` packages into `@davincios/*` node_modules manually, then run `strip-payload.mjs` on them. The npm install was never re-run; instead, the existing node_modules were patched in-place.

**Lesson:** When forking a package and renaming its npm scope, the renamed package **won't resolve from npm**. You must either:
- Publish the renamed package to npm (or a private registry)
- Use `file:` protocol and accept that `npm install` can't fully resolve the dependency tree
- Copy the original package's `dist/` into the forked location and patch it

---

### 2.3. Windows Junctions Work for Node.js but NOT Turbopack

**Error:** Created Windows Junctions to link `@payloadcms/*` directories to `@davincios/*`. Node.js `import()` resolved them correctly, but **Turbopack ignores junctions**, causing "Module not found" for all `@davincios/*` imports.

**Root cause:** Turbopack (Next.js 15+) uses its own module resolution that doesn't follow Windows NTFS junctions/reparse points.

**Fix:** Abandoned junctions in favor of **physical file copies**. Created `copy-davincios-packages.ps1` to copy entire package directories, then patched them with `strip-payload.mjs`.

**Lesson:** **Do not use symlinks or junctions with Turbopack.** Always use physical copies. Next.js 15+ / Turbopack has known limitations with reparse points on Windows and symlinks on Linux.

---

### 2.4. 85 Build Errors — Incomplete File Renames

**Error:** After copying files and running an early version of `strip-payload.mjs`, `next build` produced **85 errors**. Example: `handleEndpoints.js` imported `./createDaVinciOSRequest.js` but the actual file was still named `createPayloadRequest.js`.

**Root cause:** `strip-payload.mjs` was doing **content replacement** (renaming import strings) but wasn't **renaming the files themselves**. So `import './createDaVinciOSRequest.js'` was written into the JS, but the file on disk was still `createPayloadRequest.js`.

**Fix:** Added a **Phase 2 file-renaming pass** to `strip-payload.mjs` using a `renameMap` of old→new filename patterns. The rename runs AFTER content replacement to ensure imports point to the new names.

**Lesson:** Content replacement and file renaming are **two separate operations** that must be coordinated:
1. **First** replace all references in JS/TS content (imports, requires, sourceMappingURLs)
2. **Then** rename the files themselves on disk
3. **Order matters** — imports must already point to new names BEFORE you rename

---

### 2.5. Missing Rename Patterns

**Error:** The initial `renameMap` only had 3 patterns:
```js
{ checkPayloadDependencies, payloadPackageList, withPayload }
```

**Missing patterns (discovered through `findstr /i "payload"` on all dist dirs):**

| Old Name | New Name | Package |
|----------|----------|---------|
| `addPayloadComponentToImportMap` | `addDaVinciOSComponentToImportMap` | davincios |
| `parsePayloadComponent` | `parseDaVinciOSComponent` | davincios |
| `createPayloadRequest` | `createDaVinciOSRequest` | davincios |
| `getPayloadHMR` | `getDaVinciOSHMR` | next |
| `setPayloadAuthCookie` | `setDaVinciOSAuthCookie` | next |
| `payloadPopulateFn` | `daVinciOSPopulateFn` | richtext-lexical |
| `payload-favicon` | `davincios-favicon` | ui |
| `payload-logo` | `davincios-logo` | ui |
| `usePayloadAPI` | `useDaVinciOSAPI` | ui |

**Lesson:** Always run a comprehensive file-name scan (`findstr /s /i "payload"`) across ALL packages AFTER running the rename script to catch missed patterns. The rename map must be exhaustive.

---

### 2.6. sourceMappingURL References Not Updated

**Error:** After renaming files, the `//# sourceMappingURL=createPayloadRequest.js.map` comments inside `.js` and `.d.ts` files still pointed to the old filenames.

**Fix:** Added explicit sourceMappingURL replacement patterns for EVERY renamed file:
```js
modified = modified.replace(/\/\/# sourceMappingURL=createPayloadRequest/g, '//# sourceMappingURL=createDaVinciOSRequest')
// ... etc for all renamed files
```

**Lesson:** Every renamed filename has a corresponding sourceMappingURL comment that must also be updated. This applies to both `.js` and `.d.ts` files.

---

### 2.7. .map Files Not Scanned for Content

**Error:** `.js.map` and `.d.ts.map` files contain JSON with `"sources"` arrays referencing original source filenames. The initial script's `EXTENSIONS` array didn't include `.map` extensions, so these references were never updated.

**Fix:** Added `.js.map` and `.d.ts.map` to `EXTENSIONS`, and added JSON string replacement patterns:
```js
modified = modified.replace(/"createPayloadRequest"/g, '"createDaVinciOSRequest"')
```

**Lesson:** Source map files (`.js.map`, `.d.ts.map`) contain filename references in JSON strings that must be updated alongside the main files. Don't exclude them from your scanning.

---

### 2.8. ROOTS Configuration — 3 Different Path Contexts

**Error:** The script initially only targeted `website/node_modules/@davincios/cms/dist` and `website/node_modules/@davincios/next/dist`.

**Actual requirements:** Three distinct path contexts exist:

| Context | Path Pattern | When Used |
|---------|-------------|-----------|
| Source packages | `packages/davincios/dist/` | Local dev — the authoritative source |
| Dev node_modules | `apps/website/node_modules/@davincios/*/dist/` | Local `npm run dev` |
| Docker build | `website/node_modules/@davincios/*/dist/` | Dockerfile context (website at root) |

**Fix:** Expanded `ROOTS` to all 12 target directories (4 source + 8 node_modules copies across both dev and Docker paths).

**Lesson:** The same `strip-payload.mjs` script must work in **multiple directory contexts**. Docker builds have a different root structure than local dev. Make ROOTS comprehensive and let missing paths skip gracefully.

---

### 2.9. Docker Paths Skip Silently — OK

**Behavior:** When run locally, the Docker paths (`website/node_modules/...`) don't exist and are skipped with "not found". This is expected behavior — the script is designed to work both locally and in Docker.

**Lesson:** Design scripts to be context-agnostic. Include all possible paths and let them skip gracefully with `statSync(path, { throwIfNoEntry: false })`.

---

### 2.10. next.config.mjs Reload Error (Non-Fatal)

**Error:** After `npm run dev` started successfully, a subsequent reload produced:
```
ReferenceError: withDaVinciOS is not defined
    at next.config.mjs:4:20
```

**Root cause:** Next.js detected a file change in `next.config.mjs` and attempted to reload the config. The import of `@davincios/next/withDaVinciOS` failed on reload, likely due to Turbopack's module cache not properly handling the re-evaluation of the dynamic `import()`.

**Impact:** **Non-fatal.** The initial server boot succeeded and served pages correctly (`GET /admin 200`). Only the hot-reload of the config file failed.

**Lesson:** Dynamic `import()` in `next.config.mjs` can fail on hot-reload with Turbopack. The initial cold boot is reliable, but config changes may require a full restart. Consider using static imports or accepting that config hot-reload is flaky with forked packages.

---

## 3. Script Architecture Decisions

### 3.1. `strip-payload.mjs` Design Principles

1. **Two-phase execution:**
   - Phase 1: Content replacement in all `.js`, `.d.ts`, `.cjs`, `.mjs`, `.map` files
   - Phase 2: File renaming on disk (runs AFTER content replacement)

2. **Ordered rename map:** Most-specific patterns first, least-specific last (with `break` on first match)

3. **Comprehensive replacement patterns:**
   - Import/require/import() package references
   - Environment variables (`PAYLOAD_SECRET` → `DAVINCIOS_SECRET`)
   - Function names (`getPayload` → `getDaVinciOS`, `withPayload` → `withDaVinciOS`, etc.)
   - sourceMappingURL comments
   - JSON strings in .map files
   - URL references (`payloadcms.com` → `davincios.com`)

4. **Context-agnostic ROOTS:** Includes source, dev, and Docker paths

### 3.2. Key Regex Patterns

| Pattern | Replacement | Notes |
|---------|------------|-------|
| `/\bgetPayload\b(?![A-Z])/g` | `getDaVinciOS` | Excludes `PayloadRequest` type names |
| `/\bwithPayload\b/g` | `withDaVinciOS` | Must come BEFORE `\bPayload\b` in renameMap |
| `/\bpayloadPackageList\b/g` | `DaVinciOSPackageList` | Lowercase→uppercase edge case |
| `/\bpayloadPopulateFn\b/g` | `daVinciOSPopulateFn` | Lowercase→lowercase edge case |

### 3.3. Files That Should NOT Be Renamed

- TypeScript type names: `PayloadRequest`, `PayloadComponent`, `PayloadHandler` — these are exported types that keep their original names for API compatibility
- Generic HTTP "payload" in comments about data transmission (rare in this codebase)

---

## 4. Verification Checklist

After running `strip-payload.mjs`, verify with:

```bash
# 1. Zero Payload-named files anywhere
findstr /s /i "payload" packages\*\dist\*.js packages\*\dist\*.d.ts

# 2. Zero Payload content references
findstr /s /i "payloadcms\|@payloadcms" apps\website\node_modules\@davincios\

# 3. sourceMappingURL references match renamed files
findstr /s "sourceMappingURL" packages\*\dist\*.js | findstr /i "payload"
# (should return nothing)

# 4. Dev server boots cleanly
cd apps\website && npm run dev
# Should show: ✓ Ready, [✓] Pulling schema, GET /admin 200
```

---

## 5. File Inventory

### Scripts Created/Modified

| File | Purpose |
|------|---------|
| `scripts/strip-payload.mjs` | Comprehensive sweep — content replacement + file renaming |
| `scripts/copy-davincios-packages.ps1` | Copy packages into `@davincios/*` node_modules |
| `scripts/create-junctions.ps1` | (Abandoned) Windows Junctions — incompatible with Turbopack |

### Source Files Fixed (prior to this session)

| File | Fix |
|------|-----|
| `apps/website/src/app/(DaVinciOS)/layout.tsx` | Fixed `chat.css` import path |
| `apps/website/src/lib/chatbot/rfq-service.ts` | Fixed `central-logger.mjs` import path |
| `apps/website/next.config.mjs` | Uses `@davincios/next/withDaVinciOS` |

---

## 6. Key Takeaways for Future Rebrands

1. **Always delete `package-lock.json` first** — it caches old names
2. **Never use symlinks/junctions with Turbopack** — always copy files
3. **Content replacement AND file renaming are both required** — do content first, then files
4. **sourceMappingURL comments must be updated** for every renamed file
5. **Include `.map` files in scanning** — they contain filename references
6. **Make ROOTS comprehensive** — source + dev + Docker paths
7. **Let missing paths skip gracefully** — the same script runs in multiple contexts
8. **Verify with `findstr` after every run** — catch missed patterns immediately
9. **Dynamic `import()` in `next.config.mjs` can fail on hot-reload** — cold boot is reliable
10. **The rename map must be exhaustive** — scan all packages for Payload-named files, don't assume

---

*Generated from the homeu-website rebrand debugging session on 2026-06-15.*
