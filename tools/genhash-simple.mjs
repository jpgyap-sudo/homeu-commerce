import { writeFileSync } from "fs";
import { execSync } from "child_process";

// Write a small JS file to the website container that generates the bcrypt hash
const scriptContent = `
const bcrypt = require("bcryptjs");
const hash = bcrypt.hashSync("DaVinciOS", 10);
console.log(hash);
require("fs").writeFileSync("/tmp/bcrypt_result.txt", hash);
`;

writeFileSync("/tmp/gen_bcrypt.cjs", scriptContent);

// Copy to VPS and execute
execSync(`scp -i ${process.env.USERPROFILE}/.ssh/id_superroo_vps /tmp/gen_bcrypt.cjs root@100.64.175.88:/tmp/gen_bcrypt.cjs`, { stdio: "inherit", shell: true });
execSync(`ssh -i ${process.env.USERPROFILE}/.ssh/id_superroo_vps root@100.64.175.88 "docker cp /tmp/gen_bcrypt.cjs homeu-commerce-website-1:/tmp/gen_bcrypt.cjs && docker exec -e NODE_PATH=/app/website/node_modules homeu-commerce-website-1 node /tmp/gen_bcrypt.cjs"`, { stdio: "inherit", shell: true });

// Read the hash
const hash = execSync(`ssh -i ${process.env.USERPROFILE}/.ssh/id_superroo_vps root@100.64.175.88 "cat /tmp/bcrypt_result.txt"`, { encoding: "utf-8", shell: true }).trim();
console.log("Hash:", hash.substring(0, 30) + "...");
console.log("Hash length:", hash.length);

// Update the database
const sql = `ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;\nUPDATE customers SET password_hash='${hash}' WHERE email='jpgyap@gmail.com';`;
execSync(`ssh -i ${process.env.USERPROFILE}/.ssh/id_superroo_vps root@100.64.175.88 "echo '${sql}' > /tmp/update_pw.sql && docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -f /tmp/update_pw.sql"`, { stdio: "inherit", shell: true });

console.log("Password set! Try logging in at https://admin.homeatelier.ph/admin/login");
