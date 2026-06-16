import { execSync } from "child_process";
import crypto from "crypto";

// Delete user
try {
  execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: "DELETE FROM customers WHERE email='jpgyap@gmail.com';\n",
    encoding: "utf-8",
  });
  console.log("User deleted");
} catch (e) {
  console.log("Delete result:", e.message.substring(0, 100));
}

// Insert with proper hash
const saltBuffer = crypto.randomBytes(32);
const salt = saltBuffer.toString("hex");
const hashRaw = crypto.pbkdf2Sync("DaVinciOS", salt, 25000, 512, "sha256");
const hash = hashRaw.toString("hex");

const sql = [
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

const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
  input: sql,
  encoding: "utf-8",
});
console.log("User inserted:", out);
console.log("Login credentials ready: jpgyap@gmail.com / DaVinciOS");
