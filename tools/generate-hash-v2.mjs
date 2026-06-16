import { execSync } from "child_process";
import crypto from "crypto";

// DaVinciOS password hashing: pbkdf2 sha256, 25000 iterations, 512 bytes
// KEY: salt is passed as hex STRING (64 chars), NOT raw buffer
const password = "DaVinciOS";
const saltBuffer = crypto.randomBytes(32);
const salt = saltBuffer.toString("hex"); // 64-char hex string
const hashRaw = crypto.pbkdf2Sync(password, salt, 25000, 512, "sha256");
const hash = hashRaw.toString("hex");

console.log("Salt:", salt.substring(0, 32) + "...");
console.log("Salt length:", salt.length, "(should be 64)");
console.log("Hash length:", hash.length, "(should be 1024)");

// Delete existing user and insert with proper hash
const sql = [
  "DELETE FROM customers WHERE email='jpgyap@gmail.com';",
  "INSERT INTO customers (email, name, role, phone, salt, hash, login_attempts, status, created_at, updated_at)",
  "VALUES (",
  "  'jpgyap@gmail.com',",
  "  'Admin User',",
  "  'admin',",
  "  '+639175550000',",
  "  '" + salt + "',",
  "  '" + hash + "',",
  "  0,",
  "  'active',",
  "  NOW(),",
  "  NOW()",
  ");"
].join("\n");

try {
  const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("Result:", out);
} catch (e) {
  console.error("Error:", e.message);
}
