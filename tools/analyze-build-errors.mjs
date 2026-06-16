import fs from 'fs';
import { execSync } from 'child_process';

// Read the built logs from a previous run
const logFile = process.argv[2] || '/tmp/build.log';

try {
  const data = fs.readFileSync(logFile, 'utf-8');
  
  // Extract all "Module not found" errors
  const missingMods = new Set();
  const regex = /Module not found[^]*?resolve '([^']+)'/g;
  let match;
  while ((match = regex.exec(data)) !== null) {
    missingMods.add(match[1]);
  }

  console.log('Missing modules:');
  for (const mod of [...missingMods].sort()) {
    console.log(mod);
  }
  console.log(`\nTotal: ${missingMods.size} missing modules`);
} catch (e) {
  console.error('Error reading log:', e.message);
}
