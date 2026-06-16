import { execSync } from "child_process";
import crypto from "crypto";

// DaVinciOS password hashing: pbkdf2 sha256, 25000 iterations, 512 bytes
const password = "DaVinciOS";
const saltBuffer = crypto.randomBytes(32);
const salt = saltBuffer.toString("hex");
const hashRaw = crypto.pbkdf2Sync(password, salt, 25000, 512, "sha256");
const hash = hashRaw.toString("hex");

console.log("Salt length:", salt.length);
console.log("Hash length:", hash.length);
console.log("Iterations: 25000");
console.log("Algorithm: sha256");

// Delete existing user and insert with proper hash
const sql = `
DELETE FROM customers WHERE email='jpgyap@gmail.com';
INSERT INTO customers (email, name, role, phone, salt, hash, login_attempts, status, created_at, updated_at)
VALUES (
  'jpgyap@gmail.com',
  'Admin User',
  'admin',
  '+639175550000',
  '${salt}',
  '${hash}',
  0,
  'active',
  NOW(),
  NOW()
);
SELECT 'CREATED' as result;
`;

try {
  const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("\nResult:", out);
} catch (e) {
  console.error("Error:", e.message);
  console.error("stdout:", e.stdout);
}
