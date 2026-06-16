import { execSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const VPS = "root@100.64.175.88";
const KEY = process.env.USERPROFILE + "/.ssh/id_superroo_vps";
const SSH_OPTS = `-i ${KEY} -o ConnectTimeout=10 -o BatchMode=yes`;
const REPO = "C:\\Users\\user\\.homeu-commerce";
const VPS_REPO = "/opt/homeu-commerce";

const filesToCopy = [
  // Root configs
  ".env", "Dockerfile", "docker-compose.yml",
  // App configs
  "apps/website/package.json",
  "apps/website/next.config.mjs",
  "apps/website/tsconfig.json",
  // Core lib
  "apps/website/src/lib/db.ts",
  "apps/website/src/lib/auth.ts",
  "apps/website/src/lib/central-logger.d.mts",
  "apps/website/src/lib/central-logger.mjs",
  // Chatbot lib
  "apps/website/src/lib/chatbot/ai-provider.ts",
  "apps/website/src/lib/chatbot/appointment-service.ts",
  "apps/website/src/lib/chatbot/cart-service.ts",
  "apps/website/src/lib/chatbot/customer-sync.ts",
  "apps/website/src/lib/chatbot/db.ts",
  "apps/website/src/lib/chatbot/intent-classifier.ts",
  "apps/website/src/lib/chatbot/lead-scorer.ts",
  "apps/website/src/lib/chatbot/ledger.ts",
  "apps/website/src/lib/chatbot/product-search.ts",
  "apps/website/src/lib/chatbot/prompts.ts",
  "apps/website/src/lib/chatbot/rfq-service.ts",
  "apps/website/src/lib/chatbot/schema.sql",
  "apps/website/src/lib/chatbot/telegram-client.ts",
  // SEO lib
  "apps/website/src/lib/seo/extractPlainText.ts",
  "apps/website/src/lib/seo/generateSeoDescription.ts",
  // Root layout
  "apps/website/src/app/layout.tsx",
  // --- Admin pages ---
  "apps/website/src/app/admin/layout.tsx",
  "apps/website/src/app/admin/admin.css",
  "apps/website/src/app/admin/page.tsx",
  // Admin / Login
  "apps/website/src/app/admin/login/page.tsx",
  "apps/website/src/app/admin/login/LoginForm.tsx",
  "apps/website/src/app/admin/login/actions.ts",
  // Admin / Dashboard
  "apps/website/src/app/admin/dashboard/page.tsx",
  // Admin / Analytics
  "apps/website/src/app/admin/analytics/page.tsx",
  // Admin / Products
  "apps/website/src/app/admin/products/page.tsx",
  "apps/website/src/app/admin/products/[id]/page.tsx",
  "apps/website/src/app/admin/products/new/page.tsx",
  "apps/website/src/app/admin/products/delete-button.tsx",
  // Admin / Categories
  "apps/website/src/app/admin/categories/page.tsx",
  "apps/website/src/app/admin/categories/[id]/page.tsx",
  "apps/website/src/app/admin/categories/new/page.tsx",
  // Admin / Customers
  "apps/website/src/app/admin/customers/page.tsx",
  "apps/website/src/app/admin/customers/[id]/page.tsx",
  "apps/website/src/app/admin/customers/new/page.tsx",
  // Admin / RFQ
  "apps/website/src/app/admin/rfq/page.tsx",
  "apps/website/src/app/admin/rfq/[id]/page.tsx",
  // Admin / Quotations
  "apps/website/src/app/admin/quotations/page.tsx",
  "apps/website/src/app/admin/quotations/[id]/page.tsx",
  "apps/website/src/app/admin/quotations/new/page.tsx",
  // Admin / Collections (Leads)
  "apps/website/src/app/admin/collections/leads/page.tsx",
  "apps/website/src/app/admin/collections/leads/[id]/page.tsx",
  // Admin / Collections (Appointments)
  "apps/website/src/app/admin/collections/appointments/page.tsx",
  "apps/website/src/app/admin/collections/appointments/[id]/page.tsx",
  // Admin / Media
  "apps/website/src/app/admin/media/page.tsx",
  "apps/website/src/app/admin/media/[id]/page.tsx",
  "apps/website/src/app/admin/media/new/page.tsx",
  // Admin / Pages
  "apps/website/src/app/admin/pages/page.tsx",
  "apps/website/src/app/admin/pages/[id]/page.tsx",
  "apps/website/src/app/admin/pages/new/page.tsx",
  // Admin / Redirects
  "apps/website/src/app/admin/redirects/page.tsx",
  "apps/website/src/app/admin/redirects/[id]/page.tsx",
  "apps/website/src/app/admin/redirects/new/page.tsx",
  // --- Admin API routes ---
  "apps/website/src/app/api/admin/login/route.ts",
  "apps/website/src/app/api/admin/logout/route.ts",
  "apps/website/src/app/api/admin/me/route.ts",
  // API / Appointments
  "apps/website/src/app/api/appointments/route.ts",
  "apps/website/src/app/api/appointments/request/route.ts",
  // API / Cart
  "apps/website/src/app/api/cart/sync/route.ts",
  // API / Categories
  "apps/website/src/app/api/categories/route.ts",
  "apps/website/src/app/api/categories/[id]/route.ts",
  // API / Chat
  "apps/website/src/app/api/chat/leads/route.ts",
  "apps/website/src/app/api/chat/leads/link/route.ts",
  "apps/website/src/app/api/chat/leads/lookup/route.ts",
  "apps/website/src/app/api/chat/ledger/route.ts",
  "apps/website/src/app/api/chat/message/route.ts",
  "apps/website/src/app/api/chat/upload-image/route.ts",
  "apps/website/src/app/api/chat/visitor/route.ts",
  // API / Customers
  "apps/website/src/app/api/customers/route.ts",
  "apps/website/src/app/api/customers/[id]/route.ts",
  "apps/website/src/app/api/customers/[id]/leads/route.ts",
  "apps/website/src/app/api/customers/[id]/rfqs/route.ts",
  "apps/website/src/app/api/customers/me/route.ts",
  // API / Leads
  "apps/website/src/app/api/leads/route.ts",
  // API / Media
  "apps/website/src/app/api/media/route.ts",
  "apps/website/src/app/api/media/[id]/route.ts",
  // API / Pages
  "apps/website/src/app/api/pages/route.ts",
  "apps/website/src/app/api/pages/[id]/route.ts",
  // API / Products
  "apps/website/src/app/api/products/route.ts",
  "apps/website/src/app/api/products/[id]/route.ts",
  "apps/website/src/app/api/products/recommend/route.ts",
  // API / Quotations
  "apps/website/src/app/api/quotations/route.ts",
  "apps/website/src/app/api/quotations/[id]/route.ts",
  // API / Redirects
  "apps/website/src/app/api/redirects/route.ts",
  "apps/website/src/app/api/redirects/[id]/route.ts",
  // API / RFQ
  "apps/website/src/app/api/rfq/route.ts",
  "apps/website/src/app/api/rfq/add-item/route.ts",
  "apps/website/src/app/api/rfq/submit/route.ts",
];

// Delete old DaVinciOS files
const deleteCmds = [
  `rm -rf ${VPS_REPO}/packages/davincios`,
  `rm -rf ${VPS_REPO}/packages/next`,
  `rm -rf ${VPS_REPO}/packages/db-postgres`,
  `rm -rf ${VPS_REPO}/packages/richtext-lexical`,
  `rm -rf ${VPS_REPO}/apps/website/src/app/'(DaVinciOS)'`,
  `rm -f ${VPS_REPO}/apps/website/src/daVinciOS.config.ts`,
  `rm -f ${VPS_REPO}/apps/website/src/lib/daVinciOS.ts`,
  `rm -f ${VPS_REPO}/apps/website/src/components/admin/DaVinciOSAdminLogo.tsx`,
  `rm -rf ${VPS_REPO}/scripts/create-*`,
  `rm -rf ${VPS_REPO}/scripts/strip-*`,
  `rm -rf ${VPS_REPO}/scripts/vendor*`,
  `rm -rf ${VPS_REPO}/scripts/vendor-ui-package.mjs`,
  `rm -rf ${VPS_REPO}/scripts/copy-*`,
  `rm -rf ${VPS_REPO}/scripts/create-junctions*`,
  `rm -rf ${VPS_REPO}/docker/push-*`,
  `rm -rf ${VPS_REPO}/docker/migrate*`,
  `rm -rf ${VPS_REPO}/docs/DAVINCIOS*`,
  `rm -rf ${VPS_REPO}/docs/davincios*`,
  `rm -rf ${VPS_REPO}/plans/full-davincios*`,
  `rm -rf ${VPS_REPO}/plans/replace-in-dir*`,
];

// Collect all unique parent dirs for mkdir
const allDirs = new Set(filesToCopy.map(f => {
  const parts = f.split("/");
  parts.pop(); // remove filename
  return `${VPS_REPO}/${parts.join("/")}`;
}));

// Build a full deploy script to run on VPS
const deployScript = [
  "#!/bin/bash",
  "set -e",
  "",
  // Create directories
  ...Array.from(allDirs).map(d => `mkdir -p "${d}"`),
  "",
  // Delete old DaVinciOS files
  ...deleteCmds,
  "",
  `echo "Setup complete on VPS at $(date)"`,
].join("\n");

// Write the script locally
const scriptPath = join(tmpdir(), "vps-deploy-" + Date.now() + ".sh");
writeFileSync(scriptPath, deployScript);
console.log("Deploy script written to:", scriptPath);

// SCP the script to VPS
const vpsScriptPath = "/tmp/vps-deploy.sh";
execSync(
  `scp ${SSH_OPTS} "${scriptPath}" "${VPS}:${vpsScriptPath}"`,
  { stdio: "inherit" }
);

// Execute the script on VPS
console.log("\n=== Running setup on VPS ===");
execSync(
  `ssh ${SSH_OPTS} ${VPS} "bash ${vpsScriptPath}"`,
  { stdio: "inherit" }
);

// Clean up local temp script
try { unlinkSync(scriptPath); } catch {}

// Now copy files
console.log("\n=== Copying files to VPS ===");
let copied = 0;
let skipped = 0;
for (const file of filesToCopy) {
  const src = REPO + "/" + file;
  const dest = VPS_REPO + "/" + file;
  if (!existsSync(src)) {
    console.log("  SKIP (not found):", file);
    skipped++;
    continue;
  }
  execSync(
    `scp ${SSH_OPTS} "${src}" "${VPS}:${dest}"`,
    { stdio: "inherit" }
  );
  console.log("  OK:", file);
  copied++;
}

console.log(`\nDone! Copied ${copied} files (${skipped} skipped). Ready to rebuild on VPS.`);
