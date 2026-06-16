import { execSync } from "child_process";

// Generate bcrypt hash and update in one go using a simple one-liner
const cmd = `docker exec -i homeu-commerce-website-1 node -e "const b=require('bcryptjs');const h=b.hashSync('DaVinciOS',10);require('fs').writeFileSync('/tmp/bcrypt_hash.txt',h);console.log(h.substring(0,20)+'...')"`;
try {
  execSync(cmd, { stdio: "inherit", encoding: "utf-8", shell: true });
} catch {
  // try alternative approach
}

// Check if hash was generated
let hash;
try {
  hash = execSync("cat /tmp/bcrypt_hash.txt", { encoding: "utf-8", shell: true }).trim();
  console.log("Hash:", hash.substring(0, 30) + "...");
} catch {
  console.error("Could not read hash");
  process.exit(1);
}

// Update database
const sql = "ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;\nUPDATE customers SET password_hash = '" + hash + "' WHERE email = 'jpgyap@gmail.com';";
try {
  execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: sql,
    encoding: "utf-8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });
  console.log("Password updated successfully!");
} catch (e) {
  console.error("DB update error:", e.message);
}
