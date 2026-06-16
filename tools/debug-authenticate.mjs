import http from "http";
import crypto from "crypto";

// Step 1: find the user
const findReq = http.request(
  { hostname: "localhost", port: 3000, path: "/api/customers?where[email][equals]=jpgyap@gmail.com&depth=0&limit=1", method: "GET" },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log("Find user status:", res.statusCode);
      try {
        const parsed = JSON.parse(body);
        console.log("Response keys:", Object.keys(parsed));
        if (parsed.docs && parsed.docs.length > 0) {
          const user = parsed.docs[0];
          console.log("User found:", user.email, "role:", user.role);
          console.log("Hash present:", !!user.hash, "Salt present:", !!user.salt);
          
          // Manually verify password
          const computedHash = crypto.pbkdf2Sync("DaVinciOS", user.salt, 25000, 512, "sha256");
          const storedHash = Buffer.from(user.hash, "hex");
          console.log("Computed hash length:", computedHash.length);
          console.log("Stored hash length:", storedHash.length);
          console.log("Lengths match:", computedHash.length === storedHash.length);
          if (computedHash.length === storedHash.length) {
            console.log("Hashes match:", crypto.timingSafeEqual(computedHash, storedHash));
          }
        } else {
          console.log("User not found. Full response:", body.substring(0, 500));
        }
      } catch (e) {
        console.log("Parse error:", e.message, "Body:", body.substring(0, 300));
      }
    });
  }
);
findReq.end();
