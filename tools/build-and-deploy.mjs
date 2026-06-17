import { execSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const VPS = "root@100.64.175.88";
const KEY = process.env.USERPROFILE + "/.ssh/id_superroo_vps";
const SSH_OPTS = `-i ${KEY} -o ConnectTimeout=10 -o BatchMode=yes`;
const REPO = "C:\\Users\\user\\.homeu-commerce";
const VPS_REPO = "/opt/homeu-commerce";

// Root/app config files — copied individually (not in apps/website/src/)
const configFiles = [
  ".env", "Dockerfile", "docker-compose.yml",
  "apps/website/package.json",
  "apps/website/next.config.mjs",
  "apps/website/tsconfig.json",
];

// Collect parent dirs for mkdir
const allDirs = new Set(configFiles.map(f => {
  const parts = f.split("/");
  parts.pop();
  return `${VPS_REPO}/${parts.join("/")}`;
}));

// Build setup script to run on VPS
const deployScript = [
  "#!/bin/bash",
  "set -e",
  "",
  ...Array.from(allDirs).map(d => `mkdir -p "${d}"`),
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

// --- Copy via rsync (entire src/ tree, no nesting) ---
console.log("\n=== Syncing apps/website/src/ via rsync (--delete) ===");
const srcDir = REPO.replace(/\\/g, "/") + "/apps/website/src/";
const destDir = `${VPS}:${VPS_REPO}/apps/website/src/`;
try {
  execSync(
    `rsync -r --delete -e "ssh ${SSH_OPTS}" "${srcDir}" "${destDir}"`,
    { stdio: "inherit" }
  );
  console.log("  rsync OK: apps/website/src/");
} catch (err) {
  console.error("  rsync FAILED:", err.message);
  process.exit(1);
}

// --- Copy config files individually ---
console.log("\n=== Copying config files ===");
let copied = 0;
let skipped = 0;
for (const file of configFiles) {
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

console.log(`\nConfig files: ${copied} copied, ${skipped} skipped.`);

// --- Post-deploy smoke test ---
console.log("\n=== Post-deploy smoke test ===");
try {
  execSync(
    `ssh ${SSH_OPTS} ${VPS} "curl -f --max-time 10 http://localhost:3000/"`,
    { stdio: "inherit" }
  );
  console.log("  PASS: http://localhost:3000/ returned 200");
} catch (err) {
  console.error("  FAIL: http://localhost:3000/ did not return 200");
  console.error("  ", err.message);
  process.exit(1);
}

console.log("\nDone! Deploy and smoke test passed.");
