import http from "http";
import crypto from "crypto";

// Payload CMS password hashing: pbkdf2 with sha512, 250k iterations
const password = "DaVinciOS";
const salt = crypto.randomBytes(32).toString("hex");
const hash = crypto
  .pbkdf2Sync(password, salt, 250000, 64, "sha512")
  .toString("hex");

const user = {
  email: "jpgyap@gmail.com",
  name: "Admin User",
  role: "admin",
  phone: "+639175550000",
  salt,
  hash,
  login_attempts: 0,
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const data = JSON.stringify(user);

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
      console.log("Response:", body);
    });
  }
);
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
