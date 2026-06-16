import crypto from "crypto";

// Simulate exactly what Payload CMS authenticateLocalStrategy does
async function authenticate(doc, password) {
  try {
    const { hash, salt } = doc;
    console.log("Authenticate received:", { hashType: typeof hash, saltType: typeof salt, hashLen: hash?.length, saltLen: salt?.length });

    if (typeof salt === "string" && typeof hash === "string") {
      const res = await new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 25000, 512, "sha256", (e, hashBuffer) => {
          if (e) {
            console.log("PBKDF2 ERROR:", e.message);
            reject(e);
            return;
          }
          const storedHashBuffer = Buffer.from(hash, "hex");
          console.log("hashBuffer length:", hashBuffer.length);
          console.log("storedHashBuffer length:", storedHashBuffer.length);
          console.log("Lengths match:", hashBuffer.length === storedHashBuffer.length);

          if (hashBuffer.length === storedHashBuffer.length && crypto.timingSafeEqual(hashBuffer, storedHashBuffer)) {
            console.log("PASSWORD MATCH!");
            resolve(doc);
          } else {
            console.log("Password mismatch");
            // Check first few bytes
            console.log("hashBuffer first 10 hex:", hashBuffer.slice(0, 10).toString("hex"));
            console.log("stored first 10 hex:", storedHashBuffer.slice(0, 10).toString("hex"));
            reject(new Error("Invalid password"));
          }
        });
      });
      return res;
    }
    console.log("Salt and hash not both strings");
    return null;
  } catch (ignore) {
    console.log("Catch block triggered:", ignore.message);
    return null;
  }
}

// Read user from DB
import { execSync } from "child_process";
const sql = "SELECT salt, hash FROM customers WHERE email='jpgyap@gmail.com';";
const row = execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu -A -t", {
  input: sql,
  encoding: "utf-8",
}).trim();

const parts = row.split("|");
if (parts.length >= 2) {
  const user = { salt: parts[0].trim(), hash: parts[1].trim() };
  console.log("Testing authenticate with DaVinciOS algorithm...");
  console.log("User:", { saltLen: user.salt.length, hashLen: user.hash.length });

  const result = await authenticate(user, "DaVinciOS");
  console.log("Authenticate result:", result ? "SUCCESS" : "FAILED");
}
