import http from "http";
const data = JSON.stringify({ email: "jpgyap@gmail.com", password: "DaVinciOS" });
const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/login",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
  },
  (res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => console.log("Status:", res.statusCode, "Body:", body));
  }
);
req.write(data);
req.end();
