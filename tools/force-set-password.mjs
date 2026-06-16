import crypto from "crypto";
import { execSync } from "child_process";

// Use PBKDF2 password hashing algorithm
const password = "DaVinciOS";

// Step 1: Generate salt (32 random bytes as hex)
const saltBuffer = crypto.randomBytes(32);
const salt = saltBuffer.toString("hex");

// Step 2: Hash password with pbkdf2 (25000 iterations, 512 bytes, sha256)
const hashRaw = crypto.pbkdf2Sync(password, salt, 25000, 512, "sha256");
const hash = hashRaw.toString("hex");

console.log("Generated salt length:", salt.length, "(expected 64)");
console.log("Generated hash length:", hash.length, "(expected 1024)");

// Step 3: Update user password
const sql = `UPDATE customers SET salt='${salt}', hash='${hash}' WHERE email='jpgyap@gmail.com';`;
const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
  input: sql,
  encoding: "utf-8",
});
console.log("Update result:", out.trim());

// Step 4: Verify the stored hash matches
const sql2 = "SELECT salt, hash FROM customers WHERE email='jpgyap@gmail.com';";
const row = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -A -t", {
  input: sql2,
  encoding: "utf-8",
}).trim();

const parts = row.split("|");
if (parts.length >= 2) {
  const storedSalt = parts[0];
  const storedHash = parts[1];
  const verifyHash = crypto.pbkdf2Sync(password, storedSalt, 25000, 512, "sha256").toString("hex");
  console.log("Manual verification - hashes match:", verifyHash === storedHash);
}

console.log("Password set. Try logging in at https://admin.homeatelier.ph/admin/login");
