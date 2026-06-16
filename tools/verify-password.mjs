import { execSync } from "child_process";
import crypto from "crypto";

// Read the salt and hash from the database
const sql = "SELECT email, salt, hash FROM customers WHERE email='jpgyap@gmail.com';";
try {
  const out = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -A -t", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("DB row:", out.trim());
  const parts = out.trim().split("|");
  if (parts.length >= 3) {
    const email = parts[0].trim();
    const storedSalt = parts[1].trim();
    const storedHash = parts[2].trim();
    console.log("\nEmail:", email);
    console.log("Salt length:", storedSalt.length);
    console.log("Hash length:", storedHash.length);
    
    // Re-hash the password with the stored salt
    const computedHashRaw = crypto.pbkdf2Sync("DaVinciOS", storedSalt, 25000, 512, "sha256");
    const computedHash = computedHashRaw.toString("hex");
    
    console.log("Computed hash length:", computedHash.length);
    console.log("Hashes match:", computedHash === storedHash);
    
    if (computedHash !== storedHash) {
      console.log("First 50 of stored:", storedHash.substring(0, 50));
      console.log("First 50 of computed:", computedHash.substring(0, 50));
    }
  }
} catch (e) {
  console.error("Error:", e.message);
}
