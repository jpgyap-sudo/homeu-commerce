#!/usr/bin/env node
/**
 * Preflight Sweep — Mandatory Pre-Build/Pre-Deploy Audit Script
 *
 * Run:  node tools/shared/preflight-sweep.mjs --full
 *       node tools/shared/preflight-sweep.mjs --quick
 *
 * Exit code 0 = PASS, 1 = WARN (non-blocking gaps), 2 = BLOCK (must fix before build)
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const WEBSITE = resolve(REPO, "apps", "website");

const args = process.argv.slice(2);
const full = args.includes("--full");
const quick = args.includes("--quick");
const report = args.includes("--report");

let blockers = 0;
let warnings = 0;
let passed = 0;

const R = String.fromCodePoint;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

function ok(msg) { passed++; console.log(`  ${GREEN("PASS")} ${msg}`); }
function warn(msg) { warnings++; console.log(`  ${YELLOW("WARN")} ${msg}`); }
function block(msg) { blockers++; console.log(`  ${RED("BLOCK")} ${msg}`); }

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: opts.cwd || REPO, encoding: "utf-8", stdio: "pipe", ...opts });
  } catch (e) {
    return e.stdout || "";
  }
}

// ═══════════════════════════════════════════════════════════════════════
console.log(BOLD("\n=== PHASE 0: Environment Sanity ===\n"));

const nodeVer = process.version;
if (nodeVer.match(/v(18|20|22|24)/)) ok(`Node ${nodeVer}`);
else block(`Node ${nodeVer} — requires >=18.20.2`);

existsSync(resolve(REPO, ".env.example")) ? ok(".env.example exists") : block(".env.example MISSING");
existsSync(resolve(WEBSITE, ".env")) ? ok("apps/website/.env exists") : block("apps/website/.env MISSING");

// Check env vars (also check root .env as fallback)
const envContent = existsSync(resolve(WEBSITE, ".env")) ? readFileSync(resolve(WEBSITE, ".env"), "utf-8") : "";
const rootEnv = existsSync(resolve(REPO, ".env")) ? readFileSync(resolve(REPO, ".env"), "utf-8") : "";
const combinedEnv = envContent + "\n" + rootEnv;
for (const v of ["DATABASE_URI", "JWT_SECRET", "DAVINCIOS_SECRET", "DAVINCIOS_PUBLIC_SERVER_URL", "NEXT_PUBLIC_SITE_URL"]) {
  combinedEnv.match(new RegExp(`^${v}=`, "m")) ? ok(`Env var ${v} set`) : block(`Env var ${v} MISSING`);
}

// Check for old Payload env vars
const allEnv = readFileSync(resolve(REPO, ".env.example"), "utf-8") + "\n" + envContent;
if (/PAYLOAD_SECRET|PAYLOAD_PUBLIC_SERVER_URL|PAYLOAD_TELEMETRY/.test(allEnv)) {
  block("OLD PAYLOAD ENV VARS STILL PRESENT");
} else {
  ok("No old Payload env vars");
}

// ═══════════════════════════════════════════════════════════════════════
console.log(BOLD("\n=== PHASE 1: Dependency Audit ===\n"));

(existsSync(resolve(WEBSITE, "node_modules")) || existsSync(resolve(REPO, "node_modules"))) ? ok("node_modules exists") : block("node_modules MISSING — run npm install");

const pkgJson = JSON.parse(readFileSync(resolve(WEBSITE, "package.json"), "utf-8"));
const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

// Check for stale Payload aliases
const pkgRaw = readFileSync(resolve(WEBSITE, "package.json"), "utf-8");
if (/payload|@payloadcms|@DaVinciOScms/.test(pkgRaw)) {
  block("Package.json contains Payload/DaVinciOS aliases");
} else {
  ok("No stale CMS aliases in package.json");
}

// Check key deps
for (const dep of ["next", "react", "react-dom", "pg", "jose", "bcryptjs"]) {
  allDeps[dep] ? ok(`Dependency: ${dep}@${allDeps[dep]}`) : block(`Missing dependency: ${dep}`);
}

// ═══════════════════════════════════════════════════════════════════════
console.log(BOLD("\n=== PHASE 2: TypeScript Compilation ===\n"));

const tscOut = sh("npx tsc --noEmit 2>&1", { cwd: WEBSITE, timeout: 60000 });
const tscErrors = (tscOut.match(/error TS\d+/g) || []).length;
if (tscErrors === 0) {
  ok("TypeScript: 0 errors");
} else {
  block(`TypeScript: ${tscErrors} compilation errors`);
  // Show first 5 errors
  const lines = tscOut.split("\n").filter(l => l.includes("error TS"));
  for (const l of lines.slice(0, 5)) console.log(`         ${l.trim()}`);
  if (lines.length > 5) console.log(`         ... and ${lines.length - 5} more`);
}

// Check for common error patterns
if (tscOut.includes("Cannot find module")) block("Missing module imports detected");
if (tscOut.includes("Cannot find name")) block("Undefined types/variables detected");
if (tscOut.includes("does not satisfy constraint")) block("API signature mismatches detected");

// ═══════════════════════════════════════════════════════════════════════
if (full) {
  console.log(BOLD("\n=== PHASE 3: Import Resolution ===\n"));

  const importOut = sh(`rg --no-filename -o "from ['\\"](@/[^'\\"]+)" src/ --replace '$1' | sort -u`, { cwd: WEBSITE });
  const imports = importOut.split("\n").filter(Boolean);
  for (const imp of imports) {
    const fsPath = imp.replace("@/", "src/");
    const found = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"]
      .some(ext => existsSync(resolve(WEBSITE, fsPath + ext)));
    found ? ok(`Import: ${imp}`) : block(`Import not found: ${imp}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  console.log(BOLD("\n=== PHASE 4: API Wiring ===\n"));

  // Check for broken API consumers. Done in pure Node (not shelled rg) so it
  // works cross-platform — the old `rg … --replace '$1'` mangled its output
  // under Windows cmd quoting. We also strip query strings and skip dynamic
  // `${…}` path segments, which previously produced false "missing route"
  // blockers (e.g. `/api/categories?limit=100`).
  const exts = /\.(ts|tsx|js|jsx)$/;
  let srcFiles = [];
  try {
    srcFiles = readdirSync(resolve(WEBSITE, "src"), { recursive: true, encoding: "utf-8" }).filter((f) => exts.test(f));
  } catch { srcFiles = []; }
  const consumerSet = new Set();
  const apiRe = /['"`]\/api\/([A-Za-z0-9._\-/]+)/g;
  for (const rel of srcFiles) {
    let txt = "";
    try { txt = readFileSync(resolve(WEBSITE, "src", rel), "utf-8"); } catch { continue; }
    let m;
    while ((m = apiRe.exec(txt))) {
      const nextChar = txt[apiRe.lastIndex];
      if (nextChar === "$" || nextChar === "{") continue; // dynamic segment follows → can't verify statically
      const ep = m[1].replace(/\/+$/, "");
      if (ep) consumerSet.add(ep);
    }
  }
  const consumers = [...consumerSet].sort();
  for (const ep of consumers) {
    const routeFile = resolve(WEBSITE, "src", "app", "api", ep, "route.ts");
    existsSync(routeFile) ? ok(`API: /api/${ep}`) : block(`API consumer has no route: /api/${ep}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
console.log(BOLD("\n=== PHASE 6: Brand & Naming Sweep ===\n"));

const payloadRefs = sh(`rg -in "payload.?cms|@payloadcms|payloadcms" --type-add 'src:*.{ts,tsx,js,mjs,json,conf}' -t src -t md . --glob '!docs/GAP_LOG.md' --glob '!.git' --glob '!node_modules' --glob '!.next' --glob '!tools/shared/preflight-sweep.mjs' --glob '!.kilo/skill/preflight-sweep/SKILL.md' 2>nul || echo ""`, { cwd: REPO });
if (payloadRefs.trim() && payloadRefs.trim() !== '""') {
  block("Payload CMS references still exist:");
  for (const l of payloadRefs.trim().split("\n").slice(0, 10)) console.log(`         ${l}`);
} else {
  ok("No Payload CMS references in source code");
}

// Check for stale daVinciOS.config.ts references
const staleConfigRefs = sh(`rg -n "daVinciOS\\.config\\.ts|@DaVinciOScms|\\(DaVinciOS\\)" -t md .kilo docs agents design-resources .claude --glob '!docs/GAP_LOG.md' --glob '!.kilo/skill/preflight-sweep/SKILL.md' 2>nul || echo ""`, { cwd: REPO });
if (staleConfigRefs.trim() && !staleConfigRefs.trim().match(/^["']{0,2}$/)) {
  warn("Stale daVinciOS.config.ts / @DaVinciOScms references in docs:");
  for (const l of staleConfigRefs.trim().split("\n").slice(0, 10)) console.log(`         ${l}`);
} else if (full) {
  ok("No stale DaVinciOS architecture references in docs");
}

// ═══════════════════════════════════════════════════════════════════════
if (full) {
  console.log(BOLD("\n=== PHASE 7: Dead File Cleanup ===\n"));

  for (const dir of ["packages/davincios", "packages/next", "packages/db-postgres", "packages/richtext-lexical"]) {
    existsSync(resolve(REPO, dir)) ? block(`Stale dir: ${dir}`) : ok(`Dir removed: ${dir}`);
  }

  for (const file of ["apps/website/src/daVinciOS.config.ts", "tools/payloadcms-ui-3.85.1.tgz", "nginx_payload.b64", "tools/cleanup-davincios.mjs"]) {
    existsSync(resolve(REPO, file)) ? block(`Stale file: ${file}`) : ok(`File removed: ${file}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
console.log(BOLD("\n═══════════════════════════════════════════════════"));
console.log(BOLD("  PREFLIGHT SWEEP SUMMARY"));
console.log(BOLD("═══════════════════════════════════════════════════"));
console.log(`  ${GREEN("Passed")} : ${passed}`);
console.log(`  ${YELLOW("Warnings")}: ${warnings}`);
console.log(`  ${RED("Blockers")}: ${blockers}`);
console.log(BOLD("═══════════════════════════════════════════════════"));

if (blockers > 0) {
  console.log(RED(`\n  BLOCKED: ${blockers} issues must be fixed before build/deploy.\n`));
  process.exit(2);
} else if (warnings > 0) {
  console.log(YELLOW(`\n  WARNING: ${warnings} non-blocking issues found. Fix if time permits.\n`));
  process.exit(1);
} else {
  console.log(GREEN(`\n  PASS: All checks clean. Proceed to deployer_sync_check then build.\n`));
  process.exit(0);
}
