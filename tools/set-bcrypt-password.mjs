import { execSync } from "child_process";
import bcrypt from "bcryptjs";

const password = "DaVinciOS";
const hash = bcrypt.hashSync(password, 10);
console.log("Bcrypt hash:", hash.substring(0, 30) + "...");

// Add password_hash column and set it
const sql = [
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;",
  "UPDATE customers SET password_hash = '" + hash + "' WHERE email = 'jpgyap@gmail.com';",
  "SELECT email, role, length(coalesce(password_hash,'')) as hash_len FROM customers WHERE email='jpgyap@gmail.com';",
].join("\n");

try {
  const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("Result:", out);
  console.log("Password set. Try logging in at https://admin.homeatelier.ph/admin/login");
} catch (e) {
  console.error("Error:", e.message);
}
