import { execSync } from "child_process";
import http from "http";

// Delete existing user via psql through docker
const sql = "DELETE FROM customers WHERE email='jpgyap@gmail.com';\n";
try {
  execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
    input: sql,
    encoding: "utf-8",
  });
  console.log("User deleted (if existed)");
} catch (e) {
  console.log("Delete had no effect or error:", e.message.substring(0, 100));
}
const data = JSON.stringify({
  email: "jpgyap@gmail.com",
  password: "DaVinciOS",
  name: "Admin User",
  phone: "+639175550000",
  role: "admin",
});

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/customers/first-register",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      try {
        const parsed = JSON.parse(body);
        if (parsed.user) {
          console.log("User created:", parsed.user.email);
        } else if (parsed.errors) {
          console.log("Errors:", JSON.stringify(parsed.errors));
        } else {
          console.log("Response:", body.substring(0, 500));
        }
      } catch {
        console.log("Raw:", body.substring(0, 500));
      }
    });
  }
);
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
