import { execSync } from "child_process";
import crypto from "crypto";
import { writeFileSync } from "fs";

const password = "DaVinciOS";
const salt = crypto.randomBytes(32).toString("hex");
const hash = crypto.pbkdf2Sync(password, salt, 250000, 64, "sha512").toString("hex");

const sql = `
DELETE FROM customers WHERE email = 'jpgyap@gmail.com';
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
SELECT id, email, name, role FROM customers ORDER BY id DESC LIMIT 1;
`;

writeFileSync("/tmp/create-admin.sql", sql);
console.log("SQL written, executing via docker exec...");
const output = execSync(
  "docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -f /tmp/create-admin.sql",
  { encoding: "utf-8" }
);
console.log(output);
