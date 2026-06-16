/**
 * Cleanup script: Remove all DaVinciOS/Payload CMS files
 */
import { execSync } from "child_process";
import { existsSync, rmSync, readdirSync } from "fs";
import { join } from "path";

const repo = "C:\\Users\\user\\.homeu-commerce";

const deletePaths = [
  // DaVinciOS source packages
  "packages/davincios",
  "packages/next",
  "packages/db-postgres",
  "packages/richtext-lexical",

  // DaVinciOS app source
  "apps/website/src/app/(DaVinciOS)",
  "apps/website/src/daVinciOS.config.ts",
  "apps/website/src/lib/daVinciOS.ts",
  "apps/website/src/components/admin/DaVinciOSAdminLogo.tsx",

  // Collection access control (uses DaVinciOS types)
  "apps/website/src/access",

  // Scripts (stub generators + rebranding)
  "scripts/create-drizzle-stub.js",
  "scripts/create-graphql-stub.js",
  "scripts/create-translations-stub.js",
  "scripts/create-ui-stub.js",
  "scripts/create-ui-stub.sh",
  "scripts/strip-legacy-brand.mjs",
  "scripts/strip-payload.mjs",
  "scripts/vendor-ui-package.mjs",
  "scripts/copy-davincios-packages.ps1",
  "scripts/create-junctions.ps1",
  "scripts/vendor",

  // Deployment helpers referencing DaVinciOS
  "docker/push-direct.mjs",
  "docker/push-programmatic.mjs",
  "docker/minimal-push.mjs",
  "docker/push-schema.sh",
  "docker/migrate.mjs",
  "docker/migrate-v2.mjs",

  // Docs about DaVinciOS
  "docs/DAVINCIOS_REBRAND_LESSONS.md",
  "docs/DAVINCIOS_REBRAND_INSTRUCTIONS.md",
  "docs/davincios-admin-panel-roadmap.md",

  // Plans
  "plans/full-davincios-rebrand.md",
  "plans/replace-in-dir.mjs",

  // Tools
  "tools/payloadcms-ui",

  // Legacy env example (if it exists)
  "apps/website/.env.example",
];

let deleted = 0;
let errors = 0;

for (const p of deletePaths) {
  const full = join(repo, p);
  if (existsSync(full)) {
    try {
      rmSync(full, { recursive: true, force: true });
      console.log("DELETED:", p);
      deleted++;
    } catch (e) {
      console.log("ERROR:", p, e.message);
      errors++;
    }
  }
}

console.log(`\nDone: ${deleted} deleted, ${errors} errors`);
