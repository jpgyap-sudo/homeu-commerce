import http from "http";

// Delete existing user first
import { execSync } from "child_process";
execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
  input: "DELETE FROM customers WHERE email='jpgyap@gmail.com';\n",
  encoding: "utf-8",
});
console.log("User deleted");

// Try POST /api/customers (register endpoint)
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
    path: "/api/customers",
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
        const j = JSON.parse(body);
        if (j.doc || j.message) console.log("Success:", j.doc?.email || j.message);
        else if (j.errors) console.log("Errors:", JSON.stringify(j.errors));
        else console.log("Response:", body.substring(0, 500));
      } catch {
        console.log("Raw:", body.substring(0, 500));
      }
    });
  }
);
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
