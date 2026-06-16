import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";

const password = "DaVinciOS";
const salt = crypto.randomBytes(32).toString("hex");
const hash = crypto.pbkdf2Sync(password, salt, 250000, 64, "sha512").toString("hex");

console.log("Salt generated:", salt.substring(0, 16) + "...");
console.log("Hash generated:", hash.substring(0, 16) + "...");

const sql = [
  "DELETE FROM customers WHERE email = 'jpgyap@gmail.com';",
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

fs.writeFileSync("/tmp/insert-admin.sql", sql);
console.log("SQL file written. Executing...");

const output = execSync(
  "docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu",
  {
    input: sql,
    encoding: "utf-8",
  }
);
console.log("Result:", output);
